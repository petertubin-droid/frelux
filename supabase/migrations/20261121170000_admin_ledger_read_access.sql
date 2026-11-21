-- =========================================================
-- Admin read access across contractor money tables
-- =========================================================
-- Why this exists
--
-- Four admin surfaces read these tables to give an operator a platform-wide
-- view of contractor money:
--
--   /admin/business-ledger   project_invoices, project_payments, project_expenses
--   /admin/client-statement  project_invoices, project_payments
--   /admin/expense-ledger    project_expenses
--   /admin/supplier-ledger   supplier_bills
--
-- None of them filter by user in the browser, so visibility is decided purely
-- by RLS. Every policy on these tables is "own rows only" (user_id = auth.uid()),
-- which is right for contractors and wrong for the admin console: an operator
-- signed in as an admin saw only the rows they had created personally, and an
-- admin with no personal projects saw four empty ledgers and no explanation.
--
-- Scope of the fix
--
-- SELECT only. An admin can read every contractor's projects, invoices,
-- payments, expenses and supplier bills. Writes stay owner-only: this
-- migration deliberately adds no INSERT, UPDATE or DELETE policy, so the
-- console can report on contractor money without being able to alter it.
--
-- Idempotent: safe to re-run, and re-running after a table's policy set is
-- regenerated restores the read policy.

DO $$
DECLARE
  tbl text;
  policy_name text;
  tables text[] := ARRAY[
    'contractor_projects',
    'project_invoices',
    'project_payments',
    'project_expenses',
    'supplier_bills'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- A missing table is a skipped table, not a failed migration: the repo's
    -- migration order is not guaranteed to have created every table first.
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'admin read access: skipping %, table does not exist', tbl;
      CONTINUE;
    END IF;

    policy_name := format('Admins can read all %s', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_admin())',
      policy_name,
      tbl
    );

    RAISE NOTICE 'admin read access: % granted to admins', tbl;
  END LOOP;
END $$;

-- Post-condition: every listed table carries exactly one admin read policy.
DO $$
DECLARE
  tbl text;
  found int;
  tables text[] := ARRAY[
    'contractor_projects',
    'project_invoices',
    'project_payments',
    'project_expenses',
    'supplier_bills'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT count(*) INTO found
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = tbl
      AND policyname = format('Admins can read all %s', tbl);

    IF found <> 1 THEN
      RAISE EXCEPTION 'admin read access: expected 1 admin policy on %, found %', tbl, found;
    END IF;
  END LOOP;
END $$;
