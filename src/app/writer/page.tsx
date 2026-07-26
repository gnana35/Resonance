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
  FileDown,
  FileText,
  GripVertical,
  History,
  Layers,
  List,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { DocumentEditor, type DocumentEditorHandle } from "@/components/DocumentEditor";
import { OUTLINE, type Chapter, type OutlineItem, type Scene } from "@/data/outline";

/* ─── Types ───────────────────────────────────────────────────────────── */

type Issue = {
  id: string;
  type: "Plot Hole" | "Arc Break";
  tag: string;
  description: string;
};

type DocTarget =
  | { kind: "prologue"; itemId: string }
  | { kind: "chapter"; partId: string; chapterId: string }
  | { kind: "scene";   partId: string; chapterId: string; sceneId: string }
  | null;

type SceneNavSource = "outline" | "chapter";

type View = "outline" | "document" | "version-history";

type VersionEntry = {
  id:        string;
  timestamp: Date;
  label:     string;
  html:      string;
};

/* ─── Cross-part drag state (module-level ref, shared across PartRows) ── */
const crossPartDrag = {
  srcPartId:    null as string | null,
  srcChapterIdx: null as number | null,
};

/* ─── Constants ───────────────────────────────────────────────────────── */

const ISSUES: Issue[] = [
  { id: "1", type: "Plot Hole", tag: "Chapter 2",
    description: "Lira's wound disappears between chapters. Consider showing recovery or consequences." },
  { id: "2", type: "Plot Hole", tag: "Chapter 3",
    description: "The guard at the east gate doesn't recognize Lira, though they met in Chapter 1." },
  { id: "3", type: "Arc Break", tag: "Kael",
    description: "Kael's motivation shifts suddenly. Consider adding internal conflict or a reason for the change." },
];

const SEED_DOCUMENT_HTML = `
  <p>The wind carried whispers tonight.</p>
  <p>Lira stood at the edge of the cliff, her cloak dancing in the clouds below. The city of Veyndor glimmered in the distance—beautiful, uncaring.</p>
  <p>"You shouldn't be here," a voice said.</p>
  <p>She didn't turn.</p>
  <p>"I'm always here," she replied.</p>
`;

const EXPORT_FORMATS = [
  { label: "PDF",         icon: FileDown, ext: "pdf"  },
  { label: "Word (DOCX)", icon: FileText, ext: "docx" },
  { label: "Plain Text",  icon: FileText, ext: "txt"  },
  { label: "Markdown",    icon: FileText, ext: "md"   },
] as const;

/* ─── Pure helpers ────────────────────────────────────────────────────── */

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

function makeChapterId() { return `ch-${Date.now()}`; }
function makeSceneId()   { return `scene-${Date.now()}`; }
function makePartId()    { return `part-${Date.now()}`; }
function makeVerId()     { return `v-${Date.now()}`; }

function simulateAiScenes(chapterId: string): Promise<Scene[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve([
      { id: `${chapterId}-scene-1`, title: "Scene 1", aiGenerated: true },
      { id: `${chapterId}-scene-2`, title: "Scene 2", aiGenerated: true },
    ]), 1200),
  );
}

function htmlToText(html: string) {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText ?? div.textContent ?? "";
}

