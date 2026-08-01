/**
 * World data types — project-scoped, no seed data.
 * All persistent state lives in WorldContext / localStorage.
 * This file exports only type definitions.
 */

/* ── Entity status ──────────────────────────────────────────────────────── */

export type WorldEntityStatus =
  | "confirmed"   // manuscript directly supports it; writer has not contradicted it
  | "inferred"    // Resonance thinks it may be present from context; writer hasn't confirmed
  | "dismissed"   // writer dismissed this inference; never re-suggest unless text changes
  | "unsupported" // supporting text was deleted; entry stands but is flagged;

/* ── Entity types ───────────────────────────────────────────────────────── */

export type WorldEntityKind =
  | "location"
  | "faction"
  | "character"
  | "event"
  | "object"
  | "other";

/* ── Evidence ───────────────────────────────────────────────────────────── */

export type WorldEvidence = {
  chapterId: string;
  chapterTitle: string;
  excerpt: string;
};

/* ── World entity ───────────────────────────────────────────────────────── */

export type WorldEntity = {
  id: string;
  projectId: string;
  label: string;               // canonical display name
  kind: WorldEntityKind;
  status: WorldEntityStatus;
  /** free-form sub-type label derived from text e.g. "Forest", "Ancient City" */
  subtype?: string;
  /** short description derived from text */
  description?: string;
  /** which chapters mention this entity */
  chapterIds: string[];
  /** primary supporting evidence */
  evidence: WorldEvidence[];
  /** if inferred, why Resonance thinks it exists */
  inferenceNote?: string;
  /** writer locked this entry — derivation must not overwrite it */
  locked?: boolean;
  /** set when writer hand-edits any field */
  writerNote?: string;
  /** ISO timestamp of last derivation pass that touched this */
  lastDerivedAt: number;
  createdAt: number;
  updatedAt: number;
};

/* ── Relationship ────────────────────────────────────────────────────────── */

export type WorldRelationshipKind =
  | "contains"        // A is inside / part of B
  | "connected"       // A and B are spatially connected (road, path, etc.)
  | "associated"      // character / faction present at / operating in a place
  | "allied"
  | "opposed"
  | "controls"
  | "caused"
  | "involves"
  | "other";

export type WorldRelationship = {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  label: string;
  kind: WorldRelationshipKind;
  status: WorldEntityStatus;
  evidence: WorldEvidence[];
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
};

/* ── Contradiction flag ──────────────────────────────────────────────────── */

export type WorldContradiction = {
  id: string;
  projectId: string;
  entityId: string;
  field: string;
  existingValue: string;
  newValue: string;
  chapterId: string;
  chapterTitle: string;
  excerpt: string;
  resolvedAt?: number;
  resolution?: "keep" | "replace";
  createdAt: number;
};

/* ── Derivation summary ──────────────────────────────────────────────────── */

export type WorldDeriveStatus = "idle" | "running" | "done";

export type WorldDeriveChangeSummary = {
  newEntities: number;
  updatedEntities: number;
  newRelationships: number;
  newContradictions: number;
  unsupportedMarked: number;
};

/* ── Stored world state (one per project) ────────────────────────────────── */

export type ProjectWorldState = {
  projectId: string;
  entities: WorldEntity[];
  relationships: WorldRelationship[];
  contradictions: WorldContradiction[];
  /** fingerprint of the manuscript when last analysed */
  lastFingerprint?: string;
  /**
   * Per-chapter content hashes from the last successful derivation.
   * Lets runDerivation() re-extract ONLY the chapters whose text changed,
   * instead of every chapter on every save.
   */
  chapterHashes?: Record<string, string>;
  lastAnalysedAt?: number;
};

/* ── Spatial layout (node positions on the graph — persisted) ────────────── */

export type NodePosition = {
  id: string;
  x: number;
  y: number;
};

/* ── Edge style map ──────────────────────────────────────────────────────── */

export const RELATIONSHIP_STYLES: Record<
  WorldRelationshipKind,
  { stroke: string; dash?: string; label: string }
> = {
  contains:   { stroke: "#38bdf8",  label: "Contains / Part of" },
  connected:  { stroke: "#8a6a2f",  label: "Connected / Route" },
  associated: { stroke: "#d9a84e",  label: "Associated with / Present at", dash: "4 3" },
  allied:     { stroke: "#34d399",  label: "Allied / Loyal" },
  opposed:    { stroke: "#f87171",  label: "Opposed / Enemy" },
  controls:   { stroke: "#a78bfa",  dash: "2 3", label: "Controls / Influences" },
  caused:     { stroke: "#fb923c",  dash: "6 4", label: "Caused / Led to" },
  involves:   { stroke: "#6b7280",  dash: "4 4", label: "Involves / Occurred at" },
  other:      { stroke: "#6b7280",  dash: "4 4", label: "Other" },
};

/* ── Entity kind visual config ───────────────────────────────────────────── */

export const ENTITY_KIND_STYLES: Record<
  WorldEntityKind,
  { color: string; bg: string; label: string }
> = {
  location:  { color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  label: "Location"  },
  faction:   { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "Faction"   },
  character: { color: "#d9a84e", bg: "rgba(217,168,78,0.12)",  label: "Character" },
  event:     { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "Event"     },
  object:    { color: "#9ca3af", bg: "rgba(156,163,175,0.12)", label: "Object"    },
  other:     { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "Other"     },
};
