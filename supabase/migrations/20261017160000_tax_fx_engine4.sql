-- ============================================================================
-- FRELUX Engine #4: Tax & Currency Conversion (M1 + M3 + M4 tables)
-- Migration: 20261017160000_tax_fx_engine4.sql
-- ============================================================================
-- M1  tax_catalog: jurisdiction tax catalog — rates, bases, citations,
--     effective dates. Every seeded rate is web-verified (see citation_*).
-- M3  fx_rates: FX conversion with provider + timestamp provenance. No
--     silent cross-rates: only direct recorded pairs convert; bridges
--     through an intermediate currency are explicit and disclosed.
-- M4  withholding_rules: settlement/withholding rules per market, gated
--     behind legal_review_status — pending rules are disclosed as
--     informational only and are NEVER computed until approved.
--
-- Honesty rules (i18n mandate, no invented claims):
--   - No rate is invented. Markets with no single national rate
--     (US, BR, CA provincial layer, GH levies) store the verified
--     structure and a truthful basis note instead of a fake number.
--   - RLS: public read, admin-only write on all three tables
--     (mirrors predictive_model_validations pattern).
-- ============================================================================

-- ============================================================
-- M1: TAX CATALOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tax_catalog (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code        text NOT NULL,
  tax_kind           text NOT NULL CHECK (tax_kind IN ('consumption', 'withholding', 'settlement')),
  tax_name           text NOT NULL,
  rate_pct           numeric(6,3),          -- NULL = varies / no single rate
  additional_levies_pct numeric(6,3) DEFAULT 0,  -- e.g. GH NHIL+GETFund 5
  applies_to         text NOT NULL DEFAULT 'both' CHECK (applies_to IN ('materials', 'services', 'both')),
  basis              text NOT NULL,          -- what the rate applies to
  citation_title     text NOT NULL,
  citation_url       text NOT NULL,
  citation_publisher text NOT NULL,
  effective_date     date NOT NULL,
  notes              text,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (market_code = upper(market_code) AND char_length(market_code) = 2),
  CONSTRAINT tax_catalog_unique UNIQUE (market_code, tax_kind, tax_name, applies_to, effective_date)
);

ALTER TABLE public.tax_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_catalog_public_read" ON public.tax_catalog;
CREATE POLICY "tax_catalog_public_read"
  ON public.tax_catalog FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "tax_catalog_admin_write" ON public.tax_catalog;
CREATE POLICY "tax_catalog_admin_write"
  ON public.tax_catalog FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- M1 SEED: web-verified consumption tax rows (20-market set)
-- ============================================================
-- Verified sources (retrieved 2026-10-15):
--   vatupdate.com global list (July 2026 edition) — GB DE FR IT JP KR MX
--   CA AU ZA SA AE NG KE + CN IN ID structure
--   GRA + EY (Ghana 2026 unification), KRA (Kenya), DLA Piper (China VAT law),
--   Bloomberg/Business Times (Indonesia luxury-only 12%), IndiaFilings/GST
--   Council (works contract 18%), PwC (Brazil ISS municipal), USA.gov/state
--   net (no federal rate)

INSERT INTO public.tax_catalog
  (market_code, tax_kind, tax_name, rate_pct, additional_levies_pct, applies_to, basis, citation_title, citation_url, citation_publisher, effective_date, notes)
