"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { CHARACTERS, type Character } from "@/data/characters";

const STORAGE_KEY = "resonance:characters";

interface CharactersContextValue {
  characters: Character[];
  /**
   * False during the server render and the hydration pass. Consumers that look
   * a character up by id must wait for this before concluding the id is unknown
   * — until it flips, only the seed characters are visible.
   */
  hydrated: boolean;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  addCharacter: (character: Character) => void;
}

// ─── Module-level store ───────────────────────────────────────────────────────
// Survives layout remounts from Next.js client-side navigation, and is seeded
// from localStorage so it also survives a full page load. That pairing is what
// keeps a newly created character resolvable when its detail URL is reloaded or
// opened directly.

type Snapshot = { characters: Character[]; hydrated: boolean };

// Referentially stable, and used for both the server render and React's
// hydration pass so the client markup matches the server's.
const SERVER_SNAPSHOT: Snapshot = { characters: CHARACTERS, hydrated: false };

function loadPersisted(): Character[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Guard against older or corrupt payloads that would break every consumer.
    if (!parsed.every((c) => c && typeof (c as Character).id === "string")) {
      return null;
    }
    return parsed as Character[];
  } catch {
    return null;
  }
}

let snapshot: Snapshot = SERVER_SNAPSHOT;

if (typeof window !== "undefined") {
  snapshot = { characters: loadPersisted() ?? [...CHARACTERS], hydrated: true };
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function commit(next: Character[]) {
  snapshot = { characters: next, hydrated: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or storage unavailable — the session still works in memory.
  }
  listeners.forEach((listener) => listener());
}

// ─────────────────────────────────────────────────────────────────────────────

const CharactersContext = createContext<CharactersContextValue | null>(null);

export function CharactersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { characters, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const updateCharacter = useCallback(
    (id: string, updates: Partial<Character>) => {
      commit(
        snapshot.characters.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      );
    },
    [],
  );

  const deleteCharacter = useCallback((id: string) => {
    commit(
      snapshot.characters
        .filter((c) => c.id !== id)
        .map((c) => ({
          ...c,
          relationships: c.relationships?.filter((r) => r.characterId !== id),
        })),
    );
  }, []);

  const addCharacter = useCallback((character: Character) => {
    commit([...snapshot.characters, character]);
  }, []);

  const value = useMemo(
    () => ({
      characters,
      hydrated,
      updateCharacter,
      deleteCharacter,
      addCharacter,
    }),
    [characters, hydrated, updateCharacter, deleteCharacter, addCharacter],
  );

  return (
    <CharactersContext.Provider value={value}>
      {children}
    </CharactersContext.Provider>
  );
}

export function useCharacters(): CharactersContextValue {
  const ctx = useContext(CharactersContext);
  if (!ctx) {
    throw new Error("useCharacters must be used inside <CharactersProvider>");
  }
  return ctx;
}
