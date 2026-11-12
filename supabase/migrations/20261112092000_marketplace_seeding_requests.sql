-- =========================================================
-- Marketplace seeding: concierge requests and artisan
-- nominations were being written to the visitor's own
-- localStorage, so every submission died with the browser and
-- no member of staff could ever see one. These are the tables.
--
-- Access model: anyone may submit (the form is public), nobody
-- but staff may read the queue. Rows are never client-mutable.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.marketplace_concierge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_ref text,
  client_name text NOT NULL,
  client_email text NOT NULL,
  territory_name text NOT NULL,
  country_code text,
  trade_needed text,
  project_budget_estimate text,
  escrow_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'guild_dispatched', 'matched', 'closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_artisan_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_ref text,
  client_email text NOT NULL,
  artisan_name text NOT NULL,
  artisan_phone text NOT NULL,
  artisan_trade text,
  location_city text,
  escrow_contract_ref text,
  verification_status text NOT NULL DEFAULT 'pending_kyc'
    CHECK (verification_status IN ('pending_kyc', 'guild_vetting', 'cleared_for_escrow', 'rejected')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concierge_requests_created
  ON public.marketplace_concierge_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artisan_nominations_created
  ON public.marketplace_artisan_nominations (created_at DESC);

ALTER TABLE public.marketplace_concierge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_artisan_nominations ENABLE ROW LEVEL SECURITY;

-- Submit: public form, no read-back.
DROP POLICY IF EXISTS concierge_requests_insert ON public.marketplace_concierge_requests;
CREATE POLICY concierge_requests_insert ON public.marketplace_concierge_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS artisan_nominations_insert ON public.marketplace_artisan_nominations;
CREATE POLICY artisan_nominations_insert ON public.marketplace_artisan_nominations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Read: staff only, plus the submitter's own rows.
DROP POLICY IF EXISTS concierge_requests_read ON public.marketplace_concierge_requests;
CREATE POLICY concierge_requests_read ON public.marketplace_concierge_requests
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS artisan_nominations_read ON public.marketplace_artisan_nominations;
CREATE POLICY artisan_nominations_read ON public.marketplace_artisan_nominations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Staff triage writes status; nobody edits the submission itself.
DROP POLICY IF EXISTS concierge_requests_admin_update ON public.marketplace_concierge_requests;
CREATE POLICY concierge_requests_admin_update ON public.marketplace_concierge_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS artisan_nominations_admin_update ON public.marketplace_artisan_nominations;
CREATE POLICY artisan_nominations_admin_update ON public.marketplace_artisan_nominations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (true);

GRANT INSERT ON public.marketplace_concierge_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.marketplace_concierge_requests TO authenticated;
GRANT INSERT ON public.marketplace_artisan_nominations TO anon, authenticated;
GRANT SELECT, UPDATE ON public.marketplace_artisan_nominations TO authenticated;
GRANT ALL ON public.marketplace_concierge_requests TO service_role;
GRANT ALL ON public.marketplace_artisan_nominations TO service_role;
