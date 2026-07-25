"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderOpen,
  GripVertical,
  History,
  Layers,
  List,
  Lock,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { DocumentEditor } from "@/components/DocumentEditor";
import { OUTLINE, type OutlineItem } from "@/data/outline";

/* ─── Types ───────────────────────────────────────────────────────────── */

type Issue = {
  id: string;
  type: "Plot Hole" | "Arc Break";
  tag: string;
  description: string;
};

type View = "outline" | "document";

/* ─── Constants ───────────────────────────────────────────────────────── */

const ISSUES: Issue[] = [
  {
    id: "1",
    type: "Plot Hole",
    tag: "Chapter 2",
    description:
      "Lira's wound disappears between chapters. Consider showing recovery or consequences.",
  },
  {
    id: "2",
    type: "Plot Hole",
    tag: "Chapter 3",
    description:
      "The guard at the east gate doesn't recognize Lira, though they met in Chapter 1.",
  },
  {
    id: "3",
    type: "Arc Break",
    tag: "Kael",
    description:
      "Kael's motivation shifts suddenly. Consider adding internal conflict or a reason for the change.",
  },
];

const SEED_DOCUMENT_HTML = `
  <p>The wind carried whispers tonight.</p>
  <p>Lira stood at the edge of the cliff, her cloak dancing in the clouds below. The city of Veyndor glimmered in the distance—beautiful, uncaring.</p>
  <p>"You shouldn't be here," a voice said.</p>
  <p>She didn't turn.</p>
  <p>"I'm always here," she replied.</p>
`;

const DOC_MENU_ITEMS = [
  { icon: Pencil,     label: "Rename document" },
  { icon: Upload,     label: "Export" },
  { icon: FolderOpen, label: "Move to project / folder" },
  { icon: History,    label: "Version history" },
  { icon: Share2,     label: "Share collaborators" },
  { icon: Trash2,     label: "Delete" },
  { icon: Lock,       label: "Lock document" },
];

/* ─── Outline helpers (inlined from old outliner page) ────────────────── */

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

/* ─── Main component ──────────────────────────────────────────────────── */

