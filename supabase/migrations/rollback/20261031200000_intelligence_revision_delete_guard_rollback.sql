-- Rollback: restore the strict append-only guard from the first migration.
begin;
create or replace function public.project_estimate_revisions_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
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
