/**
 * cloudSync.ts
 *
 * Mirrors the app's localStorage collections into Supabase so that characters,
 * world entities, chapters, assets and notifications survive a cache clear and
 * are visible to the rest of the team.
 *
 * Design notes
 * ────────────
 * localStorage stays the source of truth for reads. This module only *pushes*
 * on write and *pulls* on first hydrate. That keeps every existing context
 * working unchanged — none of them have to become async.
 *
 * Every function here is FAIL-SOFT: a network error, a missing table or a bad
 * row is logged and swallowed. Losing the cloud mirror must never break the
 * app mid-demo.
 *
 * Ids are the app's own `${Date.now()}-${random}` strings, not UUIDs, which is
 * why every id column in supabase/worldmap-schema.sql is text.
 */

import { supabase } from "@/lib/supabase";

/* ─── table map ──────────────────────────────────────────────────────────── */

export type SyncTable =
  | "app_projects"
  | "app_chapters"
  | "app_characters"
  | "app_world_entities"
  | "app_world_relationships"
  | "app_assets"
  | "app_notifications";

/** Row shape: promoted columns for readability + the full object in `data`. */
type SyncRow = Record<string, unknown> & { id: string; data: unknown };

/**
 * Pull out the columns each table promotes. Everything else rides in `data`,
 * so adding a field to a client type needs no schema change.
 */
function toRow(table: SyncTable, item: Record<string, unknown>): SyncRow | null {
  const id = typeof item.id === "string" ? item.id : null;
  if (!id) return null;

  const base = { id, data: item };
  const s = (k: string): string | null =>
    typeof item[k] === "string" ? (item[k] as string) : null;
  const n = (k: string): number | null =>
    typeof item[k] === "number" ? (item[k] as number) : null;
  const b = (k: string): boolean =>
    item[k] === true;

  switch (table) {
    case "app_projects":
      return { ...base, name: s("name") ?? s("title") ?? "Untitled" };

    case "app_chapters":
      return {
        ...base,
        project_id:  s("projectId") ?? "",
        title:       s("title") ?? "",
        order_index: n("order") ?? 0,
        content:     s("content") ?? "",
      };

    case "app_characters":
      return {
        ...base,
        project_id:  s("projectId") ?? "",
        name:        s("name") ?? "",
        role:        s("role"),
        is_draft:    b("isDraft"),
        description: s("description"),
      };

    case "app_world_entities":
      return {
        ...base,
        project_id:  s("projectId") ?? "",
        label:       s("label") ?? "",
        kind:        s("kind") ?? "other",
        status:      s("status"),
        description: s("description"),
      };

    case "app_world_relationships":
      return {
        ...base,
        project_id: s("projectId") ?? "",
        source_id:  s("sourceId") ?? s("fromId"),
        target_id:  s("targetId") ?? s("toId"),
        kind:       s("kind"),
      };

    case "app_assets":
      return {
        ...base,
        project_id:        s("projectId"),
        name:              s("name") ?? "",
        description:       s("description"),
        mime_type:         s("mimeType"),
        source:            s("source"),
        preview_url:       s("previewUrl"),
        storage_path:      s("storagePath"),
        design_id:         s("designId"),
        character_id:      s("characterId"),
        scene_id:          s("sceneId"),
        share_status:      s("shareStatus") ?? "not_shared",
        validation_status: s("validationStatus") ?? "pending",
      };

    case "app_notifications":
      return {
        ...base,
        project_id:   s("projectId"),
        recipient:    s("recipient") ?? "writer",
        type:         s("type") ?? "design-shared",
        asset_id:     s("assetId"),
        character_id: s("characterId"),
        scene_id:     s("sceneId"),
        message:      s("message") ?? s("assetName"),
        read:         b("read"),
      };
  }
}

/* ─── push ───────────────────────────────────────────────────────────────── */

/**
 * Upsert a whole collection. Call after any localStorage write.
 *
 * Deliberately NOT awaited by callers — it runs in the background so typing in
 * the editor never blocks on the network.
 */
export async function syncPush(
  table: SyncTable,
  items: readonly unknown[],
): Promise<void> {
  if (typeof window === "undefined") return;   // server render — nothing to sync
  if (!items.length) return;

  const rows = items
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => toRow(table, i))
    .filter((r): r is SyncRow => r !== null);

  if (!rows.length) return;

  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    // Fail soft: the app keeps working off localStorage.
    console.warn(`[cloudSync] ${table} push failed:`, error.message);
  }
}

/** Fire-and-forget wrapper, for use inside synchronous save helpers. */
export function syncPushBackground(table: SyncTable, items: readonly unknown[]): void {
  void syncPush(table, items).catch(() => {});
}

/** Remove rows that no longer exist locally (e.g. a deleted character). */
export async function syncDelete(table: SyncTable, ids: readonly string[]): Promise<void> {
  if (typeof window === "undefined" || !ids.length) return;
  const { error } = await supabase.from(table).delete().in("id", ids as string[]);
  if (error) console.warn(`[cloudSync] ${table} delete failed:`, error.message);
}

/* ─── pull ───────────────────────────────────────────────────────────────── */

/**
 * Fetch a collection back out of Supabase, returning the original client
 * objects from the `data` column.
 *
 * Returns null — not [] — when the fetch fails, so callers can tell "cloud
 * unavailable, keep localStorage" apart from "cloud is genuinely empty".
 */
export async function syncPull<T>(
  table: SyncTable,
  projectId?: string,
): Promise<T[] | null> {
  if (typeof window === "undefined") return null;

  let q = supabase.from(table).select("data");
  if (projectId && table !== "app_projects") q = q.eq("project_id", projectId);

  const { data, error } = await q;
  if (error) {
    console.warn(`[cloudSync] ${table} pull failed:`, error.message);
    return null;
  }
  return (data ?? [])
    .map((r) => (r as { data: T }).data)
    .filter(Boolean);
}

/* ─── diagnostics ────────────────────────────────────────────────────────── */

/**
 * Verify every sync table is reachable. Returns a per-table result rather than
 * throwing, so a caller can render a status list.
 */
export async function checkSyncTables(): Promise<
  { table: SyncTable; ok: boolean; detail: string }[]
> {
  const tables: SyncTable[] = [
    "app_projects", "app_chapters", "app_characters", "app_world_entities",
    "app_world_relationships", "app_assets", "app_notifications",
  ];
  return Promise.all(
    tables.map(async (table) => {
      const { error } = await supabase.from(table).select("id").limit(1);
      return { table, ok: !error, detail: error ? error.message : "reachable" };
    }),
  );
}
