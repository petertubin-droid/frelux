-- Investor Centre snapshot.
--
-- The numbers here are read from tables FRELUX actually writes. Anything the
-- platform does not record is deliberately absent from this function rather
-- than estimated: there is no pageview table and no valuation model, so the
-- page says so instead of inventing a figure.
create or replace function public.mi_investor_snapshot()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  allowed boolean;
begin
  allowed := public.is_admin() or exists (
    select 1 from public.mi_investor_access a where a.user_id = auth.uid()
  );
  if not allowed then
    raise exception 'investor access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'tracked_visitors_30d', (
      select count(distinct visitor_id) from public.analytics_events
      where created_at > now() - interval '30 days' and visitor_id is not null
    ),
    'tracked_events_30d', (
      select count(*) from public.analytics_events where created_at > now() - interval '30 days'
    ),
    'calculator_completions_30d', (
      select count(*) from public.analytics_events
      where created_at > now() - interval '30 days' and event like '%completed%'
    ),
    'registered_users', (select count(*) from public.profiles),
    'new_users_30d', (
      select count(*) from public.profiles where created_at > now() - interval '30 days'
    ),
    'purchases_30d', (
      select count(*) from public.subscription_purchases where created_at > now() - interval '30 days'
    ),
    'revenue_30d_kobo', (
      select coalesce(sum(amount_kobo), 0) from public.subscription_purchases
      where created_at > now() - interval '30 days'
    ),
    'generated_at', now()
  );
end;
$$;

revoke all on function public.mi_investor_snapshot() from anon;
grant execute on function public.mi_investor_snapshot() to authenticated, service_role;
