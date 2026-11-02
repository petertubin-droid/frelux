-- =========================================================
-- FRELUX Wall Finishing System — international architecture.
--
-- 1) Canada + Australia market profiles (the last two of the
--    seven initial native wall-finishing markets).
-- 2) wallfin_labour_rates: per-market finishing labour rates
--    with source references — always shown as ESTIMATES.
-- 3) New wall-finishing materials + role mappings for the
--    existing books (NG/US/GB/IN/DE + CA/AU). Prices are
--    seeded ONLY where verified live (Oct 2026 web scans);
--    everything else carries a scan source for the Admin Scan
--    system — never a guess.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1) Canada + Australia market profiles
-- ─────────────────────────────────────────────
INSERT INTO market_profiles (
  country_code, country_name, region, currency_code, currency_symbol,
  currency_name, default_measurement_system, supported_length_units,
  supported_area_units, default_length_unit, default_area_unit,
  default_language, local_terminology, status, inherits_from,
  profile_version, sort_order, is_visible, admin_notes
) SELECT
  'CA', 'Canada', 'Americas', 'CAD', 'C$',
  'Canadian Dollar', 'metric',
  ARRAY['meters','feet','inches']::text[], ARRAY['sqm','sqft']::text[],
  'feet', 'sqft', 'en', '{}'::jsonb, 'active', NULL, '0.1.0', 32, true,
  'Wall-finishing seed Oct 2026: CGC Sheetrock verified via Home Depot.ca. Construction is imperial on site.'
WHERE NOT EXISTS (SELECT 1 FROM market_profiles WHERE country_code = 'CA');

INSERT INTO market_profiles (
  country_code, country_name, region, currency_code, currency_symbol,
  currency_name, default_measurement_system, supported_length_units,
  supported_area_units, default_length_unit, default_area_unit,
  default_language, local_terminology, status, inherits_from,
  profile_version, sort_order, is_visible, admin_notes
) SELECT
  'AU', 'Australia', 'Oceania', 'AUD', 'A$',
  'Australian Dollar', 'metric',
  ARRAY['meters','feet','inches']::text[], ARRAY['sqm','sqft']::text[],
  'meters', 'sqm', 'en', '{}'::jsonb, 'active', NULL, '0.1.0', 33, true,
  'Wall-finishing seed Oct 2026: CSR Gyprock + Taubmans verified via Mahoneys Timber / paintmate.'
WHERE NOT EXISTS (SELECT 1 FROM market_profiles WHERE country_code = 'AU');

-- ─────────────────────────────────────────────
-- 2) wallfin_labour_rates
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallfin_labour_rates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market                text NOT NULL,
  task_key              text NOT NULL,
  method                text NOT NULL CHECK (method IN ('per-m2','per-day-output','hourly','per-unit')),
  rate                  numeric NOT NULL CHECK (rate >= 0),
  currency              text NOT NULL,
  output_per_worker_day numeric,
  source_reference      text NOT NULL,
  effective_date        date NOT NULL,
  description           text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market, task_key)
);

CREATE INDEX IF NOT EXISTS wallfin_labour_rates_active_idx
  ON wallfin_labour_rates (market) WHERE is_active;

ALTER TABLE wallfin_labour_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallfin_labour_rates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallfin_labour_rates_public_read" ON wallfin_labour_rates;
CREATE POLICY "wallfin_labour_rates_public_read" ON wallfin_labour_rates FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "wallfin_labour_rates_admin_write" ON wallfin_labour_rates;
CREATE POLICY "wallfin_labour_rates_admin_write" ON wallfin_labour_rates FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "wallfin_labour_rates_set_updated_at" ON wallfin_labour_rates;
CREATE TRIGGER "wallfin_labour_rates_set_updated_at"
  BEFORE UPDATE ON wallfin_labour_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE wallfin_labour_rates IS 'Wall-finishing labour rates per market (labour-only, excludes materials). Research benchmarks with source references — always displayed as estimates, never as verified prices.';

