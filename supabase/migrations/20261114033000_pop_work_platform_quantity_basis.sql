-- POP work platform: the "Surface Board" row was wrong for the Nigerian market.
--
-- It was seeded as a 2.5 m² ceiling consumable at ₦2,500 a board. In practice
-- the board Nigerians buy for POP work is an MDF plywood sheet a fitter stands
-- on while working the ceiling, and it scales with the crew, not the area:
-- two fitters share one sheet, so one worker needs half a board, two need one,
-- three need one and a half. Sheets are sold whole, so the purchase rounds up.
--
-- This migration adds the quantity basis the engine needs and corrects the row.
--
-- Pricing follows the market: a whole MDF sheet is 25,000 and a supplier cuts
-- one in two for 13,000, so a one-worker job is 13,000, two workers 25,000 and
-- three workers 38,000. The half price is its own column because it is not
-- half of the board price.

ALTER TABLE pop_materials
  ADD COLUMN IF NOT EXISTS quantity_basis text NOT NULL DEFAULT 'area',
  ADD COLUMN IF NOT EXISTS per_worker_rate numeric,
  ADD COLUMN IF NOT EXISTS split_unit_price numeric;

-- Guard the basis values without breaking existing rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pop_materials_quantity_basis_check'
  ) THEN
    ALTER TABLE pop_materials
      ADD CONSTRAINT pop_materials_quantity_basis_check
      CHECK (quantity_basis IN ('area', 'per_worker'));
  END IF;
END
$$;

COMMENT ON COLUMN pop_materials.quantity_basis IS
  'How quantity is derived: "area" = ceiling area / coverage_rate, "per_worker" = workers x per_worker_rate.';
COMMENT ON COLUMN pop_materials.per_worker_rate IS
  'Boards/sheets per worker when quantity_basis = per_worker (0.5 for the MDF work platform).';
COMMENT ON COLUMN pop_materials.split_unit_price IS
  'Price of a cut half unit when a per-worker quantity is not whole. A 25,000 sheet is cut for 13,000.';

-- Correct the Nigerian row in place, keeping its id so saved estimates and
-- admin references still resolve.
UPDATE pop_materials
SET
  name = 'MDF Plywood (work platform)',
  description = 'MDF plywood sheet a fitter stands on while working the ceiling. Two fitters share one sheet, so the count follows the crew: 1 worker = half a board, 2 = 1 board, 3 = 1.5 boards.',
  unit = 'board',
  coverage_rate = 0,
  coverage_unit = 'board',
  quantity_basis = 'per_worker',
  per_worker_rate = 0.5,
  split_unit_price = 13000,
  package_size = 1,
  package_unit = 'board',
  unit_price = 25000,
  updated_at = now()
WHERE workflow = 'nigeria'
  AND name = 'Surface Board';

-- The workflow description named the wrong material too.
UPDATE pop_workflows
SET description = 'Traditional Nigerian POP ceiling using POP cement, fibre, and an MDF plywood work platform'
WHERE slug = 'nigeria'
  AND description LIKE '%surface board%';

-- Any POP material that has no explicit basis keeps the area behaviour.
UPDATE pop_materials
SET quantity_basis = 'area'
WHERE quantity_basis IS NULL;
