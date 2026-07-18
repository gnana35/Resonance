"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { NOTES, type NoteType } from "@/data/notes";

const TYPE_STYLES: Record<
  NoteType,
  { badge: string; icon: typeof Lightbulb }
> = {
  Idea: { badge: "bg-amber-500/15 text-amber-300", icon: Lightbulb },
  Dialogue: { badge: "bg-sky-500/15 text-sky-300", icon: MessageSquare },
  Lore: { badge: "bg-emerald-500/15 text-emerald-300", icon: BookOpen },
  Research: { badge: "bg-gray-400/15 text-gray-300", icon: Search },
  Plot: { badge: "bg-green-500/15 text-green-300", icon: GitBranch },
  Reference: { badge: "bg-violet-500/15 text-violet-300", icon: Bookmark },
  Quote: { badge: "bg-rose-500/15 text-rose-300", icon: QuoteIcon },
};

const FILTERS: { label: string; type: NoteType | "All Notes" }[] = [
  { label: "All Notes", type: "All Notes" },
  { label: "Ideas", type: "Idea" },
  { label: "Research", type: "Research" },
  { label: "Dialogue", type: "Dialogue" },
  { label: "Lore", type: "Lore" },
  { label: "Plot", type: "Plot" },
  { label: "References", type: "Reference" },
];

function NoteThumbnail({ kind }: { kind: "armor" | "architecture" }) {
  const Icon = kind === "armor" ? Swords : Building2;
  return (
    <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-gradient-to-br from-gold-3/20 to-bg-0">
      <Icon className="h-8 w-8 text-gold-2/60" />
    </div>
  );
}

export default function Notes() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState<NoteType | "All Notes">(
    "All Notes",
  );
  const [query, setQuery] = useState("");

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NOTES.filter((note) => {
      const matchesType =
        activeFilter === "All Notes" || note.type === activeFilter;
      const matchesQuery =
        q.length === 0 ||
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [activeFilter, query]);

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-gold-1">Notes</h1>
          <p className="mt-1 text-ink/70">
            Capture ideas, references, snippets, and anything that inspires
            your story.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-gold-3/25 p-1">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`rounded-md p-1.5 ${
                view === "grid"
                  ? "bg-gold-2/15 text-gold-1"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={`rounded-md p-1.5 ${
                view === "list"
                  ? "bg-gold-2/15 text-gold-1"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gold-3/25 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-40 bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
            />
          </div>

          <button
            onClick={() => console.log("new note")}
            className="flex items-center gap-2 rounded-full bg-gold-2 px-5 py-2.5 font-medium text-bg-0 transition-colors hover:bg-gold-1"
          >
            <Plus className="h-4 w-4" />
            New Note
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setActiveFilter(filter.type)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              activeFilter === filter.type
                ? "bg-gold-2 text-bg-0"
                : "bg-bg-1 text-ink/70 hover:text-ink"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredNotes.length === 0 ? (
        <p className="mt-16 text-center text-ink/50">
          No notes match your search.
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
            return (
              <div
                key={note.id}
                className="rounded-2xl border border-gold-3/25 bg-bg-1 p-4"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide ${style.badge}`}
                  >
                    <Icon className="h-3 w-3" />
                    {note.type.toUpperCase()}
                  </span>
                  <button
                    onClick={() => console.log("note menu", note.id)}
                    aria-label="More options"
                    className="text-ink/40 hover:text-ink"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                {note.thumbnail && <NoteThumbnail kind={note.thumbnail} />}

                <p className="mt-3 font-display text-lg text-ink">
                  {note.title}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink/65">
                  {note.content}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-ink/40">
                  <span>{note.date}</span>
                  {note.pinned && (
                    <Star className="h-3.5 w-3.5 fill-gold-2 text-gold-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
