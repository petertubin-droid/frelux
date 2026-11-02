-- 20261031100000_diaspora_notifications_and_limits.sql
-- Server-side glue for the Diaspora Site Tracker: notifications that are
-- actually written when things happen, and plan limits that are actually
-- enforced. Both live in the database so they cannot be skipped by a client.
--
-- ROLLBACK (reverse order):
--   drop trigger if exists trg_diaspora_limit on public.user_projects;
--   drop function if exists public.diaspora_enforce_project_limit();
--   drop trigger if exists trg_notify_milestone on public.project_progress_stages;
--   drop trigger if exists trg_notify_delivery on public.project_material_deliveries;
--   drop trigger if exists trg_notify_expense_decision on public.project_expenses;
--   drop trigger if exists trg_notify_expense on public.project_expenses;
--   drop trigger if exists trg_notify_report on public.project_site_logs;
--   drop function if exists public.diaspora_on_milestone();
--   drop function if exists public.diaspora_on_delivery();
--   drop function if exists public.diaspora_on_expense_decision();
--   drop function if exists public.diaspora_on_expense();
--   drop function if exists public.diaspora_on_report();
--   drop function if exists public.diaspora_notify(uuid, text, text, text, text, uuid);

-- ---------------------------------------------------------------------------
-- 1. Notifications
-- ---------------------------------------------------------------------------
-- Fan-out helper. Never raises: a notification problem must not roll back the
-- site report or expense that triggered it.
create or replace function public.diaspora_notify(
  p_project uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_link text,
  p_exclude uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_notifications (user_id, project_id, kind, title, body, link)
  select m.user_id, p_project, p_kind, p_title, p_body, p_link
  from public.project_members m
  where m.project_id = p_project
    and coalesce(m.status, 'active') = 'active'
    and (p_exclude is null or m.user_id <> p_exclude);
exception
  when others then
    -- Swallow: the operational write is more important than the alert.
    null;
end;
$$;

create or replace function public.diaspora_on_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.diaspora_notify(
    new.project_id,
    'daily_report',
    'New daily site report',
    coalesce(new.work_performed, 'A daily report was submitted.'),
    '/diaspora-tracker/' || new.project_id::text,
    new.created_by
  );
  return new;
end;
$$;

create or replace function public.diaspora_on_expense() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.diaspora_notify(
    new.project_id,
    'expense_submitted',
    'Expense awaiting approval',
    coalesce(new.name, new.category, 'An expense') || ' - ' || coalesce(new.currency, '') || ' ' || coalesce(new.amount::text, ''),
    '/diaspora-tracker/' || new.project_id::text,
    coalesce(new.submitted_by, new.created_by)
  );
  return new;
end;
$$;

create or replace function public.diaspora_on_expense_decision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.diaspora_notify(
      new.project_id,
      'expense_decision',
      case when new.status = 'approved' then 'Expense approved' else 'Expense rejected' end,
      coalesce(new.name, new.category, 'An expense'),
      '/diaspora-tracker/' || new.project_id::text,
      null
    );
  end if;
  return new;
end;
$$;

create or replace function public.diaspora_on_delivery() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.quantity_delivered < new.quantity_ordered
     or new.quantity_accepted < new.quantity_delivered then
    perform public.diaspora_notify(
      new.project_id,
      'delivery_discrepancy',
      'Material delivery discrepancy',
      coalesce(new.description, 'A delivery') || ': ordered ' || new.quantity_ordered::text
        || ', delivered ' || new.quantity_delivered::text
        || ', accepted ' || new.quantity_accepted::text,
      '/diaspora-tracker/' || new.project_id::text,
      new.created_by
    );
  end if;
  return new;
end;
$$;

create or replace function public.diaspora_on_milestone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'disputed') then
    perform public.diaspora_notify(
      new.project_id,
      'milestone_decision',
      case when new.status = 'approved' then 'Milestone approved' else 'Milestone disputed' end,
      coalesce(new.stage_name, 'A milestone'),
      '/diaspora-tracker/' || new.project_id::text,
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_report on public.project_site_logs;
create trigger trg_notify_report after insert on public.project_site_logs
  for each row execute function public.diaspora_on_report();

drop trigger if exists trg_notify_expense on public.project_expenses;
create trigger trg_notify_expense after insert on public.project_expenses
  for each row execute function public.diaspora_on_expense();

drop trigger if exists trg_notify_expense_decision on public.project_expenses;
create trigger trg_notify_expense_decision after update on public.project_expenses
  for each row execute function public.diaspora_on_expense_decision();

drop trigger if exists trg_notify_delivery on public.project_material_deliveries;
create trigger trg_notify_delivery after insert on public.project_material_deliveries
  for each row execute function public.diaspora_on_delivery();

drop trigger if exists trg_notify_milestone on public.project_progress_stages;
create trigger trg_notify_milestone after update on public.project_progress_stages
  for each row execute function public.diaspora_on_milestone();

-- ---------------------------------------------------------------------------
-- 2. Plan limits (configurable; no prices are stored or implied here)
-- ---------------------------------------------------------------------------
create or replace function public.diaspora_enforce_project_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_max integer;
  v_count integer;
begin
  -- Only tracker projects are limited; other FRELUX work is left untouched.
  if coalesce(new.project_data->>'tracker', '') <> 'diaspora' then
    return new;
  end if;

  select coalesce(w.settings->>'plan', 'free') into v_plan
  from public.workspaces w
  where w.owner_id = new.user_id
  order by w.created_at
  limit 1;

  select max_projects into v_max
  from public.diaspora_plan_limits
  where plan_key = coalesce(v_plan, 'free') and is_active;

  if v_max is null then
    return new; -- unknown plan: never block work on missing configuration
  end if;

  select count(*) into v_count
  from public.user_projects
  where user_id = new.user_id
    and project_data->>'tracker' = 'diaspora';

  if v_count >= v_max then
    raise exception 'Project limit reached for the % plan (% projects). Archive a project or change plan.', coalesce(v_plan, 'free'), v_max
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_diaspora_limit on public.user_projects;
create trigger trg_diaspora_limit before insert on public.user_projects
  for each row execute function public.diaspora_enforce_project_limit();

-- ---------------------------------------------------------------------------
-- 3. Administrator visibility (support and abuse review), read-only
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'project_members', 'project_invitations', 'project_notifications',
    'project_material_deliveries', 'project_activity'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_admin())',
      t || '_admin_read', t
    );
  end loop;
end;
$$;
