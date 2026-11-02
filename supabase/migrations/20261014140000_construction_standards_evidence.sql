-- =========================================================
-- P1.8 Standards + evidence registry (20-market mandate)
-- First-class, per-market record of every technical coverage
-- spec or standard the calculators rely on. Seeded ONLY from
-- evidence already established and recorded in this project's
-- migrations (notes lifted verbatim where possible). No invented
-- standards, no guessed coverage rates.
-- =========================================================

CREATE TABLE IF NOT EXISTS construction_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL REFERENCES market_profiles(country_code) ON DELETE CASCADE,
  domain text NOT NULL,
  ref text NOT NULL,
  title text NOT NULL,
  authority text NOT NULL,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'manufacturer_datasheet', 'national_standard', 'trade_guide',
    'retail_listing', 'planning_default')),
  coverage_spec text,
  applies_to jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  evidence_url text,
  verified_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_code, domain, ref)
);

ALTER TABLE construction_standards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction_standards' AND policyname = 'construction_standards_public_read') THEN
    CREATE POLICY construction_standards_public_read ON construction_standards
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

COMMENT ON TABLE construction_standards IS 'Per-market technical standards and coverage evidence backing calculator specs. confidence=high means manufacturer datasheet or national standard; low means planning default pending verification. Never invented.';

