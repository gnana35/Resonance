-- ─────────────────────────────────────────────────────────────────────────────
-- Story Graph: graph_nodes + graph_edges
-- Re-runnable: all statements guarded with IF NOT EXISTS / CREATE OR REPLACE.
-- Run in the Supabase SQL editor or via psql.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── graph_nodes ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graph_nodes (
  id                     uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id             uuid        NOT NULL,
  kind                   text        NOT NULL CHECK (kind IN (
                           'character','organization','location',
                           'object','event','story-arc')),
  label                  text        NOT NULL,
  summary                text,
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  source_notification_id uuid,       -- nullable; set null when notification deleted
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS graph_nodes_project_id_idx
  ON graph_nodes (project_id);

-- ── graph_edges ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graph_edges (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   uuid        NOT NULL,
  source_id    uuid        NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_id    uuid        NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relationship text        NOT NULL,  -- 'ally', 'located-in', 'owns', ...
  metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, target_id, relationship)
);

CREATE INDEX IF NOT EXISTS graph_edges_project_id_idx
  ON graph_edges (project_id);

CREATE INDEX IF NOT EXISTS graph_edges_source_id_idx
  ON graph_edges (source_id);

CREATE INDEX IF NOT EXISTS graph_edges_target_id_idx
  ON graph_edges (target_id);

-- ── updated_at trigger for graph_nodes ───────────────────────────────────────

CREATE OR REPLACE FUNCTION graph_nodes_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS graph_nodes_updated_at ON graph_nodes;

CREATE TRIGGER graph_nodes_updated_at
  BEFORE UPDATE ON graph_nodes
  FOR EACH ROW EXECUTE FUNCTION graph_nodes_set_updated_at();
