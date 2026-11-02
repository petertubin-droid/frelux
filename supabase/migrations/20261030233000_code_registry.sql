-- =========================================================
-- International Code Registry: administrative overlay.
--
-- The standards library itself lives in code (src/lib/codes/library.ts)
-- and is changed by pull request. These two tables hold only what an
-- administrator legitimately changes without editing code: the
-- verification status of a reference, who reviewed it, and the
-- append-only history of those decisions.
--
-- RLS: the overlay is readable by anyone (the public reference tool
-- displays status notes), writable only by admins via is_admin().
-- The history table is append-only for admins: no update/delete policy
-- exists, so rows cannot be rewritten once written.
-- =========================================================

create table if not exists public.code_registry_status (
  entry_key text primary key,
  family_id text not null,
  domain text not null check (domain in (
    'concrete','reinforcement','loads','wind','snow','foundations','durability','materials'
  )),
  document text not null,
  status text not null check (status in ('verified','under-review','unsupported')),
  note text,
  reviewer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.code_registry_history (
  id uuid primary key default gen_random_uuid(),
  entry_key text not null,
  status text not null,
  note text,
  reviewer text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists code_registry_history_entry_idx
  on public.code_registry_history (entry_key, created_at desc);

alter table public.code_registry_status enable row level security;
alter table public.code_registry_history enable row level security;

-- Public read: the advisor page shows administrative caveats to visitors.
drop policy if exists "code_registry_status read" on public.code_registry_status;
create policy "code_registry_status read" on public.code_registry_status
  for select using (true);

drop policy if exists "code_registry_status admin insert" on public.code_registry_status;
create policy "code_registry_status admin insert" on public.code_registry_status
  for insert with check (is_admin());

drop policy if exists "code_registry_status admin update" on public.code_registry_status;
create policy "code_registry_status admin update" on public.code_registry_status
  for update using (is_admin()) with check (is_admin());

drop policy if exists "code_registry_status admin delete" on public.code_registry_status;
create policy "code_registry_status admin delete" on public.code_registry_status
  for delete using (is_admin());

-- History: admins read and append. No update/delete policies on purpose.
drop policy if exists "code_registry_history admin read" on public.code_registry_history;
create policy "code_registry_history admin read" on public.code_registry_history
  for select using (is_admin());

drop policy if exists "code_registry_history admin append" on public.code_registry_history;
create policy "code_registry_history admin append" on public.code_registry_history
  for insert with check (is_admin());

-- Record the author from the session, never from the client payload.
create or replace function public.code_registry_history_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.changed_by is null then
    new.changed_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists code_registry_history_stamp on public.code_registry_history;
create trigger code_registry_history_stamp
  before insert on public.code_registry_history
  for each row execute function public.code_registry_history_stamp();
