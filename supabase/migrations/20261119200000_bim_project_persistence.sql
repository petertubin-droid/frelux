-- BIM project persistence.
--
-- Engine-1A #1 (BIM/CAD): the model viewer, federation, revision chains,
-- 4D schedule links, 5D estimate links and clash screening all operate on
-- data that previously lived only in the browser tab. A project that closes
-- the tab loses the model, so nothing could be resumed, audited or shared.
--
-- What is stored is DATA, not geometry: the parsed element index (GlobalId ->
-- part count + IFC type) per revision, plus project metadata. The IFC file
-- itself is never uploaded here; it stays on the user's device and is re-parsed
-- locally. This keeps the storage honest (no binary blobs, no wasm server side)
-- and keeps a revision reproducible from the file the user still holds.
--
-- Ownership is per user: a project and its revisions are readable and writable
-- only by their owner. Admins can read for support and audit, but the rows are
-- not public and no policy exposes them to anon.

create table if not exists public.bim_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  -- ISO 3166-1 alpha-2 market code; null means "not market scoped yet"
  market text check (market is null or market ~ '^[A-Z]{2}$'),
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'archived')),
  -- the revision currently shown in the viewer; null until the first issue
  active_revision_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bim_projects_owner_idx
  on public.bim_projects (owner_id, updated_at desc);

create table if not exists public.bim_model_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.bim_projects(id) on delete cascade,
  -- human label, e.g. "A-102 Rev C"
  label text not null check (char_length(trim(label)) between 1 and 120),
  issued_at timestamptz not null default now(),
  -- first issue of a chain has no parent
  parent_revision_id uuid references public.bim_model_revisions(id) on delete restrict,
  -- GlobalId -> { parts, type }: what the revision contained when issued.
  -- Deliberately not a copy of the model; the diff only needs these facts.
  element_index jsonb not null default '{}'::jsonb,
  element_count integer not null default 0 check (element_count >= 0),
  source_file_name text,
  schema_name text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bim_model_revisions_project_idx
  on public.bim_model_revisions (project_id, issued_at desc);

-- A label identifies an issue inside one project; two "Rev C" rows for the
-- same project would make the chain ambiguous, so it is refused at the source.
create unique index if not exists bim_model_revisions_project_label_key
  on public.bim_model_revisions (project_id, label);

-- The active revision must belong to the same project.
alter table public.bim_projects
  drop constraint if exists bim_projects_active_revision_fk;
alter table public.bim_projects
  add constraint bim_projects_active_revision_fk
  foreign key (active_revision_id)
  references public.bim_model_revisions(id)
  on delete set null;

alter table public.bim_projects enable row level security;
alter table public.bim_model_revisions enable row level security;

-- Owner policies: full control over own rows only.
drop policy if exists "bim_projects_owner_all" on public.bim_projects;
create policy "bim_projects_owner_all"
  on public.bim_projects for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "bim_projects_admin_read" on public.bim_projects;
create policy "bim_projects_admin_read"
  on public.bim_projects for select
  to authenticated
  using (public.is_admin());

drop policy if exists "bim_revisions_owner_all" on public.bim_model_revisions;
create policy "bim_revisions_owner_all"
  on public.bim_model_revisions for all
  to authenticated
  using (
    exists (
      select 1 from public.bim_projects p
      where p.id = bim_model_revisions.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bim_projects p
      where p.id = bim_model_revisions.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "bim_revisions_admin_read" on public.bim_model_revisions;
create policy "bim_revisions_admin_read"
  on public.bim_model_revisions for select
  to authenticated
  using (public.is_admin());

drop trigger if exists bim_projects_updated_at on public.bim_projects;
create trigger bim_projects_updated_at
  before update on public.bim_projects
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.bim_projects to authenticated;
grant select, insert, update, delete on public.bim_model_revisions to authenticated;
