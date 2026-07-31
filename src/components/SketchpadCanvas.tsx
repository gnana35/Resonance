"use client";

/**
 * SketchpadCanvas
 *
 * The main drawing surface. Reads layer data from DesignerContext and renders
 * all layers onto a single HTML canvas. Writes only to the active layer.
 *
 * All tools are functional:
 *   pencil    — freehand stroke on active layer
 *   eraser    — erase stroke on active layer
 *   rect      — draw rectangle shape
 *   ellipse   — draw ellipse shape
 *   text      — click to place text
 *   image     — handled by ReferencesPanel drag; also opens picker
 *   eyedropper — sample canvas pixel colour
 *   fill      — flood fill (rasterised preview only; fills via a special stroke)
 *   pan       — pan the viewport
 *
 * Zoom and pan are stored in DesignerContext so they survive reopening.
 * All coordinates are stored in design-space (not screen-space), so
 * zoom/pan never distorts saved coordinates.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Circle,
  Eraser,
  Hand,
  Image as ImageIcon,
  PaintBucket as Paintbucket,
  Pencil,
  Pipette,
  RectangleHorizontal,
  Type,
} from "lucide-react";
import { CanvasToolbar } from "@/components/CanvasToolbar";
import { CanvasBottomBar } from "@/components/CanvasBottomBar";
import {
  useDesigner,
  type Point,
  type VectorStroke,
  type VectorShape,
  type TextElement,
  type LayerData,
  type Layer,
  type BlendMode,
} from "@/context/DesignerContext";

// ─── tool types ───────────────────────────────────────────────────────────────

export type CanvasTool =
  | "pencil" | "eraser"
  | "rect" | "ellipse"
  | "text"
  | "image"
  | "eyedropper"
  | "fill"
  | "pan";

export const TOOLS: { key: CanvasTool; icon: React.ElementType; label: string }[] = [
  { key: "pencil",     icon: Pencil,             label: "Pencil / Brush"  },
  { key: "eraser",     icon: Eraser,             label: "Eraser"          },
  { key: "rect",       icon: RectangleHorizontal, label: "Rectangle"      },
  { key: "ellipse",    icon: Circle,             label: "Ellipse"         },
  { key: "text",       icon: Type,               label: "Text"            },
  { key: "image",      icon: ImageIcon,          label: "Place Image"     },
  { key: "eyedropper", icon: Pipette,            label: "Eyedropper"      },
  { key: "fill",       icon: Paintbucket,        label: "Fill"            },
  { key: "pan",        icon: Hand,               label: "Pan"             },
];

// ─── imperative handle ────────────────────────────────────────────────────────

export interface SketchpadHandle {
  /** Produce a PNG blob for thumbnail generation */
  getThumbnailBlob(): Promise<Blob>;
  /** Get a flat PNG blob for Export */
  getExportBlob(): Promise<Blob>;
  /** Programmatically place an image asset on the active layer */
  placeImageAsset(assetId: string, url: string): void;
}

// ─── props ────────────────────────────────────────────────────────────────────

export interface SketchpadCanvasProps {
  designId: string;
  /** Tool passed in from parent so toolbar and page share state */
  tool: CanvasTool;
  color: string;
  strokeWidth: number;
  opacity: number;
  onToolChange?: (t: CanvasTool) => void;
  onColorChange?: (c: string) => void;
  onStrokeWidthChange?: (w: number) => void;
  onOpacityChange?: (o: number) => void;
  /** Notify parent that a locked/hidden layer was touched */
  onBlockedDraw?: (reason: string) => void;
}

// ─── rendering helpers ────────────────────────────────────────────────────────

