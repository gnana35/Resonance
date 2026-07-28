"use client";

import { SketchpadCanvas } from "@/components/SketchpadCanvas";
import { Download, MoreHorizontal, Plus } from "lucide-react";

export default function Sketchpad() {
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
            onClick={() => console.log("new canvas")}
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

      <SketchpadCanvas />
    </div>
  );
}
