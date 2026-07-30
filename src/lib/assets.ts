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

/* ─── types ──────────────────────────────────────────────────────────────── */

export type AssetSource = "created" | "uploaded";

export type AssetShareStatus      = "not_shared" | "shared";
export type AssetValidationStatus = "pending"    | "approved" | "needs_revision";

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

/* ─── localStorage helpers ───────────────────────────────────────────────── */

const ASSETS_KEY = "resonance:assets:v1";
const NOTIFS_KEY = "resonance:design-share-notifs:v1";

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
export function uploadAsset(file: File): {
  task: {
    on: (
      _event: string,
      onProgress: ((snap: { bytesTransferred: number; totalBytes: number }) => void) | null,
      onError:    ((err: Error) => void) | null,
      onComplete: (() => void) | null,
    ) => void;
  };
  promise: Promise<AssetRecord>;
} {
  let _onProgress: ((snap: { bytesTransferred: number; totalBytes: number }) => void) | null = null;
  let _onError:    ((err: Error) => void) | null = null;
  let _onComplete: (() => void) | null = null;

  const task = {
    on(
      _event: string,
      onProgress: ((snap: { bytesTransferred: number; totalBytes: number }) => void) | null,
      onError:    ((err: Error) => void) | null,
      onComplete: (() => void) | null,
    ) {
      _onProgress = onProgress;
      _onError    = onError;
      _onComplete = onComplete;
    },
  };

  const promise = (async (): Promise<AssetRecord> => {
    try {
      const isImg = file.type.startsWith("image/");
      const path  = `uploads/${uid()}/${file.name}`;
      let previewUrl: string | null = null;

      if (isImg) {
        // Report indeterminate progress
        _onProgress?.({ bytesTransferred: 0, totalBytes: file.size });
        previewUrl = await uploadToStorage(path, file, file.type);
        _onProgress?.({ bytesTransferred: file.size, totalBytes: file.size });
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

      _onComplete?.();
      return record;
    } catch (err) {
      _onError?.(err as Error);
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
