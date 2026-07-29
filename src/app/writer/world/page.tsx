"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Info,
  Lock,
  RefreshCw,
  Sparkles,
  Unlock,
  X,
  Zap,
} from "lucide-react";
import { useWorld } from "@/context/WorldContext";
import type { WorldEntity, WorldRelationship } from "@/data/world";
import {
  ENTITY_KIND_STYLES,
  RELATIONSHIP_STYLES,
} from "@/data/world";
import LocationsMap from "@/components/LocationsMap";

/* ════════════════════════════════════════════════════════════════════════════
   SUB-TABS
   ════════════════════════════════════════════════════════════════════════════ */

const SUB_TABS = ["World Map", "Locations"] as const;
type SubTab = (typeof SUB_TABS)[number];

/* ════════════════════════════════════════════════════════════════════════════
   GRAPH NODE CARD
   ════════════════════════════════════════════════════════════════════════════ */

type NodeData = {
  entity: WorldEntity;
};

function WorldNodeCard({ data, selected }: NodeProps<Node<NodeData>>) {
  const { entity } = data;
  const style = ENTITY_KIND_STYLES[entity.kind];
  const isInferred = entity.status === "inferred";
  const isUnsupported = entity.status === "unsupported";

  return (
    <div
      className="w-52 rounded-lg border bg-bg-1 p-3 transition-all"
      style={{
        borderColor: selected
          ? style.color
          : isInferred
          ? `${style.color}55`
          : isUnsupported
          ? "#6b728055"
          : `${style.color}77`,
        boxShadow: selected ? `0 0 0 1.5px ${style.color}` : undefined,
        opacity: isUnsupported ? 0.55 : 1,
        borderStyle: isInferred ? "dashed" : "solid",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
          style={{ backgroundColor: `${style.color}22`, color: style.color }}
        >
          <span className="text-xs font-bold">{style.label[0]}</span>
        </div>
        <p
          className="truncate font-display text-sm text-ink"
          style={{ color: isUnsupported ? "#6b7280" : undefined }}
        >
          {entity.label}
        </p>
        {isInferred && (
          <Sparkles className="ml-auto h-3 w-3 shrink-0" style={{ color: style.color }} />
        )}
        {isUnsupported && (
          <AlertTriangle className="ml-auto h-3 w-3 shrink-0 text-amber-400/70" />
        )}
      </div>

      <p className="mt-1.5 text-[11px] capitalize leading-snug text-ink/50">
        {entity.subtype ?? style.label}
      </p>
    </div>
  );
}

const nodeTypes = { worldNode: WorldNodeCard };

/* ════════════════════════════════════════════════════════════════════════════
   DETAIL PANEL
   ════════════════════════════════════════════════════════════════════════════ */

function DetailPanel({
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
}) {
  const style = ENTITY_KIND_STYLES[entity.kind];
  const connected = relationships.filter(
    (r) => r.sourceId === entity.id || r.targetId === entity.id,
  );

  const isInferred = entity.status === "inferred";
  const isUnsupported = entity.status === "unsupported";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gold-3/25 bg-bg-1">
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 border-b border-gold-3/20 p-4"
        style={{ borderLeftColor: style.color, borderLeftWidth: 3 }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-lg text-gold-1 truncate">{entity.label}</p>
            {entity.locked && <Lock className="h-3.5 w-3.5 text-ink/40 shrink-0" />}
          </div>
          <p className="mt-0.5 text-xs capitalize text-ink/50">
            {entity.subtype ?? style.label}
            {entity.chapterIds.length > 0 && (
              <> · {entity.chapterIds.length} chapter{entity.chapterIds.length !== 1 ? "s" : ""}</>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-ink/40 hover:text-ink"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status badge */}
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
                Confirm
              </button>
              <button
                onClick={() => onDismiss(entity.id)}
                className="flex items-center gap-1 rounded-full border border-ink/20 bg-transparent px-3 py-1 text-xs text-ink/50 hover:border-red-400/40 hover:text-red-400"
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
                  The text that established this entity was removed or changed. Review
                  and remove it if it no longer belongs to the story.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Description / writer note */}
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
              Evidence from the manuscript
            </p>
            <div className="space-y-2">
              {entity.evidence.map((ev, i) => (
                <button
                  key={i}
                  onClick={() => onOpenChapter(ev.chapterId)}
                  className="w-full rounded-lg border border-gold-3/20 bg-bg-0/50 p-3 text-left transition-colors hover:border-gold-3/40"
                >
                  <p className="text-[11px] font-medium text-gold-2/70">
                    {ev.chapterTitle}
                  </p>
                  {ev.excerpt && (
                    <p className="mt-1 text-xs italic text-ink/60 leading-relaxed">
                      &ldquo;{ev.excerpt}&rdquo;
                    </p>
                  )}
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gold-2/50">
                    <BookOpen className="h-3 w-3" />
                    Open chapter
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
                const otherId =
                  rel.sourceId === entity.id ? rel.targetId : rel.sourceId;
                const other = allEntities.find((e) => e.id === otherId);
                if (!other) return null;
                const relStyle = RELATIONSHIP_STYLES[rel.kind];
                return (
                  <div key={rel.id} className="flex items-start gap-2">
                    <div className="flex flex-1 items-start gap-2 rounded-lg border border-gold-3/15 bg-bg-0/40 p-2">
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
                        className="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{
                          color: relStyle.stroke,
                          backgroundColor: `${relStyle.stroke}18`,
                        }}
                      >
                        {rel.status === "inferred" ? "inferred" : "confirmed"}
                      </span>
                    </div>
                    {rel.status === "inferred" && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => onConfirmRel(rel.id)}
                          title="Confirm this connection"
                          className="rounded border border-emerald-400/30 p-1 text-emerald-400/70 hover:bg-emerald-400/10"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDismissRel(rel.id)}
                          title="Dismiss this connection"
                          className="rounded border border-ink/20 p-1 text-ink/40 hover:border-red-400/30 hover:text-red-400/70"
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

        {/* Lock / unlock */}
        <div className="border-t border-gold-3/15 pt-3">
          {entity.locked ? (
            <button
              onClick={() => onUnlock(entity.id)}
              className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70"
            >
              <Unlock className="h-3.5 w-3.5" />
              Unlock (allow analysis to update)
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
   STATUS LEGEND
   ════════════════════════════════════════════════════════════════════════════ */

function StatusLegend() {
  return (
    <div className="rounded-xl border border-gold-3/20 bg-bg-1 p-4">
      <p className="mb-3 font-display text-sm text-gold-1">Legend</p>

      <p className="mb-1.5 text-[11px] uppercase tracking-wider text-ink/40">Status</p>
      <div className="mb-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-ink/70">
          <div className="h-3 w-3 rounded-sm border border-emerald-400 bg-transparent" />
          Confirmed by story
        </div>
        <div className="flex items-center gap-2 text-xs text-ink/70">
          <div
            className="h-3 w-3 rounded-sm border border-dashed border-violet-400 bg-transparent"
          />
          AI Inferred
        </div>
        <div className="flex items-center gap-2 text-xs text-ink/70">
          <div className="h-3 w-3 rounded-sm border border-amber-400/60 bg-transparent opacity-60" />
          Unsupported (text removed)
        </div>
      </div>

      <p className="mb-1.5 text-[11px] uppercase tracking-wider text-ink/40">Connections</p>
      <div className="flex flex-col gap-2">
        {Object.entries(RELATIONSHIP_STYLES).slice(0, 6).map(([kind, s]) => (
          <div key={kind} className="flex items-center gap-2">
            <svg width="24" height="8" className="shrink-0">
              <line
                x1="0" y1="4" x2="24" y2="4"
                stroke={s.stroke}
                strokeWidth="1.5"
                strokeDasharray={s.dash}
              />
            </svg>
            <span className="text-xs text-ink/60">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   KIND FILTER PILL
   ════════════════════════════════════════════════════════════════════════════ */

function KindPill({
  label,
  color,
  bg,
  active,
  count,
  onClick,
}: {
  label: string;
  color: string;
  bg: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all"
      style={
        active
          ? { borderColor: color, backgroundColor: bg, color }
          : { borderColor: "transparent", backgroundColor: "transparent", color: "rgba(207,214,230,0.35)" }
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: active ? color : "rgba(207,214,230,0.25)" }}
      />
      {label}
      {count > 0 && (
        <span
          className="rounded-full px-1 text-[10px]"
          style={{
            backgroundColor: active ? `${color}22` : "rgba(207,214,230,0.08)",
            color: active ? color : "rgba(207,214,230,0.3)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ════════════════════════════════════════════════════════════════════════════ */

function WorldEmptyState({ onRefresh, noProject }: { onRefresh: () => void; noProject: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <Globe className="h-16 w-16 text-ink/10" />
      <p className="mt-6 font-display text-2xl text-ink/40">
        {noProject ? "No active project" : "The world is waiting to be written"}
      </p>
      <p className="mt-3 max-w-md text-sm text-ink/40 leading-relaxed">
        {noProject
          ? "Select or create a project in the Writer's Space, then return here."
          : "The world builds itself from your manuscript. Write chapters in the Writer's Space and Resonance will identify the places, factions, events, and objects in your story — then map the relationships between them."}
      </p>
      {!noProject && (
        <button
          onClick={onRefresh}
          className="mt-8 flex items-center gap-2 rounded-full border border-gold-3/40 px-5 py-2.5 text-sm text-gold-2 hover:border-gold-2 hover:text-gold-1"
        >
          <RefreshCw className="h-4 w-4" />
          Analyse manuscript now
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   DERIVATION BANNER
   ════════════════════════════════════════════════════════════════════════════ */

function DeriveBanner({
  status,
  summary,
  onRefresh,
  lastAnalysedAt,
}: {
  status: "idle" | "running" | "done";
  summary: string;
  onRefresh: () => void;
  lastAnalysedAt: number | undefined;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "running") setVisible(true);
    if (status === "done") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 7000);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (!visible && status === "idle") return null;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-gold-3/25 bg-bg-1 px-4 py-2.5 text-sm"
      style={{ transition: "opacity 0.4s" }}
    >
      {status === "running" ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin text-gold-2" />
          <span className="text-ink/70">Analysing manuscript…</span>
        </>
      ) : (
        <>
          <Check className="h-4 w-4 text-emerald-400/80" />
          <span className="text-ink/60">{summary || "Analysis complete."}</span>
          {lastAnalysedAt && (
            <span className="ml-auto text-xs text-ink/30">
              {new Date(lastAnalysedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </>
      )}
      <button
        onClick={onRefresh}
        title="Re-analyse now"
        className="ml-auto shrink-0 rounded-md border border-gold-3/25 p-1.5 text-ink/40 hover:border-gold-2/40 hover:text-ink/70 disabled:opacity-40"
        disabled={status === "running"}
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CONTRADICTIONS PANEL
   ════════════════════════════════════════════════════════════════════════════ */

function ContradictionsPanel({
  contradictions,
  onResolve,
}: {
  contradictions: Array<{
    id: string;
    entityId: string;
    field: string;
    existingValue: string;
    newValue: string;
    chapterTitle: string;
    excerpt: string;
  }>;
  onResolve: (id: string, resolution: "keep" | "replace") => void;
}) {
  const [open, setOpen] = useState(true);
  if (!contradictions.length) return null;

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-amber-300"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">
          {contradictions.length} discrepanc{contradictions.length === 1 ? "y" : "ies"} to review
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t border-amber-400/20 p-4 space-y-3">
          {contradictions.map((c) => (
            <div key={c.id} className="rounded-lg border border-amber-400/20 bg-bg-0/50 p-3">
              <p className="text-xs font-medium text-amber-300">{c.field}</p>
              <p className="mt-1 text-xs text-ink/60">
                Existing: <span className="text-ink/80">{c.existingValue}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink/60">
                New ({c.chapterTitle}): <span className="italic text-ink/80">&ldquo;{c.excerpt}&rdquo;</span>
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onResolve(c.id, "keep")}
                  className="rounded-full border border-ink/20 px-3 py-0.5 text-xs text-ink/60 hover:border-ink/40 hover:text-ink/80"
                >
                  Keep existing
                </button>
                <button
                  onClick={() => onResolve(c.id, "replace")}
                  className="rounded-full border border-amber-400/30 px-3 py-0.5 text-xs text-amber-300 hover:bg-amber-400/10"
                >
                  Use new
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   WORLD MAP GRAPH (inner — needs ReactFlow provider)
   ════════════════════════════════════════════════════════════════════════════ */

type GraphEntityKind = import("@/data/world").WorldEntityKind;

const ALL_KINDS: GraphEntityKind[] = ["location", "faction", "event", "object", "character", "other"];

function WorldGraphInner({
  entities,
  relationships,
  selectedId,
  onSelectEntity,
}: {
  entities: WorldEntity[];
  relationships: WorldRelationship[];
  selectedId: string | null;
  onSelectEntity: (id: string) => void;
}) {
  const { fitView } = useReactFlow();

  // Load persisted node positions
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const raw = localStorage.getItem("resonance:world:positions");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const savePositions = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: { x, y } };
      try { localStorage.setItem("resonance:world:positions", JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  // Auto-layout new nodes in a loose grid
  const autoPos = useCallback((entities: WorldEntity[]): Record<string, { x: number; y: number }> => {
    const cols = Math.max(3, Math.ceil(Math.sqrt(entities.length)));
    const result: Record<string, { x: number; y: number }> = {};
    entities.forEach((e, i) => {
      result[e.id] = positions[e.id] ?? {
        x: (i % cols) * 260,
        y: Math.floor(i / cols) * 200,
      };
    });
    return result;
  }, [positions]);

  const layout = useMemo(() => autoPos(entities), [entities, autoPos]);

  const nodes: Node[] = useMemo(() =>
    entities.map((e) => ({
      id: e.id,
      type: "worldNode",
      position: layout[e.id] ?? { x: 0, y: 0 },
      data: { entity: e },
      selected: e.id === selectedId,
    })),
    [entities, layout, selectedId],
  );

  const edges: Edge[] = useMemo(() =>
    relationships
      .filter((r) => entities.some((e) => e.id === r.sourceId) && entities.some((e) => e.id === r.targetId))
      .map((r) => {
        const s = RELATIONSHIP_STYLES[r.kind];
        return {
          id: r.id,
          source: r.sourceId,
          target: r.targetId,
          label: r.label,
          labelStyle: { fill: "#cfd6e6", fontSize: 10 },
          labelBgStyle: { fill: "#0a0e1c", fillOpacity: 0.88 },
          style: {
            stroke: s.stroke,
            strokeDasharray: r.status === "inferred" ? (s.dash ?? "5 4") : s.dash,
            opacity: r.status === "inferred" ? 0.5 : 0.85,
          },
          markerEnd: r.status === "confirmed"
            ? { type: MarkerType.ArrowClosed, color: s.stroke, width: 14, height: 14 }
            : undefined,
        };
      }),
    [entities, relationships],
  );

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.25, duration: 300 }), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities.length]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelectEntity(node.id)}
      onNodeDragStop={(_, node) => savePositions(node.id, node.position.x, node.position.y)}
      fitView
      proOptions={{ hideAttribution: true }}
      colorMode="dark"
    >
      <Background color="#8a6a2f" gap={28} size={0.8} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   WORLD MAP TAB
   ════════════════════════════════════════════════════════════════════════════ */

function WorldMapTab({ onOpenChapter }: { onOpenChapter?: (chapterId: string) => void }) {
  const {
    entities,
    relationships,
    contradictions,
    deriveStatus,
    deriveChangeSummary,
    lastAnalysedAt,
    runDerivation,
    confirmEntity,
    dismissEntity,
    lockEntity,
    unlockEntity,
    confirmRelationship,
    dismissRelationship,
    resolveContradiction,
    hydrated,
  } = useWorld();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeKinds, setActiveKinds] = useState<Set<GraphEntityKind>>(new Set(ALL_KINDS));
  const [showLegend, setShowLegend] = useState(false);

  const selectedEntity = entities.find((e) => e.id === selectedId) ?? null;

  const allKindsActive = activeKinds.size === ALL_KINDS.length;

  function toggleKind(k: GraphEntityKind) {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  const visibleEntities = useMemo(
    () => entities.filter((e) => activeKinds.has(e.kind)),
    [entities, activeKinds],
  );

  const countByKind = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entities) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    return counts;
  }, [entities]);

  const hasContent = entities.length > 0;

  if (!hydrated) return null;

  const noActiveProject = typeof window !== "undefined"
    ? !localStorage.getItem("resonance:activeProject")
    : false;

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* Analysis status banner */}
      <DeriveBanner
        status={deriveStatus}
        summary={deriveChangeSummary}
        onRefresh={runDerivation}
        lastAnalysedAt={lastAnalysedAt}
      />

      {/* Contradictions */}
      {contradictions.length > 0 && (
        <ContradictionsPanel
          contradictions={contradictions}
          onResolve={resolveContradiction}
        />
      )}

      {!hasContent ? (
        <WorldEmptyState onRefresh={runDerivation} noProject={noActiveProject} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
          {/* Graph panel */}
          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 overflow-hidden">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gold-3/20 px-4 py-3">
              <button
                onClick={() => setActiveKinds(allKindsActive ? new Set() : new Set(ALL_KINDS))}
                className="rounded-full border px-3 py-1 text-xs font-medium transition-all"
                style={
                  allKindsActive
                    ? { borderColor: "#d9a84e", backgroundColor: "rgba(217,168,78,0.10)", color: "#f7e7b8" }
                    : { borderColor: "rgba(138,106,47,0.4)", backgroundColor: "transparent", color: "rgba(207,214,230,0.45)" }
                }
              >
                All
              </button>
              <span className="h-4 w-px bg-gold-3/25" />
              {ALL_KINDS.map((k) => {
                const s = ENTITY_KIND_STYLES[k];
                return (
                  <KindPill
                    key={k}
                    label={s.label}
                    color={s.color}
                    bg={s.bg}
                    active={activeKinds.has(k)}
                    count={countByKind[k] ?? 0}
                    onClick={() => toggleKind(k)}
                  />
                );
              })}
              <button
                onClick={() => setShowLegend((v) => !v)}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-gold-3/25 px-2.5 py-1 text-xs text-ink/50 hover:border-gold-2/40 hover:text-ink/70"
              >
                <Info className="h-3.5 w-3.5" />
                Legend
              </button>
            </div>

            {/* Graph */}
            <div className="h-[580px] w-full">
              {visibleEntities.length > 0 ? (
                <ReactFlowProvider>
                  <WorldGraphInner
                    entities={visibleEntities}
                    relationships={relationships}
                    selectedId={selectedId}
                    onSelectEntity={setSelectedId}
                  />
                </ReactFlowProvider>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ink/30">
                  No entities match the current filter.
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4 min-w-0">
            {selectedEntity ? (
              <DetailPanel
                entity={selectedEntity}
                relationships={relationships}
                allEntities={entities}
                onSelectEntity={setSelectedId}
                onConfirm={confirmEntity}
                onDismiss={dismissEntity}
                onLock={lockEntity}
                onUnlock={unlockEntity}
                onClose={() => setSelectedId(null)}
                onOpenChapter={onOpenChapter ?? (() => {})}
                onConfirmRel={confirmRelationship}
                onDismissRel={dismissRelationship}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-gold-3/20 bg-bg-1 p-6 text-center text-sm text-ink/30">
                <div>
                  <Zap className="mx-auto mb-3 h-8 w-8 text-ink/15" />
                  Click any node to see its details
                </div>
              </div>
            )}

            {(showLegend || !selectedEntity) && (
              <StatusLegend />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PAGE ROOT
   ════════════════════════════════════════════════════════════════════════════ */

export default function WorldPage() {
  const [subTab, setSubTab] = useState<SubTab>("World Map");
  const { deriveStatus, runDerivation } = useWorld();

  return (
    <div className="flex flex-col px-6 py-8 md:px-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-gold-1">The World</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            A living map of the world in your manuscript — built from the story, not invented before it.
          </p>
        </div>
        <button
          onClick={runDerivation}
          disabled={deriveStatus === "running"}
          className="flex shrink-0 items-center gap-2 rounded-full border border-gold-3/40 px-4 py-2 text-sm text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${deriveStatus === "running" ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Sub-tab bar */}
      <div className="mt-6 flex items-center gap-6 border-b border-gold-3/20">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${
              subTab === tab
                ? "border-gold-2 text-gold-1"
                : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === "World Map" ? (
        <WorldMapTab />
      ) : (
        <LocationsMap />
      )}
    </div>
  );
}
