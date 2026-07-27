"use client";

import { useState } from "react";
import {
  MapPin,
  Trees,
  Mountain,
  Waves,
  Skull,
  Castle,
  Landmark,
  Wind,
  X,
  Check,
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Minus,
  AlertCircle,
  Diamond,
  FileText,
} from "lucide-react";
import {
  MAP_LOCATIONS,
  MAP_ROUTES,
  MAP_INFERENCE_SUGGESTIONS,
  type MapLocation,
  type MapLocationType,
  type MapInferenceSuggestion,
} from "@/data/world";
import { CHARACTERS } from "@/data/characters";

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<MapLocationType, React.ElementType> = {
  city:      MapPin,
  forest:    Trees,
  mountain:  Mountain,
  river:     Waves,
  ruin:      Skull,
  landmark:  Landmark,
  castle:    Castle,
  wasteland: Wind,
};

const TYPE_COLORS: Record<MapLocationType, { fill: string; label: string }> = {
  city:      { fill: "#d9a84e", label: "City" },
  forest:    { fill: "#34d399", label: "Forest" },
  mountain:  { fill: "#94a3b8", label: "Mountain" },
  river:     { fill: "#38bdf8", label: "River" },
  ruin:      { fill: "#a78bfa", label: "Ruin" },
  landmark:  { fill: "#fbbf24", label: "Landmark" },
  castle:    { fill: "#f87171", label: "Castle" },
  wasteland: { fill: "#6b7280", label: "Wasteland" },
};

const ALL_TYPES: MapLocationType[] = [
  "city", "castle", "landmark", "ruin", "forest", "mountain", "river", "wasteland",
];

// ─── Layer definitions (map-layer toggles in left panel) ─────────────────────
type LayerId = "locations" | "paths" | "borders" | "regions" | "landmarks";
const LAYERS: { id: LayerId; label: string }[] = [
  { id: "locations",  label: "Locations" },
  { id: "paths",      label: "Paths & Journeys" },
  { id: "borders",    label: "Borders" },
  { id: "regions",    label: "Regions" },
  { id: "landmarks",  label: "Landmarks" },
];

// ─── SVG map dimensions ───────────────────────────────────────────────────────
const W = 900;
const H = 600;

// ─── Arrowhead marker defs ────────────────────────────────────────────────────
function SvgDefs() {
  return (
    <defs>
      {/* grid */}
      <pattern id="lm-grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <path
          d="M 50 0 L 0 0 0 50"
          fill="none"
          stroke="#8a6a2f"
          strokeWidth="0.25"
          opacity="0.18"
        />
      </pattern>

      {/* vignette */}
      <radialGradient id="lm-vignette" cx="50%" cy="50%" r="72%">
        <stop offset="55%" stopColor="transparent" />
        <stop offset="100%" stopColor="#03040a" stopOpacity="0.75" />
      </radialGradient>

      {/* confirmed route arrow */}
      <marker
        id="arrow-confirmed"
        markerWidth="7"
        markerHeight="7"
        refX="5"
        refY="3.5"
        orient="auto"
      >
        <polyline points="0,0 6,3.5 0,7" fill="none" stroke="#8a6a2f" strokeWidth="1.2" />
      </marker>

      {/* inferred route arrow */}
      <marker
        id="arrow-inferred"
        markerWidth="7"
        markerHeight="7"
        refX="5"
        refY="3.5"
        orient="auto"
      >
        <polyline points="0,0 6,3.5 0,7" fill="none" stroke="#5b4d8f" strokeWidth="1.2" />
      </marker>
    </defs>
  );
}

