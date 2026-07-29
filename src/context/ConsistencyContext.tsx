"use client";

/**
 * ConsistencyContext
 *
 * Single source of truth for the consistency & notification system.
 * Scoped per active project via activeProjectId prop.
 *
 * Responsibilities
 * ────────────────
 * • Store CanonFacts and Discrepancies in localStorage, project-scoped.
 * • On chapter save (resonance:chaptersUpdated event): extract manuscript
 *   facts, compare with last known design facts, create discrepancies.
 * • On design save (resonance:designSaved event): extract design facts,
 *   compare with last known manuscript facts, create discrepancies.
 * • Expose pendingCount for the sidebar badge.
 * • Expose approve / reject actions for the writer.
 * • Handle stale marking when chapters or designs are deleted.
 * • On project delete (resonance:projectDeleted event): purge all facts +
 *   discrepancies for that project.
 *
 * Events dispatched
 * ─────────────────
 * • resonance:designSaved   — { designId, projectId, design, layers }
 * • resonance:chapterDeleted — { chapterId }
 * • resonance:designDeleted  — { designId }
 * • resonance:projectDeleted — { projectId }
 *
 * These are fired by the page components when the relevant action occurs.
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
  CanonFact,
  Discrepancy,
  ProjectConsistencyState,
} from "@/data/consistency";
import type { Design, Layer } from "@/context/DesignerContext";
import {
  extractManuscriptFacts,
  extractDesignFacts,
  compareAndDetect,
  buildApprovedFact,
  buildRejectedFact,
  buildSuppressedFingerprints,
} from "@/lib/consistencyEngine";

/* ═══════════════════════════════════════════════════════════════════════
   STORAGE
   ═══════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "resonance:consistency:v1";
const CHAPTERS_SK = "resonance:chapters";

type AllStates = Record<string, ProjectConsistencyState>;

function loadAll(): AllStates {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AllStates) : {};
  } catch { return {}; }
}

function saveAll(states: AllStates) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(states)); } catch { /* quota */ }
}

function emptyState(projectId: string): ProjectConsistencyState {
  return { projectId, facts: [], discrepancies: [] };
}

type RawChapter = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  order: number;
};

function loadChapters(): RawChapter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAPTERS_SK);
    return raw ? (JSON.parse(raw) as RawChapter[]) : [];
  } catch { return []; }
}

/* ═══════════════════════════════════════════════════════════════════════
   CONTEXT VALUE TYPE
   ═══════════════════════════════════════════════════════════════════════ */

export interface ConsistencyContextValue {
  /** Pending discrepancy count for the active project (sidebar badge) */
  pendingCount: number;

  /** All discrepancies for the active project, newest first */
  discrepancies: Discrepancy[];

  /** All canon facts for the active project */
  facts: CanonFact[];

  /**
   * Approve a discrepancy — design version becomes canon.
   * Updates the relevant fact and world info.
   */
  approve: (id: string, note?: string) => void;

  /**
   * Reject a discrepancy — manuscript remains canon.
   * Sends revision info to the designer.
   */
  reject: (id: string, note?: string) => void;

