/**
 * collab.ts
 *
 * Lightweight in-memory + localStorage event bus that bridges the Writer and
 * Designer personas within the same browser session.
 *
 * Events
 * ──────
 * "character-design-request"
 *   Writer → Designer. Fires when the writer clicks "Send to Designer" after
 *   keeping a character arc.  Payload contains the full character snapshot.
 *
 * "designer-assets-shared"
 *   Designer → Writer.  Fires when the designer clicks "Share with Writer" on
 *   one or more assets.  Payload contains the character id + asset metadata.
 */

import type { Character } from "@/data/characters";

// ─── event types ──────────────────────────────────────────────────────────────

export type CharacterDesignRequest = {
  type: "character-design-request";
  id: string;          // unique event id
  characterId: string;
  character: Character;
  sentAt: string;      // ISO string
};

export type DesignerAssetsShared = {
  type: "designer-assets-shared";
  id: string;
  characterId: string;
  characterName: string;
  assetIds: string[];
  assetNames: string[];
  sentAt: string;
};

export type CollabEvent = CharacterDesignRequest | DesignerAssetsShared;

// ─── persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "resonance:collab-events";

function loadEvents(): CollabEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CollabEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: CollabEvent[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Storage unavailable — in-memory only
  }
}

// ─── module-level store ───────────────────────────────────────────────────────

let events: CollabEvent[] = loadEvents();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

// ─── public API ───────────────────────────────────────────────────────────────

export function subscribeCollab(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCollabEvents(): CollabEvent[] {
  return events;
}

export function pushCollabEvent(event: CollabEvent): void {
  events = [event, ...events];
  saveEvents(events);
  notify();
}

/** Check if there is a pending (un-read) design request for a character. */
export function hasDesignRequest(characterId: string): boolean {
  return events.some(
    (e) => e.type === "character-design-request" && e.characterId === characterId,
  );
}

/** Return all design requests for the designer, newest first. */
export function getDesignRequests(): CharacterDesignRequest[] {
  return events.filter(
    (e): e is CharacterDesignRequest => e.type === "character-design-request",
  );
}

/** Return all shared-assets events for the writer, newest first. */
export function getSharedAssetEvents(): DesignerAssetsShared[] {
  return events.filter(
    (e): e is DesignerAssetsShared => e.type === "designer-assets-shared",
  );
}

/** Return all asset ids already shared for a specific character. */
export function sharedAssetIdsForCharacter(characterId: string): string[] {
  return getSharedAssetEvents()
    .filter((e) => e.characterId === characterId)
    .flatMap((e) => e.assetIds);
}

/** Mark all designer-notification events as seen by removing them from the feed. */
export function clearDesignRequests(): void {
  events = events.filter((e) => e.type !== "character-design-request");
  saveEvents(events);
  notify();
}
