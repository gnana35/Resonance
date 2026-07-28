"use client";

import { Maximize2, Minus, Plus, Redo2, Undo2 } from "lucide-react";

interface CanvasToolbarProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreen: () => void;
}

export function CanvasToolbar({
  canvasWidth,
  canvasHeight,
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFullscreen,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-t-xl border border-b-0 border-violet-3/25 bg-bg-1 px-4 py-2">
      {/* Canvas label + dimensions */}
      <div className="flex items-center gap-2.5 text-sm">
        <span className="text-ink/80">Canvas 1</span>
        <span className="text-ink/35">
          {canvasWidth} × {canvasHeight}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          className="rounded p-1.5 text-ink/50 transition-colors hover:bg-violet-2/10 hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          className="rounded p-1.5 text-ink/50 transition-colors hover:bg-violet-2/10 hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1.5 h-4 w-px bg-violet-3/25" />

        {/* Zoom */}
        <button
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="rounded p-1.5 text-ink/50 transition-colors hover:bg-violet-2/10 hover:text-ink"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-11 text-center text-xs tabular-nums text-ink/60">
          {zoom}%
        </span>
        <button
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="rounded p-1.5 text-ink/50 transition-colors hover:bg-violet-2/10 hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1.5 h-4 w-px bg-violet-3/25" />

        {/* Fullscreen */}
        <button
          onClick={onFullscreen}
          aria-label="Fullscreen"
          className="rounded p-1.5 text-ink/50 transition-colors hover:bg-violet-2/10 hover:text-ink"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
