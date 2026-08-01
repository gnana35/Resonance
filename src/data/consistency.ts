/**
 * Consistency system data types.
 *
 * CanonFact    — a single established truth for a project, keyed by
 *                (projectId, subject, attribute). Facts are never silently
 *                overwritten; superseding creates a new record.
 *
 * Discrepancy  — a detected disagreement between the manuscript and a design
 *                on the same (subject, attribute). Identified by a fingerprint
 *                derived from both sides' values so the same difference is
 *                never raised twice.
 */

/* ── Canon ──────────────────────────────────────────────────────────────── */

export type CanonOrigin = "manuscript" | "design" | "writer";

export type CanonFact = {
  id: string;
  projectId: string;
  /** The entity or thing the fact is about, normalised to a slug */
  subject: string;
  /** What aspect of the subject is established */
  attribute: string;
  /** The canonical value */
  value: string;
  /** Where this fact originated */
  origin: CanonOrigin;
  /** Chapter id (manuscript) or Design id (design) or "writer" */
  sourceRef: string;
  establishedAt: number;
  /** Points to the fact this supersedes (null = original) */
  supersededFactId: string | null;
};

/* ── Discrepancy ────────────────────────────────────────────────────────── */

export type DiscrepancyKind = "contradiction" | "addition" | "omission";

export type DiscrepancyStatus = "pending" | "approved" | "rejected" | "stale";

export type Discrepancy = {
  id: string;
  projectId: string;
  kind: DiscrepancyKind;
  subject: string;
  attribute: string;

  /** The value the manuscript establishes (empty string if none) */
  manuscriptValue: string;
  /** Chapter id that produced the manuscript value (empty string if none) */
  manuscriptRef: string;

  /** The value the design depicts (empty string if none) */
  designValue: string;
  /** Design id that produced the design value (empty string if none) */
  designRef: string;

  /**
   * Fingerprint = hash(subject + attribute + manuscriptValue + designValue).
   * A decided discrepancy suppresses its fingerprint so the same disagreement
   * is never raised again while both sides remain unchanged.
   */
  fingerprint: string;

  status: DiscrepancyStatus;

  /** "writer" for now (only writers decide) */
  decidedBy: string | null;
  decidedAt: number | null;
  decisionNote: string | null;

  /**
   * When a previously approved visual is later contradicted by the manuscript,
   * the new discrepancy links back here so the chain of decisions is
   * followable.
   */
  supersededDecisionId: string | null;

  createdAt: number;
  updatedAt: number;
};

/* ── Stored state (one per project) ────────────────────────────────────── */

export type ProjectConsistencyState = {
  projectId: string;
  facts: CanonFact[];
  discrepancies: Discrepancy[];
};

/* ── Designer revision request ──────────────────────────────────────────── */

/**
 * Written by the rejection path so the designer can see what needs changing.
 * Stored as part of the Discrepancy (decisionNote carries the writer's note,
 * status = "rejected" is the trigger). This type documents the shape used
 * in the notification card rendering.
 */
export type RevisionRequest = {
  discrepancyId: string;
  writerNote: string | null;
  manuscriptRef: string;
  designRef: string;
  decidedAt: number;
};

/* ── Summary returned by the extractor ─────────────────────────────────── */

export type ExtractedFact = {
  subject: string;
  attribute: string;
  value: string;
  sourceRef: string;
};
