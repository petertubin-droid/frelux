-- Rollback for 20261109230000_grant_project_money_tables.sql
-- Removing these grants returns the tables to "RLS with no usable verb",
-- which is the defect the migration fixes. Only run this alongside a
-- rollback of the tables themselves.

REVOKE ALL ON public.project_invoices FROM authenticated;
REVOKE ALL ON public.project_payments FROM authenticated;
REVOKE USAGE, SELECT ON SEQUENCE public.project_invoice_number_seq FROM authenticated;
REVOKE USAGE, SELECT ON SEQUENCE public.project_payment_receipt_seq FROM authenticated;
