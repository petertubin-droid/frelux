-- The contractor's own supplier rates, held against the account so a negotiated
-- price survives a cleared cache or a new device.
--
-- One row per (user, material slug). The currency is stored with the rate and is
-- never converted: a naira quote stays a naira quote. updated_at is the client's
-- edit instant, used for last-write-wins merging between devices.

create table if not exists public.price_book_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null check (char_length(slug) between 1 and 80),
  rate numeric not null check (rate >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  unit text,
  note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint price_book_entries_user_slug_key unique (user_id, slug)
);

alter table public.price_book_entries enable row level security;

create policy "price book owner reads own rates"
  on public.price_book_entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "price book owner inserts own rates"
  on public.price_book_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "price book owner updates own rates"
  on public.price_book_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "price book owner deletes own rates"
  on public.price_book_entries for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists price_book_entries_user_slug_idx
  on public.price_book_entries (user_id, slug);

grant select, insert, update, delete on public.price_book_entries to authenticated;
