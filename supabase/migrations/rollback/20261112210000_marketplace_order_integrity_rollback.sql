-- Rollback for 20261112210000_marketplace_order_integrity.sql
--
-- Removes the participant bounds on order updates. After this, either party to an
-- order can again change the agreed price, the payment status, the lifecycle
-- status and the other party's review. Run it only if the trigger blocks a
-- legitimate flow that must not wait for a fix.

DROP TRIGGER IF EXISTS trg_marketplace_order_integrity ON marketplace_orders;
DROP FUNCTION IF EXISTS public.enforce_marketplace_order_update();
