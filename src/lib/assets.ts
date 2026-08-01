/**
 * assets.ts
 *
 * Asset persistence for the Assets library.
 *
 * Storage strategy (matches the rest of the app):
 *   Metadata  → localStorage  (key: ASSETS_KEY)
 *   Images    → Supabase Storage bucket "assets"
 *   Notifs    → localStorage  (key: NOTIFS_KEY)
 *
 * "source" field determines which UI section an asset lands in:
 *   "created"  → Your Work  (saved from the Sketchpad)
 *   "uploaded" → Uploads    (brought in from device)
 */

import { supabase } from "@/lib/supabase";
import { syncPushBackground } from "@/lib/cloudSync";

/* ─── types ──────────────────────────────────────────────────────────────── */

export type AssetSource = "created" | "uploaded";

export type AssetShareStatus      = "not_shared" | "shared";
export type AssetValidationStatus = "pending"    | "approved" | "needs_revision" | "rejected";

export interface AssetRecord {
  id:               string;
  name:             string;
  mimeType:         string;
  source:           AssetSource;
  previewUrl:       string | null;   // public URL for images
  storagePath:      string | null;   // path inside Supabase Storage
  designId:         string | null;

  // Extended metadata (created assets)
  characterId:      string | null;
  sceneId:          string | null;
  description:      string | null;
  shareStatus:      AssetShareStatus;
  validationStatus: AssetValidationStatus;
  sharedAt:         number | null;   // unix ms

  createdAt:        number;          // unix ms
  updatedAt:        number;          // unix ms
}

export interface SaveCreatedAssetOpts {
  characterId?: string;
  sceneId?:     string;
  description?: string;
}

/* ─── design-share notification ─────────────────────────────────────────── */

export interface DesignShareNotif {
  id:          string;
  assetId:     string;
  assetName:   string;
  previewUrl:  string | null;
  description: string | null;
  characterId: string | null;
  sceneId:     string | null;
  read:        boolean;
  createdAt:   number;   // unix ms
}

/* ─── design feedback (writer → designer chat) ──────────────────────────── */

/**
 * When the writer reviews a shared design they can send the designer a note —
 * either asking for changes ("revision") or rejecting the design outright
 * ("reject"). That decision is the opening message of a per-asset CHAT THREAD:
 * both the writer and the designer can then keep replying on the same asset, so
 * the designer has the full history to reference while reworking the design.
 */

/** The writer's up-front decision when sending a design back. */
export type DesignFeedbackKind = "revision" | "reject";

/** Who authored a chat message. */
export type DesignChatFrom = "writer" | "designer";

/**
 * Message kind:
 *   "revision" | "reject" | "approve" — a milestone/decision (rendered as a badge)
 *   "message"                          — an ordinary chat reply
 */
export type DesignChatKind = DesignFeedbackKind | "approve" | "message";

export interface DesignFeedbackMsg {
  id:        string;
  assetId:   string;
  assetName: string;
  from:      DesignChatFrom;
  kind:      DesignChatKind;
  message:   string;
  createdAt: number;   // unix ms
}

/* ─── localStorage helpers ───────────────────────────────────────────────── */

const ASSETS_KEY   = "resonance:assets:v1";
const NOTIFS_KEY   = "resonance:design-share-notifs:v1";
const FEEDBACK_KEY = "resonance:design-feedback:v1";
// Per-role read receipts: { [role]: { [assetId]: lastSeenMs } }
const CHAT_SEEN_KEY = "resonance:chat-seen:v1";

function loadAssets(): AssetRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ASSETS_KEY);
    return raw ? (JSON.parse(raw) as AssetRecord[]) : [];
  } catch { return []; }
}

function persistAssets(records: AssetRecord[]): void {
  try { localStorage.setItem(ASSETS_KEY, JSON.stringify(records)); } catch { /* quota */ }
}

function loadNotifs(): DesignShareNotif[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFS_KEY);
    return raw ? (JSON.parse(raw) as DesignShareNotif[]) : [];
  } catch { return []; }
}

function persistNotifs(notifs: DesignShareNotif[]): void {
  try { localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs)); } catch { /* quota */ }
}

function loadFeedback(): DesignFeedbackMsg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as DesignFeedbackMsg[]) : [];
  } catch { return []; }
}

function persistFeedback(rows: DesignFeedbackMsg[]): void {
  try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(rows)); } catch { /* quota */ }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── storage change event (cross-tab + same-tab) ────────────────────────── */

const CHANGE_EVENT = "resonance:assets-changed";

function notifyChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/* ─── public helpers ─────────────────────────────────────────────────────── */

