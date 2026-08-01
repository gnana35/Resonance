"use client";

import { Plus, Redo2, Undo2 } from "lucide-react";
import { useRef, useState } from "react";

const DEFAULT_COLORS = [
  "#1a1a1a",
  "#ffffff",
  "#a78bfa",
  "#2dd4bf",
  "#a67c52",
  "#6b7a99",
];

const BRUSH_SIZES = [
  { size: 2,  label: "XS" },
  { size: 4,  label: "S"  },
  { size: 8,  label: "M"  },
  { size: 14, label: "L"  },
  { size: 24, label: "XL" },
];

interface CanvasBottomBarProps {
  color: string;
  strokeWidth: number;
  opacity: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onColorChange: (c: string) => void;
  onStrokeWidthChange: (w: number) => void;
  onOpacityChange: (o: number) => void;
  swatches?: string[];
  onSwatchAdd?: (c: string) => void;
}

export function CanvasBottomBar({
  color,
  strokeWidth,
  opacity,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  swatches,
  onSwatchAdd,
}: CanvasBottomBarProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const allColors = swatches ?? DEFAULT_COLORS;

  function handleAddColor() {
    colorInputRef.current?.click();
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

      {/* Brush sizes */}
      <div className="flex items-center gap-1.5">
        {BRUSH_SIZES.map((b) => {
          const active = strokeWidth === b.size;
          const dim = Math.max(5, b.size * 1.2);
          return (
            <button
              key={b.label}
              onClick={() => onStrokeWidthChange(b.size)}
              aria-label={`Brush ${b.label} (${b.size}px)`}
              title={b.label}
              className="flex h-6 w-6 items-center justify-center transition-transform hover:scale-110"
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
        <span className="ml-1 text-[10px] text-ink/40">{strokeWidth}px</span>
      </div>

      <div className="h-4 w-px shrink-0 bg-violet-3/20" />

      {/* Color swatches + picker */}
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
        {/* Active color indicator + native picker trigger */}
        <button
          onClick={() => colorInputRef.current?.click()}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-violet-2/50 transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
          title="Open colour picker"
          aria-label="Current colour — click to pick"
        />
        <button
          onClick={handleAddColor}
          aria-label="Add colour"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-violet-3/40 text-ink/40 transition-colors hover:border-violet-2/60 hover:text-violet-2"
        >
          <Plus className="h-3 w-3" />
        </button>
        {/* Hidden native color input */}
        <input
          ref={colorInputRef}
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          onBlur={(e) => {
            const c = e.target.value;
            if (onSwatchAdd && !allColors.includes(c)) onSwatchAdd(c);
          }}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      <div className="h-4 w-px shrink-0 bg-violet-3/20" />

      {/* Opacity */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-ink/40">Opacity</span>
        <input
          type="range"
          min={1}
          max={100}
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          className="h-1 w-20 cursor-pointer accent-violet-2"
        />
        <span className="w-7 text-right text-[10px] text-ink/50">{opacity}%</span>
      </div>
    </div>
  );
}
