/**
 * storyGraph.ts
 *
 * Data layer for the Story Graph feature.
 *
 * All reads and writes go through the Supabase client.  The module is
 * intentionally free of React — it can be called from components, contexts,
 * or route handlers.
 *
 * Key design decisions
 * ────────────────────
 * • applyAcceptedNotification is IDEMPOTENT.  It stores the notification's
 *   local-storage ID in metadata->>'source_id' and checks for an existing
 *   node with that value before inserting.  The unique constraint on
 *   graph_edges (source_id, target_id, relationship) handles edge deduplication.
 *
 * • source_notification_id (uuid FK column) is left null when the notification
 *   system does not yet have Supabase-backed IDs.  Idempotency is handled
 *   entirely through metadata->>'source_id'.
 *
 * • subscribeGraph uses Supabase Realtime on the graph_nodes and graph_edges
 *   tables.  The returned function unsubscribes both channels.
 *
 * • The @xyflow/react Node and Edge shapes are returned directly from
 *   listGraph so callers have no mapping work to do.
 */

import type { Node, Edge } from "@xyflow/react";
import { supabase } from "@/lib/supabase";

// ─── Public types ─────────────────────────────────────────────────────────────

export type NodeKind =
  | "character"
  | "organization"
  | "location"
  | "object"
  | "event"
  | "story-arc";