// ─── Terrain SVG decoration ───────────────────────────────────────────────────
function TerrainDecoration() {
  // mountain glyph clusters at key positions
  const mountainClusters = [
    { x: 550, y: 140 },
    { x: 580, y: 155 },
    { x: 565, y: 125 },
  ];
  // forest dot clusters
  const forestClusters = [
    { x: 155, y: 175 }, { x: 170, y: 190 }, { x: 140, y: 185 },
    { x: 165, y: 165 }, { x: 155, y: 200 },
  ];

  return (
    <g>
      {/* faint ocean/region tint for eastern wastes */}
      <ellipse cx="648" cy="408" rx="120" ry="80" fill="#1a0e0e" opacity="0.35" />

      {/* mountain glyphs */}
      {mountainClusters.map((m, i) => (
        <g key={i} transform={`translate(${m.x},${m.y})`} opacity="0.22" fill="#94a3b8">
          <polygon points="0,-14 10,6 -10,6" />
          <polygon points="0,-10 7,4 -7,4" fill="#64748b" />
        </g>
      ))}

      {/* forest dot glyphs */}
      {forestClusters.map((f, i) => (
        <g key={i} transform={`translate(${f.x},${f.y})`} opacity="0.2" fill="#34d399">
          <circle r="6" />
          <circle cx="8" cy="2" r="5" />
          <circle cx="-6" cy="3" r="4" />
        </g>
      ))}

      {/* scattered texture dots */}
      {([
        [80, 120], [130, 60], [250, 80], [700, 90], [820, 180],
        [760, 480], [100, 440], [400, 510], [840, 350], [50, 300],
      ] as [number, number][]).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.2" fill="#d9a84e" opacity="0.08" />
      ))}
    </g>
  );
}

// ─── Route lines ──────────────────────────────────────────────────────────────
function RouteLines({
  selectedId,
  visible,
}: {
  selectedId: string | null;
  visible: boolean;
}) {
  if (!visible) return null;
  const locMap = Object.fromEntries(MAP_LOCATIONS.map((l) => [l.id, l]));

  return (
    <>
      {MAP_ROUTES.map((route) => {
        const from = locMap[route.from];
        const to   = locMap[route.to];
        if (!from || !to) return null;

        const x1 = (from.x / 100) * W;
        const y1 = (from.y / 100) * H;
        const x2 = (to.x   / 100) * W;
        const y2 = (to.y   / 100) * H;

        const isHighlighted =
          selectedId === route.from || selectedId === route.to;
        const opacity = selectedId ? (isHighlighted ? 0.9 : 0.15) : 0.5;
        const confirmed = route.status === "confirmed";

        return (
          <line
            key={route.id}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={confirmed ? "#8a6a2f" : "#5b4d8f"}
            strokeWidth={isHighlighted ? 2 : 1.2}
            strokeDasharray={confirmed ? undefined : "6 4"}
            opacity={opacity}
            markerEnd={`url(#arrow-${confirmed ? "confirmed" : "inferred"})`}
            style={{ transition: "opacity 200ms ease" }}
          />
        );
      })}
    </>
  );
}

// ─── Location marker ─────────────────────────────────────────────────────────
function LocationMarker({
  loc,
  selected,
  dimmed,
  typeVisible,
  onClick,
}: {
  loc: MapLocation;
  selected: boolean;
  dimmed: boolean;
  typeVisible: boolean;
  onClick: () => void;
}) {
  if (!typeVisible) return null;

  const cx = (loc.x / 100) * W;
  const cy = (loc.y / 100) * H;
  const colors = TYPE_COLORS[loc.type];
  const isInferred = loc.status === "inferred";
  const opacity = dimmed ? 0.2 : 1;

  return (
    <g
      transform={`translate(${cx},${cy})`}
      style={{ cursor: "pointer", opacity, transition: "opacity 200ms ease" }}
      onClick={onClick}
    >
      {/* outer pulse ring on selection */}
      {selected && (
        <circle r="22" fill={`${colors.fill}18`} stroke={colors.fill} strokeWidth="1" />
      )}

      {/* inferred dashed ring */}
      {isInferred && !selected && (
        <circle r="15" fill="none" stroke="#a78bfa" strokeWidth="1"
          strokeDasharray="3 3" opacity="0.55" />
      )}

      {/* marker diamond (like the reference image) */}
      <g transform="rotate(45)">
        <rect
          x="-8" y="-8" width="16" height="16"
          fill={selected ? colors.fill : `${colors.fill}25`}
          stroke={colors.fill}
          strokeWidth={selected ? 0 : 1.5}
          rx="2"
        />
      </g>

      {/* type dot in centre */}
      <circle r="3" fill={selected ? "#0a0e1c" : colors.fill} />
    </g>
  );
}

