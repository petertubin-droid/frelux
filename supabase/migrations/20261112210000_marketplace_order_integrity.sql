-- Phase: marketplace order integrity (owner directive: a real marketplace,
-- correct and secure).
--
-- The order table's update policy lets either party write any column of the row
-- they are on: `USING (client_id = auth.uid() OR pro is the seller)` with no
-- WITH CHECK beyond the same test. That is membership, not permission. With it:
--
--   * the client could lower agreed_price after the pro accepted the job, or the
--     pro could raise it, and whichever escrow reads that number pays differently;
--   * either side could set payment_status to 'fully_paid' without a payment;
--   * either side could set status straight to 'completed', skipping the other
--     party's acceptance, or drag a completed order back to 'pending_start';
--   * either party could write the other party's review (pro_rating from the
--     client's session, for instance) because "participant" is one permission.
--
-- The fix belongs in the database: a trigger bounds what a participant may change
-- and which transitions they may make. Admins and service-role connections (the
-- server-side paths) are unaffected.
--
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.enforce_marketplace_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_client boolean := (auth.uid() IS NOT NULL AND auth.uid() = OLD.client_id);
  actor_is_pro boolean := (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM pro_profiles
       WHERE id = OLD.pro_profile_id AND user_id = auth.uid()
    )
  );
BEGIN
  -- Admin tooling and server-side functions run with no end-user JWT (or an
  -- admin's). They are not constrained here.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- ── The agreed deal is immutable once struck ──────────────
  IF NEW.agreed_price IS DISTINCT FROM OLD.agreed_price
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.agreed_timeline_days IS DISTINCT FROM OLD.agreed_timeline_days
     OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.bid_id IS DISTINCT FROM OLD.bid_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.pro_profile_id IS DISTINCT FROM OLD.pro_profile_id
     OR NEW.order_number IS DISTINCT FROM OLD.order_number THEN
    RAISE EXCEPTION
      'The agreed price, currency, parties and order number cannot be changed after the order exists.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── Payment state is a record of money moved, not a user setting ──
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    RAISE EXCEPTION
      'Payment status is recorded by the payment system, not set by a participant.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── Each side writes only its own review ─────────────────
  IF NOT actor_is_client AND (
       NEW.client_rating IS DISTINCT FROM OLD.client_rating
       OR NEW.client_review IS DISTINCT FROM OLD.client_review
       OR NEW.client_reviewed_at IS DISTINCT FROM OLD.client_reviewed_at
     ) THEN
    RAISE EXCEPTION
      'A review can only be written by the person who gave it.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT actor_is_pro AND (
       NEW.pro_rating IS DISTINCT FROM OLD.pro_rating
       OR NEW.pro_review IS DISTINCT FROM OLD.pro_review
       OR NEW.pro_reviewed_at IS DISTINCT FROM OLD.pro_reviewed_at
     ) THEN
    RAISE EXCEPTION
      'A review can only be written by the person who gave it.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── Lifecycle transitions ────────────────────────────────
  -- A status change is the only update that needs a transition check; review and
  -- terms edits keep the status as it was.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      -- the professional starts the job they were awarded
      (actor_is_pro AND OLD.status = 'pending_start' AND NEW.status = 'in_progress')
      -- the professional submits finished work for review
      OR (actor_is_pro AND OLD.status = 'in_progress' AND NEW.status = 'client_review')
      -- the client accepts, or sends it back for rework
      OR (actor_is_client AND OLD.status = 'client_review' AND NEW.status IN ('completed', 'in_progress'))
      -- either side can raise a dispute while work is live
      OR (OLD.status IN ('in_progress', 'client_review') AND NEW.status = 'disputed')
      -- either side can cancel before completion, but must say why
      OR (OLD.status IN ('pending_start', 'in_progress', 'client_review')
          AND NEW.status = 'cancelled'
          AND NEW.cancel_reason IS NOT NULL
          AND length(btrim(NEW.cancel_reason)) >= 5)
    ) THEN
      RAISE EXCEPTION
        'That status change is not allowed: % to % by %',
        OLD.status, NEW.status,
        CASE WHEN actor_is_client THEN 'the client' ELSE 'the professional' END
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.status = 'cancelled' THEN
      NEW.cancel_initiated_by := CASE WHEN actor_is_client THEN 'client' ELSE 'pro' END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_order_integrity ON marketplace_orders;
CREATE TRIGGER trg_marketplace_order_integrity
  BEFORE UPDATE ON marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_marketplace_order_update();
