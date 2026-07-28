"use client";

import { ChevronDown, Paintbrush, Plus, Redo2, Undo2 } from "lucide-react";
import { useState } from "react";

const BRUSH_DOTS = [
  { size: 2,  label: "XS" },
  { size: 4,  label: "S"  },
  { size: 8,  label: "M"  },
  { size: 14, label: "L"  },
];

const DEFAULT_COLORS = [
  "#1a1a1a",
  "#ffffff",
  "#8b5cf6",
  "#2dd4bf",
  "#a67c52",
  "#6b7a99",
];

const OPACITIES = ["100%", "75%", "50%", "25%"];

interface CanvasBottomBarProps {
  color: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onColorChange: (c: string) => void;
  onStrokeWidthChange: (w: number) => void;
}

export function CanvasBottomBar({
  color,
  strokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onColorChange,
  onStrokeWidthChange,
}: CanvasBottomBarProps) {
  const [opacity, setOpacity] = useState("100%");
  const [opacityOpen, setOpacityOpen] = useState(false);
  const [extraColors, setExtraColors] = useState<string[]>([]);

  const allColors = [...DEFAULT_COLORS, ...extraColors];

  function addColor() {
    // In a real implementation this would open a colour picker; stub with a
    // random violet tint so the "+" visibly does something.
    const hue = Math.floor(Math.random() * 60) + 250;
    setExtraColors((prev) => [
      ...prev,
      `hsl(${hue}, 60%, 55%)`,
    ]);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-violet-3/20 bg-bg-1 px-4 py-2.5">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          className="rounded p-1.5 text-ink/50 transition-colors hover:bg-violet-2/10 hover:text-ink disabled:opacity-25"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          className="rounded p-1.5 text-ink/50 transition-colors hover:bg-violet-2/10 hover:text-ink disabled:opacity-25"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="h-4 w-px shrink-0 bg-violet-3/20" />

      {/* Brush icon + size dots */}
      <div className="flex items-center gap-2">
        <Paintbrush className="h-3.5 w-3.5 shrink-0 text-ink/40" />
        <div className="flex items-center gap-2">
          {BRUSH_DOTS.map((d) => {
            const active = strokeWidth === d.size;
            const dim = Math.max(5, d.size * 1.4);
            return (
              <button
                key={d.label}
                onClick={() => onStrokeWidthChange(d.size)}
                aria-label={`Brush size ${d.label}`}
                title={d.label}
                className="flex items-center justify-center transition-transform hover:scale-110"
                style={{ width: 20, height: 20 }}
              >
                <span
                  className="rounded-full transition-colors"
                  style={{
                    width: dim,
                    height: dim,
                    backgroundColor: active ? "#a78bfa" : "#cfd6e666",
                    boxShadow: active ? "0 0 0 2px #a78bfa55" : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-4 w-px shrink-0 bg-violet-3/20" />

      {/* Color swatches */}
      <div className="flex items-center gap-1.5">
        {allColors.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            aria-label={c}
            title={c}
            className="h-5 w-5 rounded-full border border-white/10 transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              boxShadow:
                color === c
                  ? "0 0 0 2px #0a0e1c, 0 0 0 3.5px #a78bfa"
                  : undefined,
            }}
          />
        ))}
        <button
          onClick={addColor}
          aria-label="Add colour"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-violet-3/40 text-ink/40 transition-colors hover:border-violet-2/60 hover:text-violet-2"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <div className="h-4 w-px shrink-0 bg-violet-3/20" />

      {/* Size label */}
      <span className="text-xs text-ink/50">
        Size{" "}
        <span className="text-ink/80">{strokeWidth}px</span>
      </span>

      <div className="h-4 w-px shrink-0 bg-violet-3/20" />

      {/* Opacity dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpacityOpen((v) => !v)}
          className="flex items-center gap-1 rounded border border-violet-3/25 px-2 py-1 text-xs text-ink/70 transition-colors hover:border-violet-2/40 hover:text-ink"
        >
          {opacity}
          <ChevronDown
            className={`h-3 w-3 text-ink/40 transition-transform ${opacityOpen ? "rotate-180" : ""}`}
          />
        </button>
        {opacityOpen && (
          <div className="absolute bottom-full left-0 z-20 mb-1 rounded-lg border border-violet-3/30 bg-bg-0 py-1 shadow-lg">
            {OPACITIES.map((o) => (
              <button
                key={o}
                onClick={() => { setOpacity(o); setOpacityOpen(false); }}
                className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-violet-2/10 ${
                  opacity === o ? "text-violet-1" : "text-ink/70"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
