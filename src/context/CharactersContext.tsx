"use client";

/**
 * CharactersContext — project-scoped, localStorage-persisted.
 *
 * Responsibilities:
 *  1. Store characters per project (no seed data)
 *  2. Populate characters from WorldContext's extraction results via the
 *     "resonance:entitiesExtracted" custom event — NO separate manuscript read.
 *  3. Evaluate draft fit against actual chapter content and cast.
 *  4. Detect when a draft appears in the manuscript → set promotionPending.
 *  5. Expose stable CRUD actions to consumers.
 *
 * Character derivation is driven by the same LLM extraction call that
 * populates the World graph.  When WorldContext finishes extracting a chapter
 * it fires a CustomEvent with the character-kind entities; this context
 * listens for that event and upserts characters from it.  This ensures
 * Characters and World are always in sync and never duplicate the API call.
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
  CharacterRelationship,
  Evidence,
  FitEvaluation,
  FitPoint,
  LockableField,
} from "@/data/characters";
import type { ExtractedEntity, ExtractedRelationship } from "@/app/api/extract-entities/route";
import { htmlToText, manuscriptFingerprint } from "@/context/WorldContext";
import { syncPushBackground } from "@/lib/cloudSync";

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
  // Mirror to Supabase. Fire-and-forget: never block a keystroke on the network,
  // and never let a cloud failure break local editing.
  syncPushBackground("app_characters", chars);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ════════════════════════════════════════════════════════════════════════════
   EXCERPT HELPER
   ════════════════════════════════════════════════════════════════════════════ */

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

/* ════════════════════════════════════════════════════════════════════════════
   UPSERT ONE CHARACTER FROM AN EXTRACTED ENTITY
   ════════════════════════════════════════════════════════════════════════════ */

type ChapterData = { id: string; title: string; content: string; order: number };

/**
 * Given a character-kind ExtractedEntity and the chapter it came from,
 * returns an upserted Character (new or merged with existing).
 */
