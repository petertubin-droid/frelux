-- 20261031180000_marketplace_report_taxonomy.sql
-- The shared marketplace_reports table was built for product moderation. Order
-- disputes reuse it so an administrator sees one complaint queue, which needs
-- the dispute type and its lifecycle values admitted by the existing checks.
--
-- ROLLBACK: supabase/migrations/rollback/20261031180000_marketplace_report_taxonomy_rollback.sql

begin;

alter table public.marketplace_reports drop constraint if exists marketplace_reports_report_type_check;
alter table public.marketplace_reports
  add constraint marketplace_reports_report_type_check
  check (report_type = any (array[
    'product', 'listing', 'review', 'seller', 'professional',
    'supplier', 'order_dispute'
  ]));

alter table public.marketplace_reports drop constraint if exists marketplace_reports_reason_check;
alter table public.marketplace_reports
  add constraint marketplace_reports_reason_check
  check (reason = any (array[
    'scam', 'counterfeit', 'prohibited_item', 'misleading_information',
    'inappropriate_content', 'duplicate', 'wrong_category', 'spam', 'other',
    'fraud', 'fake_listing', 'wrong_price', 'no_delivery',
    'non_delivery', 'wrong_quality', 'wrong_quantity', 'order_dispute'
  ]));

alter table public.marketplace_reports drop constraint if exists marketplace_reports_status_check;
alter table public.marketplace_reports
  add constraint marketplace_reports_status_check
  check (status = any (array['open', 'investigating', 'pending', 'reviewing', 'resolved', 'dismissed']));

commit;