// ─── Location label ───────────────────────────────────────────────────────────
function LocationLabel({
  loc,
  selected,
  dimmed,
  typeVisible,
}: {
  loc: MapLocation;
  selected: boolean;
  dimmed: boolean;
  typeVisible: boolean;
}) {
  if (!typeVisible) return null;

  const cx = (loc.x / 100) * W;
  const cy = (loc.y / 100) * H;
  const colors = TYPE_COLORS[loc.type];

  // multi-word labels: split on space and render two lines for longer names
  const words = loc.label.split(" ");
  const line1 = words.length > 2 ? words.slice(0, Math.ceil(words.length / 2)).join(" ") : loc.label;
  const line2 = words.length > 2 ? words.slice(Math.ceil(words.length / 2)).join(" ") : null;

  const fill = selected
    ? colors.fill
    : loc.status === "inferred"
    ? "#a78bfa"
    : "#e8dfc8";

  const opacity = dimmed ? 0.15 : selected ? 1 : 0.8;

  return (
    <text
      textAnchor="middle"
      fontFamily="var(--font-cinzel), 'Cinzel', Georgia, serif"
      letterSpacing="0.12em"
      style={{ transition: "opacity 200ms ease", pointerEvents: "none", userSelect: "none" }}
      fill={fill}
      opacity={opacity}
    >
      {line2 ? (
        <>
          <tspan x={cx} y={cy + 28} fontSize="9.5" fontWeight={selected ? "600" : "400"}>
            {line1}
          </tspan>
          <tspan x={cx} y={cy + 40} fontSize="9.5" fontWeight={selected ? "600" : "400"}>
            {line2}
          </tspan>
        </>
      ) : (
        <tspan x={cx} y={cy + 28} fontSize="9.5" fontWeight={selected ? "600" : "400"}>
          {line1}
        </tspan>
      )}
    </text>
  );
}

// ─── Compass rose ─────────────────────────────────────────────────────────────
function CompassRose() {
  return (
    <g transform="translate(52, 52)">
      <circle r="26" fill="#0a0e1c" stroke="#8a6a2f" strokeWidth="0.8" opacity="0.85" />
      {/* N / S / E / W arms */}
      {[
        { label: "N", x: 0,   y: -18, tx: 0,   ty: -20 },
        { label: "S", x: 0,   y: 18,  tx: 0,   ty: 22  },
        { label: "E", x: 18,  y: 0,   tx: 22,  ty: 3   },
        { label: "W", x: -18, y: 0,   tx: -22, ty: 3   },
      ].map(({ label, x, y, tx, ty }) => (
        <g key={label}>
          <line x1="0" y1="0" x2={x} y2={y} stroke="#d9a84e" strokeWidth="1" opacity="0.6" />
          <text
            x={tx} y={ty}
            textAnchor="middle"
            fontSize="7"
            fontFamily="var(--font-cinzel), serif"
            fill={label === "N" ? "#d9a84e" : "#8a6a2f"}
            letterSpacing="0.05em"
          >
            {label}
          </text>
        </g>
      ))}
      {/* centre diamond */}
      <g transform="rotate(45)">
        <rect x="-4" y="-4" width="8" height="8" fill="#d9a84e" opacity="0.7" />
      </g>
    </g>
  );
}

