-- =========================================================
-- API wallet top-ups (2026-10-31)
--
-- The wallet could be spent (charge_api_request) but never filled: balance
-- only ever moved down. This adds the credit side as an append-only ledger
-- keyed by the payment provider's reference, so a replayed or retried webhook
-- can never credit the same money twice.
--
-- Credited and refused attempts are both recorded. A refused charge is the
-- interesting one in support: the caller paid something, and there needs to
-- be a row saying why it was not applied.
-- =========================================================

create table if not exists public.frelux_api_wallet_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reference text not null unique,
  provider text not null default 'flutterwave',
  amount_usd numeric(12,4) not null check (amount_usd > 0),
  status text not null default 'credited' check (status in ('credited', 'refused')),
  refusal_reason text,
  created_at timestamptz not null default now(),
  credited_at timestamptz
);

create index if not exists idx_api_wallet_topups_user
  on public.frelux_api_wallet_topups (user_id, created_at desc);

alter table public.frelux_api_wallet_topups enable row level security;

drop policy if exists frelux_api_wallet_topups_owner_read on public.frelux_api_wallet_topups;
create policy frelux_api_wallet_topups_owner_read on public.frelux_api_wallet_topups
  for select using (user_id = auth.uid() or public.is_admin());

comment on table public.frelux_api_wallet_topups is
  'Append-only ledger of API wallet top-ups. One row per provider reference; '
  'credit_api_wallet_topup() is idempotent on that reference.';

-- ── Credit, idempotently ──────────────────────────────────
-- Returns credited=false with the current balance when the reference has
-- already been applied, so the webhook can answer 200 to a replay without
-- adding money twice.
create or replace function public.credit_api_wallet_topup(
  p_user uuid,
  p_reference text,
  p_amount_usd numeric,
  p_provider text default 'flutterwave'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(12,4);
  v_inserted integer;
  v_balance numeric(12,4);
begin
  if p_user is null then
    raise exception 'user is required';
  end if;
  if p_reference is null or btrim(p_reference) = '' then
    raise exception 'reference is required';
  end if;

  v_amount := round(p_amount_usd, 4);
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  insert into public.frelux_api_wallet_topups
    (user_id, reference, provider, amount_usd, status, credited_at)
  values
    (p_user, p_reference, coalesce(nullif(btrim(p_provider), ''), 'flutterwave'),
     v_amount, 'credited', now())
  on conflict (reference) do nothing;

  get diagnostics v_inserted = row_count;

  -- Make sure the wallet exists even for a replay, so the response can state
  -- a balance rather than null.
  perform public.api_wallet_for(p_user);

  if v_inserted = 0 then
    select balance_usd into v_balance
      from public.frelux_api_wallets where user_id = p_user;
    return jsonb_build_object(
      'credited', false,
      'reason', 'duplicate_reference',
      'balance_usd', coalesce(v_balance, 0)
    );
  end if;

  update public.frelux_api_wallets
     set balance_usd = balance_usd + v_amount
   where user_id = p_user
   returning balance_usd into v_balance;

  return jsonb_build_object(
    'credited', true,
    'amount_usd', v_amount,
    'balance_usd', v_balance
  );
end;
$$;

revoke all on function public.credit_api_wallet_topup(uuid, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.credit_api_wallet_topup(uuid, text, numeric, text)
  to service_role;

-- ── Record a charge we would not credit ───────────────────
-- Money moved at the provider but the figures did not match the quote. No
-- balance change; the row exists so support can reconcile it.
create or replace function public.refuse_api_wallet_topup(
  p_user uuid,
  p_reference text,
  p_amount_usd numeric,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or p_reference is null or btrim(p_reference) = '' then
    return;
  end if;

  insert into public.frelux_api_wallet_topups
    (user_id, reference, amount_usd, status, refusal_reason)
  values
    (p_user, p_reference, greatest(round(p_amount_usd, 4), 0.0001), 'refused',
     left(coalesce(p_reason, 'not credited'), 500))
  on conflict (reference) do nothing;
end;
$$;

revoke all on function public.refuse_api_wallet_topup(uuid, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.refuse_api_wallet_topup(uuid, text, numeric, text)
  to service_role;
