/**
 * Character data types — project-scoped, no seed data.
 * Characters belong to exactly one project (projectId).
 * All persistent IDs are generated at creation time; never derived from names.
 */

/* ── Derived evidence ──────────────────────────────────────────────────── */

/** One passage from one chapter that backs a derived field's value. */
export type Evidence = {
  chapterId: string;
  chapterTitle: string;
  excerpt: string;
};

/* ── Per-field lock ────────────────────────────────────────────────────── */

/**
 * Every field that can be derived is listed here.
 * When locked = true the writer has hand-edited it; derivation must not overwrite it.
 */
export type LockableField =
  | "name"
  | "role"
  | "description"
  | "traits"
  | "age"
  | "occupation"
  | "origin"
  | "affiliation"
  | "status"
  | "bio"
  | "roleInStory"
  | "keyTraits"
  | "arcSummary"
  | "arcLabels";

export type FieldLocks = Partial<Record<LockableField, true>>;

/* ── Relationships ─────────────────────────────────────────────────────── */

export type CharacterRelationship = {
  characterId: string;
  relation: string;
  blurb: string;
  /** true when this character is a draft — shows "Proposed" in the UI */
  proposed?: boolean;
};

/* ── Arc ───────────────────────────────────────────────────────────────── */

/** One point on the arc chart — one per chapter */
export type ArcPoint = {
  chapterId: string;
  chapterTitle: string;
  value: number; // 1–10
  evidence?: string;
  locked?: boolean;
};

/* ── Story-fit evaluation (for Draft characters) ───────────────────────── */

export type FitSection = {
  verdict: string;
  score: number; // 1–10
};

export type FitPoint = {
  text: string;
  /** ID of the chapter or character this point draws on */
  sourceId?: string;
  sourceTitle?: string;
  sourceKind?: "chapter" | "character";
};

export type FitEvaluation = {
  id: string;
  generatedAt: number;
  /** The content fingerprint the evaluation was run against */
  manuscriptFingerprint: string;
  isStale: boolean;
  verdict: FitSection;
  whyFit: FitPoint[];
  problems: FitPoint[];
  suggestions: FitPoint[];
};

/* ── Character ─────────────────────────────────────────────────────────── */

export type Character = {
  id: string;
  projectId: string;

  name: string;
  role: string;
  description: string;
  traits: string[];

  /** Established = derived from manuscript; Draft = writer-defined */
  isDraft: boolean;

  avatarColor?: number;
  age?: number;
  occupation?: string;
  origin?: string;
  affiliation?: string;
  status?: string;
  bio?: string;
  roleInStory?: string;
  keyTraits?: string[];
  arcSummary?: string;
  arcLabels?: [string, string];

  /** Established: per-chapter arc points (one per chapter in outline order) */
  arcPoints?: ArcPoint[];

  relationships?: CharacterRelationship[];
  notes?: string;

  /** Which fields the writer has hand-edited — derivation must not touch these */
  lockedFields?: FieldLocks;

  /** Evidence for derived fields */
  evidence?: Partial<Record<LockableField, Evidence>>;

  /** Draft only: latest fit evaluation */
  fitEvaluation?: FitEvaluation;

  /**
   * Set after a scan detects the draft appears in the manuscript.
   * A promotion prompt will be shown until the writer decides.
   */
  promotionPending?: boolean;

  /** Timestamp of last derivation run */
  lastDerivedAt?: number;

  createdAt: number;
  updatedAt: number;
};
