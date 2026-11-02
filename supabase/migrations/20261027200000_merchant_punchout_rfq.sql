-- =========================================================
-- Market Intelligence Pillar 6: merchant punchout configs +
-- RFQ / quote / purchase-order persistence.
-- Migration 20261027200000
--
-- merchant_punchout_configs holds the trading-partner credentials
-- for cXML/OCI punchout. Credentials are ADMIN-ONLY: no public read
-- policy exists, unlike the public carbon-factor pattern. The secret
-- values themselves live server-side where possible; these rows are
-- the protocol + endpoint registry.
--
-- rfq_records / rfq_quotes / purchase_orders persist the one-click
-- RFQ flow: estimate → RFQ → 3 competing supplier packages → quotes
-- → award → PO. Statuses align with the existing procurement state
-- machine (quote_requested, quoted, approved, purchase_ordered).
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. Merchant punchout configs (admin-only)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merchant_punchout_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name text NOT NULL UNIQUE,
  -- Protocol the merchant's trade portal speaks.
  protocol text NOT NULL CHECK (protocol IN ('cxml', 'oci')),
  -- cXML
  punchout_url text,
  network_id text,
  from_domain text,
  from_identity text,
  to_domain text,
  to_identity text,
  sender_domain text,
  sender_identity text,
  shared_secret text,
  -- OCI
  oci_base_url text,
  oci_username text,
  oci_password text,
  -- Catalogue currency the merchant prices in.
  currency text NOT NULL DEFAULT 'NGN',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT punchout_protocol_fields CHECK (
    (protocol = 'cxml' AND punchout_url IS NOT NULL AND shared_secret IS NOT NULL)
    OR
    (protocol = 'oci' AND oci_base_url IS NOT NULL AND oci_username IS NOT NULL AND oci_password IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_merchant_punchout_active
  ON public.merchant_punchout_configs (protocol) WHERE is_active;

ALTER TABLE public.merchant_punchout_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_punchout_configs FORCE ROW LEVEL SECURITY;

-- Admin-only: credentials never leak to any non-admin role.
DROP POLICY IF EXISTS "merchant_punchout_admin_all" ON public.merchant_punchout_configs;
CREATE POLICY "merchant_punchout_admin_all" ON public.merchant_punchout_configs
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────
-- 2. RFQ records (owner-scoped)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rfq_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number text NOT NULL,
  project_ref text,
  title text NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_address text NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  response_deadline date,
  status text NOT NULL DEFAULT 'quote_requested'
    CHECK (status IN ('quote_requested', 'quoted', 'awarded', 'cancelled')),
  supplier_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_number, created_by)
);

CREATE INDEX IF NOT EXISTS idx_rfq_records_status ON public.rfq_records (status);
CREATE INDEX IF NOT EXISTS idx_rfq_records_owner ON public.rfq_records (created_by);

ALTER TABLE public.rfq_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfq_owner_all" ON public.rfq_records;
CREATE POLICY "rfq_owner_all" ON public.rfq_records
  FOR ALL TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- ─────────────────────────────────────────────
-- 3. Supplier quotes per RFQ
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rfq_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfq_records(id) ON DELETE CASCADE,
  supplier text NOT NULL,
  package_number text,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(14,2),
  coverage numeric(5,4),
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, supplier)
);

CREATE INDEX IF NOT EXISTS idx_rfq_quotes_rfq ON public.rfq_quotes (rfq_id);

ALTER TABLE public.rfq_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quotes FORCE ROW LEVEL SECURITY;

-- Quotes follow their RFQ's owner.
DROP POLICY IF EXISTS "rfq_quotes_owner_all" ON public.rfq_quotes;
CREATE POLICY "rfq_quotes_owner_all" ON public.rfq_quotes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rfq_records r
    WHERE r.id = rfq_id AND r.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rfq_records r
    WHERE r.id = rfq_id AND r.created_by = auth.uid()
  ));

-- ─────────────────────────────────────────────
-- 4. Purchase orders from awarded quotes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  rfq_id uuid NOT NULL REFERENCES public.rfq_records(id) ON DELETE CASCADE,
  supplier text NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  delivery_address text NOT NULL,
  status text NOT NULL DEFAULT 'purchase_ordered'
    CHECK (status IN ('purchase_ordered', 'dispatched', 'in_transit',
      'delivered', 'partial_delivery', 'exception', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (po_number, created_by)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders (status);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_orders_owner_all" ON public.purchase_orders;
CREATE POLICY "purchase_orders_owner_all" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- updated_at triggers where the convention applies.
DROP TRIGGER IF EXISTS "merchant_punchout_set_updated_at" ON public.merchant_punchout_configs;
CREATE TRIGGER "merchant_punchout_set_updated_at"
  BEFORE UPDATE ON public.merchant_punchout_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS "rfq_records_set_updated_at" ON public.rfq_records;
CREATE TRIGGER "rfq_records_set_updated_at"
  BEFORE UPDATE ON public.rfq_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS "purchase_orders_set_updated_at" ON public.purchase_orders;
CREATE TRIGGER "purchase_orders_set_updated_at"
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.merchant_punchout_configs IS
  'Admin-configured trading-partner punchout credentials for cXML/OCI supplier portals. Admin-only RLS: credentials never leak to non-admin roles. The engines refuse (never guess) when a merchant config is missing.';
COMMENT ON TABLE public.rfq_records IS
  'One-click RFQs generated from approved estimates and distributed to competing local suppliers. Status aligns with the procurement state machine.';
COMMENT ON TABLE public.rfq_quotes IS
  'Supplier quotes returned against an RFQ, validated line-by-line against the RFQ basket. Partial coverage is stored with its honest coverage score.';
COMMENT ON TABLE public.purchase_orders IS
  'Purchase orders issued from fully-covering winning quotes (the award step of the RFQ engine).';
