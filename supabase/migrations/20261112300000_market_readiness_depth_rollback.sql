-- Rollback for 20261112300000_market_readiness_depth.sql
-- Drops the depth-aware version. The readiness function is a read-only report,
-- so nothing else is affected; re-running the earlier migration restores it.

DROP FUNCTION IF EXISTS public.admin_market_readiness();
