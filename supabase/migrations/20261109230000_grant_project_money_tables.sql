-- ============================================================
-- Grants for the project money tables.
--
-- 20261109210000 created project_invoices and project_payments with row
-- level security, but a table privilege is a separate gate: PostgREST
-- checks GRANT first and returns 42501 before it ever evaluates a policy.
-- Measured live: the new tables carried only REFERENCES, TRIGGER and
-- TRUNCATE for service_role, so a signed-in contractor would have been
-- refused by their own dashboard. This migration hands the signed-in role
-- exactly the four verbs its policies describe, keeps anon out entirely
-- (money rows are not public data), and leaves service_role the full set
-- the other contractor tables carry.
-- ============================================================

REVOKE ALL ON public.project_invoices FROM anon;
REVOKE ALL ON public.project_payments FROM anon;

REVOKE ALL ON public.project_invoices FROM PUBLIC;
REVOKE ALL ON public.project_payments FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_payments TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.project_invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.project_payments TO service_role;

-- The sequences behind the document numbers must be usable by the roles
-- that insert, otherwise the nextval default fails even with table rights.
GRANT USAGE, SELECT ON SEQUENCE public.project_invoice_number_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.project_payment_receipt_seq TO authenticated, service_role;

REVOKE ALL ON SEQUENCE public.project_invoice_number_seq FROM anon, PUBLIC;
REVOKE ALL ON SEQUENCE public.project_payment_receipt_seq FROM anon, PUBLIC;

-- Fail loudly if this file is ever replayed somewhere it cannot take effect.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t.table_name || ':' || t.priv, ', ')
  INTO missing
  FROM (VALUES
    ('project_invoices', 'SELECT'), ('project_invoices', 'INSERT'),
    ('project_invoices', 'UPDATE'), ('project_invoices', 'DELETE'),
    ('project_payments', 'SELECT'), ('project_payments', 'INSERT'),
    ('project_payments', 'UPDATE'), ('project_payments', 'DELETE')
  ) AS t(table_name, priv)
  WHERE NOT has_table_privilege('authenticated', 'public.' || t.table_name, t.priv);

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'authenticated is still missing privileges on the money tables: %', missing;
  END IF;

  IF has_table_privilege('anon', 'public.project_invoices', 'SELECT')
     OR has_table_privilege('anon', 'public.project_payments', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not be able to read client invoices or payments';
  END IF;
END $$;
