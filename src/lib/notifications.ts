/*
 * src/lib/notifications.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Data-access layer for the notifications system.
 *
 * All DB types mirror the snake_case columns; exported camelCase types are
 * used throughout the UI.
 *
 * NO authentication — persona is determined by route (/writer vs /designer).
 * RLS is OFF by team decision; the anon key in the browser bundle grants full
 * read/write. This is intentional for the hackathon.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── DB row shapes (snake_case) ───────────────────────────────────────────────

type NotificationRow = {
  id: string;
  project_id:   string | null;
  asset_id:     string | null;
  character_id: string | null;
  recipient:    "writer" | "designer";
  sender:       "writer" | "designer" | "system";
  type:         string;
  title:        string;
  message:      string;
  payload:      Record<string, unknown>;
  status:       "unread" | "read" | "accepted" | "revision-requested";
  severity:     "info" | "success" | "warning" | "alert";
  parent_id:    string | null;
  created_at:   string;
  updated_at:   string;
};

type PreferencesRow = {
  id:         string;
  persona:    "writer" | "designer";
  in_app:     boolean;
  desktop:    boolean;
  mobile:     boolean;
  events:     Record<string, boolean>;
  updated_at: string;
};

// ─── Exported camelCase types ─────────────────────────────────────────────────

export type Notification = {
  id:          string;
  projectId:   string | null;
  assetId:     string | null;
  characterId: string | null;
  recipient:   "writer" | "designer";
  sender:      "writer" | "designer" | "system";
  type:        string;
  title:       string;
  message:     string;
  payload:     Record<string, unknown>;
  status:      "unread" | "read" | "accepted" | "revision-requested";
  severity:    "info" | "success" | "warning" | "alert";
  parentId:    string | null;
  createdAt:   string;
  updatedAt:   string;
};

export type NotificationPreferences = {
  id:        string;
  persona:   "writer" | "designer";
  inApp:     boolean;
  desktop:   boolean;
  mobile:    boolean;
  events:    Record<string, boolean>;
  updatedAt: string;
};

export type CreateNotificationInput = {
  projectId?:   string;
  assetId?:     string;
  characterId?: string;
  recipient:    "writer" | "designer";
  sender:       "writer" | "designer" | "system";
  type:         string;
  title:        string;
  message:      string;
  payload?:     Record<string, unknown>;
  severity?:    "info" | "success" | "warning" | "alert";
  parentId?:    string;
};

export type RequestRevisionInput = {
  note:          string;
  references?:   string[];
  expectations?: string;
};

export type ListNotificationsOptions = {
  status?: "unread" | "read" | "accepted" | "revision-requested";
  type?:   string;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function rowToNotification(row: NotificationRow): Notification {
  return {
    id:          row.id,
    projectId:   row.project_id,
    assetId:     row.asset_id,
    characterId: row.character_id,
    recipient:   row.recipient,
    sender:      row.sender,
    type:        row.type,
    title:       row.title,
    message:     row.message,
    payload:     row.payload,
    status:      row.status,
    severity:    row.severity,
    parentId:    row.parent_id,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

function rowToPreferences(row: PreferencesRow): NotificationPreferences {
  return {
    id:        row.id,
    persona:   row.persona,
    inApp:     row.in_app,
    desktop:   row.desktop,
    mobile:    row.mobile,
    events:    row.events,
    updatedAt: row.updated_at,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Insert a new notification. Returns the created row. */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      project_id:   input.projectId   ?? null,
      asset_id:     input.assetId     ?? null,
      character_id: input.characterId ?? null,
      recipient:    input.recipient,
      sender:       input.sender,
      type:         input.type,
      title:        input.title,
      message:      input.message,
      payload:      input.payload     ?? {},
      severity:     input.severity    ?? "info",
      parent_id:    input.parentId    ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToNotification(data as NotificationRow);
}

