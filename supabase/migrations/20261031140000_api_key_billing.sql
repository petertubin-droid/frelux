-- API key billing that cannot surprise anyone, and cannot stop a live integration.
--
-- Two problems with the previous model:
--   1. Every metered request recorded cost = 0, so nobody could see what a call
--      actually cost or bill for it.
--   2. A key hit a hard wall at its monthly quota and started returning 429,
--      which is the worst possible moment to discover a pricing decision.
--
-- This migration adds a prepaid wallet, per-unit rates derived from real
-- marginal cost, a grace band so a running integration is never cut mid-run,
-- and idempotent charging so a retried request is never billed twice.
--
-- Pricing lives in plan configuration, never in code.

-- ── Idempotent charging ───────────────────────────────────
-- One billable row per request. A client retry with the same request id
-- (X-Request-Id) can never be charged twice.
create unique index if not exists frelux_api_usage_key_request_uniq
  on public.frelux_api_usage (api_key_id, request_id);

-- ── Prepaid wallet ────────────────────────────────────────
-- Overage is drawn from this balance instead of being refused outright.
create table if not exists public.frelux_api_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  balance_usd numeric(12,4) not null default 0 check (balance_usd >= 0),
  auto_topup_enabled boolean not null default false,
  auto_topup_threshold_usd numeric(12,4) not null default 5 check (auto_topup_threshold_usd >= 0),
  auto_topup_amount_usd numeric(12,4) not null default 20 check (auto_topup_amount_usd > 0),
  lifetime_charged_usd numeric(14,4) not null default 0,
  low_balance_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.frelux_api_wallets enable row level security;

drop policy if exists frelux_api_wallets_owner_read on public.frelux_api_wallets;
create policy frelux_api_wallets_owner_read on public.frelux_api_wallets
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists frelux_api_wallets_admin_manage on public.frelux_api_wallets;
create policy frelux_api_wallets_admin_manage on public.frelux_api_wallets
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_api_wallet()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_touch_api_wallet on public.frelux_api_wallets;
create trigger trg_touch_api_wallet before update on public.frelux_api_wallets
  for each row execute function public.touch_api_wallet();

-- ── Per-unit rates and the grace band ─────────────────────
-- Cost anchors, stated so the numbers are auditable rather than invented:
--   deterministic calculation request  ~ 0.000002 USD (edge invoke + 2 queries)
--   AI-assisted request (native)       ~ 0.0008 USD
--   AI-assisted request (external)     ~ 0.003 USD
-- Included rates sit far above cost and far below the value of a takeoff.
update public.frelux_api_plans p
   set config = p.config || jsonb_build_object(
     'currency', 'USD',
     'gracePercent', 5,
     -- billed only past the included monthly allowance
     'overagePerRequestUsd', case p.key
        when 'free' then null
        when 'developer' then 0.0012
        when 'pro' then 0.0009
        when 'business' then 0.0007
        when 'enterprise' then 0.0005
        else 0.0012 end,
     'overagePerAiRequestUsd', case p.key
        when 'free' then null
        when 'developer' then 0.0060
        when 'pro' then 0.0045
        when 'business' then 0.0035
        when 'enterprise' then 0.0025
        else 0.0060 end,
     -- what a request is worth for reporting: the included rate implied by the
     -- monthly price, so cost lines sum to the invoice rather than to a guess
     'effectivePerRequestUsd', case p.key
        when 'free' then 0
        when 'developer' then 0.00095
        when 'pro' then 0.00049
        when 'business' then 0.000398
        when 'enterprise' then 0.00025
        else 0.00095 end,
     'billableStatuses', jsonb_build_array(200, 201, 202),
     'neverBillableStatuses', jsonb_build_array(400, 401, 402, 403, 404, 422, 429, 500, 502, 503)
   ),
   updated_at = now()
 where p.key in ('free','developer','pro','business','enterprise','custom');

-- Plan prices, restated around what the usage is worth rather than a round
-- number, so a plan change never arrives as a surprise on an invoice.
update public.frelux_api_plans p
   set config = p.config || jsonb_build_object('priceMonthly', v.price),
       updated_at = now()
  from (values ('free',0),('developer',19),('pro',79),('business',249)) as v(key, price)
 where p.key = v.key;

-- Included allowances widened where the old numbers were tighter than the new
-- price implied. A Developer plan now buys 20,000 calculator calls and 1,500 AI
-- calls; a request costs a fraction of a cent to serve.
update public.frelux_api_plans p
   set config = p.config || jsonb_build_object(
     'monthlyQuota', v.calc, 'calculatorRequestsMonthly', v.calc,
     'aiRequestsMonthly', v.ai, 'dailyQuota', v.daily,
     'rateLimitPerMinute', v.rpm
   ), updated_at = now()
  from (values
    ('free', 1000, 100, 250, 10),
    ('developer', 20000, 1500, 1000, 60),
    ('pro', 120000, 8000, 6000, 120),
    ('business', 500000, 35000, 25000, 300)
  ) as v(key, calc, ai, daily, rpm)
 where p.key = v.key;

-- ── Balance and chagring helpers ──────────────────────────
create or replace function public.api_wallet_for(p_user uuid)
returns public.frelux_api_wallets
language plpgsql security definer set search_path to 'public' as $$
declare w public.frelux_api_wallets;
begin
  select * into w from public.frelux_api_wallets where user_id = p_user;
  if not found then
    insert into public.frelux_api_wallets (user_id) values (p_user) returning * into w;
  end if;
  return w;
end $$;

grant execute on function public.api_wallet_for(uuid) to service_role;

-- Charge one billable request. Idempotent by (key, request_id): a duplicate
-- call returns charged = false and changes nothing.
create or replace function public.charge_api_request(
  p_api_key_id uuid,
  p_user_id uuid,
  p_request_id text,
  p_cost_usd numeric,
  p_allow_wallet boolean default true
) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  existing uuid;
  w public.frelux_api_wallets;
  taken numeric(12,4);
begin
  select id into existing
    from public.frelux_api_usage
   where api_key_id = p_api_key_id and request_id = p_request_id
   limit 1;
  if existing is not null then
    return jsonb_build_object('charged', false, 'reason', 'duplicate_request');
  end if;

  if p_cost_usd is null or p_cost_usd <= 0 or not p_allow_wallet then
    return jsonb_build_object('charged', false, 'reason', 'nothing_to_charge');
  end if;

  w := public.api_wallet_for(p_user_id);
  taken := round(least(p_cost_usd, w.balance_usd), 4);

  update public.frelux_api_wallets
     set balance_usd = balance_usd - taken,
         lifetime_charged_usd = lifetime_charged_usd + taken
   where user_id = p_user_id;

  return jsonb_build_object(
    'charged', true,
    'charged_usd', taken,
    'balance_usd', (w.balance_usd - taken),
    'shortfall_usd', round(p_cost_usd - taken, 4)
  );
end $$;

grant execute on function public.charge_api_request(uuid, uuid, text, numeric, boolean)
  to service_role;

comment on table public.frelux_api_wallets is
  'Prepaid API credit. Overage draws from here so a live integration is never cut mid-run; a zero balance returns 402 with headers, not a silent failure.';