VALUES
  ('NG','consumption','Value Added Tax (VAT)',7.5,0,'both','VAT on taxable supplies of goods and services','FIRS Value Added Tax','https://www.firs.gov.ng/','Federal Inland Revenue Service','2019-02-01',NULL),
  ('US','consumption','Sales and Use Tax (state/local)',NULL,0,'both','No federal sales tax; rates vary by state and local jurisdiction (0% to about 10%)','State Sales Tax Rates','https://www.taxadmin.org/state-tax-rates','Federation of Tax Administrators','2026-01-01','No single national rate exists; the calculator reports this honestly instead of inventing one.'),
  ('GB','consumption','Value Added Tax (VAT)',20,0,'both','Standard rate on most goods and services incl. construction materials and services','VAT rates — GOV.UK','https://www.gov.uk/government/publications/vat-rates-notice-701/vat-rates-notice-701','HM Revenue & Customs','2024-01-01',NULL),
  ('CA','consumption','Goods and Services Tax (GST)',5,0,'both','Federal GST; harmonized provinces (HST) add a provincial component (combined 13-15% in most HST provinces)','GST/HST rates — Canada.ca','https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html','Canada Revenue Agency','2024-01-01','Provincial component depends on province of supply; the federal 5% is the verified national baseline.'),
  ('AU','consumption','Goods and Services Tax (GST)',10,0,'both','GST on most goods and services','GST — Australian Taxation Office','https://www.ato.gov.au/','Australian Taxation Office','2024-01-01',NULL),
  ('DE','consumption','Umsatzsteuer (MwSt)',19,0,'both','Standard rate (7% reduced for certain categories)','Global VAT Rates by Country (July 2026)','https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/','VATupdate','2026-01-01',NULL),
  ('IN','consumption','Goods and Services Tax (GST)',18,0,'both','Standard rate for works contract / construction services (SAC 9954)','GST on Construction — rates','https://www.indiafilings.com/learn/gst-on-construction','IndiaFilings (GST Council rates)','2022-07-18','Reduced slabs (5%, 12%) exist for specific schemes; 18% is the verified works-contract standard.'),
  ('GH','consumption','Value Added Tax (VAT) + NHIL + GETFund',15,5,'both','VAT unified at 15% from 1 Jan 2026, plus NHIL 2.5% and GETFund levy 2.5% on the base (effective 20%)','Ghana VAT — GRA','https://gra.gov.gh/domestic-tax/tax-types/vat/','Ghana Revenue Authority','2026-01-01','EY: VAT unified at 15% effective 1 Jan 2026; combined burden approximately 20%.'),
  ('KE','consumption','Value Added Tax (VAT)',16,0,'both','General rate on taxable goods and services (8% on petroleum)','Value Added Tax — KRA','https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax','Kenya Revenue Authority','2024-01-01',NULL),
  ('ZA','consumption','Value Added Tax (VAT)',15,0,'both','Standard rate on taxable supplies','VAT rates — SARS','https://www.sars.gov.za/','South African Revenue Service','2024-04-01',NULL),
  ('JP','consumption','消費税 (Consumption Tax)',10,0,'both','Standard rate (8% reduced for food and non-alcoholic beverages)','Global VAT Rates by Country (July 2026)','https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/','VATupdate / National Tax Agency','2019-10-01',NULL),
  ('FR','consumption','Taxe sur la Valeur Ajoutée (TVA)',20,0,'both','Standard rate (10%, 5.5%, 2.1% reduced)','Global VAT Rates by Country (July 2026)','https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/','VATupdate / Direction générale des Finances publiques','2024-01-01',NULL),
  ('BR','consumption','ISS (municipal service tax)',NULL,0,'services','Construction services are taxed via municipal ISS at 2-5% depending on municipality and service type; IBS/CBS dual VAT transition began 2026','Brazil — Other taxes (ISS)','https://taxsummaries.pwc.com/brazil/corporate/other-taxes','PwC Worldwide Tax Summaries','2026-01-01','No single national rate; municipal rate must be confirmed per city. Materials are taxed via ICMS/IPI under the transitioning IBS/CBS regime.'),
  ('SA','consumption','Value Added Tax (VAT)',15,0,'both','Standard rate on taxable supplies','VAT — ZATCA','https://zatca.gov.sa/en/vat','Zakat, Tax and Customs Authority','2020-07-01',NULL),
  ('AE','consumption','Value Added Tax (VAT)',5,0,'both','Standard rate on taxable supplies in the UAE','VAT — Federal Tax Authority','https://tax.gov.ae/en/vat.aspx','UAE Federal Tax Authority','2018-01-01',NULL),
  ('CN','consumption','增值税 (VAT)',13,0,'materials','Standard VAT rate for sale of most goods including building materials','China VAT implementation regulations','https://www.dlapiper.com/en-us/insights/publications/2026/01/key-changes-in-the-new-implementation-regulations-of-the-china-value-added-tax-law','DLA Piper','2026-01-01',NULL),
  ('CN','consumption','增值税 (VAT)',9,0,'services','VAT rate for construction services (transportation, construction, real estate)','China VAT implementation regulations','https://www.dlapiper.com/en-us/insights/publications/2026/01/key-changes-in-the-new-implementation-regulations-of-the-china-value-added-tax-law','DLA Piper','2026-01-01',NULL),
  ('ID','consumption','Pajak Pertambahan Nilai (PPN)',11,0,'both','Standard VAT rate (12% applies only to luxury goods per the December 2024 scaled-back hike)','Indonesia waters down planned VAT hike','https://www.businesstimes.com.sg/international/indonesia-waters-down-planned-vat-hike-last-minute-move','Business Times / Bloomberg','2025-01-01','12% applies only to goods already subject to luxury tax; the general rate remains 11%.'),
  ('MX','consumption','Impuesto al Valor Agregado (IVA)',16,0,'both','Standard rate (0% on food and medicine)','Global VAT Rates by Country (July 2026)','https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/','VATupdate / SAT','2024-01-01',NULL),
  ('KR','consumption','부가가치세 (Value Added Tax)',10,0,'both','Standard rate on taxable supplies','Global VAT Rates by Country (July 2026)','https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/','VATupdate / NTS','2024-01-01',NULL),
  ('IT','consumption','Imposta sul Valore Aggiunto (IVA)',22,0,'both','Standard rate (10%, 5%, 4% reduced)','Global VAT Rates by Country (July 2026)','https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/','VATupdate / Agenzia delle Entrate','2024-01-01',NULL)
