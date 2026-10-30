-- Community price pipeline
--
-- The admin alone cannot keep every market's price book current, so any
-- signed-in user can report what a material costs where they live. A report
-- never enters an estimate on its own: it is applied to estimation_prices (the
-- book every engine prices from) only when independent reporters agree within
-- the market's auto-apply rule. The applied row records where the price came
-- from, so the admin Price Updater can still trace and override it.
--
-- Nothing here invents a price. A group only resolves when at least the
-- market's min_agreeing_observations distinct people reported values inside
-- max_deviation_percent of the group median.

-- ── 1. Report shape ────────────────────────────────────────────────────────
alter table public.price_submissions
  add column if not exists material_slug text,
  add column if not exists source_url text,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_count integer,
  add column if not exists applied_price_id uuid,
  add column if not exists applied_price numeric,
  add column if not exists applied_at timestamptz;

comment on column public.price_submissions.material_slug is
  'Catalog material this report refers to (estimation_materials.slug). Null when the reporter described an item the catalog does not carry yet.';
comment on column public.price_submissions.applied_price_id is
  'estimation_prices row this report was applied to, once the community threshold was met.';

create index if not exists price_submissions_group_idx
  on public.price_submissions (market, material_slug, status)
  where material_slug is not null;

create index if not exists price_submissions_submitter_idx
  on public.price_submissions (submitted_by, created_at desc);

-- Community prices are their own provenance class; the edit dialog and the
-- Price Updater both render it.
alter table public.estimation_prices
  drop constraint if exists estimation_prices_origin_check;
alter table public.estimation_prices
  add constraint estimation_prices_origin_check
  check (origin = any (array['manual'::text, 'reference'::text, 'scan'::text, 'community'::text]));

