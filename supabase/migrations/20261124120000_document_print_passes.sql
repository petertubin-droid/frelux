-- =========================================================
-- Document print passes: server-authoritative entitlement.
--
-- The client previously recorded a print pass in localStorage, so a user could
-- write their own pass and print anything. A pass is now a row that only the
-- service role can create, written after a payment reference has been verified
-- with the gateway. Users may read their own passes; nobody may write one from
-- the browser.
--
-- This migration touches no authority-layer objects: it references the existing
-- is_admin() helper for the admin read policy and changes nothing about it.
-- =========================================================

create table if not exists public.document_print_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null check (length(trim(document_id)) between 1 and 200),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  usd_amount numeric(10, 2) not null check (usd_amount > 0),
  gateway text not null check (gateway in ('paystack', 'flutterwave', 'nowpayments', 'btcpay')),
  provider_reference text not null check (length(trim(provider_reference)) between 4 and 200),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- One payment may unlock one document: a reference cannot be replayed across
-- documents, and a user holds at most one pass per document (renewal upserts).
create unique index if not exists document_print_passes_reference_key
  on public.document_print_passes (provider_reference);
create unique index if not exists document_print_passes_user_document_key
  on public.document_print_passes (user_id, document_id);

create index if not exists document_print_passes_lookup_idx
  on public.document_print_passes (user_id, expires_at desc);

alter table public.document_print_passes enable row level security;
alter table public.document_print_passes force row level security;

drop policy if exists "read own print passes" on public.document_print_passes;
create policy "read own print passes"
  on public.document_print_passes
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "admins read print passes" on public.document_print_passes;
create policy "admins read print passes"
  on public.document_print_passes
  for select
  to authenticated
  using (public.is_admin());

-- No INSERT/UPDATE/DELETE policy exists on purpose: with RLS forced, only the
-- service role (which bypasses RLS) can write. The browser can never mint a pass.

revoke all on public.document_print_passes from anon;
revoke all on public.document_print_passes from authenticated;
grant select on public.document_print_passes to authenticated;
