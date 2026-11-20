-- Marketplace inquiry threads.
--
-- Inquiries were one-way: a buyer wrote once and the seller could only change a
-- status. There was no way to answer, so a buyer who asked a question saw
-- nothing back and the seller's reply had nowhere to live. This adds the reply
-- thread on the inquiry that already exists, rather than a second messaging
-- model, so an inquiry keeps its product, buyer and seller in one place.

create table if not exists public.marketplace_inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.marketplace_product_inquiries(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_inquiry_messages_thread_idx
  on public.marketplace_inquiry_messages (inquiry_id, created_at);

alter table public.marketplace_inquiry_messages enable row level security;
-- Repo convention: new tables force RLS so the table owner cannot bypass it.
alter table public.marketplace_inquiry_messages force row level security;

grant select, insert, update on public.marketplace_inquiry_messages to authenticated;

-- One predicate, used by every policy: the caller is the buyer on the inquiry
-- or the seller who owns the product it was made about.
create or replace function public.is_inquiry_participant(target_inquiry uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.marketplace_product_inquiries i
    join public.marketplace_products p on p.id = i.product_id
    where i.id = target_inquiry
      and (i.buyer_id = auth.uid() or p.seller_id = auth.uid())
  );
$$;

revoke all on function public.is_inquiry_participant(uuid) from public;
grant execute on function public.is_inquiry_participant(uuid) to authenticated;

drop policy if exists read_inquiry_messages on public.marketplace_inquiry_messages;
create policy read_inquiry_messages on public.marketplace_inquiry_messages
  for select using (public.is_inquiry_participant(inquiry_id));

drop policy if exists send_inquiry_message on public.marketplace_inquiry_messages;
create policy send_inquiry_message on public.marketplace_inquiry_messages
  for insert with check (
    sender_id = auth.uid() and public.is_inquiry_participant(inquiry_id)
  );

drop policy if exists mark_inquiry_message_read on public.marketplace_inquiry_messages;
create policy mark_inquiry_message_read on public.marketplace_inquiry_messages
  for update using (public.is_inquiry_participant(inquiry_id))
  with check (public.is_inquiry_participant(inquiry_id));
