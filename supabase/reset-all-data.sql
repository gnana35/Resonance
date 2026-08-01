-- ============================================================================
-- Resonance — wipe ALL application data
-- ============================================================================
-- Deletes every row from every app table (and the Storage images), leaving the
-- schema/structure intact. Run in the Supabase SQL editor.
--
-- ⚠️  DESTRUCTIVE and irreversible. This empties the whole project's data for
--     every user. Make sure that is what you want before running.
--
-- Robust by design: it only truncates tables that actually exist, so it won't
-- error if some migrations (research / story-graph) were never applied.
-- ============================================================================

do $$
declare
  t text;
  -- Ordering is irrelevant because of CASCADE, but children are listed first
  -- for readability.
  tables text[] := array[
    'public.app_notifications',
    'public.app_assets',
    'public.app_world_relationships',
    'public.app_world_entities',
    'public.app_characters',
    'public.app_chapters',
    'public.app_preferences',
    'public.app_projects',
    'public.research_messages',
    'public.research_threads',
    'public.graph_edges',
    'public.graph_nodes'
  ];
begin
  foreach t in array tables loop
    if to_regclass(t) is not null then
      execute format('truncate table %s restart identity cascade', t);
      raise notice 'Truncated %', t;
    else
      raise notice 'Skipped (does not exist): %', t;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Storage: remove the uploaded/generated asset images from the "assets" bucket.
-- Table truncation above does NOT touch Storage, so clear it separately.
-- (Safe to run even if the bucket is empty or doesn't exist.)
-- ----------------------------------------------------------------------------
delete from storage.objects where bucket_id = 'assets';

-- ----------------------------------------------------------------------------
-- Verify everything is empty (each count should be 0).
-- ----------------------------------------------------------------------------
select 'app_projects'              as table, count(*) from public.app_projects
union all select 'app_chapters',              count(*) from public.app_chapters
union all select 'app_characters',            count(*) from public.app_characters
union all select 'app_world_entities',        count(*) from public.app_world_entities
union all select 'app_world_relationships',   count(*) from public.app_world_relationships
union all select 'app_assets',                count(*) from public.app_assets
union all select 'app_notifications',         count(*) from public.app_notifications
union all select 'app_preferences',           count(*) from public.app_preferences
union all select 'assets (storage)',          count(*) from storage.objects where bucket_id = 'assets';
