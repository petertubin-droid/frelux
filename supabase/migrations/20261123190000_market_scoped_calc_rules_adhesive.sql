-- =========================================================
-- MARKET-SCOPED CALC RULES + 25 kg ADHESIVE MARKETS (2026-11-23)
--
-- adhesive_coverage_m2_per_bag was one global rule (5 m2 per bag, a 20 kg
-- sack). DE, FR and IT retail tile adhesive in 25 kg sacks, so pricing a
-- 25 kg bag against 20 kg coverage overstates the bag count. Rather than
-- inventing a second slug per pack size, a rule row may now carry a market:
-- the market row wins, an unscoped row stays the global default.
--
-- Coverage derivation, not invention: the existing 5 m2 per 20 kg bag is
-- 4 kg/m2. A 25 kg sack at the same 4 kg/m2 spreads 6.25 m2, so that is the
-- figure written for the 25 kg markets.
-- =========================================================

-- The governance trigger hashes with pgcrypto, but pgcrypto lives in the
-- extensions schema and the trigger runs with its own search_path=public, so
-- digest() is unresolvable and EVERY governed insert fails. Fixing the
-- function's own search_path is the only place that helps, because a session
-- SET does not override a function-level proconfig.
ALTER FUNCTION public.governance_append_audit() SET search_path = public, extensions;

SET search_path = public, extensions;

-- The chain had no genesis row, so the first governed insert ever attempted
-- failed on prev_entry_hash NOT NULL. Seed the genesis entry so the chain can
-- start; without it no governed write can succeed anywhere in the product.
INSERT INTO public.governance_audit_log
  (chain_sequence, recorded_at, action, entity_type, entity_ref, field_diff,
   diff_canonical, rationale, prev_entry_hash, entry_hash, hash_payload)
SELECT 0, now(), 'create', 'calc_rule', 'genesis', '{}'::jsonb, '',
       'Genesis entry: the audit chain had no prior entry, so every governed insert failed on prev_entry_hash NOT NULL.',
       repeat('0', 64), encode(digest('genesis', 'sha256'), 'hex'), 'genesis'
WHERE NOT EXISTS (SELECT 1 FROM public.governance_audit_log);

-- The rules table is governed: every INSERT must state why it exists.
SELECT set_config(
  'app.governance_rationale',
  'Market-scoped adhesive coverage: DE/FR/IT retail tile adhesive in 25 kg sacks (6.25 m2 per bag at the same 4 kg/m2 as the 20 kg default), so one global coverage rule mispriced bags in those markets.',
  false
);

ALTER TABLE public.estimation_calc_rules
  ADD COLUMN IF NOT EXISTS market text;

-- The old constraint allowed one row per (rule_key, calculator_type), which is
-- what made a market override impossible. Replace it with the same uniqueness
-- including the market, so unscoped rows stay unique and market rows coexist.
ALTER TABLE public.estimation_calc_rules
  DROP CONSTRAINT IF EXISTS estimation_calc_rules_rule_key_calculator_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS estimation_calc_rules_type_key_market_uniq
  ON public.estimation_calc_rules (calculator_type, rule_key, COALESCE(market, ''));

INSERT INTO public.estimation_calc_rules
  (calculator_type, rule_key, rule_value, rule_status, description, is_active, market)
VALUES
  ('flooring', 'adhesive_coverage_m2_per_bag', '{"value": 6.25}'::jsonb, 'admin_configured',
   'Coverage per 25 kg sack of cement-based tile adhesive at 4 kg/m2. DE retail standard; overrides the 20 kg global default.', true, 'DE'),
  ('flooring', 'adhesive_coverage_m2_per_bag', '{"value": 6.25}'::jsonb, 'admin_configured',
   'Coverage per 25 kg sack of cement-based tile adhesive at 4 kg/m2. FR retail standard; overrides the 20 kg global default.', true, 'FR'),
  ('flooring', 'adhesive_coverage_m2_per_bag', '{"value": 6.25}'::jsonb, 'admin_configured',
   'Coverage per 25 kg sack of cement-based tile adhesive at 4 kg/m2. IT retail standard; overrides the 20 kg global default.', true, 'IT')
ON CONFLICT (calculator_type, rule_key, COALESCE(market, '')) DO UPDATE
  SET rule_value = EXCLUDED.rule_value,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      updated_at = now();

-- The slug is per bag as the market sells it, so its name must not claim 20 kg.
UPDATE public.estimation_materials
SET name = 'Flooring Adhesive (bag, market pack size)',
    description = 'Cement-based tile and flooring adhesive, priced per bag as sold in the market (20 kg in NG, 25 kg in DE/FR/IT). Coverage per bag is a market-scoped calc rule.',
    updated_at = now()
WHERE slug = 'flooring-adhesive-bag';

INSERT INTO public.estimation_prices
  (ref_id, market, currency, price, price_type, scan_confidence, price_source, source_url, is_active, effective_date)
SELECT m.id, v.market, v.currency, v.price, 'material', 'manual', v.price_source, v.source_url, true, DATE '2026-11-23'
FROM (VALUES
  ('DE', 'EUR', 18.95,
   'Hornbach DE: Lugato Fliesenkleber Sicherheitskleber Standard C1T 25 kg sack, EUR 18.95 (PCI Flexkleber 25 kg EUR 21.85).',
   'https://www.hornbach.de/p/lugato-fliesenkleber-sicherheitskleber-standard-c1t-25-kg/244531/'),
  ('FR', 'EUR', 23.90,
   'Leroy Merlin FR: AXTON colle a carrelage sol et mur, gris, 25 kg, EUR 23.90.',
   'https://www.leroymerlin.fr/produits/materiaux/cloison-et-plafond/colle-enduit-et-bande-a-joint/mortier-adhesif/colle-carrelage-sol-25-kg-p.html'),
  ('IT', 'EUR', 9.50,
   'Leroy Merlin IT: Kerakoll Totalset 25 kg bianco C2TE, EUR 9.50.',
   'https://www.leroymerlin.it/prodotti/colla-per-piastrelle-in-polvere-kerakoll-totalset-25-kg-bianco-c2te-93939332.html')
) AS v(market, currency, price, price_source, source_url)
JOIN public.estimation_materials m ON m.slug = 'flooring-adhesive-bag'
WHERE NOT EXISTS (
  SELECT 1 FROM public.estimation_prices p
  WHERE p.ref_id = m.id AND p.market = v.market AND p.is_active AND p.price > 0
);