// ─── Zoom controls ────────────────────────────────────────────────────────────
function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1">
      {[
        { label: "+", action: onZoomIn,  icon: <Plus  className="h-3.5 w-3.5" /> },
        { label: "−", action: onZoomOut, icon: <Minus className="h-3.5 w-3.5" /> },
        { label: "⟳", action: onReset,   icon: <RefreshCw className="h-3.5 w-3.5" /> },
      ].map(({ label, action, icon }) => (
        <button
          key={label}
          onClick={action}
          aria-label={label}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-3/30 bg-bg-1/90 text-ink/60 backdrop-blur-sm transition-colors hover:border-gold-2/50 hover:text-gold-1"
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// ─── Left layer / legend panel ────────────────────────────────────────────────
function LayerPanel({
  activeLayers,
  onToggleLayer,
  visibleTypes,
  onToggleType,
  onResetView,
}: {
  activeLayers: Set<LayerId>;
  onToggleLayer: (id: LayerId) => void;
  visibleTypes: Set<MapLocationType>;
  onToggleType: (t: MapLocationType) => void;
  onResetView: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-0 overflow-y-auto border-r border-gold-3/20 bg-bg-1 text-xs">
      {/* Map Layers */}
      <div className="border-b border-gold-3/15 px-4 py-3">
        <p className="mb-2.5 font-display text-[10px] uppercase tracking-widest text-ink/40">
          Map Layers
        </p>
        <div className="flex flex-col gap-1.5">
          {LAYERS.map((layer) => {
            const on = activeLayers.has(layer.id);
            return (
              <button
                key={layer.id}
                onClick={() => onToggleLayer(layer.id)}
                className="flex items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-gold-3/10"
              >
                <span className={on ? "text-ink/80" : "text-ink/30"}>{layer.label}</span>
                {on
                  ? <Eye className="h-3.5 w-3.5 text-ink/40" />
                  : <EyeOff className="h-3.5 w-3.5 text-ink/20" />
                }
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="border-b border-gold-3/15 px-4 py-3">
        <p className="mb-2.5 font-display text-[10px] uppercase tracking-widest text-ink/40">
          Legend
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-ink/60">
            <Diamond className="h-3 w-3 shrink-0 fill-gold-2 text-gold-2" />
            <span>Confirmed by Story</span>
          </div>
          <div className="flex items-center gap-2 text-ink/40">
            <Diamond className="h-3 w-3 shrink-0 text-violet-2" strokeDasharray="2 1" />
            <span>AI Inferred</span>
            <AlertCircle className="ml-auto h-3 w-3 text-ink/25" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 px-4 py-3">
        <p className="mb-2.5 font-display text-[10px] uppercase tracking-widest text-ink/40">
          Filters
        </p>
        <div className="flex flex-col gap-1.5">
          {ALL_TYPES.map((t) => {
            const on = visibleTypes.has(t);
            const Icon = TYPE_ICONS[t];
            const c = TYPE_COLORS[t];
            return (
              <button
                key={t}
                onClick={() => onToggleType(t)}
                className="flex items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-gold-3/10"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: on ? c.fill : "#4b5563" }} />
                <span className={on ? "flex-1 text-ink/70" : "flex-1 text-ink/25"}>
                  {c.label}s
                </span>
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    on
                      ? "border-gold-2/50 bg-gold-2/20 text-gold-2"
                      : "border-gold-3/20 bg-transparent text-transparent"
                  }`}
                >
                  <Check className="h-2.5 w-2.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <div className="border-t border-gold-3/15 px-4 py-3">
        <button
          onClick={onResetView}
          className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-ink/40 transition-colors hover:text-ink/70"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset View
        </button>
      </div>
    </div>
  );
}

// ─── Right detail panel ────────────────────────────────────────────────────────
function DetailPanel({
  loc,
  suggestions,
  onClose,
  onSuggestionAction,
}: {
  loc: MapLocation;
  suggestions: MapInferenceSuggestion[];
  onClose: () => void;
  onSuggestionAction: (id: string, action: "approved" | "dismissed") => void;
}) {
  const colors = TYPE_COLORS[loc.type];
  const Icon = TYPE_ICONS[loc.type];
  const locChars = loc.characters
    .map((id) => CHARACTERS.find((c) => c.id === id))
    .filter(Boolean);
  const pendingSuggestion = suggestions.find(
    (s) => s.locationId === loc.id && s.status === "pending",
  );

  const detailRows: { label: string; value: string | undefined }[] = [
    { label: "Type",             value: TYPE_COLORS[loc.type].label },
    { label: "Region",           value: loc.region },
    { label: "First Appearance", value: loc.firstAppearance },
    { label: "Population",       value: loc.population },
    { label: "Alignment",        value: loc.alignment },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-gold-3/20 bg-bg-1">
      {/* header */}
      <div className="shrink-0 border-b border-gold-3/20 px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-gold-1 tracking-wide">{loc.label}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              {loc.status === "confirmed" ? (
                <span className="flex items-center gap-1.5 text-[11px] text-gold-2">
                  <Diamond className="h-3 w-3 fill-gold-2 text-gold-2" />
                  Confirmed by Story
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-violet-2">
                  <Sparkles className="h-3 w-3" />
                  AI Inferred
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-ink/30 transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* image placeholder */}
        <div
          className="flex h-36 w-full items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${colors.fill}18 0%, #03040a 100%)`,
            borderBottom: `1px solid ${colors.fill}22`,
          }}
        >
          <Icon className="h-10 w-10 opacity-30" style={{ color: colors.fill }} />
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* description */}
          <p className="text-sm leading-relaxed text-ink/70">{loc.detail}</p>

          {/* AI inference warning */}
          {loc.inferenceNote && (
            <div className="flex gap-2.5 rounded-xl border border-violet-3/40 bg-violet-3/10 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-2" />
              <p className="text-xs leading-relaxed text-violet-1/80">{loc.inferenceNote}</p>
            </div>
          )}

          {/* details table */}
          <div>
            <p className="mb-2 font-display text-[10px] uppercase tracking-widest text-ink/35">
              Details
            </p>
            <div className="divide-y divide-gold-3/10 rounded-xl border border-gold-3/15 overflow-hidden">
              {detailRows
                .filter((r) => r.value)
                .map((row) => (
                  <div key={row.label} className="flex items-center px-3 py-2">
                    <span className="w-32 shrink-0 text-xs text-ink/40">{row.label}</span>
                    <span className="text-xs text-ink/80">{row.value}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* characters */}
          {locChars.length > 0 && (
            <div>
              <p className="mb-2 font-display text-[10px] uppercase tracking-widest text-ink/35">
                Characters
              </p>
              <div className="flex flex-wrap gap-3">
                {locChars.map((c) => c && (
                  <div key={c.id} className="flex flex-col items-center gap-1.5">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold-3/30 text-xs font-display text-gold-2"
                      style={{ backgroundColor: "#d9a84e18" }}
                    >
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="max-w-[56px] text-center text-[10px] text-ink/60 leading-tight">
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* events */}
          {loc.events.length > 0 && (
            <div>
              <p className="mb-2 font-display text-[10px] uppercase tracking-widest text-ink/35">
                Important Events
              </p>
              <ul className="flex flex-col gap-1.5">
                {loc.events.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink/70">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-2/60" />
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* inference review (if pending suggestion for this location) */}
          {pendingSuggestion && (
            <div className="rounded-xl border border-violet-3/40 bg-violet-3/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-2" />
                <p className="text-xs font-medium text-violet-1">Review AI Suggestion</p>
              </div>
              <p className="text-xs text-ink/60 leading-relaxed mb-3">{pendingSuggestion.detail}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onSuggestionAction(pendingSuggestion.id, "approved")}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Approve
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-gold-3/40 bg-gold-3/10 px-3 py-1.5 text-xs text-gold-2 hover:bg-gold-3/20 transition-colors">
                  <SlidersHorizontal className="h-3 w-3" />
                  Adjust
                </button>
                <button
                  onClick={() => onSuggestionAction(pendingSuggestion.id, "dismissed")}
                  className="px-3 py-1.5 text-xs text-ink/40 hover:text-ink/70 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* footer */}
      <div className="shrink-0 border-t border-gold-3/20 px-5 py-3">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold-3/25 py-2 text-xs text-ink/50 transition-colors hover:border-gold-2/40 hover:text-gold-1">
          <FileText className="h-3.5 w-3.5" />
          View All Notes &amp; References
          <BookOpen className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Update banner ────────────────────────────────────────────────────────────
function UpdateBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-gold-3/20 bg-gold-3/10 px-5 py-2">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold-2" />
      <p className="flex-1 text-xs text-gold-1">
        Map updated from <span className="font-medium">Chapter 7</span>
        {" "}— Ruins of Elyria added, route through the Iron Mountains traced.
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-ink/40 hover:text-ink transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function LocationsMap() {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState(MAP_INFERENCE_SUGGESTIONS);
  const [showBanner, setShowBanner]   = useState(true);
  const [zoom, setZoom]               = useState(1);
  const [activeLayers, setActiveLayers] = useState<Set<LayerId>>(
    new Set(LAYERS.map((l) => l.id)),
  );
  const [visibleTypes, setVisibleTypes] = useState<Set<MapLocationType>>(
    new Set(ALL_TYPES),
  );

  const selectedLoc = selectedId
    ? MAP_LOCATIONS.find((l) => l.id === selectedId) ?? null
    : null;

  function toggleLayer(id: LayerId) {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleType(t: MapLocationType) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function handleSuggestionAction(id: string, action: "approved" | "dismissed") {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: action } : s)),
    );
  }

  function handleMarkerClick(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  const ZOOM_STEP = 0.2;
  function zoomIn()  { setZoom((z) => Math.min(z + ZOOM_STEP, 2.4)); }
  function zoomOut() { setZoom((z) => Math.max(z - ZOOM_STEP, 0.5)); }
  function resetView() { setZoom(1); setSelectedId(null); }

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gold-3/25 bg-bg-0"
      style={{ height: "calc(100vh - 220px)", minHeight: 520 }}>

      {/* ── update banner ── */}
      {showBanner && <UpdateBanner onDismiss={() => setShowBanner(false)} />}

      {/* ── three-column body ── */}
      <div className="flex" style={{ height: showBanner ? "calc(100% - 36px)" : "100%" }}>

        {/* LEFT: layer panel ─────────────────────────────────────────── */}
        <div className="w-44 shrink-0">
          <LayerPanel
            activeLayers={activeLayers}
            onToggleLayer={toggleLayer}
            visibleTypes={visibleTypes}
            onToggleType={toggleType}
            onResetView={resetView}
          />
        </div>

        {/* CENTRE: map canvas ─────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden">
          {/* pending review badge */}
          {pendingCount > 0 && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-violet-3/50 bg-bg-1/90 px-3 py-1.5 text-[11px] text-violet-2 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              {pendingCount} pending review
            </div>
          )}

          {/* zoom controls */}
          <ZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetView}
          />

          {/* SVG */}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full"
            style={{
              background: "radial-gradient(ellipse at 38% 42%, #0e1526 0%, #03040a 85%)",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 200ms ease",
            }}
          >
            <SvgDefs />
            <rect width={W} height={H} fill="url(#lm-grid)" />
            <TerrainDecoration />

            {/* routes (path layer) */}
            <RouteLines
              selectedId={selectedId}
              visible={activeLayers.has("paths")}
            />

            {/* markers */}
            {activeLayers.has("locations") && MAP_LOCATIONS.map((loc) => (
              <LocationMarker
                key={loc.id}
                loc={loc}
                selected={selectedId === loc.id}
                dimmed={
                  selectedId !== null &&
                  selectedId !== loc.id &&
                  !MAP_ROUTES.some(
                    (r) =>
                      (r.from === selectedId && r.to === loc.id) ||
                      (r.to   === selectedId && r.from === loc.id),
                  )
                }
                typeVisible={visibleTypes.has(loc.type)}
                onClick={() => handleMarkerClick(loc.id)}
              />
            ))}

            {/* labels */}
            {activeLayers.has("locations") && MAP_LOCATIONS.map((loc) => (
              <LocationLabel
                key={`lbl-${loc.id}`}
                loc={loc}
                selected={selectedId === loc.id}
                dimmed={
                  selectedId !== null &&
                  selectedId !== loc.id &&
                  !MAP_ROUTES.some(
                    (r) =>
                      (r.from === selectedId && r.to === loc.id) ||
                      (r.to   === selectedId && r.from === loc.id),
                  )
                }
                typeVisible={visibleTypes.has(loc.type)}
              />
            ))}

            {/* vignette */}
            <rect
              width={W} height={H}
              fill="url(#lm-vignette)"
              style={{ pointerEvents: "none" }}
            />

            {/* compass rose (top-left of map) */}
            <CompassRose />
          </svg>
        </div>

        {/* RIGHT: detail panel ─────────────────────────────────────────── */}
        {selectedLoc && (
          <div className="w-72 shrink-0">
            <DetailPanel
              loc={selectedLoc}
              suggestions={suggestions}
              onClose={() => setSelectedId(null)}
              onSuggestionAction={handleSuggestionAction}
            />
          </div>
        )}
      </div>
    </div>
  );
}
