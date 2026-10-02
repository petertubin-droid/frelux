-- =========================================================
-- Profit Margin & Markup Engine (Future Engine 8)
-- =========================================================
-- Deterministic client price and profit from a base cost and
-- admin-configured margin presets, with the markup-vs-margin
-- distinction made explicit (the classic pricing mistake).
--
-- Philosophy (unchanged): the basis (markup on cost vs margin
-- on selling price) is explicit on every preset and shown in
-- every breakdown step. VAT is added only from a configured
-- rule — the engine never invents a rate, and a missing rate
-- produces a warning and no line, never a guess.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. margin_presets
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS margin_presets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  -- 'markup_on_cost' (profit = cost × %) or 'margin_on_price' (price = cost ÷ (1 − %))
  basis           text NOT NULL CHECK (basis IN ('markup_on_cost', 'margin_on_price')),
  margin_percent  numeric NOT NULL CHECK (margin_percent > 0),
  description     text,
  is_default      boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS margin_presets_name_uniq ON margin_presets (name);

ALTER TABLE margin_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_presets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "margin_presets_public_read" ON margin_presets;
CREATE POLICY "margin_presets_public_read" ON margin_presets FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "margin_presets_admin_write" ON margin_presets;
CREATE POLICY "margin_presets_admin_write" ON margin_presets FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "margin_presets_set_updated_at" ON margin_presets;
CREATE TRIGGER "margin_presets_set_updated_at"
  BEFORE UPDATE ON margin_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE margin_presets IS 'Admin-configured margin presets with an explicit basis: markup_on_cost (profit = cost × %) or margin_on_price (price = cost ÷ (1 − %)). The margin engine never confuses the two and never invents a VAT rate.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (defaults, admin-editable via
--    Admin → Estimation Config & Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('rounding_decimals', 'margin',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported money values.', true),
  ('vat_rate', 'margin',
   '{"value": 7.5}'::jsonb, 'verified_frelux',
   'Nigerian VAT percent applied to the priced subtotal. Configure 0 to quote without VAT, or deactivate this rule to force the engine to warn instead of guessing.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed presets. Margin structures are admin-entered —
-- the DB never ships guessed pricing.