export function formatAssetDate(tsOrDate: Date | number): string {
  const d = tsOrDate instanceof Date ? tsOrDate : new Date(tsOrDate);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate();

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth()    === yesterday.getMonth()    &&
    d.getDate()     === yesterday.getDate();

  if (sameYesterday) return `Yesterday, ${timeStr}`;

  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function mimeLabel(mime: string): string {
  const map: Record<string, string> = {
    "image/png":       "PNG",
    "image/jpeg":      "JPG",
    "image/jpg":       "JPG",
    "image/gif":       "GIF",
    "image/webp":      "WEBP",
    "image/svg+xml":   "SVG",
    "application/pdf": "PDF",
    "audio/mpeg":      "MP3",
    "audio/wav":       "WAV",
    "video/mp4":       "MP4",
    "video/webm":      "WEBM",
    "text/plain":      "TXT",
  };
  return map[mime] ?? mime.split("/")[1]?.toUpperCase() ?? "FILE";
}

/* ─── Supabase Storage upload helpers ───────────────────────────────────── */

const BUCKET = "assets";

async function uploadToStorage(path: string, blob: Blob, mimeType: string): Promise<string> {
  // Try Supabase Storage first; fall back to an in-memory data URL so the app
  // still works even if the bucket doesn't exist or credentials are wrong.
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: mimeType, upsert: true });

    if (!error) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }
    console.warn("Supabase Storage upload failed, using data URL fallback:", error.message);
  } catch (e) {
    console.warn("Supabase Storage unavailable, using data URL fallback:", e);
  }

  // Fallback: convert blob → base64 data URL (stored in localStorage with asset record)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

/* ─── public API ─────────────────────────────────────────────────────────── */

/**
 * Subscribe to asset changes.  Returns an unsubscribe function.
 * Fires immediately with current data, then on every change.
 */
