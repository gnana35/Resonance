"use client";

import { useEffect, useRef, useState } from "react";
import {
  Diamond,
  Download,
  Eraser,
  Eye,
  Hand,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { PlaceholderImage } from "@/components/PlaceholderImage";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; width: number; erase: boolean };
type Tool = "select" | "pan" | "pencil" | "shapes" | "text" | "image" | "eraser";

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 640;

const TOOLS: { key: Tool; icon: typeof MousePointer2; label: string }[] = [
  { key: "select", icon: MousePointer2, label: "Select" },
  { key: "pan", icon: Hand, label: "Pan" },
  { key: "pencil", icon: Pencil, label: "Pencil" },
  { key: "shapes", icon: Square, label: "Shapes" },
  { key: "text", icon: Type, label: "Text" },
  { key: "image", icon: ImageIcon, label: "Image" },
  { key: "eraser", icon: Eraser, label: "Eraser" },
];

const COLORS = [
  "#1a1a1a",
  "#ffffff",
  "#8b5cf6",
  "#2dd4bf",
  "#a67c52",
  "#6b7a99",
  "#b5651d",
  "#4b5563",
  "#3d2b1f",
];

const SIZES = [
  { label: "S", value: 2 },
  { label: "M", value: 4 },
  { label: "L", value: 8 },
  { label: "XL", value: 14 },
];

const LAYERS = [
  "Annotations",
  "Weapons",
  "Map",
  "Characters",
  "Environment",
  "Props",
  "Background",
];

const REFERENCE_SEEDS = [
  "ref-warrior",
  "ref-blade",
  "ref-castle-night",
  "ref-texture",
  "ref-window",
];

