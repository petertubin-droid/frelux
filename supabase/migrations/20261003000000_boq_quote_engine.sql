-- =========================================================
-- BOQ / Quote Generator Engine (Future Engine 2)
-- =========================================================
-- Turns any combination of saved FRELUX estimates into a
-- professional, client-ready Bill of Quantities / quote with
-- a full audit snapshot of every source line.
--
-- Philosophy (unchanged): commercial rates (VAT, contingency)
-- are estimation_calc_rules defaults — admin-editable, never
-- guessed by the engine. Every line item carries its source
-- estimate reference so a quote can be replayed exactly.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. boq_quotes — generated bills of quantities
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boq_quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quote_ref       text NOT NULL,                     -- e.g. BOQ-XXXXXX
  title           text NOT NULL,
  client_name     text NOT NULL,
  client_contact  text,
  project_location text,
  currency        text NOT NULL DEFAULT 'NGN',
  status          text NOT NULL DEFAULT 'draft'      -- draft | sent | accepted | rejected
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  -- Snapshot of the exact items, rates and totals that produced this quote.
  -- The quote is replayable: items carry their source estimate references.
  items           jsonb NOT NULL,                    -- [{description, quantity, unit, unit_cost, total, source_estimate_ref, source_calculator_type}]
  totals          jsonb NOT NULL,                    -- {subtotal, contingency_rate, contingency_amount, vat_rate, vat_amount, grand_total}
  rates_snapshot  jsonb NOT NULL,                    -- exact rule values used (vat/contingency)
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE boq_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_quotes FORCE ROW LEVEL SECURITY;

-- Drafts are private to their owner; admins manage all.
DROP POLICY IF EXISTS "boq_quotes_owner_read" ON boq_quotes;
CREATE POLICY "boq_quotes_owner_read" ON boq_quotes FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "boq_quotes_owner_write" ON boq_quotes;
CREATE POLICY "boq_quotes_owner_write" ON boq_quotes FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "boq_quotes_admin_write" ON boq_quotes;
CREATE POLICY "boq_quotes_admin_write" ON boq_quotes FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "boq_quotes_set_updated_at" ON boq_quotes;
CREATE TRIGGER "boq_quotes_set_updated_at"
  BEFORE UPDATE ON boq_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS boq_quotes_quote_ref_idx ON boq_quotes (quote_ref);
CREATE INDEX IF NOT EXISTS boq_quotes_user_idx ON boq_quotes (user_id);

COMMENT ON TABLE boq_quotes IS 'Client-ready Bills of Quantities assembled from saved FRELUX estimates. Items and rates are full snapshots — a quote can be replayed exactly.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (defaults only, admin-editable via
--    Admin → Estimation Config & Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('vat_rate', 'boq',
   '{"rate": 7.5}'::jsonb, 'verified_frelux',
   'Default VAT rate (%) applied to BOQ quotes (Nigerian VAT). Admin-editable; 0 disables the VAT line.', true),
  ('contingency_rate', 'boq',
   '{"rate": 5}'::jsonb, 'verified_frelux',
   'Default contingency allowance (%) added before VAT on BOQ quotes. Admin-editable; 0 disables the line.', true),
  ('require_source_reference', 'boq',
   '{"required": true}'::jsonb, 'verified_frelux',
   'Every BOQ line item must reference the estimate (or manual entry) it came from — quotes are replayable and auditable.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed quotes. Users build quotes from their own saved estimates.
