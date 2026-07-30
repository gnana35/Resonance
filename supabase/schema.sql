-- Resonance MVP schema
-- Paste into the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- Creates: projects, characters, assets, notifications.
--
-- Safe to re-run, and safe on a project where `assets` already exists: every
-- statement is guarded with "if not exists", so an existing table is left alone.
-- (On the original project `assets` already existed; on a fresh project this
-- file creates all four.)

-- ---------------------------------------------------------------------------
-- keep updated_at current (defined first: the triggers below depend on it)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  -- owner is nullable for now: the app has no Supabase Auth wired up yet.
  owner_id    uuid references auth.users (id) on delete set null,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- characters
-- ---------------------------------------------------------------------------
create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null,
  role        text,
  description text,
  traits      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists characters_project_id_idx
  on public.characters (project_id);

-- ---------------------------------------------------------------------------
-- assets
--
-- Mirrors the AssetRecord shape in src/lib/assets.ts (currently Firestore).
-- Skipped automatically if the table already exists.
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete cascade,
  name         text not null,
  description  text,
  mime_type    text not null default 'application/octet-stream',
  -- "created" (saved from the Sketchpad) or "uploaded" (brought in from device)
  source       text not null default 'uploaded'
                 check (source in ('created', 'uploaded')),
  preview_url  text,
  storage_path text,
  -- Designs live in DesignerContext (localStorage), not Postgres, and their
  -- ids look like "1785333975123-a3f9k2". This is deliberately text, not uuid.
  design_id    text,

  -- Character/Scene this asset depicts. Nullable: uploads may not be tied to one.
  character_id uuid references public.characters (id) on delete set null,

  -- Drives the checkmark in the designer's Assets library.
  share_status text not null default 'not_shared'
                 check (share_status in ('not_shared', 'shared')),
  shared_at    timestamptz,

  validation_status text not null default 'pending'
                 check (validation_status in ('pending', 'approved', 'needs_revision')),
  validated_at timestamptz,
  validation_note text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- If `assets` already existed with an older shape, the create above was a
-- no-op. These bring it up to date; each is a no-op if the column is present.
alter table public.assets add column if not exists project_id   uuid references public.projects (id) on delete cascade;
alter table public.assets add column if not exists description  text;
alter table public.assets add column if not exists mime_type    text not null default 'application/octet-stream';
alter table public.assets add column if not exists source       text not null default 'uploaded';
alter table public.assets add column if not exists preview_url  text;
alter table public.assets add column if not exists storage_path text;
alter table public.assets add column if not exists design_id    text;
-- If design_id was previously created as uuid, widen it:
alter table public.assets alter column design_id type text;
alter table public.assets add column if not exists character_id uuid references public.characters (id) on delete set null;
alter table public.assets add column if not exists share_status text not null default 'not_shared';
alter table public.assets add column if not exists shared_at    timestamptz;
alter table public.assets add column if not exists validation_status text not null default 'pending';
alter table public.assets add column if not exists validated_at timestamptz;
alter table public.assets add column if not exists validation_note text;
alter table public.assets add column if not exists created_at   timestamptz not null default now();
alter table public.assets add column if not exists updated_at   timestamptz not null default now();

create index if not exists assets_project_id_idx
  on public.assets (project_id);

create index if not exists assets_character_id_idx
  on public.assets (character_id);

-- The designer's library filters on this constantly.
create index if not exists assets_share_status_idx
  on public.assets (share_status, validation_status);

drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications
--
-- Supports the full collaboration loop: designer→writer asset shares, writer
-- revision requests, AI validation alerts, and threaded replies.
--
-- Supported type values:
--   Writer  → Designer : character-request, character-updated, scene-request,
--                        worldbuilding-request, revision-request
--   Designer → Writer  : character-design-complete, scene-art-complete,
--                        asset-shared, artwork-updated
--   System             : ai-validation-alert
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id)    on delete cascade,
  asset_id     uuid references public.assets (id)      on delete cascade,
  character_id uuid references public.characters (id)  on delete set null,

  -- Route by persona, NOT by auth.users (no auth in this app).
  recipient    text not null check (recipient  in ('writer', 'designer')),
  sender       text not null check (sender     in ('writer', 'designer', 'system')),

  type         text not null,
  title        text not null,
  message      text not null,
  payload      jsonb not null default '{}'::jsonb,

  status       text not null default 'unread'
               check (status in ('unread', 'read', 'accepted', 'revision-requested')),
  severity     text not null default 'info'
               check (severity in ('info', 'success', 'warning', 'alert')),

  -- Threads a revision-request back to the notification it answers.
  parent_id    uuid references public.notifications (id) on delete set null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- If the table already existed (earlier schema version), add each missing
