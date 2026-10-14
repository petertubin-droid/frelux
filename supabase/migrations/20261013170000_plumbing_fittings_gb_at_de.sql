-- Migration: Add remaining plumbing fittings and valves for GB, AT, and full DE set
--
-- Coverage completed by this migration:
-- - GB: union (JG Speedfit PEM0415WP straight connector 15mm: £2.25) -> GB now 5/5
-- - AT: elbow (Multitherm PPR 90° 20mm: €0.95), union (Multitherm PPR Muffe 25mm: €0.89), valve (OBI DVGW Trinkwasserkugelhahn 1/2" IG: €12.59) -> AT now 5/5
-- - DE: copper press-fit 15mm & drinking-water ball valve 1/2" (Hornbach / OBI DVGW certified):
--       elbow (€2.15), tee (€4.49), reducer 22x15 (€2.00), union (€1.98), valve (€9.19) -> DE now 5/5
--
-- Seed convention follows 20261013160000_plumbing_fittings_us_gb_at.sql:
--   Slug: {mkt}-{item} where item in (elbow, tee, reducer, union, valve)
--   Category: 'pipe'
--   Unit: 'piece'

INSERT INTO material_price_history (
    region_id,
    material_slug,
    category,
    name,
    unit,
    price,
    confidence_score,
    source,
    source_type,
    notes
) VALUES
-- ============================================================================
-- UNITED KINGDOM (GB) - Remaining: union
-- ============================================================================
(
    'GB',
    'gb-union',
    'pipe',
    'JG Speedfit 15mm Straight Connector / Coupler (PEM0415WP)',
    'piece',
    2.25,
    0.95,
    'https://www.wickes.co.uk/JG-Speedfit-PEM0415WP-Straight-Connector---15mm/p/421650',
    'scraped',
    'Push-fit equal straight coupler 15mm. Standard single unit price £2.25.'
),

-- ============================================================================
-- AUSTRIA (AT) - Remaining: elbow, union, valve
-- ============================================================================
(
    'AT',
    'at-elbow',
    'pipe',
    'Multitherm PPR-Winkel 90° 20mm',
    'piece',
    0.95,
    0.95,
    'https://www.hornbach.at/p/ppr-winkel-multitherm-90-20mm/4030999/',
    'scraped',
    'PPR fusion weld elbow 90° 20mm for hot/cold sanitary water systems.'
),
(
    'AT',
    'at-union',
    'pipe',
    'Multitherm PPR-Muffe 25mm',
    'piece',
    0.89,
    0.95,
    'https://www.hornbach.at/p/ppr-muffe-multitherm-25mm/4031022/',
    'scraped',
    'PPR fusion weld coupling / straight socket (Muffe) 25mm.'
),
(
    'AT',
    'at-valve',
    'pipe',
    'Trinkwasserkugelhahn 2 x IG 1/2" (18,6mm) DVGW geprüft',
    'piece',
    12.59,
    0.90,
    'https://www.obi.at/p/2707461/trinkwasserkugelhahn-2-x-ig-18-6mm-1-2-',
    'scraped',
    'Brass drinking-water certified ball valve 1/2" female thread, DVGW certified.'
),

-- ============================================================================
-- GERMANY (DE) - Full set (5/5): elbow, tee, reducer, union, valve
-- System: 15mm copper press-fit DVGW certified (standard modern DE sanitary installation)
-- ============================================================================
(
    'DE',
    'de-elbow',
    'pipe',
    'Pressfitting Bogen 90° Kupfer Presskontur V+M 15mm DVGW',
    'piece',
    2.15,
    0.95,
    'https://www.hornbach.de/p/pressfitting-bogen-90-kupfer-presskontur-v-m-15-x-15-mm-dvgw-fuer-kupferrohr/12043964/',
    'scraped',
    'Copper press-fit 90° bend 15mm with V/M press contour, DVGW certified.'
),
(
    'DE',
    'de-tee',
    'pipe',
    'Press-T-Stück Ø 15 mm Kupfer DVGW V-Kontur',
    'piece',
    4.49,
    0.95,
    'https://www.obi.de/p/7492929/press-t-stueck-15-mm-kupfer',
    'scraped',
    'Copper press-fit equal tee 15mm x 15mm x 15mm, DVGW certified.'
),
(
    'DE',
    'de-reducer',
    'pipe',
    'Pressfitting Reduzierstück I/A Kupfer Presskontur V+M 22x15mm DVGW',
    'piece',
    2.00,
    0.95,
    'https://www.hornbach.de/p/pressfitting-reduzierstueck-i-a-kupfer-presskontur-v-m-22-x-15-mm-dvgw-fuer-kupferrohr/12044012/',
    'scraped',
    'Copper press reducer 22mm x 15mm male/female, DVGW certified.'
),
(
    'DE',
    'de-union',
    'pipe',
    'Pressfitting Muffe Kupfer Presskontur V+M 15mm DVGW',
    'piece',
    1.98,
    0.95,
    'https://www.hornbach.de/p/pressfitting-muffe-kupfer-presskontur-v-m-15-x-15-mm-dvgw-fuer-kupferrohr/12043997/',
    'scraped',
    'Copper press socket / coupling (Muffe) 15mm, DVGW certified.'
),
(
    'DE',
    'de-valve',
    'pipe',
    'Trinkwasserkugelhahn IG 1/2" x AG 1/2" DVGW geprüft',
    'piece',
    9.19,
    0.95,
    'https://www.obi.de/p/2048759/trinkwasserkugelhahn-ig-18-6-mm-1-2-x-ag-21-mm-1-2-',
    'scraped',
    'Brass drinking-water ball valve 1/2" female x male thread, DVGW certified for domestic water systems.'
)
ON CONFLICT (region_id, material_slug) DO UPDATE SET
    price = EXCLUDED.price,
    confidence_score = EXCLUDED.confidence_score,
    source = EXCLUDED.source,
    source_type = EXCLUDED.source_type,
    notes = EXCLUDED.notes,
    created_at = now();
