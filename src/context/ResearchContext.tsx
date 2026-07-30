"use client";

/**
 * ResearchContext
 *
 * Manages:
 *  - Project-scoped chat sessions (full block history, persisted to localStorage)
 *  - "Kept as written" conflict suppressions (per project, per passage fingerprint)
 *  - Saved research items (blocks saved into Notes, World, or canvas references)
 *  - Active project context assembly helpers
 *
 * Chat sessions are keyed by projectId.  Switching projects switches the full
 * session list — P1 chats never appear in a P2 context.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Block types ──────────────────────────────────────────────────────────────

export type BlockType =
  | "prose"
  | "spec_list"
  | "comparison"
  | "timeline"
  | "visual_reference"
  | "conflict"
  | "uncertainty"
  | "sources";

export type Source = {
  id: string;
  title: string;
  publisher: string;
  tier: 1 | 2 | 3;
  date?: string;
  url: string;
  /** inline citation key e.g. "[1]" */
  key: string;
};

export type ProseBlock = {
  type: "prose";
  heading?: string;
  body: string; // may contain [key] inline citation markers
};

export type SpecItem = {
  label: string;
  detail: string;
  sourceKey?: string;
};

export type SpecListBlock = {
  type: "spec_list";
  heading?: string;
  items: SpecItem[];
};

export type ComparisonRow = {
  aspect: string;
  accurate: string;
  misconception: string;
};

export type ComparisonBlock = {
  type: "comparison";
  heading?: string;
  leftLabel: string;
  rightLabel: string;
  rows: ComparisonRow[];
};

export type TimelineEntry = {
  date: string;
  event: string;
  relevance?: string;
  sourceKey?: string;
};

export type TimelineBlock = {
  type: "timeline";
  heading?: string;
  entries: TimelineEntry[];
};

export type VisualItem = {
  imageUrl: string;
  caption: string;
  studyNote: string;
  source: string;
  sourceUrl?: string;
  sourceKey?: string;
};

export type VisualReferenceBlock = {
  type: "visual_reference";
  heading?: string;
  items: VisualItem[];
};

export type ConflictBlock = {
  type: "conflict";
  manuscriptSays: string;
  evidenceSays: string;
  chapterId?: string;
  chapterTitle?: string;
  passageFingerprint?: string;
  sourceKeys: string[];
  /** true after the user clicks "Keep as written" for this exact passage */
  suppressed?: boolean;
};

export type UncertaintyBlock = {
  type: "uncertainty";
  heading?: string;
  body: string;
};

export type SourcesBlock = {
  type: "sources";
  sources: Source[];
};

export type ResearchBlock =
  | ProseBlock
  | SpecListBlock
  | ComparisonBlock
  | TimelineBlock
  | VisualReferenceBlock
  | ConflictBlock
  | UncertaintyBlock
  | SourcesBlock;

// ─── Pipeline step (shown live while running) ─────────────────────────────────

export type PipelineStep = {
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string; // e.g. search queries as they fire
};

// ─── Message types ────────────────────────────────────────────────────────────

export type ResearchMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  blocks?: ResearchBlock[];
  /** pipeline steps — only on agent messages while/after running */
  steps?: PipelineStep[];
  status: "typing" | "done" | "error";
  createdAt: number;
  /** image URL or data-URI if an image was attached */
  attachedImageUrl?: string;
};

// ─── Chat session ─────────────────────────────────────────────────────────────

export type ChatSession = {
  id: string;
  projectId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ResearchMessage[];
};

// ─── Saved research item ──────────────────────────────────────────────────────

export type SavedResearchItem = {
  id: string;
  projectId: string;
  chatId: string;
  messageId: string;
  blockIndex: number;
  block: ResearchBlock;
  destination: "research" | "notes" | "world" | "canvas";
  savedAt: number;
};

// ─── Conflict suppression ─────────────────────────────────────────────────────

/** Key: `${projectId}::${passageFingerprint}` — suppressed conflicts won't re-surface */
type SuppressionMap = Record<string, true>;

// ─── Context value ────────────────────────────────────────────────────────────