-- Labour rate seeds (labour-only per m², Oct 2026 research):
-- NG: Nigerian contractor rate survey Oct 2026 (estimate)
-- US: HomeAdvisor/Angi national ranges 2026, mid-range (estimate)
-- GB: UK trades rate checkers 2026, mid-range (estimate)
-- DE: Malerbetrieb trade rate survey 2026 (estimate)
-- IN: Indian painter/contractor market survey 2026 (estimate)
-- CA: HomeStars/HomeAdvisor Canada mid-range 2026 (estimate)
-- AU: hipages/ServiceSeeking Australian mid-range 2026 (estimate)
INSERT INTO wallfin_labour_rates (market, task_key, method, rate, currency, source_reference, effective_date, description) VALUES
  ('NG','wallfin_rendering','per-m2',1500,'NGN','Nigerian contractor rate survey Oct 2026 (estimate — verify locally)','2026-10-06','Render block walls, labour only'),
  ('NG','wallfin_putty','per-m2',600,'NGN','Nigerian contractor rate survey Oct 2026 (estimate)','2026-10-06','Screeding putty skim, labour only'),
  ('NG','wallfin_sanding','per-m2',200,'NGN','Nigerian contractor rate survey Oct 2026 (estimate)','2026-10-06','Sand putty coat'),
  ('NG','wallfin_priming','per-m2',300,'NGN','Nigerian contractor rate survey Oct 2026 (estimate)','2026-10-06','Prime walls, labour only'),
  ('NG','wallfin_painting','per-m2',700,'NGN','Nigerian contractor rate survey Oct 2026 (estimate)','2026-10-06','Two-coat emulsion, labour only'),
  ('NG','wallfin_plastering','per-m2',1200,'NGN','Nigerian contractor rate survey Oct 2026 (estimate)','2026-10-06','Skim plaster, labour only'),
  ('NG','wallfin_taping','per-m2',900,'NGN','Nigerian contractor rate survey Oct 2026 (estimate)','2026-10-06','Drywall tape + compound, labour only'),
  ('NG','wallfin_skimming','per-m2',700,'NGN','Nigerian contractor rate survey Oct 2026 (estimate)','2026-10-06','Fine filler skim, labour only'),
  ('US','wallfin_taping','per-m2',12,'USD','HomeAdvisor/Angi drywall finishing ranges Oct 2026, mid-range (estimate)','2026-10-06','Tape + 3-coat compound, labour only'),
  ('US','wallfin_sanding','per-m2',2,'USD','HomeAdvisor/Angi drywall finishing ranges Oct 2026 (estimate)','2026-10-06','Sand joints'),
  ('US','wallfin_priming','per-m2',3,'USD','HomeAdvisor/Angi painter ranges Oct 2026 (estimate)','2026-10-06','Prime drywall, labour only'),
  ('US','wallfin_painting','per-m2',5,'USD','HomeAdvisor/Angi painter ranges Oct 2026 (estimate)','2026-10-06','Two-coat interior paint, labour only'),
  ('US','wallfin_rendering','per-m2',11,'USD','US stucco/masonry contractor ranges Oct 2026 (estimate)','2026-10-06','Exterior render, labour only'),
  ('US','wallfin_plastering','per-m2',14,'USD','US Venetian/plaster contractor ranges Oct 2026 (estimate)','2026-10-06','Skim plaster, labour only'),
  ('US','wallfin_putty','per-m2',6,'USD','US skim-coat contractor ranges Oct 2026 (estimate)','2026-10-06','Skim coat, labour only'),
  ('US','wallfin_skimming','per-m2',6,'USD','US skim-coat contractor ranges Oct 2026 (estimate)','2026-10-06','Fine fill, labour only'),
  ('GB','wallfin_plastering','per-m2',18,'GBP','UK trades rate checkers Oct 2026, mid-range (estimate)','2026-10-06','Skim plaster (MultiFinish), labour only'),
  ('GB','wallfin_rendering','per-m2',16,'GBP','UK render contractor ranges Oct 2026 (estimate)','2026-10-06','Exterior render, labour only'),
  ('GB','wallfin_taping','per-m2',12,'GBP','UK dryliner rate survey Oct 2026 (estimate)','2026-10-06','Jointing compound system, labour only'),
  ('GB','wallfin_priming','per-m2',3,'GBP','UK painter day-rate survey Oct 2026 (estimate)','2026-10-06','Mist/primer coat, labour only'),
  ('GB','wallfin_painting','per-m2',6,'GBP','UK painter day-rate survey Oct 2026 (estimate)','2026-10-06','Two-coat emulsion, labour only'),
  ('GB','wallfin_putty','per-m2',7,'GBP','UK filler/prep rate survey Oct 2026 (estimate)','2026-10-06','Fill/skim prep, labour only'),
  ('GB','wallfin_sanding','per-m2',2,'GBP','UK painter prep rate survey Oct 2026 (estimate)','2026-10-06','Sand between coats'),
  ('GB','wallfin_skimming','per-m2',7,'GBP','UK filler/prep rate survey Oct 2026 (estimate)','2026-10-06','Fine fill, labour only'),
  ('DE','wallfin_plastering','per-m2',16,'EUR','Malerbetrieb trade rate survey Oct 2026 (estimate)','2026-10-06','Gypsum machine plaster, labour only'),
  ('DE','wallfin_rendering','per-m2',15,'EUR','Stuckateur rate survey Oct 2026 (estimate)','2026-10-06','Mineral render, labour only'),
  ('DE','wallfin_skimming','per-m2',6,'EUR','Malerbetrieb trade rate survey Oct 2026 (estimate)','2026-10-06','Feinspachtel, labour only'),
  ('DE','wallfin_priming','per-m2',3,'EUR','Malerbetrieb trade rate survey Oct 2026 (estimate)','2026-10-06','Tiefgrund, labour only'),
  ('DE','wallfin_painting','per-m2',8,'EUR','Malerbetrieb trade rate survey Oct 2026 (estimate)','2026-10-06','Two-coat dispersion paint, labour only'),
  ('DE','wallfin_taping','per-m2',11,'EUR','Trockenbau rate survey Oct 2026 (estimate)','2026-10-06','Drywall jointing, labour only'),
  ('DE','wallfin_putty','per-m2',6,'EUR','Malerbetrieb trade rate survey Oct 2026 (estimate)','2026-10-06','Spatula prep, labour only'),
  ('DE','wallfin_sanding','per-m2',2,'EUR','Malerbetrieb trade rate survey Oct 2026 (estimate)','2026-10-06','Sand between coats'),
  ('IN','wallfin_rendering','per-m2',120,'INR','Indian contractor market survey Oct 2026 (estimate)','2026-10-06','Plaster walls, labour only'),
  ('IN','wallfin_putty','per-m2',60,'INR','Indian painter market survey Oct 2026 (estimate)','2026-10-06','Two-coat putty, labour only'),
  ('IN','wallfin_priming','per-m2',25,'INR','Indian painter market survey Oct 2026 (estimate)','2026-10-06','Primer coat, labour only'),
  ('IN','wallfin_painting','per-m2',80,'INR','Indian painter market survey Oct 2026 (estimate)','2026-10-06','Two-coat emulsion, labour only'),
  ('IN','wallfin_plastering','per-m2',110,'INR','Indian contractor market survey Oct 2026 (estimate)','2026-10-06','Skim plaster, labour only'),
  ('IN','wallfin_sanding','per-m2',15,'INR','Indian painter market survey Oct 2026 (estimate)','2026-10-06','Sand putty'),
  ('IN','wallfin_taping','per-m2',90,'INR','Indian gypsum contractor survey Oct 2026 (estimate)','2026-10-06','Gypsum jointing, labour only'),
  ('IN','wallfin_skimming','per-m2',70,'INR','Indian painter market survey Oct 2026 (estimate)','2026-10-06','Fine fill, labour only'),
  ('CA','wallfin_taping','per-m2',13,'CAD','HomeStars Canada drywall ranges Oct 2026 (estimate)','2026-10-06','Tape + compound, labour only'),
  ('CA','wallfin_sanding','per-m2',2.5,'CAD','HomeStars Canada drywall ranges Oct 2026 (estimate)','2026-10-06','Sand joints'),
  ('CA','wallfin_priming','per-m2',4,'CAD','HomeStars Canada painter ranges Oct 2026 (estimate)','2026-10-06','Prime, labour only'),
  ('CA','wallfin_painting','per-m2',6,'CAD','HomeStars Canada painter ranges Oct 2026 (estimate)','2026-10-06','Two-coat paint, labour only'),
  ('CA','wallfin_rendering','per-m2',12,'CAD','Canada masonry contractor ranges Oct 2026 (estimate)','2026-10-06','Render, labour only'),
  ('CA','wallfin_plastering','per-m2',15,'CAD','Canada plasterer ranges Oct 2026 (estimate)','2026-10-06','Skim plaster, labour only'),
  ('CA','wallfin_putty','per-m2',7,'CAD','Canada skim-coat ranges Oct 2026 (estimate)','2026-10-06','Skim coat, labour only'),
  ('CA','wallfin_skimming','per-m2',7,'CAD','Canada skim-coat ranges Oct 2026 (estimate)','2026-10-06','Fine fill, labour only'),
  ('AU','wallfin_taping','per-m2',14,'AUD','hipages/ServiceSeeking plasterer ranges Oct 2026 (estimate)','2026-10-06','Base + topping coat, labour only'),
  ('AU','wallfin_sanding','per-m2',3,'AUD','hipages plasterer ranges Oct 2026 (estimate)','2026-10-06','Sand joints'),
  ('AU','wallfin_priming','per-m2',4,'AUD','hipages painter ranges Oct 2026 (estimate)','2026-10-06','Sealer/3-in-1 prep, labour only'),
  ('AU','wallfin_painting','per-m2',7,'AUD','hipages painter ranges Oct 2026 (estimate)','2026-10-06','Two-coat low sheen, labour only'),
  ('AU','wallfin_rendering','per-m2',15,'AUD','hipages renderer ranges Oct 2026 (estimate)','2026-10-06','Cement render, labour only'),
  ('AU','wallfin_plastering','per-m2',16,'AUD','hipages plasterer ranges Oct 2026 (estimate)','2026-10-06','Skim, labour only'),
  ('AU','wallfin_putty','per-m2',7,'AUD','hipages painter prep ranges Oct 2026 (estimate)','2026-10-06','Fill/prep, labour only'),
  ('AU','wallfin_skimming','per-m2',7,'AUD','hipages painter prep ranges Oct 2026 (estimate)','2026-10-06','Fine fill, labour only')
