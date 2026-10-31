-- 20261031200000_intelligence_revision_delete_guard.sql
-- The estimate ledger stays append-only for people: no update, no delete. But a
-- project can still be removed, and the ledger must not hold the deletion
-- hostage. Cascade deletes and service-role maintenance are the only exceptions.
--
-- ROLLBACK: supabase/migrations/rollback/20261031200000_intelligence_revision_delete_guard_rollback.sql

begin;

create or replace function public.project_estimate_revisions_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Estimate revisions are append-only';
  end if;

  if tg_op = 'DELETE' then
    -- The project itself is gone, so the cascade is removing its history.
    if not exists (select 1 from public.contractor_projects where id = old.project_id) then
      return old;
    end if;
    -- Owner-authorized maintenance, never a browser session.
    if current_user = 'service_role' or coalesce(auth.role(), '') = 'service_role' then
      return old;
    end if;
    raise exception 'Estimate revisions are append-only';
  end if;

  if new.revision_no is null or new.revision_no = 0 then
    select coalesce(max(revision_no), 0) + 1
      into new.revision_no
      from public.project_estimate_revisions
     where project_id = new.project_id;
  end if;
  return new;
end;
$function$;

commit;
