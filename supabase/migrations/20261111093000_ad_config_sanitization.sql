-- Ad configuration sanitization
--
-- A re-runnable pass over the ad config, plus the invariants that stop it
-- drifting again. Written after an audit of the live rows found no dirty data:
-- the value here is that the rules are now enforced by the database rather than
-- by everyone remembering them, and that the same cleaning can be run any time
-- with select public.sanitize_ad_config();
--
-- What it enforces:
--   * placement keys, provider slugs and currencies are lower/title case and
--     trimmed, so a key typed as "Calculator_Mid " cannot become a second slot
--     that silently never fills
--   * provider_ids stays an array, holds no duplicates, and holds no id that
--     does not exist in ad_providers
--   * display_rules always carries mobile, desktop, min_height and
--     refresh_seconds, with non-negative numbers, so the resolver never reads a
--     missing key as "hidden on this device"
--   * placement_type and page_target stay inside the sets the admin UI and the
--     resolver both understand
--   * the central control cannot be left in a contradictory state: a mode of
--     "single" has a provider, every other mode has none

begin;

-- ── Sanitize existing rows ────────────────────────────────────────────────

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
  -- Placement identity and vocabulary.
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

  -- Provider links: arrays only, deduped, and every id must exist.
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

  -- Display rules: complete shape, numbers that cannot go negative.
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

  -- Vocabulary the resolver and admin both check against.
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

  -- Provider slugs.
  with slugged as (
    update ad_providers ap
       set slug = lower(btrim(ap.slug))
     where ap.slug <> lower(btrim(ap.slug))
    returning 1
  )
  select count(*) into v_slugs from slugged;

  -- Central control: a mode of "single" names a real provider; any other mode
  -- names none. A single mode pointing at a provider that no longer exists
  -- falls back to the waterfall rather than serving nothing.
  with repaired as (
    update site_settings s
       set ad_provider_slug = case
             when lower(btrim(coalesce(s.ad_provider_mode, 'auto'))) <> 'single' then null
             when exists (select 1 from ad_providers ap where ap.slug = lower(btrim(s.ad_provider_slug))) then lower(btrim(s.ad_provider_slug))
             else null
           end,
           ad_provider_mode = case
             when lower(btrim(coalesce(s.ad_provider_mode, 'auto'))) not in ('auto', 'adsense_only', 'single', 'off') then 'auto'
             when lower(btrim(coalesce(s.ad_provider_mode, 'auto'))) = 'single'
                  and not exists (select 1 from ad_providers ap where ap.slug = lower(btrim(s.ad_provider_slug))) then 'auto'
             else lower(btrim(coalesce(s.ad_provider_mode, 'auto')))
           end
    returning 1
  )
  select count(*) into v_mode from repaired;

  -- Stored prices: currency codes are uppercase, so a lowercase row cannot miss
  -- the lookup that renders a local price.
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

comment on function public.sanitize_ad_config() is
  'Re-runnable ad config cleaner. Normalises keys, provider links, display rules, vocabulary, the central provider control and price currencies. Returns counts of rows changed per rule.';

revoke all on function public.sanitize_ad_config() from public;
grant execute on function public.sanitize_ad_config() to service_role;

select public.sanitize_ad_config();

-- ── Keep it clean on the way in ───────────────────────────────────────────

create or replace function public.ad_placement_normalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.placement_key := lower(btrim(new.placement_key));
  new.placement_name := btrim(new.placement_name);
  new.placement_type := lower(btrim(coalesce(new.placement_type, 'banner')));
  new.page_target := lower(btrim(coalesce(new.page_target, 'global')));
  new.sort_order := coalesce(new.sort_order, 999);
  new.provider_ids := coalesce((
    select jsonb_agg(distinct e.value)
      from jsonb_array_elements_text(
             case when jsonb_typeof(new.provider_ids) = 'array'
                  then new.provider_ids else '[]'::jsonb end
           ) as e(value)
     where e.value ~* '^[0-9a-f-]{36}$'
       and exists (select 1 from ad_providers ap where ap.id = e.value::uuid)
  ), '[]'::jsonb);
  new.display_rules := jsonb_build_object(
    'mobile', coalesce((new.display_rules->>'mobile')::boolean, true),
    'desktop', coalesce((new.display_rules->>'desktop')::boolean, true),
    'min_height', greatest(0, coalesce((new.display_rules->>'min_height')::numeric, 100)),
    'refresh_seconds', greatest(0, coalesce((new.display_rules->>'refresh_seconds')::numeric, 0))
  );
  return new;
end;
$$;

drop trigger if exists ad_placements_normalize on ad_placements;
create trigger ad_placements_normalize
  before insert or update on ad_placements
  for each row execute function public.ad_placement_normalize();

create or replace function public.ad_provider_normalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.slug := lower(btrim(new.slug));
  new.name := btrim(new.name);
  new.priority := coalesce(new.priority, 100);
  return new;
end;
$$;

drop trigger if exists ad_providers_normalize on ad_providers;
create trigger ad_providers_normalize
  before insert or update on ad_providers
  for each row execute function public.ad_provider_normalize();

-- ── Invariants ────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ad_placements_type_check') then
    alter table public.ad_placements
      add constraint ad_placements_type_check
      check (placement_type in ('banner', 'native', 'in_article', 'rewarded', 'interstitial', 'video'))
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ad_placements_target_check') then
    alter table public.ad_placements
      add constraint ad_placements_target_check
      check (page_target in ('calculator', 'marketplace', 'tools', 'market', 'color_detail',
                             'sidebar', 'gallery', 'ai', 'learn', 'colors', 'home', 'global'))
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ad_placements_links_shape_check') then
    alter table public.ad_placements
      add constraint ad_placements_links_shape_check
      check (jsonb_typeof(provider_ids) = 'array' and jsonb_typeof(display_rules) = 'object')
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ad_providers_slug_shape_check') then
    alter table public.ad_providers
      add constraint ad_providers_slug_shape_check
      check (slug = lower(btrim(slug)) and slug <> '')
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'site_settings_provider_mode_shape_check') then
    alter table public.site_settings
      add constraint site_settings_provider_mode_shape_check
      check (
        (ad_provider_mode = 'single' and ad_provider_slug is not null)
        or (ad_provider_mode <> 'single' and ad_provider_slug is null)
      )
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'subscription_local_prices_currency_shape_check') then
    alter table public.subscription_local_prices
      add constraint subscription_local_prices_currency_shape_check
      check (currency = upper(btrim(currency)) and currency <> '')
      not valid;
  end if;
end $$;

alter table public.ad_placements validate constraint ad_placements_type_check;
alter table public.ad_placements validate constraint ad_placements_target_check;
alter table public.ad_placements validate constraint ad_placements_links_shape_check;
alter table public.ad_providers validate constraint ad_providers_slug_shape_check;
alter table public.site_settings validate constraint site_settings_provider_mode_shape_check;
alter table public.subscription_local_prices validate constraint subscription_local_prices_currency_shape_check;

commit;
