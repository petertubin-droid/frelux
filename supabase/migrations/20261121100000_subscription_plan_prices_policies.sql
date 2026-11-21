-- =========================================================
-- SUBSCRIPTION PLAN PRICE POLICIES (2026-11-21)
--
-- subscription_plan_prices had RLS enabled and forced with no policies at all,
-- so only service_role (which bypasses RLS) could read it: the checkout edge
-- function priced correctly while the pricing page could never read the same
-- rows, and the new admin catalogue editor could not write them.
--
-- Prices are advertised copy, so active rows are publicly readable. Writes stay
-- admin-only. Inactive rows are hidden from the public but visible to an admin,
-- whose ALL policy grants SELECT as well.
-- =========================================================

DROP POLICY IF EXISTS subscription_plan_prices_public_read ON public.subscription_plan_prices;
CREATE POLICY subscription_plan_prices_public_read
  ON public.subscription_plan_prices
  FOR SELECT
  USING (active);

DROP POLICY IF EXISTS subscription_plan_prices_admin_write ON public.subscription_plan_prices;
CREATE POLICY subscription_plan_prices_admin_write
  ON public.subscription_plan_prices
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
