-- 20261031190000_intelligence_dashboard.sql
-- Construction intelligence dashboard: three tables, nothing that already
-- exists is copied. Projects, expenses, milestones, BOQ documents, prices and
-- supplier data are all read from their own homes.
--
--   1. project_estimate_revisions — append-only estimate history, so an updated
--      estimate never overwrites the one a client was shown.
--   2. intelligence_preferences   — the user's own alert settings.
--   3. intelligence_report_runs   — which report was generated, for feature
--      usage analytics. Ids and counts only, never the financial content.
--
-- ROLLBACK: supabase/migrations/rollback/20261031190000_intelligence_dashboard_rollback.sql

begin;

-- ── 1. Estimate revisions ─────────────────────────────────────────
create table if not exists public.project_estimate_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.contractor_projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  revision_no integer not null,
  label text not null default 'Revision',
  source text not null default 'manual',
  materials_cost numeric not null default 0,
  labour_cost numeric not null default 0,
  transport_cost numeric not null default 0,
  misc_cost numeric not null default 0,
  markup_amount numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'NGN',
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint project_estimate_revisions_source_check
    check (source in ('manual', 'calculator', 'boq', 'price_index', 'imported')),
  constraint project_estimate_revisions_amounts_check
    check (materials_cost >= 0 and labour_cost >= 0 and transport_cost >= 0
           and misc_cost >= 0 and markup_amount >= 0 and total >= 0),
  constraint project_estimate_revisions_no_unique unique (project_id, revision_no)
);

create index if not exists project_estimate_revisions_project_idx
  on public.project_estimate_revisions (project_id, revision_no desc);

/** Numbers the revision and refuses to let the ledger be rewritten. */
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

drop trigger if exists project_estimate_revisions_guard on public.project_estimate_revisions;
create trigger project_estimate_revisions_guard
  before insert or update or delete on public.project_estimate_revisions
  for each row execute function public.project_estimate_revisions_guard();

-- ── 2. Notification preferences ───────────────────────────────────
create table if not exists public.intelligence_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  market_code text not null default 'NG',
  price_alerts boolean not null default true,
  budget_alerts boolean not null default true,
  approval_alerts boolean not null default true,
  milestone_alerts boolean not null default true,
  report_alerts boolean not null default true,
  procurement_alerts boolean not null default true,
  price_move_threshold numeric not null default 5
    check (price_move_threshold >= 0 and price_move_threshold <= 100),
  digest_frequency text not null default 'instant'
    check (digest_frequency in ('instant', 'daily', 'weekly', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists intelligence_preferences_updated_at on public.intelligence_preferences;
create trigger intelligence_preferences_updated_at
  before update on public.intelligence_preferences
  for each row execute function public.set_updated_at();

-- ── 3. Report runs (feature usage) ────────────────────────────────
create table if not exists public.intelligence_report_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  report_type text not null,
  format text not null default 'pdf',
  scope_id uuid,
  row_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint intelligence_report_runs_type_check
    check (report_type in ('project_cost', 'material_price', 'expenditure', 'progress', 'boq_summary')),
  constraint intelligence_report_runs_format_check
    check (format in ('pdf', 'xlsx'))
);

create index if not exists intelligence_report_runs_user_idx
  on public.intelligence_report_runs (user_id, created_at desc);

-- ── Grants ────────────────────────────────────────────────────────
grant select, insert on public.project_estimate_revisions to authenticated;
grant select, insert, update on public.intelligence_preferences to authenticated;
grant select, insert on public.intelligence_report_runs to authenticated;
grant all on public.project_estimate_revisions to service_role;
grant all on public.intelligence_preferences to service_role;
grant all on public.intelligence_report_runs to service_role;

-- ── RLS ───────────────────────────────────────────────────────────
alter table public.project_estimate_revisions enable row level security;
alter table public.intelligence_preferences enable row level security;
alter table public.intelligence_report_runs enable row level security;

drop policy if exists estimate_revisions_participant_read on public.project_estimate_revisions;
create policy estimate_revisions_participant_read on public.project_estimate_revisions
  for select to authenticated
  using (user_id = auth.uid() or public.project_role(project_id) is not null or public.is_admin());

drop policy if exists estimate_revisions_author_insert on public.project_estimate_revisions;
create policy estimate_revisions_author_insert on public.project_estimate_revisions
  for insert to authenticated
  with check (
    (user_id = auth.uid() and public.project_role(project_id) is not null)
    or public.is_admin()
  );

drop policy if exists intelligence_preferences_own on public.intelligence_preferences;
create policy intelligence_preferences_own on public.intelligence_preferences
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists intelligence_report_runs_own_read on public.intelligence_report_runs;
create policy intelligence_report_runs_own_read on public.intelligence_report_runs
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists intelligence_report_runs_own_insert on public.intelligence_report_runs;
create policy intelligence_report_runs_own_insert on public.intelligence_report_runs
  for insert to authenticated
  with check (user_id = auth.uid());

commit;
