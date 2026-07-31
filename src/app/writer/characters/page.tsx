"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCharacters } from "@/context/CharactersContext";
import { useWorld } from "@/context/WorldContext";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { DraftBadge } from "@/components/DraftBadge";
import { DeleteCharacterModal, NewCharacterModal } from "@/components/CharacterModals";
import type { Character } from "@/data/characters";

type Filter = "all" | "established" | "draft";

export default function CharactersList() {
  const {
    characters,
    viewMode,
    setViewMode,
    deriveStatus,
    deriveChangeSummary,
  } = useCharacters();

  // Characters come from WorldContext's extraction — Refresh triggers WorldContext.
  const { runDerivation, deriveStatus: worldDeriveStatus } = useWorld();

  const [filter, setFilter] = useState<Filter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [showNew, setShowNew] = useState(false);

  const isRunning = deriveStatus === "running" || worldDeriveStatus === "running";

  const hasContent = (() => {
    try {
      const raw = localStorage.getItem("resonance:chapters");
      if (!raw) return false;
      const all = JSON.parse(raw) as Array<{ content: string }>;
      return all.some((c) => (c.content ?? "").length > 30);
    } catch { return false; }
  })();

  const filtered = characters.filter((c) => {
    if (filter === "established") return !c.isDraft;
    if (filter === "draft")       return c.isDraft;
    return true;
  });

  const promotionPending = characters.filter((c) => c.promotionPending);

  return (
    <div className="px-6 py-8 md:px-10">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-gold-1">Characters</h1>
          <p className="mt-1 text-ink/70">The people who shape your story.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Derivation status */}
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-ink/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning manuscript…
            </span>
          )}
          {!isRunning && deriveChangeSummary && (
            <span className="text-xs text-emerald-400/70">{deriveChangeSummary}</span>
          )}

          {/* Manual refresh — triggers WorldContext extraction which emits characters */}
          <button
            onClick={runDerivation}
            disabled={!hasContent || isRunning}
            title={hasContent ? "Rescan manuscript for characters" : "Write some chapter content first"}
            className="flex items-center gap-1.5 rounded-full border border-gold-3/30 px-3 py-2 text-xs text-ink/60 transition-colors hover:border-gold-2/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gold-3/25 p-1">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-gold-2/15 text-gold-1" : "text-ink/50 hover:text-ink"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              aria-label="List view"
              className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-gold-2/15 text-gold-1" : "text-ink/50 hover:text-ink"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-full bg-gold-2 px-5 py-2.5 font-medium text-bg-0 transition-colors hover:bg-gold-1"
          >
            <Plus className="h-4 w-4" />
            New Character
          </button>
        </div>
      </div>

      {/* ── Promotion prompts ── */}
      {promotionPending.map((c) => (
        <PromotionBanner key={c.id} character={c} />
      ))}

      {/* ── Filter pills ── */}
      {characters.length > 0 && (
        <div className="mt-5 flex gap-2">
          {(["all", "established", "draft"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-gold-2/20 text-gold-1"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {characters.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-center">
          <p className="font-display text-xl text-ink/40">No characters yet</p>
          <p className="mt-2 max-w-sm text-sm text-ink/40">
            Characters appear here as you write. You can also add one manually.
          </p>
          {!hasContent && (
            <p className="mt-3 max-w-xs text-xs text-ink/30">
              Scanning the manuscript for characters requires chapter content. Write
              a chapter first, then use Refresh.
            </p>
          )}
          <button
            onClick={() => setShowNew(true)}
            className="mt-8 flex items-center gap-2 rounded-full bg-gold-2 px-6 py-2.5 font-medium text-bg-0 transition-colors hover:bg-gold-1"
          >
            <Plus className="h-4 w-4" />
            Add Character
          </button>
        </div>
      )}

      {/* ── Character cards ── */}
      {filtered.length > 0 && (
        <div
          className={
            viewMode === "grid"
              ? "mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
              : "mt-8 flex flex-col gap-4"
          }
        >
          {filtered.map((character) =>
            viewMode === "grid" ? (
              <GridCard
                key={character.id}
                character={character}
                onDelete={() => setDeleteTarget(character)}
              />
            ) : (
              <ListCard
                key={character.id}
                character={character}
                onDelete={() => setDeleteTarget(character)}
              />
            ),
          )}
        </div>
      )}

      {filtered.length === 0 && characters.length > 0 && (
        <p className="mt-12 text-center text-sm text-ink/40">
          No {filter} characters.
        </p>
      )}

      {/* ── Modals ── */}
      {deleteTarget && (
        <DeleteCharacterModal
          character={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {showNew && <NewCharacterModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

/* ── Grid card ─────────────────────────────────────────────────────────── */

function GridCard({
  character,
  onDelete,
}: {
  character: Character;
  onDelete: () => void;
}) {
  return (
    <div className="group relative rounded-2xl border border-gold-3/25 bg-bg-1 p-5 transition-colors hover:border-gold-2/50">
      {/* Trash — top right, revealed on hover */}
      <button
        onClick={(e) => { e.preventDefault(); onDelete(); }}
        aria-label="Delete character"
        className="absolute right-4 top-4 z-10 text-ink/30 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Link href={`/writer/characters/${character.id}`} className="block">
        <div className="flex items-center gap-4 pr-8">
          <CharacterAvatar
            name={character.name}
            avatarColor={character.avatarColor}
            className="h-16 w-16 shrink-0 rounded-xl text-2xl"
          />
          <div className="min-w-0">
            <p className="font-display text-lg text-ink group-hover:text-gold-1">
              {character.name}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-ink/50">{character.role}</p>
              {character.isDraft && <DraftBadge />}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink/70 line-clamp-2">
          {character.description || character.bio || "No description yet."}
        </p>
      </Link>
    </div>
  );
}

/* ── List card ─────────────────────────────────────────────────────────── */

function ListCard({
  character,
  onDelete,
}: {
  character: Character;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex items-center gap-4 rounded-xl border border-gold-3/25 bg-bg-1 p-4 transition-colors hover:border-gold-2/50">
      <Link
        href={`/writer/characters/${character.id}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <CharacterAvatar
          name={character.name}
          avatarColor={character.avatarColor}
          className="h-12 w-12 shrink-0 rounded-lg text-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <p className="font-display text-base text-ink group-hover:text-gold-1">
              {character.name}
            </p>
            <p className="text-sm text-ink/50">{character.role}</p>
            {character.isDraft && <DraftBadge />}
          </div>
          <p className="mt-1 truncate text-sm text-ink/60">
            {character.description || character.bio || "No description yet."}
          </p>
        </div>
        {character.traits.length > 0 && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            {character.traits.slice(0, 3).map((trait) => (
              <span
                key={trait}
                className="rounded-full bg-gold-2/10 px-3 py-1 text-xs text-ink/60"
              >
                {trait}
              </span>
            ))}
          </div>
        )}
      </Link>
      <button
        onClick={onDelete}
        aria-label="Delete character"
        className="ml-2 shrink-0 text-ink/30 transition-colors hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Promotion banner ──────────────────────────────────────────────────── */

function PromotionBanner({ character }: { character: Character }) {
  const { promoteToEstablished, declinePromotion } = useCharacters();
  return (
    <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-gold-2/30 bg-gold-2/5 px-4 py-3">
      <p className="text-sm text-ink/80">
        <span className="font-medium text-gold-1">{character.name}</span> has appeared
        in your manuscript. Promote them to Established?
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => declinePromotion(character.id)}
          className="rounded-full border border-gold-3/30 px-3 py-1.5 text-xs text-ink/60 hover:text-ink"
        >
          Keep Draft
        </button>
        <button
          onClick={() => promoteToEstablished(character.id)}
          className="rounded-full bg-gold-2/20 px-3 py-1.5 text-xs font-medium text-gold-1 hover:bg-gold-2/30"
        >
          Promote
        </button>
      </div>
    </div>
  );
}
