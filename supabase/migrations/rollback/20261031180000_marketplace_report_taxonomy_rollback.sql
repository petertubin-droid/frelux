-- Rollback for 20261031180000_marketplace_report_taxonomy.sql
begin;
update public.marketplace_reports set status = 'reviewing' where status in ('open', 'investigating');
update public.marketplace_reports set report_type = 'seller', reason = 'other' where report_type in ('supplier', 'order_dispute');
alter table public.marketplace_reports drop constraint if exists marketplace_reports_report_type_check;
alter table public.marketplace_reports
  add constraint marketplace_reports_report_type_check
  check (report_type = any (array['product', 'listing', 'review', 'seller', 'professional']));
alter table public.marketplace_reports drop constraint if exists marketplace_reports_reason_check;
alter table public.marketplace_reports
  add constraint marketplace_reports_reason_check
  check (reason = any (array['scam','counterfeit','prohibited_item','misleading_information','inappropriate_content','duplicate','wrong_category','spam','other']));
alter table public.marketplace_reports drop constraint if exists marketplace_reports_status_check;
alter table public.marketplace_reports
  add constraint marketplace_reports_status_check
  check (status = any (array['pending','reviewing','resolved','dismissed']));
commit;
