-- Rollback for the FRELUX Ad Manager campaign engine.
begin;
drop function if exists public.record_ad_event(uuid, text, text, text, text, text, text, numeric);
drop table if exists public.ad_campaign_audit;
drop table if exists public.ad_campaign_events;
drop table if exists public.ad_campaigns;
drop function if exists public.ad_campaigns_audit_row();
drop function if exists public.ad_campaigns_touch();
commit;
