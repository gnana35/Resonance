-- ============================================================================
-- Resonance — fix Storage uploads ("new row violates row-level security policy")
-- ============================================================================
-- The app uploads design thumbnails / references to the "assets" Storage bucket
-- using the ANON key with no user sign-in, so every request runs as the `anon`
-- role. storage.objects has RLS enabled, and with no matching policy the anon
-- role can't INSERT — so uploads fail and the app falls back to stuffing the
-- whole image into localStorage (which is what breaks saving after ~2 designs).
--
-- This script:
--   1. Ensures the "assets" bucket exists and is PUBLIC (needed for the
--      getPublicUrl() links the app stores to actually load).
--   2. Grants the app (anon + authenticated, i.e. the `public` role) full
--      read/write access to objects IN THE assets BUCKET ONLY.
--
-- Run it in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- NOTE: because the app has no auth, this opens the "assets" bucket to anyone
-- holding the anon key. That's acceptable for a demo; if you later add sign-in,
-- tighten `to public` down to `to authenticated`.
-- ============================================================================

-- 1. Bucket exists and is public.
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do update set public = true;

-- 2. Policies on storage.objects, scoped to the assets bucket.
--    (RLS is already enabled on storage.objects by default in Supabase.)
drop policy if exists "assets_public_read"   on storage.objects;
drop policy if exists "assets_public_insert" on storage.objects;
drop policy if exists "assets_public_update" on storage.objects;
drop policy if exists "assets_public_delete" on storage.objects;

create policy "assets_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'assets');

create policy "assets_public_insert"
  on storage.objects for insert
  to public
  with check (bucket_id = 'assets');

create policy "assets_public_update"
  on storage.objects for update
  to public
  using (bucket_id = 'assets')
  with check (bucket_id = 'assets');

create policy "assets_public_delete"
  on storage.objects for delete
  to public
  using (bucket_id = 'assets');

-- 3. Verify — should list the 4 policies above.
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'assets_public_%'
order by policyname;
