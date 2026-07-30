/**
 * assetLibrary.ts
 *
 * Supabase replacement for src/lib/assets.ts (Firestore).
 *
 * Exports an API surface that is intentionally identical to assets.ts so any
 * call site can swap with a one-line import change:
 *
 *   - import ... from "@/lib/assets";
 *   + import ... from "@/lib/assetLibrary";
 *
 * The AssetRecord type extends the Firestore shape with Supabase-specific
 * collaboration fields (shareStatus, validationStatus, etc.).
 *
 * uploadAsset() returns { task, promise } — the same shape as the Firebase
 * version so the designer's assets page can track progress without changes.
 * The `task` is a lightweight shim that emits the state_changed events
 * synchronously / via Promise resolution (there is no streaming progress from
 * Supabase Storage, so it jumps from 0 → 100 on completion).
 *
 * LIMIT: desktop share-status badge and share date require share_status and
 * shared_at columns in the Supabase `assets` table (see supabase/schema.sql).
 */

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";

/* ─── Re-export helpers from assets.ts so callers need no other imports ──── */
export { formatAssetDate, mimeLabel } from "@/lib/assets";

/* ─── types ──────────────────────────────────────────────────────────────── */

export type AssetSource = "created" | "uploaded";

export interface AssetRecord {
  id:               string;
  name:             string;
  mimeType:         string;
  source:           AssetSource;
  previewUrl:       string | null;
  storagePath:      string | null;
  designId:         string | null;
  createdAt:        Date;
  updatedAt:        Date;
  // Supabase-only collaboration fields
  projectId:        string | null;
  characterId:      string | null;
  shareStatus:      "not_shared" | "shared";
  sharedAt:         Date | null;
  validationStatus: "pending" | "approved" | "needs_revision";
  validationNote:   string | null;
}

/* ─── DB row shape ───────────────────────────────────────────────────────── */

type AssetRow = {
  id:                string;
  name:              string;
  mime_type:         string;
  source:            AssetSource;
  preview_url:       string | null;
  storage_path:      string | null;
  design_id:         string | null;
  created_at:        string;
  updated_at:        string;
  project_id:        string | null;
  character_id:      string | null;
  share_status:      "not_shared" | "shared";
  shared_at:         string | null;
  validation_status: "pending" | "approved" | "needs_revision";
  validation_note:   string | null;
};

function rowToRecord(row: AssetRow): AssetRecord {
  return {
    id:               row.id,
    name:             row.name,
    mimeType:         row.mime_type,
    source:           row.source,
    previewUrl:       row.preview_url,
    storagePath:      row.storage_path,
    designId:         row.design_id,
    createdAt:        new Date(row.created_at),
    updatedAt:        new Date(row.updated_at),
    projectId:        row.project_id,
    characterId:      row.character_id,
    shareStatus:      row.share_status ?? "not_shared",
    sharedAt:         row.shared_at ? new Date(row.shared_at) : null,
    validationStatus: row.validation_status ?? "pending",
    validationNote:   row.validation_note,
  };
}

function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Upload task shim ───────────────────────────────────────────────────── */
// Mimics enough of Firebase's UploadTask for the designer/assets/page.tsx
// progress callbacks.  Supabase Storage does not stream progress, so we
// report 0 → 100 in two synthetic events.

type StateChangedNext     = (snap: { bytesTransferred: number; totalBytes: number }) => void;
type StateChangedError    = (err: Error) => void;
type StateChangedComplete = () => void;

export class SupabaseUploadTask {
  private _nextCb:     StateChangedNext     | null = null;
  private _errorCb:    StateChangedError    | null = null;
  private _completeCb: StateChangedComplete | null = null;

  on(
    _event: "state_changed",
    next:     StateChangedNext,
    error:    StateChangedError,
    complete: StateChangedComplete,
  ): this {
    this._nextCb     = next;
    this._errorCb    = error;
    this._completeCb = complete;
    return this;
  }