-- column. Each alter is a no-op when the column is already present.
alter table public.notifications add column if not exists asset_id     uuid references public.assets (id)     on delete cascade;
alter table public.notifications add column if not exists character_id uuid references public.characters (id) on delete set null;
alter table public.notifications add column if not exists recipient    text;
alter table public.notifications add column if not exists sender       text not null default 'system';
alter table public.notifications add column if not exists title        text not null default '';
alter table public.notifications add column if not exists payload      jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists status       text not null default 'unread';
alter table public.notifications add column if not exists severity     text not null default 'info';
alter table public.notifications add column if not exists parent_id    uuid references public.notifications (id) on delete set null;
alter table public.notifications add column if not exists updated_at   timestamptz not null default now();

-- Back-fill recipient from recipient_role if the old column exists.
-- (Safe no-op on a fresh install where recipient_role never existed.)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'notifications'
      and column_name  = 'recipient_role'
  ) then
    update public.notifications set recipient = recipient_role where recipient is null;
  end if;
end
$$;

-- Constraint guards (add only if missing).
do $$
begin
  begin
    alter table public.notifications
      add constraint notifications_recipient_check
      check (recipient in ('writer', 'designer'));
  exception when duplicate_object then null;
  end;

  begin
    alter table public.notifications
      add constraint notifications_sender_check
      check (sender in ('writer', 'designer', 'system'));
  exception when duplicate_object then null;
  end;

  begin
    alter table public.notifications
      add constraint notifications_status_check
      check (status in ('unread', 'read', 'accepted', 'revision-requested'));
  exception when duplicate_object then null;
  end;

  begin
    alter table public.notifications
      add constraint notifications_severity_check
      check (severity in ('info', 'success', 'warning', 'alert'));
  exception when duplicate_object then null;
  end;
end
$$;

create index if not exists notifications_recipient_status_idx
  on public.notifications (recipient, status);

create index if not exists notifications_parent_id_idx
  on public.notifications (parent_id);

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notification_preferences
--
-- One row per persona. Seed rows are inserted on first run and never updated
-- by this script (on conflict do nothing).
--
-- events jsonb keys: research-complete, image-generation-complete,
--   historical-validation-complete, asset-shared, revision-requested,
--   design-accepted, design-rejected
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  id         uuid primary key default gen_random_uuid(),
  persona    text not null unique check (persona in ('writer', 'designer')),
  in_app     boolean not null default true,
  desktop    boolean not null default false,
  mobile     boolean not null default false,
  events     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

insert into public.notification_preferences (persona, in_app, desktop, mobile, events)
values
  ('writer',   true, false, false,
   '{"research-complete":true,"image-generation-complete":true,
     "historical-validation-complete":true,"asset-shared":true,
     "revision-requested":true,"design-accepted":true,"design-rejected":true}'::jsonb),
  ('designer', true, false, false,
   '{"research-complete":true,"image-generation-complete":true,
     "historical-validation-complete":true,"asset-shared":true,
     "revision-requested":true,"design-accepted":true,"design-rejected":true}'::jsonb)
on conflict (persona) do nothing;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime
--
-- subscribeAssets() and subscribeNotifications() rely on this. Without it the
-- initial fetch still works but nothing live-updates — the writer would have to
-- refresh to see a shared design.
--
-- "add table" errors if the table is already in the publication, so each is
-- wrapped to make this file safe to re-run.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.assets;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.notification_preferences;
  exception when duplicate_object then null;
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- Inspect the final shape of `notifications` if anything looks off:
--
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'notifications'
--   order by ordinal_position;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Confirm everything landed:
--
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- ⚠  SECURITY NOTE
-- RLS is intentionally OFF for the hackathon build, per your team's decision.
-- That means the anon key in the browser bundle can read and write every row
-- in every table above. Before any real users touch this, run:
--
--   alter table public.projects                 enable row level security;
--   alter table public.characters               enable row level security;
--   alter table public.assets                   enable row level security;
--   alter table public.notifications            enable row level security;
--   alter table public.notification_preferences enable row level security;
--
-- ...and add policies, or every table becomes unreadable/unwritable.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Storage policies for the `assets` bucket
--
-- storage.objects ALWAYS has RLS enabled, regardless of the public/private
-- toggle on the bucket. "Public bucket" only makes READS public — anonymous
-- writes still need explicit policies, or uploads fail with
-- "new row violates row-level security policy".
--
-- upsert:true in updateCreatedAsset() needs BOTH insert and update.
-- ---------------------------------------------------------------------------
drop policy if exists "assets_anon_read"   on storage.objects;
drop policy if exists "assets_anon_insert" on storage.objects;
drop policy if exists "assets_anon_update" on storage.objects;
drop policy if exists "assets_anon_delete" on storage.objects;

create policy "assets_anon_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'assets');

create policy "assets_anon_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'assets');

create policy "assets_anon_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'assets') with check (bucket_id = 'assets');

create policy "assets_anon_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'assets');
