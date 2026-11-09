-- ============================================================
-- FRELUX contractor money trail: invoices, client payments,
-- and proof of spend.
--
-- Closes the gap between a quotation and the money that actually
-- moves: a contractor can now raise a numbered invoice, record
-- part payments against it, issue a numbered receipt for each
-- payment, and attach the proof (transfer screenshot, POS slip,
-- vendor invoice) to the expense it settles.
--
-- Currency is taken from the project row by the application on
-- every insert; nothing here assumes Naira.
--
-- RLS: authenticated users only reach rows of projects they own,
-- matching project_expenses and the rest of the contractor set.
-- ============================================================

-- Document numbering. A sequence (not a count) keeps numbers
-- unique and monotonic under concurrent inserts without needing
-- a privileged function or an advisory lock.
CREATE SEQUENCE IF NOT EXISTS public.project_invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.project_payment_receipt_seq START 1;

CREATE TABLE IF NOT EXISTS public.project_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,

  -- Client-facing document identity
  number text NOT NULL DEFAULT ('INV-' || lpad(nextval('public.project_invoice_number_seq')::text, 4, '0')),
  title text,

  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  due_at date,

  -- Money in the project's own currency
  currency text NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  tax_amount numeric NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),

  -- draft invoices can still change and never count as billed;
  -- void invoices stay for the audit trail but never count either.
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('draft', 'sent', 'void')),

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_invoices_number_unique UNIQUE (number)
);

CREATE INDEX IF NOT EXISTS idx_project_invoices_project_id ON public.project_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_due_at ON public.project_invoices(due_at);

CREATE TABLE IF NOT EXISTS public.project_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,

  -- A payment may settle a named invoice, or arrive against the
  -- project with no invoice reference. The ledger allocates
  -- unreferenced payments oldest invoice first.
  invoice_id uuid REFERENCES public.project_invoices(id) ON DELETE SET NULL,

  receipt_no text NOT NULL DEFAULT ('RCP-' || lpad(nextval('public.project_payment_receipt_seq')::text, 4, '0')),

  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  method text NOT NULL DEFAULT 'transfer'
    CHECK (method IN ('transfer', 'cash', 'pos', 'cheque', 'card', 'other')),

  -- Bank reference, transfer narration, cheque number
  reference text,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_payments_receipt_unique UNIQUE (receipt_no)
);

CREATE INDEX IF NOT EXISTS idx_project_payments_project_id ON public.project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_invoice_id ON public.project_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_paid_at ON public.project_payments(paid_at);

-- Proof of spend: the uploaded receipt or payment proof plus the
-- original file name, so a records pack can name what it holds.
ALTER TABLE public.project_expenses
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS receipt_name text;

-- ------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------
ALTER TABLE public.project_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invoices FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own project invoices" ON public.project_invoices;
CREATE POLICY "Users can CRUD own project invoices"
  ON public.project_invoices FOR ALL
  TO authenticated
  USING (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  );

ALTER TABLE public.project_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own project payments" ON public.project_payments;
CREATE POLICY "Users can CRUD own project payments"
  ON public.project_payments FOR ALL
  TO authenticated
  USING (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Keep updated_at fresh
-- ------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_project_invoices_updated_at
  BEFORE UPDATE ON public.project_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_project_payments_updated_at
  BEFORE UPDATE ON public.project_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
