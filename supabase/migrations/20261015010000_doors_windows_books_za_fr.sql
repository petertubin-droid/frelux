-- ============================================================
-- FRELUX: Doors & Windows price books for South Africa (ZA) and France (FR)
--
-- Verified 2026-10-15 from live trade and builder merchant listings:
-- Cashbuild SA, Doors Direct SA, Leroy Merlin South Africa, and Brico Dépôt France.
-- All prices recorded with manual verification (scan_confidence='manual').
--
-- Items lacking direct local compliance or equivalence are intentionally
-- left unpriced and reported unresolved by the market resolver — never silently
-- substituted:
--
-- ZA (ZAR, Cashbuild SA, Doors Direct SA, Leroy Merlin SA live listings):
--   door-flush:       R302.95 (Cashbuild Hardboard Wood Door 813 x 2032 mm, SKU #212)
--   door-panel:       R439.95 (Cashbuild Tudor Moulded 6 Panel Door 813 x 2032 mm, SKU #211404)
--   door-frame:       R363.00 (Doors Direct Budget Unassembled Finger-Jointed Hardwood Door Frame 58x40mm for 813x2032mm opening, SKU #ALIDF001)
--   door-hinge:       R23.00  (Doors Direct Lock Worx 100mm Galvanised Steel Butt Hinge Pair R46.00 / R23.00 each, SKU #LWFH100CH-1)
--   door-lockset:     R250.00 (Leroy Merlin SA Eureka Lockset with Handles 2-Lever Fort Knox Satin Nickel, SKU #81439155, EAN 6002919166604)
--   window-aluminium: R1434.00 (Doors Direct PT912M Aluminium Top Hung Window 900x1200mm, AAMSA certified, with 3mm glass and draft seals, SKU #PT912M)
--   door-security:    R3709.00 (Leroy Merlin SA Ibuild Aluminium Sliding Door 1790x2090mm Bronze with safety glass & hardware, SKU #81427020)
--   window-louver:    Unpriced (tropical jalousie louvres are not standard residential practice under SANS 10400-XA / SANS 204 fenestration)
--
-- FR (EUR TTC, Brico Dépôt France live listings):
--   door-flush:       39.90 € (Brico Dépôt Bloc-porte isoplane prépeint blanc poussant 204 x 73 cm ép. 40 mm avec cadre et serrure, Réf #3660568300447, Code #670722)
--   door-panel:       69.90 € (Brico Dépôt Bloc-porte isoplane prépeint décor 204 x 83 cm ép. 40 mm, Réf #3660568300546, Code #670724)
--   door-hinge:       1.99 €  (Brico Dépôt Paumelle de bâtiment AB 110 x 55 mm, Réf #3283889158711)
--   door-lockset:     9.90 €  (Brico Dépôt Ensemble de poignées de porte "Cyriac" avec rosaces clé/cylindre, Réf #5059340548296)
--   door-frame:       Unpriced (in French practice under NF P 01-005, interior doors are sold and installed as pre-assembled bloc-porte sets; standalone huisserie fin de chantier requires exact partition thickness specification)
--   door-security:    Unpriced (French residential security entrance doors require certified A2P BP1/BP2/BP3 rating with multi-point lock and specialist acoustic/thermal DTU 36.5 specification)
--   window-aluminium: Unpriced (French residential fenestration standard is double-glazed oscillo-battant / ouvrant à la française under NF EN 14351-1 / DTU 36.5 with thermal break; tropical sliding frames do not comply)
--   window-louver:    Unpriced (tropical louvres are not compliant with French mainland thermal regulations RE2020 / RT2012)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    -- South Africa (ZA)
    ('ZA', 'door-flush',       302.95, 'ZAR', 'Cashbuild Hardboard Wood Door 813 x 2032 mm R302.95, SKU #212, live listing 2026-10-15'),
    ('ZA', 'door-panel',       439.95, 'ZAR', 'Cashbuild Tudor Moulded 6 Panel Door 813 x 2032 mm R439.95, SKU #211404, live listing 2026-10-15'),
    ('ZA', 'door-frame',       363.00, 'ZAR', 'Doors Direct Budget Unassembled Hardwood Door Frame 58x40mm R363.00, SKU #ALIDF001, live listing 2026-10-15'),
    ('ZA', 'door-hinge',        23.00, 'ZAR', 'Doors Direct Lock Worx 100mm Galvanised Steel Butt Hinge Pair R46.00 (R23.00/ea), SKU #LWFH100CH-1, live listing 2026-10-15'),
    ('ZA', 'door-lockset',     250.00, 'ZAR', 'Leroy Merlin SA Eureka Lockset with Handles 2-Lever Fort Knox Satin Nickel R250.00, SKU #81439155, live listing 2026-10-15'),
    ('ZA', 'window-aluminium', 1434.00, 'ZAR', 'Doors Direct PT912M Aluminium Top Hung Window 900x1200mm AAMSA certified R1434.00, SKU #PT912M, live listing 2026-10-15'),
    ('ZA', 'door-security',    3709.00, 'ZAR', 'Leroy Merlin SA Ibuild Aluminium Sliding Door 1790x2090mm Bronze R3709.00, SKU #81427020, live listing 2026-10-15'),

    -- France (FR)
    ('FR', 'door-flush',        39.90, 'EUR', 'Brico Dépôt Bloc-porte isoplane prépeint 204 x 73 cm 39.90 € TTC, Réf #3660568300447, Code #670722, live listing 2026-10-15'),
    ('FR', 'door-panel',        69.90, 'EUR', 'Brico Dépôt Bloc-porte isoplane prépeint 204 x 83 cm 69.90 € TTC, Réf #3660568300546, Code #670724, live listing 2026-10-15'),
    ('FR', 'door-hinge',         1.99, 'EUR', 'Brico Dépôt Paumelle de bâtiment AB 110 x 55 mm 1.99 € TTC, Réf #3283889158711, live listing 2026-10-15'),
    ('FR', 'door-lockset',       9.90, 'EUR', 'Brico Dépôt Ensemble de poignées de porte Cyriac 9.90 € TTC, Réf #5059340548296, live listing 2026-10-15')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug AND m.is_active = true
)
, deactivated AS (
  UPDATE estimation_prices p
  SET is_active = false, updated_at = now()
  FROM seeded s
  WHERE p.price_type = 'material'
    AND p.ref_id = s.material_id
    AND p.market = s.market
    AND p.is_active = true
  RETURNING 1
)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_confidence, market)
SELECT 'material', s.material_id, s.price, s.currency, CURRENT_DATE, s.source, true, s.source, 'manual', s.market
FROM seeded s
ON CONFLICT DO NOTHING;
