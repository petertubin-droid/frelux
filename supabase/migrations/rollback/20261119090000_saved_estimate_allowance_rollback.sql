-- Reverses 20261119090000_saved_estimate_allowance.sql
DROP TRIGGER IF EXISTS trg_saved_estimate_allowance ON public.advanced_estimates;
DROP FUNCTION IF EXISTS public.enforce_saved_estimate_allowance();
DROP TABLE IF EXISTS public.saved_estimate_allowances;
