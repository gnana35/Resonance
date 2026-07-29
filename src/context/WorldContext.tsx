"use client";

/**
 * WorldContext — derives world-building entities and relationships from manuscript text.
 *
 * Architecture mirrors CharactersContext:
 *  - Reads chapters from localStorage (resonance:chapters) filtered by active project
 *  - Derives entities + relationships purely from text
 *  - Persists per-project world state to localStorage
 *  - Exposes confirm / dismiss / lock / unlock / resolveContradiction actions
 *  - Fires on chapter save (via "resonance:chaptersUpdated" event) and on explicit refresh
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
  WorldDeriveChangeSummary,
  ProjectWorldState,
} from "@/data/world";

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const WORLD_SK = "resonance:world:v1";
const CHAPTERS_SK = "resonance:chapters";
const ACTIVE_PROJ_SK = "resonance:activeProject";

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
   CHAPTER TYPE (mirrors writer page)
   ═══════════════════════════════════════════════════════════════════════════ */

type RawChapter = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

/* ═══════════════════════════════════════════════════════════════════════════
   HTML → PLAIN TEXT
   ═══════════════════════════════════════════════════════════════════════════ */

function htmlToText(html: string): string {
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

function manuscriptFingerprint(chapters: { id: string; content: string }[]): string {
  const combined = chapters.map((c) => `${c.id}:${c.content}`).join("|");
  let h = 0;
  for (let i = 0; i < combined.length; i++) {
    h = (Math.imul(31, h) + combined.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXCERPT HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

function findExcerpt(name: string, text: string, maxLen = 140): string {
  const idx = text.toLowerCase().indexOf(name.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + 90);
  let excerpt = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) excerpt = "…" + excerpt;
  if (end < text.length) excerpt += "…";
  return excerpt.slice(0, maxLen);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENTITY EXTRACTION PATTERNS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Location indicators — phrases that precede or follow a proper noun to
 * indicate it's a place.
 */
const LOCATION_BEFORE = [
  "in", "at", "to", "toward", "towards", "from", "through", "across", "near",
  "outside", "inside", "within", "beyond", "north of", "south of", "east of",
  "west of", "arrived in", "reached", "entered", "left", "city of", "town of",
  "village of", "ruins of", "forest of", "mountains of", "castle of", "lands of",
  "district of", "quarter of", "region of", "capital of", "heart of",
];
const LOCATION_AFTER = [
  "forest", "city", "town", "village", "mountain", "mountains", "river",
  "sea", "ocean", "desert", "wasteland", "ruins", "castle", "tower", "keep",
  "fortress", "valley", "plains", "pass", "gate", "district", "quarter",
  "realm", "lands", "border", "bay", "road", "path", "trail",
];

/**
 * Faction indicators — noun phrases that precede a proper noun to indicate
 * it's a group / organisation.
 */
const FACTION_BEFORE = [
  "the order of", "guild of", "house of", "clan of", "tribe of", "order of",
  "faction of", "league of", "brotherhood of", "sisterhood of", "council of",
  "court of", "army of", "soldiers of", "followers of", "cult of",
];
const FACTION_AFTER = [
  "order", "guild", "clan", "tribe", "council", "army", "faction", "alliance",
  "brotherhood", "sisterhood", "court", "legion", "guard", "ward",
];

/**
 * Event indicators.
 */
const EVENT_BEFORE = [
  "the battle of", "the fall of", "the rise of", "the siege of", "the war of",
  "the treaty of", "the founding of", "the destruction of", "the arrival of",
  "the death of", "the birth of", "the discovery of",
];
const EVENT_AFTER = [
  "battle", "war", "siege", "treaty", "accord", "pact", "rebellion", "uprising",
  "massacre", "disaster", "cataclysm", "catastrophe", "event", "incident",
];

/**
 * Object / relic indicators.
 */
const OBJECT_AFTER = [
  "sword", "blade", "staff", "orb", "relic", "artifact", "amulet", "ring",
  "crown", "tome", "scroll", "key", "stone", "crystal", "gem", "shard",
  "seal", "sigil", "core", "heart", "eye",
];

/* ─── Proper-noun token (1-3 capitalised words) ─────────────────────────── */
const PROPER_NOUN_RE =
  /(?<![.!?]\s)(?<!\bthe\s)(?<!\ba\s)(?<!\ban\s)\b([A-Z][a-z]{2,})(?:\s+[A-Z][a-z]{2,}){0,2}\b/g;

const SKIP_WORDS = new Set([
  "The","She","He","They","It","We","You","I","Then","When","Now",
  "But","And","Or","If","As","At","By","Do","For","From","In","Into",
  "Of","On","So","To","Up","Was","With","Could","Would","Should",
  "Her","His","Its","Our","Their","That","This","These","Those",
  "After","Before","During","While","Upon","Through","Between",
  "Said","Told","Asked","Called","Came","Went","Saw","Knew","Felt",
  "Chapter","Part","Section","Book","Act",
]);

/* ─── Slug helper ──────────────────────────────────────────────────────── */
function toSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ─── Context window extraction ─────────────────────────────────────────── */
function wordsAround(text: string, idx: number, before = 4, after = 4): string {
  const preText  = text.slice(Math.max(0, idx - 60), idx).toLowerCase();
  const postText = text.slice(idx, Math.min(text.length, idx + 60)).toLowerCase();
  return preText + " " + postText;
}

/* ─── Classify a proper noun token ──────────────────────────────────────── */
type RawEntity = {
  label: string;
  kind: WorldEntityKind;
  subtype?: string;
  chapterId: string;
  chapterTitle: string;
  excerpt: string;
};

function classifyNoun(
  noun: string,
  idx: number,
  text: string,
  chapterId: string,
  chapterTitle: string,
): RawEntity | null {
  const ctx = wordsAround(text, idx);
  const nounLower = noun.toLowerCase();

  // Check for location indicators
  for (const before of LOCATION_BEFORE) {
    if (ctx.includes(before + " " + nounLower) || ctx.includes(before + " the " + nounLower)) {
      const subtype = LOCATION_AFTER.find((a) => ctx.includes(nounLower + " " + a));
      return { label: noun, kind: "location", subtype, chapterId, chapterTitle, excerpt: findExcerpt(noun, text) };
    }
  }
  const subtypeLoc = LOCATION_AFTER.find((a) => ctx.includes(nounLower + " " + a));
  if (subtypeLoc) {
    return { label: noun, kind: "location", subtype: subtypeLoc, chapterId, chapterTitle, excerpt: findExcerpt(noun, text) };
  }

  // Check for faction indicators
  for (const before of FACTION_BEFORE) {
    if (ctx.includes(before + " " + nounLower)) {
      return { label: noun, kind: "faction", chapterId, chapterTitle, excerpt: findExcerpt(noun, text) };
    }
  }
  const subtypeFac = FACTION_AFTER.find((a) => ctx.includes("the " + nounLower + " " + a) || ctx.includes(nounLower + " " + a));
  if (subtypeFac) {
    return { label: noun, kind: "faction", subtype: subtypeFac, chapterId, chapterTitle, excerpt: findExcerpt(noun, text) };
  }

  // Check for event indicators
  for (const before of EVENT_BEFORE) {
    if (ctx.includes(before + " " + nounLower)) {
      return { label: noun, kind: "event", chapterId, chapterTitle, excerpt: findExcerpt(noun, text) };
    }
  }
  const subtypeEvt = EVENT_AFTER.find((a) => ctx.includes("the " + nounLower + " " + a) || ctx.includes(nounLower + " " + a));
  if (subtypeEvt) {
    return { label: noun, kind: "event", subtype: subtypeEvt, chapterId, chapterTitle, excerpt: findExcerpt(noun, text) };
  }

  // Check for objects
  const subtypeObj = OBJECT_AFTER.find((a) => ctx.includes(nounLower + " " + a) || ctx.includes("the " + nounLower));
  if (subtypeObj) {
    return { label: noun, kind: "object", subtype: subtypeObj, chapterId, chapterTitle, excerpt: findExcerpt(noun, text) };
  }

  // No strong signal — return as "other" for inferred treatment
  return { label: noun, kind: "other", chapterId, chapterTitle, excerpt: findExcerpt(noun, text) };
}

/* ─── Relationship extraction from sentence patterns ────────────────────── */

type RawRelationship = {
  sourceLabel: string;
  targetLabel: string;
  label: string;
  kind: WorldRelationshipKind;
  chapterId: string;
  chapterTitle: string;
  excerpt: string;
};

/** Extracts raw relationships from a sentence and a set of known entity labels. */
function extractRelationships(
  sentence: string,
  entityLabels: Set<string>,
  chapterId: string,
  chapterTitle: string,
): RawRelationship[] {
  const results: RawRelationship[] = [];
  const labels = [...entityLabels];

  for (const src of labels) {
    for (const tgt of labels) {
      if (src === tgt) continue;
      const s = sentence.toLowerCase();
      const srcL = src.toLowerCase();
      const tgtL = tgt.toLowerCase();
      if (!s.includes(srcL) || !s.includes(tgtL)) continue;

      // Containment
      if (
        s.match(new RegExp(`${srcL}[^.]*inside[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*within[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*part of[^.]*${tgtL}`))
      ) {
        results.push({ sourceLabel: src, targetLabel: tgt, label: "within", kind: "contains", chapterId, chapterTitle, excerpt: sentence.slice(0, 140) });
        continue;
      }

      // Control
      if (
        s.match(new RegExp(`${srcL}[^.]*control[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*rule[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*command[^.]*${tgtL}`))
      ) {
        results.push({ sourceLabel: src, targetLabel: tgt, label: "controls", kind: "controls", chapterId, chapterTitle, excerpt: sentence.slice(0, 140) });
        continue;
      }

      // Opposition
      if (
        s.match(new RegExp(`${srcL}[^.]*against[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*fight[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*enemy[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*oppos[^.]*${tgtL}`))
      ) {
        results.push({ sourceLabel: src, targetLabel: tgt, label: "opposed to", kind: "opposed", chapterId, chapterTitle, excerpt: sentence.slice(0, 140) });
        continue;
      }

      // Alliance
      if (
        s.match(new RegExp(`${srcL}[^.]*allied[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*ally[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*joined[^.]*${tgtL}`))
      ) {
        results.push({ sourceLabel: src, targetLabel: tgt, label: "allied with", kind: "allied", chapterId, chapterTitle, excerpt: sentence.slice(0, 140) });
        continue;
      }

      // Physical co-presence / travel (both appear in sentence with spatial verbs)
      if (
        s.match(new RegExp(`${srcL}[^.]*(?:walked|rode|fled|arrived|traveled|crossed|entered|left|approached|reached|stood in|was in)[^.]*${tgtL}`))
      ) {
        results.push({ sourceLabel: src, targetLabel: tgt, label: "present at", kind: "associated", chapterId, chapterTitle, excerpt: sentence.slice(0, 140) });
        continue;
      }

      // Causal
      if (
        s.match(new RegExp(`${srcL}[^.]*caused[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*led to[^.]*${tgtL}`)) ||
        s.match(new RegExp(`${srcL}[^.]*triggered[^.]*${tgtL}`))
      ) {
        results.push({ sourceLabel: src, targetLabel: tgt, label: "caused", kind: "caused", chapterId, chapterTitle, excerpt: sentence.slice(0, 140) });
      }
    }
  }
  return results;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DERIVATION ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

type DerivationInput = {
  projectId: string;
  chapters: Array<{ id: string; title: string; content: string; order: number }>;
  existingState: ProjectWorldState;
};

type DerivationOutput = {
  state: ProjectWorldState;
  summary: WorldDeriveChangeSummary;
};

function runWorldDerivation(input: DerivationInput): DerivationOutput {
  const { projectId, chapters, existingState } = input;
  const now = Date.now();

  // Gather all chapter texts
  const chapterTexts = chapters.map((c) => ({
    id: c.id,
    title: c.title,
    text: htmlToText(c.content),
    order: c.order,
  }));

  // ── Pass 1: Extract all proper nouns + classify them ──────────────────── //
  const rawEntities: RawEntity[] = [];

  for (const ch of chapterTexts) {
    if (!ch.text) continue;
    PROPER_NOUN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PROPER_NOUN_RE.exec(ch.text)) !== null) {
      const word = m[1];
      if (SKIP_WORDS.has(word) || word.length < 3) continue;
      const classified = classifyNoun(word, m.index, ch.text, ch.id, ch.title);
      if (classified) rawEntities.push(classified);
    }
  }

  // ── Pass 2: Deduplicate & normalise entity labels ─────────────────────── //
  // Build canonical map: variant → canonical label
  const canonMap = new Map<string, string>(); // lowercase variant → canonical

  // Sort by length desc so longer forms are canonical
  const sorted = [...rawEntities].sort((a, b) => b.label.length - a.label.length);
  for (const raw of sorted) {
    const lower = raw.label.toLowerCase();
    let found = false;
    for (const [variant, canon] of canonMap) {
      if (
        canon.toLowerCase().includes(lower) ||
        lower.includes(variant) ||
        canon.toLowerCase().split(" ").includes(lower)
      ) {
        canonMap.set(lower, canon); // alias → same canonical
        found = true;
        break;
      }
    }
    if (!found) canonMap.set(lower, raw.label);
  }

  // Merge raw entities to canonical forms, collecting evidence per canonical
  const entityEvidence = new Map<string, {
    label: string;
    kind: WorldEntityKind;
    subtype?: string;
    evidence: WorldEvidence[];
    chapterIds: Set<string>;
  }>();

  for (const raw of rawEntities) {
    const lower = raw.label.toLowerCase();
    const canon = canonMap.get(lower) ?? raw.label;
    if (!entityEvidence.has(canon)) {
      entityEvidence.set(canon, {
        label: canon,
        kind: raw.kind,
        subtype: raw.subtype,
        evidence: [],
        chapterIds: new Set(),
      });
    }
    const entry = entityEvidence.get(canon)!;
    entry.chapterIds.add(raw.chapterId);
    // Only keep first 3 distinct excerpts
    if (entry.evidence.length < 3 && raw.excerpt) {
      const dup = entry.evidence.find((e) => e.chapterId === raw.chapterId && e.excerpt === raw.excerpt);
      if (!dup) {
        entry.evidence.push({ chapterId: raw.chapterId, chapterTitle: raw.chapterTitle, excerpt: raw.excerpt });
      }
    }
    // If we see a more specific kind, upgrade (other < location/faction/event/object)
    if (entry.kind === "other" && raw.kind !== "other") {
      entry.kind = raw.kind;
      if (raw.subtype) entry.subtype = raw.subtype;
    }
  }

  // ── Pass 3: Merge with existing state ─────────────────────────────────── //
  const existingEntitiesMap = new Map(existingState.entities.map((e) => [e.id, e]));
  const labelToId = new Map<string, string>();
  for (const e of existingState.entities) {
    labelToId.set(e.label.toLowerCase(), e.id);
  }

  const nextEntities: WorldEntity[] = [];
  const contradictions: WorldContradiction[] = [...existingState.contradictions.filter((c) => !c.resolvedAt)];
  let newEntities = 0;
  let updatedEntities = 0;
  let newContradictions = 0;

  // Keep entities not in this pass (might be locked or will be marked unsupported)
  // We'll mark them unsupported at the end if needed
  const seenIds = new Set<string>();

  for (const [canon, derived] of entityEvidence) {
    // Skip if this entity was dismissed
    const existingId = labelToId.get(canon.toLowerCase());
    const existing = existingId ? existingEntitiesMap.get(existingId) : undefined;

    if (existing?.status === "dismissed") {
      // Only resurface if text significantly changed (different excerpts)
      const sameExcerpts = derived.evidence.every((e) =>
        existing.evidence.some((ee) => ee.excerpt === e.excerpt),
      );
      if (sameExcerpts) {
        nextEntities.push(existing);
        seenIds.add(existing.id);
        continue;
      }
      // New text → treat as new inferred
    }

    if (existing) {
      seenIds.add(existing.id);
      // Locked entry — don't overwrite any fields, but update evidence
      if (existing.locked) {
        const updatedChapterIds = [...new Set([...existing.chapterIds, ...derived.chapterIds])];
        nextEntities.push({
          ...existing,
          chapterIds: updatedChapterIds,
          lastDerivedAt: now,
          updatedAt: now,
        });
        updatedEntities++;
        continue;
      }

      // Check for description contradiction (if existing description differs significantly)
      // (We won't generate descriptions in MVP — keep this space for future)

      // Merge: update evidence and chapters, preserve status
      const updatedChapterIds = [...new Set([...existing.chapterIds, ...derived.chapterIds])];
      const mergedEvidence = mergeEvidence(existing.evidence, derived.evidence);
      nextEntities.push({
        ...existing,
        chapterIds: updatedChapterIds,
        evidence: mergedEvidence,
        // If kind was other and is now more specific, upgrade it (unless locked)
        kind: existing.kind === "other" && derived.kind !== "other" ? derived.kind : existing.kind,
        subtype: existing.subtype ?? derived.subtype,
        lastDerivedAt: now,
        updatedAt: now,
      });
      updatedEntities++;
    } else {
      // New entity
      // Heuristic: if we have strong location/faction/event/object signal → confirmed
      // If kind is "other" or only appears once → inferred
      const appearsMultiple = derived.chapterIds.size > 1;
      const strongSignal = derived.kind !== "other";
      const status: WorldEntityStatus = (strongSignal || appearsMultiple) ? "confirmed" : "inferred";
      const inferenceNote = status === "inferred"
        ? `"${canon}" appears in ${[...derived.chapterIds].map((id) => {
            const ch = chapters.find((c) => c.id === id);
            return ch?.title ?? id;
          }).join(", ")}. Resonance detected it as a possible world element but could not confirm its type from context.`
        : undefined;

      const newEntity: WorldEntity = {
        id: `${toSlug(canon)}-${uid()}`,
        projectId,
        label: canon,
        kind: derived.kind,
        status,
        subtype: derived.subtype,
        chapterIds: [...derived.chapterIds],
        evidence: derived.evidence,
        inferenceNote,
        lastDerivedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      nextEntities.push(newEntity);
      labelToId.set(canon.toLowerCase(), newEntity.id);
      newEntities++;
    }
  }

  // ── Mark unsupported entities ─────────────────────────────────────────── //
  let unsupportedMarked = 0;
  for (const existing of existingState.entities) {
    if (seenIds.has(existing.id)) continue;
    if (existing.status === "dismissed") {
      nextEntities.push(existing);
      continue;
    }
    // Supporting text gone
    if (existing.status !== "unsupported") {
      nextEntities.push({ ...existing, status: "unsupported", updatedAt: now });
      unsupportedMarked++;
    } else {
      nextEntities.push(existing);
    }
  }

  // ── Pass 4: Extract relationships ─────────────────────────────────────── //
  const entityLabelSet = new Set(nextEntities.filter((e) => e.status !== "dismissed").map((e) => e.label));
  const rawRelationships: RawRelationship[] = [];

  for (const ch of chapterTexts) {
    if (!ch.text) continue;
    // Split into sentences
    const sentences = ch.text.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const rels = extractRelationships(sentence, entityLabelSet, ch.id, ch.title);
      rawRelationships.push(...rels);
    }
  }

  // ── Pass 5: Merge relationships with existing ─────────────────────────── //
  const existingRelsMap = new Map(existingState.relationships.map((r) => [r.id, r]));
  const relKey = (srcId: string, tgtId: string, kind: WorldRelationshipKind) =>
    `${srcId}::${tgtId}::${kind}`;
  const existingRelKeys = new Map<string, string>(); // key → relationship id
  for (const r of existingState.relationships) {
    existingRelKeys.set(relKey(r.sourceId, r.targetId, r.kind), r.id);
  }

  const nextRelationships: WorldRelationship[] = [...existingState.relationships];
  let newRelationships = 0;

  for (const raw of rawRelationships) {
    const srcId = labelToId.get(raw.sourceLabel.toLowerCase());
    const tgtId = labelToId.get(raw.targetLabel.toLowerCase());
    if (!srcId || !tgtId) continue;

    const key = relKey(srcId, tgtId, raw.kind);
    if (existingRelKeys.has(key)) {
      // Relationship already exists; merge evidence
      const id = existingRelKeys.get(key)!;
      const idx = nextRelationships.findIndex((r) => r.id === id);
      if (idx >= 0 && !nextRelationships[idx].locked) {
        nextRelationships[idx] = {
          ...nextRelationships[idx],
          evidence: mergeEvidence(nextRelationships[idx].evidence, [{
            chapterId: raw.chapterId,
            chapterTitle: raw.chapterTitle,
            excerpt: raw.excerpt,
          }]),
          updatedAt: now,
        };
      }
      continue;
    }

    const srcEntity = nextEntities.find((e) => e.id === srcId);
    const tgtEntity = nextEntities.find((e) => e.id === tgtId);
    if (!srcEntity || !tgtEntity) continue;

    const newRel: WorldRelationship = {
      id: `rel-${uid()}`,
      projectId,
      sourceId: srcId,
      targetId: tgtId,
      label: raw.label,
      kind: raw.kind,
      // Relationship is confirmed only if both entities are confirmed
      status: srcEntity.status === "confirmed" && tgtEntity.status === "confirmed"
        ? "confirmed"
        : "inferred",
      evidence: [{ chapterId: raw.chapterId, chapterTitle: raw.chapterTitle, excerpt: raw.excerpt }],
      createdAt: now,
      updatedAt: now,
    };
    nextRelationships.push(newRel);
    existingRelKeys.set(key, newRel.id);
    newRelationships++;
  }

  const nextState: ProjectWorldState = {
    projectId,
    entities: nextEntities,
    relationships: nextRelationships,
    contradictions,
    lastFingerprint: manuscriptFingerprint(chapters),
    lastAnalysedAt: now,
  };

  return {
    state: nextState,
    summary: { newEntities, updatedEntities, newRelationships, newContradictions, unsupportedMarked },
  };
}

/* ─── Merge evidence arrays without duplicates ───────────────────────────── */
function mergeEvidence(existing: WorldEvidence[], incoming: WorldEvidence[]): WorldEvidence[] {
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
   WORLD STATE STORAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function loadAllWorldStates(): Record<string, ProjectWorldState> {
  return loadJSON<Record<string, ProjectWorldState>>(WORLD_SK, {});
}

function saveAllWorldStates(states: Record<string, ProjectWorldState>) {
  saveJSON(WORLD_SK, states);
}

function emptyState(projectId: string): ProjectWorldState {
  return { projectId, entities: [], relationships: [], contradictions: [] };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT INTERFACE
   ═══════════════════════════════════════════════════════════════════════════ */

export interface WorldContextValue {
  /** All entities for the active project (excluding dismissed) */
  entities: WorldEntity[];
  /** All relationships for the active project */
  relationships: WorldRelationship[];
  /** Unresolved contradictions */
  contradictions: WorldContradiction[];
  /** Whether the context has been hydrated from storage */
  hydrated: boolean;
  deriveStatus: WorldDeriveStatus;
  deriveChangeSummary: string;
  lastAnalysedAt: number | undefined;

  /** Confirm an inferred entity, making it canon */
  confirmEntity: (id: string) => void;
  /** Dismiss an inferred entity — will not be re-suggested unless text changes */
  dismissEntity: (id: string) => void;
  /** Lock an entity — derivation will not overwrite it */
  lockEntity: (id: string) => void;
  /** Unlock an entity — next derivation may update it */
  unlockEntity: (id: string) => void;
  /** Writer updates an entity's description / note */
  updateEntityNote: (id: string, note: string) => void;
  /** Remove an unsupported entity the writer no longer needs */
  removeUnsupportedEntity: (id: string) => void;

  /** Confirm an inferred relationship */
  confirmRelationship: (id: string) => void;
  /** Dismiss an inferred relationship */
  dismissRelationship: (id: string) => void;

  /** Resolve a contradiction — "keep" existing, "replace" with new */
  resolveContradiction: (id: string, resolution: "keep" | "replace") => void;

  /** Manually trigger analysis of the active project's chapters */
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
  const [allStates, setAllStates] = useState<Record<string, ProjectWorldState>>(() =>
    loadAllWorldStates(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [deriveStatus, setDeriveStatus] = useState<WorldDeriveStatus>("idle");
  const [deriveChangeSummary, setDeriveChangeSummary] = useState("");

  useEffect(() => { setHydrated(true); }, []);

  const projectState = useMemo(
    () => (activeProjectId ? (allStates[activeProjectId] ?? emptyState(activeProjectId)) : emptyState("")),
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

    setTimeout(() => {
      const chapters = loadJSON<RawChapter[]>(CHAPTERS_SK, [])
        .filter((c) => c.projectId === activeProjectId)
        .sort((a, b) => a.order - b.order);

      if (chapters.every((c) => !c.content)) {
        setDeriveStatus("done");
        setDeriveChangeSummary("No written content yet.");
        return;
      }

      const existing = allStates[activeProjectId] ?? emptyState(activeProjectId);
      const fp = manuscriptFingerprint(chapters);
      if (fp === existing.lastFingerprint && existing.entities.length > 0) {
        setDeriveStatus("done");
        setDeriveChangeSummary("No changes since last analysis.");
        return;
      }

      const { state, summary } = runWorldDerivation({
        projectId: activeProjectId,
        chapters,
        existingState: existing,
      });

      commitState(state);

      const parts: string[] = [];
      if (summary.newEntities > 0)      parts.push(`${summary.newEntities} new`);
      if (summary.updatedEntities > 0)  parts.push(`${summary.updatedEntities} updated`);
      if (summary.newRelationships > 0) parts.push(`${summary.newRelationships} new connections`);
      if (summary.unsupportedMarked > 0) parts.push(`${summary.unsupportedMarked} no longer supported`);
      if (summary.newContradictions > 0) parts.push(`${summary.newContradictions} discrepancies`);
      setDeriveChangeSummary(parts.length ? parts.join(", ") + "." : "No new changes.");
      setDeriveStatus("done");
    }, 80);
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
      entities: state.entities.filter((e) => e.id !== id),
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
  useRef(() => { runDerivationRef.current = runDerivation; });

  useEffect(() => {
    runDerivationRef.current = runDerivation;
  }, [runDerivation]);

  useEffect(() => {
    if (!activeProjectId) return;

    function onUpdate() {
      runDerivationRef.current();
    }

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
