-- The sanitizer must report the same thing on a clean table as it does on a
-- dirty one: nothing. The central-control branch updated its row unconditionally,
-- so a second run still reported one row "changed" while writing identical
-- values. Harmless, but a sanitizer that cannot tell you it is done is not
-- something to run on a schedule. The update is now guarded by an actual
-- difference, the same way every other branch already was.

create or replace function public.sanitize_ad_config()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_keys integer := 0;
  v_links integer := 0;
  v_rules integer := 0;
  v_types integer := 0;
  v_mode integer := 0;
  v_slugs integer := 0;
  v_currency integer := 0;
begin
  with fixed as (
    update ad_placements p
       set placement_key = lower(btrim(p.placement_key)),
           placement_name = btrim(p.placement_name),
           placement_type = lower(btrim(coalesce(p.placement_type, 'banner'))),
           page_target = lower(btrim(coalesce(p.page_target, 'global')))
     where p.placement_key <> lower(btrim(p.placement_key))
        or p.placement_name <> btrim(p.placement_name)
        or p.placement_type <> lower(btrim(coalesce(p.placement_type, 'banner')))
        or p.page_target <> lower(btrim(coalesce(p.page_target, 'global')))
    returning 1
  )
  select count(*) into v_keys from fixed;

  with normalized as (
    update ad_placements p
       set provider_ids = coalesce((
             select jsonb_agg(distinct e.value)
               from jsonb_array_elements_text(
                      case when jsonb_typeof(p.provider_ids) = 'array'
                           then p.provider_ids else '[]'::jsonb end
                    ) as e(value)
              where e.value ~* '^[0-9a-f-]{36}$'
                and exists (select 1 from ad_providers ap where ap.id = e.value::uuid)
           ), '[]'::jsonb)
     where jsonb_typeof(p.provider_ids) <> 'array'
        or p.provider_ids <> coalesce((
             select jsonb_agg(distinct e.value)
               from jsonb_array_elements_text(
                      case when jsonb_typeof(p.provider_ids) = 'array'
                           then p.provider_ids else '[]'::jsonb end
                    ) as e(value)
              where e.value ~* '^[0-9a-f-]{36}$'
                and exists (select 1 from ad_providers ap where ap.id = e.value::uuid)
           ), '[]'::jsonb)
    returning 1
  )
  select count(*) into v_links from normalized;

  with repaired as (
    update ad_placements p
       set display_rules = jsonb_build_object(
             'mobile', coalesce((p.display_rules->>'mobile')::boolean, true),
             'desktop', coalesce((p.display_rules->>'desktop')::boolean, true),
             'min_height', greatest(0, coalesce((p.display_rules->>'min_height')::numeric, 100)),
             'refresh_seconds', greatest(0, coalesce((p.display_rules->>'refresh_seconds')::numeric, 0))
           )
     where jsonb_typeof(p.display_rules) <> 'object'
        or not (p.display_rules ? 'mobile')
        or not (p.display_rules ? 'desktop')
        or not (p.display_rules ? 'min_height')
        or not (p.display_rules ? 'refresh_seconds')
        or (p.display_rules->>'min_height')::numeric < 0
        or (p.display_rules->>'refresh_seconds')::numeric < 0
    returning 1
  )
  select count(*) into v_rules from repaired;

  with recast as (
    update ad_placements p
       set placement_type = 'banner'
     where p.placement_type not in ('banner', 'native', 'in_article', 'rewarded', 'interstitial', 'video')
    returning 1
  )
  select count(*) into v_types from recast;

  with retarget as (
    update ad_placements p
       set page_target = 'global'
     where p.page_target not in ('calculator', 'marketplace', 'tools', 'market',
                                 'color_detail', 'sidebar', 'gallery', 'ai',
                                 'learn', 'colors', 'home', 'global')
    returning 1
  )
  select v_types + count(*) into v_types from retarget;

  with slugged as (
    update ad_providers ap
       set slug = lower(btrim(ap.slug))
     where ap.slug <> lower(btrim(ap.slug))
    returning 1
  )
  select count(*) into v_slugs from slugged;

  -- Guarded by an actual difference, so a clean row reports zero.
  with desired as (
    select s.id,
           case
             when lower(btrim(coalesce(s.ad_provider_mode, 'auto'))) <> 'single' then null
             when exists (select 1 from ad_providers ap where ap.slug = lower(btrim(s.ad_provider_slug))) then lower(btrim(s.ad_provider_slug))
             else null
           end as new_slug,
           case
             when lower(btrim(coalesce(s.ad_provider_mode, 'auto'))) not in ('auto', 'adsense_only', 'single', 'off') then 'auto'
             when lower(btrim(coalesce(s.ad_provider_mode, 'auto'))) = 'single'
                  and not exists (select 1 from ad_providers ap where ap.slug = lower(btrim(s.ad_provider_slug))) then 'auto'
             else lower(btrim(coalesce(s.ad_provider_mode, 'auto')))
           end as new_mode
      from site_settings s
  ), repaired as (
    update site_settings s
       set ad_provider_slug = d.new_slug,
           ad_provider_mode = d.new_mode
      from desired d
     where d.id = s.id
       and (s.ad_provider_slug is distinct from d.new_slug
            or s.ad_provider_mode is distinct from d.new_mode)
    returning 1
  )
  select count(*) into v_mode from repaired;

  with priced as (
    update subscription_local_prices p
       set currency = upper(btrim(p.currency))
     where p.currency <> upper(btrim(p.currency))
    returning 1
  )
  select count(*) into v_currency from priced;

  return jsonb_build_object(
    'placement_identity', v_keys,
    'provider_links', v_links,
    'display_rules', v_rules,
    'placement_vocabulary', v_types,
    'provider_slugs', v_slugs,
    'central_control', v_mode,
    'price_currency', v_currency
  );
end;
$$;

revoke all on function public.sanitize_ad_config() from public;
grant execute on function public.sanitize_ad_config() to service_role;

select public.sanitize_ad_config();
