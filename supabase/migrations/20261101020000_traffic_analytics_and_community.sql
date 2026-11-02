-- Traffic analytics for the admin dashboard.
--
-- Two things land here:
--   1. First-party page-view telemetry on analytics_events (visitor, session,
--      referrer, device). Google Analytics is still the external report, but
--      the admin dashboard must never depend on a third-party API to answer
--      "how many people are on the site right now".
--   2. frelux_community_size(), the only public number the homepage may show.
--      It returns 0 until the platform actually reaches 100 accounts, so the
--      "trusted by" band stays blank instead of claiming early traction.

alter table public.analytics_events
  add column if not exists visitor_id text,
  add column if not exists session_id text,
  add column if not exists referrer text,
  add column if not exists device text;

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_created_idx
  on public.analytics_events (event, created_at desc);

create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id);

create index if not exists analytics_events_visitor_idx
  on public.analytics_events (visitor_id);

-- Aggregated traffic report. Admin only, one round trip, no raw rows leave
-- the database.
create or replace function public.frelux_traffic_report(p_days integer default 7)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(90, coalesce(p_days, 7)));
  v_since timestamptz := now() - (greatest(1, least(90, coalesce(p_days, 7))) || ' days')::interval;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'days', v_days,
      'generated_at', now(),
      'totals', jsonb_build_object(
        'page_views', count(*) filter (where event = 'page_view'),
        'visitors', count(distinct visitor_id) filter (where event = 'page_view'),
        'sessions', count(distinct session_id) filter (where event = 'page_view'),
        'events', count(*)
      ),
      'active_now', (
        select count(distinct session_id)
        from public.analytics_events
        where event = 'page_view'
          and session_id is not null
          and created_at >= now() - interval '5 minutes'
      ),
      'daily', coalesce((
        select jsonb_agg(day order by day->>'date')
        from (
          select jsonb_build_object(
            'date', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
            'page_views', count(*),
            'visitors', count(distinct visitor_id)
          ) as day
          from public.analytics_events
          where event = 'page_view' and created_at >= v_since
          group by date_trunc('day', created_at)
        ) days
      ), '[]'::jsonb),
      'pages', coalesce((
        select jsonb_agg(page order by (page->>'views')::int desc)
        from (
          select jsonb_build_object(
            'path', coalesce(nullif(page_path, ''), '/'),
            'views', count(*),
            'visitors', count(distinct visitor_id)
          ) as page
          from public.analytics_events
          where event = 'page_view' and created_at >= v_since
          group by coalesce(nullif(page_path, ''), '/')
          order by count(*) desc
          limit 10
        ) pages
      ), '[]'::jsonb),
      'sources', coalesce((
        select jsonb_agg(source order by (source->>'visits')::int desc)
        from (
          select jsonb_build_object(
            'source', coalesce(nullif(referrer, ''), 'Direct'),
            'visits', count(*),
            'visitors', count(distinct visitor_id)
          ) as source
          from public.analytics_events
          where event = 'page_view' and created_at >= v_since
          group by coalesce(nullif(referrer, ''), 'Direct')
          order by count(*) desc
          limit 8
        ) sources
      ), '[]'::jsonb),
      'devices', coalesce((
        select jsonb_agg(device_row order by (device_row->>'visitors')::int desc)
        from (
          select jsonb_build_object(
            'device', coalesce(nullif(device, ''), 'unknown'),
            'visitors', count(distinct visitor_id)
          ) as device_row
          from public.analytics_events
          where event = 'page_view' and created_at >= v_since
          group by coalesce(nullif(device, ''), 'unknown')
        ) devices
      ), '[]'::jsonb)
    )
    from public.analytics_events
    where created_at >= v_since
  );
end;
$$;

revoke all on function public.frelux_traffic_report(integer) from public;
grant execute on function public.frelux_traffic_report(integer) to authenticated;

-- Public, privacy-preserving community size. Exact user identities never
-- leave the database, and nothing is shown before the 100-account threshold.
create or replace function public.frelux_community_size()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select case when count(*) >= 100 then count(*)::integer else 0 end
  from public.profiles;
$$;

revoke all on function public.frelux_community_size() from public;
grant execute on function public.frelux_community_size() to anon, authenticated;
