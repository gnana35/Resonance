"use client";

import {
  ChevronDown,
  Grid3x3,
  List,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import type { ReferenceItem } from "@/lib/designs";

/* ─── filter options ─────────────────────────────────────────────────────── */

const FILTER_OPTIONS = [
  "All References",
  "Images",
  "Textures",
  "Characters",
  "Environments",
];

/* ─── props ──────────────────────────────────────────────────────────────── */

export interface ReferencesPanelProps {
  /** Current list of references — owned by parent, passed down. */
  references:    ReferenceItem[];
  /** Called when the user uploads a new reference image. */
  onAdd:         (file: File) => Promise<void>;
  /** Called when the user removes a reference. */
  onRemove:      (id: string) => void;
}

/* ─── component ──────────────────────────────────────────────────────────── */

export function ReferencesPanel({ references, onAdd, onRemove }: ReferencesPanelProps) {
  const [view,        setView]        = useState<"grid" | "list">("grid");
  const [filter,      setFilter]      = useState("All References");
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [query,       setQuery]       = useState("");
  const [isDragging,  setIsDragging]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* filter list by search query (client-side only) */
  const visible = references.filter((r) =>
    query.length === 0 || r.name.toLowerCase().includes(query.toLowerCase()),
  );

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    setUploading(true);
    try {
      for (const file of list) await onAdd(file);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col rounded-xl border border-violet-3/25 bg-bg-1">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-violet-3/20 px-4 py-3">
        <span className="text-sm font-medium text-ink">
          References
          {references.length > 0 && (
            <span className="ml-1.5 text-ink/35">({references.length})</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {/* Grid / List toggle */}
          <div className="flex items-center gap-0.5 rounded-md border border-violet-3/20 p-0.5">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`rounded p-1 transition-colors ${
                view === "grid" ? "bg-violet-2/15 text-violet-1" : "text-ink/40 hover:text-ink"
              }`}
            >
              <Grid3x3 className="h-3 w-3" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={`rounded p-1 transition-colors ${
                view === "list" ? "bg-violet-2/15 text-violet-1" : "text-ink/40 hover:text-ink"
              }`}
            >
              <List className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-violet-2 transition-colors hover:bg-violet-2/10 hover:text-violet-1 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            {uploading ? "Uploading…" : "Add Reference"}
          </button>
        </div>
      </div>

      {/* ── Filter + search ── */}
      <div className="flex items-center gap-2 border-b border-violet-3/20 px-3 py-2">
        <div className="relative">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-1 rounded-md border border-violet-3/20 bg-bg-0 px-2.5 py-1.5 text-xs text-ink/70 transition-colors hover:border-violet-2/40"
          >
            {filter}
            <ChevronDown
              className={`h-3 w-3 text-ink/35 transition-transform ${filterOpen ? "rotate-180" : ""}`}
            />
          </button>
          {filterOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-max rounded-lg border border-violet-3/30 bg-bg-0 py-1 shadow-lg">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setFilter(opt); setFilterOpen(false); }}
                  className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-violet-2/10 ${
                    filter === opt ? "text-violet-1" : "text-ink/70"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center gap-2 rounded-md border border-violet-3/20 bg-bg-0 px-2.5 py-1.5">
          <Search className="h-3 w-3 shrink-0 text-ink/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search references…"
            className="w-full bg-transparent text-xs text-ink placeholder:text-ink/35 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col gap-3 p-3">
        {/* Drop zone — always shown */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-center transition-colors ${
            isDragging
              ? "border-violet-2 bg-violet-2/10"
              : "border-violet-3/35 hover:border-violet-2/50 hover:bg-violet-2/5"
          }`}
        >
          <Upload className="h-4 w-4 text-ink/35" />
          <div>
            <p className="text-xs text-ink/60">Drag &amp; drop images here</p>
            <p className="text-xs text-ink/35">
              or{" "}
              <span className="text-violet-2 underline underline-offset-2">
                click to browse
              </span>
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />

        {/* Reference thumbnails */}
        {visible.length > 0 && (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-3 gap-2"
                : "flex flex-col gap-2"
            }
          >
            {visible.map((r) => (
              <div key={r.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.previewUrl}
                  alt={r.name}
                  title={r.name}
                  className={
                    view === "grid"
                      ? "h-16 w-full rounded-md object-cover"
                      : "h-12 w-full rounded-md object-cover"
                  }
                />
                {/* Remove button on hover */}
                <button
                  onClick={() => onRemove(r.id)}
                  aria-label={`Remove ${r.name}`}
                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-bg-0/80 text-red-400 group-hover:flex hover:bg-bg-0"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state — only show when there are no refs at all */}
        {references.length === 0 && (
          <p className="text-center text-xs text-ink/30">No references yet</p>
        )}
      </div>
    </div>
  );
}
