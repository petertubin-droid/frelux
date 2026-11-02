-- =========================================================
-- Counter-Vision credit gating (Future Engine 2 monetization)
--
-- Seeds count_vision into ai_feature_costs so each photo count
-- costs 5 credits (one rewarded-ad watch equivalent; 1/10 of the
-- default 50-token/₦1,500 pack), with ad-unlock enabled so a user
-- without credits can watch one real rewarded ad per count.
--
-- All values are admin-configurable from Admin → Credits & Ads,
-- same as every other AI feature cost. No pricing is hardcoded
-- in the client: the gate reads ai_feature_costs live.
-- =========================================================

INSERT INTO public.ai_feature_costs (
  feature_key, feature_name, description,
  credit_cost, requires_credits, ad_unlock_enabled, ad_unlock_credits,
  daily_usage_limit, is_enabled, sort_order
)
VALUES (
  'count_vision',
  'Counter-Vision Photo Counting',
  'AI photo counting of stacked materials (Gemini, confidence-gated)',
  5, true, true, 0,
  10, true, 8
)
ON CONFLICT (feature_key) DO NOTHING;
