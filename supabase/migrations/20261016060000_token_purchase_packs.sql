-- =========================================================
-- Token Purchase: single Value Pack reprice — 100 credits, ₦5,000
-- Date: 2026-10-16 (owner decision: "5000 single plan, not double,
-- replace the old 1500")
--
-- The token shop keeps ONE plan, repriced: 100 credits for ₦5,000
-- (₦50/credit), $9.50 international — replacing 50 credits/₦1,500.
--
-- Structure:
-- 1. token_purchase_packs — canonical pack definition (single row,
--    pack 1). The checkout/verify/webhook edge functions read this
--    first and fall back to token_purchase_config, so both stay in
--    sync: the legacy config row is UPDATED to the same values.
-- 2. token_purchase_prices — created here if the international
--    migration has not run yet, with pack_id from the start. The
--    single pack's USD price is $9.50. Any pre-existing rows from
--    the old 50-credit plan are repriced/deactivated.
--
-- Everything remains admin-configurable from Admin → Credits & Ads
-- (the admin editor writes both the pack row and the config mirror).
--
-- Re-runnable: guards on every object.
-- =========================================================

-- 1. Pack definition (single plan) ------------------------------------
CREATE TABLE IF NOT EXISTS public.token_purchase_packs (
  id           INTEGER PRIMARY KEY,
  key          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  token_amount INTEGER NOT NULL CHECK (token_amount > 0),
  price_kobo   INTEGER NOT NULL CHECK (price_kobo >= 10000),
  is_enabled   BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 1,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.token_purchase_packs (id, key, name, token_amount, price_kobo, is_enabled, sort_order)
VALUES (1, 'value', 'Value Pack', 100, 500000, true, 1)
ON CONFLICT (id) DO UPDATE
  SET key = EXCLUDED.key,
      name = EXCLUDED.name,
      token_amount = EXCLUDED.token_amount,
      price_kobo = EXCLUDED.price_kobo,
      updated_at = now();

-- 2. Per-currency prices (self-contained in case the international
--    migration has not run on this database) --------------------------
CREATE TABLE IF NOT EXISTS public.token_purchase_prices (
  pack_id       INTEGER NOT NULL DEFAULT 1 REFERENCES public.token_purchase_packs(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL,
  price_minor   INTEGER NOT NULL CHECK (price_minor > 0),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing installs (table created by 20261008170000 without pack_id)
ALTER TABLE public.token_purchase_prices
  ADD COLUMN IF NOT EXISTS pack_id INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'token_purchase_prices_pack_id_fkey'
  ) THEN
    ALTER TABLE public.token_purchase_prices
      ADD CONSTRAINT token_purchase_prices_pack_id_fkey
      FOREIGN KEY (pack_id) REFERENCES public.token_purchase_packs(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP CONSTRAINT IF EXISTS token_purchase_prices_pkey;
ALTER TABLE public.token_purchase_prices
  ADD CONSTRAINT token_purchase_prices_pkey PRIMARY KEY (pack_id, currency_code);

-- 3. Reprice: the single pack's international price is $9.50. Any
--    old rows were priced against the retired 50-credit plan, so all
--    other currencies are deactivated (admin can re-add them).
UPDATE public.token_purchase_prices
  SET is_active = false, updated_at = now()
  WHERE NOT (pack_id = 1 AND currency_code = 'USD');

INSERT INTO public.token_purchase_prices (pack_id, currency_code, price_minor, is_active)
VALUES (1, 'USD', 950, true)
ON CONFLICT (pack_id, currency_code) DO UPDATE
  SET price_minor = EXCLUDED.price_minor,
      is_active = true,
      updated_at = now();

-- 4. Legacy mirror: keep token_purchase_config in sync so the
--    edge-function fallback path charges identical values.
UPDATE public.token_purchase_config
  SET token_amount = 100,
      price_kobo = 500000,
      updated_at = now()
  WHERE id = 1;

-- =========================================================
-- ROW LEVEL SECURITY: packs are public read (the Buy card shows the
-- exact price), admin-only writes — mirroring the price tables.
-- =========================================================
ALTER TABLE public.token_purchase_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_purchase_packs_read_all" ON public.token_purchase_packs;
CREATE POLICY "token_purchase_packs_read_all" ON public.token_purchase_packs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "token_purchase_packs_admin_write" ON public.token_purchase_packs;
CREATE POLICY "token_purchase_packs_admin_write" ON public.token_purchase_packs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.token_purchase_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_purchase_prices_read_all" ON public.token_purchase_prices;
CREATE POLICY "token_purchase_prices_read_all" ON public.token_purchase_prices
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "token_purchase_prices_admin_write" ON public.token_purchase_prices;
CREATE POLICY "token_purchase_prices_admin_write" ON public.token_purchase_prices
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================
-- PRIVILEGES (same grant pattern the earlier token migrations use
-- for Management API runs)
-- =========================================================
GRANT SELECT ON public.token_purchase_packs TO anon, authenticated, service_role;
GRANT SELECT ON public.token_purchase_prices TO anon, authenticated, service_role;
