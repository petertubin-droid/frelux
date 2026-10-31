-- Rollback for 20261031190000_intelligence_dashboard.sql
begin;
drop trigger if exists project_estimate_revisions_guard on public.project_estimate_revisions;
drop function if exists public.project_estimate_revisions_guard();
drop table if exists public.intelligence_report_runs;
drop table if exists public.intelligence_preferences;
drop table if exists public.project_estimate_revisions;
commit;
