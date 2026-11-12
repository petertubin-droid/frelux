-- Rollback for 20261112203000_products_seller_read_own.sql
--
-- Removes the owner-read policy, returning sellers to the behaviour where only
-- publicly visible products are readable, including by their own seller. Run this
-- only if the policy is found to expose rows it should not; it re-hides drafts,
-- paused and sold products from the seller dashboard.

DROP POLICY IF EXISTS "products_seller_read" ON marketplace_products;
