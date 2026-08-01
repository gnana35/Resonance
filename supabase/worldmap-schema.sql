-- =============================================================================
-- Resonance — persistence schema for the worldmap branch
-- =============================================================================
-- Paste into the Supabase SQL Editor and run. Safe to re-run.
--
-- WHY TEXT IDS, NOT UUID
-- The app generates ids client-side as `${Date.now()}-${random}` — for example
-- "1785333975123-a3f9k2". A uuid column rejects those with
--     invalid input syntax for type uuid
-- so every id column here is text. Do not "fix" these to uuid.
--
-- SHAPE
-- Each table promotes the few fields worth filtering/reading in the Table
-- Editor into real columns, and keeps the complete object in `data jsonb`.
-- That way the client can round-trip its rich nested types (evidence, arc
-- points, locked fields, relationships) without a brittle 25-column mapping.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- updated_at trigger (defined first — triggers below depend on it)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- app_projects — the writer's projects (text-keyed, mirrors resonance:projects)
-- ---------------------------------------------------------------------------
create table if not exists public.app_projects (
  id         text primary key,
  name       text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- app_chapters — manuscript chapters (mirrors resonance:chapters)
-- Derivation reads these, so they must survive a cache clear.
-- ---------------------------------------------------------------------------
create table if not exists public.app_chapters (
  id          text primary key,
  project_id  text not null,
  title       text not null default '',
  order_index integer not null default 0,
  content     text not null default '',
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists app_chapters_project_idx
  on public.app_chapters (project_id, order_index);

-- ---------------------------------------------------------------------------
-- app_characters — mirrors resonance:characters:v
-- ---------------------------------------------------------------------------
create table if not exists public.app_characters (
  id          text primary key,
  project_id  text not null,
  name        text not null default '',
  role        text,
  is_draft    boolean not null default false,
  description text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists app_characters_project_idx
  on public.app_characters (project_id);

-- ---------------------------------------------------------------------------
-- app_world_entities / app_world_relationships — mirrors resonance:world:v
-- These are what the World Map renders.
-- ---------------------------------------------------------------------------
create table if not exists public.app_world_entities (
  id          text primary key,
  project_id  text not null,
  label       text not null default '',
  kind        text not null default 'other',
  status      text,
  description text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists app_world_entities_project_idx
  on public.app_world_entities (project_id, kind);

create table if not exists public.app_world_relationships (
  id          text primary key,
  project_id  text not null,
  source_id   text,
  target_id   text,
  kind        text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists app_world_rel_project_idx
  on public.app_world_relationships (project_id);

-- ---------------------------------------------------------------------------
-- app_assets — mirrors resonance:assets:v
-- Binary files already live in the `assets` Storage bucket; this is metadata.
-- ---------------------------------------------------------------------------
create table if not exists public.app_assets (
  id                text primary key,
  project_id        text,
  name              text not null default '',
  description       text,
  mime_type         text,
  source            text,
  preview_url       text,
  storage_path      text,
  design_id         text,
  character_id      text,
  scene_id          text,
  share_status      text not null default 'not_shared',
  validation_status text not null default 'pending',
  data              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists app_assets_project_idx
  on public.app_assets (project_id, share_status);

-- ---------------------------------------------------------------------------
-- app_notifications — mirrors resonance:design-share-notifs:v
-- ---------------------------------------------------------------------------
create table if not exists public.app_notifications (
  id           text primary key,
  project_id   text,
  recipient    text not null default 'writer',
  type         text not null default 'design-shared',
  asset_id     text,
  character_id text,
  scene_id     text,
  message      text,
  read         boolean not null default false,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists app_notifications_recipient_idx
  on public.app_notifications (recipient, read, created_at desc);

-- ---------------------------------------------------------------------------
-- app_preferences — one row per persona
-- ---------------------------------------------------------------------------
create table if not exists public.app_preferences (
  persona    text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'app_projects','app_chapters','app_characters','app_world_entities',
    'app_world_relationships','app_assets','app_notifications','app_preferences'
  ] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I
         for each row execute function public.touch_updated_at()', t, t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'app_characters','app_world_entities','app_world_relationships',
    'app_assets','app_notifications'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Confirm:
--   select table_name from information_schema.tables
--   where table_schema='public' and table_name like 'app_%' order by table_name;
--
-- RLS is OFF for the hackathon, matching the existing tables. With RLS off the
-- anon key in the browser bundle can read and write every row above. Before
-- real users, enable RLS on each app_* table and add policies.
-- ---------------------------------------------------------------------------
