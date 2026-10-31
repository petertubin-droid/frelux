-- Nigerian delivery units are not prices in other markets.
--
-- The FX reference seed copied every active Nigerian material into every other
-- market. That is defensible for materials whose trade form is universal (a
-- bag of cement, a cubic metre of sand) and was already labelled as a reference.
-- It is not defensible for buying conventions that exist only in Nigeria: a
-- five-tonne tipper of sand, a tipper of granite. A US or UK visitor was being
-- quoted a "trip" of sand with no meaning in their own market.
--
-- src/lib/international/trade-forms.ts is the code-side register and refuses
-- these slugs in the price query as well. This migration clears the rows that
-- were already seeded, so exports, admin views and any direct reader that does
-- not go through that query stop seeing them too.
--
-- Reversible: the rows are deactivated, never deleted. Setting is_active back
-- to true restores them.

UPDATE estimation_prices p
SET is_active = false,
    updated_at = now()
FROM estimation_materials m
WHERE m.id = p.ref_id
  AND p.price_type = 'material'
  AND p.is_active = true
  AND p.market IS NOT NULL
  AND p.market <> 'NG'
  AND m.slug IN ('sand-per-trip', 'granite-per-trip');