ON CONFLICT (market_code, tax_kind, tax_name, applies_to, effective_date) DO NOTHING;

-- ============================================================
-- M3: FX RATES (provider + timestamp provenance)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fx_rates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency  text NOT NULL,
  quote_currency text NOT NULL,
  rate           numeric(20,8) NOT NULL CHECK (rate > 0),
  provider       text NOT NULL,
  source_url     text NOT NULL,
  fetched_at     timestamptz NOT NULL DEFAULT now(),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (base_currency <> quote_currency),
  CONSTRAINT fx_rates_unique UNIQUE (base_currency, quote_currency, fetched_at)
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fx_rates_public_read" ON public.fx_rates;
CREATE POLICY "fx_rates_public_read"
  ON public.fx_rates FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "fx_rates_admin_write" ON public.fx_rates;
CREATE POLICY "fx_rates_admin_write"
  ON public.fx_rates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- M3 SEED: open.er-api.com snapshot, retrieved 2026-10-15 (UTC),
-- "last update Thu, 15 Oct 2026 00:02:31 +0000" per the provider.
INSERT INTO public.fx_rates (base_currency, quote_currency, rate, provider, source_url, fetched_at)
SELECT 'USD', c, r, 'open.er-api.com', 'https://open.er-api.com/v6/latest/USD', '2026-10-15T00:02:31Z'
FROM (VALUES
  ('NGN', 1331.826337::numeric),
  ('GBP', 0.756165),
  ('CAD', 1.422795),
  ('AUD', 1.433021),
  ('EUR', 0.894425),
  ('INR', 95.252751),
  ('GHS', 11.686603),
  ('KES', 129.725167),
  ('ZAR', 16.579734),
  ('JPY', 158.305497),
  ('BRL', 5.035924),
  ('SAR', 3.75),
  ('AED', 3.6725),
  ('CNY', 6.706494),
  ('IDR', 17907.815096),
  ('MXN', 18.464303),
  ('KRW', 1339.811585)
) AS t(c, r)
ON CONFLICT (base_currency, quote_currency, fetched_at) DO NOTHING;

