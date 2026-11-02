-- =========================================================
-- SETTLEMENT FX CONFIGURATION (Phase 1, 2026-10-24)
--
-- Roadmap gate (Quote and payment UX): settlement/checkout
-- currency conversion may ONLY run once a payment provider,
-- fee model, reconciliation path, exchange-rate source and
-- legally required review are configured. This table carries
-- that per-market configuration; a DB gate rejects active
-- rows missing any of the five requirements.
--
-- The engine (src/lib/fx/settlement-fx.ts) consumes this table
-- and refuses conversion for markets without an active, fully
-- reviewed row. Rates come exclusively from recorded fx_rates
-- rows (provider + timestamp provenance), never invented.
-- =========================================================

CREATE TABLE IF NOT EXISTS settlement_fx_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Market this configuration applies to (ISO 3166-1 alpha-2).
  market_code text NOT NULL,
  -- 1) Payment provider handling the charge (e.g. "stripe").
  payment_provider text NOT NULL,
  -- 2) Currency the charge is made in.
  charge_currency text NOT NULL,
  -- Currency the contractor is settled in.
  settlement_currency text NOT NULL,
  -- 3) Fee model: percentage of the converted amount plus a
  --    fixed component in the settlement currency.
  fee_pct numeric NOT NULL DEFAULT 0 CHECK (fee_pct >= 0),
  fee_fixed numeric NOT NULL DEFAULT 0 CHECK (fee_fixed >= 0),
  -- 4) Reconciliation path identifier (e.g. "stripe-payouts-ngn").
  reconciliation_path text NOT NULL,
  -- 5) Exchange-rate source the conversion is allowed to use.
  --    Only recorded fx_rates legs exist today.
  rate_source text NOT NULL DEFAULT 'fx_rates',
  -- 6) Legally required review: accountable reviewer + dates.
  reviewer_name text NOT NULL,
  legal_review_date date NOT NULL,
  next_review_date date NOT NULL,
  admin_notes text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_code, settlement_currency)
);

COMMENT ON TABLE settlement_fx_config IS
  'Per-market settlement conversion configuration; active rows require a payment provider, fee model, reconciliation path, rate source and legal review.';

-- =========================================================
-- GATE: an active row must be fully configured and reviewed.
-- =========================================================
CREATE OR REPLACE FUNCTION settlement_fx_config_gate()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active THEN
    IF NEW.payment_provider IS NULL OR btrim(NEW.payment_provider) = '' THEN
      RAISE EXCEPTION 'Active settlement FX config requires a payment provider';
    END IF;
    IF NEW.charge_currency IS NULL OR btrim(NEW.charge_currency) = '' THEN
      RAISE EXCEPTION 'Active settlement FX config requires a charge currency';
    END IF;
    IF NEW.settlement_currency IS NULL OR btrim(NEW.settlement_currency) = '' THEN
      RAISE EXCEPTION 'Active settlement FX config requires a settlement currency';
    END IF;
    IF NEW.reconciliation_path IS NULL OR btrim(NEW.reconciliation_path) = '' THEN
      RAISE EXCEPTION 'Active settlement FX config requires a reconciliation path';
    END IF;
    IF NEW.rate_source IS NULL OR btrim(NEW.rate_source) = '' OR NEW.rate_source <> 'fx_rates' THEN
      RAISE EXCEPTION 'Active settlement FX config requires a supported rate source (fx_rates only)';
    END IF;
    IF NEW.reviewer_name IS NULL OR btrim(NEW.reviewer_name) = '' THEN
      RAISE EXCEPTION 'Active settlement FX config requires an accountable reviewer';
    END IF;
    IF NEW.legal_review_date IS NULL THEN
      RAISE EXCEPTION 'Active settlement FX config requires a legal review date';
    END IF;
    IF NEW.next_review_date IS NULL THEN
      RAISE EXCEPTION 'Active settlement FX config requires a next review date';
    END IF;
    IF NEW.next_review_date <= NEW.legal_review_date THEN
      RAISE EXCEPTION 'Next review date must be after the legal review date';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settlement_fx_config_gate ON settlement_fx_config;
CREATE TRIGGER settlement_fx_config_gate
  BEFORE INSERT OR UPDATE ON settlement_fx_config
  FOR EACH ROW
  EXECUTE FUNCTION settlement_fx_config_gate();

-- =========================================================
-- QUOTE SETTLEMENT PROVENANCE (project_quotations)
-- =========================================================

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS fx_settlement_status text
    CHECK (fx_settlement_status IN ('converted', 'not_configured', 'unavailable', 'stale') OR fx_settlement_status IS NULL);

COMMENT ON COLUMN project_quotations.fx_settlement_status IS
  'Settlement conversion outcome for this quote; NULL when settlement was not requested.';

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS fx_settlement_currency text;

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS fx_total_payable numeric;

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS fx_settlement jsonb;

COMMENT ON COLUMN project_quotations.fx_settlement IS
  'Full settlement provenance: applied rate, legs with provider and fetched_at, converted amount, provider fee per the configured fee model, payment provider, reconciliation path, reviewer and review dates.';
