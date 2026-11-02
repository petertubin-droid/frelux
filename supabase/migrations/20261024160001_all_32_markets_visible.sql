-- =========================================================
-- ALL 32 REGISTRY MARKETS VISIBLE (2026-10-24)
--
-- Owner directive: all 32 capability-registry markets must be
-- active and visible on FRELUX. The registry set (see
-- 20261024120000_capability_all_32_markets.sql) includes AE, AU
-- and CA, which still carried is_visible = false from an earlier
-- phased rollout. This flips them on so the online market list
-- matches the 32-market registry and the offline bundle.
-- =========================================================

UPDATE market_profiles
SET is_visible = true,
    updated_at = now()
WHERE country_code IN ('AE', 'AU', 'CA')
  AND is_visible = false;
