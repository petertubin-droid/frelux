-- Rollback: stop forcing RLS on the BIM persistence tables (policies stay).
ALTER TABLE public.bim_projects NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bim_model_revisions NO FORCE ROW LEVEL SECURITY;
