"use client";

/**
 * WorldContext — derives world-building entities and relationships from the
 * manuscript via a single Gemini structured extraction call per chapter.
 *
 * Architecture
 * ────────────
 * • runDerivation() calls /api/extract-entities once per chapter, passing the
 *   chapter text + the entities already known in this project so the model can
 *   match rather than re-invent.
 * • Results are resolved against existing state:
 *     1. Exact canonical label match
 *     2. Alias match in either direction
 *     3. Fuzzy normalised-name match
 *   On a match → merge aliases/evidence into the existing node.
 *   Only insert when nothing matches.
 * • Re-running an unchanged chapter (same fingerprint) produces zero new rows.
 * • Character-kind entities from the extraction are also emitted as a custom
 *   event ("resonance:entitiesExtracted") for CharactersContext to consume —
 *   no second manuscript read.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  WorldEntity,
  WorldEntityKind,
  WorldEntityStatus,
  WorldEvidence,
  WorldRelationship,
  WorldRelationshipKind,
  WorldContradiction,
  WorldDeriveStatus,
  ProjectWorldState,
} from "@/data/world";
import type { ExtractedEntity, ExtractionResult } from "@/app/api/extract-entities/route";
import { syncPushBackground } from "@/lib/cloudSync";

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const WORLD_SK       = "resonance:world:v1";
const CHAPTERS_SK    = "resonance:chapters";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAPTER TYPE
   ═══════════════════════════════════════════════════════════════════════════ */

type RawChapter = {
  id:        string;
  projectId: string;
  title:     string;
  content:   string;
  order:     number;
  createdAt: string;
  updatedAt: string;
};

/* ═══════════════════════════════════════════════════════════════════════════
   HTML → PLAIN TEXT
   ═══════════════════════════════════════════════════════════════════════════ */

export function htmlToText(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.innerText ?? div.textContent ?? "").trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   FINGERPRINT
   ═══════════════════════════════════════════════════════════════════════════ */