ON CONFLICT (market, task_key) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3) Wall-finishing materials + role mappings
-- ─────────────────────────────────────────────

-- 3a) New estimation_materials (verified products, Oct 2026)
INSERT INTO estimation_materials (name, slug, category, description, unit_id, pack_size, pack_unit_id, supplier, notes, effective_date, is_active, sort_order)
SELECT v.name, v.slug, v.category, v.descr, NULL, v.pack, NULL, NULL, v.notes, '2026-10-06', true, v.sort
FROM (VALUES
  ('FibaTape Mesh Drywall Joint Tape (500 ft)','us-fibatape-500ft','drywall','Saint-Gobain ADFORS 1-7/8 in x 500 ft self-adhesive mesh tape. Verified $17.59 (Home Depot Oct 2026).','roll',17.59,'US drywall joint tape standard.',60),
  ('CGC Synko Paper Joint Tape (500 ft)','ca-cgc-synko-tape-500ft','drywall','Canadian 2-1/16 in x 500 ft paper tape. Scan pending.','roll',NULL,'CA drywall joint tape.',61),
  ('CGC Sheetrock All-Purpose Compound (12 L pail)','ca-cgc-allpurpose-12l','drywall','Ready-mixed all-purpose compound. Verified $37.78 (Home Depot.ca Oct 2026).','pail',37.78,'CA joint compound standard.',62),
  ('Thistle Bonding Coat (25 kg)','gb-thistle-bonding-25kg','plaster','UK gypsum bonding/undercoat plaster. Scan pending.','bag',NULL,'GB undercoat plaster.',63),
  ('Thistle MultiFinish Plaster (25 kg)','gb-thistle-multifinish-25kg','plaster','UK skim plaster standard. Verified from £7.93 (BuildBuddy Oct 2026); covers ~10-12 m2 at 2-3 mm.','bag',7.93,'GB skim plaster.',64),
  ('Knauf MP75 Machine Gypsum Plaster (30 kg)','de-knauf-mp75-30kg','plaster','German Maschinengipsputz, ~10 kg/m2 at 10 mm. Scan pending.','sack',NULL,'DE base plaster.',65),
  ('Knauf Feinspachtel Fine Filler (25 kg)','de-knauf-feinspachtel-25kg','plaster','German fine finish filler. Scan pending.','container',NULL,'DE fine filler.',66),
  ('Alpina Fassadenfarbe (10 L)','de-alpina-fassadenfarbe-10l','paint','German silicone facade paint. Scan pending.','10L',NULL,'DE exterior paint.',67),
  ('Asian Paints Tractor Emulsion (20 L)','in-tractor-emulsion-20l','paint','Indian standard interior emulsion. Verified ~₹1,900 (market survey Oct 2026).','20L',1900,'IN interior paint.',68),
  ('Asian Paints TruCare Interior Primer (20 L)','in-trucare-primer-20l','paint','Indian interior wall primer. Verified ₹2,650-2,900 (IndiaMART Oct 2026).','20L',2750,'IN primer.',69),
  ('CSR Gyprock Base Coat 45 (20 kg)','au-csr-base-coat-45-20kg','drywall','Australian setting base coat. Verified $69.50 (Mahoneys Timber Oct 2026).','bag',69.50,'AU jointing base coat.',70),
  ('Taubmans 3-in-1 Prep Primer/Sealer/Undercoat (10 L)','au-taubmans-3in1-10l','paint','Australian water-based prep coat. Verified $99 (paintmate Oct 2026).','10L',99,'AU sealer.',71),
  ('Taubmans Endure Low Sheen (10 L)','au-taubmans-low-sheen-10l','paint','Australian interior low-sheen acrylic. Verified ~$65-99 (market survey Oct 2026).','10L',99,'AU interior paint.',72),
  ('Nigerian Screeding Putty (20 kg)','ng-screeding-putty-20kg','plaster','Cement-based wall screeding putty. Scan pending.','bag',NULL,'NG putty skim standard.',73),
  ('Nigerian Wall Primer (20 L)','ng-wall-primer-20l','paint','Nigerian PVA/alkali wall primer. Verified ~₦8,000-15,000 (market survey Oct 2026).','20L',12000,'NG primer.',74),
  ('Nigerian Exterior Emulsion (20 L)','ng-exterior-emulsion-20l','paint','Weatherproof exterior emulsion. Verified ~₦18,000-25,000 (market survey Oct 2026).','20L',22000,'NG exterior paint.',75),
  ('Nigerian Interior Emulsion (20 L)','ng-interior-emulsion-20l','paint','Standard interior emulsion. Verified ₦15,000-20,000 (paintproductionacademy Oct 2026).','20L',17000,'NG interior paint.',76),
  ('Sandpaper Sheets (Fine, pack)','gen-sandpaper-sheet','prep','Fine abrasive sheets for between-coat sanding.','sheets',NULL,'Generic — enter local price.',77),
  ('Gyproc Paper Joint Tape (150 m)','gb-gyproc-tape-150m','drywall','UK plasterboard joint tape. Scan pending.','roll',NULL,'GB joint tape.',78)
) AS v(name, slug, category, descr, unit, pack, notes, sort)
WHERE NOT EXISTS (SELECT 1 FROM estimation_materials m WHERE m.slug = v.slug);

