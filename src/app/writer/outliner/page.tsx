"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  GripVertical,
  Layers,
  List,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { OUTLINE, type OutlineItem } from "@/data/outline";

function useToggleSet(initial: string[] = []) {
  const [set, setSet] = useState(new Set(initial));
  function toggle(id: string) {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return [set, toggle] as const;
}

export default function Outliner() {
  const [outline, setOutline] = useState<OutlineItem[]>(OUTLINE);
  const [expandedParts, toggleParts] = useToggleSet(
    OUTLINE.filter((i) => i.kind === "part").map((i) => i.id),
  );
  const [expandedChapters, toggleChapters] = useToggleSet();

  const stats = useMemo(() => {
    const parts = outline.filter((i) => i.kind === "part");
    const chapters = parts.flatMap((p) => p.chapters ?? []);
    const scenesInChapters = chapters.reduce(
      (sum, c) => sum + c.scenes.length,
      0,
    );
    const prologue = outline.find((i) => i.kind === "prologue");
    const scenesInPrologue = prologue?.scenes?.length ?? 0;
    const totalScenes = scenesInChapters + scenesInPrologue;
    const totalItems =
      outline.length + chapters.length + totalScenes;
    return {
      parts: parts.length,
      chapters: chapters.length,
      scenes: totalScenes,
      totalItems,
    };
  }, [outline]);

  function addPart() {
    const partNumber = outline.filter((i) => i.kind === "part").length + 1;
    setOutline((prev) => [
      ...prev,
      {
        id: `part-${Date.now()}`,
        kind: "part",
        title: `Part ${partNumber} – Untitled`,
        chapters: [],
      },
    ]);
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[1fr_320px] xl:items-start xl:gap-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <List className="mt-1 h-5 w-5 text-ink/70" />
              <div>
                <h1 className="font-display text-2xl text-gold-1">
                  Outliner
                </h1>
                <p className="mt-1 text-ink/70">
                  Structure your story. Drag to reorder, add, and collapse.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => console.log("toggle view mode")}
                className="flex items-center gap-2 rounded-md border border-gold-3/30 px-3 py-1.5 text-sm text-ink hover:border-gold-2/50"
              >
                View: Hierarchy
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => console.log("list options")}
                aria-label="List options"
                className="rounded-md border border-gold-3/30 p-2 text-ink/70 hover:border-gold-2/50 hover:text-ink"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => console.log("filter outline")}
                aria-label="Filters"
                className="rounded-md border border-gold-3/30 p-2 text-ink/70 hover:border-gold-2/50 hover:text-ink"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                onClick={() => console.log("add item")}
                className="flex items-center gap-2 rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {outline.map((item) =>
              item.kind === "prologue" ? (
                <PrologueRow
                  key={item.id}
                  item={item}
                  expanded={expandedParts.has(item.id)}
                  onToggle={() => toggleParts(item.id)}
                />
              ) : (
                <PartRow
                  key={item.id}
                  item={item}
                  expanded={expandedParts.has(item.id)}
                  onToggle={() => toggleParts(item.id)}
                  expandedChapters={expandedChapters}
                  onToggleChapter={toggleChapters}
                />
              ),
            )}

            <button
              onClick={addPart}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gold-3/40 py-3 text-sm text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1"
            >
              <Plus className="h-4 w-4" />
              Add Part
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-gold-3/25 bg-bg-1 p-5 xl:mt-0">
          <div className="flex items-center gap-2 text-ink">
            <Layers className="h-4 w-4 text-gold-2" />
            Outline Overview
          </div>

          <p className="mt-5 text-sm text-ink/60">Total Items</p>
          <p className="mt-1 font-display text-3xl text-gold-1">
            {stats.totalItems}
          </p>
          <p className="mt-1 text-sm text-ink/50">
            {stats.parts} Parts · {stats.chapters} Chapters · {stats.scenes}{" "}
            Scenes
          </p>

          <p className="mt-6 text-sm text-ink/60">Story Progress</p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink/40">—</span>
            <span className="text-ink">0%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-0">
            <div className="h-full w-0 rounded-full bg-gold-2" />
          </div>
          <p className="mt-2 text-sm text-ink/50">No scenes drafted yet.</p>

          <div className="mt-6 flex items-center gap-2 text-sm text-ink/50">
            <Clock className="h-3.5 w-3.5" />
            Last Updated
          </div>
          <p className="mt-1 text-ink/80">Just now</p>
        </div>
      </div>
    </div>
  );
}

function PrologueRow({
  item,
  expanded,
  onToggle,
}: {
  item: OutlineItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-gold-3/25 bg-bg-1">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} aria-label="Toggle prologue">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-ink/50" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ink/50" />
          )}
        </button>
        <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{item.title}</p>
          {item.summary && (
            <p className="mt-0.5 truncate text-sm text-ink/50">
              {item.summary}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/60">
          {item.scenes?.length ?? 0} Scene
          {(item.scenes?.length ?? 0) === 1 ? "" : "s"}
        </span>
        <button
          onClick={() => console.log("prologue menu")}
          aria-label="More options"
          className="text-ink/40 hover:text-ink"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {expanded && item.scenes && (
        <div className="flex flex-col gap-1.5 border-t border-gold-3/15 px-4 py-3 pl-11">
          {item.scenes.map((scene) => (
            <div key={scene.id} className="flex items-center gap-2 text-sm text-ink/60">
              <span className="h-1 w-1 rounded-full bg-ink/40" />
              {scene.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartRow({
  item,
  expanded,
  onToggle,
  expandedChapters,
  onToggleChapter,
}: {
  item: OutlineItem;
  expanded: boolean;
  onToggle: () => void;
  expandedChapters: Set<string>;
  onToggleChapter: (id: string) => void;
}) {
  const chapters = item.chapters ?? [];
  return (
    <div className="rounded-xl border border-gold-3/25 bg-bg-1">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} aria-label="Toggle part">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-ink/50" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ink/50" />
          )}
        </button>
        <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
        <p className="min-w-0 flex-1 font-medium text-ink">{item.title}</p>
        <span className="shrink-0 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/60">
          {chapters.length} Chapter{chapters.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={() => console.log("part menu", item.id)}
          aria-label="More options"
          className="text-ink/40 hover:text-ink"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-gold-3/15 p-3 pl-8">
          {chapters.map((chapter) => {
            const chapterExpanded = expandedChapters.has(chapter.id);
            return (
              <div
                key={chapter.id}
                className="rounded-lg border border-gold-3/15 bg-bg-0/40"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <GripVertical className="h-4 w-4 shrink-0 text-ink/30" />
                  <button
                    onClick={() => onToggleChapter(chapter.id)}
                    aria-label="Toggle chapter"
                  >
                    {chapterExpanded ? (
                      <ChevronDown className="h-4 w-4 text-ink/50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-ink/50" />
                    )}
                  </button>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gold-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink">{chapter.title}</p>
                    <p className="mt-0.5 truncate text-sm text-ink/50">
                      {chapter.summary}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/60">
                    {chapter.scenes.length} Scene
                    {chapter.scenes.length === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => console.log("chapter menu", chapter.id)}
                    aria-label="More options"
                    className="text-ink/40 hover:text-ink"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                {chapterExpanded && (
                  <div className="flex flex-col gap-1.5 border-t border-gold-3/15 px-3 py-2.5 pl-14">
                    {chapter.scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className="flex items-center gap-2 text-sm text-ink/60"
                      >
                        <span className="h-1 w-1 rounded-full bg-ink/40" />
                        {scene.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
