-- =========================================================
-- Marketplace order disputes
-- Migration: 20261112234000_marketplace_order_disputes.sql
--
-- The order model already had a `disputed` status and a transition into it, but
-- nothing could come back out except as an admin, and a bare status flip left no
-- record of what the buyer was actually complaining about. This adds the record
-- and the way back.
--
-- Design:
--   • One dispute row per complaint: who raised it, what category, what they
--     said, what the professional answered, and how it ended.
--   • One OPEN dispute per order, enforced by a partial unique index.
--   • A buyer may raise one while the work is submitted for review (status
--     client_review) inside a 7-day window measured from client_review_at, so
--     escrow cannot be frozen indefinitely by an old complaint.
--   • `disputed` now requires an open dispute row, so a status flip with no
--     complaint is refused.
--   • While a dispute is open the order cannot be marked completed.
--   • The buyer can withdraw: disputed → client_review, only once no open
--     dispute remains. Adjudication (refund or dismissal) stays with an admin,
--     because that is who decides where held money goes.
--
-- Security: participants read their own order's disputes and nothing else.
-- Column-level rules (who may write what) live in a trigger, because RLS alone
-- cannot say "the professional may set only seller_response".
--
-- Rollback (safe, additive):
--   DROP TRIGGER IF EXISTS trg_marketplace_dispute_update ON public.marketplace_order_disputes;
--   DROP FUNCTION IF EXISTS public.enforce_marketplace_dispute_update();
--   DROP TABLE IF EXISTS public.marketplace_order_disputes;
--   ALTER TABLE public.marketplace_orders DROP COLUMN IF EXISTS client_review_at;
--   then re-apply the function body from 20261112210000_marketplace_order_integrity.sql
--   to restore the previous transition list. No money rows are touched.
-- =========================================================

-- When the work landed in the client's lap. The dispute window is measured from
-- here, not from updated_at, which any review edit would move.
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS client_review_at timestamptz;

CREATE TABLE IF NOT EXISTS public.marketplace_order_disputes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  opened_by             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_role           text NOT NULL CHECK (opened_role IN ('client', 'pro')),
  category              text NOT NULL CHECK (category IN (
                          'work_quality', 'not_delivered', 'scope', 'payment', 'other')),
  detail                text NOT NULL CHECK (length(btrim(detail)) >= 10),
  status                text NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'withdrawn', 'refunded', 'dismissed')),
  seller_response       text,
  seller_responded_at   timestamptz,
  resolution_note       text,
  resolved_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at           timestamptz,
  refund_amount_minor   bigint CHECK (refund_amount_minor IS NULL OR refund_amount_minor >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_disputes_order
  ON public.marketplace_order_disputes (order_id, created_at DESC);

-- At most one live complaint per order: opening a second one would fork the
-- decision about the same money.
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_one_open_dispute
  ON public.marketplace_order_disputes (order_id)
  WHERE status = 'open';

ALTER TABLE public.marketplace_order_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order participants read disputes" ON public.marketplace_order_disputes;
CREATE POLICY "order participants read disputes"
  ON public.marketplace_order_disputes FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_orders o
       WHERE o.id = order_id
         AND (
           o.client_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.pro_profiles p
              WHERE p.id = o.pro_profile_id AND p.user_id = auth.uid()
           )
         )
    )
  );

DROP POLICY IF EXISTS "client raises own dispute" ON public.marketplace_order_disputes;
CREATE POLICY "client raises own dispute"
  ON public.marketplace_order_disputes FOR INSERT TO authenticated
  WITH CHECK (
    opened_by = auth.uid()
    AND opened_role = 'client'
    AND EXISTS (
      SELECT 1 FROM public.marketplace_orders o
       WHERE o.id = order_id
         AND o.client_id = auth.uid()
         AND o.status = 'client_review'
         -- The window: a week after the work was handed over.
         AND o.client_review_at IS NOT NULL
         AND o.client_review_at > now() - interval '7 days'
    )
  );

