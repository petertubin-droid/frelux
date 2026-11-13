-- Rollback for 20261112280000_market_readiness.sql

DROP FUNCTION IF EXISTS public.admin_market_readiness();
DROP FUNCTION IF EXISTS public.currency_is_chargeable(text);

ALTER TABLE public.market_profiles
  DROP COLUMN IF EXISTS translation_pending,
  DROP COLUMN IF EXISTS ui_locale;
