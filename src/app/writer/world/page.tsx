"use client";

import { useMemo, useState } from "react";
import LocationsMap from "@/components/LocationsMap";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowRight,
  Building2,
  Gem,
  MapPin,
  Search,
  Shield,
  SlidersHorizontal,
  User,
  Zap,
} from "lucide-react";
import { CHARACTERS } from "@/data/characters";
import { WORLD_ENTITIES, WORLD_EDGES, type RelationshipKind } from "@/data/world";

type EntityType = "character" | "Affiliation" | "location" | "event" | "object";

type GraphNodeInfo = {
  id: string;
  label: string;
  entityType: EntityType;
  subtitle: string;
  detail: string;
};

const GRAPH_SUBTITLES: Record<string, string> = {
  kael: "Former guard seeking redemption.",
  lira: "Haunted by her past, driven by protecting others.",
  "the-council": "Ancient order that guides from the shadows.",
};

const CHARACTER_NODE_IDS = ["the-council", "kael", "lira"];

const CHARACTER_NODES: GraphNodeInfo[] = CHARACTER_NODE_IDS.map((id) => {
  const character = CHARACTERS.find((c) => c.id === id)!;
  return {
    id: character.id,
    label: character.name,
    entityType: id === "the-council" ? "Affiliation" : "character",
    subtitle: GRAPH_SUBTITLES[id] ?? character.description,
    detail: character.bio ?? character.description,
  };
});

const ENTITY_NODES: GraphNodeInfo[] = WORLD_ENTITIES.map((e) => ({
  id: e.id,
  label: e.label,
  entityType: e.type as EntityType,
  subtitle: e.subtitle,
  detail: e.detail,
}));

const ALL_NODES: GraphNodeInfo[] = [...CHARACTER_NODES, ...ENTITY_NODES];

const POSITIONS: Record<string, { x: number; y: number }> = {
  kael: { x: 0, y: 0 },
  "the-council": { x: 320, y: 0 },
  lira: { x: 640, y: 0 },
  "the-iron-ward": { x: 0, y: 200 },
  "veyndor-city": { x: 320, y: 200 },
  "the-shrouded": { x: 640, y: 200 },
  "the-fracture": { x: 320, y: 420 },
  "the-silvergrove": { x: 0, y: 640 },
  "aether-core": { x: 320, y: 640 },
  "the-echoing-wastes": { x: 640, y: 640 },
};

const TYPE_STYLES: Record<
  EntityType,
  { border: string; icon: typeof User; dot: string; bg: string; label: string }
> = {
  character: {
    border: "#d9a84e",
    icon: User,
    dot: "bg-gold-2",
    bg: "rgba(217,168,78,0.12)",
    label: "Character",
  },
  Affiliation: {
    border: "#a78bfa",
    icon: Shield,
    dot: "bg-violet-400",
    bg: "rgba(167,139,250,0.12)",
    label: "Affiliation",
  },
  location: {
    border: "#38bdf8",
    icon: MapPin,
    dot: "bg-sky-400",
    bg: "rgba(56,189,248,0.12)",
    label: "Location",
  },
  event: {
    border: "#34d399",
    icon: Zap,
    dot: "bg-emerald-400",
    bg: "rgba(52,211,153,0.12)",
    label: "Event",
  },
  object: {
    border: "#9ca3af",
    icon: Gem,
    dot: "bg-gray-400",
    bg: "rgba(156,163,175,0.12)",
    label: "Object",
  },
};

const EDGE_STYLES: Record<RelationshipKind, { stroke: string; dash?: string }> = {
  allied: { stroke: "#34d399" },
  opposed: { stroke: "#f87171" },
  family: { stroke: "#d9a84e" },
  mentor: { stroke: "#38bdf8", dash: "6 4" },
  manipulates: { stroke: "#a78bfa", dash: "2 3" },
  other: { stroke: "#6b7280", dash: "4 4" },
};

const LEGEND: { label: string; kind: RelationshipKind }[] = [
  { label: "Allied / Loyal", kind: "allied" },
  { label: "Opposed / Enemy", kind: "opposed" },
  { label: "Family / Bond", kind: "family" },
  { label: "Mentor / Trained", kind: "mentor" },
  { label: "Manipulates / Controls", kind: "manipulates" },
  { label: "Other", kind: "other" },
];