export default function Sketchpad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[] | null>(null);
  const [selectedLayer, setSelectedLayer] = useState("Characters");

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool !== "pencil" && tool !== "eraser") return;
    isDrawing.current = true;
    setCurrentPoints([getPos(e)]);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    setCurrentPoints((prev) => (prev ? [...prev, pos] : [pos]));
  }

  function handlePointerUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentPoints && currentPoints.length >= 1) {
      setStrokes((s) => [
        ...s,
        {
          points: currentPoints,
          color,
          width: strokeWidth,
          erase: tool === "eraser",
        },
      ]);
      setRedoStack([]);
    }
    setCurrentPoints(null);
  }

  function undo() {
    setStrokes((s) => {
      if (s.length === 0) return s;
      setRedoStack((r) => [...r, s[s.length - 1]]);
      return s.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const last = r[r.length - 1];
      setStrokes((s) => [...s, last]);
      return r.slice(0, -1);
    });
  }

  function newCanvas() {
    setStrokes([]);
    setRedoStack([]);
    setCurrentPoints(null);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes =
      currentPoints && currentPoints.length >= 1
        ? [
            ...strokes,
            {
              points: currentPoints,
              color,
              width: strokeWidth,
              erase: tool === "eraser",
            },
          ]
        : strokes;

    for (const stroke of allStrokes) {
      ctx.globalCompositeOperation = stroke.erase
        ? "destination-out"
        : "source-over";

      if (stroke.points.length === 1) {
        const [p] = stroke.points;
        ctx.beginPath();
        ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
        continue;
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  }, [strokes, currentPoints, color, strokeWidth, tool]);

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-violet-1">
            The Designer&apos;s Space{" "}
            <span className="text-ink/40">&gt;</span> Sketchpad
          </h1>
          <p className="mt-1 text-ink/70">
            Sketch your ideas, concepts, and layouts. All changes are
            auto-saved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={newCanvas}
            className="flex items-center gap-2 rounded-md bg-violet-2 px-4 py-2 text-sm font-medium text-bg-0 hover:bg-violet-1"
          >
            <Plus className="h-4 w-4" />
            New Canvas
          </button>
          <button
            onClick={() => console.log("download sketch")}
            aria-label="Download"
            className="rounded-md border border-violet-3/30 p-2 text-ink/70 hover:border-violet-2/50 hover:text-ink"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => console.log("more options")}
            aria-label="More options"
            className="rounded-md border border-violet-3/30 p-2 text-ink/70 hover:border-violet-2/50 hover:text-ink"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border border-b-0 border-violet-3/25 bg-bg-1 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-ink/70">
              Canvas 1
              <span className="text-ink/40">
                W {CANVAS_WIDTH} H {CANVAS_HEIGHT}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => console.log("zoom out")}
                  aria-label="Zoom out"
                  className="rounded-md border border-violet-3/30 p-1.5 text-ink/60 hover:text-ink"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-12 text-center text-sm text-ink/60">
                  100%
                </span>
                <button
                  onClick={() => console.log("zoom in")}
                  aria-label="Zoom in"
                  className="rounded-md border border-violet-3/30 p-1.5 text-ink/60 hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => console.log("fullscreen")}
                  aria-label="Fullscreen"
                  className="ml-1 rounded-md border border-violet-3/30 p-1.5 text-ink/60 hover:text-ink"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={undo}
                  disabled={strokes.length === 0}
                  aria-label="Undo"
                  className="rounded-md border border-violet-3/30 p-1.5 text-ink/60 hover:text-ink disabled:opacity-30"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  aria-label="Redo"
                  className="rounded-md border border-violet-3/30 p-1.5 text-ink/60 hover:text-ink disabled:opacity-30"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex rounded-b-2xl border border-violet-3/25 bg-bg-1">
            <div className="flex flex-col gap-1 border-r border-violet-3/20 p-2">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                const active = tool === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTool(t.key)}
                    aria-label={t.label}
                    title={t.label}
                    className={`rounded-lg p-2.5 transition-colors ${
                      active
                        ? "bg-violet-2 text-bg-0"
                        : "text-ink/60 hover:bg-violet-2/10 hover:text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
              <span className="mt-1 flex justify-center">
                <Diamond className="h-4 w-4 text-ink/20" />
              </span>
            </div>

            <div className="flex flex-1 flex-col">
              <div
                className="relative overflow-hidden"
                style={{
                  backgroundColor: "#f4f1ea",
                  backgroundImage:
                    "radial-gradient(circle, #00000014 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
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

              <div className="flex flex-wrap items-center gap-4 border-t border-violet-3/20 px-4 py-3">
                <Pencil className="h-4 w-4 text-ink/50" />
                <div className="flex items-center gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={c}
                      className="h-6 w-6 rounded-full border border-white/10"
                      style={{
                        backgroundColor: c,
                        boxShadow:
                          color === c
                            ? "0 0 0 2px #0a0e1c, 0 0 0 4px #a78bfa"
                            : undefined,
                      }}
                    />
                  ))}
                </div>
                <div className="h-5 w-px bg-violet-3/20" />
                <div className="flex items-center gap-1">
                  {SIZES.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setStrokeWidth(s.value)}
                      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                        strokeWidth === s.value
                          ? "bg-violet-2 text-bg-0"
                          : "text-ink/60 hover:text-ink"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between">
              <p className="text-ink">Layers</p>
              <button
                onClick={() => console.log("add layer")}
                aria-label="Add layer"
                className="text-ink/50 hover:text-ink"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              {LAYERS.map((layer) => (
                <button
                  key={layer}
                  onClick={() => setSelectedLayer(layer)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    selectedLayer === layer
                      ? "bg-violet-2/15 text-violet-1"
                      : "text-ink/70 hover:bg-violet-2/5 hover:text-ink"
                  }`}
                >
                  <span className="flex-1 truncate">{layer}</span>
                  <Lock className="h-3.5 w-3.5 shrink-0 text-ink/30" />
                  <Eye className="h-3.5 w-3.5 shrink-0 text-ink/30" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between">
              <p className="text-ink">References ({REFERENCE_SEEDS.length})</p>
              <button
                onClick={() => console.log("view all references")}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                View all
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {REFERENCE_SEEDS.map((seed) => (
                <PlaceholderImage key={seed} seed={seed} className="h-16 rounded-md" />
              ))}
            </div>
            <button
              onClick={() => console.log("add reference")}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-violet-3/40 py-2 text-sm text-violet-2 hover:border-violet-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Reference
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
