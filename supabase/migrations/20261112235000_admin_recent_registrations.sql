-- =========================================================
-- Admin: recent registrations (pros and clients)
-- Migration: 20261112235000_admin_recent_registrations.sql
--
-- The admin had no way to see who had just signed up. Professionals appear in
-- the Professionals tab only as a flat list with no dates, and client accounts
-- had no screen at all, so a new pro or a new buyer could sit unreviewed
-- indefinitely and nobody noticed they had arrived.
--
-- One admin-only call returns both registries, newest first, with the counts the
-- dashboard needs to say "3 new this week".
--
-- Notes:
--   • Reads auth.users.email because that is what makes a registration
--     reviewable; the function is admin-gated and never exposed to anon.
--   • A "client" is a profile that is not a professional profile: that is the
--     buyer population, whether or not they have ordered yet.
--   • Returns jsonb so the shape can grow (trade, city, orders) without another
--     round trip.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_recent_registrations(integer);
--   No tables or data are touched.
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_recent_registrations(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := COALESCE(p_days, 30);
  v_since timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_days < 1 OR v_days > 365 THEN
    RAISE EXCEPTION 'Window must be between 1 and 365 days';
  END IF;

  v_since := now() - make_interval(days => v_days);

  RETURN jsonb_build_object(
    'window_days', v_days,
    'since', v_since,

    'pros', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC) FROM (
        SELECT p.id,
               p.user_id,
               p.display_name,
               p.business_name,
               p.verification_status,
               p.created_at,
               u.email
          FROM public.pro_profiles p
          LEFT JOIN auth.users u ON u.id = p.user_id
         WHERE p.created_at >= v_since
         ORDER BY p.created_at DESC
         LIMIT 200
      ) t
    ), '[]'::jsonb),

    'clients', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC) FROM (
        SELECT pr.id,
               pr.email,
               pr.created_at
          FROM public.profiles pr
         WHERE pr.role = 'user'
           AND pr.created_at >= v_since
           AND NOT EXISTS (
             SELECT 1 FROM public.pro_profiles pp WHERE pp.user_id = pr.id
           )
         ORDER BY pr.created_at DESC
         LIMIT 200
      ) t
    ), '[]'::jsonb),

    'pros_in_window', (
      SELECT count(*) FROM public.pro_profiles WHERE created_at >= v_since
    ),
    'clients_in_window', (
      SELECT count(*) FROM public.profiles pr
       WHERE pr.role = 'user'
         AND pr.created_at >= v_since
         AND NOT EXISTS (
           SELECT 1 FROM public.pro_profiles pp WHERE pp.user_id = pr.id
         )
    ),
    'pros_total', (SELECT count(*) FROM public.pro_profiles),
    'pros_pending', (
      SELECT count(*) FROM public.pro_profiles
       WHERE verification_status = 'pending'
    ),
    'clients_total', (
      SELECT count(*) FROM public.profiles pr
       WHERE pr.role = 'user'
         AND NOT EXISTS (
           SELECT 1 FROM public.pro_profiles pp WHERE pp.user_id = pr.id
         )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_recent_registrations(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recent_registrations(integer) TO authenticated, service_role;
