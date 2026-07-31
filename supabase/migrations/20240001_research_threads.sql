-- ─────────────────────────────────────────────────────────────────────────────
-- Research threads & messages
-- Re-runnable: every statement is guarded with IF NOT EXISTS / DO NOTHING.
-- Run this in the Supabase SQL editor or via `psql`.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable uuid-ossp extension (no-op if already present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── research_threads ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_threads (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid        NOT NULL,
  persona     text        NOT NULL CHECK (persona IN ('writer', 'designer')),
  title       text        NOT NULL DEFAULT 'New Chat',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching a project's threads
CREATE INDEX IF NOT EXISTS research_threads_project_id_idx
  ON research_threads (project_id, updated_at DESC);

-- ── research_messages ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_messages (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   uuid        NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     text        NOT NULL,
  citations   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Primary access pattern: all messages for a thread, ordered by time
CREATE INDEX IF NOT EXISTS research_messages_thread_created_idx
  ON research_messages (thread_id, created_at);

-- ── updated_at trigger ───────────────────────────────────────────────────────
-- Keeps research_threads.updated_at current whenever a message is inserted.

CREATE OR REPLACE FUNCTION research_threads_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE research_threads
     SET updated_at = now()
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS research_messages_touch_thread ON research_messages;

CREATE TRIGGER research_messages_touch_thread
  AFTER INSERT ON research_messages
  FOR EACH ROW EXECUTE FUNCTION research_threads_touch();
