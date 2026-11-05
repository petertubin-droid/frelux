-- =========================================================
-- Migration: 20261105230000_boq_quote_shares.sql
--
-- Shareable quotations.
--
-- A quotation that leaves FRELUX must not change under the client's feet, so a
-- share stores an immutable snapshot of the compiled document as it stood when
-- it was shared. Revisions produce a new share, not a moving target.
--
-- The snapshot is readable only through a SECURITY DEFINER lookup keyed by the
-- share id: no anonymous table access, no listing of other people's quotations,
-- and revocation or expiry takes effect immediately.
--
-- Rollback:
--   drop function if exists public.get_boq_quote_share(uuid);
--   drop table if exists public.boq_quote_shares;
-- =========================================================

create table if not exists public.boq_quote_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id uuid references public.boq_quotes(id) on delete set null,
  mode text not null default 'priced' check (mode in ('priced', 'market_survey')),
  reference text not null default '',
  title text not null default '',
  currency text not null default 'NGN',
  -- The compiled document exactly as shared: document, standard bill and survey
  -- state, so the recipient sees what the sender saw.
  snapshot jsonb not null,
  is_active boolean not null default true,
  expires_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.boq_quote_shares enable row level security;

drop policy if exists "boq_quote_shares_owner_select" on public.boq_quote_shares;
create policy "boq_quote_shares_owner_select" on public.boq_quote_shares
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "boq_quote_shares_owner_insert" on public.boq_quote_shares;
create policy "boq_quote_shares_owner_insert" on public.boq_quote_shares
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "boq_quote_shares_owner_update" on public.boq_quote_shares;
create policy "boq_quote_shares_owner_update" on public.boq_quote_shares
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "boq_quote_shares_owner_delete" on public.boq_quote_shares;
create policy "boq_quote_shares_owner_delete" on public.boq_quote_shares
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists idx_boq_quote_shares_document
  on public.boq_quote_shares(document_id);
create index if not exists idx_boq_quote_shares_user
  on public.boq_quote_shares(user_id);

-- Anonymous and signed-in readers get one quotation, by id, only while it is
-- live. The table itself stays closed.
create or replace function public.get_boq_quote_share(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
begin
  update public.boq_quote_shares
     set view_count = view_count + 1
   where id = p_token
     and is_active = true
     and (expires_at is null or expires_at > now())
  returning snapshot into v_snapshot;

  return v_snapshot;
end;
$$;

revoke all on function public.get_boq_quote_share(uuid) from public;
grant execute on function public.get_boq_quote_share(uuid) to anon, authenticated;