export default function WriterHome() {
  /* document state */
  const [view, setView] = useState<View>("document");
  const [hasDocument, setHasDocument] = useState(false);
  const [issueFilter, setIssueFilter] = useState<"All" | "Plot Hole" | "Arc Break">("All");
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* outline state */
  const [outline, setOutline] = useState<OutlineItem[]>(OUTLINE);
  const [expandedParts, toggleParts] = useToggleSet(
    OUTLINE.filter((i) => i.kind === "part").map((i) => i.id),
  );
  const [expandedChapters, toggleChapters] = useToggleSet();

  const outlineStats = useMemo(() => {
    const parts = outline.filter((i) => i.kind === "part");
    const chapters = parts.flatMap((p) => p.chapters ?? []);
    const scenesInChapters = chapters.reduce((sum, c) => sum + c.scenes.length, 0);
    const prologue = outline.find((i) => i.kind === "prologue");
    const scenesInPrologue = prologue?.scenes?.length ?? 0;
    const totalScenes = scenesInChapters + scenesInPrologue;
    return {
      parts: parts.length,
      chapters: chapters.length,
      scenes: totalScenes,
      totalItems: outline.length + chapters.length + totalScenes,
    };
  }, [outline]);

  const plotHoleCount = ISSUES.filter((i) => i.type === "Plot Hole").length;
  const arcBreakCount = ISSUES.filter((i) => i.type === "Arc Break").length;
  const filteredIssues =
    issueFilter === "All" ? ISSUES : ISSUES.filter((i) => i.type === issueFilter);

  /* Close the three-dot menu when clicking outside */
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function addPart() {
    const partNumber = outline.filter((i) => i.kind === "part").length + 1;
    setOutline((prev) => [
      ...prev,
      { id: `part-${Date.now()}`, kind: "part", title: `Part ${partNumber} – Untitled`, chapters: [] },
    ]);
  }

  /* ── Document panel ───────────────────────────────────────────────── */
  const documentPanel = (
    <div
      className={`rounded-2xl border border-gold-3/25 bg-bg-1 ${
        expanded ? "fixed inset-4 z-50 flex flex-col overflow-hidden" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gold-3/20 px-6 py-4">
        <button
          onClick={() => setView("outline")}
          className="flex items-center gap-2 text-ink transition-colors hover:text-gold-1"
          aria-label="Back to outline"
        >
          <ChevronLeft className="h-4 w-4" />
          {hasDocument ? "Chapter 3: The First Whisper" : "New Document"}
        </button>

        <div className="flex items-center gap-4 text-sm text-ink/60">
          <span className="flex items-center gap-1.5 text-emerald-400/80">
            <Check className="h-3.5 w-3.5" />
            {hasDocument ? "Auto-saved" : "Auto-save on"}
          </span>

          {/* Expand / collapse */}
          <button
            aria-label={expanded ? "Collapse editor" : "Expand editor"}
            onClick={() => setExpanded((v) => !v)}
            className="hover:text-ink"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              aria-label="Document options"
              onClick={() => setMenuOpen((v) => !v)}
              className="hover:text-ink"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gold-3/40 bg-bg-1 py-1.5 shadow-xl">
                {DOC_MENU_ITEMS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => { console.log(label); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink/80 transition-colors hover:bg-gold-2/10 hover:text-gold-1"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink/50" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      {hasDocument ? (
        <DocumentEditor initialHtml={SEED_DOCUMENT_HTML} />
      ) : (
        <div className="flex flex-col items-center px-6 py-24 text-center">
          <button
            onClick={() => setHasDocument(true)}
            aria-label="Start a new document"
            className="flex h-24 w-24 items-center justify-center rounded-full border border-gold-3/40 text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1"
          >
            <Plus className="h-8 w-8" />
          </button>
          <h2 className="mt-8 font-display text-3xl text-gold-1">Start a new document</h2>
          <p className="mt-3 max-w-sm text-ink/70">
            Capture your ideas, write your story, and build your world.
          </p>
          <button
            onClick={() => setHasDocument(true)}
            className="mt-8 flex items-center gap-2 rounded-full bg-gold-2 px-6 py-3 font-medium text-bg-0 transition-colors hover:bg-gold-1"
          >
            <Plus className="h-4 w-4" />
            New Document
          </button>
        </div>
      )}
    </div>
  );

  /* ── Outline panel ────────────────────────────────────────────────── */
  const outlinePanel = (
    <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[1fr_320px] xl:items-start xl:gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Back to document */}
            <button
              onClick={() => setView("document")}
              aria-label="Back to document"
              className="flex items-center gap-1.5 text-ink/60 transition-colors hover:text-gold-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </button>
            <div className="h-4 w-px bg-gold-3/30" />
            <List className="h-5 w-5 text-ink/70" />
            <h1 className="font-display text-2xl text-gold-1">Outline</h1>
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
              onClick={() => setView("document")}
              className="flex items-center gap-2 rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1"
            >
              <Plus className="h-4 w-4" />
              New Document
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
                onOpenDocument={() => setView("document")}
              />
            ) : (
              <PartRow
                key={item.id}
                item={item}
                expanded={expandedParts.has(item.id)}
                onToggle={() => toggleParts(item.id)}
                expandedChapters={expandedChapters}
                onToggleChapter={toggleChapters}
                onOpenDocument={() => setView("document")}
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

      {/* Overview sidebar */}
      <div className="mt-8 rounded-2xl border border-gold-3/25 bg-bg-1 p-5 xl:mt-0">
        <div className="flex items-center gap-2 text-ink">
          <Layers className="h-4 w-4 text-gold-2" />
          Outline Overview
        </div>

        <p className="mt-5 text-sm text-ink/60">Total Items</p>
        <p className="mt-1 font-display text-3xl text-gold-1">{outlineStats.totalItems}</p>
        <p className="mt-1 text-sm text-ink/50">
          {outlineStats.parts} Parts · {outlineStats.chapters} Chapters · {outlineStats.scenes} Scenes
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
  );

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="px-6 py-8 md:px-10">
      {/* Backdrop when editor is expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-bg-0/70 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}

      <div className="mb-8">
        <h1 className="font-display text-4xl text-gold-1">The Writer&apos;s Space</h1>
      </div>

      {view === "outline" ? (
        outlinePanel
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          {documentPanel}

          {/* Continuity editor sidebar */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <div className="flex items-center gap-2 text-ink">
                <Activity className="h-4 w-4 text-gold-2" />
                Continuity Editor
              </div>

              {hasDocument ? (
                <>
                  <button
                    onClick={() => console.log("review issues")}
                    className="mt-4 flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left"
                  >
                    <span className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span>
                        <span className="block text-sm font-medium text-amber-300">
                          {ISSUES.length} Issues Found
                        </span>
                        <span className="block text-xs text-ink/60">
                          Review to strengthen your story
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink/50" />
                  </button>

                  <div className="mt-4 flex gap-4 border-b border-gold-3/20 text-sm">
                    {(
                      [
                        { key: "All", label: `All (${ISSUES.length})` },
                        { key: "Plot Hole", label: `Plot Holes (${plotHoleCount})` },
                        { key: "Arc Break", label: `Arc Breaks (${arcBreakCount})` },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setIssueFilter(tab.key)}
                        className={`-mb-px border-b-2 pb-2 transition-colors ${
                          issueFilter === tab.key
                            ? "border-gold-2 text-gold-1"
                            : "border-transparent text-ink/50 hover:text-ink"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-4">
                    {filteredIssues.map((issue) => (
                      <div key={issue.id} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium text-ink">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                issue.type === "Plot Hole" ? "bg-red-400" : "bg-amber-400"
                              }`}
                            />
                            {issue.type}
                          </span>
                          <span className="text-xs text-ink/50">{issue.tag}</span>
                        </div>
                        <p className="mt-1 text-ink/60">
                          {issue.description}{" "}
                          <button
                            onClick={() => console.log("view issue", issue.id)}
                            className="text-gold-2 hover:text-gold-1"
                          >
                            View
                          </button>
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-8 flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gold-3/40 text-gold-2">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <p className="mt-4 font-medium text-ink">No content yet</p>
                    <p className="mt-2 text-sm text-ink/60">
                      Your continuity notes, plot holes, and arc breaks will appear here.
                    </p>
                  </div>

                  <div className="mt-6 flex gap-2 text-sm">
                    <span className="rounded-full bg-bg-0 px-3 py-1.5 text-ink">All</span>
                    <span className="px-3 py-1.5 text-ink/60">Plot Holes</span>
                    <span className="px-3 py-1.5 text-ink/60">Arc Breaks</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Outline row components ──────────────────────────────────────────── */

function PrologueRow({
  item,
  expanded,
  onToggle,
  onOpenDocument,
}: {
  item: OutlineItem;
  expanded: boolean;
  onToggle: () => void;
  onOpenDocument: () => void;
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
        <button
          className="min-w-0 flex-1 text-left"
          onClick={onOpenDocument}
        >
          <p className="font-medium text-ink hover:text-gold-1 transition-colors">{item.title}</p>
          {item.summary && (
            <p className="mt-0.5 truncate text-sm text-ink/50">{item.summary}</p>
          )}
        </button>
        <span className="shrink-0 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/60">
          {item.scenes?.length ?? 0} Scene{(item.scenes?.length ?? 0) === 1 ? "" : "s"}
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
  onOpenDocument,
}: {
  item: OutlineItem;
  expanded: boolean;
  onToggle: () => void;
  expandedChapters: Set<string>;
  onToggleChapter: (id: string) => void;
  onOpenDocument: () => void;
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
              <div key={chapter.id} className="rounded-lg border border-gold-3/15 bg-bg-0/40">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <GripVertical className="h-4 w-4 shrink-0 text-ink/30" />
                  <button onClick={() => onToggleChapter(chapter.id)} aria-label="Toggle chapter">
                    {chapterExpanded ? (
                      <ChevronDown className="h-4 w-4 text-ink/50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-ink/50" />
                    )}
                  </button>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gold-2" />
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={onOpenDocument}
                  >
                    <p className="text-ink hover:text-gold-1 transition-colors">{chapter.title}</p>
                    <p className="mt-0.5 truncate text-sm text-ink/50">{chapter.summary}</p>
                  </button>
                  <span className="shrink-0 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/60">
                    {chapter.scenes.length} Scene{chapter.scenes.length === 1 ? "" : "s"}
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
                      <div key={scene.id} className="flex items-center gap-2 text-sm text-ink/60">
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