export interface ResearchContextValue {
  // Sessions
  sessions: ChatSession[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  activeSession: ChatSession | null;

  startNewChat: () => string;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;

  // Messages
  addUserMessage: (chatId: string, text: string, attachedImageUrl?: string) => string;
  appendAgentMessage: (chatId: string) => string;
  updateAgentMessage: (
    chatId: string,
    messageId: string,
    patch: Partial<Pick<ResearchMessage, "text" | "blocks" | "steps" | "status">>
  ) => void;

  // Chat title auto-update
  setFirstMessageTitle: (chatId: string, text: string) => void;

  // Conflict suppression
  suppressConflict: (projectId: string, fingerprint: string) => void;
  isConflictSuppressed: (projectId: string, fingerprint: string) => boolean;

  // Saved research
  savedItems: SavedResearchItem[];
  saveBlock: (
    chatId: string,
    messageId: string,
    blockIndex: number,
    block: ResearchBlock,
    destination: SavedResearchItem["destination"]
  ) => void;

  // Context bar
  contextExclusions: Set<string>;
  setContextExclusion: (key: string, excluded: boolean) => void;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const SK = {
  sessions: (projectId: string) => `resonance:research:sessions:${projectId}`,
  suppressions: (projectId: string) => `resonance:research:suppress:${projectId}`,
  saved: (projectId: string) => `resonance:research:saved:${projectId}`,
  exclusions: (projectId: string) => `resonance:research:ctx-exclude:${projectId}`,
  activeProject: "resonance:activeProject",
};

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota */ }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ResearchContext = createContext<ResearchContextValue | null>(null);

export function ResearchProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    loadJSON<ChatSession[]>(SK.sessions(projectId), [])
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [suppressions, setSuppressions] = useState<SuppressionMap>(() =>
    loadJSON<SuppressionMap>(SK.suppressions(projectId), {})
  );
  const [savedItems, setSavedItems] = useState<SavedResearchItem[]>(() =>
    loadJSON<SavedResearchItem[]>(SK.saved(projectId), [])
  );
  const [contextExclusions, setContextExclusionsState] = useState<Set<string>>(
    () => new Set(loadJSON<string[]>(SK.exclusions(projectId), []))
  );

  // Persist whenever state changes
  useEffect(() => { saveJSON(SK.sessions(projectId), sessions); }, [projectId, sessions]);
  useEffect(() => { saveJSON(SK.suppressions(projectId), suppressions); }, [projectId, suppressions]);
  useEffect(() => { saveJSON(SK.saved(projectId), savedItems); }, [projectId, savedItems]);
  useEffect(() => {
    saveJSON(SK.exclusions(projectId), [...contextExclusions]);
  }, [projectId, contextExclusions]);

  const activeSession = sessions.find((s) => s.id === activeChatId) ?? null;

  // ── Session operations ──────────────────────────────────────────────────────

