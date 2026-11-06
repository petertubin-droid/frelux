-- Supabase Preview replays the whole chain against an empty database, and it was
-- failing on 20261031740000 with:
--
--   ERROR: insert or update on table "learn_wall_finishing_sources" violates
--   foreign key constraint "learn_wall_finishing_sources_reviewed_by_fkey"
--   Key (reviewed_by)=(d74ffbd7-281b-4445-9728-ad87c287e0b9) is not present in
--   table "users".
--
-- learn_wall_finishing_sources.reviewed_by references auth.users(id), and 27
-- migration files attribute their editorial review to the owner account, which
-- exists in production but never in a replay. Every replay therefore stops at
-- the first such statement, which is why Supabase Preview has been red while
-- the rest of CI passed.
--
-- This seeds that attribution row when it is absent, at the head of the chain so
-- every later file can reference it. It is a no-op in production, where the
-- account already exists, and the preview branch is disposable.

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  'd74ffbd7-281b-4445-9728-ad87c287e0b9',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'migration-attribution@frelux.invalid',
  now(), now(), now(),
  '{"provider":"system","purpose":"migration attribution in replay"}'::jsonb,
  '{"display_name":"Migration attribution"}'::jsonb
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'
  ) then
    raise exception 'owner attribution row missing after seed';
  end if;
end $$;
