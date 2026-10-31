-- =========================================================
-- API auto top-up (2026-10-31)
--
-- The wallet could be filled by hand. An owner who does not want requests
-- refused at 402 asked for it to fill itself. That is a charge nobody is
-- watching, so the rules are deliberately narrow:
--
--   one card, held as a provider token, never readable by a browser;
--   recorded consent, versioned, because "enabled" without consent is a
--     charge somebody did not agree to;
--   a cooldown, so a failing sweep cannot hammer a card;
--   two consecutive declines and it switches itself off;
--   strict "balance below threshold", so it never charges a full wallet.
--
-- Provider prerequisite, not something code can grant: Flutterwave requires
-- PCI DSS certification and explicit account enablement before direct card
-- charges or card tokenization. Until then no card row can exist, and the
-- sweep finds nothing to do. That is the honest state, not a stub.
-- =========================================================

-- ── Saved cards ───────────────────────────────────────────
create table if not exists public.frelux_api_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'flutterwave',
  provider_token text not null,
  brand text,
  last4 text check (last4 ~ '^[0-9]{4}$'),
  exp_month integer check (exp_month between 1 and 12),
  exp_year integer,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, provider, provider_token)
);

create index if not exists idx_api_payment_methods_owner
  on public.frelux_api_payment_methods (user_id) where revoked_at is null;

alter table public.frelux_api_payment_methods enable row level security;

-- No policy and no grant for authenticated: the token inside is chargeable,
-- so it must never reach a browser. Owners read a safe projection through
-- api_payment_methods_for_owner() instead.
revoke all on table public.frelux_api_payment_methods from public, anon, authenticated;
grant select, insert, update, delete on table public.frelux_api_payment_methods to service_role;

comment on table public.frelux_api_payment_methods is
  'Saved cards as provider tokens. The token is chargeable, so this table is '
  'service-role only; owners see brand and last4 through '
  'api_payment_methods_for_owner().';

-- ── Controls and consent on the wallet ────────────────────
alter table public.frelux_api_wallets
  add column if not exists auto_topup_card_id uuid
    references public.frelux_api_payment_methods(id) on delete set null,
  add column if not exists auto_topup_consent_at timestamptz,
  add column if not exists auto_topup_consent_version text,
  add column if not exists auto_topup_last_attempt_at timestamptz,
  add column if not exists auto_topup_consecutive_failures integer not null default 0,
  add column if not exists auto_topup_disabled_reason text;

comment on column public.frelux_api_wallets.auto_topup_enabled is
  'Owner preference, reachable only through set_api_auto_topup(), which also '
  'requires a card and recorded consent. It is no longer free-standing.';

-- ── Attempts ──────────────────────────────────────────────
create table if not exists public.frelux_api_autotopup_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id uuid references public.frelux_api_payment_methods(id) on delete set null,
  amount_usd numeric(12,4) not null check (amount_usd > 0),
  status text not null default 'pending'
    check (status in ('pending', 'credited', 'declined', 'failed')),
  tx_ref text not null unique,
  provider_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- One charge in flight per wallet. Two concurrent sweeps cannot charge twice.
create unique index if not exists uniq_autotopup_pending_per_user
  on public.frelux_api_autotopup_attempts (user_id) where status = 'pending';

create index if not exists idx_autotopup_attempts_user
  on public.frelux_api_autotopup_attempts (user_id, created_at desc);

alter table public.frelux_api_autotopup_attempts enable row level security;

drop policy if exists frelux_autotopup_attempts_owner_read
  on public.frelux_api_autotopup_attempts;
create policy frelux_autotopup_attempts_owner_read
  on public.frelux_api_autotopup_attempts for select
  using (user_id = auth.uid() or public.is_admin());

grant select on table public.frelux_api_autotopup_attempts to authenticated;
grant select, insert, update, delete on table public.frelux_api_autotopup_attempts
  to service_role;

