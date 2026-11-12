-- Rollback for 20261112213000_product_category_duplicate_cleanup.sql
--
-- Puts every product back on the category row it was on and reactivates the rows
-- the cleanup retired, using the logs that migration wrote. Safe whether or not
-- anything was merged.

UPDATE marketplace_products p
   SET category_id = mv.from_category_id
  FROM product_category_moves mv
 WHERE p.id = mv.product_id
   AND p.category_id = mv.to_category_id;

UPDATE marketplace_product_categories c
   SET is_active = true,
       updated_at = now()
  FROM product_category_merges m
 WHERE c.id = m.duplicate_id;