-- Seeds: established facts only (see migration notes cited below).
INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('ZA', 'screeding', 'gyproc-rhinolite-datasheet', 'RhinoLite gypsum skim coverage',
   'Saint-Gobain Gyproc', 'manufacturer_datasheet', '2.5 kg/m² at 2.5 mm; 10 m² per 25 kg bag',
   '{"engines": ["screeding", "wall_finishing"]}',
   'South African surface prep: RhinoLite gypsum skim over plastered brick — 2.5 kg/m² at 2.5 mm; 10 m² per 25 kg bag (official Gyproc RhinoLite datasheet).',
   'high', '2026-10-13'),
  ('ZA', 'screeding', 'gyproc-screed-40kg', 'Gyproc screed coverage 40 kg bag',
   'Saint-Gobain Gyproc', 'manufacturer_datasheet', '16 m² per 40 kg bag',
   '{"engines": ["screeding"]}',
   'Gyproc datasheet: 2.5 kg/m2 at 2.5 mm → 16 m2 per 40 kg bag. Cashbuild price (Oct 2026).',
   'high', '2026-10-13'),
  ('SA', 'screeding', 'knauf-mp75-datasheet', 'Knauf MP75 machine gypsum plaster coverage',
   'Knauf', 'manufacturer_datasheet', 'approx. 8 kg/m² → ~3.75 m² per 30 kg bag',
   '{"engines": ["screeding", "wall_finishing"]}',
   'Saudi surface prep: machine-applied gypsum plaster skimmed smooth over blockwork — approx. 8 kg/m² (Knauf MP75 datasheet) → ~3.75 m² per 30 kg bag.',
   'high', '2026-10-13'),
  ('AE', 'screeding', 'knauf-mp75-datasheet', 'Knauf MP75 machine gypsum plaster coverage',
   'Knauf', 'manufacturer_datasheet', 'approx. 8 kg/m² → ~3.75 m² per 30 kg bag',
   '{"engines": ["screeding", "wall_finishing"]}',
   'UAE surface prep: machine gypsum plaster skim (Knauf/Saint-Gobain systems) over block — approx. 8 kg/m² (Knauf MP75 datasheet) → ~3.75 m² per 30 kg bag.',
   'high', '2026-10-13'),
  ('ZA', 'screeding', 'za-screed-pail-20l', 'ZA skim pail coverage planning rate',
   'FRELUX planning default', 'planning_default', '11.25 m² per 20 L pail (linear from 20 L planning rate)',
   '{"engines": ["wall_finishing"]}',
   'Verified ZA book (Oct 2026). Layer coverage 11.25 m2 per pail (linear from the 20 L planning rate).',
   'low', '2026-10-13'),
  ('KE', 'screeding', 'ke-putty-25kg', 'Kenyan wall putty two-coat coverage',
   'Kenyan trade practice', 'planning_default', '~18 m² per 25 kg bag, two coats',
   '{"engines": ["screeding", "wall_finishing"]}',
   'Verified KE book (Oct 2026): ~18 m2 per 25 kg bag in two coats. Verify per product sheet.',
   'low', '2026-10-13'),
  ('KE', 'screeding', 'ke-screed-guide', 'Kenyan screed 20 kg bag coverage guide',
   'Kenyan trade guide', 'trade_guide', '2.4 m² per 20 kg bag',
   '{"engines": ["screeding"]}',
   'Kenyan trade guide rate: 20 kg bag covers 2.4 m² of screed.',
   'medium', '2026-10-13'),
  ('GH', 'screeding', 'gh-putty-25kg', 'Ghanaian wall putty two-coat coverage',
   'Ghanaian trade practice', 'planning_default', '~18 m² per 25 kg bag, two coats; layer 14.4 m² per bag',
   '{"engines": ["screeding", "wall_finishing"]}',
   'Ghanaian surface prep: two trowel coats of gypsum putty over rendered sandcrete, sanded between coats. Verified GH book (Oct 2026): layer coverage 14.4 m2 per bag (linear from the 25 kg planning rate). Verify per product sheet.',
   'low', '2026-10-13'),
  ('JP', 'screeding', 'jp-gypsum-box', 'Japanese gypsum skim box coverage',
   'Japanese manufacturer datasheet', 'manufacturer_datasheet', '53.3 m² per box (linear from the 15 kg datasheet rate)',
   '{"engines": ["wall_finishing"]}',
   'Verified JP book (Oct 2026). Layer coverage 53.3 m2 per box (linear from the 15 kg datasheet rate).',
   'medium', '2026-10-13'),
  ('BR', 'painting', 'suvinil-massa-corrida-ficha', 'Suvinil massa corrida lata coverage',
   'Suvinil (Sherwin-Williams Brasil)', 'manufacturer_datasheet', 'up to 75 m² per lata (18 L)',
   '{"engines": ["wall_finishing"]}',
   'Suvinil ficha (2026-10): up to 75 m2 per lata.',
   'high', '2026-10-13'),
  ('BR', 'painting', 'suvinil-lata-2coats', 'Suvinil lata two-coat spread',
   'Suvinil (Sherwin-Williams Brasil)', 'manufacturer_datasheet', '115-120 m² two coats per lata',
   '{"engines": ["painting", "wall_finishing"]}',
   'Suvinil guide (2026-10): 115-120 m2 two coats.',
   'medium', '2026-10-13'),
  ('BR', 'screeding', 'argalit-acii', 'Argalit ACII tile adhesive coverage',
   'Argalit', 'manufacturer_datasheet', '~3.5 kg/m²',
   '{"engines": ["tile"]}',
   'Brazilian ceramic tile adhesive (Argamassa colante ACII class) at ~3.5 kg/m² per Argalit datasheet.',
   'medium', '2026-10-13'),
  ('FR', 'tile', 'webercol-flex', 'Webercol Flex adhesive coverage',
   'Saint-Gobain Weber', 'manufacturer_datasheet', '3.5 kg/m²',
   '{"engines": ["tile"]}',
   'French tile adhesive (webercol flex) at 3.5 kg/m² per Saint-Gobain Weber datasheet.',
   'medium', '2026-10-13'),
  ('GB', 'plumbing', 'bs-en-1401-1-13476-2', 'UPVC drainage pipe standard',
   'BSI (Kitemark)', 'national_standard', 'BS EN 1401-1 / 13476-2',
   '{"engines": ["plumbing"]}',
   'Drainfast Vision Drainage 110mm UPVC plain-ended pipe: BS EN 1401-1/13476-2, BSI Kitemark. GBP 6.20/m read from live product page 2026-10-11.',
   'high', '2026-10-11'),
  ('DE', 'plumbing', 'din-en-1451', 'HT drainage pipe standard',
   'DIN', 'national_standard', 'DIN EN 1451',
   '{"engines": ["plumbing"]}',
   'Hornbach HT Rohr DN 110 (DIN EN 1451) substitutes NG PVC waste pipe; EUR 8.90/m read from live product page 2026-10-11.',
   'high', '2026-10-11'),
  ('FR', 'painting', 'nf-dtu-42-1', 'Exterior facade coating practice standard',
   'CSTB / NF DTU 42.1', 'national_standard', 'NF DTU 42.1 scope',
   '{"engines": ["painting"]}',
   'French exterior practice: facade acrylique hydrofuge per NF DTU 42.1 scope.',
   'medium', '2026-10-12')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
