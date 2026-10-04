-- =========================================================
-- INTERNATIONAL PHASE A: visitor currency display layer
-- =========================================================
-- Adds a single admin-configured JSON column to site_settings that
-- holds the display-currency configuration:
--
--   display_currencies = {
--     "enabled": true,
--     "rates": { "USD": 0.00065, "EUR": 0.00059, ... },
--     "note": "Rates reviewed 2026-10-04",
--     "updated_at": "2026-10-04T11:00:00Z"
--   }
--
-- A rate is "how many units of the currency one Naira buys"
-- (1 NGN = rate * CODE). Estimates always CALCULATE in Naira from
-- the Nigerian price books; conversion happens at DISPLAY time only
-- and is always labelled approximate. No rate configured for a
-- currency means that currency is offered but shows Naira values
-- unchanged (the no-guess rule the engines already follow).
--
-- This is deliberately separate from market_profiles: a market
-- profile with real local prices (Phase 45 architecture) always
-- wins over an FX conversion once that market is activated.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS display_currencies jsonb;

COMMENT ON COLUMN public.site_settings.display_currencies IS
  'Visitor currency display config: {enabled, rates:{CODE: units per 1 NGN}, note, updated_at}. Display-only conversion; calculations stay in NGN.';