function upsertCharacterFromEntity(
  entity:      ExtractedEntity,
  chapterId:   string,
  chapterTitle: string,
  chapterText: string,
  projectId:   string,
  existing:    Character | undefined,
  allChapters: ChapterData[],
  deletedIds:  Set<string>,
): Character | null {
  const name  = entity.label;
  const nameLc = name.toLowerCase();

  if (deletedIds.has(nameLc)) return null;

  const now = Date.now();
  const confidence = entity.confidence ?? 1;

  // Evidence from this chapter
  const chapterEvidence: Evidence = {
    chapterId,
    chapterTitle,
    excerpt: entity.excerpt?.slice(0, 120) ?? findExcerptFor(name, chapterText, 120),
  };

  if (existing) {
    if (existing.isDraft) {
      // Check if draft now appears in the manuscript → flag promotion
      const nameRe = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const appearsInManuscript = allChapters.some((c) => nameRe.test(htmlToText(c.content)));
      if (appearsInManuscript && !existing.promotionPending) {
        return { ...existing, promotionPending: true };
      }
      return null; // no other changes to drafts
    }

    // Established — merge unlocked fields only
    const locks = existing.lockedFields ?? {};
    const update: Partial<Character> = { lastDerivedAt: now };
    const updatedEvidence = { ...(existing.evidence ?? {}) };

    if (!locks.description && entity.summary?.trim()) {
      update.description = entity.summary;
      updatedEvidence.description = chapterEvidence;
    }
    if (!locks.bio && entity.summary?.trim()) {
      update.bio = entity.summary;
      updatedEvidence.bio = chapterEvidence;
    }
    if (!locks.role && entity.role?.trim()) {
      update.role = entity.role;
      updatedEvidence.role = chapterEvidence;
    }
    if (!locks.occupation && entity.occupation?.trim()) {
      update.occupation = entity.occupation;
      updatedEvidence.occupation = chapterEvidence;
    }
    if (!locks.origin && entity.origin?.trim()) {
      update.origin = entity.origin;
      updatedEvidence.origin = chapterEvidence;
    }
    if (!locks.affiliation && entity.affiliation?.trim()) {
      update.affiliation = entity.affiliation;
      updatedEvidence.affiliation = chapterEvidence;
    }
    if (!locks.status && entity.status?.trim()) {
      update.status = entity.status;
      updatedEvidence.status = chapterEvidence;
    }
    if (!locks.traits && entity.traits && entity.traits.length > 0) {
      // Merge new traits without duplicating existing locked ones
      const existing_traits = existing.traits ?? [];
      const merged = [...existing_traits];
      for (const t of entity.traits) {
        if (!merged.some((e) => e.toLowerCase() === t.toLowerCase())) {
          merged.push(t);
        }
      }
      update.traits = merged;
    }

    update.evidence = updatedEvidence;

    // Arc points: add chapter if not already present
    const existingArc = existing.arcPoints ?? [];
    const hasThisChap = existingArc.some((p) => p.chapterId === chapterId);
    if (!hasThisChap) {
      const orderFraction = allChapters.length > 1
        ? (allChapters.findIndex((c) => c.id === chapterId) / (allChapters.length - 1))
        : 0;
      const value = Math.round(2 + orderFraction * 6);
      update.arcPoints = [
        ...existingArc,
        { chapterId, chapterTitle, value, evidence: chapterEvidence.excerpt },
      ];
    }

    return { ...existing, ...update, updatedAt: now };
  }

  // Brand new character — populate every field the extraction provided
  const status = confidence >= 0.85 ? "confirmed" : "inferred";

  // Build initial arc points for all chapters (this chapter gets actual data,
  // others get placeholder 0)
  const arcPoints: ArcPoint[] = allChapters.map((ch, i) => {
    if (ch.id === chapterId) {
      const orderFraction = allChapters.length > 1 ? i / (allChapters.length - 1) : 0;
      return {
        chapterId: ch.id,
        chapterTitle: ch.title,
        value: Math.round(2 + orderFraction * 6),
        evidence: chapterEvidence.excerpt,
      };
    }
    return { chapterId: ch.id, chapterTitle: ch.title, value: 0 };
  });

  const newChar: Character = {
    id:           uid(),
    projectId,
    name,
    role:         entity.role?.trim() || "Character",
    description:  entity.summary ?? "",
    bio:          entity.summary || undefined,
    traits:       entity.traits ?? [],
    occupation:   entity.occupation || undefined,
    origin:       entity.origin || undefined,
    affiliation:  entity.affiliation || undefined,
    status:       entity.status || undefined,
    isDraft:      false,
    arcPoints,
    evidence: {
      description: chapterEvidence,
      bio:         chapterEvidence,
      ...(entity.role        ? { role:        chapterEvidence } : {}),
      ...(entity.occupation  ? { occupation:  chapterEvidence } : {}),
      ...(entity.origin      ? { origin:      chapterEvidence } : {}),
      ...(entity.affiliation ? { affiliation: chapterEvidence } : {}),
      ...(entity.status      ? { status:      chapterEvidence } : {}),
      ...(entity.traits?.length ? { traits:   chapterEvidence } : {}),
    },
    lastDerivedAt: now,
    createdAt:    now,
    updatedAt:    now,
  };

  // Mark as inferred (same concept as world entities)
  if (status === "inferred") {
    (newChar as unknown as Record<string, unknown>)["_inferred"] = true;
  }

  return newChar;
}

/* ════════════════════════════════════════════════════════════════════════════
   FIT EVALUATION FOR DRAFT CHARACTERS
   ════════════════════════════════════════════════════════════════════════════ */