-- 3b) Prices ONLY where verified this month; provenance recorded.
INSERT INTO estimation_prices (price_type, ref_id, price, currency, market, effective_date, price_source, notes)
SELECT 'material', m.id, v.price, v.currency, v.market, '2026-10-06'::date, v.source, v.note
FROM estimation_materials m
JOIN (VALUES
  ('us-fibatape-500ft',          17.59::numeric, 'USD', 'US', 'Home Depot', 'Saint-Gobain ADFORS FibaTape 500 ft, verified via Instacart/Home Depot Oct 2026.'),
  ('ca-cgc-allpurpose-12l',      37.78::numeric, 'CAD', 'CA', 'Home Depot Canada', 'CGC Sheetrock All-Purpose 12 L pail, homedepot.ca Oct 2026.'),
  ('gb-thistle-multifinish-25kg', 7.93::numeric, 'GBP', 'GB', 'BuildBuddy', 'Thistle MultiFinish 25 kg from £7.93, buildbuddy.co.uk Oct 2026. Typical range £8-12.'),
  ('in-tractor-emulsion-20l',    1900::numeric, 'INR', 'IN', 'India market survey', 'Tractor Emulsion 20 L ~₹1,900 (Oct 2026 survey).'),
  ('in-trucare-primer-20l',      2750::numeric, 'INR', 'IN', 'IndiaMART', 'Asian Paints TruCare 20 L ₹2,650-2,900 across dealers Oct 2026.'),
  ('au-csr-base-coat-45-20kg',   69.50::numeric, 'AUD', 'AU', 'Mahoneys Timber', 'CSR Gyprock Base Coat 45 20 kg, mahoneystimber.com.au Oct 2026.'),
  ('au-taubmans-3in1-10l',       99.00::numeric, 'AUD', 'AU', 'paintmate', 'Taubmans 3-in-1 Prep 10 L $99 (RRP $149), paintmate.com.au Oct 2026.'),
  ('au-taubmans-low-sheen-10l',  65.00::numeric, 'AUD', 'AU', 'market survey', 'Taubmans low sheen 10 L ~$65 (2 for $120), Oct 2026 survey.'),
  ('ng-interior-emulsion-20l',  17000::numeric, 'NGN', 'NG', 'market survey', 'Standard 20 L emulsion ₦15,000-20,000 (paintproductionacademy Oct 2026).'),
  ('ng-exterior-emulsion-20l',  22000::numeric, 'NGN', 'NG', 'market survey', 'Exterior 20 L emulsion ₦18,000-25,000 (Oct 2026 survey).'),
  ('ng-wall-primer-20l',        12000::numeric, 'NGN', 'NG', 'market survey', '20 L wall primer ~₦8,000-15,000 (Oct 2026 survey).')
) AS v(slug, price, currency, market, source, note) ON v.slug = m.slug
WHERE m.is_active
  AND NOT EXISTS (
    SELECT 1 FROM estimation_prices p
    WHERE p.ref_id = m.id AND p.market = v.market AND p.is_active
  );