/** List notifications for a recipient, newest first. */
export async function listNotifications(
  recipient: "writer" | "designer",
  options: ListNotificationsOptions = {},
): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient", recipient)
    .order("created_at", { ascending: false });

  if (options.status) query = query.eq("status", options.status);
  if (options.type)   query = query.eq("type",   options.type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as NotificationRow[]).map(rowToNotification);
}

/** Mark a notification as read. No-ops if already actioned. */
export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ status: "read" })
    .eq("id", id)
    .eq("status", "unread"); // only transition from unread
  if (error) throw new Error(error.message);
}

/** Mark a notification as unread (toggle). */
export async function markUnread(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ status: "unread" })
    .eq("id", id)
    .eq("status", "read");
  if (error) throw new Error(error.message);
}

/**
 * Accept a designer's artwork/design.
 * Sets status = 'accepted' on the given notification.
 */
export async function acceptDesign(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ status: "accepted" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Request a revision.
 *
 * 1. Sets the original notification's status to 'revision-requested'.
 * 2. Creates a NEW notification of type 'revision-request' addressed to the
 *    designer, with parent_id pointing at the original, and the writer's note,
 *    reference links, and updated expectations stored in payload.
 *
 * Returns the newly created revision-request notification.
 */
export async function requestRevision(
  originalId: string,
  input: RequestRevisionInput,
): Promise<Notification> {
  // Fetch original so we can copy context into the new notification.
  const { data: orig, error: fetchErr } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", originalId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);
  const original = orig as NotificationRow;

  // 1. Mark original as revision-requested.
  const { error: updateErr } = await supabase
    .from("notifications")
    .update({ status: "revision-requested" })
    .eq("id", originalId);
  if (updateErr) throw new Error(updateErr.message);

  // 2. Create the revision-request notification for the designer.
  return createNotification({
    projectId:   original.project_id   ?? undefined,
    assetId:     original.asset_id     ?? undefined,
    characterId: original.character_id ?? undefined,
    recipient:   "designer",
    sender:      "writer",
    type:        "revision-request",
    title:       `Revision requested: ${original.title}`,
    message:     input.note,
    severity:    "warning",
    parentId:    originalId,
    payload:     {
      originalTitle:  original.title,
      note:           input.note,
      references:     input.references   ?? [],
      expectations:   input.expectations ?? "",
    },
  });
}

// ─── Preferences ──────────────────────────────────────────────────────────────

/** Get notification preferences for a persona. Returns null if no row exists. */
export async function getPreferences(
  persona: "writer" | "designer",
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("persona", persona)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToPreferences(data as PreferencesRow);
}

/** Upsert notification preferences for a persona. */
export async function updatePreferences(
  persona: "writer" | "designer",
  patch: Partial<Omit<NotificationPreferences, "id" | "persona" | "updatedAt">>,
): Promise<NotificationPreferences> {
  const update: Partial<PreferencesRow> = {};
  if (patch.inApp   !== undefined) update.in_app  = patch.inApp;
  if (patch.desktop !== undefined) update.desktop = patch.desktop;
  if (patch.mobile  !== undefined) update.mobile  = patch.mobile;
  if (patch.events  !== undefined) update.events  = patch.events;

  const { data, error } = await supabase
    .from("notification_preferences")
    .update(update)
    .eq("persona", persona)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToPreferences(data as PreferencesRow);
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to live notification inserts for a recipient via Supabase Realtime.
 *
 * The callback receives the full Notification object whenever a row is
 * inserted or updated in public.notifications with a matching recipient.
 *
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeNotifications(
  recipient: "writer" | "designer",
  cb: (notification: Notification) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`notifications:${recipient}`)
    .on(
      "postgres_changes",
      {
        event:  "*",
        schema: "public",
        table:  "notifications",
        filter: `recipient=eq.${recipient}`,
      },
      (payload) => {
        // payload.new is the inserted/updated row.
        if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
          cb(rowToNotification(payload.new as NotificationRow));
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