-- ── Owner-facing projection (no tokens) ───────────────────
create or replace function public.api_payment_methods_for_owner()
returns table (
  id uuid,
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select m.id, m.brand, m.last4, m.exp_month, m.exp_year, m.is_default, m.created_at
  from public.frelux_api_payment_methods m
  where m.user_id = auth.uid() and m.revoked_at is null
  order by m.is_default desc, m.created_at desc;
$$;

revoke all on function public.api_payment_methods_for_owner() from public, anon;
grant execute on function public.api_payment_methods_for_owner() to authenticated;

-- ── Set the preference (owner) ────────────────────────────
create or replace function public.set_api_auto_topup(
  p_enable boolean,
  p_threshold_usd numeric default null,
  p_amount_usd numeric default null,
  p_card_id uuid default null,
  p_consent_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_card public.frelux_api_payment_methods;
  v_threshold numeric(12,4);
  v_amount numeric(12,4);
begin
  if v_user is null then raise exception 'authentication required'; end if;

  if not coalesce(p_enable, false) then
    update public.frelux_api_wallets
      set auto_topup_enabled = false,
          auto_topup_disabled_reason = null,
          auto_topup_consecutive_failures = 0
      where user_id = v_user;
    return jsonb_build_object('enabled', false);
  end if;

  if p_consent_version is null or btrim(p_consent_version) = '' then
    return jsonb_build_object('error', 'consent is required to charge a card automatically');
  end if;

  select * into v_card from public.frelux_api_payment_methods
    where id = p_card_id and user_id = v_user and revoked_at is null;
  if v_card.id is null then
    return jsonb_build_object('error', 'no saved card belongs to this account');
  end if;

  v_threshold := p_threshold_usd;
  v_amount := p_amount_usd;
  if v_threshold is null or v_threshold < 0 then
    return jsonb_build_object('error', 'threshold must be zero or more');
  end if;
  -- Mirrors AUTOTOPUP_MIN_USD / AUTOTOPUP_MAX_USD in _shared/auto-topup.ts.
  if v_amount is null or v_amount < 5 then
    return jsonb_build_object('error', 'amount must be at least 5');
  end if;
  if v_amount > 200 then
    return jsonb_build_object('error', 'amount must be at most 200 for an automatic charge');
  end if;
  -- One charge must land the balance above the threshold, or the next sweep
  -- charges again immediately and the safety net becomes a subscription.
  if v_threshold >= v_amount then
    return jsonb_build_object('error', 'threshold must be below the amount');
  end if;

  update public.frelux_api_wallets
    set auto_topup_enabled = true,
        auto_topup_threshold_usd = v_threshold,
        auto_topup_amount_usd = v_amount,
        auto_topup_card_id = v_card.id,
        auto_topup_consent_at = coalesce(auto_topup_consent_at, now()),
        auto_topup_consent_version = p_consent_version,
        auto_topup_consecutive_failures = 0,
        auto_topup_disabled_reason = null
    where user_id = v_user;

  return jsonb_build_object(
    'enabled', true,
    'threshold_usd', v_threshold,
    'amount_usd', v_amount,
    'card_last4', v_card.last4
  );
end;
$$;

revoke all on function public.set_api_auto_topup(boolean, numeric, numeric, uuid, text)
  from public, anon;
grant execute on function public.set_api_auto_topup(boolean, numeric, numeric, uuid, text)
  to authenticated, service_role;

-- ── Register a card (service role, from the tokenization path) ──
create or replace function public.register_api_payment_method(
  p_user uuid,
  p_token text,
  p_brand text default null,
  p_last4 text default null,
  p_exp_month integer default null,
  p_exp_year integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing uuid;
  v_default boolean;
begin
  if p_user is null or p_token is null or btrim(p_token) = '' then
    raise exception 'user and token are required';
  end if;
  if p_last4 is not null and p_last4 !~ '^[0-9]{4}$' then
    raise exception 'last4 must be four digits';
  end if;

  select id into v_existing from public.frelux_api_payment_methods
    where user_id = p_user and provider = 'flutterwave' and provider_token = p_token;
  if v_existing is not null then return v_existing; end if;

  select not exists (
    select 1 from public.frelux_api_payment_methods
    where user_id = p_user and revoked_at is null
  ) into v_default;

  insert into public.frelux_api_payment_methods
    (user_id, provider, provider_token, brand, last4, exp_month, exp_year, is_default)
  values
    (p_user, 'flutterwave', p_token, p_brand, p_last4, p_exp_month, p_exp_year, v_default)
  returning id into v_id;

  -- First card becomes the auto top-up card, but only if consent already
  -- exists. A card is not consent.
  update public.frelux_api_wallets
    set auto_topup_card_id = v_id
    where user_id = p_user
      and auto_topup_card_id is null
      and auto_topup_consent_at is not null;

  return v_id;
end;
$$;

revoke all on function public.register_api_payment_method(uuid, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.register_api_payment_method(uuid, text, text, text, integer, integer)
  to service_role;

-- ── Sweep: who should be charged now ──────────────────────
-- Mirrors shouldCharge() in _shared/auto-topup.ts. The database is the
-- authority because the sweep is a set query, but the pure function is what
-- the tests pin, so the two are kept deliberately identical.
create or replace function public.api_autotopup_candidates(p_limit integer default 20)
returns table (
  user_id uuid,
  card_id uuid,
  amount_usd numeric,
  balance_usd numeric
)
language sql
security definer
set search_path = public
as $$
  select w.user_id, w.auto_topup_card_id, w.auto_topup_amount_usd, w.balance_usd
  from public.frelux_api_wallets w
  join public.frelux_api_payment_methods m
    on m.id = w.auto_topup_card_id
   and m.user_id = w.user_id
   and m.revoked_at is null
  where w.auto_topup_enabled
    and w.auto_topup_consent_at is not null
    and w.auto_topup_consecutive_failures < 2
    and w.balance_usd < w.auto_topup_threshold_usd
    and (w.auto_topup_last_attempt_at is null
         or w.auto_topup_last_attempt_at < now() - interval '10 minutes')
    and not exists (
      select 1 from public.frelux_api_autotopup_attempts a
      where a.user_id = w.user_id and a.status = 'pending'
    )
  order by w.balance_usd asc
  limit greatest(coalesce(p_limit, 20), 1);
$$;

revoke all on function public.api_autotopup_candidates(integer) from public, anon, authenticated;
grant execute on function public.api_autotopup_candidates(integer) to service_role;

-- ── Begin an attempt ──────────────────────────────────────
create or replace function public.begin_api_autotopup(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.frelux_api_wallets;
  v_attempt uuid;
  v_ref text;
  v_stale integer;
begin
  if p_user is null then raise exception 'user is required'; end if;

  -- Serialise per wallet so two sweepers cannot both proceed.
  perform pg_advisory_xact_lock(hashtext('autotopup:' || p_user::text));

  -- An attempt whose process died must not block the wallet forever.
  update public.frelux_api_autotopup_attempts
    set status = 'failed',
        failure_reason = 'attempt timed out before a result was recorded',
        completed_at = now()
    where user_id = p_user and status = 'pending'
      and created_at < now() - interval '15 minutes';
  get diagnostics v_stale = row_count;

  select * into w from public.frelux_api_wallets where user_id = p_user for update;
  if w.user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no wallet');
  end if;

  if not w.auto_topup_enabled
     or w.auto_topup_consent_at is null
     or w.auto_topup_card_id is null
     or w.auto_topup_consecutive_failures >= 2
     or w.balance_usd >= w.auto_topup_threshold_usd
     or (w.auto_topup_last_attempt_at is not null
         and w.auto_topup_last_attempt_at > now() - interval '10 minutes')
     or exists (
       select 1 from public.frelux_api_autotopup_attempts a
       where a.user_id = p_user and a.status = 'pending'
     )
  then
    return jsonb_build_object('ok', false, 'reason', 'not eligible');
  end if;

  v_ref := 'FLAUTO_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.frelux_api_autotopup_attempts
    (user_id, card_id, amount_usd, status, tx_ref)
  values
    (p_user, w.auto_topup_card_id, w.auto_topup_amount_usd, 'pending', v_ref)
  returning id into v_attempt;

  update public.frelux_api_wallets
    set auto_topup_last_attempt_at = now()
    where user_id = p_user;

  return jsonb_build_object(
    'ok', true,
    'attempt_id', v_attempt,
    'card_id', w.auto_topup_card_id,
    'amount_usd', w.auto_topup_amount_usd,
    'tx_ref', v_ref,
    'stale_cleared', v_stale
  );
end;
$$;

revoke all on function public.begin_api_autotopup(uuid) from public, anon, authenticated;
grant execute on function public.begin_api_autotopup(uuid) to service_role;

-- ── Settle an attempt ─────────────────────────────────────
create or replace function public.finish_api_autotopup(
  p_attempt uuid,
  p_status text,
  p_provider_reference text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.frelux_api_autotopup_attempts;
  w public.frelux_api_wallets;
  v_credit jsonb;
  v_fails integer;
begin
  select * into a from public.frelux_api_autotopup_attempts where id = p_attempt for update;
  if a.id is null then raise exception 'attempt not found'; end if;
  if a.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'already settled', 'status', a.status);
  end if;

  select * into w from public.frelux_api_wallets where user_id = a.user_id for update;
  if w.user_id is null then raise exception 'wallet missing for attempt'; end if;

  if p_status = 'credited' then
    -- Idempotent on the provider reference: a double settle cannot double pay.
    v_credit := public.credit_api_wallet_topup(
      a.user_id, 'auto:' || a.tx_ref, a.amount_usd, 'flutterwave'
    );
    update public.frelux_api_autotopup_attempts
      set status = 'credited',
          provider_reference = p_provider_reference,
          completed_at = now()
      where id = a.id;
    update public.frelux_api_wallets
      set auto_topup_consecutive_failures = 0,
          auto_topup_disabled_reason = null
      where user_id = a.user_id;
    return jsonb_build_object('ok', true, 'status', 'credited', 'credit', v_credit);
  end if;

  if p_status not in ('declined', 'failed') then
    raise exception 'invalid status %', p_status;
  end if;

  v_fails := coalesce(w.auto_topup_consecutive_failures, 0) + 1;

  update public.frelux_api_autotopup_attempts
    set status = p_status,
        provider_reference = p_provider_reference,
        failure_reason = left(coalesce(p_reason, 'no reason given'), 500),
        completed_at = now()
    where id = a.id;

  if v_fails >= 2 then
    update public.frelux_api_wallets
      set auto_topup_consecutive_failures = v_fails,
          auto_topup_enabled = false,
          auto_topup_disabled_reason =
            'Switched off after two charges in a row were declined. Check the card, then turn it back on.'
      where user_id = a.user_id;
  else
    update public.frelux_api_wallets
      set auto_topup_consecutive_failures = v_fails
      where user_id = a.user_id;
  end if;

  return jsonb_build_object(
    'ok', true, 'status', p_status, 'failures', v_fails,
    'disabled', v_fails >= 2
  );
end;
$$;

revoke all on function public.finish_api_autotopup(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.finish_api_autotopup(uuid, text, text, text)
  to service_role;

-- ── Cron secret store ─────────────────────────────────────
-- pg_cron cannot read Supabase function secrets, so the shared secret the
-- sweep presents lives here. No grants and no policies: only the cron owner
-- (postgres) and service_role can read it.
create table if not exists public.frelux_internal_config (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.frelux_internal_config enable row level security;
revoke all on table public.frelux_internal_config from public, anon, authenticated;
grant select on table public.frelux_internal_config to service_role;

-- ── Schedule the sweep ────────────────────────────────────
-- Every ten minutes, matching the cooldown. The function itself refuses any
-- caller without the secret, so an empty config row fails closed.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'frelux-autotopup-sweep') then
    perform cron.unschedule('frelux-autotopup-sweep');
  end if;
  perform cron.schedule(
    'frelux-autotopup-sweep',
    '*/10 * * * *',
    $job$
      select net.http_post(
        url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/frelix-wallet-autotopup',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-frelux-cron-secret',
          coalesce((select value from public.frelux_internal_config
                    where name = 'autotopup_cron_secret'), '')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 15000
      );
    $job$
  );
exception when others then
  raise notice 'auto top-up sweep not scheduled: %', sqlerrm;
end $$;
