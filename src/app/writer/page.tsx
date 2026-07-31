"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  List,
  Pencil,
  Plus,
  Trash2,
  X,
  Feather,
} from "lucide-react";
import { DocumentEditor, type DocumentEditorHandle } from "@/components/DocumentEditor";
import { syncPushBackground } from "@/lib/cloudSync";

/* ══════════════════════════════════════════════════════════════════════════
   DATA TYPES
   ══════════════════════════════════════════════════════════════════════════ */

export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Part = {
  id: string;
  projectId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Chapter = {
  id: string;
  projectId: string;
  partId: string | null; // null = top-level (no part)
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

/* ══════════════════════════════════════════════════════════════════════════
   STORAGE
   ══════════════════════════════════════════════════════════════════════════ */

const SK = {
  projects:  "resonance:projects",
  parts:     "resonance:parts",
  chapters:  "resonance:chapters",
  expProj:   "resonance:collapseState:projects",
  expParts:  "resonance:collapseState:parts",
  openTabs:  "resonance:openTabs",
  activeTab: "resonance:activeTab",
  activeProj:"resonance:activeProject",
} as const;

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO() { return new Date().toISOString(); }

/* ══════════════════════════════════════════════════════════════════════════
   INLINE TITLE EDITOR
   Appears in-place when a new node is created or user double-clicks.
   Enter or blur commits; Escape reverts.
   ══════════════════════════════════════════════════════════════════════════ */

function InlineTitleEditor({
  initialValue,
  placeholder,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  placeholder: string;
  onCommit: (val: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);
  const committed = useRef(false);

  useLayoutEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function commit() {
    if (committed.current) return;
    committed.current = true;
    const v = val.trim();
    if (v) onCommit(v);
    else onCancel();
  }

  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
      }}
      onBlur={commit}
      placeholder={placeholder}
      className="min-w-0 flex-1 rounded border border-gold-2/50 bg-bg-0 px-2 py-0.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none"
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DELETE CONFIRMATION MODAL
   ══════════════════════════════════════════════════════════════════════════ */

type DeleteTarget =
  | { kind: "project"; id: string; name: string }
  | { kind: "part";    id: string; title: string }
  | { kind: "chapter"; id: string; title: string };

function DeleteModal({
  target,
  onConfirm,
  onCancel,
}: {
  target: DeleteTarget;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  const heading =
    target.kind === "project" ? "DELETE PROJECT?" :
    target.kind === "part"    ? "DELETE PART?"    : "DELETE CHAPTER?";

  const body =
    target.kind === "project"
      ? `"${target.name}" and all its parts, chapters, and content will be permanently deleted.`
      : target.kind === "part"
      ? `"${target.title}" and all chapters inside it will be permanently deleted.`
      : `"${target.title}" and all its content will be permanently deleted.`;

  const btnLabel =
    target.kind === "project" ? "Delete Project" :
    target.kind === "part"    ? "Delete Part"    : "Delete Chapter";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-bg-0/75 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-gold-3/40 bg-bg-1 p-6 shadow-2xl">
          <h2 className="font-display text-xl tracking-wide text-gold-1">{heading}</h2>
          <p className="mt-3 text-sm text-ink/70">{body}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-full border border-gold-3/30 px-5 py-2 text-sm text-ink/70 transition-colors hover:border-gold-2/50 hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded-full bg-red-500/80 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              {btnLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CHAPTER ROW
   Gold dot. Click title / pencil → opens editor.
   Double-click title → inline rename.
   ══════════════════════════════════════════════════════════════════════════ */

function ChapterRow({
  chapter,
  onOpen,
  onDelete,
  onRename,
  onReorder,
  startEditing,
}: {
  chapter: Chapter;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  /** Drop `draggedId` onto this chapter to reorder. */
  onReorder?: (draggedId: string, targetId: string) => void;
  /** True when this row was just created — immediately enter rename mode */
  startEditing?: boolean;
}) {
  const [renaming, setRenaming] = useState(!!startEditing);
  // "over" drives the drop indicator; "dragging" dims the row being moved.
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);

  function commitRename(val: string) {
    onRename(val);
    setRenaming(false);
  }

  // Single-click vs double-click disambiguation
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTitleClick() {
    if (clickTimer.current) {
      // second click within 300ms — treat as double-click (rename)
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setRenaming(true);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onOpen();
      }, 300);
    }
  }

  return (
    <div
      // The whole row is the drag source; the grip is the visual affordance.
      // Rename is inline text editing, so dragging is disabled while renaming
      // or the input cannot be selected with the mouse.
      draggable={!renaming}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", chapter.id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => { setDragging(false); setDragOver(false); }}
      onDragOver={(e) => {
        e.preventDefault();               // required, or drop never fires
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && draggedId !== chapter.id) onReorder?.(draggedId, chapter.id);
      }}
      className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
        dragging
          ? "border-gold-3/15 bg-bg-0/40 opacity-40"
          : dragOver
          ? "border-gold-2/70 bg-gold-2/10"
          : "border-gold-3/15 bg-bg-0/40 hover:border-gold-3/30 hover:bg-bg-0/70"
      }`}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink/20 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing" />
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-2" />
      {renaming ? (
        <InlineTitleEditor
          initialValue={chapter.title}
          placeholder="Untitled Chapter"
          onCommit={commitRename}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <button
          className="min-w-0 flex-1 text-left text-sm text-ink/80 transition-colors hover:text-gold-1"
          onClick={handleTitleClick}
          title="Click to open · Double-click to rename"
        >
          {chapter.title}
        </button>
      )}
      {!renaming && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            aria-label="Open chapter"
            className="shrink-0 text-ink/25 opacity-0 transition-all group-hover:opacity-100 hover:text-gold-2"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Delete chapter"
            className="shrink-0 text-ink/25 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PART ROW
   Purple dot. Title inline-editable (double-click or pencil icon on hover).
   + Add Chapter always visible. Chevron expands/collapses children.
   Vertical guide line down left of children.
   ══════════════════════════════════════════════════════════════════════════ */

function PartRow({
  part,
  chapters,
  expanded,
  onToggle,
  onAddChapter,
  onDelete,
  onRename,
  onChapterOpen,
  onChapterDelete,
  onChapterRename,
  onChapterReorder,
  onChapterMoveToPart,
  startEditing,
  newChapterId,
}: {
  part: Part;
  chapters: Chapter[];
  expanded: boolean;
  onToggle: () => void;
  onAddChapter: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onChapterOpen: (chapterId: string) => void;
  onChapterDelete: (chapterId: string) => void;
  onChapterRename: (chapterId: string, title: string) => void;
  onChapterReorder: (draggedId: string, targetId: string) => void;
  /** Drop a chapter on the part header to move it into this part. */
  onChapterMoveToPart: (draggedId: string, partId: string) => void;
  startEditing?: boolean;
  newChapterId: string | null;
}) {
  const [renaming, setRenaming] = useState(!!startEditing);
  const [dropOver, setDropOver] = useState(false);

  function commitRename(val: string) {
    onRename(val);
    setRenaming(false);
  }

  return (
    <div className="ml-4 border-l border-violet-3/20 pl-3">
      {/* Part header */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropOver(true); }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropOver(false);
          const draggedId = e.dataTransfer.getData("text/plain");
          if (draggedId) onChapterMoveToPart(draggedId, part.id);
        }}
        className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
          dropOver ? "border-violet-2/70 bg-violet-2/10" : "border-violet-3/20 bg-bg-1/60"
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label="Toggle part"
          className="shrink-0 text-ink/40 hover:text-violet-1"
        >
          {expanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-2" />
        {renaming ? (
          <InlineTitleEditor
            initialValue={part.title}
            placeholder="Untitled Part"
            onCommit={commitRename}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <button
            className="min-w-0 flex-1 text-left text-sm font-medium text-ink/90 hover:text-violet-1"
            onDoubleClick={(e) => { e.preventDefault(); setRenaming(true); }}
            title="Double-click to rename"
          >
            {part.title}
          </button>
        )}
        {!renaming && (
          <>
            {/* + Add Chapter always visible */}
            <button
              onClick={(e) => { e.stopPropagation(); onAddChapter(); }}
              className="flex shrink-0 items-center gap-1 rounded-full border border-violet-3/50 px-2.5 py-1 text-xs text-violet-2 transition-colors hover:border-violet-2 hover:text-violet-1"
            >
              <Plus className="h-3 w-3" />Add Chapter
            </button>
            {/* Pencil (rename) — hover only */}
            <button
              onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
              aria-label="Rename part"
              className="shrink-0 text-ink/25 opacity-0 transition-all group-hover:opacity-100 hover:text-gold-2"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label="Delete part"
              className="shrink-0 text-ink/25 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Children (with vertical guide already provided by parent border-l) */}
      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1.5 pl-2">
          {chapters.length === 0 ? (
            <p className="py-1.5 pl-2 text-xs text-ink/30">No chapters yet.</p>
          ) : (
            chapters.map((ch) => (
              <ChapterRow
                key={ch.id}
                chapter={ch}
                onOpen={() => onChapterOpen(ch.id)}
                onDelete={() => onChapterDelete(ch.id)}
                onRename={(t) => onChapterRename(ch.id, t)}
                onReorder={onChapterReorder}
                startEditing={ch.id === newChapterId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PROJECT ROW
   Renders a mixed top-level list: parts (by order) + top-level chapters
   (partId === null, by order), sorted together by their .order field.
   ══════════════════════════════════════════════════════════════════════════ */

type OutlineNode =
  | { nodeType: "part";    part: Part;    order: number }
  | { nodeType: "chapter"; chapter: Chapter; order: number };

function ProjectRow({
  project,
  parts,
  chapters,
  expanded,
  onToggle,
  expandedParts,
  onTogglePart,
  onAddPart,
  onAddProjectChapter,
  onAddPartChapter,
  onDelete,
  onChapterOpen,
  onPartDelete,
  onPartRename,
  onChapterDelete,
  onChapterRename,
  onChapterReorder,
  onChapterMoveToPart,
  newPartId,
  newChapterId,
}: {
  project: Project;
  parts: Part[];
  chapters: Chapter[];
  expanded: boolean;
  onToggle: () => void;
  expandedParts: Set<string>;
  onTogglePart: (partId: string) => void;
  onAddPart: () => void;
  onAddProjectChapter: () => void;
  onAddPartChapter: (partId: string) => void;
  onDelete: () => void;
  onChapterOpen: (chapterId: string) => void;
  onPartDelete: (partId: string) => void;
  onPartRename: (partId: string, title: string) => void;
  onChapterDelete: (chapterId: string) => void;
  onChapterRename: (chapterId: string, title: string) => void;
  onChapterReorder: (draggedId: string, targetId: string) => void;
  onChapterMoveToPart: (draggedId: string, partId: string) => void;
  newPartId: string | null;
  newChapterId: string | null;
}) {
  const topLevelChapters = chapters.filter((c) => c.partId === null);

  const nodes: OutlineNode[] = [
    ...parts.map((p) => ({ nodeType: "part" as const, part: p, order: p.order })),
    ...topLevelChapters.map((c) => ({
      nodeType: "chapter" as const,
      chapter: c,
      order: c.order,
    })),
  ].sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-xl border border-gold-3/25 bg-bg-1">
      {/* Project header */}
      <div className="group flex items-center gap-3 px-4 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label="Toggle project"
          className="shrink-0 text-ink/50 hover:text-gold-2"
        >
          {expanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="min-w-0 flex-1 font-display text-base tracking-wide text-gold-1">
          {project.name}
        </span>
        {/* + Add Part — gold pill */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddPart(); }}
          className="flex shrink-0 items-center gap-1 rounded-full border border-gold-3/50 px-2.5 py-1 text-xs text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1"
        >
          <Plus className="h-3 w-3" />Add Part
        </button>
        {/* + Add Chapter — purple pill */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddProjectChapter(); }}
          className="flex shrink-0 items-center gap-1 rounded-full border border-violet-3/50 px-2.5 py-1 text-xs text-violet-2 transition-colors hover:border-violet-2 hover:text-violet-1"
        >
          <Plus className="h-3 w-3" />Add Chapter
        </button>
        {/* Trash — brightens on hover, hidden until group hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete project"
          className="shrink-0 text-ink/30 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="flex flex-col gap-2 border-t border-gold-3/15 px-4 py-3">
          {nodes.length === 0 && (
            <p className="py-2 text-center text-sm text-ink/30">
              Add a part or chapter to begin.
            </p>
          )}
          {nodes.map((node) =>
            node.nodeType === "part" ? (
              <PartRow
                key={node.part.id}
                part={node.part}
                chapters={chapters
                  .filter((c) => c.partId === node.part.id)
                  .sort((a, b) => a.order - b.order)}
                expanded={expandedParts.has(node.part.id)}
                onToggle={() => onTogglePart(node.part.id)}
                onAddChapter={() => onAddPartChapter(node.part.id)}
                onDelete={() => onPartDelete(node.part.id)}
                onRename={(t) => onPartRename(node.part.id, t)}
                onChapterOpen={onChapterOpen}
                onChapterDelete={onChapterDelete}
                onChapterRename={onChapterRename}
                onChapterReorder={onChapterReorder}
                onChapterMoveToPart={onChapterMoveToPart}
                startEditing={node.part.id === newPartId}
                newChapterId={newChapterId}
              />
            ) : (
              <ChapterRow
                key={node.chapter.id}
                chapter={node.chapter}
                onOpen={() => onChapterOpen(node.chapter.id)}
                onDelete={() => onChapterDelete(node.chapter.id)}
                onRename={(t) => onChapterRename(node.chapter.id, t)}
                onReorder={onChapterReorder}
                startEditing={node.chapter.id === newChapterId}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WRITING EDITOR VIEW
   Tab bar + full editor. Back button returns to outline without losing tabs.
   Autosaves after user stops typing. Content survives refresh.
   ══════════════════════════════════════════════════════════════════════════ */

type OpenTab = { chapterId: string; projectId: string };

function WritingEditorView({
  tabs,
  activeTabId,
  chapters,
  onTabChange,
  onTabClose,
  onBack,
  onSave,
  onRenameChapter,
}: {
  tabs: OpenTab[];
  activeTabId: string;
  chapters: Chapter[];
  onTabChange: (chapterId: string) => void;
  onTabClose: (chapterId: string) => void;
  onBack: () => void;
  onSave: (chapterId: string, content: string) => void;
  onRenameChapter: (chapterId: string, title: string) => void;
}) {
  const editorRef     = useRef<DocumentEditorHandle>(null);
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [renamingTitle, setRenamingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const prevTabRef    = useRef<string>("");

  const activeChapter = chapters.find((c) => c.id === activeTabId);

  // When active tab changes: flush previous content, load new
  useEffect(() => {
    const prev = prevTabRef.current;
    if (prev && prev !== activeTabId && editorRef.current) {
      onSave(prev, editorRef.current.getHtml());
    }
    prevTabRef.current = activeTabId;
    setDocTitle(activeChapter?.title ?? "");
    setRenamingTitle(false);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // Keep docTitle in sync when chapter title changes externally
  useEffect(() => {
    if (activeChapter && !renamingTitle) {
      setDocTitle(activeChapter.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter?.title]);

  useEffect(() => {
    if (renamingTitle) setTimeout(() => titleInputRef.current?.focus(), 0);
  }, [renamingTitle]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current && prevTabRef.current) {
        onSave(prevTabRef.current, editorRef.current.getHtml());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEditorInput() {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (editorRef.current) {
        onSave(activeTabId, editorRef.current.getHtml());
        setSaved(true);
      }
    }, 1200);
  }

  function commitTitleRename() {
    const v = docTitle.trim();
    if (v && activeChapter && v !== activeChapter.title) {
      onRenameChapter(activeTabId, v);
    }
    setRenamingTitle(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-end gap-0 overflow-x-auto border-b border-gold-3/20 px-4 pt-3">
        {/* ← Outline breadcrumb */}
        <button
          onClick={onBack}
          className="mr-4 flex shrink-0 items-center gap-1.5 pb-2.5 text-xs text-ink/50 hover:text-gold-1"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          Outline
        </button>

        {/* Open chapter tabs */}
        {tabs.map((tab) => {
          const ch = chapters.find((c) => c.id === tab.chapterId);
          const isActive = tab.chapterId === activeTabId;
          return (
            <div
              key={tab.chapterId}
              className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-xs transition-colors ${
                isActive
                  ? "border-gold-3/30 bg-bg-1 text-ink"
                  : "border-transparent text-ink/50 hover:text-ink/80"
              }`}
              onClick={() => onTabChange(tab.chapterId)}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  isActive ? "bg-gold-2" : "bg-ink/30"
                }`}
              />
              <span className="max-w-[140px] truncate">{ch?.title ?? "Untitled"}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onTabClose(tab.chapterId); }}
                aria-label="Close tab"
                className="ml-1 text-ink/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor area */}
      {activeChapter ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Document title row */}
          <div className="flex items-center gap-3 border-b border-gold-3/20 px-6 py-4">
            <Pencil className="h-4 w-4 shrink-0 text-ink/40" />
            {renamingTitle ? (
              <input
                ref={titleInputRef}
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitleRename();
                  if (e.key === "Escape") {
                    setDocTitle(activeChapter.title);
                    setRenamingTitle(false);
                  }
                }}
                onBlur={commitTitleRename}
                className="flex-1 rounded border border-gold-2/50 bg-bg-0 px-3 py-1 text-sm text-ink focus:outline-none"
              />
            ) : (
              <button
                onClick={() => { setDocTitle(activeChapter.title); setRenamingTitle(true); }}
                className="flex-1 text-left text-sm font-medium text-ink/90 hover:text-gold-1"
                title="Click to rename chapter"
              >
                {activeChapter.title}
              </button>
            )}
            {saved && (
              <span className="shrink-0 text-xs text-emerald-400/70">Saved</span>
            )}
          </div>

          <DocumentEditor
            key={activeTabId}
            ref={editorRef}
            initialHtml={activeChapter.content}
            onInput={handleEditorInput}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-ink/40">
          No chapter selected.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CREATE PROJECT MODAL
   ══════════════════════════════════════════════════════════════════════════ */

function CreateProjectModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (name: string, desc: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && name.trim()) onSubmit(name.trim(), desc.trim());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [name, desc, onClose, onSubmit]);

  function handleSubmit() {
    const n = name.trim();
    if (n) onSubmit(n, desc.trim());
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-bg-0/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-gold-3/40 bg-bg-1 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-widest text-gold-1">CREATE PROJECT</h2>
            <button onClick={onClose} aria-label="Close" className="text-ink/50 hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-ink/50">
                Project Name
              </label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Story"
                className="w-full rounded-lg border border-gold-3/30 bg-bg-0 px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-gold-2/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-ink/50">
                Description <span className="normal-case text-ink/30">(optional)</span>
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Add a short description about your story..."
                rows={3}
                className="w-full resize-none rounded-lg border border-gold-3/30 bg-bg-0 px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-gold-2/50 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-full border border-gold-3/30 px-5 py-2 text-sm text-ink/70 transition-colors hover:border-gold-2/50 hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="rounded-full bg-violet-3 px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-violet-2 hover:text-bg-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */

export default function WriterPage() {
  /* ── Storage-backed state ────────────────────────────────────────────── */
  const [projects, setProjects] = useState<Project[]>(() =>
    loadJSON<Project[]>(SK.projects, []),
  );
  const [parts, setParts] = useState<Part[]>(() =>
    loadJSON<Part[]>(SK.parts, []),
  );
  const [chapters, setChapters] = useState<Chapter[]>(() =>
    loadJSON<Chapter[]>(SK.chapters, []),
  );

  /* ── Collapse state (persisted) ──────────────────────────────────────── */
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() =>
    new Set(loadJSON<string[]>(SK.expProj, [])),
  );
  const [expandedParts, setExpandedParts] = useState<Set<string>>(() =>
    new Set(loadJSON<string[]>(SK.expParts, [])),
  );

  /* ── View state ──────────────────────────────────────────────────────── */
  const [view, setView] = useState<"outline" | "editor">("outline");

  /* ── Hydration gate ───────────────────────────────────────────────────────
   * All the state above is seeded from localStorage, which is empty on the
   * server. Rendering that mismatched content during hydration triggers a React
   * hydration error, so we render nothing until mounted — then the first client
   * render matches the server (both empty) and the real content appears. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── Tab state ───────────────────────────────────────────────────────── */
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(() => {
    const saved = loadJSON<OpenTab[]>(SK.openTabs, []);
    const allChapterIds = loadJSON<Chapter[]>(SK.chapters, []).map((c) => c.id);
    // Filter out stale tabs for chapters that no longer exist
    return saved.filter((t) => allChapterIds.includes(t.chapterId));
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const saved = loadJSON<string>(SK.activeTab, "");
    const allChapterIds = loadJSON<Chapter[]>(SK.chapters, []).map((c) => c.id);
    return allChapterIds.includes(saved) ? saved : "";
  });

  /* ── Pending new node IDs for inline editing on creation ──────────────── */
  const [newPartId, setNewPartId]       = useState<string | null>(null);
  const [newChapterId, setNewChapterId] = useState<string | null>(null);

  /* ── Create project modal ────────────────────────────────────────────── */
  const [createModalOpen, setCreateModalOpen] = useState(false);

  /* ── Delete confirmation ─────────────────────────────────────────────── */
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  /* ── Persist to localStorage ─────────────────────────────────────────── */
  useEffect(() => { saveJSON(SK.projects, projects); }, [projects]);
  useEffect(() => { saveJSON(SK.parts, parts); }, [parts]);
  useEffect(() => { saveJSON(SK.chapters, chapters); }, [chapters]);

  /* ── Mirror to Supabase ──────────────────────────────────────────────────
   * Fire-and-forget so typing never blocks on the network. Debounced for
   * chapters: their content changes on every keystroke. */
  useEffect(() => { syncPushBackground("app_projects", projects); }, [projects]);
  useEffect(() => {
    const t = setTimeout(() => syncPushBackground("app_chapters", chapters), 2000);
    return () => clearTimeout(t);
  }, [chapters]);
  useEffect(() => { saveJSON(SK.expProj, [...expandedProjects]); }, [expandedProjects]);
  useEffect(() => { saveJSON(SK.expParts, [...expandedParts]); }, [expandedParts]);
  useEffect(() => { saveJSON(SK.openTabs, openTabs); }, [openTabs]);
  useEffect(() => { saveJSON(SK.activeTab, activeTabId); }, [activeTabId]);

  /* ── Switch to editor view if activeTabId is valid ───────────────────── */
  useEffect(() => {
    if (activeTabId && openTabs.some((t) => t.chapterId === activeTabId)) {
      setView("editor");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Toggle helpers ──────────────────────────────────────────────────── */
  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function togglePart(id: string) {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  /* ── Create project ──────────────────────────────────────────────────── */
  function handleCreateProject(name: string, desc: string) {
    const id = uid();
    const now = nowISO();
    const p: Project = { id, name, description: desc, createdAt: now, updatedAt: now };
    setProjects((prev) => [...prev, p]);
    setExpandedProjects((prev) => { const n = new Set(prev); n.add(id); return n; });
    // Set as the active project for Characters scoping
    try { localStorage.setItem(SK.activeProj, id); } catch { /* quota */ }
    setCreateModalOpen(false);
  }

  /* ── Add part ────────────────────────────────────────────────────────── */
  function addPart(projectId: string) {
    // Order: placed after all existing top-level nodes (parts + top-level chapters)
    const existingParts    = parts.filter((p) => p.projectId === projectId).length;
    const topLevelChapters = chapters.filter((c) => c.projectId === projectId && c.partId === null).length;
    const order = existingParts + topLevelChapters;
    const id = uid();
    const now = nowISO();
    const part: Part = { id, projectId, title: "Untitled Part", order, createdAt: now, updatedAt: now };
    setParts((prev) => [...prev, part]);
    // Expand project and the new part so inline editor is visible
    setExpandedProjects((prev) => { const n = new Set(prev); n.add(projectId); return n; });
    setExpandedParts((prev) => { const n = new Set(prev); n.add(id); return n; });
    setNewPartId(id);
  }

  /* ── Add chapter at project level (partId = null) ────────────────────── */
  function addProjectChapter(projectId: string) {
    const existingParts    = parts.filter((p) => p.projectId === projectId).length;
    const topLevelChapters = chapters.filter((c) => c.projectId === projectId && c.partId === null).length;
    const order = existingParts + topLevelChapters;
    const id = uid();
    const now = nowISO();
    const ch: Chapter = {
      id, projectId, partId: null, title: "Untitled Chapter",
      content: "", order, createdAt: now, updatedAt: now,
    };
    setChapters((prev) => [...prev, ch]);
    setExpandedProjects((prev) => { const n = new Set(prev); n.add(projectId); return n; });
    setNewChapterId(id);
  }

  /* ── Add chapter inside a part ───────────────────────────────────────── */
  function addPartChapter(projectId: string, partId: string) {
    const order = chapters.filter((c) => c.partId === partId).length;
    const id = uid();
    const now = nowISO();
    const ch: Chapter = {
      id, projectId, partId, title: "Untitled Chapter",
      content: "", order, createdAt: now, updatedAt: now,
    };
    setChapters((prev) => [...prev, ch]);
    // Ensure both project and part are expanded so the inline editor shows
    setExpandedProjects((prev) => { const n = new Set(prev); n.add(projectId); return n; });
    if (!expandedParts.has(partId)) {
      setExpandedParts((prev) => { const n = new Set(prev); n.add(partId); return n; });
    }
    setNewChapterId(id);
  }

  /* ── Rename helpers ──────────────────────────────────────────────────── */
  function renamePart(partId: string, title: string) {
    const now = nowISO();
    setParts((prev) => prev.map((p) => p.id === partId ? { ...p, title, updatedAt: now } : p));
  }
  function renameChapter(chapterId: string, title: string) {
    const now = nowISO();
    setChapters((prev) => prev.map((c) => c.id === chapterId ? { ...c, title, updatedAt: now } : c));
  }

  /**
   * Reorder a chapter by dropping it onto another.
   *
   * Works within a container AND across them: dropping a chapter onto one in a
   * different Part (or at top level) reassigns its partId and slots it in at
   * the drop position. Only cross-PROJECT moves are refused.
   *
   * `order` is rewritten densely (0..n-1) for the affected group so no gaps or
   * duplicates accumulate over repeated drags.
   */
  function reorderChapter(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;

    setChapters((prev) => {
      const dragged = prev.find((c) => c.id === draggedId);
      const target  = prev.find((c) => c.id === targetId);
      if (!dragged || !target) return prev;
      // Moving between projects is not a reorder — ignore it.
      if (dragged.projectId !== target.projectId) return prev;

      const fromPart = dragged.partId ?? null;
      const toPart   = target.partId ?? null;
      const now      = nowISO();

      const groupOf = (partId: string | null) =>
        prev
          .filter((c) => c.projectId === dragged.projectId && (c.partId ?? null) === partId)
          .sort((a, b) => a.order - b.order);

      // Same container: straight reorder.
      if (fromPart === toPart) {
        const siblings = groupOf(fromPart);
        const from = siblings.findIndex((c) => c.id === draggedId);
        const to   = siblings.findIndex((c) => c.id === targetId);
        if (from === -1 || to === -1) return prev;

        const next = [...siblings];
        next.splice(to, 0, next.splice(from, 1)[0]);

        const orderById = new Map(next.map((c, i) => [c.id, i]));
        return prev.map((c) =>
          orderById.has(c.id) ? { ...c, order: orderById.get(c.id)!, updatedAt: now } : c,
        );
      }

      // Cross-container: remove from the source group, insert into the target
      // group at the drop position, and renumber BOTH so neither is left with
      // gaps. partId is reassigned so the chapter actually lives in the new part.
      const source = groupOf(fromPart).filter((c) => c.id !== draggedId);
      const destin = groupOf(toPart);
      const to     = destin.findIndex((c) => c.id === targetId);
      if (to === -1) return prev;

      const moved = { ...dragged, partId: toPart, updatedAt: now };
      const nextDest = [...destin];
      nextDest.splice(to, 0, moved);

      const orderById = new Map<string, number>();
      source.forEach((c, i)   => orderById.set(c.id, i));
      nextDest.forEach((c, i) => orderById.set(c.id, i));

      return prev.map((c) => {
        if (c.id === draggedId) {
          return { ...moved, order: orderById.get(draggedId) ?? 0 };
        }
        return orderById.has(c.id)
          ? { ...c, order: orderById.get(c.id)!, updatedAt: now }
          : c;
      });
    });
  }

  /**
   * Move a chapter into a Part by dropping it on the part header.
   * This is the only route into an EMPTY part, which has no chapter to drop on.
   * Appended to the end of that part's list.
   */
  function moveChapterToPart(draggedId: string, partId: string) {
    setChapters((prev) => {
      const dragged = prev.find((c) => c.id === draggedId);
      if (!dragged || (dragged.partId ?? null) === partId) return prev;

      const now = nowISO();
      const destCount = prev.filter(
        (c) => c.projectId === dragged.projectId && (c.partId ?? null) === partId,
      ).length;

      // Close the gap left in the source group.
      const source = prev
        .filter((c) =>
          c.projectId === dragged.projectId &&
          (c.partId ?? null) === (dragged.partId ?? null) &&
          c.id !== draggedId)
        .sort((a, b) => a.order - b.order);
      const sourceOrder = new Map(source.map((c, i) => [c.id, i]));

      return prev.map((c) => {
        if (c.id === draggedId) {
          return { ...c, partId, order: destCount, updatedAt: now };
        }
        return sourceOrder.has(c.id)
          ? { ...c, order: sourceOrder.get(c.id)!, updatedAt: now }
          : c;
      });
    });
  }

  /* ── Clear "new" flags once the inline editor mounts ────────────────── */
  // We use a ref to track whether the flag was consumed rather than a timeout,
  // so the flag survives the state-update + render cycle.
  const newPartConsumed     = useRef(false);
  const newChapterConsumed  = useRef(false);

  useEffect(() => {
    if (newPartId) {
      if (newPartConsumed.current) {
        newPartConsumed.current = false;
        setNewPartId(null);
      } else {
        newPartConsumed.current = true;
      }
    }
  }, [newPartId, parts]);

  useEffect(() => {
    if (newChapterId) {
      if (newChapterConsumed.current) {
        newChapterConsumed.current = false;
        setNewChapterId(null);
      } else {
        newChapterConsumed.current = true;
      }
    }
  }, [newChapterId, chapters]);

  /* ── Open chapter in editor ──────────────────────────────────────────── */
  function openChapter(chapterId: string, projectId: string) {
    try { localStorage.setItem(SK.activeProj, projectId); } catch { /* quota */ }
    setOpenTabs((prev) => {
      if (prev.some((t) => t.chapterId === chapterId)) return prev;
      return [...prev, { chapterId, projectId }];
    });
    setActiveTabId(chapterId);
    setView("editor");
  }

  /* ── Tab close ───────────────────────────────────────────────────────── */
  function closeTab(chapterId: string) {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.chapterId !== chapterId);
      if (activeTabId === chapterId) {
        if (next.length > 0) {
          setActiveTabId(next[next.length - 1].chapterId);
        } else {
          setActiveTabId("");
          setView("outline");
        }
      }
      return next;
    });
  }

  /* ── Autosave chapter content ────────────────────────────────────────── */
  const saveChapterContent = useCallback((chapterId: string, content: string) => {
    const now = nowISO();
    setChapters((prev) =>
      prev.map((c) => c.id === chapterId ? { ...c, content, updatedAt: now } : c),
    );
    // Notify WorldContext and CharactersContext running in the same tab.
    // The storage event only fires in other browser tabs, so we dispatch
    // the custom event directly to keep the world graph in sync on every save.
    window.dispatchEvent(new CustomEvent("resonance:chaptersUpdated"));
  }, []);

  /* ── Delete — confirm then cascade ──────────────────────────────────── */
  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;

    if (kind === "project") {
      const affectedChapters = chapters.filter((c) => c.projectId === id).map((c) => c.id);
      setChapters((prev) => prev.filter((c) => c.projectId !== id));
      setParts((prev) => prev.filter((p) => p.projectId !== id));
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setOpenTabs((prev) => {
        const next = prev.filter((t) => !affectedChapters.includes(t.chapterId));
        if (affectedChapters.includes(activeTabId)) {
          if (next.length > 0) setActiveTabId(next[next.length - 1].chapterId);
          else { setActiveTabId(""); setView("outline"); }
        }
        return next;
      });
      // Notify consistency system
      window.dispatchEvent(new CustomEvent("resonance:projectDeleted", { detail: { projectId: id } }));
      affectedChapters.forEach((cid) =>
        window.dispatchEvent(new CustomEvent("resonance:chapterDeleted", { detail: { chapterId: cid } })),
      );
    } else if (kind === "part") {
      const affectedChapters = chapters.filter((c) => c.partId === id).map((c) => c.id);
      setChapters((prev) => prev.filter((c) => c.partId !== id));
      setParts((prev) => prev.filter((p) => p.id !== id));
      setOpenTabs((prev) => {
        const next = prev.filter((t) => !affectedChapters.includes(t.chapterId));
        if (affectedChapters.includes(activeTabId)) {
          if (next.length > 0) setActiveTabId(next[next.length - 1].chapterId);
          else { setActiveTabId(""); setView("outline"); }
        }
        return next;
      });
      // Notify consistency system
      affectedChapters.forEach((cid) =>
        window.dispatchEvent(new CustomEvent("resonance:chapterDeleted", { detail: { chapterId: cid } })),
      );
    } else {
      // chapter
      setChapters((prev) => prev.filter((c) => c.id !== id));
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.chapterId !== id);
        if (activeTabId === id) {
          if (next.length > 0) setActiveTabId(next[next.length - 1].chapterId);
          else { setActiveTabId(""); setView("outline"); }
        }
        return next;
      });
      // Notify consistency system
      window.dispatchEvent(new CustomEvent("resonance:chapterDeleted", { detail: { chapterId: id } }));
    }

    setDeleteTarget(null);
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  // Match the server's empty render until mounted (see Hydration gate above).
  if (!mounted) {
    return <div className="flex h-full min-h-screen flex-col px-6 py-8 md:px-10" />;
  }

  return (
    <div className="flex h-full min-h-screen flex-col px-6 py-8 md:px-10">

      {/* ── Modals ── */}
      {createModalOpen && (
        <CreateProjectModal
          onSubmit={handleCreateProject}
          onClose={() => setCreateModalOpen(false)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Page title ── */}
      <div className="mb-8">
        <h1 className="font-display text-4xl text-gold-1">The Writer&apos;s Space</h1>
      </div>

      {/* ── Section header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <List className="h-5 w-5 text-gold-2" />
          <span className="font-display text-sm uppercase tracking-widest text-gold-2">Outline</span>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-full border border-gold-3/50 px-4 py-2 text-sm text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1"
        >
          <Plus className="h-4 w-4" />Create Project
        </button>
      </div>

      {/* ── Main content area ── */}
      {view === "editor" && openTabs.length > 0 ? (
        /* Writing editor */
        <div className="flex-1 rounded-2xl border border-gold-3/25 bg-bg-1">
          <WritingEditorView
            tabs={openTabs}
            activeTabId={activeTabId}
            chapters={chapters}
            onTabChange={(id) => setActiveTabId(id)}
            onTabClose={closeTab}
            onBack={() => setView("outline")}
            onSave={saveChapterContent}
            onRenameChapter={renameChapter}
          />
        </div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <Feather className="h-14 w-14 text-ink/20" />
          <p className="mt-6 font-display text-2xl text-ink/50">No projects yet</p>
          <p className="mt-2 text-sm text-ink/40">
            Create a project to begin building your story.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-8 flex items-center gap-2 rounded-full bg-violet-3 px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-violet-2 hover:text-bg-0"
          >
            <Plus className="h-4 w-4" />Create Project
          </button>
        </div>
      ) : (
        /* Outline — projects stacked as sibling cards */
        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              parts={parts.filter((p) => p.projectId === project.id).sort((a, b) => a.order - b.order)}
              chapters={chapters.filter((c) => c.projectId === project.id)}
              expanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
              expandedParts={expandedParts}
              onTogglePart={togglePart}
              onAddPart={() => addPart(project.id)}
              onAddProjectChapter={() => addProjectChapter(project.id)}
              onAddPartChapter={(partId) => addPartChapter(project.id, partId)}
              onDelete={() => {
                const proj = projects.find((p) => p.id === project.id);
                if (proj) setDeleteTarget({ kind: "project", id: proj.id, name: proj.name });
              }}
              onChapterOpen={(chapterId) => openChapter(chapterId, project.id)}
              onPartDelete={(partId) => {
                const part = parts.find((p) => p.id === partId);
                if (part) setDeleteTarget({ kind: "part", id: part.id, title: part.title });
              }}
              onPartRename={renamePart}
              onChapterDelete={(chapterId) => {
                const ch = chapters.find((c) => c.id === chapterId);
                if (ch) setDeleteTarget({ kind: "chapter", id: ch.id, title: ch.title });
              }}
              onChapterRename={renameChapter}
              onChapterReorder={reorderChapter}
              onChapterMoveToPart={moveChapterToPart}
              newPartId={newPartId}
              newChapterId={newChapterId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
