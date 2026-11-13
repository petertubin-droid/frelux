-- Field performance: the numbers a real phone reports, not a lab run.
--
-- Written only by the vitals-report edge function, which holds the service role
-- and validates every field. Nothing client-side can insert directly, so the
-- table cannot be spammed by a forged request that skips the endpoint.
create table if not exists public.web_vitals (
  id uuid primary key default gen_random_uuid(),
  metric text not null check (metric in ('LCP', 'CLS', 'INP', 'TTFB', 'FCP')),
  value double precision not null check (value >= 0),
  rating text not null check (rating in ('good', 'needs-improvement', 'poor')),
  path text not null check (char_length(path) <= 200),
  device text check (device in ('phone', 'tablet', 'desktop')),
  connection text check (char_length(connection) <= 20),
  build_version text check (char_length(build_version) <= 40),
  created_at timestamptz not null default now()
);

comment on table public.web_vitals is
  'Core Web Vitals measured on real visits. Inserted by the vitals-report edge function only.';

create index if not exists web_vitals_created_at_idx
  on public.web_vitals (created_at desc);
create index if not exists web_vitals_metric_path_idx
  on public.web_vitals (metric, path);

alter table public.web_vitals enable row level security;

-- No insert, update or delete policy: the edge function writes with the service
-- role, which bypasses RLS. Everyone else is denied by default.
drop policy if exists "Admins read web vitals" on public.web_vitals;
create policy "Admins read web vitals"
  on public.web_vitals
  for select
  to authenticated
  using (public.is_admin());

-- Privileges: a new table in Supabase carries none. The edge function writes as
-- service_role; admins read through the policy above as authenticated. Nothing
-- is granted to anon, so an anonymous caller cannot read or write measurements.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.web_vitals to authenticated;
grant select, insert on public.web_vitals to service_role;