-- ── 2. Apply agreed reports ────────────────────────────────────────────────
-- p_market / p_material_slug narrow the run to the group that just changed;
-- null means "every open group". Returns how many price-book rows were written.
create or replace function public.apply_community_prices(
  p_market text default null,
  p_material_slug text default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  grp record;
  material_id uuid;
  max_dev numeric;
  min_obs integer;
  median_price numeric;
  agreeing_count integer;
  agreeing_ids uuid[];
  agreed_price numeric;
  applied_id uuid;
  applied_count integer := 0;
  market_currency text;
begin
  for grp in
    select s.market, s.material_slug
    from public.price_submissions s
    where s.material_slug is not null
      and s.status in ('pending', 'community_verified')
      and s.created_at > now() - interval '180 days'
      and (p_market is null or s.market = p_market)
      and (p_material_slug is null or s.material_slug = p_material_slug)
    group by s.market, s.material_slug
  loop
    select m.id into material_id
    from public.estimation_materials m
    where m.slug = grp.material_slug
    limit 1;

    -- An unknown material cannot be written into the price book.
    if material_id is null then
      continue;
    end if;

    -- The market's own auto-apply rule decides how much agreement is enough.
    select coalesce(r.max_deviation_percent, 30),
           coalesce(r.min_agreeing_observations, 2)
      into max_dev, min_obs
    from public.price_auto_apply_rules r
    where r.market = grp.market and r.is_active
    limit 1;

    max_dev := coalesce(max_dev, 30);
    min_obs := coalesce(min_obs, 2);

    select percentile_cont(0.5) within group (order by s.price),
           count(distinct s.submitted_by)
      into median_price, agreeing_count
    from public.price_submissions s
    where s.market = grp.market
      and s.material_slug = grp.material_slug
      and s.status in ('pending', 'community_verified')
      and s.created_at > now() - interval '180 days'
      and s.price > 0;

    if coalesce(agreeing_count, 0) = 0 then
      continue;
    end if;

    -- Reports that sit inside the tolerance of the group median.
    select array_agg(a.id), count(*)
      into agreeing_ids, agreeing_count
    from (
      select s.id
      from public.price_submissions s
      where s.market = grp.market
        and s.material_slug = grp.material_slug
        and s.status in ('pending', 'community_verified')
        and s.created_at > now() - interval '180 days'
        and s.price > 0
        and abs(s.price - median_price) <= median_price * max_dev / 100.0
    ) a;

    if coalesce(array_length(agreeing_ids, 1), 0) = 0 then
      continue;
    end if;

    select percentile_cont(0.5) within group (order by s.price)
      into agreed_price
    from public.price_submissions s
    where s.id = any (agreeing_ids);

    -- Record the group's progress on every agreeing report.
    update public.price_submissions
       set verification_count = agreeing_count,
           verified_at = case
             when agreeing_count >= min_obs then coalesce(verified_at, now())
             else verified_at
           end,
           status = case
             when agreeing_count >= min_obs then status
             when status = 'pending' then 'community_verified'
             else status
           end
     where id = any (agreeing_ids);

    -- Not enough independent people yet: the reports stay in review.
    if agreeing_count < min_obs then
      continue;
    end if;

    select coalesce((select mp.currency_code from public.market_profiles mp
                      where mp.country_code = grp.market limit 1), 'USD')
      into market_currency;

    select p.id into applied_id
    from public.estimation_prices p
    where p.price_type = 'material'
      and p.ref_id = material_id
      and coalesce(p.market, grp.market) = grp.market
    order by p.effective_date desc nulls last, p.updated_at desc
    limit 1;

    if applied_id is null then
      insert into public.estimation_prices (
        price_type, ref_id, price, currency, market,
        effective_date, notes, is_active, price_source,
        last_scanned_at, scan_confidence, origin
      )
      values (
        'material', material_id, agreed_price, market_currency, grp.market,
        current_date,
        format('Median of %s independent community reports, agreed within %s%%.',
               agreeing_count, max_dev),
        true,
        format('community: %s reporters', agreeing_count),
        now(), 'medium', 'community'
      )
      returning id into applied_id;
    else
      update public.estimation_prices p
         set price = agreed_price,
             currency = market_currency,
             effective_date = current_date,
             notes = format('Median of %s independent community reports, agreed within %s%%.',
                            agreeing_count, max_dev),
             price_source = format('community: %s reporters', agreeing_count),
             last_scanned_at = now(),
             scan_confidence = 'medium',
             origin = 'community',
             updated_at = now()
       where p.id = applied_id;
    end if;

    update public.price_submissions
       set status = 'approved',
           applied_price_id = applied_id,
           applied_price = agreed_price,
           applied_at = now(),
           verified_at = coalesce(verified_at, now())
     where id = any (agreeing_ids);

    applied_count := applied_count + 1;
  end loop;

  return applied_count;
end;
$$;

revoke all on function public.apply_community_prices(text, text) from public;
grant execute on function public.apply_community_prices(text, text) to authenticated, service_role;

-- ── 3. Run it whenever a report lands or changes ───────────────────────────
create or replace function public.price_submission_after_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.material_slug is not null
     and new.status in ('pending', 'community_verified')
     and new.price > 0 then
    perform public.apply_community_prices(new.market, new.material_slug);
  end if;
  return new;
end;
$$;

drop trigger if exists price_submission_apply on public.price_submissions;
create trigger price_submission_apply
  after insert or update of price, status, material_slug
  on public.price_submissions
  for each row
  execute function public.price_submission_after_change();

-- ── 4. Reporters may see the group's progress, not other people's rows ─────
create or replace function public.price_group_progress(
  p_market text,
  p_material_slug text
)
returns table (reporters integer, median_price numeric, verified boolean)
language sql
security definer
set search_path to 'public'
stable
as $$
  select count(distinct s.submitted_by)::integer,
         percentile_cont(0.5) within group (order by s.price)::numeric,
         count(distinct s.submitted_by) >= coalesce((
           select r.min_agreeing_observations from public.price_auto_apply_rules r
           where r.market = p_market and r.is_active limit 1), 2)
  from public.price_submissions s
  where s.market = p_market
    and s.material_slug = p_material_slug
    and s.status in ('pending', 'community_verified', 'approved')
    and s.created_at > now() - interval '180 days'
    and s.price > 0;
$$;

grant execute on function public.price_group_progress(text, text) to authenticated, service_role;
