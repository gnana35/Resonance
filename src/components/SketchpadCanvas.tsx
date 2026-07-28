"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Eraser,
  Hand,
  Image as ImageIcon,
  Pencil,
  Pipette,
  RectangleHorizontal,
  Type,
} from "lucide-react";
import { CanvasToolbar } from "@/components/CanvasToolbar";
import { CanvasBottomBar } from "@/components/CanvasBottomBar";
import type { DesignDoc } from "@/lib/designs";

/* ─── types ──────────────────────────────────────────────────────────────── */

export type Point  = { x: number; y: number };
export type Stroke = { points: Point[]; color: string; width: number; erase: boolean };
type Tool =
  | "pencil"
  | "eraser"
  | "eraser2"
  | "rect"
  | "text"
  | "image"
  | "eyedropper"
  | "pan";

/* ─── constants ──────────────────────────────────────────────────────────── */

const CANVAS_WIDTH  = 1400;
const CANVAS_HEIGHT = 640;

const TOOLS: { key: Tool; icon: React.ElementType; label: string }[] = [
  { key: "pencil",     icon: Pencil,             label: "Pencil"       },
  { key: "eraser",     icon: Eraser,             label: "Eraser"       },
  { key: "rect",       icon: RectangleHorizontal, label: "Rectangle"   },
  { key: "text",       icon: Type,               label: "Text"         },
  { key: "image",      icon: ImageIcon,          label: "Image"        },
  { key: "eyedropper", icon: Pipette,            label: "Eyedropper"   },
  { key: "eraser2",    icon: Eraser,             label: "Block Eraser" },
  { key: "pan",        icon: Hand,               label: "Pan"          },
];

/* ─── imperative handle ──────────────────────────────────────────────────── */

/**
 * The parent page calls canvasRef.current.getSnapshot() to extract a PNG blob
 * plus the current design state before persisting.
 */
export interface SketchpadHandle {
  getSnapshot(): Promise<{
    blob:        Blob;
    strokes:     Stroke[];
    color:       string;
    strokeWidth: number;
  }>;
}

/* ─── props ──────────────────────────────────────────────────────────────── */

export interface SketchpadCanvasProps {
  /** When provided, the canvas loads this saved design on mount. */
  initialDesign?: Pick<DesignDoc, "strokesJson" | "color" | "strokeWidth"> | null;
}

/* ─── component ──────────────────────────────────────────────────────────── */

export const SketchpadCanvas = forwardRef<SketchpadHandle, SketchpadCanvasProps>(
  function SketchpadCanvas({ initialDesign }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    /* parse saved strokes once on mount, fall back to empty */
    const initialStrokes: Stroke[] = (() => {
      try {
        if (initialDesign?.strokesJson)
          return JSON.parse(initialDesign.strokesJson) as Stroke[];
      } catch { /* corrupt JSON — start fresh */ }
      return [];
    })();

    const [tool,          setTool]          = useState<Tool>("pencil");
    const [color,         setColor]         = useState(initialDesign?.color       ?? "#1a1a1a");
    const [strokeWidth,   setStrokeWidth]   = useState(initialDesign?.strokeWidth ?? 4);
    const [strokes,       setStrokes]       = useState<Stroke[]>(initialStrokes);
    const [redoStack,     setRedoStack]     = useState<Stroke[]>([]);
    const [currentPoints, setCurrentPoints] = useState<Point[] | null>(null);
    const [zoom,          setZoom]          = useState(100);

    /* ── imperative handle ── */

    useImperativeHandle(ref, () => ({
      async getSnapshot() {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not mounted");

        return new Promise<{ blob: Blob; strokes: Stroke[]; color: string; strokeWidth: number }>(
          (resolve, reject) => {
            canvas.toBlob((blob) => {
              if (!blob) { reject(new Error("toBlob returned null")); return; }
              resolve({ blob, strokes, color, strokeWidth });
            }, "image/png");
          },
        );
      },
    }), [strokes, color, strokeWidth]);

    /* ── pointer helpers ── */

    function getPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
      const c    = canvasRef.current!;
      const rect = c.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (c.width  / rect.width),
        y: (e.clientY - rect.top)  * (c.height / rect.height),
      };
    }

    const isErase = (t: Tool) => t === "eraser" || t === "eraser2";
    const canDraw = (t: Tool) => t === "pencil" || isErase(t);

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!canDraw(tool)) return;
      isDrawing.current = true;
      setCurrentPoints([getPos(e)]);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!isDrawing.current) return;
      setCurrentPoints((prev) => (prev ? [...prev, getPos(e)] : [getPos(e)]));
    }

    function handlePointerUp() {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (currentPoints && currentPoints.length >= 1) {
        setStrokes((s) => [
          ...s,
          { points: currentPoints, color, width: strokeWidth, erase: isErase(tool) },
        ]);
        setRedoStack([]);
      }
      setCurrentPoints(null);
    }

    /* ── undo / redo ── */

    function undo() {
      setStrokes((s) => {
        if (!s.length) return s;
        setRedoStack((r) => [...r, s[s.length - 1]]);
        return s.slice(0, -1);
      });
    }

    function redo() {
      setRedoStack((r) => {
        if (!r.length) return r;
        const last = r[r.length - 1];
        setStrokes((s) => [...s, last]);
        return r.slice(0, -1);
      });
    }

    /* ── zoom stubs ── */

    function zoomIn()  { setZoom((z) => Math.min(z + 25, 400)); }
    function zoomOut() { setZoom((z) => Math.max(z - 25, 25));  }

    /* ── canvas render ── */

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx    = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const all =
        currentPoints && currentPoints.length >= 1
          ? [...strokes, { points: currentPoints, color, width: strokeWidth, erase: isErase(tool) }]
          : strokes;

      for (const stroke of all) {
        ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";

        if (stroke.points.length === 1) {
          const [p] = stroke.points;
          ctx.beginPath();
          ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.color;
          ctx.fill();
          continue;
        }

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth   = stroke.width;
        ctx.lineCap     = "round";
        ctx.lineJoin    = "round";
        ctx.beginPath();
        stroke.points.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
        );
        ctx.stroke();
      }
    }, [strokes, currentPoints, color, strokeWidth, tool]);

    /* ── markup ── */

    return (
      <div className="flex flex-col">
        <CanvasToolbar
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          zoom={zoom}
          canUndo={strokes.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFullscreen={() => console.log("fullscreen")}
        />

        <div className="flex rounded-b-xl border border-t-0 border-violet-3/25 bg-bg-1">
          {/* Vertical tool rail */}
          <div className="flex flex-col gap-0.5 border-r border-violet-3/20 p-1.5">
            {TOOLS.map((t) => {
              const Icon   = t.icon;
              const active = tool === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTool(t.key)}
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

          {/* Canvas + bottom bar */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div
              className="relative overflow-hidden"
              style={{
                backgroundColor:  "#f4f1ea",
                backgroundImage:  "radial-gradient(circle, #00000014 1px, transparent 1px)",
                backgroundSize:   "20px 20px",
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="block w-full touch-none"
                style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
              />
            </div>

            <CanvasBottomBar
              color={color}
              strokeWidth={strokeWidth}
              canUndo={strokes.length > 0}
              canRedo={redoStack.length > 0}
              onUndo={undo}
              onRedo={redo}
              onColorChange={setColor}
              onStrokeWidthChange={setStrokeWidth}
            />
          </div>
        </div>
      </div>
    );
  },
);
