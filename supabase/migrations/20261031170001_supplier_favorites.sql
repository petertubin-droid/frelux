-- 20261031170000_supplier_favorites.sql
-- Saving a supplier reuses the existing marketplace_favorites table. The
-- supplier_id column is already there; only the item_type check needs the new
-- value, plus a unique pair so saving twice stays idempotent.
--
-- ROLLBACK: see supabase/migrations/rollback/20261031170000_supplier_favorites_rollback.sql

begin;

delete from public.marketplace_favorites where item_type = 'supplier';

alter table public.marketplace_favorites
  drop constraint if exists marketplace_favorites_item_type_check;

alter table public.marketplace_favorites
  add constraint marketplace_favorites_item_type_check
  check (item_type = any (array['product', 'listing', 'professional', 'project', 'supplier']));

alter table public.marketplace_favorites
  add constraint marketplace_favorites_supplier_fk
  foreign key (supplier_id) references public.supplier_profiles (id) on delete cascade;

create unique index if not exists marketplace_favorites_user_supplier_key
  on public.marketplace_favorites (user_id, supplier_id)
  where supplier_id is not null;

commit;
