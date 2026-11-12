-- =========================================================
-- Subscription price reconciliation
--
-- USD is the catalog. `subscription_local_prices` holds the amount each
-- market is actually charged, and checkout charges exactly the row the
-- pricing page displayed - so display and charge cannot disagree.
--
-- What was missing was the ability to see whether those rows still make
-- sense. Eleven served markets had no row at all (they fell back to the
-- dollar anchor), some rows were priced well above the current rate, and
-- nothing recorded who changed a price or why.
--
-- This migration adds the read-only reconciliation view and the two
-- deliberate writes behind it. It does not change a single price: the
-- admin sees the proposal, then applies it. Every applied change is
-- audited with the old amount, the new amount, the rate used, its source
-- and the reason.
--
-- Rollback: 20261112260000_subscription_price_reconciliation_rollback.sql
-- =========================================================

-- ── Currency policy: minor-unit exponent and the step prices round to ──
CREATE TABLE IF NOT EXISTS public.subscription_currency_policy (
  currency   text PRIMARY KEY,
  expo       integer NOT NULL CHECK (expo BETWEEN 0 AND 3),
  round_step bigint NOT NULL CHECK (round_step >= 1),
  note       text
);

COMMENT ON TABLE public.subscription_currency_policy IS
  'Minor-unit exponent and rounding step per charging currency. Steps keep prices on human amounts (whole naira, whole krona).';

INSERT INTO public.subscription_currency_policy (currency, expo, round_step) VALUES
  ('NGN', 2, 100), ('USD', 2, 1), ('GBP', 2, 1), ('EUR', 2, 1),
  ('CAD', 2, 1), ('AUD', 2, 1), ('INR', 2, 10), ('GHS', 2, 1),
  ('KES', 2, 50), ('ZAR', 2, 1), ('JPY', 0, 100), ('BRL', 2, 1),
  ('SAR', 2, 1), ('AED', 2, 1), ('CNY', 2, 1), ('IDR', 0, 5000),
  ('MXN', 2, 1), ('KRW', 0, 1000), ('ETB', 2, 10), ('EGP', 2, 10),
  ('TZS', 2, 1000), ('XOF', 0, 500), ('PLN', 2, 1), ('SEK', 2, 1),
  ('CHF', 2, 1), ('SGD', 2, 1), ('TRY', 2, 10), ('NZD', 2, 1),
  ('DKK', 2, 100), ('NOK', 2, 100), ('MYR', 2, 100), ('PHP', 2, 100),
  ('PKR', 2, 100), ('THB', 2, 100)
ON CONFLICT (currency) DO NOTHING;

ALTER TABLE public.subscription_currency_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_currency_policy_public_read"
  ON public.subscription_currency_policy;
CREATE POLICY "subscription_currency_policy_public_read"
  ON public.subscription_currency_policy FOR SELECT
  TO anon, authenticated
  USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.subscription_currency_policy
  FROM anon, authenticated;

