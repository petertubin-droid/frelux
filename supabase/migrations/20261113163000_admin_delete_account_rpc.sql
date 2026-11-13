-- Account deletion for the admin user-management screen.
--
-- The delete action used to call GoTrue's admin deleteUser endpoint, which fails
-- for reasons the screen cannot see and surfaces to the administrator as a bare
-- "Edge Function returned a non-2xx status code". A placeholder account
-- (editorial-migrations@frelux.invalid, no activity, unverified domain) could
-- not be removed at all.
--
-- This function performs the same deletion in one transaction, keeps the audit
-- row, and returns a plain result the screen can show.
--
-- Rollback: drop function public.admin_delete_account(uuid, uuid, text);

create or replace function public.admin_delete_account(
  p_user_id uuid,
  p_actor uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_email text;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Admin only' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(role, 'user') into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    raise exception 'User not found' using errcode = 'no_data_found';
  end if;
  -- An administrator deleting another administrator is a governance decision,
  -- not something this screen should do silently.
  if v_role in ('admin', 'super_admin') then
    raise exception 'Administrator accounts cannot be deleted from this screen'
      using errcode = 'insufficient_privilege';
  end if;

  select email into v_email from auth.users where id = p_user_id;

  insert into public.admin_account_events (user_id, actor_id, action, reason, detail)
  values (
    p_user_id,
    p_actor,
    'delete',
    nullif(btrim(coalesce(p_reason, '')), ''),
    jsonb_build_object('email', v_email, 'via', 'admin_delete_account')
  );

  delete from auth.users where id = p_user_id;

  return jsonb_build_object('ok', true, 'email', v_email);
end;
$$;

revoke all on function public.admin_delete_account(uuid, uuid, text) from public;
grant execute on function public.admin_delete_account(uuid, uuid, text) to authenticated, service_role;
