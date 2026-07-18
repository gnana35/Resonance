"use client";

import {
  Activity,
  ChevronLeft,
  Check,
  File,
  Flag,
  Maximize2,
  MoreHorizontal,
  Plus,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";

export default function WriterHome() {
  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-4xl text-gold-1">
            The Writer&apos;s Space
          </h1>
          <p className="mt-2 text-lg text-ink">Plot, Continuity, Dialogue</p>
          <p className="mt-4 max-w-xl text-ink/70">
            Built-in distraction-free editor.
          </p>
          <p className="max-w-xl text-ink/70">
            The Continuity Editor: Flags plot holes and character arc breaks.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="w-44 rounded-xl border border-gold-3/25 bg-bg-1 p-4">
            <div className="flex items-center justify-between text-sm text-ink/70">
              Project
              <ChevronLeft className="h-3.5 w-3.5 -rotate-90" />
            </div>
            <p className="mt-3 text-xl text-ink/40">—</p>
            <p className="mt-1 text-sm text-ink/50">No project selected</p>
          </div>
          <div className="w-44 rounded-xl border border-gold-3/25 bg-bg-1 p-4">
            <p className="text-sm text-ink/70">Words</p>
            <p className="mt-3 text-xl text-ink/40">—</p>
            <p className="mt-1 text-sm text-ink/50">No words yet</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1">
          <div className="flex items-center justify-between border-b border-gold-3/20 px-6 py-4">
            <div className="flex items-center gap-2 text-ink">
              <ChevronLeft className="h-4 w-4" />
              New Document
            </div>
            <div className="flex items-center gap-4 text-sm text-ink/60">
              <span className="flex items-center gap-1.5 text-emerald-400/80">
                <Check className="h-3.5 w-3.5" />
                Auto-save on
              </span>
              <Maximize2 className="h-4 w-4 cursor-pointer hover:text-ink" />
              <MoreHorizontal className="h-4 w-4 cursor-pointer hover:text-ink" />
            </div>
          </div>

          <div className="flex flex-col items-center px-6 py-24 text-center">
            <button
              onClick={() => console.log("new document")}
              aria-label="Start a new document"
              className="flex h-24 w-24 items-center justify-center rounded-full border border-gold-3/40 text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1"
            >
              <Plus className="h-8 w-8" />
            </button>

            <h2 className="mt-8 font-display text-3xl text-gold-1">
              Start a new document
            </h2>
            <p className="mt-3 max-w-sm text-ink/70">
              Capture your ideas, write your story, and build your world.
            </p>

            <button
              onClick={() => console.log("new document")}
              className="mt-8 flex items-center gap-2 rounded-full bg-gold-2 px-6 py-3 font-medium text-bg-0 transition-colors hover:bg-gold-1"
            >
              <Plus className="h-4 w-4" />
              New Document
            </button>

            <p className="mt-4 text-sm text-ink/50">or</p>

            <button
              onClick={() => console.log("choose a template")}
              className="mt-2 flex items-center gap-2 text-sm text-ink/70 transition-colors hover:text-gold-1"
            >
              <File className="h-3.5 w-3.5" />
              Choose a template
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <div className="flex items-center gap-2 text-ink">
              <Activity className="h-4 w-4 text-gold-2" />
              Continuity Editor
            </div>

            <div className="mt-8 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gold-3/40 text-gold-2">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-4 font-medium text-ink">No content yet</p>
              <p className="mt-2 text-sm text-ink/60">
                Your continuity notes, plot holes, and arc breaks will appear
                here.
              </p>
            </div>

            <div className="mt-6 flex gap-2 text-sm">
              <span className="rounded-full bg-bg-0 px-3 py-1.5 text-ink">
                All
              </span>
              <span className="px-3 py-1.5 text-ink/60">Plot Holes</span>
              <span className="px-3 py-1.5 text-ink/60">Arc Breaks</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between text-ink">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gold-2" />
                Writing Goals
              </div>
              <Settings className="h-4 w-4 text-ink/50" />
            </div>

            <div className="mt-8 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gold-3/40 text-gold-2">
                <Flag className="h-6 w-6" />
              </div>
              <p className="mt-4 font-medium text-ink">No goals set yet</p>
              <p className="mt-2 text-sm text-ink/60">
                Set a daily word goal to stay on track.
              </p>
            </div>

            <button
              onClick={() => console.log("set goal")}
              className="mt-6 w-full rounded-full border border-gold-2/50 py-2 text-sm text-gold-2 transition-colors hover:border-gold-1 hover:text-gold-1"
            >
              Set Goal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
