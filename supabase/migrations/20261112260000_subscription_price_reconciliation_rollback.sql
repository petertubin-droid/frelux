-- Rollback for 20261112260000_subscription_price_reconciliation.sql
-- Drops the reconciliation functions and both support tables.
-- No price row is touched by this rollback: the prices written through the
-- admin screen stay exactly as they are, with their audit history removed.

DROP FUNCTION IF EXISTS public.admin_subscription_price_report(numeric);
DROP FUNCTION IF EXISTS public.admin_set_subscription_price(text, text, text, bigint, text);
DROP FUNCTION IF EXISTS public.admin_apply_subscription_prices(text[], text);
DROP FUNCTION IF EXISTS public.admin_preview_subscription_prices(text[]);
DROP FUNCTION IF EXISTS public.subscription_rate_for(text);

DROP TABLE IF EXISTS public.subscription_price_audit;
DROP TABLE IF EXISTS public.subscription_currency_policy;
