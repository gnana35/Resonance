"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Globe,
  Lock,
  MapPin,
  RefreshCw,
  Sparkles,
  Unlock,
  X,
} from "lucide-react";
import { useWorld } from "@/context/WorldContext";
import type { WorldEntity, WorldRelationship } from "@/data/world";
import { ENTITY_KIND_STYLES, RELATIONSHIP_STYLES } from "@/data/world";

/* ════════════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ════════════════════════════════════════════════════════════════════════════ */

function LocationsEmptyState({
  onRefresh,
  hasProject,
}: {
  onRefresh: () => void;
  hasProject: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <MapPin className="h-14 w-14 text-ink/10" />
      <p className="mt-5 font-display text-2xl text-ink/40">
        {hasProject ? "No locations discovered yet" : "No active project"}
      </p>
      <p className="mt-2 max-w-sm text-sm text-ink/40 leading-relaxed">
        {hasProject
          ? "Write chapters that describe places — cities, forests, ruins, roads — and Resonance will surface them here automatically."
          : "Select or create a project in the Writer's Space first."}
      </p>
      {hasProject && (
        <button
          onClick={onRefresh}
          className="mt-6 flex items-center gap-2 rounded-full border border-gold-3/40 px-5 py-2.5 text-sm text-gold-2 hover:border-gold-2 hover:text-gold-1"
        >
          <RefreshCw className="h-4 w-4" />
          Analyse manuscript
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LOCATION LIST ITEM
   ════════════════════════════════════════════════════════════════════════════ */

function LocationListItem({
  entity,
  selected,
  onClick,
}: {
  entity: WorldEntity;
  selected: boolean;
  onClick: () => void;
}) {
  const style = ENTITY_KIND_STYLES[entity.kind];
  const isInferred = entity.status === "inferred";
  const isUnsupported = entity.status === "unsupported";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all"
      style={{
        borderColor: selected
          ? style.color
          : isInferred
          ? `${style.color}30`
          : `${style.color}40`,
        backgroundColor: selected ? `${style.color}0e` : undefined,
        borderStyle: isInferred ? "dashed" : "solid",
        opacity: isUnsupported ? 0.6 : 1,
      }}
    >
      {/* Color dot */}
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={{ backgroundColor: `${style.color}22`, color: style.color }}
      >
        {(entity.subtype ?? entity.kind)[0].toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-display text-sm text-ink truncate">{entity.label}</p>
          {isInferred && <Sparkles className="h-3 w-3 shrink-0 text-violet-400" />}
          {isUnsupported && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400/70" />}
          {entity.locked && <Lock className="h-3 w-3 shrink-0 text-ink/30" />}
        </div>
        <p className="mt-0.5 text-xs capitalize text-ink/50">
          {entity.subtype ?? style.label}
          {entity.chapterIds.length > 0 && (
            <> · {entity.chapterIds.length} chapter{entity.chapterIds.length !== 1 ? "s" : ""}</>
          )}
        </p>
        {entity.evidence.length > 0 && entity.evidence[0].excerpt && (
          <p className="mt-1 line-clamp-1 text-xs italic text-ink/40">
            &ldquo;{entity.evidence[0].excerpt}&rdquo;
          </p>
        )}
      </div>

      {/* Status badge */}
      <span
        className="shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor: isInferred
            ? "rgba(167,139,250,0.15)"
            : isUnsupported
            ? "rgba(251,191,36,0.15)"
            : `${style.color}18`,
          color: isInferred
            ? "#a78bfa"
            : isUnsupported
            ? "#fbbf24"
            : style.color,
        }}
      >
        {isInferred ? "inferred" : isUnsupported ? "unsupported" : "confirmed"}
      </span>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LOCATION DETAIL PANEL
   ════════════════════════════════════════════════════════════════════════════ */

function LocationDetailPanel({
  entity,
  relationships,
  allEntities,
  onSelectEntity,
  onConfirm,
  onDismiss,
  onLock,
  onUnlock,
  onClose,
  onOpenChapter,
  onConfirmRel,
  onDismissRel,
  onRemoveUnsupported,
}: {
  entity: WorldEntity;
  relationships: WorldRelationship[];
  allEntities: WorldEntity[];
  onSelectEntity: (id: string) => void;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
  onLock: (id: string) => void;
  onUnlock: (id: string) => void;
  onClose: () => void;
  onOpenChapter: (chapterId: string) => void;
  onConfirmRel: (id: string) => void;
  onDismissRel: (id: string) => void;
  onRemoveUnsupported: (id: string) => void;
}) {
  const style = ENTITY_KIND_STYLES[entity.kind];
  const isInferred = entity.status === "inferred";
  const isUnsupported = entity.status === "unsupported";

  const connected = relationships.filter(
    (r) => r.sourceId === entity.id || r.targetId === entity.id,
  );

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border bg-bg-1"
      style={{ borderColor: `${style.color}33`, borderLeftColor: style.color, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-gold-3/20 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-lg text-gold-1 truncate">{entity.label}</p>
            {entity.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-ink/40" />}
          </div>
          <p className="mt-0.5 text-xs capitalize text-ink/50">
            {entity.subtype ?? style.label}
            {entity.chapterIds.length > 0 && (
              <> · first in {entity.evidence[0]?.chapterTitle ?? "?"}</>
            )}
          </p>
        </div>
        <button onClick={onClose} className="shrink-0 text-ink/40 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {/* Status warnings */}
        {isInferred && (
          <div className="rounded-lg border border-violet-400/30 bg-violet-400/10 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-violet-300">AI Inferred</p>
                {entity.inferenceNote && (
                  <p className="mt-1 text-xs text-ink/60">{entity.inferenceNote}</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onConfirm(entity.id)}
                className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-400/20"
              >
                <Check className="h-3 w-3" />
                Confirm canon
              </button>
              <button
                onClick={() => onDismiss(entity.id)}
                className="flex items-center gap-1 rounded-full border border-ink/20 px-3 py-1 text-xs text-ink/50 hover:border-red-400/40 hover:text-red-400"
              >
                <X className="h-3 w-3" />
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isUnsupported && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-xs font-medium text-amber-300">No Longer Supported</p>
                <p className="mt-1 text-xs text-ink/60">
                  The passage that described this location was removed from the manuscript.
                </p>
              </div>
            </div>
            <button
              onClick={() => onRemoveUnsupported(entity.id)}
              className="mt-3 rounded-full border border-amber-400/30 px-3 py-1 text-xs text-amber-300 hover:bg-amber-400/10"
            >
              Remove this entry
            </button>
          </div>
        )}

        {/* Description */}
        {(entity.description || entity.writerNote) && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gold-2/70">
              Description
            </p>
            <p className="text-sm text-ink/75 leading-relaxed">
              {entity.writerNote ?? entity.description}
            </p>
          </div>
        )}

        {/* Evidence */}
        {entity.evidence.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold-2/70">
              From the manuscript
            </p>
            <div className="space-y-2">
              {entity.evidence.map((ev, i) => (
                <button
                  key={i}
                  onClick={() => onOpenChapter(ev.chapterId)}
                  className="w-full rounded-lg border border-gold-3/20 bg-bg-0/50 p-3 text-left transition-colors hover:border-gold-3/40"
                >
                  <p className="text-[11px] font-medium text-gold-2/70">{ev.chapterTitle}</p>
                  {ev.excerpt && (
                    <p className="mt-1 text-xs italic text-ink/60 leading-relaxed">
                      &ldquo;{ev.excerpt}&rdquo;
                    </p>
                  )}
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gold-2/50">
                    <BookOpen className="h-3 w-3" />
                    Open in editor
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Connections */}
        {connected.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold-2/70">
              Connections
            </p>
            <div className="space-y-1.5">
              {connected.map((rel) => {
                const otherId = rel.sourceId === entity.id ? rel.targetId : rel.sourceId;
                const other = allEntities.find((e) => e.id === otherId);
                if (!other) return null;
                const relStyle = RELATIONSHIP_STYLES[rel.kind];
                return (
                  <div key={rel.id} className="flex items-start gap-2">
                    <div className="flex flex-1 gap-2 rounded-lg border border-gold-3/15 bg-bg-0/40 p-2">
                      <button
                        onClick={() => onSelectEntity(other.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-xs font-medium text-ink hover:text-gold-1">
                          {other.label}
                        </p>
                        <p className="text-[11px] text-ink/50">{rel.label}</p>
                      </button>
                      <span
                        className="self-start rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{ color: relStyle.stroke, backgroundColor: `${relStyle.stroke}18` }}
                      >
                        {rel.status}
                      </span>
                    </div>
                    {rel.status === "inferred" && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => onConfirmRel(rel.id)}
                          className="rounded border border-emerald-400/30 p-1 text-emerald-400/70 hover:bg-emerald-400/10"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDismissRel(rel.id)}
                          className="rounded border border-ink/20 p-1 text-ink/40 hover:text-red-400/70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lock controls */}
        <div className="border-t border-gold-3/15 pt-3">
          {entity.locked ? (
            <button
              onClick={() => onUnlock(entity.id)}
              className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70"
            >
              <Unlock className="h-3.5 w-3.5" />
              Unlock (allow derivation to update)
            </button>
          ) : (
            <button
              onClick={() => onLock(entity.id)}
              className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70"
            >
              <Lock className="h-3.5 w-3.5" />
              Lock this entry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export default function LocationsMap() {
  const {
    entities,
    relationships,
    deriveStatus,
    runDerivation,
    confirmEntity,
    dismissEntity,
    lockEntity,
    unlockEntity,
    confirmRelationship,
    dismissRelationship,
    removeUnsupportedEntity,
    hydrated,
  } = useWorld();

  // Show only location-kind entities on this tab
  const locations = useMemo(
    () => entities.filter((e) => e.kind === "location"),
    [entities],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "inferred">("all");
  const [query, setQuery] = useState("");

  const selectedEntity = locations.find((e) => e.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    let list = locations;
    if (filterStatus !== "all") list = list.filter((e) => e.status === filterStatus);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          (e.subtype ?? "").toLowerCase().includes(q) ||
          e.evidence.some((ev) => ev.excerpt.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [locations, filterStatus, query]);

  const hasProject =
    typeof window !== "undefined"
      ? Boolean(localStorage.getItem("resonance:activeProject"))
      : false;

  if (!hydrated) return null;

  const confirmedCount = locations.filter((e) => e.status === "confirmed").length;
  const inferredCount  = locations.filter((e) => e.status === "inferred").length;

  const handleOpenChapter = (_chapterId: string) => {
    // Navigate user to writer page — best effort via window
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("resonance:openChapter", { detail: { chapterId: _chapterId } }));
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter pills */}
        {["all", "confirmed", "inferred"].map((f) => (
          <button
            key={f}
            onClick={() => setFilterStatus(f as typeof filterStatus)}
            className="rounded-full border px-3 py-1 text-xs font-medium capitalize transition-all"
            style={
              filterStatus === f
                ? { borderColor: "#d9a84e", backgroundColor: "rgba(217,168,78,0.10)", color: "#f7e7b8" }
                : { borderColor: "rgba(138,106,47,0.3)", backgroundColor: "transparent", color: "rgba(207,214,230,0.40)" }
            }
          >
            {f}
            {f === "confirmed" && confirmedCount > 0 && (
              <span className="ml-1.5 text-[10px] opacity-70">{confirmedCount}</span>
            )}
            {f === "inferred" && inferredCount > 0 && (
              <span className="ml-1.5 text-[10px] opacity-70">{inferredCount}</span>
            )}
          </button>
        ))}

        {/* Search */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search locations…"
          className="ml-auto rounded-lg border border-gold-3/25 bg-bg-1 px-3 py-1.5 text-xs text-ink/80 placeholder:text-ink/30 focus:border-gold-2/40 focus:outline-none"
        />

        {/* Refresh */}
        <button
          onClick={runDerivation}
          disabled={deriveStatus === "running"}
          title="Re-analyse manuscript"
          className="flex items-center gap-1.5 rounded-md border border-gold-3/25 px-3 py-1.5 text-xs text-ink/50 hover:border-gold-2/40 hover:text-ink/70 disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${deriveStatus === "running" ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-ink/50">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border border-sky-400" />
          Confirmed by story
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border border-dashed border-violet-400" />
          AI Inferred
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border border-amber-400/60 opacity-60" />
          Unsupported
        </div>
      </div>

      {locations.length === 0 ? (
        <LocationsEmptyState onRefresh={runDerivation} hasProject={hasProject} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          {/* Location list */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink/40">
                No locations match the current filter.
              </p>
            ) : (
              filtered.map((entity) => (
                <LocationListItem
                  key={entity.id}
                  entity={entity}
                  selected={selectedId === entity.id}
                  onClick={() => setSelectedId(selectedId === entity.id ? null : entity.id)}
                />
              ))
            )}
          </div>

          {/* Detail panel */}
          <div>
            {selectedEntity ? (
              <LocationDetailPanel
                entity={selectedEntity}
                relationships={relationships}
                allEntities={entities}
                onSelectEntity={(id) => setSelectedId(id)}
                onConfirm={confirmEntity}
                onDismiss={dismissEntity}
                onLock={lockEntity}
                onUnlock={unlockEntity}
                onClose={() => setSelectedId(null)}
                onOpenChapter={handleOpenChapter}
                onConfirmRel={confirmRelationship}
                onDismissRel={dismissRelationship}
                onRemoveUnsupported={removeUnsupportedEntity}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-gold-3/20 bg-bg-1 text-center">
                <div>
                  <Globe className="mx-auto mb-3 h-8 w-8 text-ink/15" />
                  <p className="text-sm text-ink/30">Select a location to see its details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
