-- =====================================================================
-- Wave 1.3 Click-to-Invoice: invoices + invoice_payments
--
-- An invoice is a SNAPSHOT of an accepted quotation (boq_quotes) or a
-- directly-entered schedule: items/totals are copied verbatim at
-- creation and never re-derived, exactly like boq_quotes.items.
--  - sequential numbering per user per year (INV-YYYY-####) via an
--    atomic counter row; no gaps-by-design are promised (a failed
--    transaction can burn a number - honesty over gapless fiction)
--  - currency is per-invoice, mirroring the quote (XXX if unknown,
--    never a silent NGN default)
--  - stored status covers the owner's actions only (draft/issued/
--    cancelled); "paid" and "overdue" are DERIVED from recorded
--    payments + due date at read time and are never stored
--  - every amount lives with its currency; the app renders with
--    formatByCode (no locale hardcoding)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_ref      text NOT NULL,
  -- Snapshot provenance: which quotation produced this invoice
  source_quote_id  uuid REFERENCES public.boq_quotes(id) ON DELETE SET NULL,
  project_id       uuid,
  title            text NOT NULL,
  client_name      text NOT NULL,
  client_contact   text,
  client_email     text,
  client_address   text,
  project_location text,
  currency         text NOT NULL DEFAULT 'XXX',
  -- Owner-actionable status. paid/overdue are derived at read time.
  status           text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'cancelled')),
  items            jsonb NOT NULL,   -- verbatim quote snapshot [{description, quantity, unit, unit_cost, total}]
  totals           jsonb NOT NULL,  -- verbatim quote snapshot {subtotal, contingency_rate, contingency_amount, vat_rate, vat_amount, grand_total}
  tax_label        text,             -- per-market tax naming (VAT/MwSt/GST/IVA...) from boq-tax-label
  issue_date       date NOT NULL DEFAULT CURRENT_DATE,
  due_date         date,
  payment_terms_days integer NOT NULL DEFAULT 30,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, invoice_ref)
);

CREATE INDEX IF NOT EXISTS invoices_user_idx ON public.invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_project_idx ON public.invoices(project_id) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount      numeric(14,2) NOT NULL CHECK (amount > 0),
  -- How the money arrived; presented as recorded, never interpreted
  method      text NOT NULL CHECK (method IN ('cash', 'transfer', 'card', 'cheque', 'other')),
  paid_at     timestamptz NOT NULL DEFAULT now(),
  reference   text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON public.invoice_payments(invoice_id);

-- Per-user, per-year sequential invoice numbering. The upsert is the
-- atomic reservation: concurrent creators get distinct numbers.
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year        integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_owner_all" ON public.invoices;
CREATE POLICY "invoices_owner_all"
  ON public.invoices FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "invoice_payments_owner_via_invoice" ON public.invoice_payments;
CREATE POLICY "invoice_payments_owner_via_invoice"
  ON public.invoice_payments FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid()));

DROP POLICY IF EXISTS "invoice_counters_owner_all" ON public.invoice_counters;
CREATE POLICY "invoice_counters_owner_all"
  ON public.invoice_counters FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- This project's service_role has no default table grants (known gap)
GRANT SELECT ON public.invoices, public.invoice_payments, public.invoice_counters TO service_role;
