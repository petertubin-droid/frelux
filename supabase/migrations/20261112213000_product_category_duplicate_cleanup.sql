-- Phase: marketplace product category duplication cleanup (owner report).
--
-- The marketplace pills are built one per product category row, and workers report
-- repeated names in the table, the same shape as the Pro Connect trades. A buyer
-- sees two identical pills and cannot tell which one holds the stock.
--
-- Duplicates are found by normalised name: lower-cased, "&" read as "and", every
-- non-alphanumeric character collapsed. Products are moved to the canonical row
-- first, then the duplicate is deactivated rather than deleted, so nothing is lost
-- and the move can be undone.
--
-- Reversibility: both moves and merges are logged, and the rollback uses the logs.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS product_category_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duplicate_id uuid NOT NULL UNIQUE,
  canonical_id uuid NOT NULL,
  duplicate_slug text NOT NULL,
  canonical_slug text NOT NULL,
  merged_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_category_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  from_category_id uuid NOT NULL,
  to_category_id uuid NOT NULL,
  moved_at timestamptz NOT NULL DEFAULT now()
);

-- ── Find duplicates by normalised name ──────────────────────
WITH normalised AS (
  SELECT
    id,
    slug,
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(name), '&', ' and ', 'g'),
          '[^a-z0-9 ]+', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ) AS name_key
  FROM marketplace_product_categories
  WHERE is_active
), ranked AS (
  SELECT
    id,
    slug,
    name_key,
    row_number() OVER (PARTITION BY name_key ORDER BY created_at, id) AS rn
  FROM normalised
)
INSERT INTO product_category_merges (duplicate_id, canonical_id, duplicate_slug, canonical_slug)
SELECT d.id, c.id, d.slug, c.slug
FROM ranked d
JOIN ranked c ON c.name_key = d.name_key AND c.rn = 1
WHERE d.rn > 1
ON CONFLICT (duplicate_id) DO NOTHING;

-- ── Move products onto the canonical row ────────────────────
INSERT INTO product_category_moves (product_id, from_category_id, to_category_id)
SELECT p.id, m.duplicate_id, m.canonical_id
FROM marketplace_products p
JOIN product_category_merges m ON m.duplicate_id = p.category_id
ON CONFLICT (product_id) DO NOTHING;

UPDATE marketplace_products p
   SET category_id = mv.to_category_id
  FROM product_category_moves mv
 WHERE p.id = mv.product_id
   AND p.category_id = mv.from_category_id;

-- ── Retire the now-empty duplicate rows ─────────────────────
UPDATE marketplace_product_categories c
   SET is_active = false,
       updated_at = now()
  FROM product_category_merges m
 WHERE c.id = m.duplicate_id;
