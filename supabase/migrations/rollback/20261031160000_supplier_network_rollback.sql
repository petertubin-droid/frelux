-- Rollback for 20261031160000_supplier_network.sql
-- Restores the pre-marketplace supplier schema. Data written by the supplier
-- network (requests, quotes, orders, verification events) is dropped with it.

begin;

drop table if exists public.material_order_events cascade;
drop table if exists public.material_orders cascade;
drop table if exists public.material_request_quotes cascade;
drop table if exists public.material_request_items cascade;
drop table if exists public.material_requests cascade;
drop table if exists public.supplier_verification_events cascade;
drop table if exists public.supplier_delivery_zones cascade;
drop table if exists public.supplier_plans cascade;
drop table if exists public.supplier_audit_log cascade;

drop function if exists public.guard_material_request_award() cascade;
drop function if exists public.guard_material_quote_insert() cascade;
drop function if exists public.touch_listing_price() cascade;
drop function if exists public.current_supplier_id() cascade;

drop index if exists public.marketplace_favorites_supplier_key;
alter table public.marketplace_favorites drop column if exists supplier_id;
alter table public.marketplace_reports drop column if exists supplier_id;

drop index if exists public.supplier_inventory_search_idx;
alter table public.supplier_inventory_items
  drop column if exists specification,
  drop column if exists delivery_fee,
  drop column if exists delivery_fee_currency,
  drop column if exists price_updated_at,
  drop column if exists listing_status,
  drop column if exists admin_notes;

drop index if exists public.supplier_profiles_directory_idx;
drop index if exists public.supplier_profiles_public_slug_key;
alter table public.supplier_profiles
  drop column if exists description,
  drop column if exists neighbourhood,
  drop column if exists product_categories,
  drop column if exists public_slug,
  drop column if exists verification_level,
  drop column if exists delivery_notes,
  drop column if exists minimum_order_value,
  drop column if exists delivery_fee_model,
  drop column if exists response_rate,
  drop column if exists avg_response_hours,
  drop column if exists subscription_plan,
  drop column if exists subscription_status,
  drop column if exists subscription_renews_at,
  drop column if exists is_featured,
  drop column if exists featured_until,
  drop column if exists lead_credits;

commit;
