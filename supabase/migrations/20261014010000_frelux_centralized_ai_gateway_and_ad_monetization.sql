-- =========================================================
-- FRELUX Centralized AI Access, Rewarded Ad Monetization & Gemini Cost Protection
-- Migration: 20261014010000_frelux_centralized_ai_gateway_and_ad_monetization.sql
-- =========================================================

-- 1. Unified Global AI Access & Cost Control Table
CREATE TABLE IF NOT EXISTS public.ai_gateway_daily_allowance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_hash       TEXT NOT NULL,
  usage_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  has_ad_credit     BOOLEAN NOT NULL DEFAULT FALSE,
  ad_credit_granted_at TIMESTAMPTZ,
  ad_provider       TEXT,
  ad_event_id       TEXT,
  operations_used   INTEGER NOT NULL DEFAULT 0,
  operations_reserved INTEGER NOT NULL DEFAULT 0,
  last_used_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_gateway_daily_user_date
  ON public.ai_gateway_daily_allowance (user_id, usage_date)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_gateway_daily_client_date
  ON public.ai_gateway_daily_allowance (client_hash, usage_date)
  WHERE user_id IS NULL;

-- 2. Gemini Operations Log & Cost Protection Ledger
CREATE TABLE IF NOT EXISTS public.ai_gateway_operations_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_hash       TEXT NOT NULL,
  feature_key       TEXT NOT NULL,
  model_name        TEXT NOT NULL,
  access_tier       TEXT NOT NULL CHECK (access_tier IN ('admin', 'subscriber', 'rewarded_credit', 'system')),
  status            TEXT NOT NULL CHECK (status IN ('reserved', 'success', 'failed', 'released', 'blocked')),
  prompt_chars      INTEGER DEFAULT 0,
  output_chars      INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
  error_message     TEXT,
  duration_ms       INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_gateway_ops_date
  ON public.ai_gateway_operations_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_ops_user
  ON public.ai_gateway_operations_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_ops_feature
  ON public.ai_gateway_operations_log (feature_key, created_at DESC);

-- 3. Global AI Monetization Settings & Daily Spend Limits
CREATE TABLE IF NOT EXISTS public.ai_gateway_settings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_gateway_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  daily_cost_budget_usd  NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  max_prompt_chars       INTEGER NOT NULL DEFAULT 60000,
  max_output_tokens      INTEGER NOT NULL DEFAULT 8192,
  allow_anonymous        BOOLEAN NOT NULL DEFAULT TRUE,
  admin_exempt           BOOLEAN NOT NULL DEFAULT TRUE,
  timezone_offset_hours  INTEGER NOT NULL DEFAULT 1, -- UTC+1 (West Africa/Lagos)
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings row if missing
INSERT INTO public.ai_gateway_settings (
  is_gateway_enabled, daily_cost_budget_usd, max_prompt_chars, max_output_tokens, allow_anonymous, admin_exempt, timezone_offset_hours
)
SELECT true, 50.00, 60000, 8192, true, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.ai_gateway_settings);

-- Enable RLS
ALTER TABLE public.ai_gateway_daily_allowance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_gateway_operations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_gateway_settings ENABLE ROW LEVEL SECURITY;

-- Allowance Policies
DROP POLICY IF EXISTS "allowance_read_own" ON public.ai_gateway_daily_allowance;
CREATE POLICY "allowance_read_own" ON public.ai_gateway_daily_allowance
  FOR SELECT TO anon, authenticated USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND client_hash = current_setting('request.headers', true)::json->>'x-client-hash')
  );

-- Settings Policies (Read all, admin write)
DROP POLICY IF EXISTS "ai_settings_read_all" ON public.ai_gateway_settings;
CREATE POLICY "ai_settings_read_all" ON public.ai_gateway_settings
  FOR SELECT TO anon, authenticated USING (true);

-- Operations Log (Admin read only)
DROP POLICY IF EXISTS "ops_log_admin_read" ON public.ai_gateway_operations_log;
CREATE POLICY "ops_log_admin_read" ON public.ai_gateway_operations_log
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role has full permissions by default
