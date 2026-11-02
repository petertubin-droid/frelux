-- =========================================================
-- USD subscription pricing
--
-- Subscription prices are advertised, priced and charged in US dollars:
--   Free         $0        / $0
--   Pro          $4.99     / $49.99
--   Premium      $9.99     / $99.99   (Most Popular)
--   Enterprise   $49.99    / $499.99
--
-- USD is canonical. A gateway that settles in naira charges the naira
-- equivalent quoted at checkout and recorded in subscription_checkout_quotes,
-- so verification compares the charge against the quote instead of
-- re-converting a dollar price at a possibly different rate.
-- =========================================================

-- ── 1. Currency and minor-unit price on the plan table ────────────────
ALTER TABLE public.subscription_plan_prices
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS price_minor bigint;

-- Existing rows are naira; their kobo amount is already minor units.
UPDATE public.subscription_plan_prices
   SET price_minor = price_kobo
 WHERE price_minor IS NULL;

ALTER TABLE public.subscription_plan_prices
  ALTER COLUMN price_minor SET NOT NULL;

ALTER TABLE public.subscription_plan_prices
  DROP CONSTRAINT IF EXISTS subscription_plan_prices_price_minor_check;
ALTER TABLE public.subscription_plan_prices
  ADD CONSTRAINT subscription_plan_prices_price_minor_check
  CHECK (price_minor > 0);

ALTER TABLE public.subscription_plan_prices
  DROP CONSTRAINT IF EXISTS subscription_plan_prices_currency_check;
ALTER TABLE public.subscription_plan_prices
  ADD CONSTRAINT subscription_plan_prices_currency_check
  CHECK (currency IN ('USD', 'NGN'));

-- One price per plan, cycle and currency. The old unique key was
-- (plan, billing_cycle) alone, which could not hold both currencies.
ALTER TABLE public.subscription_plan_prices
  DROP CONSTRAINT IF EXISTS subscription_plan_prices_plan_billing_cycle_key;
ALTER TABLE public.subscription_plan_prices
  DROP CONSTRAINT IF EXISTS subscription_plan_prices_plan_cycle_currency_key;
ALTER TABLE public.subscription_plan_prices
  ADD CONSTRAINT subscription_plan_prices_plan_cycle_currency_key
  UNIQUE (plan, billing_cycle, currency);

-- ── 2. Canonical USD prices ───────────────────────────────────────────
INSERT INTO public.subscription_plan_prices
  (plan, billing_cycle, currency, price_minor, price_kobo, active)
VALUES
  ('pro',        'monthly', 'USD',    499,   499,   true),
  ('pro',        'yearly',  'USD',   4999,  4999,   true),
  ('premium',    'monthly', 'USD',    999,   999,   true),
  ('premium',    'yearly',  'USD',   9999,  9999,   true),
  ('enterprise', 'monthly', 'USD',   4999,  4999,   true),
  ('enterprise', 'yearly',  'USD',  49999, 49999,   true)
ON CONFLICT (plan, billing_cycle, currency) DO UPDATE
  SET price_minor = EXCLUDED.price_minor,
      price_kobo  = EXCLUDED.price_kobo,
      active      = EXCLUDED.active,
      updated_at  = now();

-- Naira legacy rows stay active so a checkout already in flight can still
-- verify. New naira charges are quoted from the USD price plus the rate.
UPDATE public.subscription_plan_prices
   SET currency = 'NGN'
 WHERE currency IS DISTINCT FROM 'USD'
   AND currency = 'NGN';

-- ── 3. Local settlement quotes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_checkout_quotes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        text NOT NULL UNIQUE,
  user_id          uuid NOT NULL,
  plan             text NOT NULL,
  billing_cycle    text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  base_currency    text NOT NULL DEFAULT 'USD',
  base_minor       bigint NOT NULL CHECK (base_minor > 0),
  charge_currency  text NOT NULL,
  charge_minor     bigint NOT NULL CHECK (charge_minor > 0),
  fx_rate          numeric(18, 8),
  fx_source        text,
  fx_fetched_at    timestamptz,
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  consumed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_checkout_quotes_user_idx
  ON public.subscription_checkout_quotes (user_id, created_at DESC);

-- Server-side only: prices and quotes are never exposed to clients.
ALTER TABLE public.subscription_checkout_quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_checkout_quotes FROM anon, authenticated;

COMMENT ON TABLE public.subscription_checkout_quotes IS
  'Dollar price quoted as a local-currency charge at checkout. Verification compares the paid amount to this row, not to a fresh conversion.';