function htmlToMarkdown(html: string) {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** "Scene N" or "Scene N: user name" */
function sceneDisplayLabel(scene: { name?: string }, idx: number): string {
  const base = `Scene ${idx + 1}`;
  return scene.name ? `${base}: ${scene.name}` : base;
}

function fmtTime(d: Date) {
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Main component ──────────────────────────────────────────────────── */

export default function WriterHome() {
  /* ── core view state ─────────────────────────────────────────────── */
  const [view, setView]           = useState<View>("outline");
  const [docTarget, setDocTarget] = useState<DocTarget>(null);
  const [sceneNavSource, setSceneNavSource] = useState<SceneNavSource>("outline");
  const [expanded, setExpanded]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef    = useRef<HTMLDivElement>(null);
  const editorRef  = useRef<DocumentEditorHandle>(null);

  /* ── doc-level flags ─────────────────────────────────────────────── */
  // keyed by docTarget serialised key
  const [lockedDocs, setLockedDocs]   = useState<Set<string>>(new Set());
  const [versionMap, setVersionMap]   = useState<Record<string, VersionEntry[]>>({});

  /* ── export modal ────────────────────────────────────────────────── */
  const [exportModalOpen, setExportModalOpen] = useState(false);

  /* ── rename-in-editor ────────────────────────────────────────────── */
  const [renamingDoc, setRenamingDoc] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  /* ── delete confirmation modal ───────────────────────────────────── */
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  /* ── outline state ───────────────────────────────────────────────── */
  const [outline, setOutline] = useState<OutlineItem[]>(OUTLINE);
  const [expandedParts, toggleParts] = useToggleSet(
    OUTLINE.filter((i) => i.kind === "part").map((i) => i.id),
  );
  const [expandedChapters, toggleChapters] = useToggleSet();
  const [generatingScenes, setGeneratingScenes] = useState<Set<string>>(new Set());

  /* ── "New Document" modal ────────────────────────────────────────── */
  const [newDocModal, setNewDocModal]               = useState(false);
  const [newDocSelectedPart, setNewDocSelectedPart] = useState<string | "new" | null>(null);
  const [newPartName, setNewPartName]               = useState("");

  /* ── continuity sidebar ──────────────────────────────────────────── */
  const [issueFilter, setIssueFilter] = useState<"All" | "Plot Hole" | "Arc Break">("All");

  const plotHoleCount  = ISSUES.filter((i) => i.type === "Plot Hole").length;
  const arcBreakCount  = ISSUES.filter((i) => i.type === "Arc Break").length;
  const filteredIssues = issueFilter === "All" ? ISSUES : ISSUES.filter((i) => i.type === issueFilter);

  /* ── derived: outline stats ──────────────────────────────────────── */
  const outlineStats = useMemo(() => {
    const parts    = outline.filter((i) => i.kind === "part");
    const chapters = parts.flatMap((p) => p.chapters ?? []);
    const scenesInChapters = chapters.reduce((sum, c) => sum + c.scenes.length, 0);
    const prologue         = outline.find((i) => i.kind === "prologue");
    const totalScenes      = scenesInChapters + (prologue?.scenes?.length ?? 0);
    return { parts: parts.length, chapters: chapters.length, scenes: totalScenes,
             totalItems: outline.length + chapters.length + totalScenes };
  }, [outline]);

  /* ── derived: doc key (for lock/versions maps) ───────────────────── */
  function docKey(t: DocTarget): string {
    if (!t) return "";
    if (t.kind === "prologue") return `prologue:${t.itemId}`;
    if (t.kind === "chapter")  return `chapter:${t.partId}:${t.chapterId}`;
    return `scene:${t.partId}:${t.chapterId}:${t.sceneId}`;
  }
  const currentKey = docKey(docTarget);
  const isLocked   = lockedDocs.has(currentKey);

  /* ── derived: doc title / context label ─────────────────────────── */
  const currentDocMeta = useMemo(() => {
    if (!docTarget) return null;
    if (docTarget.kind === "prologue") {
      const item = outline.find((i) => i.id === docTarget.itemId);
      return item ? { title: item.title, contextLabel: "" } : null;
    }
    const part    = outline.find((i) => i.id === docTarget.partId);
    const chapter = part?.chapters?.find((c) => c.id === docTarget.chapterId);
    if (!chapter) return null;
    if (docTarget.kind === "chapter") {
      return { title: chapter.title, contextLabel: `Editing in ${part!.title}` };
    }
    const sceneIdx = chapter.scenes.findIndex((s) => s.id === docTarget.sceneId);
    const scene    = sceneIdx >= 0 ? chapter.scenes[sceneIdx] : undefined;
    return scene
      ? { title: sceneDisplayLabel(scene, sceneIdx), contextLabel: `Editing in ${chapter.title}` }
      : null;
  }, [outline, docTarget]);

  /* ── close ··· menu on outside click ────────────────────────────── */
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  useEffect(() => {
    if (renamingDoc) setTimeout(() => renameInputRef.current?.focus(), 0);
  }, [renamingDoc]);

  /* ── actions: navigation ─────────────────────────────────────────── */

  function openDocument(target: DocTarget, navSource?: SceneNavSource) {
    setDocTarget(target);
    if (target?.kind === "scene") setSceneNavSource(navSource ?? "outline");
    setView("document");
    setRenamingDoc(false);
  }

  function navigateBack() {
    if (!docTarget) { setView("outline"); return; }
    if (docTarget.kind === "scene" && sceneNavSource === "chapter") {
      openDocument({ kind: "chapter", partId: docTarget.partId, chapterId: docTarget.chapterId });
    } else {
      setView("outline"); setDocTarget(null);
    }
  }

  function backLabel(): string {
    if (!docTarget) return "Outline";
    if (docTarget.kind === "scene" && sceneNavSource === "chapter") {
      const part    = outline.find((i) => i.id === docTarget.partId);
      const chapter = part?.chapters?.find((c) => c.id === docTarget.chapterId);
      return chapter?.title ?? "Chapter";
    }
    return "Outline";
  }

  /* ── actions: outline mutations ──────────────────────────────────── */

  function renameChapter(partId: string, chapterId: string, title: string) {
    if (!title.trim()) return;
    setOutline((prev) => prev.map((item) =>
      item.id === partId
        ? { ...item, chapters: (item.chapters ?? []).map((ch) =>
              ch.id === chapterId ? { ...ch, title: title.trim() } : ch) }
        : item,
    ));
  }

  function renameScene(partId: string, chapterId: string, sceneId: string, name: string) {
    setOutline((prev) => prev.map((item) =>
      item.id === partId
        ? { ...item, chapters: (item.chapters ?? []).map((ch) =>
              ch.id === chapterId
                ? { ...ch, scenes: ch.scenes.map((s) =>
                      s.id === sceneId ? { ...s, name: name.trim() || undefined } : s) }
                : ch) }
        : item,
    ));
  }

  function renamePrologueScene(itemId: string, sceneId: string, name: string) {
    setOutline((prev) => prev.map((item) =>
      item.id === itemId
        ? { ...item, scenes: (item.scenes ?? []).map((s) =>
              s.id === sceneId ? { ...s, name: name.trim() || undefined } : s) }
        : item,
    ));
  }

  function renameSceneName(name: string) {
    if (!docTarget || docTarget.kind !== "scene") return;
    renameScene(docTarget.partId, docTarget.chapterId, docTarget.sceneId, name);
  }

  function addPart() {
    const n = outline.filter((i) => i.kind === "part").length + 1;
    setOutline((prev) => [
      ...prev,
      { id: makePartId(), kind: "part", title: `Part ${n} – Untitled`, chapters: [] },
    ]);
  }

  function addChapterToPart(partId: string) {
    const part = outline.find((i) => i.id === partId);
    const num  = (part?.chapters?.length ?? 0) + 1;
    const newId = makeChapterId();
    const newCh: Chapter = { id: newId, title: `Chapter ${num} – Untitled`, summary: "", scenes: [] };
    setOutline((prev) => prev.map((item) =>
      item.id === partId
        ? { ...item, chapters: [...(item.chapters ?? []), newCh] }
        : item,
    ));
    if (!expandedParts.has(partId)) toggleParts(partId);
    setGeneratingScenes((prev) => new Set(prev).add(newId));
    simulateAiScenes(newId).then((aiScenes) => {
      setOutline((prev) => prev.map((item) =>
        item.id === partId
          ? { ...item, chapters: (item.chapters ?? []).map((ch) =>
                ch.id === newId ? { ...ch, scenes: aiScenes } : ch) }
          : item,
      ));
      setGeneratingScenes((prev) => { const n = new Set(prev); n.delete(newId); return n; });
    });
  }

  function addSceneToChapter(partId: string, chapterId: string) {
    const count = outline.find((i) => i.id === partId)?.chapters?.find((c) => c.id === chapterId)?.scenes.length ?? 0;
    const s: Scene = { id: makeSceneId(), title: `Scene ${count + 1}`, aiGenerated: false };
    setOutline((prev) => prev.map((item) =>
      item.id === partId
        ? { ...item, chapters: (item.chapters ?? []).map((ch) =>
              ch.id === chapterId ? { ...ch, scenes: [...ch.scenes, s] } : ch) }
        : item,
    ));
    if (!expandedChapters.has(chapterId)) toggleChapters(chapterId);
  }

  function reorderScenes(partId: string, chapterId: string, from: number, to: number) {
    if (from === to) return;
    setOutline((prev) => prev.map((item) =>
      item.id === partId
        ? { ...item, chapters: (item.chapters ?? []).map((ch) => {
              if (ch.id !== chapterId) return ch;
              const s = [...ch.scenes];
              const [m] = s.splice(from, 1); s.splice(to, 0, m);
              return { ...ch, scenes: s };
            }) }
        : item,
    ));
  }

  /** Reorder within a part OR move to a different part */
  function moveChapter(srcPartId: string, srcIdx: number, dstPartId: string, dstIdx: number) {
    setOutline((prev) => {
      const next = prev.map((item) => ({ ...item, chapters: [...(item.chapters ?? [])] }));
      const src  = next.find((i) => i.id === srcPartId);
      const dst  = next.find((i) => i.id === dstPartId);
      if (!src || !dst) return prev;
      const [moved] = src.chapters!.splice(srcIdx, 1);
      dst.chapters!.splice(dstIdx, 0, moved);
      return next;
    });
  }

  function handleNewDocModalSubmit() {
    if (!newDocSelectedPart) return;
    let partId = newDocSelectedPart;
    if (newDocSelectedPart === "new") {
      if (!newPartName.trim()) return;
      partId = makePartId();
      setOutline((prev) => [...prev, { id: partId, kind: "part", title: newPartName.trim(), chapters: [] }]);
    }
    setNewDocModal(false); setNewDocSelectedPart(null); setNewPartName("");
    addChapterToPart(partId);
  }

  function closeNewDocModal() { setNewDocModal(false); setNewDocSelectedPart(null); setNewPartName(""); }

  /* ── actions: delete ─────────────────────────────────────────────── */

  function confirmDelete() {
    if (!docTarget) return;
    if (docTarget.kind === "chapter") {
      setOutline((prev) => prev.map((item) =>
        item.id === docTarget.partId
          ? { ...item, chapters: (item.chapters ?? []).filter((ch) => ch.id !== docTarget.chapterId) }
          : item,
      ));
    } else if (docTarget.kind === "scene") {
      setOutline((prev) => prev.map((item) =>
        item.id === docTarget.partId
          ? { ...item, chapters: (item.chapters ?? []).map((ch) =>
                ch.id === docTarget.chapterId
                  ? { ...ch, scenes: ch.scenes.filter((s) => s.id !== docTarget.sceneId) }
                  : ch) }
          : item,
      ));
    }
    setDeleteConfirm(false);
    setView("outline"); setDocTarget(null);
  }

  /* ── actions: lock ───────────────────────────────────────────────── */

  function toggleLock() {
    setMenuOpen(false);
    setLockedDocs((prev) => {
      const n = new Set(prev);
      if (n.has(currentKey)) n.delete(currentKey); else n.add(currentKey);
      return n;
    });
  }

  /* ── actions: rename from editor ─────────────────────────────────── */

  function startRenameDoc() {
    if (isLocked) return;
    setMenuOpen(false);
    setRenameDraft(currentDocMeta?.title ?? "");
    setRenamingDoc(true);
  }

  function commitRenameDoc() {
    if (!docTarget || !renameDraft.trim()) { setRenamingDoc(false); return; }
    if (docTarget.kind === "chapter") renameChapter(docTarget.partId, docTarget.chapterId, renameDraft);
    else if (docTarget.kind === "scene") renameSceneName(renameDraft);
    setRenamingDoc(false);
  }

  /* ── actions: version history ────────────────────────────────────── */

  function saveVersion() {
    if (!docTarget) return;
    const html  = editorRef.current?.getHtml() ?? SEED_DOCUMENT_HTML;
    const entry: VersionEntry = {
      id:        makeVerId(),
      timestamp: new Date(),
      label:     currentDocMeta?.title ?? "Untitled",
      html,
    };
    setVersionMap((prev) => ({
      ...prev,
      [currentKey]: [entry, ...(prev[currentKey] ?? [])],
    }));
  }

  function restoreVersion(entry: VersionEntry) {
    // In a real app we'd update the stored HTML per doc; here we just close the view
    console.log("restore", entry.id);
    setView("document");
  }

  /* ── actions: export ─────────────────────────────────────────────── */

  async function handleExport(ext: string) {
    setExportModalOpen(false);
    const title    = currentDocMeta?.title ?? "document";
    const bodyHtml = editorRef.current?.getHtml() ?? SEED_DOCUMENT_HTML;
    const slug     = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    if (ext === "txt") {
      downloadBlob(new Blob([htmlToText(bodyHtml)], { type: "text/plain" }), `${slug}.txt`);
    } else if (ext === "md") {
      downloadBlob(new Blob([htmlToMarkdown(bodyHtml)], { type: "text/markdown" }), `${slug}.md`);
    } else if (ext === "docx") {
      const lines = htmlToText(bodyHtml).split(/\n+/).filter(Boolean);
      const doc   = new Document({
        sections: [{
          children: lines.map((l) => new Paragraph({ children: [new TextRun(l)] })),
        }],
      });
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `${slug}.docx`);
    } else if (ext === "pdf") {
      const pdf  = new jsPDF();
      const text = htmlToText(bodyHtml);
      const lines = pdf.splitTextToSize(text, 170) as string[];
      pdf.setFont("helvetica");
      pdf.setFontSize(12);
      pdf.text(lines, 20, 20);
      pdf.save(`${slug}.pdf`);
    }
  }

  /* ── panels ──────────────────────────────────────────────────────── */

  const chapterScenesPanel = useMemo(() => {
    if (!docTarget || docTarget.kind !== "chapter") return null;
    const part    = outline.find((i) => i.id === docTarget.partId);
    const chapter = part?.chapters?.find((c) => c.id === docTarget.chapterId);
    if (!chapter) return null;
    const isGenerating = generatingScenes.has(chapter.id);
    return (
      <div className="border-t border-gold-3/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink/70">Scenes in this Chapter</p>
          {!isLocked && (
            <button
              onClick={() => addSceneToChapter(docTarget.partId, docTarget.chapterId)}
              className="flex items-center gap-1.5 rounded-md border border-gold-3/30 px-3 py-1 text-xs text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1"
            >
              <Plus className="h-3 w-3" />New Scene
            </button>
          )}
        </div>
        {isGenerating ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-gold-3/20 bg-bg-0/60 px-4 py-3 text-sm text-ink/50">
            <Sparkles className="h-4 w-4 animate-pulse text-gold-2" />
            Analyzing story and generating scenes…
          </div>
        ) : chapter.scenes.length === 0 ? (
          <p className="mt-3 text-sm text-ink/40">No scenes yet. Add one or let AI generate them.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {chapter.scenes.map((scene, idx) => (
              <div key={scene.id} className="group flex cursor-pointer items-center gap-2 rounded-lg border border-gold-3/15 bg-bg-0/40 px-3 py-2.5 transition-colors hover:border-gold-2/40 hover:bg-bg-1">
                <button
                  onClick={() => openDocument({ kind: "scene", partId: docTarget.partId, chapterId: docTarget.chapterId, sceneId: scene.id }, "chapter")}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-2/60" />
                  <span className="flex-1 text-sm text-ink/80">{sceneDisplayLabel(scene, idx)}</span>
                </button>
                {!isLocked && (
                  <SceneNameEditor
                    scene={scene}
                    index={idx}
                    onSave={(name) => renameScene(docTarget.partId, docTarget.chapterId, scene.id, name)}
                  />
                )}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink/30" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docTarget, outline, generatingScenes, isLocked]);

  /* ── document panel ──────────────────────────────────────────────── */

  const documentPanel = (
    <div className={`rounded-2xl border border-gold-3/25 bg-bg-1 ${expanded ? "fixed inset-4 z-50 flex flex-col overflow-auto" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gold-3/20 px-6 py-4">
        <button
          onClick={navigateBack}
          className="flex items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-gold-1"
          aria-label="Back"
        >
          <ChevronLeft className="h-4 w-4" /><span>{backLabel()}</span>
        </button>

        {/* Title / inline rename */}
        <div className="mx-4 min-w-0 flex-1 text-center">
          {renamingDoc ? (
            <input
              ref={renameInputRef}
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitRenameDoc(); if (e.key === "Escape") setRenamingDoc(false); }}
              onBlur={commitRenameDoc}
              className="w-full rounded border border-gold-2/50 bg-bg-0 px-3 py-1 text-center text-sm text-ink focus:outline-none"
            />
          ) : (
            <span className="flex items-center justify-center gap-2 truncate text-sm font-medium text-ink/80">
              {isLocked && <Lock className="h-3.5 w-3.5 text-gold-2" />}
              {currentDocMeta?.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-ink/60">
          <span className="flex items-center gap-1.5 text-emerald-400/80">
            <Check className="h-3.5 w-3.5" />Auto-save on
          </span>

          <button aria-label={expanded ? "Collapse" : "Expand"} onClick={() => setExpanded((v) => !v)} className="hover:text-ink">
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* ··· menu */}
          <div className="relative" ref={menuRef}>
            <button aria-label="Document options" onClick={() => setMenuOpen((v) => !v)} className="hover:text-ink">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gold-3/40 bg-bg-1 py-1.5 shadow-xl">
                <DocMenuItem icon={Pencil}  label="Rename document"
                  onClick={startRenameDoc}
                  disabled={isLocked} />
                <DocMenuItem icon={Upload}  label="Export"
                  onClick={() => { setMenuOpen(false); setExportModalOpen(true); }} />
                <DocMenuItem icon={History} label="Version history"
                  onClick={() => { setMenuOpen(false); saveVersion(); setView("version-history"); }} />
                <DocMenuItem icon={Trash2}  label="Delete document"
                  onClick={() => { setMenuOpen(false); setDeleteConfirm(true); }}
                  disabled={isLocked}
                  danger />
                <div className="my-1 border-t border-gold-3/15" />
                <DocMenuItem
                  icon={isLocked ? LockOpen : Lock}
                  label={isLocked ? "Unlock document" : "Lock document"}
                  onClick={toggleLock} />
              </div>
            )}
          </div>
        </div>
      </div>

      <DocumentEditor
        ref={editorRef}
        initialHtml={SEED_DOCUMENT_HTML}
        contextLabel={currentDocMeta?.contextLabel}
        readOnly={isLocked}
      />
      {chapterScenesPanel}
    </div>
  );

  /* ── version history panel ───────────────────────────────────────── */

  const versions = versionMap[currentKey] ?? [];
  const versionHistoryPanel = (
    <div className="rounded-2xl border border-gold-3/25 bg-bg-1">
      <div className="flex items-center gap-3 border-b border-gold-3/20 px-6 py-4">
        <button
          onClick={() => setView("document")}
          className="flex items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-gold-1"
        >
          <ChevronLeft className="h-4 w-4" />{currentDocMeta?.title ?? "Document"}
        </button>
        <span className="mx-2 text-ink/30">|</span>
        <History className="h-4 w-4 text-gold-2" />
        <h2 className="font-display text-lg text-gold-1">Version History</h2>
      </div>

      {versions.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <History className="h-10 w-10 text-ink/20" />
          <p className="mt-4 text-ink/60">No saved versions yet.</p>
          <p className="mt-1 text-sm text-ink/40">
            Versions are saved each time you open Version History. Close and reopen to snapshot the current state.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-gold-3/10">
          {versions.map((v, idx) => (
            <div key={v.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-ink">
                  {idx === 0 ? "Current (auto-saved)" : `Version ${versions.length - idx}`}
                </p>
                <p className="mt-0.5 text-xs text-ink/50">{fmtTime(v.timestamp)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setView("document"); }}
                  className="rounded-md border border-gold-3/30 px-3 py-1.5 text-xs text-ink/70 transition-colors hover:border-gold-2/50 hover:text-ink"
                >
                  View
                </button>
                {idx > 0 && (
                  <button
                    onClick={() => restoreVersion(v)}
                    className="flex items-center gap-1 rounded-md bg-gold-2/10 px-3 py-1.5 text-xs text-gold-2 transition-colors hover:bg-gold-2/20 hover:text-gold-1"
                  >
                    <RotateCcw className="h-3 w-3" />Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── outline panel ───────────────────────────────────────────────── */

  const outlinePanel = (
    <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <List className="h-5 w-5 text-ink/70" />
            <h1 className="font-display text-2xl text-gold-1">Outline</h1>
          </div>
          <button onClick={() => setNewDocModal(true)} className="flex items-center gap-2 rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1">
            <Plus className="h-4 w-4" />New Document
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {outline.map((item) =>
            item.kind === "prologue" ? (
              <PrologueRow
                key={item.id}
                item={item}
                expanded={expandedParts.has(item.id)}
                onToggle={() => toggleParts(item.id)}
                onOpenDocument={() => openDocument({ kind: "prologue", itemId: item.id })}
                onOpenScene={(sceneId) =>
                  openDocument({ kind: "scene", partId: item.id, chapterId: item.id, sceneId }, "outline")
                }
                onRenameScene={(sceneId, name) => renamePrologueScene(item.id, sceneId, name)}
              />
            ) : (
              <PartRow
                key={item.id}
                item={item}
                expanded={expandedParts.has(item.id)}
                onToggle={() => toggleParts(item.id)}
                expandedChapters={expandedChapters}
                onToggleChapter={toggleChapters}
                onOpenChapter={(chapterId) => openDocument({ kind: "chapter", partId: item.id, chapterId })}
                onOpenScene={(chapterId, sceneId) =>
                  openDocument({ kind: "scene", partId: item.id, chapterId, sceneId }, "outline")
                }
                onAddChapter={() => addChapterToPart(item.id)}
                onAddScene={(chapterId) => addSceneToChapter(item.id, chapterId)}
                onRenameChapter={(chapterId, title) => renameChapter(item.id, chapterId, title)}
                onRenameScene={(chapterId, sceneId, name) => renameScene(item.id, chapterId, sceneId, name)}
                onReorderScenes={(chapterId, from, to) => reorderScenes(item.id, chapterId, from, to)}
                onMoveChapter={(srcPartId, srcIdx, dstIdx) => moveChapter(srcPartId, srcIdx, item.id, dstIdx)}
                generatingScenes={generatingScenes}
              />
            ),
          )}
          <button
            onClick={addPart}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gold-3/40 py-3 text-sm text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1"
          >
            <Plus className="h-4 w-4" />Add Part
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gold-3/25 bg-bg-1 p-5 xl:mt-0">
        <div className="flex items-center gap-2 text-ink"><Layers className="h-4 w-4 text-gold-2" />Outline Overview</div>
        <p className="mt-5 text-sm text-ink/60">Total Items</p>
        <p className="mt-1 font-display text-3xl text-gold-1">{outlineStats.totalItems}</p>
        <p className="mt-1 text-sm text-ink/50">{outlineStats.parts} Parts · {outlineStats.chapters} Chapters · {outlineStats.scenes} Scenes</p>
        <p className="mt-6 text-sm text-ink/60">Story Progress</p>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-ink/40">—</span><span className="text-ink">0%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-0"><div className="h-full w-0 rounded-full bg-gold-2" /></div>
        <p className="mt-2 text-sm text-ink/50">No scenes drafted yet.</p>
        <div className="mt-6 flex items-center gap-2 text-sm text-ink/50"><Clock className="h-3.5 w-3.5" />Last Updated</div>
        <p className="mt-1 text-ink/80">Just now</p>
      </div>
    </div>
  );

  /* ── modals ──────────────────────────────────────────────────────── */

  const parts = outline.filter((i) => i.kind === "part");

  const newDocModalEl = newDocModal && (
    <>
      <div className="fixed inset-0 z-40 bg-bg-0/70 backdrop-blur-sm" onClick={closeNewDocModal} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-gold-3/40 bg-bg-1 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-gold-1">New Chapter Document</h2>
            <button onClick={closeNewDocModal} aria-label="Close" className="text-ink/50 hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-sm text-ink/60">Choose the Part this Chapter belongs to.</p>
          <div className="mt-5 flex flex-col gap-2">
            {parts.map((p) => (
              <button key={p.id} onClick={() => setNewDocSelectedPart(p.id)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${newDocSelectedPart === p.id ? "border-gold-2 bg-gold-2/10 text-gold-1" : "border-gold-3/30 text-ink hover:border-gold-2/50"}`}>
                <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                <span className="text-sm">{p.title}</span>
              </button>
            ))}
            <button onClick={() => setNewDocSelectedPart("new")}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${newDocSelectedPart === "new" ? "border-gold-2 bg-gold-2/10 text-gold-1" : "border-dashed border-gold-3/40 text-gold-2 hover:border-gold-2"}`}>
              <Plus className="h-4 w-4 shrink-0" /><span className="text-sm">Create new Part…</span>
            </button>
            {newDocSelectedPart === "new" && (
              <input autoFocus value={newPartName} onChange={(e) => setNewPartName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleNewDocModalSubmit(); }}
                placeholder="Part title (e.g. Part IV – New Horizons)"
                className="mt-1 w-full rounded-lg border border-gold-3/30 bg-bg-0 px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-gold-2/50 focus:outline-none" />
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={closeNewDocModal} className="rounded-full border border-gold-3/30 px-5 py-2 text-sm text-ink/70 transition-colors hover:border-gold-2/50 hover:text-ink">Cancel</button>
            <button onClick={handleNewDocModalSubmit}
              disabled={!newDocSelectedPart || (newDocSelectedPart === "new" && !newPartName.trim())}
              className="rounded-full bg-gold-2 px-5 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1 disabled:cursor-not-allowed disabled:opacity-40">
              Create Chapter
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const exportModalEl = exportModalOpen && (
    <>
      <div className="fixed inset-0 z-40 bg-bg-0/70 backdrop-blur-sm" onClick={() => setExportModalOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-gold-3/40 bg-bg-1 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-gold-1">Export Document</h2>
            <button onClick={() => setExportModalOpen(false)} aria-label="Close" className="text-ink/50 hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-sm text-ink/60">Choose an export format.</p>
          <div className="mt-5 flex flex-col gap-2">
            {EXPORT_FORMATS.map(({ label, icon: Icon, ext }) => (
              <button key={ext} onClick={() => handleExport(ext)}
                className="flex items-center gap-3 rounded-lg border border-gold-3/30 px-4 py-3 text-left text-sm text-ink transition-colors hover:border-gold-2/50 hover:bg-gold-2/10 hover:text-gold-1">
                <Icon className="h-4 w-4 shrink-0 text-gold-2" />{label}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={() => setExportModalOpen(false)} className="rounded-full border border-gold-3/30 px-5 py-2 text-sm text-ink/70 transition-colors hover:border-gold-2/50 hover:text-ink">Cancel</button>
          </div>
        </div>
      </div>
    </>
  );

  const deleteConfirmEl = deleteConfirm && (
    <>
      <div className="fixed inset-0 z-40 bg-bg-0/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-gold-3/40 bg-bg-1 p-6 shadow-2xl">
          <h2 className="font-display text-xl text-gold-1">Delete Document</h2>
          <p className="mt-2 text-sm text-ink/70">
            Are you sure you want to delete <span className="text-ink font-medium">{currentDocMeta?.title}</span>?
            {" "}This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(false)} className="rounded-full border border-gold-3/30 px-5 py-2 text-sm text-ink/70 transition-colors hover:border-gold-2/50 hover:text-ink">Cancel</button>
            <button onClick={confirmDelete} className="rounded-full bg-red-500/80 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500">Delete</button>
          </div>
        </div>
      </div>
    </>
  );

  /* ── render ──────────────────────────────────────────────────────── */

  return (
    <div className="px-6 py-8 md:px-10">
      {expanded && <div className="fixed inset-0 z-40 bg-bg-0/70 backdrop-blur-sm" onClick={() => setExpanded(false)} />}
      {newDocModalEl}
      {exportModalEl}
      {deleteConfirmEl}

      <div className="mb-8">
        <h1 className="font-display text-4xl text-gold-1">The Writer&apos;s Space</h1>
      </div>

      {view === "outline" ? (
        outlinePanel
      ) : view === "version-history" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          {versionHistoryPanel}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          {documentPanel}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <div className="flex items-center gap-2 text-ink"><Activity className="h-4 w-4 text-gold-2" />Continuity Editor</div>
              <>
                <button onClick={() => console.log("review")} className="mt-4 flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left">
                  <span className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      <span className="block text-sm font-medium text-amber-300">{ISSUES.length} Issues Found</span>
                      <span className="block text-xs text-ink/60">Review to strengthen your story</span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/50" />
                </button>
                <div className="mt-4 flex gap-4 border-b border-gold-3/20 text-sm">
                  {([ { key: "All", label: `All (${ISSUES.length})` }, { key: "Plot Hole", label: `Plot Holes (${plotHoleCount})` }, { key: "Arc Break", label: `Arc Breaks (${arcBreakCount})` } ] as const).map((tab) => (
                    <button key={tab.key} onClick={() => setIssueFilter(tab.key)}
                      className={`-mb-px border-b-2 pb-2 transition-colors ${issueFilter === tab.key ? "border-gold-2 text-gold-1" : "border-transparent text-ink/50 hover:text-ink"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  {filteredIssues.map((issue) => (
                    <div key={issue.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-ink">
                          <span className={`h-1.5 w-1.5 rounded-full ${issue.type === "Plot Hole" ? "bg-red-400" : "bg-amber-400"}`} />
                          {issue.type}
                        </span>
                        <span className="text-xs text-ink/50">{issue.tag}</span>
                      </div>
                      <p className="mt-1 text-ink/60">{issue.description}{" "}<button onClick={() => console.log("view", issue.id)} className="text-gold-2 hover:text-gold-1">View</button></p>
                    </div>
                  ))}
                </div>
              </>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared helpers ──────────────────────────────────────────────────── */

function DocMenuItem({
  icon: Icon, label, onClick, disabled = false, danger = false,
}: {
  icon: React.ElementType; label: string; onClick: () => void;
  disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
        ${disabled ? "cursor-not-allowed opacity-40" : danger ? "text-red-400 hover:bg-red-500/10 hover:text-red-300" : "text-ink/80 hover:bg-gold-2/10 hover:text-gold-1"}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-ink/50" />{label}
    </button>
  );
}

function SceneNameEditor({ scene, index, onSave }: { scene: { id: string; name?: string }; index: number; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(scene.name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) { e.stopPropagation(); setDraft(scene.name ?? ""); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }
  function commit(e?: React.MouseEvent) { e?.stopPropagation(); onSave(draft); setEditing(false); }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }

  if (editing) return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} onBlur={() => commit()}
        placeholder={`Name scene ${index + 1}…`}
        className="w-36 rounded border border-gold-2/50 bg-bg-0 px-2 py-0.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none" />
      <button onClick={commit} aria-label="Save" className="text-gold-2 hover:text-gold-1"><Check className="h-3.5 w-3.5" /></button>
    </div>
  );

  return (
    <button onClick={startEdit} aria-label={scene.name ? "Edit scene name" : "Add scene name"}
      title={scene.name ? `Edit: ${scene.name}` : "Add a name"}
      className="shrink-0 text-ink/30 transition-colors hover:text-gold-2">
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

function ChapterTitleEditor({ chapter, onSave }: { chapter: { id: string; title: string }; onSave: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(chapter.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) { e.stopPropagation(); setDraft(chapter.title); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }
  function commit() { if (draft.trim()) onSave(draft.trim()); setEditing(false); }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }

  if (editing) return (
    <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} onBlur={commit}
        className="min-w-0 flex-1 rounded border border-gold-2/50 bg-bg-0 px-2 py-0.5 text-sm text-ink focus:outline-none" />
      <button onClick={(e) => { e.stopPropagation(); commit(); }} aria-label="Save" className="text-gold-2 hover:text-gold-1"><Check className="h-3.5 w-3.5" /></button>
    </div>
  );

  return (
    <button onClick={startEdit} aria-label="Rename chapter" title="Rename chapter"
      className="shrink-0 text-ink/30 transition-colors hover:text-gold-2">
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

/* ─── PrologueRow ─────────────────────────────────────────────────────── */

function PrologueRow({ item, expanded, onToggle, onOpenDocument, onOpenScene, onRenameScene }: {
  item: OutlineItem; expanded: boolean;
  onToggle: () => void; onOpenDocument: () => void;
  onOpenScene: (sceneId: string) => void;
  onRenameScene: (sceneId: string, name: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gold-3/25 bg-bg-1">
      <div className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gold-2/5">
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label="Toggle">
          {expanded ? <ChevronDown className="h-4 w-4 text-ink/50" /> : <ChevronRight className="h-4 w-4 text-ink/50" />}
        </button>
        <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
        <button className="min-w-0 flex-1 text-left" onClick={onOpenDocument}>
          <p className="font-medium text-ink transition-colors hover:text-gold-1">{item.title}</p>
          {item.summary && <p className="mt-0.5 truncate text-sm text-ink/50">{item.summary}</p>}
        </button>
        <span className="shrink-0 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/60">
          {item.scenes?.length ?? 0} Scene{(item.scenes?.length ?? 0) === 1 ? "" : "s"}
        </span>
        <button onClick={() => console.log("prologue menu")} aria-label="More options" className="text-ink/40 hover:text-ink">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      {expanded && item.scenes && (
        <div className="flex flex-col gap-1 border-t border-gold-3/15 px-4 py-2 pl-11">
          {item.scenes.map((scene, idx) => (
            <div key={scene.id} className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink/60 transition-colors hover:bg-gold-2/10 hover:text-ink/90">
              <span className="h-1 w-1 shrink-0 rounded-full bg-ink/40" />
              <button onClick={() => onOpenScene(scene.id)} className="flex-1 text-left">{sceneDisplayLabel(scene, idx)}</button>
              <SceneNameEditor scene={scene} index={idx} onSave={(name) => onRenameScene(scene.id, name)} />
              <button onClick={() => onOpenScene(scene.id)} aria-label="Open" className="text-ink/30 transition-colors hover:text-gold-2">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PartRow ─────────────────────────────────────────────────────────── */

function PartRow({
  item, expanded, onToggle, expandedChapters, onToggleChapter,
  onOpenChapter, onOpenScene, onAddChapter, onAddScene,
  onRenameChapter, onRenameScene, onReorderScenes, onMoveChapter, generatingScenes,
}: {
  item: OutlineItem;
  expanded: boolean;
  onToggle: () => void;
  expandedChapters: Set<string>;
  onToggleChapter: (id: string) => void;
  onOpenChapter: (chapterId: string) => void;
  onOpenScene: (chapterId: string, sceneId: string) => void;
  onAddChapter: () => void;
  onAddScene: (chapterId: string) => void;
  onRenameChapter: (chapterId: string, title: string) => void;
  onRenameScene: (chapterId: string, sceneId: string, name: string) => void;
  onReorderScenes: (chapterId: string, from: number, to: number) => void;
  /** srcPartId may differ from item.id for cross-part moves */
  onMoveChapter: (srcPartId: string, srcIdx: number, dstIdx: number) => void;
  generatingScenes: Set<string>;
}) {
  const [partMenuOpen, setPartMenuOpen]       = useState(false);
  const [chapterMenuOpen, setChapterMenuOpen] = useState<string | null>(null);
  const partMenuRef    = useRef<HTMLDivElement>(null);
  const chapterMenuRef = useRef<HTMLDivElement>(null);
  const dragSceneIdx   = useRef<{ chapterId: string; idx: number } | null>(null);
  const [dragOverIdx, setDragOverIdx]         = useState<number | null>(null);

  useEffect(() => {
    if (!partMenuOpen) return;
    const h = (e: MouseEvent) => { if (partMenuRef.current && !partMenuRef.current.contains(e.target as Node)) setPartMenuOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [partMenuOpen]);

  useEffect(() => {
    if (!chapterMenuOpen) return;
    const h = (e: MouseEvent) => { if (chapterMenuRef.current && !chapterMenuRef.current.contains(e.target as Node)) setChapterMenuOpen(null); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [chapterMenuOpen]);

  const chapters = item.chapters ?? [];

  return (
    <div className="rounded-xl border border-gold-3/25 bg-bg-1"
      /* drop zone for cross-part chapter moves */
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (crossPartDrag.srcPartId !== null && crossPartDrag.srcChapterIdx !== null) {
          onMoveChapter(crossPartDrag.srcPartId, crossPartDrag.srcChapterIdx, chapters.length);
          crossPartDrag.srcPartId = null; crossPartDrag.srcChapterIdx = null;
          setDragOverIdx(null);
        }
      }}
    >
      {/* Part header */}
      <div className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gold-2/5">
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label="Toggle part">
          {expanded ? <ChevronDown className="h-4 w-4 text-ink/50" /> : <ChevronRight className="h-4 w-4 text-ink/50" />}
        </button>
        <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
        <p className="min-w-0 flex-1 font-medium text-ink">{item.title}</p>
        <span className="shrink-0 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/60">
          {chapters.length} Chapter{chapters.length === 1 ? "" : "s"}
        </span>
        <div className="relative" ref={partMenuRef}>
          <button onClick={(e) => { e.stopPropagation(); setPartMenuOpen((v) => !v); }} aria-label="Part options" className="text-ink/40 hover:text-ink">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {partMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-gold-3/40 bg-bg-1 py-1.5 shadow-xl">
              <DocMenuItem icon={Plus}   label="New Chapter" onClick={() => { setPartMenuOpen(false); onAddChapter(); }} />
              <DocMenuItem icon={Pencil} label="Rename Part" onClick={() => { setPartMenuOpen(false); console.log("rename part"); }} />
            </div>
          )}
        </div>
      </div>

      {/* Chapters */}
      {expanded && (
        <div className="flex flex-col gap-2 border-t border-gold-3/15 p-3 pl-8">
          {chapters.map((chapter, chapterIdx) => {
            const chapterExpanded = expandedChapters.has(chapter.id);
            const isGenerating    = generatingScenes.has(chapter.id);
            const isDragOver      = dragOverIdx === chapterIdx;

            return (
              <div
                key={chapter.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  crossPartDrag.srcPartId     = item.id;
                  crossPartDrag.srcChapterIdx = chapterIdx;
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverIdx(chapterIdx); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation(); setDragOverIdx(null);
                  if (crossPartDrag.srcPartId !== null && crossPartDrag.srcChapterIdx !== null) {
                    onMoveChapter(crossPartDrag.srcPartId, crossPartDrag.srcChapterIdx, chapterIdx);
                    crossPartDrag.srcPartId = null; crossPartDrag.srcChapterIdx = null;
                  }
                }}
                className={`rounded-lg border bg-bg-0/40 transition-colors hover:border-gold-3/30 ${isDragOver ? "border-gold-2/60 bg-gold-2/5" : "border-gold-3/15"}`}
              >
                <div className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gold-2/5">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink/30 active:cursor-grabbing" />
                  <button onClick={(e) => { e.stopPropagation(); onToggleChapter(chapter.id); }} aria-label="Toggle scenes">
                    {chapterExpanded ? <ChevronDown className="h-4 w-4 text-ink/50" /> : <ChevronRight className="h-4 w-4 text-ink/50" />}
                  </button>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gold-2" />
                  <button className="min-w-0 flex-1 text-left" onClick={() => onOpenChapter(chapter.id)}>
                    <p className="text-ink transition-colors hover:text-gold-1">{chapter.title}</p>
                    {chapter.summary && <p className="mt-0.5 truncate text-sm text-ink/50">{chapter.summary}</p>}
                  </button>
                  <ChapterTitleEditor chapter={chapter} onSave={(t) => onRenameChapter(chapter.id, t)} />
                  <span className="shrink-0 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/60">
                    {isGenerating
                      ? <span className="flex items-center gap-1 text-gold-2/70"><Sparkles className="h-3 w-3 animate-pulse" />…</span>
                      : `${chapter.scenes.length} Scene${chapter.scenes.length === 1 ? "" : "s"}`
                    }
                  </span>
                  <div className="relative" ref={chapterMenuOpen === chapter.id ? chapterMenuRef : undefined}>
                    <button onClick={(e) => { e.stopPropagation(); setChapterMenuOpen((v) => v === chapter.id ? null : chapter.id); }} aria-label="Chapter options" className="text-ink/40 hover:text-ink">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {chapterMenuOpen === chapter.id && (
                      <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-gold-3/40 bg-bg-1 py-1.5 shadow-xl">
                        <DocMenuItem icon={Plus}   label="New Scene"    onClick={() => { setChapterMenuOpen(null); onAddScene(chapter.id); }} />
                        <DocMenuItem icon={Pencil} label="Open Chapter" onClick={() => { setChapterMenuOpen(null); onOpenChapter(chapter.id); }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Scenes */}
                {chapterExpanded && (
                  <div className="flex flex-col gap-1 border-t border-gold-3/15 px-3 py-2 pl-14">
                    {isGenerating ? (
                      <div className="flex items-center gap-2 text-sm text-ink/50"><Sparkles className="h-3.5 w-3.5 animate-pulse text-gold-2" />Analyzing story…</div>
                    ) : chapter.scenes.length === 0 ? (
                      <p className="text-sm text-ink/40">No scenes yet.</p>
                    ) : (
                      chapter.scenes.map((scene, idx) => (
                        <div
                          key={scene.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); dragSceneIdx.current = { chapterId: chapter.id, idx }; }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation();
                            if (dragSceneIdx.current?.chapterId === chapter.id) {
                              onReorderScenes(chapter.id, dragSceneIdx.current.idx, idx);
                              dragSceneIdx.current = null;
                            }
                          }}
                          className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink/60 transition-colors hover:bg-gold-2/10 hover:text-ink/90"
                        >
                          <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink/25 active:cursor-grabbing" />
                          <button onClick={() => onOpenScene(chapter.id, scene.id)} className="flex-1 text-left transition-colors hover:text-gold-1">
                            {sceneDisplayLabel(scene, idx)}
                          </button>
                          <SceneNameEditor scene={scene} index={idx} onSave={(name) => onRenameScene(chapter.id, scene.id, name)} />
                          <button onClick={() => onOpenScene(chapter.id, scene.id)} aria-label="Open scene" className="shrink-0 text-ink/30 transition-colors hover:text-gold-2">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
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
