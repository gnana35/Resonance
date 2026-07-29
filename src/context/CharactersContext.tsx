"use client";

/**
 * CharactersContext — project-scoped, localStorage-persisted.
 *
 * Responsibilities:
 *  1. Store characters per project (no seed data)
 *  2. Derive characters from manuscript text (with field-lock protection)
 *  3. Evaluate draft fit against actual chapter content and cast
 *  4. Detect when a draft appears in the manuscript → set promotionPending
 *  5. Expose stable CRUD actions to consumers
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
  ArcPoint,
  Character,
  Evidence,
  FieldLocks,
  FitEvaluation,
  FitPoint,
  LockableField,
} from "@/data/characters";

/* ════════════════════════════════════════════════════════════════════════════
   STORAGE HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "resonance:characters:v2";
const VIEW_KEY    = "resonance:characters:view";

function loadCharacters(): Character[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Character[];
  } catch { return []; }
}

function saveCharacters(chars: Character[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chars)); } catch { /* quota */ }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ════════════════════════════════════════════════════════════════════════════
   HTML → PLAIN TEXT
   ════════════════════════════════════════════════════════════════════════════ */

function htmlToText(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.innerText ?? div.textContent ?? "").trim();
}

/* ════════════════════════════════════════════════════════════════════════════
   MANUSCRIPT FINGERPRINT
   A cheap content hash so we know when re-running would produce different results.
   ════════════════════════════════════════════════════════════════════════════ */

function manuscriptFingerprint(chapters: { id: string; content: string }[]): string {
  const combined = chapters.map((c) => `${c.id}:${c.content}`).join("|");
  let h = 0;
  for (let i = 0; i < combined.length; i++) {
    h = (Math.imul(31, h) + combined.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

/* ════════════════════════════════════════════════════════════════════════════
   NAME EXTRACTION & RESOLUTION
   Pulls proper-noun candidates from text, collapses aliases of the same person.
   ════════════════════════════════════════════════════════════════════════════ */

/** Extracts likely character name tokens from plain text. */
function extractNameCandidates(text: string): string[] {
  // Match sequences of 1-3 capitalised words that are not sentence-start noise
  const found = new Set<string>();
  // Proper noun pattern: capitalised word(s) not at pure sentence start (preceded by non-period)
  const re = /(?<![.!?]\s)(?<!\bthe\s)(?<!\ba\s)(?<!\ban\s)\b([A-Z][a-z]{2,})(?:\s+[A-Z][a-z]{2,}){0,2}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const w = m[1];
    // Skip common non-name capitalized words
    const skip = new Set([
      "The","She","He","They","It","We","You","I","Then","When","Now",
      "But","And","Or","If","As","At","By","Do","For","From","In","Into",
      "Of","On","So","To","Up","Was","With","Could","Would","Should",
      "Her","His","Its","Our","Their","That","This","These","Those",
      "After","Before","During","While","Upon","Through","Between",
    ]);
    if (!skip.has(w) && w.length > 2) found.add(w);
  }
  return [...found];
}

/** Groups name variants → canonical form. Longest form wins. */
function resolveNames(names: string[]): Map<string, string> {
  const canonical = new Map<string, string>();
  // Sort longest first so "Kael Vorn" absorbs "Kael"
  const sorted = [...names].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    let found = false;
    for (const [variant, canon] of canonical) {
      if (canon.includes(name) || name.includes(variant) || canon.split(" ").includes(name)) {
        canonical.set(name, canon);
        found = true;
        break;
      }
    }
    if (!found) canonical.set(name, name);
  }
  return canonical;
}

/** Returns the canonical set of character names (deduplicated, resolved). */
function deriveNameSet(allNames: string[]): string[] {
  const resolved = resolveNames(allNames);
  const canonicalSet = new Set(resolved.values());
  return [...canonicalSet];
}

/* ════════════════════════════════════════════════════════════════════════════
   DERIVE A SINGLE CHARACTER FROM CHAPTERS
   ════════════════════════════════════════════════════════════════════════════ */

type ChapterData = { id: string; title: string; content: string; order: number };

function findExcerptFor(name: string, text: string, maxLen = 120): string {
  const idx = text.indexOf(name);
  if (idx === -1) return "";
  const start = Math.max(0, idx - 40);
  const end   = Math.min(text.length, idx + 80);
  let excerpt = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) excerpt = "…" + excerpt;
  if (end < text.length) excerpt += "…";
  return excerpt.slice(0, maxLen);
}

