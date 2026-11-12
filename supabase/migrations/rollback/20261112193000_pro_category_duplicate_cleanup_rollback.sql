-- Rollback for 20261112193000_pro_category_duplicate_cleanup.sql
--
-- Restores every professional to the category row it was on and reactivates the
-- rows the cleanup deactivated, using the logs written by that migration. Safe to
-- run whether or not anything was merged (both logs may be empty).

UPDATE pro_profiles p
   SET category_id = mv.from_category_id
  FROM pro_profile_category_moves mv
 WHERE p.id = mv.profile_id
   AND p.category_id = mv.to_category_id;

UPDATE pro_categories c
   SET is_active = true,
       updated_at = now()
  FROM pro_category_merges m
 WHERE c.id = m.duplicate_id;

-- The logs are kept, not truncated: they are the record of what the cleanup did,
-- and a re-merge after a rollback must not write a second, contradictory row.
