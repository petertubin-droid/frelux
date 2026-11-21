-- =========================================================
-- SUBSCRIPTION PLAN PRICE GRANTS (2026-11-21)
--
-- The policies from 20261121100000 are useless without table privileges: this
-- project's default privileges never granted anon or authenticated anything on
-- subscription_plan_prices, so every client read failed with 42501 even though
-- a public SELECT policy existed. Verified live: anon had no privilege at all.
--
-- SELECT goes to anon and authenticated (the pricing page reads the same rows
-- checkout charges from). Writes go to authenticated only, and RLS still gates
-- them behind is_admin(), so the grant alone cannot change a price.
-- =========================================================

GRANT SELECT ON public.subscription_plan_prices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plan_prices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plan_prices TO service_role;