/**
 * Derive character fields from the chapters they appear in.
 * Respects existing field locks — will not overwrite locked fields.
 */
function deriveCharacterFields(
  name: string,
  chapters: ChapterData[],
  existing: Character | undefined,
): Partial<Character> {
  const locks: FieldLocks = existing?.lockedFields ?? {};
  const evidence: Partial<Record<LockableField, Evidence>> = { ...(existing?.evidence ?? {}) };

  // Find chapters that mention this character
  const appearing = chapters
    .filter((ch) => {
      const text = htmlToText(ch.content);
      return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
    })
    .sort((a, b) => a.order - b.order);

  const allText = appearing.map((ch) => htmlToText(ch.content)).join("\n");

  // Description: pull the first meaningful sentence containing the name
  let description = existing?.description ?? "";
  if (!locks.description && appearing.length > 0) {
    const firstChText = htmlToText(appearing[0].content);
    const sentences   = firstChText.split(/(?<=[.!?])\s+/);
    const nameRe      = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const sentence    = sentences.find((s) => nameRe.test(s) && s.length > 20);
    if (sentence) {
      description = sentence.length > 200 ? sentence.slice(0, 200) + "…" : sentence;
      evidence.description = {
        chapterId: appearing[0].id,
        chapterTitle: appearing[0].title,
        excerpt: sentence.slice(0, 120),
      };
    }
  }

  // Role: heuristic from context words near the name
  let role = existing?.role ?? "Character";
  if (!locks.role && allText) {
    const lc = allText.toLowerCase();
    const idx = lc.indexOf(name.toLowerCase());
    const context = idx >= 0 ? lc.slice(Math.max(0, idx - 60), idx + 80) : "";
    if (/\b(protagonist|hero|heroine|main character)\b/.test(context)) role = "Protagonist";
    else if (/\b(antagonist|villain|enemy)\b/.test(context)) role = "Antagonist";
    else if (/\b(mentor|guide|teacher)\b/.test(context)) role = "Mentor";
    else if (/\b(ally|friend|companion)\b/.test(context)) role = "Ally";
    else if (/\b(guard|soldier|warrior)\b/.test(context)) role = "Guard";
    // Only update evidence if we found something specific
    if (role !== "Character" && appearing.length > 0) {
      evidence.role = {
        chapterId: appearing[0].id,
        chapterTitle: appearing[0].title,
        excerpt: findExcerptFor(name, htmlToText(appearing[0].content)),
      };
    }
  }

  // Arc points: one per chapter the character appears in
  let arcPoints: ArcPoint[] = existing?.arcPoints ?? [];
  if (appearing.length > 0) {
    const existingPointMap = new Map(
      (existing?.arcPoints ?? []).map((p) => [p.chapterId, p]),
    );
    arcPoints = chapters.map((ch) => {
      const existing = existingPointMap.get(ch.id);
      if (existing?.locked) return existing; // keep writer-locked points
      const text = htmlToText(ch.content);
      const nameRe = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const present = nameRe.test(text);
      // Simple presence-weighted score: if character appears in early chapters, low value; later = higher
      const orderFraction = chapters.length > 1 ? ch.order / (chapters.length - 1) : 0;
      const baseValue = present ? Math.round(2 + orderFraction * 6) : 0;
      return {
        chapterId: ch.id,
        chapterTitle: ch.title,
        value: existing?.value ?? baseValue,
        evidence: present ? findExcerptFor(name, text, 80) : undefined,
      };
    });
  }

  return {
    description,
    role,
    arcPoints: arcPoints.length > 0 ? arcPoints : undefined,
    evidence,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   FIT EVALUATION FOR DRAFT CHARACTERS
   Runs against actual chapters + cast; returns structured citations.
   ════════════════════════════════════════════════════════════════════════════ */

function evaluateDraftFit(
  draft: Character,
  chapters: ChapterData[],
  cast: Character[], // all established characters in this project
): FitEvaluation {
  const fp = manuscriptFingerprint(chapters);
  const hasContent = chapters.some((c) => htmlToText(c.content).length > 30);
  const allText    = chapters.map((c) => htmlToText(c.content)).join("\n");

  /* ── Overlap check: find established character most similar to this draft ── */
  type Overlap = { character: Character; shared: string[] };
  const overlaps: Overlap[] = [];
  for (const other of cast) {
    if (other.id === draft.id || other.isDraft) continue;
    const draftTraits  = new Set((draft.traits ?? []).map((t) => t.toLowerCase()));
    const otherTraits  = new Set((other.traits ?? []).map((t) => t.toLowerCase()));
    const sharedTraits = [...draftTraits].filter((t) => otherTraits.has(t));
    const draftRole    = draft.role?.toLowerCase() ?? "";
    const otherRole    = other.role?.toLowerCase() ?? "";
    const rolesMatch   = draftRole && otherRole && draftRole === otherRole;
    if (sharedTraits.length >= 2 || rolesMatch) {
      overlaps.push({ character: other, shared: sharedTraits.length > 0 ? sharedTraits : [otherRole] });
    }
  }
  overlaps.sort((a, b) => b.shared.length - a.shared.length);

  /* ── Check if draft appears in any chapter ── */
  const draftNameRe = new RegExp(
    `\\b${draft.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i",
  );
  const chaptersWithDraft = chapters.filter((c) => draftNameRe.test(htmlToText(c.content)));

  /* ── Build score (1–10) ── */
  let score = 5; // neutral default
  if (!hasContent) score = 0;
  else {
    // Has bio/description?
    if ((draft.bio ?? draft.description)?.length > 50) score += 1;
    // Has clear role?
    if (draft.role && draft.role !== "Supporting" && draft.role !== "Character") score += 1;
    // Has arc intent?
    if ((draft.arcSummary ?? "").length > 40) score += 1;
    // Has connections to existing cast?
    const castConnections = (draft.relationships ?? []).filter((r) =>
      cast.some((c) => c.id === r.characterId && !c.isDraft),
    );
    if (castConnections.length > 0) score += 1;
    // Overlap with established character? Reduce.
    if (overlaps.length > 0) score -= overlaps[0].shared.length;
    // Already appears in manuscript? Bonus.
    if (chaptersWithDraft.length > 0) score += 1;
    score = Math.max(1, Math.min(10, score));
  }

  /* ── Why they fit ── */
  const whyFit: FitPoint[] = [];

  if (chaptersWithDraft.length > 0) {
    whyFit.push({
      text: `${draft.name} already appears in ${chaptersWithDraft.length} chapter${chaptersWithDraft.length > 1 ? "s" : ""}: ${chaptersWithDraft.map((c) => c.title).join(", ")}.`,
      sourceId: chaptersWithDraft[0].id,
      sourceTitle: chaptersWithDraft[0].title,
      sourceKind: "chapter",
    });
  }

  if (draft.role && draft.role !== "Supporting" && draft.role !== "Character") {
    whyFit.push({
      text: `Has a defined role (${draft.role}) that does not duplicate any established character.`,
    });
  }

  const castConnections = (draft.relationships ?? []).filter((r) =>
    cast.some((c) => c.id === r.characterId && !c.isDraft),
  );
  if (castConnections.length > 0) {
    const names = castConnections.map((r) => {
      const other = cast.find((c) => c.id === r.characterId);
      return other?.name ?? r.characterId;
    });
    whyFit.push({
      text: `Connected to ${names.join(", ")} — existing cast relationships give them a natural entry point.`,
      sourceId: castConnections[0].characterId,
      sourceTitle: cast.find((c) => c.id === castConnections[0].characterId)?.name,
      sourceKind: "character",
    });
  }

  if (!hasContent) {
    whyFit.push({ text: "No manuscript written yet — cannot evaluate against the story." });
  }

  /* ── Problems ── */
  const problems: FitPoint[] = [];

  if (overlaps.length > 0) {
    const top = overlaps[0];
    problems.push({
      text: `Overlaps with ${top.character.name} (${top.character.role}) — they share ${top.shared.join(", ")}. Two characters occupying the same space dilute both.`,
      sourceId: top.character.id,
      sourceTitle: top.character.name,
      sourceKind: "character",
    });
  }

  if (chaptersWithDraft.length === 0 && hasContent) {
    // Find which chapters might need this character
    const chapsWithoutDraft = chapters.filter((c) => htmlToText(c.content).length > 40);
    if (chapsWithoutDraft.length > 0) {
      problems.push({
        text: `${draft.name} does not appear in any chapter yet. Without a scene in the manuscript, there is nothing to anchor them to the central conflict.`,
        sourceId: chapsWithoutDraft[0].id,
        sourceTitle: chapsWithoutDraft[0].title,
        sourceKind: "chapter",
      });
    }
  }

  if (!draft.arcSummary || draft.arcSummary.length < 20) {
    problems.push({
      text: "No arc or intended impact described. It is unclear what this character is meant to do to the story.",
    });
  }

  if (draft.relationships === undefined || draft.relationships.length === 0) {
    problems.push({
      text: "Not connected to any existing character. A character with no ties to the cast is difficult to weave into scenes that already exist.",
    });
  }

  /* ── Suggestions ── */
  const suggestions: FitPoint[] = [];

  if (overlaps.length > 0) {
    const top = overlaps[0];
    suggestions.push({
      text: `Differentiate from ${top.character.name} by giving ${draft.name} a role or trait combination that ${top.character.name} does not have.`,
      sourceId: top.character.id,
      sourceTitle: top.character.name,
      sourceKind: "character",
    });
  }

  if (hasContent && chaptersWithDraft.length === 0) {
    const firstChap = chapters.find((c) => htmlToText(c.content).length > 40);
    if (firstChap) {
      suggestions.push({
        text: `Consider introducing ${draft.name} in "${firstChap.title}" — that chapter already has content to anchor them against.`,
        sourceId: firstChap.id,
        sourceTitle: firstChap.title,
        sourceKind: "chapter",
      });
    }
  }

  if (castConnections.length === 0 && cast.length > 0) {
    const firstEstablished = cast.find((c) => !c.isDraft);
    if (firstEstablished) {
      suggestions.push({
        text: `Link ${draft.name} to ${firstEstablished.name} in the Relationships tab — even a single tie to an established character opens scene possibilities.`,
        sourceId: firstEstablished.id,
        sourceTitle: firstEstablished.name,
        sourceKind: "character",
      });
    }
  }

  const verdict = {
    verdict: score >= 7
      ? `${draft.name} fits the story well at this stage.`
      : score >= 4
      ? `${draft.name} has a partial foothold in the story. There are open questions to resolve.`
      : !hasContent
      ? "No manuscript written yet. Write some chapters first, then re-run this evaluation."
      : `${draft.name} is not yet connected to the story. They need a stronger anchor.`,
    score,
  };

  return {
    id: uid(),
    generatedAt: Date.now(),
    manuscriptFingerprint: fp,
    isStale: false,
    verdict,
    whyFit,
    problems,
    suggestions,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN DERIVATION PASS
   Runs on all chapters of the active project.
   ════════════════════════════════════════════════════════════════════════════ */

type DerivationInput = {
  projectId: string;
  chapters: ChapterData[];
  existingCharacters: Character[];
  deletedIds: Set<string>; // must not re-create these
};

type DerivationResult = {
  upserted: Character[];  // new or updated characters
  staleEvalIds: string[]; // character IDs whose evaluations are now stale
};

function runDerivation(input: DerivationInput): DerivationResult {
  const { projectId, chapters, existingCharacters, deletedIds } = input;
  const fp = manuscriptFingerprint(chapters);

  // Collect all names from chapter text
  const allRawNames: string[] = [];
  for (const ch of chapters) {
    const text = htmlToText(ch.content);
    allRawNames.push(...extractNameCandidates(text));
  }
  const resolvedNames = deriveNameSet(allRawNames);

  const now = Date.now();
  const upserted: Character[] = [];
  const staleEvalIds: string[] = [];

  for (const canonName of resolvedNames) {
    if (deletedIds.has(canonName.toLowerCase())) continue;

    // Find existing character by name (case-insensitive)
    const existing = existingCharacters.find(
      (c) => c.projectId === projectId && c.name.toLowerCase() === canonName.toLowerCase(),
    );

    if (existing?.isDraft) {
      // Check if draft now appears in chapters → promotionPending
      const nameRe = new RegExp(`\\b${canonName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const appearsInManuscript = chapters.some((c) => nameRe.test(htmlToText(c.content)));
      if (appearsInManuscript && !existing.promotionPending) {
        upserted.push({ ...existing, promotionPending: true });
      }
      // Mark their fit evaluation as stale if manuscript changed
      if (existing.fitEvaluation && existing.fitEvaluation.manuscriptFingerprint !== fp) {
        staleEvalIds.push(existing.id);
        upserted.push({
          ...existing,
          fitEvaluation: { ...existing.fitEvaluation, isStale: true },
        });
      }
      continue; // don't overwrite draft fields
    }

    const derived = deriveCharacterFields(canonName, chapters, existing);

    if (existing) {
      // Merge — only overwrite unlocked fields
      const locks = existing.lockedFields ?? {};
      const update: Partial<Character> = { lastDerivedAt: now };

      if (!locks.description && derived.description) update.description = derived.description;
      if (!locks.role && derived.role) update.role = derived.role;
      if (derived.arcPoints) update.arcPoints = derived.arcPoints;
      if (derived.evidence) update.evidence = derived.evidence as Character["evidence"];

      upserted.push({ ...existing, ...update });
    } else {
      // New character derived from manuscript
      const newChar: Character = {
        id: uid(),
        projectId,
        name: canonName,
        role: derived.role ?? "Character",
        description: derived.description ?? "",
        traits: [],
        isDraft: false,
        arcPoints: derived.arcPoints,
        evidence: derived.evidence as Character["evidence"],
        createdAt: now,
        updatedAt: now,
        lastDerivedAt: now,
      };
      upserted.push(newChar);
    }
  }

  return { upserted, staleEvalIds };
}

/* ════════════════════════════════════════════════════════════════════════════
   CONTEXT
   ════════════════════════════════════════════════════════════════════════════ */

type DeriveStatus = "idle" | "running" | "done";

interface CharactersContextValue {
  /** Characters for the active project only */
  characters: Character[];
  /** All characters across all projects (for relationship resolution) */
  allCharacters: Character[];
  hydrated: boolean;
  deriveStatus: DeriveStatus;
  deriveChangeSummary: string;
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;

  addCharacter: (c: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  /** Lock a field — derivation will not overwrite it */
  lockField: (id: string, field: LockableField) => void;
  /** Unlock a field — next derivation will overwrite it */
  unlockField: (id: string, field: LockableField) => void;

  /** Run the derivation pass for the current project */
  deriveFromManuscript: (
    chapters: Array<{ id: string; title: string; content: string; order: number }>,
    projectId: string,
  ) => void;

  /** Run fit evaluation for a draft character */
  evaluateDraft: (
    draftId: string,
    chapters: Array<{ id: string; title: string; content: string; order: number }>,
  ) => void;

  /** Promote a draft to established */
  promoteToEstablished: (id: string) => void;

  /** Decline the promotion prompt */
  declinePromotion: (id: string) => void;

  /** Evidence source click handler — opens chapter in editor */
  onOpenChapterEvidence?: (chapterId: string) => void;
}

const CharactersContext = createContext<CharactersContextValue | null>(null);

export function CharactersProvider({
  children,
  activeProjectId,
  onOpenChapterEvidence,
}: {
  children: React.ReactNode;
  activeProjectId?: string;
  onOpenChapterEvidence?: (chapterId: string) => void;
}) {
  const [allCharacters, setAllCharacters] = useState<Character[]>(() => loadCharacters());
  const [hydrated, setHydrated] = useState(false);
  const [deriveStatus, setDeriveStatus] = useState<DeriveStatus>("idle");
  const [deriveChangeSummary, setDeriveChangeSummary] = useState("");
  const [viewMode, setViewModeState] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem(VIEW_KEY) as "grid" | "list") ?? "grid";
  });

  // Track IDs deleted this session so derivation doesn't resurrect them
  const deletedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { setHydrated(true); }, []);

  const characters = useMemo(
    () => allCharacters.filter((c) => !activeProjectId || c.projectId === activeProjectId),
    [allCharacters, activeProjectId],
  );

  function commit(next: Character[]) {
    setAllCharacters(next);
    saveCharacters(next);
  }

  const setViewMode = useCallback((v: "grid" | "list") => {
    setViewModeState(v);
    localStorage.setItem(VIEW_KEY, v);
  }, []);

  const addCharacter = useCallback((c: Character) => {
    commit([...allCharacters, c]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters]);

  const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    commit(
      allCharacters.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters]);

  const deleteCharacter = useCallback((id: string) => {
    const target = allCharacters.find((c) => c.id === id);
    if (target) deletedIdsRef.current.add(target.name.toLowerCase());
    commit(
      allCharacters
        .filter((c) => c.id !== id)
        .map((c) => ({
          ...c,
          relationships: c.relationships?.filter((r) => r.characterId !== id),
        })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters]);

  const lockField = useCallback((id: string, field: LockableField) => {
    commit(
      allCharacters.map((c) =>
        c.id === id
          ? { ...c, lockedFields: { ...(c.lockedFields ?? {}), [field]: true }, updatedAt: Date.now() }
          : c,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters]);

  const unlockField = useCallback((id: string, field: LockableField) => {
    const next = allCharacters.map((c) => {
      if (c.id !== id) return c;
      const locks = { ...(c.lockedFields ?? {}) };
      delete locks[field];
      return { ...c, lockedFields: locks, updatedAt: Date.now() };
    });
    commit(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters]);

  const deriveFromManuscript = useCallback((
    chapters: Array<{ id: string; title: string; content: string; order: number }>,
    projectId: string,
  ) => {
    setDeriveStatus("running");
    setDeriveChangeSummary("");

    // Defer so the UI shows "running" before the work starts
    setTimeout(() => {
      const { upserted } = runDerivation({
        projectId,
        chapters,
        existingCharacters: allCharacters,
        deletedIds: deletedIdsRef.current,
      });

      if (upserted.length === 0) {
        setDeriveStatus("done");
        setDeriveChangeSummary("No changes.");
        return;
      }

      const nextAll = [...allCharacters];
      let newCount = 0;
      let updatedCount = 0;
      let staleCount = 0;

      for (const u of upserted) {
        const idx = nextAll.findIndex((c) => c.id === u.id);
        if (idx >= 0) {
          // check if it's a stale eval update
          if (u.fitEvaluation?.isStale && !nextAll[idx].fitEvaluation?.isStale) staleCount++;
          else updatedCount++;
          nextAll[idx] = u;
        } else {
          nextAll.push(u);
          newCount++;
        }
      }

      commit(nextAll);
      const parts: string[] = [];
      if (newCount > 0)     parts.push(`${newCount} new`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      if (staleCount > 0)   parts.push(`${staleCount} evaluation${staleCount > 1 ? "s" : ""} now stale`);
      setDeriveChangeSummary(parts.join(", ") + ".");
      setDeriveStatus("done");
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters]);

  const evaluateDraft = useCallback((
    draftId: string,
    chapters: Array<{ id: string; title: string; content: string; order: number }>,
  ) => {
    const draft = allCharacters.find((c) => c.id === draftId);
    if (!draft || !draft.isDraft) return;
    const cast = allCharacters.filter((c) => c.projectId === draft.projectId);
    const evaluation = evaluateDraftFit(draft, chapters, cast);
    updateCharacter(draftId, { fitEvaluation: evaluation });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters, updateCharacter]);

  const promoteToEstablished = useCallback((id: string) => {
    const char = allCharacters.find((c) => c.id === id);
    if (!char) return;
    // Keep all writer-locked fields; mark everything else as derived going forward
    updateCharacter(id, {
      isDraft: false,
      promotionPending: false,
      // Keep fitEvaluation as history but it no longer drives the Arc tab
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters, updateCharacter]);

  const declinePromotion = useCallback((id: string) => {
    updateCharacter(id, { promotionPending: false });
  }, [updateCharacter]);

  const value = useMemo<CharactersContextValue>(() => ({
    characters,
    allCharacters,
    hydrated,
    deriveStatus,
    deriveChangeSummary,
    viewMode,
    setViewMode,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    lockField,
    unlockField,
    deriveFromManuscript,
    evaluateDraft,
    promoteToEstablished,
    declinePromotion,
    onOpenChapterEvidence,
  }), [
    characters, allCharacters, hydrated, deriveStatus, deriveChangeSummary,
    viewMode, setViewMode, addCharacter, updateCharacter, deleteCharacter,
    lockField, unlockField, deriveFromManuscript, evaluateDraft,
    promoteToEstablished, declinePromotion, onOpenChapterEvidence,
  ]);

  return (
    <CharactersContext.Provider value={value}>
      {children}
    </CharactersContext.Provider>
  );
}

export function useCharacters(): CharactersContextValue {
  const ctx = useContext(CharactersContext);
  if (!ctx) throw new Error("useCharacters must be inside <CharactersProvider>");
  return ctx;
}

/* Re-export types that consumers need */
export type { Evidence, LockableField };