  /** Whether the context has been hydrated from storage */
  hydrated: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════════════════════════════════ */

const ConsistencyContext = createContext<ConsistencyContextValue | null>(null);

/* ═══════════════════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════════════════ */

export function ConsistencyProvider({
  children,
  activeProjectId,
}: {
  children: React.ReactNode;
  activeProjectId: string | undefined;
}) {
  const [allStates, setAllStates] = useState<AllStates>(() => loadAll());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  // Current project state (derived)
  const projectState = useMemo(
    () => (activeProjectId
      ? (allStates[activeProjectId] ?? emptyState(activeProjectId))
      : emptyState("")),
    [allStates, activeProjectId],
  );

  // Persist whenever state changes
  const allStatesRef = useRef(allStates);
  allStatesRef.current = allStates;

  function commit(next: ProjectConsistencyState) {
    const updated = { ...allStatesRef.current, [next.projectId]: next };
    setAllStates(updated);
    saveAll(updated);
  }

  /* ── design facts cache (by designId) ─────────────────────────────────
   * We keep the last extracted design facts in memory so a chapter save
   * can compare against them, and vice-versa.
   * This is NOT persisted (extracted fresh on each save event).
   * ──────────────────────────────────────────────────────────────────── */
  const designFactsCache = useRef<Map<string, { subject: string; attribute: string; value: string; sourceRef: string }[]>>(new Map());

  /* ── manuscript facts cache (by projectId) ──────────────────────────── */
  const manuscriptFactsCache = useRef<Map<string, { subject: string; attribute: string; value: string; sourceRef: string }[]>>(new Map());

  /* ─────────────────────────────────────────────────────────────────────
     DETECTION — run after either side updates
     ───────────────────────────────────────────────────────────────────── */

  const runDetection = useCallback((
    pid: string,
    mFacts: ReturnType<typeof extractManuscriptFacts>,
    dFacts: ReturnType<typeof extractDesignFacts>,
  ) => {
    const state = allStatesRef.current[pid] ?? emptyState(pid);
    const suppressed = buildSuppressedFingerprints(state.discrepancies);
    const existingPending = state.discrepancies.filter((d) => d.status === "pending");

    const { newDiscrepancies } = compareAndDetect({
      projectId: pid,
      manuscriptFacts: mFacts,
      designFacts: dFacts,
      suppressedFingerprints: suppressed,
      existingPending,
    });

    if (newDiscrepancies.length === 0) return;

    const nextState: ProjectConsistencyState = {
      ...state,
      discrepancies: [...newDiscrepancies, ...state.discrepancies],
    };
    commit(nextState);
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     CHAPTER SAVE — extract manuscript facts, compare with design facts
     ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!activeProjectId) return;

    function onChaptersUpdated() {
      const pid = activeProjectId!;
      const chapters = loadChapters();
      const mFacts = extractManuscriptFacts(chapters, pid);
      manuscriptFactsCache.current.set(pid, mFacts);

      // Gather all design facts we've seen for this project
      const state = allStatesRef.current[pid] ?? emptyState(pid);
      const allDesignFacts: ReturnType<typeof extractDesignFacts> = [];
      for (const [, facts] of designFactsCache.current) {
        allDesignFacts.push(...facts);
      }

      if (allDesignFacts.length === 0) return; // no design facts yet to compare against

      runDetection(pid, mFacts, allDesignFacts);

      // Check: did the manuscript change in a way that contradicts previously
      // approved design facts?  If so, raise a new discrepancy.
      checkApprovedVsManuscript(pid, mFacts);
    }

    window.addEventListener("resonance:chaptersUpdated", onChaptersUpdated);
    return () => window.removeEventListener("resonance:chaptersUpdated", onChaptersUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, runDetection]);

  /* ─────────────────────────────────────────────────────────────────────
     DESIGN SAVE — extract design facts, compare with manuscript facts
     ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!activeProjectId) return;

    function onDesignSaved(e: Event) {
      const evt = e as CustomEvent<{ designId: string; projectId: string; design: Design; layers: Layer[] }>;
      const { designId, projectId: evtPid, design, layers } = evt.detail;
      if (evtPid !== activeProjectId) return;

      const pid = activeProjectId!;
      const dFacts = extractDesignFacts(design, layers);
      designFactsCache.current.set(designId, dFacts);

      // Gather all design facts across all designs for this project
      const allDesignFacts: ReturnType<typeof extractDesignFacts> = [];
      for (const [, facts] of designFactsCache.current) {
        allDesignFacts.push(...facts);
      }

      // Get (or extract fresh) manuscript facts
      let mFacts = manuscriptFactsCache.current.get(pid);
      if (!mFacts) {
        const chapters = loadChapters();
        mFacts = extractManuscriptFacts(chapters, pid);
        manuscriptFactsCache.current.set(pid, mFacts);
      }

      if (mFacts.length === 0) {
        // No manuscript yet — store design facts but can't compare
        return;
      }

      runDetection(pid, mFacts, allDesignFacts);
    }

    window.addEventListener("resonance:designSaved", onDesignSaved as EventListener);
    return () => window.removeEventListener("resonance:designSaved", onDesignSaved as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, runDetection]);

  /* ─────────────────────────────────────────────────────────────────────
     REVERSE DIRECTION — manuscript now contradicts an approved design fact
     ───────────────────────────────────────────────────────────────────── */

  function checkApprovedVsManuscript(
    pid: string,
    mFacts: ReturnType<typeof extractManuscriptFacts>,
  ) {
    const state = allStatesRef.current[pid] ?? emptyState(pid);
    // Find approved design facts (origin = "design")
    const approvedDesignFacts = state.facts.filter(
      (f) => f.origin === "design" && f.supersededFactId === null,
    );

    const newDiscs: typeof state.discrepancies = [];
    const now = Date.now();

    for (const canonFact of approvedDesignFacts) {
      const mFact = mFacts.find(
        (f) => f.subject === canonFact.subject && f.attribute === canonFact.attribute,
      );
      if (!mFact) continue; // manuscript doesn't mention this subject/attr — skip
      // Check if manuscript value contradicts the approved canon
      const normalise = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();
      const n1 = normalise(mFact.value);
      const n2 = normalise(canonFact.value);
      if (n1 === n2 || n2.includes(n1) || n1.includes(n2)) continue; // still agree

      // Find the previously approved discrepancy for this canon fact
      const prevApproved = state.discrepancies.find(
        (d) => d.status === "approved" &&
               d.subject === canonFact.subject &&
               d.attribute === canonFact.attribute,
      );

      const { fingerprint: fp } = await_fingerprint(
        canonFact.subject,
        canonFact.attribute,
        mFact.value,
        canonFact.value,
      );

      // Don't re-raise if already pending
      const alreadyPending = state.discrepancies.some(
        (d) => d.fingerprint === fp && d.status === "pending",
      );
      if (alreadyPending) continue;

      newDiscs.push({
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        projectId: pid,
        kind: "contradiction",
        subject: canonFact.subject,
        attribute: canonFact.attribute,
        manuscriptValue: mFact.value,
        manuscriptRef: mFact.sourceRef,
        designValue: canonFact.value,
        designRef: canonFact.sourceRef,
        fingerprint: fp,
        status: "pending",
        decidedBy: null,
        decidedAt: null,
        decisionNote: null,
        supersededDecisionId: prevApproved?.id ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (newDiscs.length > 0) {
      const nextState: ProjectConsistencyState = {
        ...state,
        discrepancies: [...newDiscs, ...state.discrepancies],
      };
      commit(nextState);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     STALE — chapter or design deleted
     ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    function onChapterDeleted(e: Event) {
      const evt = e as CustomEvent<{ chapterId: string }>;
      const { chapterId } = evt.detail;
      // Mark all pending discrepancies whose manuscriptRef = chapterId as stale
      for (const [pid, state] of Object.entries(allStatesRef.current)) {
        const updated = state.discrepancies.map((d) =>
          d.manuscriptRef === chapterId && d.status === "pending"
            ? { ...d, status: "stale" as const, updatedAt: Date.now() }
            : d,
        );
        if (updated.some((d, i) => d.status !== state.discrepancies[i].status)) {
          commit({ ...state, projectId: pid, discrepancies: updated });
        }
      }
    }

    function onDesignDeleted(e: Event) {
      const evt = e as CustomEvent<{ designId: string }>;
      const { designId } = evt.detail;
      designFactsCache.current.delete(designId);
      for (const [pid, state] of Object.entries(allStatesRef.current)) {
        const updated = state.discrepancies.map((d) =>
          d.designRef === designId && d.status === "pending"
            ? { ...d, status: "stale" as const, updatedAt: Date.now() }
            : d,
        );
        if (updated.some((d, i) => d.status !== state.discrepancies[i].status)) {
          commit({ ...state, projectId: pid, discrepancies: updated });
        }
      }
    }

    function onProjectDeleted(e: Event) {
      const evt = e as CustomEvent<{ projectId: string }>;
      const { projectId: pid } = evt.detail;
      const next = { ...allStatesRef.current };
      delete next[pid];
      setAllStates(next);
      saveAll(next);
    }

    window.addEventListener("resonance:chapterDeleted", onChapterDeleted as EventListener);
    window.addEventListener("resonance:designDeleted", onDesignDeleted as EventListener);
    window.addEventListener("resonance:projectDeleted", onProjectDeleted as EventListener);
    return () => {
      window.removeEventListener("resonance:chapterDeleted", onChapterDeleted as EventListener);
      window.removeEventListener("resonance:designDeleted", onDesignDeleted as EventListener);
      window.removeEventListener("resonance:projectDeleted", onProjectDeleted as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     WRITER DECISION — APPROVE
     ───────────────────────────────────────────────────────────────────── */

  const approve = useCallback((id: string, note?: string) => {
    if (!activeProjectId) return;
    const state = allStatesRef.current[activeProjectId] ?? emptyState(activeProjectId);
    const disc = state.discrepancies.find((d) => d.id === id);
    if (!disc) return;

    const { newFact } = buildApprovedFact(disc, state.facts);

    // Mark old facts with same (subject, attribute) as superseded
    const updatedFacts = state.facts.map((f) =>
      f.subject === disc.subject && f.attribute === disc.attribute && f.supersededFactId === null
        ? { ...f, supersededFactId: newFact.id }
        : f,
    );

    commit({
      ...state,
      facts: [...updatedFacts, newFact],
      discrepancies: state.discrepancies.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "approved" as const,
              decidedBy: "writer",
              decidedAt: Date.now(),
              decisionNote: note ?? null,
              updatedAt: Date.now(),
            }
          : d,
      ),
    });
  }, [activeProjectId]);

  /* ─────────────────────────────────────────────────────────────────────
     WRITER DECISION — REJECT
     ───────────────────────────────────────────────────────────────────── */

  const reject = useCallback((id: string, note?: string) => {
    if (!activeProjectId) return;
    const state = allStatesRef.current[activeProjectId] ?? emptyState(activeProjectId);
    const disc = state.discrepancies.find((d) => d.id === id);
    if (!disc) return;

    const newFact = buildRejectedFact(disc, state.facts);

    commit({
      ...state,
      facts: newFact ? [...state.facts, newFact] : state.facts,
      discrepancies: state.discrepancies.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "rejected" as const,
              decidedBy: "writer",
              decidedAt: Date.now(),
              decisionNote: note ?? null,
              updatedAt: Date.now(),
            }
          : d,
      ),
    });
  }, [activeProjectId]);

  /* ── Derived counts ─────────────────────────────────────────────────── */

  const discrepancies = useMemo(
    () => [...projectState.discrepancies].sort((a, b) => b.createdAt - a.createdAt),
    [projectState],
  );

  const pendingCount = useMemo(
    () => projectState.discrepancies.filter((d) => d.status === "pending").length,
    [projectState],
  );

  /* ── Context value ──────────────────────────────────────────────────── */

  const value = useMemo<ConsistencyContextValue>(
    () => ({
      pendingCount,
      discrepancies,
      facts: projectState.facts,
      approve,
      reject,
      hydrated,
    }),
    [pendingCount, discrepancies, projectState.facts, approve, reject, hydrated],
  );

  return (
    <ConsistencyContext.Provider value={value}>
      {children}
    </ConsistencyContext.Provider>
  );
}

/* ── Sync fingerprint helper (re-import to avoid circular dep) ────────── */
function await_fingerprint(
  subject: string,
  attribute: string,
  mVal: string,
  dVal: string,
): { fingerprint: string } {
  const s = [subject, attribute, mVal, dVal].join("\x00");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return { fingerprint: (h >>> 0).toString(16) };
}

/* ═══════════════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════════════ */

const FALLBACK: ConsistencyContextValue = {
  pendingCount: 0,
  discrepancies: [],
  facts: [],
  approve: () => {},
  reject: () => {},
  hydrated: false,
};

/**
 * useConsistency — returns context value or a zero-state fallback when
 * rendered outside a ConsistencyProvider (e.g. during static prerendering).
 */
export function useConsistency(): ConsistencyContextValue {
  const ctx = useContext(ConsistencyContext);
  return ctx ?? FALLBACK;
}
