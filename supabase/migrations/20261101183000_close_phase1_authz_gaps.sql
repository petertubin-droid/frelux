-- Phase 1 audit follow-up, 2026-11-01.
--
-- The audit query reported 9 anon-reachable SECURITY DEFINER writers with no
-- internal authorization. Re-running it with the return type checked showed
-- that 7 of those 9 are trigger functions: PostgREST cannot call a function
-- returning `trigger`, so they were never an RPC surface. The remaining 2,
-- fetch_shared_estimate and respond_to_client_estimate, are authorized by an
-- unguessable share token rather than by a user identity, which is correct for
-- client-facing share links.
--
-- Two real weaknesses remained and are closed here:
--   1. 41 trigger functions carried PUBLIC EXECUTE. A trigger never needs the
--      EXECUTE privilege, so the grant is pure attack surface: if any of them
--      is ever rewritten to return a callable type, it becomes an open RPC.
--   2. The share functions accepted any token of 8 characters or more. A weak
--      or short token is guessable, and either function mutates the estimate.
--      Both now require the 32-character UUID shape that the generator emits.

-- 1. Trigger functions need no EXECUTE grant.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
      and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
  end loop;
end $$;

-- 2. Share tokens must carry real entropy, not just 8 characters.
create or replace function public.fetch_shared_estimate(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_estimate public.client_estimates;
begin
  if p_token is null
     or p_token !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  select * into v_estimate
  from public.client_estimates
  where share_token = p_token
    and status in ('sent', 'viewed', 'approved', 'changes_requested')
  limit 1;

  if v_estimate.id is null then
    return null;
  end if;

  if v_estimate.status = 'sent' then
    update public.client_estimates
    set status = 'viewed', viewed_at = now(), updated_at = now()
    where id = v_estimate.id and status = 'sent';
    v_estimate.status := 'viewed';
    v_estimate.viewed_at := now();
  end if;

  return to_jsonb(v_estimate);
end;
$function$;

create or replace function public.respond_to_client_estimate(
  p_token text, p_action text, p_feedback text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_status text;
begin
  if p_token is null
     or p_token !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select id, status into v_id, v_status
  from public.client_estimates
  where share_token = p_token
  limit 1;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_action = 'approve' then
    if v_status not in ('sent', 'viewed', 'changes_requested') then
      return jsonb_build_object('ok', false, 'error', 'invalid_status');
    end if;
    update public.client_estimates
    set status = 'approved', approved_at = now(), updated_at = now()
    where id = v_id;
    return jsonb_build_object('ok', true, 'status', 'approved');
  end if;

  if p_action = 'request_changes' then
    if v_status not in ('sent', 'viewed') then
      return jsonb_build_object('ok', false, 'error', 'invalid_status');
    end if;
    if p_feedback is null or btrim(p_feedback) = '' then
      return jsonb_build_object('ok', false, 'error', 'feedback_required');
    end if;
    update public.client_estimates
    set status = 'changes_requested',
        changes_requested_at = now(),
        client_feedback = p_feedback,
        updated_at = now()
    where id = v_id;
    return jsonb_build_object('ok', true, 'status', 'changes_requested');
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid_action');
end;
$function$;

revoke all on function public.fetch_shared_estimate(text) from public;
revoke all on function public.respond_to_client_estimate(text, text, text) from public;
grant execute on function public.fetch_shared_estimate(text) to anon, authenticated;
grant execute on function public.respond_to_client_estimate(text, text, text) to anon, authenticated;