function renderLayerToCtx(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  loadedImages: Map<string, HTMLImageElement>,
) {
  ctx.save();
  ctx.globalAlpha = layer.opacity / 100;
  ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;

  // Strokes
  for (const stroke of layer.data.strokes) {
    ctx.save();
    ctx.globalAlpha *= stroke.opacity / 100;
    ctx.globalCompositeOperation = stroke.erase ? "destination-out" : ctx.globalCompositeOperation;
    if (stroke.points.length === 1) {
      const [p] = stroke.points;
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Shapes
  for (const shape of layer.data.shapes) {
    ctx.save();
    ctx.globalAlpha *= shape.opacity / 100;
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = shape.width;
    if (shape.kind === "rect") {
      if (shape.fill) ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
      else ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
    } else if (shape.kind === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        shape.x + shape.w / 2, shape.y + shape.h / 2,
        Math.abs(shape.w / 2), Math.abs(shape.h / 2),
        0, 0, Math.PI * 2
      );
      if (shape.fill) ctx.fill(); else ctx.stroke();
    } else if (shape.kind === "line") {
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Texts
  for (const txt of layer.data.texts) {
    ctx.save();
    ctx.globalAlpha *= txt.opacity / 100;
    ctx.fillStyle = txt.color;
    ctx.font = `${txt.fontSize}px sans-serif`;
    ctx.fillText(txt.text, txt.x, txt.y + txt.fontSize);
    ctx.restore();
  }

  // Placed images
  for (const pi of layer.data.placedImages) {
    const img = loadedImages.get(pi.url);
    if (img) {
      ctx.save();
      ctx.globalAlpha *= pi.opacity / 100;
      ctx.drawImage(img, pi.x, pi.y, pi.w, pi.h);
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Composite every visible layer onto a transparent offscreen buffer sized to
 * the design. Rendering the layers here (rather than straight onto the visible
 * canvas over the background) means an eraser stroke's `destination-out` only
 * cuts through the LAYER STACK — so the erased area reveals the design's
 * background when the buffer is later drawn over it, instead of punching a
 * transparent hole to the dark canvas frame.
 */
function compositeLayersToBuffer(
  buffer: HTMLCanvasElement,
  W: number,
  H: number,
  layers: Layer[],
  loadedImages: Map<string, HTMLImageElement>,
): HTMLCanvasElement {
  if (buffer.width !== W) buffer.width = W;
  if (buffer.height !== H) buffer.height = H;
  const bctx = buffer.getContext("2d");
  if (!bctx) return buffer;
  bctx.clearRect(0, 0, W, H);
  const sorted = [...layers].sort((a, b) => a.order - b.order);
  for (const layer of sorted) {
    if (!layer.visible) continue;
    renderLayerToCtx(bctx, layer, loadedImages);
  }
  return buffer;
}

// ─── component ────────────────────────────────────────────────────────────────

export const SketchpadCanvas = forwardRef<SketchpadHandle, SketchpadCanvasProps>(
  function SketchpadCanvas(
    {
      designId,
      tool,
      color,
      strokeWidth,
      opacity,
      onToolChange,
      onColorChange,
      onBlockedDraw,
    },
    ref
  ) {
    const {
      activeDesign,
      activeLayers,
      activeLayer,
      updateLayerData,
      updateDesignMeta,
      pushHistory,
    } = useDesigner();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Transparent buffer used to composite layers before drawing them over the
    // background — see compositeLayersToBuffer for why the eraser needs this.
    const bufferRef = useRef<HTMLCanvasElement | null>(null);
    const getBuffer = () => {
      if (!bufferRef.current) bufferRef.current = document.createElement("canvas");
      return bufferRef.current;
    };
    const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

    // In-progress gesture state (not stored in React state to avoid render thrash)
    const isDrawing = useRef(false);
    const currentPoints = useRef<Point[]>([]);
    const dragStart = useRef<Point | null>(null);
    const panStart = useRef<{ panX: number; panY: number; mouseX: number; mouseY: number } | null>(null);
    const [textPrompt, setTextPrompt] = useState<{ x: number; y: number } | null>(null);
    const [textDraft, setTextDraft] = useState("");
    const textInputRef = useRef<HTMLInputElement>(null);

    // Live preview shape while dragging (rect/ellipse)
    const [previewShape, setPreviewShape] = useState<VectorShape | null>(null);

    const design = activeDesign;
    const zoom = design?.zoom ?? 100;
    const panX = design?.panX ?? 0;
    const panY = design?.panY ?? 0;

    const W = design?.width ?? 1200;
    const H = design?.height ?? 560;

    // ── Preload placed images ─────────────────────────────────────────────────

    useEffect(() => {
      const allUrls = activeLayers.flatMap((l) => l.data.placedImages.map((p) => p.url));
      for (const url of allUrls) {
        if (!loadedImages.current.has(url)) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => { loadedImages.current.set(url, img); redraw(); };
          img.src = url;
          loadedImages.current.set(url, img); // placeholder
        }
      }
    }, [activeLayers]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Redraw ────────────────────────────────────────────────────────────────

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !design) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = design.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply zoom + pan transform
      ctx.save();
      const scale = zoom / 100;
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      // Composite layers on a transparent buffer, then draw over the background
      // so eraser strokes reveal the background rather than the dark frame.
      const buffer = compositeLayersToBuffer(getBuffer(), W, H, activeLayers, loadedImages.current);
      ctx.drawImage(buffer, 0, 0);

      // Render live preview shape
      if (previewShape) {
        ctx.save();
        ctx.strokeStyle = previewShape.color;
        ctx.fillStyle = previewShape.color;
        ctx.lineWidth = previewShape.width;
        ctx.setLineDash([4, 3]);
        if (previewShape.kind === "rect") {
          ctx.strokeRect(previewShape.x, previewShape.y, previewShape.w, previewShape.h);
        } else if (previewShape.kind === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(
            previewShape.x + previewShape.w / 2, previewShape.y + previewShape.h / 2,
            Math.abs(previewShape.w / 2), Math.abs(previewShape.h / 2),
            0, 0, Math.PI * 2
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();
    }, [activeLayers, design, zoom, panX, panY, previewShape, W, H]);

    useEffect(() => { redraw(); }, [redraw]);

    // ── Imperative handle ─────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      async getThumbnailBlob(): Promise<Blob> {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not mounted");
        // Create a clean render at full size, without zoom/pan offset
        const tmp = document.createElement("canvas");
        tmp.width = W; tmp.height = H;
        const ctx = tmp.getContext("2d")!;
        ctx.fillStyle = design?.background ?? "#f4f1ea";
        ctx.fillRect(0, 0, W, H);
        // Composite layers on a transparent buffer first so erased areas show
        // the background instead of a transparent hole.
        const buffer = compositeLayersToBuffer(
          document.createElement("canvas"), W, H, activeLayers, loadedImages.current,
        );
        ctx.drawImage(buffer, 0, 0);
        return new Promise((res, rej) => tmp.toBlob((b) => b ? res(b) : rej(new Error("toBlob null")), "image/png"));
      },
      async getExportBlob(): Promise<Blob> {
        return this.getThumbnailBlob();
      },
      placeImageAsset(assetId: string, url: string) {
        if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
          onBlockedDraw?.(activeLayer?.locked ? "Layer is locked." : "Layer is hidden.");
          return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          loadedImages.current.set(url, img);
          pushHistory();
          const placed = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            assetId, url,
            x: 50, y: 50, w: Math.min(img.naturalWidth, W / 2), h: Math.min(img.naturalHeight, H / 2),
            opacity: 100,
          };
          const next: LayerData = {
            ...activeLayer.data,
            placedImages: [...activeLayer.data.placedImages, placed],
          };
          updateLayerData(activeLayer.id, next);
        };
        img.src = url;
      },
    }), [activeLayer, activeLayers, design, W, H, pushHistory, updateLayerData, onBlockedDraw]);

    // ── Coordinate helpers ────────────────────────────────────────────────────

    function screenToDesign(e: React.PointerEvent<HTMLCanvasElement>): Point {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
      const scale = zoom / 100;
      return { x: (sx - panX) / scale, y: (sy - panY) / scale };
    }

    function rawScreen(e: React.PointerEvent<HTMLCanvasElement>): Point {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    }

    // ── Pointer events ────────────────────────────────────────────────────────

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const dp = screenToDesign(e);

      if (tool === "pan") {
        const sp = rawScreen(e);
        panStart.current = { panX, panY, mouseX: sp.x, mouseY: sp.y };
        return;
      }
      if (tool === "eyedropper") {
        sampleColor(dp);
        return;
      }
      if (tool === "text") {
        setTextPrompt(dp);
        setTimeout(() => textInputRef.current?.focus(), 30);
        return;
      }

      // Guard locked / invisible
      if (!activeLayer || !activeLayer.visible) {
        onBlockedDraw?.("Layer is hidden. Make it visible to draw.");
        return;
      }
      if (activeLayer.locked) {
        onBlockedDraw?.("Layer is locked. Unlock it to draw.");
        return;
      }

      if (tool === "fill") {
        handleFill(dp);
        return;
      }

      isDrawing.current = true;
      currentPoints.current = [dp];
      dragStart.current = dp;

      if (tool === "rect" || tool === "ellipse") {
        setPreviewShape({
          id: "preview",
          kind: tool === "rect" ? "rect" : "ellipse",
          x: dp.x, y: dp.y, w: 0, h: 0,
          color, fill: false, width: strokeWidth, opacity,
        });
      }
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
      if (tool === "pan" && panStart.current) {
        const sp = rawScreen(e);
        const dx = sp.x - panStart.current.mouseX;
        const dy = sp.y - panStart.current.mouseY;
        updateDesignMeta(designId, {
          panX: panStart.current.panX + dx,
          panY: panStart.current.panY + dy,
        });
        return;
      }
      if (!isDrawing.current) return;
      const dp = screenToDesign(e);

      if (tool === "pencil" || tool === "eraser") {
        currentPoints.current = [...currentPoints.current, dp];
        // Render in-progress stroke
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          redraw();
          ctx.save();
          const scale = zoom / 100;
          ctx.translate(panX, panY);
          ctx.scale(scale, scale);
          const pts = currentPoints.current;
          if (pts.length >= 2) {
            // Preview the eraser by painting the background colour (matching how
            // the committed erase reveals the background) rather than punching a
            // hole through to the dark canvas frame.
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = opacity / 100;
            ctx.strokeStyle = tool === "eraser" ? (design?.background ?? "#f4f1ea") : color;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if ((tool === "rect" || tool === "ellipse") && dragStart.current) {
        const start = dragStart.current;
        setPreviewShape({
          id: "preview",
          kind: tool === "rect" ? "rect" : "ellipse",
          x: Math.min(start.x, dp.x),
          y: Math.min(start.y, dp.y),
          w: Math.abs(dp.x - start.x),
          h: Math.abs(dp.y - start.y),
          color, fill: false, width: strokeWidth, opacity,
        });
      }
    }

    function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
      if (tool === "pan") { panStart.current = null; return; }
      if (!isDrawing.current || !activeLayer) return;
      isDrawing.current = false;
      const dp = screenToDesign(e);

      pushHistory();

      if (tool === "pencil" || tool === "eraser") {
        const pts = currentPoints.current.length >= 1 ? currentPoints.current : [dp];
        const stroke: VectorStroke = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          points: pts,
          color,
          width: strokeWidth,
          opacity,
          erase: tool === "eraser",
        };
        const next: LayerData = { ...activeLayer.data, strokes: [...activeLayer.data.strokes, stroke] };
        updateLayerData(activeLayer.id, next);
      } else if ((tool === "rect" || tool === "ellipse") && dragStart.current) {
        const start = dragStart.current;
        const shape: VectorShape = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          kind: tool === "rect" ? "rect" : "ellipse",
          x: Math.min(start.x, dp.x),
          y: Math.min(start.y, dp.y),
          w: Math.abs(dp.x - start.x),
          h: Math.abs(dp.y - start.y),
          color, fill: false, width: strokeWidth, opacity,
        };
        const next: LayerData = { ...activeLayer.data, shapes: [...activeLayer.data.shapes, shape] };
        updateLayerData(activeLayer.id, next);
        setPreviewShape(null);
      }

      currentPoints.current = [];
      dragStart.current = null;
    }

    // ── Eyedropper ────────────────────────────────────────────────────────────

    function sampleColor(dp: Point) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const scale = zoom / 100;
      const sx = Math.round(dp.x * scale + panX);
      const sy = Math.round(dp.y * scale + panY);
      const pixel = ctx.getImageData(sx, sy, 1, 1).data;
      const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`;
      onColorChange?.(hex);
    }

    // ── Fill ──────────────────────────────────────────────────────────────────

    function handleFill(dp: Point) {
      if (!activeLayer || activeLayer.locked || !activeLayer.visible) return;
      pushHistory();
      // Represent fill as a large rect covering the canvas
      const fillShape: VectorShape = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: "rect",
        x: 0, y: 0, w: W, h: H,
        color, fill: true, width: 1, opacity,
      };
      const next: LayerData = { ...activeLayer.data, shapes: [fillShape, ...activeLayer.data.shapes] };
      updateLayerData(activeLayer.id, next);
    }

    // ── Text commit ───────────────────────────────────────────────────────────

    function commitText() {
      if (!textPrompt || !textDraft.trim() || !activeLayer) {
        setTextPrompt(null);
        setTextDraft("");
        return;
      }
      pushHistory();
      const txt: TextElement = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        x: textPrompt.x, y: textPrompt.y,
        text: textDraft.trim(),
        fontSize: strokeWidth * 4,
        color,
        opacity,
      };
      const next: LayerData = { ...activeLayer.data, texts: [...activeLayer.data.texts, txt] };
      updateLayerData(activeLayer.id, next);
      setTextPrompt(null);
      setTextDraft("");
    }

    // ── Wheel zoom ────────────────────────────────────────────────────────────

    function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      const newZoom = Math.max(25, Math.min(400, zoom + delta));
      updateDesignMeta(designId, { zoom: newZoom });
    }

    // ── Image file picker ─────────────────────────────────────────────────────

    const imageInputRef = useRef<HTMLInputElement>(null);
    function openImagePicker() { imageInputRef.current?.click(); }

    function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file || !activeLayer) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        loadedImages.current.set(url, img);
        pushHistory();
        const placed = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          assetId: "",
          url,
          x: 50, y: 50,
          w: Math.min(img.naturalWidth, W / 2),
          h: Math.min(img.naturalHeight, H / 2),
          opacity: 100,
        };
        const next: LayerData = { ...activeLayer.data, placedImages: [...activeLayer.data.placedImages, placed] };
        updateLayerData(activeLayer.id, next);
      };
      img.src = url;
      e.target.value = "";
    }

    if (tool === "image") {
      // Clicking the canvas directly opens picker
    }

    // ─── drag-from-references-panel drop ──────────────────────────────────────

    function handleDragOver(e: React.DragEvent<HTMLCanvasElement>) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }

    function handleDrop(e: React.DragEvent<HTMLCanvasElement>) {
      e.preventDefault();
      const assetId = e.dataTransfer.getData("text/x-asset-id");
      const url = e.dataTransfer.getData("text/x-asset-url");
      if (assetId && url) {
        const dp = {
          x: (e.clientX - canvasRef.current!.getBoundingClientRect().left) * (W / canvasRef.current!.getBoundingClientRect().width) / (zoom / 100) - panX / (zoom / 100),
          y: (e.clientY - canvasRef.current!.getBoundingClientRect().top) * (H / canvasRef.current!.getBoundingClientRect().height) / (zoom / 100) - panY / (zoom / 100),
        };
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          loadedImages.current.set(url, img);
          pushHistory();
          const placed = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            assetId, url,
            x: dp.x, y: dp.y,
            w: Math.min(img.naturalWidth, W / 3),
            h: Math.min(img.naturalHeight, H / 3),
            opacity: 100,
          };
          const next: LayerData = {
            ...activeLayer!.data,
            placedImages: [...activeLayer!.data.placedImages, placed],
          };
          updateLayerData(activeLayer!.id, next);
        };
        img.src = url;
      }
    }

    // ─── cursor ───────────────────────────────────────────────────────────────

    const cursor =
      tool === "pan" ? "grab" :
      tool === "eyedropper" ? "crosshair" :
      tool === "text" ? "text" :
      tool === "fill" ? "cell" :
      "crosshair";

    // ─── markup ───────────────────────────────────────────────────────────────

    return (
      <div className="flex flex-col" onWheel={handleWheel}>
        <CanvasToolbar
          canvasName={design?.title ?? "Canvas"}
          canvasWidth={W}
          canvasHeight={H}
          zoom={zoom}
          canUndo={false}
          canRedo={false}
          onUndo={() => {}}
          onRedo={() => {}}
          onZoomIn={() => updateDesignMeta(designId, { zoom: Math.min(400, zoom + 25) })}
          onZoomOut={() => updateDesignMeta(designId, { zoom: Math.max(25, zoom - 25) })}
          onFullscreen={() => {
            const el = canvasRef.current?.closest(".canvas-fullscreen-root") as HTMLElement | null;
            el?.requestFullscreen?.().catch(() => {});
          }}
        />

        <div className="flex rounded-b-xl border border-t-0 border-violet-3/25 bg-bg-1">
          {/* Vertical tool rail */}
          <div className="flex flex-col gap-0.5 border-r border-violet-3/20 p-1.5">
            {TOOLS.map((t) => {
                const Icon = t.icon;
                const active = tool === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      if (t.key === "image") {
                        onToolChange?.(t.key);
                        openImagePicker();
                      } else {
                        onToolChange?.(t.key);
                      }
                    }}
                    data-tool={t.key}
                    aria-label={t.label}
                    title={t.label}
                    className={`rounded-lg p-2 transition-colors ${
                      active
                        ? "bg-violet-2 text-bg-0"
                        : "text-ink/50 hover:bg-violet-2/10 hover:text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
          </div>

          {/* Canvas viewport */}
          <div className="flex flex-1 flex-col overflow-hidden canvas-fullscreen-root">
            <div
              className="relative overflow-hidden"
              style={{
                backgroundColor: "#1a1a2a",
                backgroundImage: "radial-gradient(circle, #ffffff08 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                minHeight: 400,
              }}
            >
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={(e) => { if (isDrawing.current) handlePointerUp(e); panStart.current = null; }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={tool === "image" ? openImagePicker : undefined}
                className="block w-full touch-none"
                style={{ aspectRatio: `${W} / ${H}`, cursor }}
              />

              {/* Floating text input */}
              {textPrompt && (
                <div
                  className="absolute z-20"
                  style={{
                    left: textPrompt.x * (zoom / 100) + panX,
                    top: textPrompt.y * (zoom / 100) + panY,
                  }}
                >
                  <input
                    ref={textInputRef}
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitText();
                      if (e.key === "Escape") { setTextPrompt(null); setTextDraft(""); }
                    }}
                    onBlur={commitText}
                    className="rounded border border-violet-2/60 bg-bg-0/90 px-2 py-1 text-sm text-ink shadow-lg focus:outline-none"
                    placeholder="Type and press Enter…"
                    style={{ color, fontSize: Math.max(12, strokeWidth * 4) }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden image picker */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
      </div>
    );
  }
);