export function subscribeAssets(
  onData: (assets: AssetRecord[]) => void,
  _onError?: (err: Error) => void,
): () => void {
  // Deliver current state immediately
  onData([...loadAssets()].sort((a, b) => b.createdAt - a.createdAt));

  function handler() {
    onData([...loadAssets()].sort((a, b) => b.createdAt - a.createdAt));
  }

  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Upload a file and create an asset record.
 * Returns { promise } — resolves with the new AssetRecord.
 * Also exposes a fake task.on() so callers that track upload progress still work.
 */
type ProgressSnap = { bytesTransferred: number; totalBytes: number };

/**
 * Callbacks are held on a mutable object rather than in `let` bindings.
 *
 * With `let cb: Fn | null = null`, TypeScript's control-flow analysis narrows
 * the binding to `null` inside the async closure below — it cannot see that
 * task.on() assigns it first — so `cb?.()` resolves to `never` and errors with
 * "This expression is not callable". Object properties are not narrowed that
 * way, so this keeps the same runtime behaviour and typechecks.
 */
type UploadCallbacks = {
  progress?: (snap: ProgressSnap) => void;
  error?:    (err: Error) => void;
  complete?: () => void;
};

export function uploadAsset(file: File): {
  task: {
    on: (
      _event: string,
      onProgress?: ((snap: ProgressSnap) => void) | null,
      onError?:    ((err: Error) => void) | null,
      onComplete?: (() => void) | null,
    ) => void;
  };
  promise: Promise<AssetRecord>;
} {
  // onComplete is optional: ReferencesPanel subscribes to progress and error only.
  const cb: UploadCallbacks = {};

  const task = {
    on(
      _event: string,
      onProgress?: ((snap: ProgressSnap) => void) | null,
      onError?:    ((err: Error) => void) | null,
      onComplete?: (() => void) | null,
    ) {
      cb.progress = onProgress ?? undefined;
      cb.error    = onError    ?? undefined;
      cb.complete = onComplete ?? undefined;
    },
  };

  const promise = (async (): Promise<AssetRecord> => {
    try {
      const isImg = file.type.startsWith("image/");
      const path  = `uploads/${uid()}/${file.name}`;
      let previewUrl: string | null = null;

      if (isImg) {
        // Report indeterminate progress
        cb.progress?.({ bytesTransferred: 0, totalBytes: file.size });
        previewUrl = await uploadToStorage(path, file, file.type);
        cb.progress?.({ bytesTransferred: file.size, totalBytes: file.size });
      }

      // For non-images we store as a data-URL so we can still show icons
      const record: AssetRecord = {
        id:               uid(),
        name:             file.name,
        mimeType:         file.type || "application/octet-stream",
        source:           "uploaded",
        previewUrl,
        storagePath:      isImg ? path : null,
        designId:         null,
        characterId:      null,
        sceneId:          null,
        description:      null,
        shareStatus:      "not_shared",
        validationStatus: "pending",
        sharedAt:         null,
        createdAt:        Date.now(),
        updatedAt:        Date.now(),
      };

      const records = loadAssets();
      records.unshift(record);
      persistAssets(records);
      notifyChange();

      cb.complete?.();
      return record;
    } catch (err) {
      cb.error?.(err as Error);
      throw err;
    }
  })();

  return { task, promise };
}

/**
 * Create a new "created" asset from a canvas PNG blob.
 * Uploads the thumbnail to Supabase Storage, then writes the record to localStorage.
 */
export async function saveCreatedAsset(
  name: string,
  blob: Blob,
  mimeType: string,
  opts: SaveCreatedAssetOpts = {},
): Promise<AssetRecord> {
  const id   = uid();
  const path = `created/${id}/thumbnail.png`;

  const previewUrl = await uploadToStorage(path, blob, "image/png");

  const record: AssetRecord = {
    id,
    name,
    mimeType,
    source:           "created",
    previewUrl,
    storagePath:      path,
    designId:         null,
    characterId:      opts.characterId ?? null,
    sceneId:          opts.sceneId     ?? null,
    description:      opts.description ?? null,
    shareStatus:      "not_shared",
    validationStatus: "pending",
    sharedAt:         null,
    createdAt:        Date.now(),
    updatedAt:        Date.now(),
  };

  const records = loadAssets();
  records.unshift(record);
  persistAssets(records);
  notifyChange();

  return record;
}

/**
 * Link the Firestore/context design id back onto an existing asset record.
 */
export function linkDesignToAsset(assetId: string, designId: string): Promise<void> {
  const records = loadAssets();
  const idx = records.findIndex((r) => r.id === assetId);
  if (idx !== -1) {
    records[idx] = { ...records[idx], designId, updatedAt: Date.now() };
    persistAssets(records);
    notifyChange();
  }
  return Promise.resolve();
}

/**
 * Overwrite the thumbnail PNG for an existing created asset.
 */
export async function updateCreatedAsset(
  assetId:     string,
  storagePath: string,
  name:        string,
  blob:        Blob,
): Promise<void> {
  const previewUrl = await uploadToStorage(storagePath, blob, "image/png");

  const records = loadAssets();
  const idx = records.findIndex((r) => r.id === assetId);
  if (idx !== -1) {
    records[idx] = { ...records[idx], name, previewUrl, updatedAt: Date.now() };
    persistAssets(records);
    notifyChange();
  }
}

/**
 * Patch metadata fields (characterId, sceneId, description).
 */
export function updateAssetMeta(
  assetId: string,
  opts: { characterId?: string; sceneId?: string; description?: string },
): Promise<void> {
  const records = loadAssets();
  const idx = records.findIndex((r) => r.id === assetId);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...opts, updatedAt: Date.now() };
    persistAssets(records);
    notifyChange();
  }
  return Promise.resolve();
}

/**
 * Mark an asset as shared with the writer, set validation to pending,
 * and create a notification record.
 */
export function shareAssetWithWriter(asset: AssetRecord): Promise<void> {
  const now = Date.now();

  // Update the asset
  const records = loadAssets();
  const idx = records.findIndex((r) => r.id === asset.id);
  if (idx !== -1) {
    records[idx] = {
      ...records[idx],
      shareStatus:      "shared",
      validationStatus: "pending",
      sharedAt:         now,
      updatedAt:        now,
    };
    persistAssets(records);
    notifyChange();
  }

  // Write the notification
  const notif: DesignShareNotif = {
    id:          uid(),
    assetId:     asset.id,
    assetName:   asset.name,
    previewUrl:  asset.previewUrl,
    description: asset.description,
    characterId: asset.characterId,
    sceneId:     asset.sceneId,
    read:        false,
    createdAt:   now,
  };
  const notifs = loadNotifs();
  notifs.unshift(notif);
  persistNotifs(notifs);
  notifyChange();

  return Promise.resolve();
}

/**
 * Subscribe to design-share notifications (writer side).
 */
