-- =========================================================
-- FRELUX AI Credit Economy, Profile Rewards, and Universal 10-Credit AI Gate
-- Migration: 20261014020000_frelux_ai_credit_economy_and_profile_rewards.sql
-- =========================================================

-- 1. Ensure all AI features default to 10 credits
UPDATE public.ai_feature_costs
SET credit_cost = 10,
    requires_credits = true
WHERE credit_cost != 10;

-- Insert or update standard AI feature keys with 10 credits default
INSERT INTO public.ai_feature_costs (feature_key, feature_name, description, credit_cost, requires_credits, is_enabled)
VALUES
  ('ai_building_estimation', 'AI Building Estimation', 'Full construction and finishing estimation from images', 10, true, true),
  ('ai_color_consult', 'AI Color Consultant', 'AI-powered color palette consultations', 10, true, true),
  ('ai_color_preview', 'AI Color Preview', 'Surface visualizer and realistic preview', 10, true, true),
  ('ai_project_assistant', 'AI Project Assistant', 'Interactive structural and material planning assistant', 10, true, true),
  ('ai_learn_assistant', 'AI Learning Assistant', 'AI tutor for construction knowledge and codes', 10, true, true),
  ('ai_copilot', 'AI Estimation Copilot', 'Conversational copilot for cost calculations', 10, true, true),
  ('ai_studio', 'AI Studio & Analysis', 'Architectural and structural defect analysis', 10, true, true),
  ('count_vision', 'CountVision AI', 'Computer vision material and fixture counter', 10, true, true),
  ('support_chat', 'AI Support Assistant', 'Customer support and technical assistance', 10, true, true)
ON CONFLICT (feature_key) DO UPDATE
SET credit_cost = 10,
    requires_credits = true,
    is_enabled = true;

-- 2. Configure rewarded ad earning rules (5 credits per ad, 2 ads = 10 credits)
UPDATE public.rewarded_ad_credit_config
SET credits_per_ad = 5,
    daily_earn_limit = 50, -- Allows up to 10 ads (50 credits) per day
    min_interval_seconds = 15,
    cooldown_seconds = 30
WHERE id = 1;

-- 3. Task Completion Credit Reward Framework
CREATE TABLE IF NOT EXISTS public.credit_task_definitions (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'onboarding',
  credit_reward   INTEGER NOT NULL DEFAULT 10 CHECK (credit_reward > 0),
  is_repeatable   BOOLEAN NOT NULL DEFAULT false,
  max_completions INTEGER NOT NULL DEFAULT 1,
  cooldown_hours  INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  action_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_task_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         TEXT NOT NULL REFERENCES public.credit_task_definitions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_awarded INTEGER NOT NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_ref TEXT,
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_credit_task_completions_user_task
  ON public.credit_task_completions(user_id, task_id);

-- Enable RLS
ALTER TABLE public.credit_task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_read_all" ON public.credit_task_definitions;
CREATE POLICY "tasks_read_all" ON public.credit_task_definitions
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "task_completions_read_own" ON public.credit_task_completions;
CREATE POLICY "task_completions_read_own" ON public.credit_task_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Seed Initial Verified Tasks
INSERT INTO public.credit_task_definitions (id, title, description, category, credit_reward, is_repeatable, max_completions, action_url)
VALUES
  ('profile_completion', 'Complete Contractor Profile', 'Fill in your name, company, phone number and trade specializations.', 'onboarding', 10, false, 1, '/profile'),
  ('first_project_created', 'Create First Construction Project', 'Set up your first project workspace with dimensions and location.', 'workflow', 10, false, 1, '/projects'),
  ('invite_colleague', 'Invite a Colleague or Artisan', 'Share FRELUX with a verified team member or subcontractor.', 'referral', 15, false, 1, '/pro-connect'),
  ('first_boq_exported', 'Generate & Export a Bill of Quantities', 'Run a full BOQ calculation and download the verified estimate.', 'workflow', 10, false, 1, '/boq')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    credit_reward = EXCLUDED.credit_reward;

-- 4. RPC function: complete_credit_task (Atomic task verification and credit award)
CREATE OR REPLACE FUNCTION public.complete_credit_task(
  p_user_id UUID,
  p_task_id TEXT,
  p_verification_ref TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, credits_awarded INTEGER, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_count INTEGER;
  v_new_balance INTEGER;
  v_tx_id UUID;
BEGIN
  -- Lock user's wallet
  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_user_id::text));

  -- Get task definition
  SELECT * INTO v_task FROM public.credit_task_definitions
  WHERE id = p_task_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'task_not_found'::TEXT;
    RETURN;
  END IF;

  -- Check previous completions
  SELECT COUNT(*) INTO v_count
  FROM public.credit_task_completions
  WHERE user_id = p_user_id AND task_id = p_task_id;

  IF v_count >= v_task.max_completions THEN
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
    IF v_new_balance IS NULL THEN v_new_balance := 0; END IF;
    RETURN QUERY SELECT false, v_new_balance, 0, 'already_completed'::TEXT;
    RETURN;
  END IF;

  -- Award credits: Ensure wallet exists
  INSERT INTO public.credit_wallets (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, v_task.credit_reward, v_task.credit_reward, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = credit_wallets.balance + v_task.credit_reward,
      total_earned = credit_wallets.total_earned + v_task.credit_reward,
      updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Insert task completion record
  INSERT INTO public.credit_task_completions (task_id, user_id, credits_awarded, verification_ref, metadata)
  VALUES (p_task_id, p_user_id, v_task.credit_reward, p_verification_ref, p_metadata);

  -- Record credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after, metadata)
  VALUES (
    p_user_id,
    v_task.credit_reward,
    'bonus',
    'Task completed: ' || v_task.title,
    'task_' || p_task_id || '_' || gen_random_uuid()::text,
    v_new_balance,
    jsonb_build_object('task_id', p_task_id, 'verification_ref', p_verification_ref)
  );

  RETURN QUERY SELECT true, v_new_balance, v_task.credit_reward, NULL::TEXT;
END;
$$;
