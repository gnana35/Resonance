"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Bookmark,
  Building2,
  GitBranch,
  LayoutGrid,
  Lightbulb,
  List,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Quote as QuoteIcon,
  Search,
  Star,
  Swords,
  X,
} from "lucide-react";
import { NOTES, type Note, type NoteType } from "@/data/notes";

// ─── Type metadata ────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<NoteType, { badge: string; icon: typeof Lightbulb }> = {
  Idea:      { badge: "bg-amber-500/15 text-amber-300",   icon: Lightbulb },
  Dialogue:  { badge: "bg-sky-500/15 text-sky-300",       icon: MessageSquare },
  Lore:      { badge: "bg-emerald-500/15 text-emerald-300", icon: BookOpen },
  Research:  { badge: "bg-gray-400/15 text-gray-300",     icon: Search },
  Plot:      { badge: "bg-green-500/15 text-green-300",   icon: GitBranch },
  Reference: { badge: "bg-violet-500/15 text-violet-300", icon: Bookmark },
  Quote:     { badge: "bg-rose-500/15 text-rose-300",     icon: QuoteIcon },
};

const NOTE_TYPES: NoteType[] = ["Idea", "Dialogue", "Lore", "Research", "Plot", "Reference", "Quote"];

// ─── Filter definitions ───────────────────────────────────────────────────────

type FilterValue = NoteType | "All Notes" | "Favorites";

const FILTERS: { label: string; type: FilterValue }[] = [
  { label: "All Notes",  type: "All Notes" },
  { label: "Favorites",  type: "Favorites" },
  { label: "Ideas",      type: "Idea" },
  { label: "Research",   type: "Research" },
  { label: "Dialogue",   type: "Dialogue" },
  { label: "Lore",       type: "Lore" },
  { label: "Plot",       type: "Plot" },
  { label: "References", type: "Reference" },
];

// ─── Thumbnail placeholder ────────────────────────────────────────────────────

function NoteThumbnail({ kind }: { kind: "armor" | "architecture" }) {
  const Icon = kind === "armor" ? Swords : Building2;
  return (
    <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-gradient-to-br from-gold-3/20 to-bg-0">
      <Icon className="h-8 w-8 text-gold-2/60" />
    </div>
  );
}

// ─── Edit / New Note modal ────────────────────────────────────────────────────

type EditState = {
  id: string;
  title: string;
  type: NoteType;
  content: string;
};

