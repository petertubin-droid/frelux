-- 1. service_role could not read content_translations, which silently blinded
--    every service-side reader (sitemap, prerender). The anon and authenticated
--    grants existed; only the server grant was missing.
grant select on table public.content_translations to service_role;

-- 2. Sitemap quality: the sitemap function no longer emits the programmatic
--    category x location matrices unless real inventory backs them. No schema
--    change is required; the guard lives in supabase/functions/sitemap/index.ts
--    and reads pro_profile_services / pro_profile_locations / marketplace_listings.

-- 3. Reachability record for the public site. pg_net issues the probes from
--    inside the database, so monitoring exists even when the site build is
--    paused; the view surfaces anything that did not answer 200.
create table if not exists public.site_health_probes (
  id bigint generated always as identity primary key,
  target text not null,
  requested_at timestamptz not null default now(),
  request_id bigint
);

create or replace view public.site_health_failures as
select p.target, p.requested_at, r.status_code, r.error_msg
from public.site_health_probes p
left join net._http_response r on r.id = p.request_id
where r.status_code is distinct from 200;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_net')
     and exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('frelux-site-health') where exists (
      select 1 from cron.job where jobname = 'frelux-site-health'
    );
    perform cron.schedule('frelux-site-health', '*/10 * * * *', $cron$
      insert into public.site_health_probes (target, request_id)
      select t, net.http_get(t)
      from unnest(array[
        'https://freluxtools.com/',
        'https://freluxtools.com/learn/',
        'https://freluxtools.com/sitemap.xml'
      ]) as t;
    $cron$);
  end if;
end $$;
