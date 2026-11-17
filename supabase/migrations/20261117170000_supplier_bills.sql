-- ============================================================
-- FRELUX business admin: supplier bills, money the business owes.
--
-- The receivables side counts money clients owe, per project. The
-- payable side is a different shape: a vendor bill can belong to a
-- project or to the business itself (preliminaries, plant hire, an
-- accountant), so project_id is nullable and ownership is carried
-- by created_by rather than by the project row.
--
-- A bill is not an invoice: vendors do not trade through FRELUX, so
-- the supplier is recorded as the name written on their bill. There
-- is no supplier directory for trade vendors, and inventing one
-- would invite a wrong match between two vendors with similar names.
--
-- amount may be negative: a credit note from a vendor reduces what
-- is owed, and refusing it here would force a fictional paid row.
-- paid_amount records part payment without needing a payment table.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.supplier_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.contractor_projects(id) ON DELETE SET NULL,

  -- The vendor as named on their bill, and their own reference.
  supplier_name text NOT NULL CHECK (length(btrim(supplier_name)) > 0),
  reference text,

  currency text NOT NULL CHECK (length(btrim(currency)) > 0),
  amount numeric NOT NULL CHECK (amount <> 0),
  paid_amount numeric NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),

  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  due_at date,

  -- paid and void bills stay for the audit trail but carry no balance.
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'paid', 'void')),

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_bills_created_by ON public.supplier_bills(created_by);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_due_at ON public.supplier_bills(due_at);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_status ON public.supplier_bills(status);

ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_bills FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own supplier bills" ON public.supplier_bills;
CREATE POLICY "Users can CRUD own supplier bills"
  ON public.supplier_bills FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Table grants are separate from policies: without them the
-- authenticated role cannot reach the table at all.
REVOKE ALL ON public.supplier_bills FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_bills TO authenticated;

DROP TRIGGER IF EXISTS trg_supplier_bills_updated_at ON public.supplier_bills;
CREATE TRIGGER trg_supplier_bills_updated_at
  BEFORE UPDATE ON public.supplier_bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