-- ── Audit: every applied price change, with the reason ──
CREATE TABLE IF NOT EXISTS public.subscription_price_audit (
  id            bigserial PRIMARY KEY,
  market_code   text NOT NULL,
  plan          text NOT NULL,
  billing_cycle text NOT NULL,
  currency      text NOT NULL,
  old_minor     bigint,
  new_minor     bigint NOT NULL,
  fx_rate       numeric(18, 6),
  rate_source   text,
  reason        text NOT NULL,
  actor         uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_price_audit_created_idx
  ON public.subscription_price_audit (created_at DESC);

COMMENT ON TABLE public.subscription_price_audit IS
  'Append-only record of subscription price changes made from the admin reconciliation screen.';

ALTER TABLE public.subscription_price_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_price_audit_admin_read"
  ON public.subscription_price_audit;
CREATE POLICY "subscription_price_audit_admin_read"
  ON public.subscription_price_audit FOR SELECT
  TO authenticated
  USING (public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.subscription_price_audit
  FROM anon, authenticated;

-- ── Latest USD rate per currency, as recorded ──
CREATE OR REPLACE FUNCTION public.subscription_rate_for(p_currency text)
RETURNS TABLE (rate numeric, rate_source text, fetched_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.rate, 'fx_rates'::text, f.fetched_at
    FROM public.fx_rates f
   WHERE f.base_currency = 'USD'
     AND f.quote_currency = p_currency
   ORDER BY f.fetched_at DESC
   LIMIT 1
$$;

-- ── Compute what a market should be charged, without writing ──
CREATE OR REPLACE FUNCTION public.admin_preview_subscription_prices(
  p_markets text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  WITH markets AS (
    SELECT mp.country_code AS market_code,
           upper(mp.currency_code) AS currency
      FROM public.market_profiles mp
     WHERE p_markets IS NULL OR mp.country_code = ANY (p_markets)
  ),
  usd AS (
    SELECT plan, billing_cycle, price_minor
      FROM public.subscription_plan_prices
     WHERE currency = 'USD' AND active = true
  ),
  resolved AS (
    SELECT m.market_code, m.currency, r.rate, r.rate_source, r.fetched_at,
           COALESCE(cp.expo, 2) AS expo,
           COALESCE(cp.round_step, 1) AS step
      FROM markets m
      LEFT JOIN LATERAL public.subscription_rate_for(m.currency) r ON true
      LEFT JOIN public.subscription_currency_policy cp ON cp.currency = m.currency
  )
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.market_code, t.plan, t.billing_cycle), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT res.market_code,
             u.plan,
             u.billing_cycle,
             res.currency,
             res.rate,
             res.rate_source,
             res.fetched_at,
             CASE
               WHEN res.rate IS NULL THEN NULL
               ELSE (
                 round(
                   (u.price_minor::numeric / 100) * res.rate
                   * power(10::numeric, res.expo) / res.step
                 ) * res.step
               )::bigint
             END AS proposed_minor
        FROM resolved res
        CROSS JOIN usd u
    ) t;

  RETURN v_rows;
END;
$$;

-- ── Write the proposal for the chosen markets ──
CREATE OR REPLACE FUNCTION public.admin_apply_subscription_prices(
  p_markets text[],
  p_reason  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason  text := btrim(COALESCE(p_reason, ''));
  v_applied integer := 0;
  v_same    integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  r record;
  v_old bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  IF v_reason = '' THEN
    RAISE EXCEPTION 'A reason is required to change prices';
  END IF;
  IF p_markets IS NULL OR array_length(p_markets, 1) IS NULL THEN
    RAISE EXCEPTION 'Choose at least one market';
  END IF;

  FOR r IN
    SELECT * FROM jsonb_to_recordset(public.admin_preview_subscription_prices(p_markets))
      AS x(market_code text, plan text, billing_cycle text, currency text,
           rate numeric, rate_source text, proposed_minor bigint)
  LOOP
    IF r.proposed_minor IS NULL OR r.proposed_minor <= 0 THEN
      v_skipped := v_skipped || to_jsonb(r.market_code);
      CONTINUE;
    END IF;

    SELECT l.price_minor INTO v_old
      FROM public.subscription_local_prices l
     WHERE l.market_code = r.market_code
       AND l.plan = r.plan
       AND l.billing_cycle = r.billing_cycle;

    IF v_old IS NOT DISTINCT FROM r.proposed_minor THEN
      v_same := v_same + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.subscription_local_prices AS l
      (market_code, plan, billing_cycle, currency, price_minor, fx_rate, fx_source, active, updated_at)
    VALUES
      (r.market_code, r.plan, r.billing_cycle, r.currency, r.proposed_minor,
       r.rate, r.rate_source, true, now())
    ON CONFLICT (market_code, plan, billing_cycle) DO UPDATE
      SET currency   = EXCLUDED.currency,
          price_minor = EXCLUDED.price_minor,
          fx_rate    = EXCLUDED.fx_rate,
          fx_source  = EXCLUDED.fx_source,
          active     = true,
          updated_at = now();

    INSERT INTO public.subscription_price_audit
      (market_code, plan, billing_cycle, currency, old_minor, new_minor,
       fx_rate, rate_source, reason, actor)
    VALUES
      (r.market_code, r.plan, r.billing_cycle, r.currency, v_old,
       r.proposed_minor, r.rate, r.rate_source, v_reason, auth.uid());

    v_applied := v_applied + 1;
  END LOOP;

  RETURN jsonb_build_object('applied', v_applied, 'unchanged', v_same, 'skipped', v_skipped);
END;
$$;

-- ── Manual price for one market/plan/cycle ──
CREATE OR REPLACE FUNCTION public.admin_set_subscription_price(
  p_market        text,
  p_plan          text,
  p_billing_cycle text,
  p_price_minor   bigint,
  p_reason        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_currency text;
  v_old bigint;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  IF p_price_minor IS NULL OR p_price_minor <= 0 THEN
    RAISE EXCEPTION 'Price must be greater than zero';
  END IF;
  IF v_reason = '' THEN
    RAISE EXCEPTION 'A reason is required to change a price';
  END IF;
  IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'billing cycle must be monthly or yearly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subscription_plan_prices
                  WHERE plan = p_plan AND billing_cycle = p_billing_cycle AND currency = 'USD') THEN
    RAISE EXCEPTION 'Unknown plan % / %', p_plan, p_billing_cycle;
  END IF;

  SELECT upper(currency_code) INTO v_currency
    FROM public.market_profiles WHERE country_code = p_market;
  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'Unknown market %', p_market;
  END IF;

  SELECT price_minor INTO v_old
    FROM public.subscription_local_prices
   WHERE market_code = p_market AND plan = p_plan AND billing_cycle = p_billing_cycle;

  INSERT INTO public.subscription_local_prices AS l
    (market_code, plan, billing_cycle, currency, price_minor, fx_rate, fx_source, active, updated_at)
  VALUES
    (p_market, p_plan, p_billing_cycle, v_currency, p_price_minor, NULL, 'manual', true, now())
  ON CONFLICT (market_code, plan, billing_cycle) DO UPDATE
    SET price_minor = EXCLUDED.price_minor,
        currency = EXCLUDED.currency,
        fx_source = 'manual',
        updated_at = now();

  INSERT INTO public.subscription_price_audit
    (market_code, plan, billing_cycle, currency, old_minor, new_minor, fx_rate, rate_source, reason, actor)
  VALUES
    (p_market, p_plan, p_billing_cycle, v_currency, v_old, p_price_minor, NULL, 'manual', v_reason, auth.uid());

  RETURN jsonb_build_object('market_code', p_market, 'currency', v_currency,
                            'old_minor', v_old, 'new_minor', p_price_minor);
END;
$$;

-- ── The reconciliation report ──
CREATE OR REPLACE FUNCTION public.admin_subscription_price_report(
  p_deviation_pct numeric DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  WITH markets AS (
    SELECT mp.country_code AS market_code,
           mp.country_name,
           upper(mp.currency_code) AS currency
      FROM public.market_profiles mp
  ),
  usd AS (
    SELECT plan, billing_cycle, price_minor
      FROM public.subscription_plan_prices
     WHERE currency = 'USD' AND active = true
  ),
  combos AS (
    SELECT m.market_code, m.country_name, m.currency, u.plan, u.billing_cycle, u.price_minor AS usd_minor
      FROM markets m CROSS JOIN usd u
  ),
  joined AS (
    SELECT c.*,
           l.price_minor AS local_minor,
           l.currency AS local_currency,
           l.fx_rate AS stored_rate,
           l.fx_source,
           l.updated_at,
           r.rate AS live_rate,
           r.rate_source AS live_rate_source,
           r.fetched_at,
           COALESCE(cp.expo, 2) AS expo,
           COALESCE(cp.round_step, 1) AS step
      FROM combos c
      LEFT JOIN public.subscription_local_prices l
        ON l.market_code = c.market_code AND l.plan = c.plan AND l.billing_cycle = c.billing_cycle
      LEFT JOIN LATERAL public.subscription_rate_for(c.currency) r ON true
      LEFT JOIN public.subscription_currency_policy cp ON cp.currency = c.currency
  )
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.market_code, t.plan, t.billing_cycle), '[]'::jsonb)
    INTO v
    FROM (
      SELECT j.market_code,
             j.country_name,
             j.plan,
             j.billing_cycle,
             j.currency,
             j.local_minor,
             j.local_currency,
             j.stored_rate,
             j.fx_source,
             j.updated_at,
             j.live_rate,
             j.live_rate_source,
             j.fetched_at,
             CASE
               WHEN j.live_rate IS NULL THEN NULL
               ELSE (
                 round((j.usd_minor::numeric / 100) * j.live_rate
                       * power(10::numeric, j.expo) / j.step) * j.step
               )::bigint
             END AS implied_minor,
             CASE
               WHEN j.local_minor IS NULL OR j.live_rate IS NULL THEN NULL
               WHEN (round((j.usd_minor::numeric / 100) * j.live_rate
                           * power(10::numeric, j.expo) / j.step) * j.step) = 0 THEN NULL
               ELSE round(
                 (j.local_minor - round((j.usd_minor::numeric / 100) * j.live_rate
                                        * power(10::numeric, j.expo) / j.step) * j.step)
                 * 100.0
                 / (round((j.usd_minor::numeric / 100) * j.live_rate
                          * power(10::numeric, j.expo) / j.step) * j.step), 1)
             END AS deviation_pct,
             CASE
               WHEN j.local_minor IS NULL THEN 'missing'
               WHEN j.local_currency IS DISTINCT FROM j.currency THEN 'currency_mismatch'
               WHEN j.updated_at < now() - interval '30 days' THEN 'stale'
               WHEN j.live_rate IS NOT NULL
                AND abs(
                  (j.local_minor - round((j.usd_minor::numeric / 100) * j.live_rate
                                         * power(10::numeric, j.expo) / j.step) * j.step)
                  * 100.0
                  / NULLIF((round((j.usd_minor::numeric / 100) * j.live_rate
                                  * power(10::numeric, j.expo) / j.step) * j.step), 0)
                ) > p_deviation_pct THEN 'off_rate'
               WHEN j.live_rate IS NULL THEN 'no_rate'
               ELSE 'ok'
             END AS status
        FROM joined j
    ) t;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_preview_subscription_prices(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_apply_subscription_prices(text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_subscription_price(text, text, text, bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_subscription_price_report(numeric) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_preview_subscription_prices(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_apply_subscription_prices(text[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription_price(text, text, text, bigint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_subscription_price_report(numeric) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_subscription_price_report(numeric) IS
  'Per market/plan/cycle view of what is charged against what the live rate implies, flagging missing, stale, mismatched and off-rate rows.';
