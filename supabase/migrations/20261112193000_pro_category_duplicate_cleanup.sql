-- Phase: Pro Connect trade duplication cleanup (owner report 2026-11-12).
--
-- The directory rendered one chip per pro_categories row, and the table carries
-- rows whose names mean the same trade ("Welders & Metal Fabricators" twice,
-- "Landscapers & Gardeners" twice). Each duplicate row holds its own
-- professionals, so the duplicates cannot simply be deleted: the profiles on the
-- duplicate are first moved to the canonical row, then the duplicate is
-- deactivated. Nothing is deleted, so nothing is lost.
--
-- Duplicates are found by normalised name: lower-cased, "&" read as "and", and
-- every non-alphanumeric character collapsed. Rows that merely resemble each
-- other ("Paving & Interlocking Specialists" beside "...Installers") are NOT
-- merged here: those are different wording that may be deliberate, and the
-- directory now folds them into one chip for matching while keeping both rows
-- reachable.
--
-- Reversibility: two log tables record exactly what moved. The rollback uses them
-- to put every profile back and reactivate every row.
--
-- Idempotent: safe to re-run.

-- ── 1. Logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pro_category_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duplicate_id uuid NOT NULL UNIQUE,
  canonical_id uuid NOT NULL,
  duplicate_name text NOT NULL,
  canonical_name text NOT NULL,
  merged_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pro_profile_category_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  from_category_id uuid NOT NULL,
  to_category_id uuid NOT NULL,
  moved_at timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Find duplicates by normalised name ───────────────────
WITH normalised AS (
  SELECT
    id,
    name,
    created_at,
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(name), '&', ' and ', 'g'),
          '[^a-z0-9 ]+', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ) AS name_key
  FROM pro_categories
  WHERE is_active
), ranked AS (
  SELECT
    id,
    name,
    name_key,
    row_number() OVER (PARTITION BY name_key ORDER BY created_at, id) AS rn
  FROM normalised
)
INSERT INTO pro_category_merges (duplicate_id, canonical_id, duplicate_name, canonical_name)
SELECT d.id, c.id, d.name, c.name
FROM ranked d
JOIN ranked c ON c.name_key = d.name_key AND c.rn = 1
WHERE d.rn > 1
ON CONFLICT (duplicate_id) DO NOTHING;

-- ── 3. Move professionals onto the canonical row ────────────
INSERT INTO pro_profile_category_moves (profile_id, from_category_id, to_category_id)
SELECT p.id, m.duplicate_id, m.canonical_id
FROM pro_profiles p
JOIN pro_category_merges m ON m.duplicate_id = p.category_id
ON CONFLICT (profile_id) DO NOTHING;

UPDATE pro_profiles p
   SET category_id = mv.to_category_id
  FROM pro_profile_category_moves mv
 WHERE p.id = mv.profile_id
   AND p.category_id = mv.from_category_id;

-- ── 4. Take the now-empty duplicate rows out of the list ────
UPDATE pro_categories c
   SET is_active = false,
       updated_at = now()
  FROM pro_category_merges m
 WHERE c.id = m.duplicate_id;
