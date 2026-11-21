-- ==========================================================================
-- Migration: 20261121090000_subscription_tier_configs_and_settings.sql
-- Provide dynamic admin controls for subscription tiers, features, and base prices,
-- and add bing_site_verification to site_settings.
-- ==========================================================================

-- 1. Create subscription_tier_configs table for CMS/Admin control over tiers
CREATE TABLE IF NOT EXISTS public.subscription_tier_configs (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL,
  monthly_price numeric NOT NULL DEFAULT 0,
  yearly_price numeric NOT NULL DEFAULT 0,
  badge text,
  highlight boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta text NOT NULL DEFAULT 'Get Started',
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_tier_configs ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone (anon and authenticated) can view available subscription tiers
DROP POLICY IF EXISTS "subscription_tier_configs_select" ON public.subscription_tier_configs;
CREATE POLICY "subscription_tier_configs_select"
  ON public.subscription_tier_configs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin policy: Admins can update/insert/delete subscription tiers
DROP POLICY IF EXISTS "subscription_tier_configs_admin" ON public.subscription_tier_configs;
CREATE POLICY "subscription_tier_configs_admin"
  ON public.subscription_tier_configs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed the initial 4 tiers from standard configuration
INSERT INTO public.subscription_tier_configs
  (id, name, tagline, monthly_price, yearly_price, badge, highlight, features, cta, sort_order)
VALUES
  (
    'free',
    'Free',
    'Essential tools for planning your build',
    0,
    0,
    NULL,
    false,
    '["Paint Calculator", "Screeding Calculator", "POP Ceiling Calculator", "Tile Calculator", "Community marketplace access", "Pro Connect profile"]'::jsonb,
    'Get Started',
    10
  ),
  (
    'pro',
    'Pro',
    'For contractors and serious builders',
    4.99,
    49.99,
    NULL,
    false,
    '["Everything in Free", "100% Ad-Free Experience", "Unlimited AI Photo Estimations", "Build-to-Roof Cost Estimator", "Painting Cost Estimator", "Screeding Cost Estimator", "Project management dashboard", "Saved projects (up to 25)", "Priority support"]'::jsonb,
    'Start Pro',
    20
  ),
  (
    'premium',
    'Premium',
    'Full engineering toolkit for professionals',
    9.99,
    99.99,
    'Most Popular',
    true,
    '["Everything in Pro", "Structural Load Calculator", "Foundation Designer", "Construction Sequence Planner", "Project Timeline Estimator", "AI Color Consultation", "AI Project Assistant", "Unlimited saved projects", "Template downloads", "Pro Connect messaging", "Dedicated support line"]'::jsonb,
    'Start Premium',
    30
  ),
  (
    'enterprise',
    'Enterprise',
    'For firms managing multiple projects',
    49.99,
    499.99,
    NULL,
    false,
    '["Everything in Premium", "Multi-seat team accounts", "Centralized billing", "Custom material pricing", "White-label reports", "API access", "Dedicated account manager", "Custom integrations"]'::jsonb,
    'Start Enterprise',
    40
  )
ON CONFLICT (id) DO NOTHING;

-- Grants
GRANT SELECT ON public.subscription_tier_configs TO anon, authenticated;
GRANT ALL ON public.subscription_tier_configs TO service_role;

-- 2. Add bing_site_verification to site_settings if missing
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS bing_site_verification text;

