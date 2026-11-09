-- Rollback for 20261109210000_project_invoices_payments.sql
-- Reverses the invoice, payment and proof-of-spend additions. Dropping the
-- tables discards recorded invoices and payments, so take an export first.

DROP TRIGGER IF EXISTS trg_project_payments_updated_at ON public.project_payments;
DROP TRIGGER IF EXISTS trg_project_invoices_updated_at ON public.project_invoices;

DROP POLICY IF EXISTS "Users can CRUD own project payments" ON public.project_payments;
DROP POLICY IF EXISTS "Users can CRUD own project invoices" ON public.project_invoices;

DROP TABLE IF EXISTS public.project_payments;
DROP TABLE IF EXISTS public.project_invoices;

ALTER TABLE public.project_expenses
  DROP COLUMN IF EXISTS receipt_url,
  DROP COLUMN IF EXISTS receipt_name;

DROP SEQUENCE IF EXISTS public.project_payment_receipt_seq;
DROP SEQUENCE IF EXISTS public.project_invoice_number_seq;