export function subscribeDesignShareNotifs(
  onData: (notifs: DesignShareNotif[]) => void,
  _onError?: (err: Error) => void,
): () => void {
  onData([...loadNotifs()].sort((a, b) => b.createdAt - a.createdAt));

  function handler() {
    onData([...loadNotifs()].sort((a, b) => b.createdAt - a.createdAt));
  }

  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Mark a notification as read. */
export function markNotifRead(notifId: string): Promise<void> {
  const notifs = loadNotifs();
  const idx = notifs.findIndex((n) => n.id === notifId);
  if (idx !== -1) {
    notifs[idx] = { ...notifs[idx], read: true };
    persistNotifs(notifs);
    notifyChange();
  }
  return Promise.resolve();
}

/** Set the writer's validation status on an asset. */
export function setValidationStatus(
  assetId: string,
  status: AssetValidationStatus,
): Promise<void> {
  const records = loadAssets();
  const idx = records.findIndex((r) => r.id === assetId);
  if (idx !== -1) {
    records[idx] = { ...records[idx], validationStatus: status, updatedAt: Date.now() };
    persistAssets(records);
    notifyChange();
  }
  return Promise.resolve();
}

/**
 * Send the designer feedback on a shared design.
 *
 * "revision" → the writer wants changes; the asset moves to Needs Revision.
 * "reject"   → the writer is turning the design down; the asset is Rejected.
 *
 * The message is appended to a per-asset thread (localStorage) and mirrored to
 * Supabase as a notification addressed to the designer, so it reaches them the
 * same way character design requests do.
 */
export function sendDesignFeedback(
  asset: { id: string; name: string; characterId?: string | null },
  kind: DesignFeedbackKind,
  message: string,
): Promise<void> {
  const now  = Date.now();
  const text = message.trim();

  // 1. Open the thread with the writer's decision message.
  appendChatMessage({
    id:        uid(),
    assetId:   asset.id,
    assetName: asset.name,
    from:      "writer",
    kind,
    message:   text,
    createdAt: now,
  });

  // 2. Move the asset to the matching validation status.
  const records = loadAssets();
  const idx = records.findIndex((r) => r.id === asset.id);
  if (idx !== -1) {
    records[idx] = {
      ...records[idx],
      validationStatus: kind === "reject" ? "rejected" : "needs_revision",
      updatedAt:        now,
    };
    persistAssets(records);
  }

  // 3. Mirror to Supabase so the designer is notified.
  syncPushBackground("app_notifications", [
    {
      id:          uid(),
      recipient:   "designer",
      type:        kind === "reject" ? "design-rejected" : "design-revision",
      assetId:     asset.id,
      characterId: asset.characterId ?? null,
      message:     text || (kind === "reject" ? `Rejected "${asset.name}"` : `Changes requested on "${asset.name}"`),
      read:        false,
      createdAt:   now,
    },
  ]);

  notifyChange();
  return Promise.resolve();
}

/** Append one message to the per-asset thread (newest kept anywhere in array). */
function appendChatMessage(msg: DesignFeedbackMsg): void {
  const rows = loadFeedback();
  rows.push(msg);
  persistFeedback(rows);
}

/**
 * Post an ordinary chat reply on an asset's thread — used by both the writer
 * and the designer to keep the conversation going after the initial decision.
 * Mirrors to Supabase addressed to the OTHER party so they get notified.
 */
export function postAssetChatMessage(
  asset: { id: string; name: string; characterId?: string | null },
  from: DesignChatFrom,
  message: string,
  kind: DesignChatKind = "message",
): Promise<void> {
  const text = message.trim();
  if (!text) return Promise.resolve();
  const now = Date.now();

  appendChatMessage({
    id:        uid(),
    assetId:   asset.id,
    assetName: asset.name,
    from,
    kind,
    message:   text,
    createdAt: now,
  });

  syncPushBackground("app_notifications", [
    {
      id:          uid(),
      recipient:   from === "writer" ? "designer" : "writer",
      type:        "design-chat",
      assetId:     asset.id,
      characterId: asset.characterId ?? null,
      message:     text,
      read:        false,
      createdAt:   now,
    },
  ]);

  notifyChange();
  return Promise.resolve();
}

/**
 * Subscribe to an asset's chat thread in CHRONOLOGICAL order (oldest → newest),
 * the natural order for a conversation view. Pass an assetId to scope to one
 * asset; omit it to receive every message (used by the designer's inbox).
 */
export function subscribeAssetChat(
  onData: (rows: DesignFeedbackMsg[]) => void,
  assetId?: string,
): () => void {
  if (typeof window === "undefined") return () => {};

  const emit = () => {
    const all = [...loadFeedback()].sort((a, b) => a.createdAt - b.createdAt);
    onData(assetId ? all.filter((m) => m.assetId === assetId) : all);
  };
  emit();

  window.addEventListener(CHANGE_EVENT, emit);
  window.addEventListener("storage", emit);
  return () => {
    window.removeEventListener(CHANGE_EVENT, emit);
    window.removeEventListener("storage", emit);
  };
}

/**
 * Subscribe to design feedback the DESIGNER needs to action — the writer's
 * revision/reject decisions across all assets, newest first. Drives the
 * "Design Feedback" section of the designer's Notifications page.
 */
export function subscribeDesignFeedback(
  onData: (rows: DesignFeedbackMsg[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const emit = () => {
    const decisions = [...loadFeedback()]
      .filter((m) => m.from === "writer" && (m.kind === "revision" || m.kind === "reject"))
      .sort((a, b) => b.createdAt - a.createdAt);
    onData(decisions);
  };
  emit();

  window.addEventListener(CHANGE_EVENT, emit);
  window.addEventListener("storage", emit);
  return () => {
    window.removeEventListener(CHANGE_EVENT, emit);
    window.removeEventListener("storage", emit);
  };
}

/* ─── chat read receipts / unread notifications ─────────────────────────── */

type ChatSeen = Record<DesignChatFrom, Record<string, number>>;

function loadSeen(): ChatSeen {
  if (typeof window === "undefined") return { writer: {}, designer: {} };
  try {
    const raw = localStorage.getItem(CHAT_SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ChatSeen>) : {};
    return { writer: parsed.writer ?? {}, designer: parsed.designer ?? {} };
  } catch { return { writer: {}, designer: {} }; }
}

function persistSeen(seen: ChatSeen): void {
  try { localStorage.setItem(CHAT_SEEN_KEY, JSON.stringify(seen)); } catch { /* quota */ }
}

/**
 * Mark an asset's conversation as read by `role` (called when that side opens
 * the thread). Clears the unread badge for messages up to now.
 */
export function markAssetChatSeen(assetId: string, role: DesignChatFrom): void {
  const seen = loadSeen();
  const latest = loadFeedback()
    .filter((m) => m.assetId === assetId)
    .reduce((max, m) => Math.max(max, m.createdAt), 0);
  const next = Math.max(latest, seen[role][assetId] ?? 0);
  if (next === (seen[role][assetId] ?? 0)) return;   // nothing new — avoid a needless event
  seen[role] = { ...seen[role], [assetId]: next };
  persistSeen(seen);
  notifyChange();
}

/**
 * Subscribe to the number of unread INBOUND chat messages for `role` — i.e.
 * replies written by the other party that this side hasn't opened yet. Drives
 * the sidebar badge and the new-message toast.
 */
export function subscribeUnreadChat(
  role: DesignChatFrom,
  onData: (info: { count: number; assetIds: string[]; latest: DesignFeedbackMsg | null }) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const emit = () => {
    const seen = loadSeen()[role] ?? {};
    const unread = loadFeedback().filter(
      (m) => m.from !== role && m.createdAt > (seen[m.assetId] ?? 0),
    );
    const assetIds = [...new Set(unread.map((m) => m.assetId))];
    const latest = unread.reduce<DesignFeedbackMsg | null>(
      (a, b) => (!a || b.createdAt > a.createdAt ? b : a),
      null,
    );
    onData({ count: unread.length, assetIds, latest });
  };
  emit();

  window.addEventListener(CHANGE_EVENT, emit);
  window.addEventListener("storage", emit);
  return () => {
    window.removeEventListener(CHANGE_EVENT, emit);
    window.removeEventListener("storage", emit);
  };
}

/** Rename an asset. */
export function renameAsset(id: string, newName: string): Promise<void> {
  const records = loadAssets();
  const idx = records.findIndex((r) => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], name: newName, updatedAt: Date.now() };
    persistAssets(records);
    notifyChange();
  }
  return Promise.resolve();
}

/** Delete an asset (removes from localStorage; optionally cleans up Storage). */
export async function deleteAsset(record: AssetRecord): Promise<void> {
  // Best-effort Storage cleanup — don't block on failure
  if (record.storagePath) {
    supabase.storage.from(BUCKET).remove([record.storagePath]).catch(() => {});
  }

  const records = loadAssets().filter((r) => r.id !== record.id);
  persistAssets(records);
  notifyChange();
}

/** Duplicate an asset record (no Storage copy needed). */
export function duplicateAsset(record: AssetRecord): Promise<AssetRecord> {
  const copy: AssetRecord = {
    ...record,
    id:               uid(),
    name:             `${record.name} (copy)`,
    designId:         null,
    shareStatus:      "not_shared",
    validationStatus: "pending",
    sharedAt:         null,
    createdAt:        Date.now(),
    updatedAt:        Date.now(),
  };
  const records = loadAssets();
  records.unshift(copy);
  persistAssets(records);
  notifyChange();
  return Promise.resolve(copy);
}