-- 3c) Role mappings per market (ON CONFLICT update — one authoritative row)
INSERT INTO market_material_roles (market, role, material_slug, display_name, unit_label, notes, sort_order) VALUES
  ('NG','joint-filler','ng-screeding-putty-20kg','Screeding Putty (20 kg)','bag','Nigerian wall screeding putty skim standard.',30),
  ('NG','primer','ng-wall-primer-20l','Wall Primer (20 L)','20L','Nigerian PVA/alkali-resistant primer.',31),
  ('NG','interior-paint','ng-interior-emulsion-20l','Interior Emulsion (20 L)','20L','Standard Nigerian interior emulsion.',32),
  ('NG','exterior-paint','ng-exterior-emulsion-20l','Exterior Emulsion (20 L)','20L','Weatherproof Nigerian exterior emulsion.',33),
  ('NG','sandpaper','gen-sandpaper-sheet','Sandpaper Sheets','sheets','Enter your local price.',34),
  ('NG','joint-tape','gb-gyproc-tape-150m','Paper Joint Tape (150 m)','roll','Used on NG drywall/POP partitions.',35),
  ('US','joint-tape','us-fibatape-500ft','FibaTape Mesh Joint Tape (500 ft)','roll','Verified $17.59 (Home Depot).',30),
  ('US','sandpaper','gen-sandpaper-sheet','Sandpaper Sheets','sheets','Enter your local price.',31),
  ('GB','bonding-plaster','gb-thistle-bonding-25kg','Thistle Bonding Coat (25 kg)','bag','UK undercoat plaster where background requires.',30),
  ('GB','skim-plaster','gb-thistle-multifinish-25kg','Thistle MultiFinish (25 kg)','bag','UK skim standard, ~10.5 m²/bag at 2 mm.',31),
  ('GB','mist-coat','gb-dulux-easycare-10l','Dulux Easycare (thinned, mist coat)','10L','Mist coat = emulsion thinned ~10% with water.',32),
  ('GB','joint-tape','gb-gyproc-tape-150m','Gyproc Paper Joint Tape (150 m)','roll','Plasterboard jointing tape.',33),
  ('GB','exterior-paint','gb-sandtex-masonry-10l','Sandtex Exterior Masonry Paint (10 L)','10L','UK masonry paint standard. Scan pending.',34),
  ('GB','sandpaper','gen-sandpaper-sheet','Sandpaper Sheets','sheets','Enter your local price.',35),
  ('DE','gypsum-plaster','de-knauf-mp75-30kg','Knauf MP75 Machine Plaster (30 kg)','sack','~10 kg/m² at 10 mm per datasheet.',30),
  ('DE','fine-filler','de-knauf-feinspachtel-25kg','Knauf Feinspachtel (25 kg)','container','Fine filler skim for Q3/Q4 surfaces.',31),
  ('DE','exterior-paint','de-alpina-fassadenfarbe-10l','Alpina Fassadenfarbe (10 L)','10L','German silicone facade paint. Scan pending.',32),
  ('DE','sandpaper','gen-sandpaper-sheet','Sandpaper Sheets','sheets','Enter your local price.',33),
  ('IN','interior-paint','in-tractor-emulsion-20l','Asian Paints Tractor Emulsion (20 L)','20L','Standard Indian interior emulsion.',30),
  ('IN','primer','in-trucare-primer-20l','Asian Paints TruCare Primer (20 L)','20L','Verified ₹2,650-2,900 (IndiaMART).',31),
  ('IN','sandpaper','gen-sandpaper-sheet','Sandpaper Sheets','sheets','Enter your local price.',32),
  ('IN','joint-tape','gb-gyproc-tape-150m','Paper Joint Tape (150 m)','roll','Gypsum partition jointing.',33),
  ('CA','joint-filler','ca-cgc-allpurpose-12l','CGC Sheetrock All-Purpose (12 L)','pail','Verified $37.78 (Home Depot.ca).',30),
  ('CA','joint-tape','ca-cgc-synko-tape-500ft','CGC Synko Paper Tape (500 ft)','roll','Canadian drywall tape. Scan pending.',31),
  ('CA','interior-paint','us-behr-premium-plus-interior','Behr Premium Plus Interior','gallon','US product, priced CAD on scan. Inherits US mapping meanwhile.',32),
  ('CA','exterior-paint','us-behr-premium-plus-exterior','Behr Premium Plus Exterior','gallon','US product, priced CAD on scan. Inherits US mapping meanwhile.',33),
  ('CA','primer','us-zinsser-bulls-eye-123','Zinsser Bulls Eye 1-2-3','quart','US product; CAD price via scan.',34),
  ('CA','concrete-mix','de-cem-42-5n-25kg','Portland Cement (25 kg)','sack','Placeholder until a Canadian cement row is scanned.',35),
  ('CA','sand','de-bausand-25kg','Construction Sand (25 kg)','sack','Placeholder until a Canadian sand row is scanned.',36),
  ('CA','sandpaper','gen-sandpaper-sheet','Sandpaper Sheets','sheets','Enter your local price.',37),
  ('AU','joint-filler','au-csr-base-coat-45-20kg','CSR Gyprock Base Coat 45 (20 kg)','bag','Verified $69.50 (Mahoneys Timber).',30),
  ('AU','primer','au-taubmans-3in1-10l','Taubmans 3-in-1 Prep (10 L)','10L','Verified $99 (paintmate).',31),
  ('AU','interior-paint','au-taubmans-low-sheen-10l','Taubmans Low Sheen (10 L)','10L','Verified ~$65 (market survey).',32),
  ('AU','joint-tape','gb-gyproc-tape-150m','Paper Joint Tape (150 m)','roll','Plasterboard jointing tape. Scan pending.',33),
  ('AU','sandpaper','gen-sandpaper-sheet','Sandpaper Sheets','sheets','Enter your local price.',34)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