export function manuscriptFingerprint(
  chapters: { id: string; content: string }[],
): string {
  const combined = chapters.map((c) => `${c.id}:${c.content}`).join("|");
  let h = 0;
  for (let i = 0; i < combined.length; i++) {
    h = (Math.imul(31, h) + combined.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

/* ═══════════════════════════════════════════════════════════════════════════
   NORMALISE LABEL — used for fuzzy matching
   ═══════════════════════════════════════════════════════════════════════════ */

/** Lowercase, strip titles + punctuation, collapse whitespace. */
function normLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\b(lord|lady|sir|dame|king|queen|prince|princess|captain|master|mistress|dr|mr|mrs|ms|the)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENTITY RESOLUTION — find the best matching existing entity
   ═══════════════════════════════════════════════════════════════════════════ */

type ExistingEntityIndex = {
  entities:  WorldEntity[];
  byLabel:   Map<string, WorldEntity>;   // normalised label → entity
  byAlias:   Map<string, WorldEntity>;   // normalised alias  → entity
};

function buildEntityIndex(entities: WorldEntity[]): ExistingEntityIndex {
  const byLabel = new Map<string, WorldEntity>();
  const byAlias = new Map<string, WorldEntity>();

  for (const e of entities) {
    byLabel.set(normLabel(e.label), e);
    const aliases: string[] = Array.isArray((e as unknown as { aliases?: string[] }).aliases)
      ? (e as unknown as { aliases: string[] }).aliases
      : [];
    for (const a of aliases) {
      byAlias.set(normLabel(a), e);
    }
  }
  return { entities, byLabel, byAlias };
}

/**
 * Resolve an extracted label against the existing index.
 * Returns the matching existing entity, or null if nothing matches.
 *
 * Resolution order:
 *   1. Exact normalised label match
 *   2. Alias match in either direction (extracted label == existing alias, or
 *      extracted aliases == existing label)
 *   3. Substring match on normalised forms (one fully contains the other)
 */
function resolveEntity(
  extracted: ExtractedEntity,
  index: ExistingEntityIndex,
): WorldEntity | null {
  const normExtracted = normLabel(extracted.label);

  // 1. exact canonical label
  const byLabelMatch = index.byLabel.get(normExtracted);
  if (byLabelMatch) return byLabelMatch;

  // 2. extracted label == existing alias
  const byAliasMatch = index.byAlias.get(normExtracted);
  if (byAliasMatch) return byAliasMatch;

  // 2b. extracted aliases == existing label or alias
  for (const alias of extracted.aliases) {
    const normAlias = normLabel(alias);
    const m = index.byLabel.get(normAlias) ?? index.byAlias.get(normAlias);
    if (m) return m;
  }

  // 3. substring (one normalised form contains the other)
  for (const [existingNorm, entity] of index.byLabel) {
    if (
      (normExtracted.length >= 4 && existingNorm.includes(normExtracted)) ||
      (existingNorm.length >= 4 && normExtracted.includes(existingNorm))
    ) {
      return entity;
    }
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAP RELATIONSHIP TYPE
   ═══════════════════════════════════════════════════════════════════════════ */

function mapRelKind(rel: string): WorldRelationshipKind {
  switch (rel) {
    case "located-in":   return "contains";    // inverted: target contains source
    case "member-of":    return "associated";
    case "travels-to":   return "associated";
    case "controls":     return "controls";
    case "occurred-at":  return "involves";
    case "owns":         return "associated";
    case "ally":         return "allied";
    case "rival":        return "opposed";
    case "family":       return "associated";
    case "knows":        return "associated";
    default:             return "other";
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAP ENTITY KIND (extracted → world kind)
   ═══════════════════════════════════════════════════════════════════════════ */

function mapEntityKind(kind: string): WorldEntityKind {
  switch (kind) {
    case "character":    return "character";
    case "organization": return "faction";
    case "location":     return "location";
    case "object":       return "object";
    case "event":        return "event";
    case "story-arc":    return "other";   // WorldEntityKind has no story-arc
    default:             return "other";
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MERGE EVIDENCE
   ═══════════════════════════════════════════════════════════════════════════ */

function mergeEvidence(
  existing: WorldEvidence[],
  incoming: WorldEvidence[],
): WorldEvidence[] {
  const merged = [...existing];
  for (const ev of incoming) {
    const dup = merged.find(
      (e) => e.chapterId === ev.chapterId && e.excerpt === ev.excerpt,
    );
    if (!dup && merged.length < 5) merged.push(ev);
  }
  return merged;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALL THE EXTRACTION API FOR ONE CHAPTER
   ═══════════════════════════════════════════════════════════════════════════ */

async function extractChapter(
  chapterId:     string,
  chapterTitle:  string,
  text:          string,
  knownEntities: Array<{ label: string; kind: string; aliases: string[] }>,
): Promise<ExtractionResult> {
  // Groq's free tier limits TOKENS PER MINUTE, so a multi-chapter pass reliably
  // trips a 429 partway through. The error carries "try again in 56.08s" — wait
  // that long and retry instead of dropping the chapter, which previously left
  // permanent holes in the world and stopped arcs from ever building.
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch("/api/extract-entities", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chapterId, chapterTitle, text, knownEntities }),
    });

    if (res.ok) return res.json() as Promise<ExtractionResult>;

    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    const detail = err.error ?? res.statusText;
    const isRateLimit = res.status === 503 || /429|rate.?limit/i.test(detail);

    if (isRateLimit && attempt < MAX_ATTEMPTS) {
      // Prefer the server's own "try again in Ns"; fall back to 20s * attempt.
      const m = /try again in ([\d.]+)\s*s/i.exec(detail);
      const waitMs = m ? Math.ceil(parseFloat(m[1]) * 1000) + 1_000 : attempt * 20_000;
      console.info(
        `[WorldContext] rate limited on "${chapterTitle}" — retrying in ${Math.round(waitMs / 1000)}s ` +
        `(attempt ${attempt}/${MAX_ATTEMPTS})`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    throw new Error(`Extraction failed for "${chapterTitle}": ${detail}`);
  }

  throw new Error(`Extraction failed for "${chapterTitle}": rate limit persisted after ${MAX_ATTEMPTS} attempts`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   APPLY ONE CHAPTER'S EXTRACTION RESULTS INTO PROJECT STATE
   Returns updated state + change counters.
   ═══════════════════════════════════════════════════════════════════════════ */

type ApplyResult = {
  state:        ProjectWorldState;
  newEntities:  number;
  updatedEntities: number;
  newRelationships: number;
};

function applyChapterExtraction(
  projectId:   string,
  state:       ProjectWorldState,
  chapterId:   string,
  chapterTitle: string,
  result:      ExtractionResult,
): ApplyResult {
  const now   = Date.now();
  let newEntities       = 0;
  let updatedEntities   = 0;
  let newRelationships  = 0;

  // Work on mutable copies
  const entities:      WorldEntity[]      = [...state.entities];
  const relationships: WorldRelationship[] = [...state.relationships];

  // Build a lookup map for the current entity set (label → id)
  const labelToId = new Map<string, string>();
  for (const e of entities) {
    labelToId.set(normLabel(e.label), e.id);
    const aliases: string[] = Array.isArray((e as unknown as { aliases?: string[] }).aliases)
      ? (e as unknown as { aliases: string[] }).aliases
      : [];
    for (const a of aliases) labelToId.set(normLabel(a), e.id);
  }

  const index = buildEntityIndex(entities);

  /* ── 1. Resolve / upsert entities ────────────────────────────────────── */
  for (const extracted of result.entities) {
    if (!extracted.label?.trim()) continue;

    const ev: WorldEvidence = {
      chapterId,
      chapterTitle,
      excerpt: (extracted.excerpt ?? "").slice(0, 200),
    };

    const existing = resolveEntity(extracted, index);

    if (existing) {
      if (existing.status === "dismissed") continue; // writer dismissed it

      const idx = entities.findIndex((e) => e.id === existing.id);
      if (idx < 0) continue;

      if (existing.locked) {
        // Only update evidence; don't touch any other field
        const mergedEv = mergeEvidence(existing.evidence, [ev]);
        const updatedChapters = [...new Set([...existing.chapterIds, chapterId])];
        entities[idx] = { ...existing, evidence: mergedEv, chapterIds: updatedChapters, updatedAt: now };
        updatedEntities++;
        continue;
      }

      // Merge: update evidence, kind (upgrade from other), aliases
      const mergedEv        = mergeEvidence(existing.evidence, [ev]);
      const updatedChapters = [...new Set([...existing.chapterIds, chapterId])];
      const mergedKind: WorldEntityKind =
        existing.kind === "other" ? mapEntityKind(extracted.kind) : existing.kind;

      // Merge in new aliases (stored in metadata-like field on entity — we add
      // to the index but WorldEntity has no aliases field; track via knownEntities)
      entities[idx] = {
        ...existing,
        kind:       mergedKind,
        evidence:   mergedEv,
        chapterIds: updatedChapters,
        lastDerivedAt: now,
        updatedAt:  now,
      };

      // Update index for relationship resolution
      labelToId.set(normLabel(existing.label), existing.id);
      for (const alias of extracted.aliases) {
        labelToId.set(normLabel(alias), existing.id);
      }

      updatedEntities++;
    } else {
      // New entity
      const worldKind     = mapEntityKind(extracted.kind);
      const confidence    = extracted.confidence ?? 1;
      const status: WorldEntityStatus =
        confidence >= 0.85 ? "confirmed" : "inferred";

      const inferenceNote =
        status === "inferred"
          ? `Resonance detected "${extracted.label}" from the chapter but could not confirm it with high confidence (${Math.round(confidence * 100)}%).`
          : undefined;

      const id = `${normLabel(extracted.label).replace(/\s+/g, "-").slice(0, 30)}-${uid()}`;

      const newEntity: WorldEntity = {
        id,
        projectId,
        label:        extracted.label,
        kind:         worldKind,
        status,
        description:  extracted.summary || undefined,
        subtype:      undefined,
        chapterIds:   [chapterId],
        evidence:     [ev],
        inferenceNote,
        lastDerivedAt: now,
        createdAt:    now,
        updatedAt:    now,
      };

      entities.push(newEntity);
      labelToId.set(normLabel(extracted.label), id);
      for (const alias of extracted.aliases) {
        labelToId.set(normLabel(alias), id);
      }

      // Rebuild index so subsequent entities in the same chapter can resolve
      index.byLabel.set(normLabel(extracted.label), newEntity);
      for (const alias of extracted.aliases) {
        index.byAlias.set(normLabel(alias), newEntity);
      }

      newEntities++;
    }
  }

  /* ── 2. Resolve / upsert relationships ───────────────────────────────── */

  // Build a key→id map of existing relationships for dedup
  const existingRelKeys = new Map<string, string>(); // "srcId::tgtId::kind" → rel.id
  for (const r of relationships) {
    existingRelKeys.set(`${r.sourceId}::${r.targetId}::${r.kind}`, r.id);
  }

  for (const rel of result.relationships) {
    const srcId = labelToId.get(normLabel(rel.sourceLabel));
    const tgtId = labelToId.get(normLabel(rel.targetLabel));
    if (!srcId || !tgtId || srcId === tgtId) continue;

    const kind    = mapRelKind(rel.relationship);
    const key     = `${srcId}::${tgtId}::${kind}`;
    const rev     = `${tgtId}::${srcId}::${kind}`;  // undirected dedup
    const ev: WorldEvidence = {
      chapterId,
      chapterTitle,
      excerpt: (rel.excerpt ?? "").slice(0, 200),
    };

    if (existingRelKeys.has(key) || existingRelKeys.has(rev)) {
      // Merge evidence into existing relationship
      const relId = existingRelKeys.get(key) ?? existingRelKeys.get(rev)!;
      const idx   = relationships.findIndex((r) => r.id === relId);
      if (idx >= 0 && !relationships[idx].locked) {
        relationships[idx] = {
          ...relationships[idx],
          evidence:  mergeEvidence(relationships[idx].evidence, [ev]),
          updatedAt: now,
        };
      }
      continue;
    }

    const srcEntity = entities.find((e) => e.id === srcId);
    const tgtEntity = entities.find((e) => e.id === tgtId);
    if (!srcEntity || !tgtEntity) continue;

    const confidence = rel.confidence ?? 1;
    const relStatus: WorldEntityStatus =
      srcEntity.status === "confirmed" && tgtEntity.status === "confirmed" && confidence >= 0.8
        ? "confirmed"
        : "inferred";

    const label = rel.relationship.replace(/-/g, " ");

    const newRel: WorldRelationship = {
      id:        `rel-${uid()}`,
      projectId,
      sourceId:  srcId,
      targetId:  tgtId,
      label,
      kind,
      status:    relStatus,
      evidence:  [ev],
      createdAt: now,
      updatedAt: now,
    };

    relationships.push(newRel);
    existingRelKeys.set(key, newRel.id);
    newRelationships++;
  }

  return {
    state:  { ...state, entities, relationships },
    newEntities,
    updatedEntities,
    newRelationships,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MARK UNSUPPORTED
   Entities not seen in ANY chapter of the latest run are marked unsupported.
   ═══════════════════════════════════════════════════════════════════════════ */

function markUnsupported(
  state: ProjectWorldState,
  seenIds: Set<string>,
): { state: ProjectWorldState; unsupportedMarked: number } {
  let unsupportedMarked = 0;
  const now = Date.now();
  const entities = state.entities.map((e) => {
    if (seenIds.has(e.id) || e.status === "dismissed") return e;
    if (e.status !== "unsupported") {
      unsupportedMarked++;
      return { ...e, status: "unsupported" as WorldEntityStatus, updatedAt: now };
    }
    return e;
  });
  return { state: { ...state, entities }, unsupportedMarked };
}

/* ═══════════════════════════════════════════════════════════════════════════
   WORLD STATE STORAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function loadAllWorldStates(): Record<string, ProjectWorldState> {
  return loadJSON<Record<string, ProjectWorldState>>(WORLD_SK, {});
}

function saveAllWorldStates(states: Record<string, ProjectWorldState>) {
  saveJSON(WORLD_SK, states);

  // Mirror entities + relationships to Supabase so the World Map survives a
  // cache clear and is visible to the rest of the team. Fire-and-forget:
  // derivation must never block on the network.
  const all = Object.values(states);
  syncPushBackground("app_world_entities",      all.flatMap((s) => s.entities));
  syncPushBackground("app_world_relationships", all.flatMap((s) => s.relationships));
}

function emptyState(projectId: string): ProjectWorldState {
  return { projectId, entities: [], relationships: [], contradictions: [] };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT INTERFACE
   ═══════════════════════════════════════════════════════════════════════════ */

export interface WorldContextValue {
  entities:            WorldEntity[];
  relationships:       WorldRelationship[];
  contradictions:      WorldContradiction[];
  hydrated:            boolean;
  deriveStatus:        WorldDeriveStatus;
  deriveChangeSummary: string;
  lastAnalysedAt:      number | undefined;

  confirmEntity:         (id: string) => void;
  dismissEntity:         (id: string) => void;
  lockEntity:            (id: string) => void;
  unlockEntity:          (id: string) => void;
  updateEntityNote:      (id: string, note: string) => void;
  removeUnsupportedEntity: (id: string) => void;

  confirmRelationship:   (id: string) => void;
  dismissRelationship:   (id: string) => void;

  resolveContradiction:  (id: string, resolution: "keep" | "replace") => void;

  runDerivation: () => void;
}

const WorldContext = createContext<WorldContextValue | null>(null);

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════════════════════ */

export function WorldProvider({
  children,
  activeProjectId,
}: {
  children: React.ReactNode;
  activeProjectId?: string;
}) {
  // Start empty so the server render and first client render match; the real
  // state is loaded from localStorage in the mount effect below. Reading
  // localStorage in the initializer caused a hydration mismatch.
  const [allStates, setAllStates] = useState<Record<string, ProjectWorldState>>({});
  const [hydrated,            setHydrated]            = useState(false);
  const [deriveStatus,        setDeriveStatus]        = useState<WorldDeriveStatus>("idle");
  const [deriveChangeSummary, setDeriveChangeSummary] = useState("");

  // Load persisted state after mount, then flag hydrated (setState only via the
  // timeout callback so the no-synchronous-setState-in-effect rule holds).
  useEffect(() => {
    setAllStates(loadAllWorldStates());
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  const projectState = useMemo(
    () =>
      activeProjectId
        ? (allStates[activeProjectId] ?? emptyState(activeProjectId))
        : emptyState(""),
    [allStates, activeProjectId],
  );

  const entities = useMemo(
    () => projectState.entities.filter((e) => e.status !== "dismissed"),
    [projectState],
  );
  const relationships = useMemo(
    () => projectState.relationships.filter((r) => r.status !== "dismissed"),
    [projectState],
  );
  const contradictions = useMemo(
    () => projectState.contradictions.filter((c) => !c.resolvedAt),
    [projectState],
  );

  function commitState(next: ProjectWorldState) {
    const updated = { ...allStates, [next.projectId]: next };
    setAllStates(updated);
    saveAllWorldStates(updated);
  }

  /* ── Derivation ──────────────────────────────────────────────────────── */

  const runDerivation = useCallback(() => {
    if (!activeProjectId) return;
    setDeriveStatus("running");
    setDeriveChangeSummary("");

    // Load chapters inside the callback so we always read the latest state
    const chapters = loadJSON<RawChapter[]>(CHAPTERS_SK, [])
      .filter((c) => c.projectId === activeProjectId)
      .sort((a, b) => a.order - b.order)
      .filter((c) => c.content?.trim());

    if (chapters.length === 0) {
      setDeriveStatus("done");
      setDeriveChangeSummary("No written content yet.");
      return;
    }

    const existing     = allStates[activeProjectId] ?? emptyState(activeProjectId);
    const fp           = manuscriptFingerprint(chapters);

    if (fp === existing.lastFingerprint && existing.entities.length > 0) {
      setDeriveStatus("done");
      setDeriveChangeSummary("No changes since last analysis.");
      return;
    }

    // Kick off async extraction
    (async () => {
      let state = existing;
      let totalNew      = 0;
      let totalUpdated  = 0;
      let totalRels     = 0;
      const seenEntityIds = new Set<string>();

      // Pass known entities to each subsequent chapter call so the model can
      // match against them — grows as extraction proceeds
      const knownEntities = () =>
        state.entities
          .filter((e) => e.status !== "dismissed")
          .map((e) => ({
            label:   e.label,
            kind:    e.kind,
            aliases: [] as string[],
          }));

      // Per-chapter cache. A single manuscript-wide fingerprint meant editing
      // ONE chapter re-extracted ALL of them, so an N-chapter project cost N
      // API calls on every save and blew straight through the rate limit.
      // Only chapters whose text actually changed are sent to the model.
      const prevHashes: Record<string, string> = existing.chapterHashes ?? {};
      const nextHashes: Record<string, string> = { ...prevHashes };
      let skipped = 0;

      for (const ch of chapters) {
        const text = htmlToText(ch.content);
        if (!text.trim()) continue;

        const hash = manuscriptFingerprint([{ ...ch, content: text }]);
        if (prevHashes[ch.id] === hash && existing.entities.length > 0) {
          skipped++;
          continue;
        }
        nextHashes[ch.id] = hash;

        try {
          const result = await extractChapter(
            ch.id,
            ch.title,
            text,
            knownEntities(),
          );

          const applied = applyChapterExtraction(
            activeProjectId,
            state,
            ch.id,
            ch.title,
            result,
          );

          state            = applied.state;
          totalNew        += applied.newEntities;
          totalUpdated    += applied.updatedEntities;
          totalRels       += applied.newRelationships;

          // Track which entity ids were seen/touched in this run
          for (const e of state.entities) {
            if (e.chapterIds.includes(ch.id)) seenEntityIds.add(e.id);
          }

          // Emit character entities + relationships from this chapter for
          // CharactersContext to consume — avoids a second manuscript read.
          // Relationships are needed so character.relationships stays in sync
          // with the world graph edges.
          const charEntities = result.entities.filter((e) => e.kind === "character");
          // Include relationships where at least one end is a character entity
          const charLabelsNorm = new Set(
            charEntities.map((e) => e.label.toLowerCase()),
          );
          const charRelationships = result.relationships.filter(
            (r) =>
              charLabelsNorm.has(r.sourceLabel.toLowerCase()) ||
              charLabelsNorm.has(r.targetLabel.toLowerCase()),
          );
          if (charEntities.length > 0) {
            window.dispatchEvent(
              new CustomEvent("resonance:entitiesExtracted", {
                detail: {
                  projectId:    activeProjectId,
                  chapterId:    ch.id,
                  chapterTitle: ch.title,
                  entities:     charEntities,
                  relationships: charRelationships,
                },
              }),
            );
          }
        } catch (err) {
          console.error("[WorldContext] extraction error:", err);
          // Continue with other chapters even if one fails
        }
      }

      // Mark entities whose supporting text is gone as unsupported
      const { state: finalState, unsupportedMarked } = markUnsupported(
        state,
        seenEntityIds,
      );

      const withFingerprint: ProjectWorldState = {
        ...finalState,
        lastFingerprint: fp,
        chapterHashes:   nextHashes,
        lastAnalysedAt:  Date.now(),
      };
      if (skipped > 0) {
        console.info(`[WorldContext] reused ${skipped} unchanged chapter(s) — no API call`);
      }

      commitState(withFingerprint);

      const parts: string[] = [];
      if (totalNew > 0)          parts.push(`${totalNew} new`);
      if (totalUpdated > 0)      parts.push(`${totalUpdated} updated`);
      if (totalRels > 0)         parts.push(`${totalRels} new connections`);
      if (unsupportedMarked > 0) parts.push(`${unsupportedMarked} no longer supported`);
      setDeriveChangeSummary(parts.length ? parts.join(", ") + "." : "No new changes.");
      setDeriveStatus("done");
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, allStates]);

  /* ── Entity actions ──────────────────────────────────────────────────── */

  const updateEntity = useCallback((id: string, updates: Partial<WorldEntity>) => {
    if (!activeProjectId) return;
    const state = allStates[activeProjectId] ?? emptyState(activeProjectId);
    commitState({
      ...state,
      entities: state.entities.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, allStates]);

  const confirmEntity = useCallback((id: string) => {
    updateEntity(id, { status: "confirmed", inferenceNote: undefined });
  }, [updateEntity]);

  const dismissEntity = useCallback((id: string) => {
    updateEntity(id, { status: "dismissed" });
  }, [updateEntity]);

  const lockEntity = useCallback((id: string) => {
    updateEntity(id, { locked: true });
  }, [updateEntity]);

  const unlockEntity = useCallback((id: string) => {
    updateEntity(id, { locked: false });
  }, [updateEntity]);

  const updateEntityNote = useCallback((id: string, note: string) => {
    updateEntity(id, { writerNote: note, locked: true });
  }, [updateEntity]);

  const removeUnsupportedEntity = useCallback((id: string) => {
    if (!activeProjectId) return;
    const state = allStates[activeProjectId] ?? emptyState(activeProjectId);
    commitState({
      ...state,
      entities:      state.entities.filter((e) => e.id !== id),
      relationships: state.relationships.filter(
        (r) => r.sourceId !== id && r.targetId !== id,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, allStates]);

  /* ── Relationship actions ────────────────────────────────────────────── */

  const updateRelationship = useCallback((id: string, updates: Partial<WorldRelationship>) => {
    if (!activeProjectId) return;
    const state = allStates[activeProjectId] ?? emptyState(activeProjectId);
    commitState({
      ...state,
      relationships: state.relationships.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, allStates]);

  const confirmRelationship = useCallback((id: string) => {
    updateRelationship(id, { status: "confirmed" });
  }, [updateRelationship]);

  const dismissRelationship = useCallback((id: string) => {
    updateRelationship(id, { status: "dismissed" });
  }, [updateRelationship]);

  /* ── Contradiction resolution ────────────────────────────────────────── */

  const resolveContradiction = useCallback((id: string, resolution: "keep" | "replace") => {
    if (!activeProjectId) return;
    const state = allStates[activeProjectId] ?? emptyState(activeProjectId);
    commitState({
      ...state,
      contradictions: state.contradictions.map((c) =>
        c.id === id ? { ...c, resolution, resolvedAt: Date.now() } : c,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, allStates]);

  /* ── Auto-scan when chapters change ─────────────────────────────────── */

  const runDerivationRef = useRef(runDerivation);
  useEffect(() => { runDerivationRef.current = runDerivation; }, [runDerivation]);

  useEffect(() => {
    if (!activeProjectId) return;
    function onUpdate() { runDerivationRef.current(); }
    window.addEventListener("resonance:chaptersUpdated", onUpdate);
    return () => window.removeEventListener("resonance:chaptersUpdated", onUpdate);
  }, [activeProjectId]);

  /* ── Context value ───────────────────────────────────────────────────── */

  const value = useMemo<WorldContextValue>(() => ({
    entities,
    relationships,
    contradictions,
    hydrated,
    deriveStatus,
    deriveChangeSummary,
    lastAnalysedAt: projectState.lastAnalysedAt,
    confirmEntity,
    dismissEntity,
    lockEntity,
    unlockEntity,
    updateEntityNote,
    removeUnsupportedEntity,
    confirmRelationship,
    dismissRelationship,
    resolveContradiction,
    runDerivation,
  }), [
    entities, relationships, contradictions, hydrated, deriveStatus,
    deriveChangeSummary, projectState.lastAnalysedAt,
    confirmEntity, dismissEntity, lockEntity, unlockEntity,
    updateEntityNote, removeUnsupportedEntity,
    confirmRelationship, dismissRelationship,
    resolveContradiction, runDerivation,
  ]);

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be inside <WorldProvider>");
  return ctx;
}
