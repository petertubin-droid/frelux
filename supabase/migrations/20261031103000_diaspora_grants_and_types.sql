-- 20261031103000_diaspora_grants_and_types.sql
-- Two defects found by live verification:
--   1. new tables had RLS policies but no table privileges for `authenticated`,
--      so signed-in users were refused before RLS was even consulted;
--   2. user_projects.project_type only accepted calculator keys, while the
--      tracker offers building types, so creating a project always failed.
--
-- ROLLBACK:
--   revoke all on public.project_members, public.project_invitations,
--     public.project_notifications, public.project_material_deliveries,
--     public.project_activity, public.project_sites, public.geotechnical_reports,
--     public.foundation_scenarios, public.diaspora_plan_limits,
--     public.soil_classifications, public.regional_site_profiles,
--     public.site_intelligence_audit from authenticated;
--   alter table public.user_projects drop constraint user_projects_project_type_check;
--   alter table public.user_projects add constraint user_projects_project_type_check
--     check (project_type = any (array['screeding','paint_calc','cost_estimate',
--       'ai_recommendation','custom','pop_ceiling','pop_estimate','tile',
--       'tile_estimate','wall_finishing']));

-- 1. Table privileges (RLS still decides which rows are visible)
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.project_invitations to authenticated;
grant select, insert, update, delete on public.project_notifications to authenticated;
grant select, insert, update, delete on public.project_material_deliveries to authenticated;
grant select, insert, update, delete on public.project_activity to authenticated;
grant select on public.diaspora_plan_limits to authenticated, anon;

grant select, insert, update, delete on public.project_sites to authenticated;
grant select, insert, update, delete on public.geotechnical_reports to authenticated;
grant select, insert, update, delete on public.foundation_scenarios to authenticated;
grant select on public.soil_classifications to authenticated, anon;
grant select on public.regional_site_profiles to authenticated, anon;
grant select on public.site_intelligence_audit to authenticated;

-- 2. Invitation RPCs are server-side; callers only need execute
grant execute on function public.create_project_invitation(uuid, text, text, integer) to authenticated;
grant execute on function public.accept_project_invitation(text) to authenticated;
grant execute on function public.diaspora_notify(uuid, text, text, text, text, uuid) to authenticated;

-- 3. Building types the tracker offers, alongside the existing calculator keys
alter table public.user_projects drop constraint user_projects_project_type_check;
alter table public.user_projects add constraint user_projects_project_type_check
  check (project_type = any (array[
    'screeding','paint_calc','cost_estimate','ai_recommendation','custom',
    'pop_ceiling','pop_estimate','tile','tile_estimate','wall_finishing',
    'residential_build','commercial_build','renovation','land_development',
    'civil_works','other_build'
  ]));