  /** Called internally once the upload is known to have started. */
  _emitStart(totalBytes: number) {
    this._nextCb?.({ bytesTransferred: 0, totalBytes });
  }

  /** Called internally once the upload resolves. */
  _emitComplete(totalBytes: number) {
    this._nextCb?.({ bytesTransferred: totalBytes, totalBytes });
    this._completeCb?.();
  }

  /** Called internally on error. */
  _emitError(err: Error) {
    this._errorCb?.(err);
  }
}

/* ─── public API ─────────────────────────────────────────────────────────── */

/**
 * Fetch all assets, ordered by creation date descending.
 */
export async function listAssets(projectId?: string): Promise<AssetRecord[]> {
  let query = supabase.from("assets").select("*").order("created_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as AssetRow[]).map(rowToRecord);
}

/**
 * Subscribe to real-time asset changes.  Returns an unsubscribe function.
 *
 * NOTE: Supabase Realtime does not deliver the full row on DELETE events,
 * so we refetch the full list on any change to keep the UI accurate.
 */
export function subscribeAssets(
  onData:   (assets: AssetRecord[]) => void,
  onError?: (err: Error) => void,
): () => void {
  // Initial fetch
  listAssets()
    .then(onData)
    .catch((e) => onError?.(e instanceof Error ? e : new Error(String(e))));

  const channel: RealtimeChannel = supabase
    .channel("assets:all")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "assets" },
      () => {
        listAssets()
          .then(onData)
          .catch((e) => onError?.(e instanceof Error ? e : new Error(String(e))));
      },
    )
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}

/**
 * Upload a file to Supabase Storage, then insert a metadata row.
 *
 * Returns { task, promise } — same shape as the Firebase version so the
 * designer assets page can call task.on("state_changed", ...) unchanged.
 *
 * LIMIT: no streaming progress; the progress callback fires twice:
 * once at 0% (upload started) and once at 100% (upload complete).
 */
export function uploadAsset(
  file: File,
  extra?: { projectId?: string; characterId?: string },
): { task: SupabaseUploadTask; promise: Promise<AssetRecord> } {
  const task = new SupabaseUploadTask();

  const promise = (async (): Promise<AssetRecord> => {
    task._emitStart(file.size);

    const path = `uploads/${uid()}/${file.name}`;
    const { error: storageErr } = await supabase.storage
      .from("assets")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (storageErr) {
      task._emitError(new Error(storageErr.message));
      throw new Error(storageErr.message);
    }

    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
    const previewUrl = isImage(file.type) ? (urlData?.publicUrl ?? null) : null;

    const { data, error: insertErr } = await supabase
      .from("assets")
      .insert({
        name:              file.name,
        mime_type:         file.type || "application/octet-stream",
        source:            "uploaded" as AssetSource,
        preview_url:       previewUrl,
        storage_path:      path,
        design_id:         null,
        project_id:        extra?.projectId  ?? null,
        character_id:      extra?.characterId ?? null,
        share_status:      "not_shared",
        validation_status: "pending",
      })
      .select()
      .single();

    if (insertErr) {
      task._emitError(new Error(insertErr.message));
      throw new Error(insertErr.message);
    }

    task._emitComplete(file.size);
    return rowToRecord(data as AssetRow);
  })();

  return { task, promise };
}

/**
 * Save a canvas PNG blob as a new "created" asset.
 */