export type GraphNode = {
  id: string;
  project_id: string;
  kind: NodeKind;
  label: string;
  summary?: string | null;
  /** Persisted node position and any extra writer-set fields */
  metadata: Record<string, unknown>;
  source_notification_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type GraphEdge = {
  id: string;
  project_id: string;
  source_id: string;
  target_id: string;
  relationship: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GraphData = {
  nodes: Node<GraphNode>[];
  edges: Edge[];
};

// ─── Colour palette by kind (matches design tokens) ──────────────────────────

const KIND_COLORS: Record<NodeKind, string> = {
  character:    "#d9a84e",  // gold-2
  organization: "#a78bfa",  // violet-400
  location:     "#38bdf8",  // sky-400
  object:       "#9ca3af",  // gray-400
  event:        "#34d399",  // emerald-400
  "story-arc":  "#f472b6",  // pink-400
};

// ─── Position helpers ─────────────────────────────────────────────────────────

function defaultPosition(index: number, total: number): { x: number; y: number } {
  const cols = Math.max(3, Math.ceil(Math.sqrt(total)));
  return {
    x: (index % cols) * 260,
    y: Math.floor(index / cols) * 200,
  };
}

// ─── listGraph ────────────────────────────────────────────────────────────────

/**
 * Fetch all nodes and edges for a project, shaped for @xyflow/react.
 * Node positions are read from metadata.x / metadata.y when present,
 * falling back to an auto-layout grid so new nodes are never stacked.
 */
export async function listGraph(projectId: string): Promise<GraphData> {
  const [nodesRes, edgesRes] = await Promise.all([
    supabase
      .from("graph_nodes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("graph_edges")
      .select("*")
      .eq("project_id", projectId),
  ]);

  const rawNodes = (nodesRes.data ?? []) as GraphNode[];
  const rawEdges = (edgesRes.data ?? []) as GraphEdge[];

  const nodes: Node<GraphNode>[] = rawNodes.map((n, i) => ({
    id: n.id,
    type: "storyNode",
    position: {
      x: typeof n.metadata.x === "number" ? n.metadata.x : defaultPosition(i, rawNodes.length).x,
      y: typeof n.metadata.y === "number" ? n.metadata.y : defaultPosition(i, rawNodes.length).y,
    },
    data: n,
  }));

  const nodeIds = new Set(rawNodes.map((n) => n.id));

  const edges: Edge[] = rawEdges
    .filter((e) => nodeIds.has(e.source_id) && nodeIds.has(e.target_id))
    .map((e) => ({
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      label: e.relationship,
      labelStyle: { fill: "#cfd6e6", fontSize: 10 },
      labelBgStyle: { fill: "#0a0e1c", fillOpacity: 0.88 },
      style: { stroke: "#8a6a2f55", strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}

// ─── addNode ──────────────────────────────────────────────────────────────────

export async function addNode(
  projectId: string,
  kind: NodeKind,
  label: string,
  opts: {
    summary?: string;
    metadata?: Record<string, unknown>;
    source_notification_id?: string;
  } = {},
): Promise<GraphNode | null> {
  const { data, error } = await supabase
    .from("graph_nodes")
    .insert({
      project_id: projectId,
      kind,
      label,
      summary: opts.summary ?? null,
      metadata: opts.metadata ?? {},
      source_notification_id: opts.source_notification_id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[storyGraph] addNode:", error.message);
    return null;
  }
  return data as GraphNode;
}

// ─── addEdge ──────────────────────────────────────────────────────────────────

/**
 * Insert an edge.  Silently returns null on the unique-constraint violation
 * (source_id, target_id, relationship) — idempotent by design.
 */
export async function addEdge(
  projectId: string,
  sourceId: string,
  targetId: string,
  relationship: string,
  metadata: Record<string, unknown> = {},
): Promise<GraphEdge | null> {
  const { data, error } = await supabase
    .from("graph_edges")
    .insert({ project_id: projectId, source_id: sourceId, target_id: targetId, relationship, metadata })
    .select()
    .single();

  // 23505 = unique_violation — treat as success (already exists)
  if (error) {
    if ((error as { code?: string }).code !== "23505") {
      console.error("[storyGraph] addEdge:", error.message);
    }
    return null;
  }
  return data as GraphEdge;
}

// ─── updateNode ───────────────────────────────────────────────────────────────

export async function updateNode(
  id: string,
  patch: Partial<Pick<GraphNode, "label" | "summary" | "metadata">>,
): Promise<boolean> {
  const { error } = await supabase
    .from("graph_nodes")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error("[storyGraph] updateNode:", error.message);
    return false;
  }
  return true;
}

// ─── removeNode ───────────────────────────────────────────────────────────────

export async function removeNode(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("graph_nodes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[storyGraph] removeNode:", error.message);
    return false;
  }
  return true;
}

// ─── applyAcceptedNotification ────────────────────────────────────────────────

/**
 * Parse a ConsistencyContext Discrepancy and materialise graph nodes + edges
 * from it.  Designed to be called when the writer clicks "Approve — make this
 * canon" on a discrepancy card.
 *
 * IDEMPOTENCY
 * ───────────
 * Each node insertion checks for an existing row whose
 * metadata->>'source_id' = notificationId.  If found, the existing node is
 * returned and no duplicate is created.  Edge deduplication is handled by the
 * (source_id, target_id, relationship) unique constraint.
 *
 * PAYLOAD MAPPING
 * ───────────────
 * The Discrepancy shape has:
 *   subject   — e.g. "lira-veil-of-aether"  (a character or entity slug)
 *   attribute — e.g. "eye-color", "location", "affiliation"
 *   designValue — the value the designer depicted
 *   manuscriptValue — what the manuscript says
 *
 * From this we create:
 *  • One "character" (or "organization" / "location") node for the subject
 *  • One attribute-value node (e.g. "location" kind for a location attribute)
 *  • One edge with relationship = attribute
 */
export async function applyAcceptedNotification(
  projectId: string,
  notificationId: string,
  payload: {
    subject: string;
    attribute: string;
    designValue: string | null;
    kind?: NodeKind;
  },
): Promise<void> {
  const sourceId = notificationId;

  // ── Helper: find or create a node, keyed by source_notification_id ──────────
  async function findOrCreate(
    kind: NodeKind,
    label: string,
    summary: string | null,
    nodeSourceId: string,
  ): Promise<GraphNode | null> {
    // Check if a node already exists for this notification source
    const { data: existing } = await supabase
      .from("graph_nodes")
      .select("*")
      .eq("project_id", projectId)
      .eq("metadata->>source_id", nodeSourceId)
      .maybeSingle();

    if (existing) return existing as GraphNode;

    return addNode(projectId, kind, label, {
      summary: summary ?? undefined,
      metadata: { source_id: nodeSourceId },
    });
  }

  // ── Subject node ─────────────────────────────────────────────────────────────
  // Derive kind: if the attribute is "location" → location node, else character
  const subjectKind: NodeKind =
    payload.kind ??
    (payload.attribute === "location" || payload.attribute === "origin"
      ? "location"
      : payload.attribute === "affiliation" || payload.attribute === "faction"
      ? "organization"
      : "character");

  const humanLabel = payload.subject
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const subjectNode = await findOrCreate(
    subjectKind,
    humanLabel,
    null,
    `${sourceId}::subject`,
  );

  if (!subjectNode) return;

  // ── Value node (what the designer depicted) ───────────────────────────────────
  const valueRaw = payload.designValue ?? payload.attribute;
  const valueLabel = valueRaw
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const valueKind: NodeKind =
    payload.attribute === "location" || payload.attribute === "origin"
      ? "location"
      : payload.attribute === "affiliation" || payload.attribute === "faction"
      ? "organization"
      : payload.attribute === "event"
      ? "event"
      : "object";

  const valueNode = await findOrCreate(
    valueKind,
    valueLabel,
    `From approved design (${payload.attribute})`,
    `${sourceId}::value`,
  );

  if (!valueNode) return;

  // ── Edge ─────────────────────────────────────────────────────────────────────
  const relationship = payload.attribute
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .toLowerCase();

  await addEdge(projectId, subjectNode.id, valueNode.id, relationship);
}

// ─── subscribeGraph ───────────────────────────────────────────────────────────

/**
 * Subscribe to Realtime changes for a project's graph_nodes and graph_edges.
 * The callback is called with no arguments whenever any INSERT/UPDATE/DELETE
 * fires — the caller should re-fetch via listGraph.
 *
 * Returns an unsubscribe function.
 */
export function subscribeGraph(
  projectId: string,
  cb: () => void,
): () => void {
  const nodesChannel = supabase
    .channel(`graph_nodes:${projectId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "graph_nodes", filter: `project_id=eq.${projectId}` },
      cb,
    )
    .subscribe();

  const edgesChannel = supabase
    .channel(`graph_edges:${projectId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "graph_edges", filter: `project_id=eq.${projectId}` },
      cb,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(nodesChannel);
    supabase.removeChannel(edgesChannel);
  };
}

// ─── Re-export colour map for the UI ─────────────────────────────────────────

export { KIND_COLORS };