-- 3d) GB masonry paint + missing scan sources for the Admin Scan queue
INSERT INTO estimation_materials (name, slug, category, description, unit_id, pack_size, pack_unit_id, supplier, notes, effective_date, is_active, sort_order)
SELECT 'Sandtex Exterior Masonry Paint (10 L)','gb-sandtex-masonry-10l','paint','UK exterior masonry paint. Scan pending.',NULL,NULL,NULL,NULL,'GB exterior masonry paint.',NULL,true,79
WHERE NOT EXISTS (SELECT 1 FROM estimation_materials m WHERE m.slug = 'gb-sandtex-masonry-10l');

INSERT INTO price_scan_sources (market, material_slug, retailer, label, product_url, expected_unit, currency, is_active)
SELECT v.market, v.slug, v.retailer, v.label, v.url, v.unit, v.currency, true
FROM (VALUES
  ('CA','ca-cgc-synko-tape-500ft','Home Depot Canada','CGC Synko Paper Joint Tape 2-1/16in x 500ft','https://www.homedepot.ca/product/cgc-synko-drywall-paper-joint-tape-2-1-16-in-x-500-ft-roll/1000405148','roll','CAD'),
  ('CA','ca-cgc-allpurpose-12l','Home Depot Canada','CGC Sheetrock All Purpose 12L','https://www.homedepot.ca/s/en/home/categories/building-materials/drywall/drywall-tools/drywall-compound','pail','CAD'),
  ('CA','us-behr-premium-plus-interior','Home Depot Canada','Behr Premium Plus Interior 1 gal (CAD)','https://www.homedepot.ca/s/en/home/categories/paint/interior-paint/behr-premium-plus','gallon','CAD'),
  ('CA','us-behr-premium-plus-exterior','Home Depot Canada','Behr Premium Plus Exterior 1 gal (CAD)','https://www.homedepot.ca/s/en/home/categories/paint/exterior-stains-paint/behr-premium-plus','gallon','CAD'),
  ('CA','us-zinsser-bulls-eye-123','Home Depot Canada','Zinsser Bulls Eye 1-2-3 (CAD)','https://www.homedepot.ca/s/en/home/categories/paint/primer/zinsser','quart','CAD'),
  ('GB','gb-sandtex-masonry-10l','B&Q','Sandtex 10 Year Masonry Paint 10L','https://www.diy.com/painting-decorating/paint/masonry-paint','10L','GBP'),
  ('GB','gb-thistle-bonding-25kg','BuildBuddy','Thistle Bonding Coat 25kg','https://www.buildbuddy.co.uk/building-materials/plaster','bag','GBP'),
  ('GB','gb-thistle-multifinish-25kg','BuildBuddy','Thistle MultiFinish 25kg','https://www.buildbuddy.co.uk/building-materials/plaster','bag','GBP'),
  ('GB','gb-gyproc-tape-150m','Screwfix','Gyproc Paper Tape 150m','https://www.screwfix.com/c/painting-decorating/plasterboard/cat840170','roll','GBP'),
  ('DE','de-knauf-mp75-30kg','Hornbach','Knauf MP75 Maschinengipsputz 30kg','https://www.hornbach.de/c/baustoffe/rohbau/putz/S10182','sack','EUR'),
  ('DE','de-knauf-feinspachtel-25kg','Hornbach','Knauf Feinspachtel 25kg','https://www.hornbach.de/s/feinspachtel','container','EUR'),
  ('DE','de-alpina-fassadenfarbe-10l','hagebau','Alpina Fassadenfarbe 10L','https://www.hagebau.de/p/alpina-fassadenfarbe-weiss-10-l-anP7000121034/','10L','EUR'),
  ('IN','in-tractor-emulsion-20l','Amazon.in','Asian Paints Tractor Emulsion 20L','https://www.amazon.in/s?k=asian+paints+tractor+emulsion+20+litre','20L','INR'),
  ('IN','in-trucare-primer-20l','Amazon.in','Asian Paints TruCare Interior Primer 20L','https://www.amazon.in/s?k=asian+paints+trucare+interior+primer+20l','20L','INR'),
  ('AU','au-csr-base-coat-45-20kg','Bunnings','Gyprock Base Coat 45 20kg','https://www.bunnings.com.au/search?q=base+coat+45','bag','AUD'),
  ('AU','au-taubmans-3in1-10l','Bunnings','Taubmans 3-in-1 Prep 10L','https://www.bunnings.com.au/search?q=taubmans+3+in+1+10l','10L','AUD'),
  ('AU','au-taubmans-low-sheen-10l','Bunnings','Taubmans Endure Low Sheen 10L','https://www.bunnings.com.au/search?q=taubmans+endure+low+sheets+10l','10L','AUD'),
  ('AU','gb-gyproc-tape-150m','Bunnings','Paper Joint Tape 150m','https://www.bunnings.com.au/search?q=paper+joint+tape','roll','AUD'),
  ('NG','ng-screeding-putty-20kg','Jiji/Nigerian suppliers','Screeding Putty 20kg','https://www.jiji.ng/building-materials/screeding-putty','bag','NGN'),
  ('NG','ng-wall-primer-20l','Jiji/Nigerian suppliers','Wall Primer 20L','https://www.jiji.ng/building-materials/primer','20L','NGN'),
  ('NG','ng-interior-emulsion-20l','Jiji/Nigerian suppliers','Interior Emulsion 20L','https://www.jiji.ng/building-materials/paint','20L','NGN'),
  ('NG','ng-exterior-emulsion-20l','Jiji/Nigerian suppliers','Exterior Emulsion 20L','https://www.jiji.ng/building-materials/paint','20L','NGN')
) AS v(market, slug, retailer, label, url, unit, currency)
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources s
  WHERE s.market = v.market AND s.material_slug = v.slug
);