function NoteEditModal({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: EditState;
  isNew: boolean;
  onSave: (draft: EditState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EditState>(initial);
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus title on open
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function set<K extends keyof EditState>(key: K, value: EditState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const canSave = draft.title.trim().length > 0;

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg-0/80 px-4 py-16 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-gold-3/30 bg-bg-1 shadow-2xl">
        {/* modal header */}
        <div className="flex items-center justify-between border-b border-gold-3/20 px-6 py-4">
          <h2 className="font-display text-base text-gold-1">
            {isNew ? "New Note" : "Edit Note"}
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded-md p-1 text-ink/40 transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* form body */}
        <div className="flex flex-col gap-5 px-6 py-5">
          {/* title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-ink/40">
              Title
            </label>
            <input
              ref={titleRef}
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Note title…"
              className="w-full rounded-lg border border-gold-3/25 bg-bg-0 px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-gold-2/60 focus:outline-none"
            />
          </div>

          {/* type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-ink/40">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {NOTE_TYPES.map((t) => {
                const s = TYPE_STYLES[t];
                const Icon = s.icon;
                const active = draft.type === t;
                return (
                  <button
                    key={t}
                    onClick={() => set("type", t)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? `${s.badge} ring-1 ring-current`
                        : "bg-bg-0 text-ink/50 hover:text-ink"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-ink/40">
              Content
            </label>
            <textarea
              value={draft.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Write your note…"
              rows={8}
              className="w-full resize-y rounded-lg border border-gold-3/25 bg-bg-0 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink/30 focus:border-gold-2/60 focus:outline-none"
            />
          </div>
        </div>

        {/* actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gold-3/20 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-full border border-gold-3/30 px-5 py-2 text-sm text-ink/60 transition-colors hover:border-gold-2/50 hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave(draft)}
            disabled={!canSave}
            className="rounded-full bg-gold-2 px-5 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isNew ? "Create Note" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Notes() {
  const [view, setView]               = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All Notes");
  const [query, setQuery]             = useState("");
  const [notes, setNotes]             = useState<Note[]>(NOTES);
  const [editTarget, setEditTarget]   = useState<EditState | null>(null);
  const [isNew, setIsNew]             = useState(false);

  // ── Filter + search ──────────────────────────────────────────────────────
  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesType =
        activeFilter === "All Notes" ||
        (activeFilter === "Favorites" ? note.favorited === true : note.type === activeFilter);
      const matchesQuery =
        q.length === 0 ||
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [notes, activeFilter, query]);

  // ── Mutations ────────────────────────────────────────────────────────────

  function toggleFavorite(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, favorited: !n.favorited } : n)),
    );
  }

  function openEdit(note: Note) {
    setIsNew(false);
    setEditTarget({ id: note.id, title: note.title, type: note.type, content: note.content });
  }

  function openNew() {
    setIsNew(true);
    setEditTarget({
      id: `note-${Date.now()}`,
      title: "",
      type: "Idea",
      content: "",
    });
  }

  function handleSave(draft: EditState) {
    if (isNew) {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " · " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      setNotes((prev) => [
        { id: draft.id, title: draft.title, type: draft.type, content: draft.content, date: dateStr },
        ...prev,
      ]);
    } else {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === draft.id
            ? { ...n, title: draft.title, type: draft.type, content: draft.content }
            : n,
        ),
      );
    }
    setEditTarget(null);
  }

  function handleCancel() {
    setEditTarget(null);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* edit/new modal */}
      {editTarget && (
        <NoteEditModal
          initial={editTarget}
          isNew={isNew}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div className="px-6 py-8 md:px-10">
        {/* ── Header row ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl text-gold-1">Notes</h1>
            <p className="mt-1 text-ink/70">
              Capture ideas, references, snippets, and anything that inspires
              your story.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* view toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-gold-3/25 p-1">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`rounded-md p-1.5 ${
                  view === "grid" ? "bg-gold-2/15 text-gold-1" : "text-ink/50 hover:text-ink"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                aria-label="List view"
                className={`rounded-md p-1.5 ${
                  view === "list" ? "bg-gold-2/15 text-gold-1" : "text-ink/50 hover:text-ink"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* search */}
            <div className="flex items-center gap-2 rounded-lg border border-gold-3/25 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-ink/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-40 bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
              />
            </div>

            {/* new note */}
            <button
              onClick={openNew}
              className="flex items-center gap-2 rounded-full bg-gold-2 px-5 py-2.5 font-medium text-bg-0 transition-colors hover:bg-gold-1"
            >
              <Plus className="h-4 w-4" />
              New Note
            </button>
          </div>
        </div>

        {/* ── Filter pills ── */}
        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const isFav = filter.type === "Favorites";
            const active = activeFilter === filter.type;
            return (
              <button
                key={filter.label}
                onClick={() => setActiveFilter(filter.type)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? isFav
                      ? "bg-gold-2/20 text-gold-2 ring-1 ring-gold-2/50"
                      : "bg-gold-2 text-bg-0"
                    : "bg-bg-1 text-ink/70 hover:text-ink"
                }`}
              >
                {isFav && (
                  <Star
                    className={`h-3 w-3 ${active ? "fill-gold-2 text-gold-2" : "text-ink/50"}`}
                  />
                )}
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* ── Notes grid / list ── */}
        {filteredNotes.length === 0 ? (
          <p className="mt-16 text-center text-ink/50">
            {activeFilter === "Favorites"
              ? "No favorited notes yet. Star a note to save it here."
              : "No notes match your search."}
          </p>
        ) : (
          <div
            className={
              view === "grid"
                ? "mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                : "mt-8 flex flex-col gap-3"
            }
          >
            {filteredNotes.map((note) => {
              const style = TYPE_STYLES[note.type];
              const Icon = style.icon;
              const isFav = note.favorited === true;

              return (
                <div
                  key={note.id}
                  className={`group rounded-2xl border bg-bg-1 p-4 transition-colors ${
                    isFav
                      ? "border-gold-2/35 hover:border-gold-2/55"
                      : "border-gold-3/25 hover:border-gold-3/45"
                  }`}
                >
                  {/* top row: badge + star + menu */}
                  <div className="flex items-start justify-between">
                    <span
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide ${style.badge}`}
                    >
                      <Icon className="h-3 w-3" />
                      {note.type.toUpperCase()}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* favorite star */}
                      <button
                        onClick={() => toggleFavorite(note.id)}
                        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                        className="rounded-md p-1 transition-colors"
                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star
                          className={`h-3.5 w-3.5 transition-all ${
                            isFav
                              ? "fill-gold-2 text-gold-2"
                              : "text-ink/25 hover:text-gold-2"
                          }`}
                        />
                      </button>

                      {/* edit menu — opens edit modal */}
                      <button
                        onClick={() => openEdit(note)}
                        aria-label="Edit note"
                        className="text-ink/40 hover:text-ink"
                        title="Edit note"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* thumbnail */}
                  {note.thumbnail && <NoteThumbnail kind={note.thumbnail} />}

                  {/* title — clickable to edit */}
                  <button
                    onClick={() => openEdit(note)}
                    className="mt-3 w-full text-left"
                  >
                    <p className="font-display text-lg text-ink group-hover:text-gold-1 transition-colors">
                      {note.title}
                    </p>
                  </button>

                  <p className="mt-2 whitespace-pre-line text-sm text-ink/65">
                    {note.content}
                  </p>

                  {/* footer: date */}
                  <div className="mt-4 text-xs text-ink/40">
                    <span>{note.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