-- ============================================================
-- M4: WITHHOLDING / SETTLEMENT RULES (legal-review gate)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.withholding_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code         text NOT NULL,
  rule_kind           text NOT NULL CHECK (rule_kind IN ('withholding', 'settlement')),
  rule_name           text NOT NULL,
  rate_pct            numeric(6,3),
  applies_to          text NOT NULL DEFAULT 'contractor_payments',
  basis               text NOT NULL,
  citation_title      text NOT NULL,
  citation_url        text NOT NULL,
  citation_publisher  text NOT NULL,
  effective_date      date NOT NULL,
  -- LEGAL-REVIEW GATE: rules ship PENDING. They are disclosed as
  -- informational and NEVER computed until an admin sets approved.
  legal_review_status text NOT NULL DEFAULT 'pending'
                      CHECK (legal_review_status IN ('pending', 'approved', 'rejected')),
  reviewed_at         timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (market_code = upper(market_code) AND char_length(market_code) = 2),
  CONSTRAINT withholding_rules_unique UNIQUE (market_code, rule_kind, rule_name, applies_to, effective_date)
);

ALTER TABLE public.withholding_rules ENABLE ROW LEVEL SECURITY;

-- Public can read all rows: transparency about what exists and what is
-- still pending review is part of the honesty contract. The GATE is
-- enforced in the calculation library, not by hiding rows.
DROP POLICY IF EXISTS "withholding_rules_public_read" ON public.withholding_rules;
CREATE POLICY "withholding_rules_public_read"
  ON public.withholding_rules FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "withholding_rules_admin_write" ON public.withholding_rules;
CREATE POLICY "withholding_rules_admin_write"
  ON public.withholding_rules FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- M4 SEED: verified citations, ALL seeded as pending legal review.
INSERT INTO public.withholding_rules
  (market_code, rule_kind, rule_name, rate_pct, applies_to, basis, citation_title, citation_url, citation_publisher, effective_date, legal_review_status)
VALUES
  ('NG','withholding','Construction contract WHT (companies)',2,'contractor_payments','Withholding tax on payments for construction (roads, bridges, buildings, power plants) to resident companies','The new WHT Regulation','https://www.dentonsacaslaw.com/en/insights/articles/2024/july/5/the-new-wht-regulation-and-what-businesses-should-know','Denton Acas Law (FIRS WHT Regulation 2024)','2024-07-01','pending'),
  ('NG','withholding','Construction contract WHT (unincorporated)',5,'contractor_payments','Withholding tax on construction payments to unincorporated suppliers continues at 5%','Nigeria: WHT on construction reduced','https://academyoftaxlaw.com/nigeria-the-rate-of-withholding-tax-on-construction-and-related-activities-has-been-reduced-from-5-to-2-5','Academy of Tax Law','2024-07-01','pending'),
  ('GB','withholding','Construction Industry Scheme (registered)',20,'subcontractor_payments','CIS deduction on payments to registered subcontractors','Make deductions and pay subcontractors — GOV.UK','https://www.gov.uk/what-you-must-do-as-a-cis-contractor/make-deductions-and-pay-subcontractors','HM Revenue & Customs','2024-01-01','pending'),
  ('GB','withholding','Construction Industry Scheme (unregistered)',30,'subcontractor_payments','CIS deduction on payments to unregistered subcontractors','Make deductions and pay subcontractors — GOV.UK','https://www.gov.uk/what-you-must-do-as-a-cis-contractor/make-deductions-and-pay-subcontractors','HM Revenue & Customs','2024-01-01','pending')
ON CONFLICT (market_code, rule_kind, rule_name, applies_to, effective_date) DO NOTHING;

-- Force RLS everywhere (repo convention)
ALTER TABLE public.tax_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.withholding_rules FORCE ROW LEVEL SECURITY;