const TYPE_LEGEND: { label: string; type: EntityType }[] = [
  { label: "Character", type: "character" },
  { label: "Affiliation", type: "Affiliation" },
  { label: "Location", type: "location" },
  { label: "Event", type: "event" },
  { label: "Object", type: "object" },
];

const ALL_TYPES = TYPE_LEGEND.map((t) => t.type);

const SUB_TABS = ["World Map", "Locations"] as const;

function WorldNodeCard({ data, selected }: NodeProps<Node<GraphNodeInfo>>) {
  const style = TYPE_STYLES[data.entityType];
  const Icon = style.icon;
  return (
    <div
      className="w-56 rounded-lg border bg-bg-1 p-3"
      style={{
        borderColor: selected ? style.border : `${style.border}55`,
        boxShadow: selected ? `0 0 0 1px ${style.border}` : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${style.border}22`, color: style.border }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="font-display text-sm text-ink">{data.label}</p>
      </div>
      <p className="mt-2 text-xs leading-snug text-ink/60">{data.subtitle}</p>
    </div>
  );
}

const nodeTypes = { worldNode: WorldNodeCard };

// ─── Category filter pill ──────────────────────────────────────────────────
function FilterPill({
  label,
  color,
  bg,
  active,
  onClick,
}: {
  label: string;
  color: string;
  bg: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150"
      style={
        active
          ? {
              borderColor: color,
              backgroundColor: bg,
              color: color,
              boxShadow: `0 0 0 1px ${color}55`,
            }
          : {
              borderColor: "transparent",
              backgroundColor: "transparent",
              color: "rgba(207,214,230,0.35)",
            }
      }
    >
      <span
        className="h-2 w-2 rounded-full transition-all duration-150"
        style={{ backgroundColor: active ? color : "rgba(207,214,230,0.25)" }}
      />
      {label}
    </button>
  );
}

// ─── "All" pill ────────────────────────────────────────────────────────────
function AllPill({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150"
      style={
        active
          ? {
              borderColor: "#d9a84e",
              backgroundColor: "rgba(217,168,78,0.10)",
              color: "#f7e7b8",
              boxShadow: "0 0 0 1px rgba(217,168,78,0.40)",
            }
          : {
              borderColor: "rgba(138,106,47,0.4)",
              backgroundColor: "transparent",
              color: "rgba(207,214,230,0.45)",
            }
      }
    >
      All
    </button>
  );
}

export default function WorldMap() {
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]>("World Map");
  const [selectedId, setSelectedId] = useState<string>("veyndor-city");
  const [activeTypes, setActiveTypes] = useState<Set<EntityType>>(new Set(ALL_TYPES));

  const allActive = activeTypes.size === ALL_TYPES.length;

  function toggleAll() {
    if (allActive) {
      // Clear all
      setActiveTypes(new Set());
    } else {
      // Select all
      setActiveTypes(new Set(ALL_TYPES));
    }
  }

  function toggleType(type: EntityType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  // Only nodes whose type is currently active are shown.
  // An edge is shown only when both its source and target nodes are visible.
  const visibleIds = useMemo(
    () => new Set(ALL_NODES.filter((n) => activeTypes.has(n.entityType)).map((n) => n.id)),
    [activeTypes],
  );

  const nodes: Node[] = useMemo(() => {
    return ALL_NODES.map((n) => {
      const visible = visibleIds.has(n.id);
      return {
        id: n.id,
        type: "worldNode",
        position: POSITIONS[n.id] ?? { x: 0, y: 0 },
        data: n,
        hidden: !visible,
        selectable: visible,
        draggable: visible,
      };
    });
  }, [visibleIds]);

  const edges: Edge[] = useMemo(() => {
    return WORLD_EDGES.map((e, i) => {
      const visible = visibleIds.has(e.source) && visibleIds.has(e.target);
      const style = EDGE_STYLES[e.kind];
      return {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: visible ? e.label : undefined,
        labelStyle: { fill: "#cfd6e6", fontSize: 11 },
        labelBgStyle: { fill: "#0a0e1c", fillOpacity: 0.85 },
        hidden: !visible,
        style: {
          stroke: style.stroke,
          strokeDasharray: style.dash,
        },
      };
    });
  }, [visibleIds]);

  const selectedNode = ALL_NODES.find((n) => n.id === selectedId);
  const connections = WORLD_EDGES.filter(
    (e) => e.source === selectedId || e.target === selectedId,
  ).map((e) => {
    const otherId = e.source === selectedId ? e.target : e.source;
    const other = ALL_NODES.find((n) => n.id === otherId);
    return { other, label: e.label };
  });

  return (
    <div className="flex flex-col px-6 py-8 md:px-10">
      <h1 className="font-display text-3xl text-gold-1">The World</h1>
      <p className="mt-2 text-ink/70">
        Explore the people, places, Affiliations, and events that shape your
        story.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-gold-3/20">
        <div className="flex gap-6">
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

        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => console.log("search world")}
            aria-label="Search"
            className="rounded-md border border-gold-3/30 p-2 text-ink/70 hover:border-gold-2/50 hover:text-ink"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => console.log("filter world")}
            aria-label="Filters"
            className="rounded-md border border-gold-3/30 p-2 text-ink/70 hover:border-gold-2/50 hover:text-ink"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {subTab === "Locations" ? (
        <LocationsMap />
      ) : subTab !== "World Map" ? (
        <div className="mt-16 flex flex-col items-center text-center text-ink/60">
          <p className="font-display text-xl text-gold-1">{subTab}</p>
          <p className="mt-2 max-w-sm">Coming soon.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-gold-3/25 bg-bg-1">
            {/* ── Legend / filter bar ───────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gold-3/20 px-4 py-3">
              <AllPill active={allActive} onClick={toggleAll} />
              <span className="h-4 w-px bg-gold-3/30" />
              {TYPE_LEGEND.map((item) => {
                const s = TYPE_STYLES[item.type];
                return (
                  <FilterPill
                    key={item.type}
                    label={item.label}
                    color={s.border}
                    bg={s.bg}
                    active={activeTypes.has(item.type)}
                    onClick={() => toggleType(item.type)}
                  />
                );
              })}
            </div>

            <div className="h-[640px] w-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                  const info = ALL_NODES.find((n) => n.id === node.id);
                  if (info && activeTypes.has(info.entityType)) {
                    setSelectedId(node.id);
                  }
                }}
                fitView
                proOptions={{ hideAttribution: true }}
                colorMode="dark"
              >
                <Background color="#8a6a2f" gap={24} size={1} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {selectedNode && (
              <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
                <p className="font-display text-xl text-gold-1">
                  {selectedNode.label}
                </p>
                <p className="mt-1 text-sm capitalize text-ink/50">
                  {selectedNode.entityType} · {WORLD_ENTITIES.find((e) => e.id === selectedNode.id)?.kind ?? "Character"}
                </p>

                <div
                  className="mt-4 flex h-32 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${TYPE_STYLES[selectedNode.entityType].border}15`,
                  }}
                >
                  {(() => {
                    const Icon = TYPE_STYLES[selectedNode.entityType].icon;
                    return (
                      <Icon
                        className="h-10 w-10"
                        style={{ color: TYPE_STYLES[selectedNode.entityType].border }}
                      />
                    );
                  })()}
                </div>

                <p className="mt-4 text-sm text-ink/75">
                  {selectedNode.detail}
                </p>

                {connections.length > 0 && (
                  <>
                    <p className="mt-5 font-display text-sm text-gold-1">
                      Connected To
                    </p>
                    <div className="mt-3 flex flex-col gap-2.5">
                      {connections.map(({ other, label }, i) =>
                        other ? (
                          <button
                            key={i}
                            onClick={() => setSelectedId(other.id)}
                            className="flex items-center gap-2 text-left text-sm"
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_STYLES[other.entityType].dot}`}
                            />
                            <span className="text-ink">{other.label}</span>
                            <span className="text-ink/40">{label}</span>
                          </button>
                        ) : null,
                      )}
                    </div>
                  </>
                )}

                <button
                  onClick={() => console.log("view all connections", selectedId)}
                  className="mt-4 flex items-center gap-1.5 text-sm text-gold-2 hover:text-gold-1"
                >
                  View all connections
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="font-display text-lg text-gold-1">
                Relationship Legend
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-ink/70">
                {LEGEND.map((item) => {
                  const style = EDGE_STYLES[item.kind];
                  return (
                    <div key={item.kind} className="flex items-center gap-3">
                      <svg width="28" height="8" className="shrink-0">
                        <line
                          x1="0"
                          y1="4"
                          x2="28"
                          y2="4"
                          stroke={style.stroke}
                          strokeWidth="2"
                          strokeDasharray={style.dash}
                        />
                      </svg>
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-ink/40">
              <Building2 className="h-3.5 w-3.5" />
              Tip: Drag nodes to rearrange
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
