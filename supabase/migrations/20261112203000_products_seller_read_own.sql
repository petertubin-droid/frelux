-- Phase: seller visibility of their own products (marketplace completeness).
--
-- marketplace_products carries exactly one SELECT policy, products_public_read:
-- status = 'active' AND admin_removed = false. That is correct for the public
-- catalogue and wrong for the seller, who therefore cannot see their own paused,
-- draft or sold-out rows. MyProducts and the seller dashboard read through
-- fetchMyProducts(seller_id), so those rows silently vanish from the seller's own
-- list: an item marked sold disappears from the shop it was listed in, with no
-- way to bring it back.
--
-- This adds the missing owner-read policy. RLS policies are permissive and OR'd,
-- so the public catalogue keeps exactly the rows it had and the seller gains
-- their own.
--
-- Nothing is widened for anyone else: the policy is auth.uid() = seller_id.
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "products_seller_read" ON marketplace_products;
CREATE POLICY "products_seller_read" ON marketplace_products
  FOR SELECT USING (auth.uid() = seller_id);