DROP POLICY IF EXISTS "order participants update dispute" ON public.marketplace_order_disputes;
CREATE POLICY "order participants update dispute"
  ON public.marketplace_order_disputes FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR opened_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_orders o
       JOIN public.pro_profiles p ON p.id = o.pro_profile_id
       WHERE o.id = order_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR opened_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_orders o
       JOIN public.pro_profiles p ON p.id = o.pro_profile_id
       WHERE o.id = order_id AND p.user_id = auth.uid()
    )
  );

-- ── Column rules ─────────────────────────────────────────
-- A professional answers; a client may only withdraw. Neither may write a
-- resolution, a refund amount or the other side's words.
CREATE OR REPLACE FUNCTION public.enforce_marketplace_dispute_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_pro boolean := (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM marketplace_orders o
        JOIN pro_profiles p ON p.id = o.pro_profile_id
       WHERE o.id = OLD.order_id AND p.user_id = auth.uid()
    )
  );
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Immutable facts about the complaint.
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.opened_by IS DISTINCT FROM OLD.opened_by
     OR NEW.opened_role IS DISTINCT FROM OLD.opened_role
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.detail IS DISTINCT FROM OLD.detail
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'A dispute cannot be rewritten after it is filed.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Resolution is an adjudication, not a participant action.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'withdrawn' THEN
    RAISE EXCEPTION
      'Only an admin can resolve a dispute (withdrawing is the one exception).'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.resolution_note IS DISTINCT FROM OLD.resolution_note
     OR NEW.resolved_by IS DISTINCT FROM OLD.resolved_by
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.refund_amount_minor IS DISTINCT FROM OLD.refund_amount_minor THEN
    RAISE EXCEPTION
      'The resolution of a dispute belongs to platform review.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF actor_is_pro THEN
    -- The professional may answer, and nothing else.
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION
        'The professional cannot close a dispute; answer it.'
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    -- The buyer filed it, so the buyer may withdraw it, and only while open.
    IF NEW.seller_response IS DISTINCT FROM OLD.seller_response
       OR NEW.seller_responded_at IS DISTINCT FROM OLD.seller_responded_at THEN
      RAISE EXCEPTION
        'Only the professional can write their response.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status = 'withdrawn' AND OLD.status <> 'open' THEN
      RAISE EXCEPTION
        'Only an open dispute can be withdrawn.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_dispute_update ON public.marketplace_order_disputes;
CREATE TRIGGER trg_marketplace_dispute_update
  BEFORE UPDATE ON public.marketplace_order_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_marketplace_dispute_update();

-- ── Order guard: the dispute rules join the transition list ─────────────
-- Everything in this function except the three marked blocks is reproduced
-- unchanged from 20261112210000.
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
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'client_review'
       AND NEW.client_review_at IS NULL THEN
      NEW.client_review_at := now();
    END IF;
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
      -- NEW: the buyer takes a complaint back, once no dispute is left open
      OR (actor_is_client AND OLD.status = 'disputed' AND NEW.status = 'client_review'
          AND NOT EXISTS (
            SELECT 1 FROM marketplace_order_disputes d
             WHERE d.order_id = OLD.id AND d.status = 'open'
          ))
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

    -- NEW: a dispute is a complaint on file, never a bare status.
    IF NEW.status = 'disputed' AND NOT EXISTS (
         SELECT 1 FROM marketplace_order_disputes d
          WHERE d.order_id = OLD.id AND d.status = 'open'
       ) THEN
      RAISE EXCEPTION
        'Raise a dispute with a reason before the order can be marked disputed.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- NEW: held money cannot be called settled while someone is contesting it.
    IF NEW.status = 'completed' AND EXISTS (
         SELECT 1 FROM marketplace_order_disputes d
          WHERE d.order_id = OLD.id AND d.status = 'open'
       ) THEN
      RAISE EXCEPTION
        'This order has an open dispute; it cannot be completed until that is resolved.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- NEW: remember when the work reached the client (drives the dispute window).
    IF NEW.status = 'client_review' THEN
      NEW.client_review_at := now();
    END IF;

    IF NEW.status = 'cancelled' THEN
      NEW.cancel_initiated_by := CASE WHEN actor_is_client THEN 'client' ELSE 'pro' END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