function evaluateDraftFit(
  draft:    Character,
  chapters: ChapterData[],
  cast:     Character[],
): FitEvaluation {
  const fp         = manuscriptFingerprint(chapters);
  const hasContent = chapters.some((c) => htmlToText(c.content).length > 30);

  /* ── Overlap check ── */
  type Overlap = { character: Character; shared: string[] };
  const overlaps: Overlap[] = [];
  for (const other of cast) {
    if (other.id === draft.id || other.isDraft) continue;
    const draftTraits  = new Set((draft.traits ?? []).map((t) => t.toLowerCase()));
    const otherTraits  = new Set((other.traits ?? []).map((t) => t.toLowerCase()));
    const sharedTraits = [...draftTraits].filter((t) => otherTraits.has(t));
    const rolesMatch   = draft.role?.toLowerCase() === other.role?.toLowerCase() &&
                         !!draft.role && draft.role !== "Character";
    if (sharedTraits.length >= 2 || rolesMatch) {
      overlaps.push({ character: other, shared: sharedTraits.length > 0 ? sharedTraits : [other.role] });
    }
  }
  overlaps.sort((a, b) => b.shared.length - a.shared.length);

  /* ── Manuscript appearance ── */
  const draftNameRe = new RegExp(
    `\\b${draft.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i",
  );
  const chaptersWithDraft = chapters.filter((c) => draftNameRe.test(htmlToText(c.content)));

  /* ── Score ── */
  let score = 5;
  if (!hasContent) score = 0;
  else {
    if ((draft.bio ?? draft.description)?.length > 50) score += 1;
    if (draft.role && draft.role !== "Supporting" && draft.role !== "Character") score += 1;
    if ((draft.arcSummary ?? "").length > 40) score += 1;
    const castConnections = (draft.relationships ?? []).filter((r) =>
      cast.some((c) => c.id === r.characterId && !c.isDraft),
    );
    if (castConnections.length > 0) score += 1;
    if (overlaps.length > 0) score -= overlaps[0].shared.length;
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
    whyFit.push({ text: `Has a defined role (${draft.role}) that does not duplicate any established character.` });
  }
  const castConnections = (draft.relationships ?? []).filter((r) =>
    cast.some((c) => c.id === r.characterId && !c.isDraft),
  );
  if (castConnections.length > 0) {
    const names = castConnections.map((r) => cast.find((c) => c.id === r.characterId)?.name ?? r.characterId);
    whyFit.push({
      text: `Connected to ${names.join(", ")} — existing cast relationships give them a natural entry point.`,
      sourceId: castConnections[0].characterId,
      sourceTitle: cast.find((c) => c.id === castConnections[0].characterId)?.name,
      sourceKind: "character",
    });
  }
  if (!hasContent) whyFit.push({ text: "No manuscript written yet — cannot evaluate against the story." });

  /* ── Problems ── */
  const problems: FitPoint[] = [];
  if (overlaps.length > 0) {
    const top = overlaps[0];
    problems.push({
      text: `Overlaps with ${top.character.name} (${top.character.role}) — they share ${top.shared.join(", ")}.`,
      sourceId: top.character.id,
      sourceTitle: top.character.name,
      sourceKind: "character",
    });
  }
  if (chaptersWithDraft.length === 0 && hasContent) {
    const firstChap = chapters.find((c) => htmlToText(c.content).length > 40);
    if (firstChap) {
      problems.push({
        text: `${draft.name} does not appear in any chapter yet.`,
        sourceId: firstChap.id,
        sourceTitle: firstChap.title,
        sourceKind: "chapter",
      });
    }
  }
  if (!draft.arcSummary || draft.arcSummary.length < 20) {
    problems.push({ text: "No arc or intended impact described." });
  }
  if (!draft.relationships?.length) {
    problems.push({ text: "Not connected to any existing character." });
  }

  /* ── Suggestions ── */
  const suggestions: FitPoint[] = [];
  if (overlaps.length > 0) {
    const top = overlaps[0];
    suggestions.push({
      text: `Differentiate from ${top.character.name} by giving ${draft.name} a unique role or trait combination.`,
      sourceId: top.character.id,
      sourceTitle: top.character.name,
      sourceKind: "character",
    });
  }
  if (hasContent && chaptersWithDraft.length === 0) {
    const firstChap = chapters.find((c) => htmlToText(c.content).length > 40);
    if (firstChap) {
      suggestions.push({
        text: `Consider introducing ${draft.name} in "${firstChap.title}".`,
        sourceId: firstChap.id,
        sourceTitle: firstChap.title,
        sourceKind: "chapter",
      });
    }
  }
  if (!castConnections.length && cast.length > 0) {
    const first = cast.find((c) => !c.isDraft);
    if (first) {
      suggestions.push({
        text: `Link ${draft.name} to ${first.name} in the Relationships tab.`,
        sourceId: first.id,
        sourceTitle: first.name,
        sourceKind: "character",
      });
    }
  }

  const verdict = {
    verdict: score >= 7
      ? `${draft.name} fits the story well at this stage.`
      : score >= 4
      ? `${draft.name} has a partial foothold in the story.`
      : !hasContent
      ? "No manuscript written yet. Write some chapters first, then re-run this evaluation."
      : `${draft.name} is not yet connected to the story.`,
    score,
  };

  return {
    id:                    uid(),
    generatedAt:           Date.now(),
    manuscriptFingerprint: fp,
    isStale:               false,
    verdict,
    whyFit,
    problems,
    suggestions,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   CONTEXT
   ════════════════════════════════════════════════════════════════════════════ */

type DeriveStatus = "idle" | "running" | "done";

interface CharactersContextValue {
  characters:          Character[];
  allCharacters:       Character[];
  hydrated:            boolean;
  deriveStatus:        DeriveStatus;
  deriveChangeSummary: string;
  viewMode:            "grid" | "list";
  setViewMode:         (v: "grid" | "list") => void;

  addCharacter:    (c: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  lockField:   (id: string, field: LockableField) => void;
  unlockField: (id: string, field: LockableField) => void;

  /**
   * Called by AutoscanBridge when chapters change.
   * Since character derivation now comes from "resonance:entitiesExtracted"
   * events fired by WorldContext, this is a no-op (WorldContext's runDerivation
   * handles the full extraction and emits the events).  The signature is kept
   * for backwards compatibility with call sites.
   */
  deriveFromManuscript: (
    chapters: Array<{ id: string; title: string; content: string; order: number }>,
    projectId: string,
  ) => void;

  evaluateDraft: (
    draftId: string,
    chapters: Array<{ id: string; title: string; content: string; order: number }>,
  ) => void;

  promoteToEstablished: (id: string) => void;
  declinePromotion:     (id: string) => void;

  onOpenChapterEvidence?: (chapterId: string) => void;
}

const CharactersContext = createContext<CharactersContextValue | null>(null);

export function CharactersProvider({
  children,
  activeProjectId,
  onOpenChapterEvidence,
}: {
  children:               React.ReactNode;
  activeProjectId?:       string;
  onOpenChapterEvidence?: (chapterId: string) => void;
}) {
  const [allCharacters, setAllCharacters] = useState<Character[]>(() => loadCharacters());
  const [hydrated,            setHydrated]            = useState(false);
  const [deriveStatus,        setDeriveStatus]        = useState<DeriveStatus>("idle");
  const [deriveChangeSummary, setDeriveChangeSummary] = useState("");
  const [viewMode, setViewModeState] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem(VIEW_KEY) as "grid" | "list") ?? "grid";
  });

  // Track IDs deleted this session so extraction doesn't resurrect them
  const deletedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

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
  }, [allCharacters]);

  const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    commit(
      allCharacters.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
      ),
    );
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
  }, [allCharacters]);

  const lockField = useCallback((id: string, field: LockableField) => {
    commit(
      allCharacters.map((c) =>
        c.id === id
          ? { ...c, lockedFields: { ...(c.lockedFields ?? {}), [field]: true }, updatedAt: Date.now() }
          : c,
      ),
    );
  }, [allCharacters]);

  const unlockField = useCallback((id: string, field: LockableField) => {
    const next = allCharacters.map((c) => {
      if (c.id !== id) return c;
      const locks = { ...(c.lockedFields ?? {}) };
      delete locks[field];
      return { ...c, lockedFields: locks, updatedAt: Date.now() };
    });
    commit(next);
  }, [allCharacters]);

  /* ── Listen for character entities from WorldContext's extraction ──────── */

  // We keep a ref to allCharacters so the event handler always sees current state
  const allCharsRef = useRef(allCharacters);
  useEffect(() => { allCharsRef.current = allCharacters; }, [allCharacters]);

  const activeProjectIdRef = useRef(activeProjectId);
  useEffect(() => { activeProjectIdRef.current = activeProjectId; }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;

    type EntitiesExtractedDetail = {
      projectId:     string;
      chapterId:     string;
      chapterTitle:  string;
      entities:      ExtractedEntity[];
      relationships: ExtractedRelationship[];
    };

    function onEntitiesExtracted(evt: Event) {
      const detail = (evt as CustomEvent<EntitiesExtractedDetail>).detail;
      if (!detail || detail.projectId !== activeProjectIdRef.current) return;

      const { chapterId, chapterTitle, entities, relationships = [] } = detail;

      // Read all chapters to build arc points
      const CHAPTERS_SK = "resonance:chapters";
      const allChapters: ChapterData[] = (() => {
        try {
          const raw = localStorage.getItem(CHAPTERS_SK);
          if (!raw) return [];
          const parsed = JSON.parse(raw) as Array<{ id: string; title: string; content: string; order: number; projectId: string }>;
          return parsed
            .filter((c) => c.projectId === detail.projectId)
            .sort((a, b) => a.order - b.order);
        } catch { return []; }
      })();

      const chapterText = htmlToText(
        allChapters.find((c) => c.id === chapterId)?.content ?? "",
      );

      const currentChars = allCharsRef.current;
      const nextAll = [...currentChars];
      let newCount     = 0;
      let updatedCount = 0;

      setDeriveStatus("running");

      // ── Step 1: upsert character entities ──────────────────────────────
      for (const entity of entities) {
        if (!entity.label?.trim()) continue;
        const nameLc = entity.label.toLowerCase();
        if (deletedIdsRef.current.has(nameLc)) continue;

        // Find existing character by label or any alias
        const existing = currentChars.find(
          (c) =>
            c.projectId === detail.projectId &&
            (
              c.name.toLowerCase() === nameLc ||
              entity.aliases.some((a) => a.toLowerCase() === c.name.toLowerCase())
            ),
        );

        const upserted = upsertCharacterFromEntity(
          entity,
          chapterId,
          chapterTitle,
          chapterText,
          detail.projectId,
          existing,
          allChapters,
          deletedIdsRef.current,
        );

        if (!upserted) continue;

        const idx = nextAll.findIndex((c) => c.id === upserted.id);
        if (idx >= 0) {
          nextAll[idx] = upserted;
          updatedCount++;
        } else {
          nextAll.push(upserted);
          newCount++;
        }
      }

      // ── Step 2: merge relationships into character records ──────────────
      // Build a label → character index from the freshly upserted nextAll
      const labelToChar = new Map<string, Character>();
      for (const c of nextAll) {
        if (c.projectId !== detail.projectId) continue;
        labelToChar.set(c.name.toLowerCase(), c);
      }

      // Merge one directional relationship entry into owner's record
      const mergeRelEntry = (
        owner: Character,
        otherId: string,
        label: string,
        excerpt: string,
      ): Character => {
        const existing_ = owner.relationships ?? [];
        if (existing_.some((r) => r.characterId === otherId)) return owner;
        const newRel: CharacterRelationship = {
          characterId: otherId,
          relation:    label,
          blurb:       excerpt.slice(0, 120),
        };
        const idx = nextAll.findIndex((c) => c.id === owner.id);
        const updated: Character = { ...owner, relationships: [...existing_, newRel], updatedAt: Date.now() };
        if (idx >= 0) nextAll[idx] = updated;
        return updated;
      };

      for (const rel of relationships) {
        const srcLc = rel.sourceLabel.toLowerCase();
        const tgtLc = rel.targetLabel.toLowerCase();
        const srcChar = labelToChar.get(srcLc);
        const tgtChar = labelToChar.get(tgtLc);

        // Only link character-to-character connections where both ends resolve
        if (!srcChar || !tgtChar) continue;

        const relLabel = rel.relationship.replace(/-/g, " ");
        const excerpt  = rel.excerpt ?? "";

        // Update both sides and keep the map in sync
        labelToChar.set(srcLc, mergeRelEntry(srcChar, tgtChar.id, relLabel, excerpt));
        // Re-read from map in case srcChar === tgtChar (unlikely but safe)
        const latestTgt = labelToChar.get(tgtLc) ?? tgtChar;
        const latestSrc = labelToChar.get(srcLc) ?? srcChar;
        labelToChar.set(tgtLc, mergeRelEntry(latestTgt, latestSrc.id, relLabel, excerpt));
      }

      commit(nextAll);

      const parts: string[] = [];
      if (newCount > 0)     parts.push(`${newCount} new`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      if (parts.length > 0) {
        setDeriveChangeSummary(parts.join(", ") + ".");
      }
      setDeriveStatus("done");
    }

    window.addEventListener("resonance:entitiesExtracted", onEntitiesExtracted);
    return () => window.removeEventListener("resonance:entitiesExtracted", onEntitiesExtracted);
  }, [activeProjectId]);

  /* ── deriveFromManuscript — no-op now; WorldContext drives extraction ─── */

  const deriveFromManuscript = useCallback(
    // Signature kept for backwards compatibility; character derivation now
    // happens via "resonance:entitiesExtracted" events from WorldContext.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_chapters: Array<{ id: string; title: string; content: string; order: number }>, _projectId: string) => {
      /* intentional no-op */
    },
    [],
  );

  /* ── evaluateDraft ───────────────────────────────────────────────────── */

  const evaluateDraft = useCallback((
    draftId:  string,
    chapters: Array<{ id: string; title: string; content: string; order: number }>,
  ) => {
    const draft = allCharacters.find((c) => c.id === draftId);
    if (!draft || !draft.isDraft) return;
    const cast       = allCharacters.filter((c) => c.projectId === draft.projectId);
    const evaluation = evaluateDraftFit(draft, chapters, cast);
    updateCharacter(draftId, { fitEvaluation: evaluation });
  }, [allCharacters, updateCharacter]);

  /* ── promoteToEstablished / declinePromotion ─────────────────────────── */

  const promoteToEstablished = useCallback((id: string) => {
    updateCharacter(id, { isDraft: false, promotionPending: false });
  }, [updateCharacter]);

  const declinePromotion = useCallback((id: string) => {
    updateCharacter(id, { promotionPending: false });
  }, [updateCharacter]);

  /* ── Context value ───────────────────────────────────────────────────── */

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
