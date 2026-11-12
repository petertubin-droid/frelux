-- =========================================================
-- Marketplace payments: connect orders and milestones to the
-- live escrow engine.
--
-- on_bid_accepted_create_order() creates an order and four default
-- milestones, but nothing ever linked that order to a funded escrow
-- contract, and approving a milestone only flipped a status flag. The
-- Paystack/Flutterwave escrow engine was isolated on /diaspora-escrow,
-- so marketplace work could never be paid for or paid out.
--
-- These columns are the join. escrow-release uses them to mark the
-- marketplace milestone settled and to write a marketplace_payments row
-- at the moment money actually moves.
-- =========================================================

ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS escrow_contract_id uuid
  REFERENCES public.escrow_contracts(id) ON DELETE SET NULL;

ALTER TABLE public.marketplace_milestones
  ADD COLUMN IF NOT EXISTS amount numeric(14, 2);

ALTER TABLE public.marketplace_milestones
  ADD COLUMN IF NOT EXISTS escrow_milestone_id uuid
  REFERENCES public.escrow_milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_escrow_contract
  ON public.marketplace_orders (escrow_contract_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_milestones_escrow_milestone
  ON public.marketplace_milestones (escrow_milestone_id);

COMMENT ON COLUMN public.marketplace_milestones.amount IS
  'Milestone value in the order currency. Required before an order can be funded through escrow.';

UPDATE public.marketplace_milestones
SET amount = ROUND(
  (
    SELECT o.agreed_price / GREATEST(COUNT(*)::numeric, 1)
    FROM public.marketplace_orders o
    JOIN public.marketplace_milestones m2 ON m2.order_id = o.id
    WHERE o.id = marketplace_milestones.order_id
    GROUP BY o.agreed_price
  ),
  2
)
WHERE amount IS NULL;