export async function saveAsset(opts: {
  name:         string;
  blob:         Blob;
  mimeType:     string;
  projectId?:   string;
  characterId?: string;
  designId?:    string;
  storagePath?: string;
  previewUrl?:  string;
}): Promise<AssetRecord> {
  let storagePath = opts.storagePath ?? null;
  let previewUrl  = opts.previewUrl  ?? null;

  if (opts.blob.size > 0 && !storagePath) {
    const path = `created/${uid()}/thumbnail.png`;
    const { error: storageErr } = await supabase.storage
      .from("assets")
      .upload(path, opts.blob, { cacheControl: "3600", upsert: false });
    if (storageErr) throw new Error(storageErr.message);
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
    storagePath = path;
    previewUrl  = isImage(opts.mimeType) ? (urlData?.publicUrl ?? null) : null;
  }

  const { data, error } = await supabase
    .from("assets")
    .insert({
      name:              opts.name,
      mime_type:         opts.mimeType,
      source:            "created" as AssetSource,
      preview_url:       previewUrl,
      storage_path:      storagePath,
      design_id:         opts.designId  ?? null,
      project_id:        opts.projectId ?? null,
      character_id:      opts.characterId ?? null,
      share_status:      "not_shared",
      validation_status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToRecord(data as AssetRow);
}

/* ─── Sketchpad bridge ───────────────────────────────────────────────────── */
// These three mirror the Firestore signatures in assets.ts exactly so
// src/app/designer/page.tsx swaps modules with a one-line import change.

/**
 * Create a new "created" asset from a canvas PNG blob.
 * Thin wrapper over saveAsset() keeping the positional Firestore signature.
 */
export async function saveCreatedAsset(
  name:     string,
  blob:     Blob,
  mimeType: string,
  extra?:   { projectId?: string; characterId?: string },
): Promise<AssetRecord> {
  return saveAsset({
    name,
    blob,
    mimeType,
    projectId:   extra?.projectId,
    characterId: extra?.characterId,
  });
}

/**
 * Write the design id back onto the asset row so cards can deep-link to
 * ?design=<designId>.
 *
 * NOTE: designs live in DesignerContext (localStorage), NOT Postgres — their
 * ids look like "1785333975123-a3f9k2", not UUIDs. So assets.design_id must be
 * `text`, not `uuid`. See the migration note in supabase/schema.sql.
 */
export async function linkDesignToAsset(
  assetId:  string,
  designId: string,
): Promise<void> {
  const { error } = await supabase
    .from("assets")
    .update({ design_id: designId })
    .eq("id", assetId);
  if (error) throw new Error(error.message);
}

/**
 * Update an EXISTING created-asset thumbnail in place and refresh its metadata.
 * Never creates a duplicate: the Storage path is reused and overwritten
 * (upsert: true), keeping Storage tidy.
 */
export async function updateCreatedAsset(
  assetId:     string,
  storagePath: string,
  name:        string,
  blob:        Blob,
): Promise<void> {
  const { error: storageErr } = await supabase.storage
    .from("assets")
    .upload(storagePath, blob, { cacheControl: "3600", upsert: true });
  if (storageErr) throw new Error(storageErr.message);

  const { data: urlData } = supabase.storage.from("assets").getPublicUrl(storagePath);

  // updated_at is maintained by the assets_set_updated_at trigger.
  const { error } = await supabase
    .from("assets")
    .update({ name, preview_url: urlData?.publicUrl ?? null })
    .eq("id", assetId);
  if (error) throw new Error(error.message);
}

/** Rename an asset (metadata only). */
export async function renameAsset(id: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from("assets")
    .update({ name: newName })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Update an asset's description. */
export async function updateAssetDescription(id: string, description: string): Promise<void> {
  const { error } = await supabase
    .from("assets")
    .update({ description })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Delete an asset — removes the Storage file (if any) then the DB row.
 * Storage errors are swallowed if the file was already missing.
 */
export async function deleteAsset(record: AssetRecord): Promise<void> {
  if (record.storagePath) {
    const { error: storageErr } = await supabase.storage
      .from("assets")
      .remove([record.storagePath]);
    // Swallow "not found" errors — object already gone.
    if (storageErr && !storageErr.message.includes("not found")) {
      console.warn("deleteAsset storage error:", storageErr.message);
    }
  }
  const { error } = await supabase.from("assets").delete().eq("id", record.id);
  if (error) throw new Error(error.message);
}

/**
 * Duplicate a "created" asset record (no Storage copy — preview URL is reused).
 */
export async function duplicateAsset(record: AssetRecord): Promise<AssetRecord> {
  const { data, error } = await supabase
    .from("assets")
    .insert({
      name:              `${record.name} (copy)`,
      mime_type:         record.mimeType,
      source:            record.source,
      preview_url:       record.previewUrl,
      storage_path:      record.storagePath,
      design_id:         null,
      project_id:        record.projectId,
      character_id:      record.characterId,
      share_status:      "not_shared",
      validation_status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToRecord(data as AssetRow);
}

/**
 * Set the asset's validation status (used by the Research Agent).
 */
export async function setValidationStatus(
  id:     string,
  status: "pending" | "approved" | "needs_revision",
  note?:  string,
): Promise<void> {
  const { error } = await supabase
    .from("assets")
    .update({
      validation_status: status,
      validated_at:      new Date().toISOString(),
      validation_note:   note ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Share an asset with the writer.
 *
 * IDEMPOTENT — if share_status is already 'shared', returns early without
 * creating a second notification.
 *
 * Side-effect: inserts a notification row for the writer.
 *
 * Auto-threads: if the asset has a characterId, we query for the most recent
 * unresolved character-request notification (status unread or read) addressed
 * to the designer for that character, and link the new notification via
 * parent_id.  You can also pass an explicit `linkedNotificationId` to override.
 */
export async function shareAssetWithWriter(
  record: AssetRecord,
  opts?: { linkedNotificationId?: string },
): Promise<void> {
  if (record.shareStatus === "shared") return; // idempotent

  // 1. Resolve the linked character-request notification.
  let linkedId = opts?.linkedNotificationId;
  if (!linkedId && record.characterId) {
    const { data } = await supabase
      .from("notifications")
      .select("id")
      .eq("recipient", "designer")
      .eq("type", "character-request")
      .eq("character_id", record.characterId)
      .in("status", ["unread", "read"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) linkedId = (data as { id: string }).id;
  }

  // 2. Mark the asset as shared.
  const { error: updateErr } = await supabase
    .from("assets")
    .update({ share_status: "shared", shared_at: new Date().toISOString() })
    .eq("id", record.id);
  if (updateErr) throw new Error(updateErr.message);

  // 3. If linked to an existing request notification, mark it accepted.
  if (linkedId) {
    await supabase
      .from("notifications")
      .update({ status: "accepted" })
      .eq("id", linkedId);
  }

  // 4. Create the writer notification.
  await createNotification({
    recipient:   "writer",
    sender:      "designer",
    type:        "asset-shared",
    title:       "New design ready for review",
    message:     `${record.name} is ready for your review.`,
    severity:    "info",
    assetId:     record.id,
    characterId: record.characterId ?? undefined,
    projectId:   record.projectId   ?? undefined,
    parentId:    linkedId,
    payload: {
      assetName:  record.name,
      previewUrl: record.previewUrl ?? undefined,
    },
  });
}

/**
 * Re-share a previously revision-requested asset as `artwork-updated`.
 *
 * Finds the most recent `revision-request` notification for this asset
 * (addressed to the designer) and threads the new notification to it.
 */
export async function reshareAssetWithWriter(record: AssetRecord): Promise<void> {
  // Find the most recent revision-request for this asset.
  let parentId: string | undefined;
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("asset_id", record.id)
    .eq("type", "revision-request")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) parentId = (data as { id: string }).id;

  // Reset share_status so writer sees updated badge.
  await supabase
    .from("assets")
    .update({ share_status: "shared", shared_at: new Date().toISOString() })
    .eq("id", record.id);

  await createNotification({
    recipient:   "writer",
    sender:      "designer",
    type:        "artwork-updated",
    title:       "Artwork updated",
    message:     `${record.name} has been updated per your revisions.`,
    severity:    "success",
    assetId:     record.id,
    characterId: record.characterId ?? undefined,
    projectId:   record.projectId   ?? undefined,
    parentId,
    payload: {
      assetName:  record.name,
      previewUrl: record.previewUrl ?? undefined,
    },
  });
}
