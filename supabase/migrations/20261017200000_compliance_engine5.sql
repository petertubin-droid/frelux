-- ============================================================================
-- FRELUX Engine #5: Regulatory compliance & standards
-- Migration: 20261017200000_compliance_engine5.sql
-- ============================================================================
-- 1. Closes the construction_standards 20-market gap: ID / MX / KR
--    rows, seeded ONLY from web-verified national standards
--    (retrieved 2026-10-15; see evidence_url in each row).
-- 2. compliance_reviews: EXPERT-REVIEW gate for checklist items.
--    Every row ships PENDING; a pending review is disclosed and
--    NEVER shown as expert-confirmed. Admin-only writes via RLS
--    (mirrors predictive_model_validations / withholding_rules) so the
--    app can never self-certify compliance.
--    A review ANNOTATES confidence; it never turns a checklist into a
--    certification — the compliance engine never certifies anything.
-- ============================================================================

-- ============================================================
-- 1. ID / MX / KR standards seeds (web-verified 2026-10-15)
-- ============================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, evidence_url, verified_date)
VALUES
  -- Indonesia: BSN national standards (concrete structural design +
  -- seismic). Official government-hosted documents.
  ('ID', 'building_code', 'sni-03-2847-2002',
   'Tata Cara Perhitungan Struktur Beton untuk Bangunan Gedung (SNI 03-2847-2002)',
   'Badan Standardisasi Nasional (BSN)', 'national_standard',
   'Reinforced-concrete structural design procedure for buildings',
   '{"engines": ["structural", "block"]}',
   'Indonesian concrete structural design follows SNI 03-2847-2002 (Tata Cara Perhitungan Struktur Beton untuk Bangunan Gedung), the national standard issued by BSN. Applied alongside SNI 1726:2019 seismic requirements.',
   'high',
   'https://lmsspada.kemdiktisaintek.go.id/pluginfile.php/543342/mod_resource/content/1/SNI-03-2847-2002-Tata%20Cara%20Perhitungan%20Struktur%20Beton.%20Untuk%20Bangunan%20Gedung.pdf',
   '2026-10-15'),
  ('ID', 'building_code', 'sni-1726-2019',
   'Tata Cara Perencanaan Ketahanan Gempa untuk Struktur Bangunan Gedung dan Non-gedung (SNI 1726:2019)',
   'Badan Standardisasi Nasional (BSN)', 'national_standard',
   'Seismic resistance planning requirements for building structures',
   '{"engines": ["structural"]}',
   'Indonesian seismic design follows SNI 1726:2019 (BSN), the current national earthquake-resistance planning standard replacing SNI 1726-2012; published via the Ministry of Public Works (sitaba.pu.go.id).',
   'high',
   'https://sitaba.pu.go.id/publikasi/6977fb4f-d02f-4fd0-a857-65219c38f24e',
   '2026-10-15'),
  -- Mexico: CDMX building regulations (the jurisdiction with the
  -- binding technical norms). Official GCDMX publications.
  ('MX', 'building_code', 'rcdf-cdmx',
   'Reglamento de Construcciones para la Ciudad de México',
   'Gobierno de la Ciudad de México (GCDMX)', 'national_standard',
   'Mexico City building regulations (RCDF framework)',
   '{"engines": ["structural", "block"]}',
   'Construction in Mexico City is governed by the Reglamento de Construcciones para la Ciudad de México, developed through its Normas Técnicas Complementarias (NTC) published in the Gaceta Oficial by the Secretaría de Obras (obras.cdmx.gob.mx).',
   'high',
   'https://www.obras.cdmx.gob.mx/storage/app/media/LIBRO%203%20TOMO%20II/LIBRO%203%20TOMO%20II.pdf',
   '2026-10-15'),
  ('MX', 'building_code', 'ntc-concreto-cdmx',
   'Normas Técnicas Complementarias para Diseño y Construcción de Estructuras de Concreto',
   'Gobierno de la Ciudad de México (GCDMX)', 'national_standard',
   'Concrete structural design and construction NTC for CDMX',
   '{"engines": ["structural"]}',
   'Concrete structures in CDMX follow the NTC para Diseño y Construcción de Estructuras de Concreto (GCDMX, official Gaceta publication; also hosted by transparencia.cdmx.gob.mx), complementing the RCDF.',
   'high',
   'https://www.obras.cdmx.gob.mx/storage/app/media/LIBRO%203%20TOMO%20II/LIBRO%203%20TOMO%20II.pdf',
   '2026-10-15'),
  -- Korea: MOLIT building code + Korean Construction Standards (KCS,
  -- administered by the Korea Construction Standards Center under MOLIT).
  ('KR', 'building_code', 'kbc-molit',
   'Korean Building Code (KBC)',
   'Ministry of Land, Infrastructure and Transport (MOLIT)', 'national_standard',
   'National building code: minimum provisions for building systems',
   '{"engines": ["structural", "block"]}',
   'Building safety in Korea is the responsibility of MOLIT; the Korean Building Code establishes minimum provisions for building systems (structural strength, egress, safety), with standards developed via the Korea Construction Standards Center.',
   'medium',
   'https://www.kict.re.kr/menu.es?mid=a20221010000',
   '2026-10-15'),
  ('KR', 'building_code', 'kcs-14-20-10',
   'KCS 14 20 10 Normal Concrete (Korean Construction Standard)',
   'Korea Construction Standards Center (KCSC / MOLIT)', 'national_standard',
   'KCS standard for normal (structural) concrete',
   '{"engines": ["structural"]}',
   'Korean structural concrete work follows the KCS standards administered by the Korea Construction Standards Center (KCS 14 20 10 normal concrete per Korea Concrete Institute editions).',
   'medium',
   'https://www.en.kci.or.kr/pages_introduce/history.vm',
   '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;

-- ============================================================
-- 2. Expert-review gate
-- ============================================================

CREATE TABLE IF NOT EXISTS public.compliance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL,
  domain text NOT NULL,
  ref text NOT NULL,
  -- 'pending' rows are disclosed as UNREVIEWED and never displayed as
  -- expert-confirmed. Only an admin can set 'approved'.
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewer_name text,
  reviewer_credentials text,
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (market_code = upper(market_code) AND char_length(market_code) = 2),
  CONSTRAINT compliance_reviews_unique UNIQUE (market_code, domain, ref),
  CONSTRAINT compliance_reviews_approved_requires_reviewer CHECK (
    review_status <> 'approved' OR (reviewer_name IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_compliance_reviews_market
  ON public.compliance_reviews(market_code);

ALTER TABLE public.compliance_reviews ENABLE ROW LEVEL SECURITY;

-- Public read: transparency — a pending review must be VISIBLE as
-- pending, not hidden. The gate is behavioural, enforced in the lib.
DROP POLICY IF EXISTS "compliance_reviews_public_read" ON public.compliance_reviews;
CREATE POLICY "compliance_reviews_public_read"
  ON public.compliance_reviews FOR SELECT
  TO public
  USING (true);

-- Admin-only writes: the application can never approve its own
-- compliance review (mirrors predictive_model_validations).
DROP POLICY IF EXISTS "compliance_reviews_admin_write" ON public.compliance_reviews;
CREATE POLICY "compliance_reviews_admin_write"
  ON public.compliance_reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.compliance_reviews FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.compliance_reviews IS 'Expert-review gate for construction_standards checklist items. pending = disclosed as unreviewed, never expert-confirmed. Admin-only writes: the app cannot self-certify. A review annotates confidence; it never certifies compliance.';
