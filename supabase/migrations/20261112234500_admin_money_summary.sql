-- =========================================================
-- Admin money summary (one reconciliation call)
-- Migration: 20261112234500_admin_money_summary.sql
--
-- Revenue was readable one stream at a time: subscriptions in one place, token
-- packs in another, escrow and marketplace in the admin order screens. Nobody
-- could answer "what came in this week" without stitching four screens together,
-- which is how a missing payment goes unnoticed.
--
-- This returns every money stream for a window in one jsonb document:
--   subscriptions, token packs, API wallet top-ups, escrow (held / released /
--   refunded / fees), marketplace order value, and AI-credit spend.
--
-- Correctness rules baked in:
--   • Currencies are never added together. Each stream reports a per-currency
--     breakdown, because ₦ and $ totals are not the same number.
--   • Minor units are preserved as sent by the provider (kobo, cents); the UI
--     formats them, the database does not guess.
--   • Only money that actually settled counts: token packs must be 'completed',
--     top-ups 'credited'. Pending rows are reported separately, not folded in.
--   • Admin-only, checked in-function, so the service key is not needed to read
--     it but a normal user gets nowhere.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_money_summary(integer);
--   Nothing else changes: no tables, no columns, no data.
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_money_summary(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz;
  v_days integer := COALESCE(p_days, 30);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_days < 1 OR v_days > 365 THEN
    RAISE EXCEPTION 'Window must be between 1 and 365 days';
  END IF;

  v_since := now() - make_interval(days => v_days);

  RETURN jsonb_build_object(
    'window_days', v_days,
    'since', v_since,
    'generated_at', now(),

    -- Subscriptions: what was actually charged, per currency.
    'subscriptions', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT currency,
               count(*)                          AS purchases,
               sum(amount_kobo)                  AS amount_minor,
               count(DISTINCT user_id)           AS buyers
          FROM public.subscription_purchases
         WHERE created_at >= v_since
         GROUP BY currency
         ORDER BY currency
      ) t
    ), '[]'::jsonb),

    -- Token packs: settled only. Pending rows are counted separately below.
    'token_packs', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT count(*)                                    AS purchases,
               sum(amount_kobo)                            AS amount_minor,
               sum(tokens_credited)                        AS tokens,
               count(DISTINCT user_id)                     AS buyers
          FROM public.token_purchases
         WHERE created_at >= v_since AND status = 'completed'
      ) t
    ), '[]'::jsonb),
    'token_packs_pending', (
      SELECT count(*) FROM public.token_purchases
       WHERE created_at >= v_since AND status = 'pending'
    ),

    -- API wallet top-ups settle in dollars.
    'api_wallet', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT count(*)             AS topups,
               sum(amount_usd)      AS amount_usd,
               count(DISTINCT user_id) AS buyers
          FROM public.frelux_api_wallet_topups
         WHERE created_at >= v_since AND status = 'credited'
      ) t
    ), '[]'::jsonb),
    'api_wallet_refused', (
      SELECT count(*) FROM public.frelux_api_wallet_topups
       WHERE created_at >= v_since AND status = 'refused'
    ),

    -- Escrow: money held, money paid out, money returned, platform fees.
    'escrow', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT currency,
               count(*)                                 AS contracts,
               sum(total_minor)                         AS contracted_minor,
               sum(held_minor)                          AS held_minor,
               sum(released_minor)                      AS released_minor,
               sum(refunded_minor)                      AS refunded_minor,
               sum(fee_minor)                           AS fee_minor
          FROM public.escrow_contracts
         WHERE created_date >= v_since
         GROUP BY currency
         ORDER BY currency
      ) t
    ), '[]'::jsonb),
    'escrow_open_contracts', (
      SELECT count(*) FROM public.escrow_contracts
       WHERE status IN ('funds_held', 'partially_released', 'disputed')
    ),

    -- Marketplace: value of orders placed, and how much is still owed to pros.
    'marketplace', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT currency,
               count(*)                                          AS orders,
               sum(agreed_price)                                 AS agreed_value,
               count(*) FILTER (WHERE status = 'completed')      AS completed,
               count(*) FILTER (WHERE status = 'disputed')       AS disputed
          FROM public.marketplace_orders
         WHERE created_at >= v_since
         GROUP BY currency
         ORDER BY currency
      ) t
    ), '[]'::jsonb),
    'marketplace_open_disputes', (
      SELECT count(*) FROM public.marketplace_order_disputes WHERE status = 'open'
    ),

    -- AI credits: the internal economy, reported in credits not currency.
    'ai_credits', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT type,
               count(*)      AS entries,
               sum(abs(amount)) AS credits
          FROM public.credit_transactions
         WHERE created_at >= v_since AND type IN ('earn', 'spend')
         GROUP BY type
      ) t
    ), '[]'::jsonb),

    -- Daily money-in, per stream, for the last window (kobo and cents kept apart).
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT day,
               sum(subscription_minor) AS subscription_minor,
               sum(token_minor)        AS token_minor,
               sum(wallet_usd)         AS wallet_usd
          FROM (
            SELECT date_trunc('day', created_at)::date AS day,
                   amount_kobo AS subscription_minor, 0 AS token_minor, 0 AS wallet_usd
              FROM public.subscription_purchases
             WHERE created_at >= v_since
            UNION ALL
            SELECT date_trunc('day', created_at)::date,
                   0, amount_kobo, 0
              FROM public.token_purchases
             WHERE created_at >= v_since AND status = 'completed'
            UNION ALL
            SELECT date_trunc('day', created_at)::date,
                   0, 0, amount_usd
              FROM public.frelux_api_wallet_topups
             WHERE created_at >= v_since AND status = 'credited'
          ) u
         GROUP BY day
         ORDER BY day
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_money_summary(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_money_summary(integer) TO authenticated, service_role;
