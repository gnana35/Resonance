/**
 * designRequests.ts
 *
 * Writer → Designer character design requests.
 *
 * The reverse direction (Designer → Writer, "asset shared") already lives in
 * assets.ts as DesignShareNotif. This module is its counterpart, and follows
 * the same conventions deliberately: localStorage as the source of truth, a
 * change event for same-tab updates, and a background mirror into Supabase.
 *
 * A request carries a SNAPSHOT of the character, not a reference. The designer
 * must see exactly what the writer sent, even if the writer edits the character
 * afterwards — otherwise the brief silently changes underneath them.
 */

import type { Character } from "@/data/characters";
import { syncPushBackground } from "@/lib/cloudSync";

/* ─── types ──────────────────────────────────────────────────────────────── */

export type DesignRequestStatus = "open" | "fulfilled";

export interface CharacterDesignRequest {
  id:          string;
  projectId:   string;
  characterId: string;
  /** Everything the designer needs, frozen at send time. */
  characterName: string;
  role:         string | null;
  description:  string | null;
  appearance:   string | null;
  background:   string | null;
  personality:  string[];
  arcSummary:   string | null;
  /** Free-text brief the writer adds when sending. */
  note:         string | null;
  status:       DesignRequestStatus;
  read:         boolean;
  createdAt:    number;   // unix ms
}

/* ─── storage ────────────────────────────────────────────────────────────── */

const REQUESTS_KEY = "resonance:design-requests:v1";
const CHANGE_EVENT = "resonance:design-requests-changed";

function load(): CharacterDesignRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    return raw ? (JSON.parse(raw) as CharacterDesignRequest[]) : [];
  } catch { return []; }
}

function persist(rows: CharacterDesignRequest[]): void {
  try { localStorage.setItem(REQUESTS_KEY, JSON.stringify(rows)); } catch { /* quota */ }
  // Mirror to Supabase as notifications addressed to the designer.
  syncPushBackground(
    "app_notifications",
    rows.map((r) => ({
      ...r,
      recipient: "designer",
      type:      "character-request",
      message:   r.note || `Design request for ${r.characterName}`,
    })),
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── public API ─────────────────────────────────────────────────────────── */

/**
 * Snapshot a character and queue it for the designer.
 *
 * Idempotent per character while a request is still open: sending twice does
 * not create a duplicate card in the designer's inbox.
 */
export function sendCharacterToDesigner(
  character: Character,
  note?: string,
): CharacterDesignRequest | null {
  const rows = load();

  const alreadyOpen = rows.find(
    (r) => r.characterId === character.id && r.status === "open",
  );
  if (alreadyOpen) return null;

  const request: CharacterDesignRequest = {
    id:            uid(),
    projectId:     character.projectId,
    characterId:   character.id,
    characterName: character.name,
    role:          character.roleInStory ?? character.role ?? null,
    description:   character.description ?? null,
    // "appearance notes" in the spec — the app has no dedicated field, so use
    // the writer's free-form notes, which is where appearance detail lands.
    appearance:    character.notes ?? null,
    background:    character.bio ?? null,
    personality:   character.keyTraits ?? character.traits ?? [],
    arcSummary:    character.arcSummary ?? null,
    note:          note?.trim() || null,
    status:        "open",
    read:          false,
    createdAt:     Date.now(),
  };

  persist([request, ...rows]);
  return request;
}

/** All requests, newest first. */
export function listDesignRequests(projectId?: string): CharacterDesignRequest[] {
  const rows = load().sort((a, b) => b.createdAt - a.createdAt);
  return projectId ? rows.filter((r) => r.projectId === projectId) : rows;
}

/** True when this character has an unfulfilled request — drives the button state. */
export function hasOpenRequest(characterId: string): boolean {
  return load().some((r) => r.characterId === characterId && r.status === "open");
}

export function markRequestRead(id: string): void {
  persist(load().map((r) => (r.id === id ? { ...r, read: true } : r)));
}

/** Called when the designer shares an asset answering this request. */
export function fulfilRequest(id: string): void {
  persist(load().map((r) => (r.id === id ? { ...r, status: "fulfilled" as const } : r)));
}

export function deleteRequest(id: string): void {
  persist(load().filter((r) => r.id !== id));
}

/** Unread count for the designer's sidebar badge. */
export function unreadRequestCount(): number {
  return load().filter((r) => !r.read).length;
}

/**
 * Subscribe to changes. Fires immediately with current data, then on every
 * change — including from another tab, via the storage event.
 */
export function subscribeDesignRequests(
  onData: (rows: CharacterDesignRequest[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const emit = () => onData(listDesignRequests());
  emit();

  window.addEventListener(CHANGE_EVENT, emit);
  window.addEventListener("storage", emit);
  return () => {
    window.removeEventListener(CHANGE_EVENT, emit);
    window.removeEventListener("storage", emit);
  };
}
