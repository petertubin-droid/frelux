-- =========================================================
-- §D STANDARDS GAPS: EG, TZ, CI, SG, TR, ET (2026-10-24)
--
-- Web-verified national construction standards for the six
-- markets identified as missing building_code references in the
-- international positioning audit. Every entry cites an official
-- or authoritative source; confidence reflects how directly the
-- source documents adoption.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, evidence_url, verified_date)
VALUES
  -- Egypt: Unified Building Law + ECP codes published by HBRC.
  ('EG', 'building_code', 'eg-unified-building-law-119-2008',
   'Unified Building Law No. 119/2008 with Egyptian Codes of Practice (ECP)',
   'Housing and Building National Research Center (HBRC), Ministry of Housing',
   'national_standard',
   'Building design and construction requirements; ECP 201 (loads and forces), ECP 203 (reinforced concrete), ECP 101 (sanitary drainage)',
   '{"engines": ["structural", "build_to_roof", "plumbing"]}',
   'Egyptian construction is governed by the Unified Building Law No. 119/2008 and its executive appendix, with technical design rules issued as the Egyptian Codes of Practice by the HBRC. Confirm the current ECP edition per discipline before compliance claims.',
   'medium',
   'https://www.hbrc.edu.eg/en/activities/codes',
   '2026-10-24'),

  -- Tanzania: honest state — no single fully-adopted national code.
  ('TZ', 'building_code', 'tz-no-national-code-aat-2003',
   'No fully adopted national building code; AAT 2003 code not fully adopted',
   'Architects Association of Tanzania (AAT); NHBRA functions moved to Ardhi University (2020)',
   'assessment',
   'Building regulation framework; local authority by-laws govern in practice',
   '{"engines": ["structural", "build_to_roof"]}',
   'Per the ICC country assessment, Tanzania has no national building code in force; a code drafted by the Architects Association of Tanzania in 2003 was never fully adopted, and National Housing and Building Research Agency functions transferred to Ardhi University in 2020. Confirm local authority requirements per project before compliance claims.',
   'medium',
   'https://www.iccsafe.org/products-and-services/global-services/countries/tanzania/',
   '2026-10-24'),

  -- Côte d'Ivoire: Code de la Construction et de l'Habitat (2019).
  ('CI', 'building_code', 'ci-code-construction-habitat-2019-576',
   'Code de la Construction et de l''Habitat (Loi n°2019-576 du 26 juin 2019)',
   'Government of Côte d''Ivoire',
   'national_standard',
   'Construction permits, technical quality and environmental conformity requirements for all building work',
   '{"engines": ["structural", "build_to_roof"]}',
   'Ivorian construction is governed by Law No. 2019-576 of 26 June 2019 instituting the Code de la Construction et de l''Habitat, which requires building permits for all construction and sets technical and environmental conformity rules. A revision law is in parliamentary process (2025); confirm the current text.',
   'high',
   'https://www.economie-ivoirienne.ci/sites/default/files/sites/default/files/inline-files/Loi%20n%C2%B0%202019-576%20du%2026%20juin%202019%20instituant%20Code%20de%20la%20Construction%20et%20de%20l%E2%80%99Habitat.pdf',
   '2026-10-24'),

  -- Singapore: Building Control Act 1989 + Regulations, BCA.
  ('SG', 'building_code', 'sg-building-control-act-1989',
   'Building Control Act 1989 (Chapter 29) and Building Control Regulations',
   'Building and Construction Authority (BCA), Singapore',
   'national_standard',
   'Plan approval, structural safety, accessibility and environmental sustainability standards for all building works',
   '{"engines": ["structural", "build_to_roof"]}',
   'Singapore building works are regulated by the Building Control Act 1989 and its Building Control Regulations, administered by the BCA; approved documents and codes of practice are published by BCA. Structural designs must be prepared by a Professional Engineer registered under the Professional Engineers Act.',
   'high',
   'https://sso.agc.gov.sg/act/bca1989',
   '2026-10-24'),

  -- Turkey: TBDY-2018 seismic regulation + TS 500 concrete design.
  ('TR', 'building_code', 'tr-tbdy-2018-earthquake-regulation',
   'Turkish Building Earthquake Regulation (TBDY-2018) with TS 500 reinforced concrete design',
   'Ministry of Environment and Urbanization, Republic of Türkiye',
   'national_standard',
   'Seismic design, load combinations and detailing requirements for buildings; TS 500 for reinforced concrete design and construction',
   '{"engines": ["structural", "build_to_roof"]}',
   'Turkish building design follows the 2018 Building Earthquake Regulation (TBDY-2018), published in the Official Gazette on 18 March 2018 and effective 1 January 2019, together with TS 500 for reinforced concrete. Seismic zone and soil class determine design loads; a licensed engineer must confirm the design basis.',
   'high',
   'https://www.preventionweb.net/news/turkey-new-building-code-earthquake-resilience',
   '2026-10-24'),

  -- Ethiopia: Building Proclamation 624/2009 + EBCS standards series.
  ('ET', 'building_code', 'et-building-proclamation-624-2009-ebcs',
   'Ethiopian Building Proclamation No. 624/2009 with Ethiopian Building Code Standards (EBCS)',
   'Ministry of Works and Urban Development, Federal Democratic Republic of Ethiopia',
   'national_standard',
   'National minimum standards for building construction and modification; EBCS-1 (basis of design), EBCS-2 (structural use of concrete)',
   '{"engines": ["structural", "build_to_roof"]}',
   'Ethiopian building construction is regulated by Proclamation No. 624/2009, applicable to urban centers of 10,000+ dwellers, with technical design rules in the Ethiopian Building Code Standards (EBCS series). Newer Eurocode-aligned ES EN standards (e.g. ES EN 1992-1-1:2013) supplement EBCS-2:1995 for concrete design; confirm the governing edition with the local authority.',
   'high',
   'https://justice.gov.et/en/law/ethiopian-building-proclamation/',
   '2026-10-24')
ON CONFLICT DO NOTHING;