  const startNewChat = useCallback((): string => {
    const id = uid();
    const now = Date.now();
    const session: ChatSession = {
      id,
      projectId,
      title: "New Chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setSessions((prev) => [session, ...prev]);
    setActiveChatId(id);
    return id;
  }, [projectId]);

  const deleteChat = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveChatId((prev) => (prev === id ? null : prev));
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => s.id === id ? { ...s, title, updatedAt: Date.now() } : s)
    );
  }, []);

  // ── Message operations ──────────────────────────────────────────────────────

  const addUserMessage = useCallback((
    chatId: string,
    text: string,
    attachedImageUrl?: string,
  ): string => {
    const id = uid();
    const msg: ResearchMessage = {
      id,
      role: "user",
      text,
      status: "done",
      createdAt: Date.now(),
      attachedImageUrl,
    };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? { ...s, messages: [...s.messages, msg], updatedAt: Date.now() }
          : s
      )
    );
    return id;
  }, []);

  const appendAgentMessage = useCallback((chatId: string): string => {
    const id = uid();
    const msg: ResearchMessage = {
      id,
      role: "agent",
      text: "",
      blocks: [],
      steps: [],
      status: "typing",
      createdAt: Date.now(),
    };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? { ...s, messages: [...s.messages, msg], updatedAt: Date.now() }
          : s
      )
    );
    return id;
  }, []);

  const updateAgentMessage = useCallback((
    chatId: string,
    messageId: string,
    patch: Partial<Pick<ResearchMessage, "text" | "blocks" | "steps" | "status">>,
  ) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m
              ),
              updatedAt: Date.now(),
            }
          : s
      )
    );
  }, []);

  const setFirstMessageTitle = useCallback((chatId: string, text: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId && s.title === "New Chat"
          ? { ...s, title: text.slice(0, 50) + (text.length > 50 ? "…" : "") }
          : s
      )
    );
  }, []);

  // ── Conflict suppression ────────────────────────────────────────────────────

  const suppressConflict = useCallback((pid: string, fingerprint: string) => {
    setSuppressions((prev) => ({ ...prev, [`${pid}::${fingerprint}`]: true }));
  }, []);

  const isConflictSuppressed = useCallback((pid: string, fingerprint: string) => {
    return !!suppressions[`${pid}::${fingerprint}`];
  }, [suppressions]);

  // ── Save research ───────────────────────────────────────────────────────────

  const saveBlock = useCallback((
    chatId: string,
    messageId: string,
    blockIndex: number,
    block: ResearchBlock,
    destination: SavedResearchItem["destination"],
  ) => {
    const item: SavedResearchItem = {
      id: uid(),
      projectId,
      chatId,
      messageId,
      blockIndex,
      block,
      destination,
      savedAt: Date.now(),
    };
    setSavedItems((prev) => [item, ...prev]);
  }, [projectId]);

  // ── Context exclusions ──────────────────────────────────────────────────────

  const setContextExclusion = useCallback((key: string, excluded: boolean) => {
    setContextExclusionsState((prev) => {
      const next = new Set(prev);
      if (excluded) next.add(key); else next.delete(key);
      return next;
    });
  }, []);

  return (
    <ResearchContext.Provider
      value={{
        sessions,
        activeChatId,
        setActiveChatId,
        activeSession,
        startNewChat,
        deleteChat,
        renameChat,
        addUserMessage,
        appendAgentMessage,
        updateAgentMessage,
        setFirstMessageTitle,
        suppressConflict,
        isConflictSuppressed,
        savedItems,
        saveBlock,
        contextExclusions,
        setContextExclusion,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch(): ResearchContextValue {
  const ctx = useContext(ResearchContext);
  if (!ctx) throw new Error("useResearch must be used inside ResearchProvider");
  return ctx;
}

// ─── Context assembly helpers (called in component, not server) ───────────────

export type ProjectContext = {
  projectId: string;
  projectName: string;
  setting?: string;
  characterCount: number;
  characters: { name: string; role: string; bio?: string }[];
  worldEntities: { label: string; kind: string; description?: string }[];
  openChapter?: { id: string; title: string; contentExcerpt: string };
  chapters: { id: string; title: string }[];
  /** Asset metadata attached by the designer for image-analysis modes */
  attachedAsset?: {
    name:        string;
    characterId: string | null;
    sceneId:     string | null;
    description: string | null;
  };
};

/**
 * Assemble relevant project context slices for the research pipeline.
 * Reads from localStorage directly so it can be called outside React render.
 */
export function assembleProjectContext(
  projectId: string,
  exclusions: Set<string>,
): ProjectContext {
  function loadJSON_<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch { return fallback; }
  }

  const projects = loadJSON_<{ id: string; name: string; description: string }[]>(
    "resonance:projects",
    []
  );
  const project = projects.find((p) => p.id === projectId);
  const projectName = project?.name ?? "Unnamed Project";

  // Characters (capped at 20 for context size)
  const allChars = loadJSON_<{ id: string; projectId: string; name: string; role: string; bio?: string }[]>(
    "resonance:characters:v2",
    []
  );
  const projectChars = allChars
    .filter((c) => c.projectId === projectId)
    .slice(0, 20);

  // World entities (capped at 30)
  const allWorld = loadJSON_<Record<string, { entities: { label: string; kind: string; description?: string; projectId: string }[] }>>(
    "resonance:world:v1",
    {}
  );
  const worldState = allWorld[projectId];
  const worldEntities = worldState
    ? worldState.entities
        .filter((e) => e.projectId === projectId)
        .slice(0, 30)
        .map((e) => ({ label: e.label, kind: e.kind, description: e.description }))
    : [];

  // Chapters
  const allChapters = loadJSON_<{ id: string; projectId: string; title: string; content: string }[]>(
    "resonance:chapters",
    []
  );
  const projectChapters = allChapters.filter((c) => c.projectId === projectId);

  // Active/open chapter
  const activeTabId = loadJSON_<string>("resonance:activeTab", "");
  const openChapterFull = projectChapters.find((c) => c.id === activeTabId);
  const openChapter = openChapterFull
    ? {
        id: openChapterFull.id,
        title: openChapterFull.title,
        contentExcerpt: openChapterFull.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 600),
      }
    : undefined;

  // Derive "setting" from world entities and project description
  const locationEntities = worldEntities.filter((e) => e.kind === "location");
  const setting = exclusions.has("setting")
    ? undefined
    : locationEntities.length > 0
    ? locationEntities.map((e) => e.label).slice(0, 3).join(", ")
    : project?.description
    ? project.description.slice(0, 100)
    : undefined;

  return {
    projectId,
    projectName,
    setting,
    characterCount: projectChars.length,
    characters: exclusions.has("characters") ? [] : projectChars.map((c) => ({
      name: c.name,
      role: c.role,
      bio: c.bio,
    })),
    worldEntities: exclusions.has("world") ? [] : worldEntities,
    openChapter: exclusions.has("chapter") ? undefined : openChapter,
    chapters: projectChapters.map((c) => ({ id: c.id, title: c.title })),
    // attachedAsset is injected by the caller at send-time, not assembled here
  };
}
