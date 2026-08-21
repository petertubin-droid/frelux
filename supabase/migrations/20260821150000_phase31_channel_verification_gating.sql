-- =========================================================
-- Phase 31: Worker Channel Verification Gating + KYC
-- Only FRELUX verified (tier 2) and Pro (tier 3) workers can join channels
-- Adds mobile OTP verification + NIN KYC to registration flow
-- =========================================================

-- =========================================================
-- 1. Add NIN + KYC columns to pro_profiles
-- =========================================================
ALTER TABLE pro_profiles
  ADD COLUMN IF NOT EXISTS nin_number text, -- National Identification Number (11 digits)
  ADD COLUMN IF NOT EXISTS nin_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nin_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS mobile_otp_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mobile_otp_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS mobile_number text;

-- Index for NIN lookup (admin verification)
CREATE INDEX IF NOT EXISTS idx_pro_profiles_nin ON pro_profiles(nin_number) WHERE nin_number IS NOT NULL;

-- =========================================================
-- 2. OTP log table for mobile verification
-- =========================================================
CREATE TABLE IF NOT EXISTS pro_mobile_otp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES pro_profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'registration', -- 'registration', 'phone_change'
  is_used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobile_otp_profile ON pro_mobile_otp_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_mobile_otp_phone ON pro_mobile_otp_log(phone_number);

-- RLS for OTP log
ALTER TABLE pro_mobile_otp_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mobile_otp_self_read" ON pro_mobile_otp_log FOR SELECT USING (
  profile_id IN (SELECT id FROM pro_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "mobile_otp_self_insert" ON pro_mobile_otp_log FOR INSERT WITH CHECK (
  profile_id IN (SELECT id FROM pro_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "mobile_otp_self_update" ON pro_mobile_otp_log FOR UPDATE USING (
  profile_id IN (SELECT id FROM pro_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "mobile_otp_admin_all" ON pro_mobile_otp_log FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- =========================================================
-- 3. Update worker_channel_members RLS — only tier 2+ can join
-- =========================================================
-- Drop old policies
DROP POLICY IF EXISTS "worker_members_insert_self" ON worker_channel_members;
DROP POLICY IF EXISTS "worker_members_read_self" ON worker_channel_members;
DROP POLICY IF EXISTS "worker_members_delete_self" ON worker_channel_members;

-- New: only pro_worker with verification tier >= 2 can join
CREATE POLICY "worker_members_read_self" ON worker_channel_members FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "worker_members_insert_self" ON worker_channel_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.account_type = 'pro_worker'
  )
  AND EXISTS (
    SELECT 1 FROM pro_profiles pp
    WHERE pp.user_id = auth.uid()
    AND (
      pp.identity_verified_at IS NOT NULL  -- Tier 2 (FRELUX verified)
      OR pp.pro_level = true                -- Tier 3 (FRELUX Pro)
    )
  )
);

CREATE POLICY "worker_members_delete_self" ON worker_channel_members FOR DELETE USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =========================================================
-- 4. Update worker_channel_messages RLS — only tier 2+ can post
-- =========================================================
DROP POLICY IF EXISTS "worker_messages_insert" ON worker_channel_messages;

CREATE POLICY "worker_messages_insert" ON worker_channel_messages FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM worker_channel_members m WHERE m.channel_id = worker_channel_messages.channel_id AND m.user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM worker_channel_members m WHERE m.channel_id = worker_channel_messages.channel_id AND m.user_id = auth.uid()
    AND m.muted_until IS NOT NULL AND m.muted_until > now()
  )
  -- Must be tier 2+
  AND EXISTS (
    SELECT 1 FROM pro_profiles pp
    WHERE pp.user_id = auth.uid()
    AND (
      pp.identity_verified_at IS NOT NULL
      OR pp.pro_level = true
    )
  )
);

-- =========================================================
-- 5. Grant permissions on new tables
-- =========================================================
GRANT SELECT, INSERT, UPDATE ON pro_mobile_otp_log TO authenticated;
GRANT USAGE ON SEQUENCE pro_mobile_otp_log_id_seq TO authenticated;

-- =========================================================
-- 6. RPC: Send mobile OTP (generates + stores 6-digit code)
-- =========================================================
CREATE OR REPLACE FUNCTION send_mobile_otp(
  p_phone_number TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  otp_code TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
  v_otp TEXT;
  v_existing_unused INTEGER;
BEGIN
  -- Find the pro_profile for this user
  SELECT id INTO v_profile_id FROM pro_profiles WHERE user_id = p_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'No professional profile found'::TEXT;
    RETURN;
  END IF;

  -- Rate limit: max 3 unused OTPs in last 10 minutes
  SELECT COUNT(*) INTO v_existing_unused
  FROM pro_mobile_otp_log
  WHERE profile_id = v_profile_id
    AND is_used = false
    AND created_at > now() - interval '10 minutes';

  IF v_existing_unused >= 3 THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Too many OTP requests. Please wait 10 minutes.'::TEXT;
    RETURN;
  END IF;

  -- Generate 6-digit OTP
  v_otp := lpad(floor(random() * 1000000)::TEXT, 6, '0');

  -- Invalidate previous unused OTPs
  UPDATE pro_mobile_otp_log
  SET is_used = true
  WHERE profile_id = v_profile_id AND is_used = false;

  -- Insert new OTP
  INSERT INTO pro_mobile_otp_log (profile_id, phone_number, otp_code, purpose, expires_at)
  VALUES (v_profile_id, p_phone_number, v_otp, 'registration', now() + interval '10 minutes');

  -- Update mobile number on profile
  UPDATE pro_profiles SET mobile_number = p_phone_number WHERE id = v_profile_id;

  RETURN QUERY SELECT true, v_otp, 'OTP sent successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION send_mobile_otp TO authenticated;

-- =========================================================
-- 7. RPC: Verify mobile OTP
-- =========================================================
CREATE OR REPLACE FUNCTION verify_mobile_otp(
  p_phone_number TEXT,
  p_otp_code TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
  v_log_id UUID;
BEGIN
  SELECT id INTO v_profile_id FROM pro_profiles WHERE user_id = p_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, 'No professional profile found'::TEXT;
    RETURN;
  END IF;

  -- Find matching unused, non-expired OTP
  SELECT id INTO v_log_id
  FROM pro_mobile_otp_log
  WHERE profile_id = v_profile_id
    AND phone_number = p_phone_number
    AND otp_code = p_otp_code
    AND is_used = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_log_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired OTP'::TEXT;
    RETURN;
  END IF;

  -- Mark OTP as used
  UPDATE pro_mobile_otp_log SET is_used = true WHERE id = v_log_id;

  -- Update profile
  UPDATE pro_profiles
  SET mobile_otp_verified = true,
      mobile_otp_verified_at = now(),
      phone_verified = true,
      phone_number = p_phone_number,
      contact_verified_at = COALESCE(contact_verified_at, now())
  WHERE id = v_profile_id;

  RETURN QUERY SELECT true, 'Mobile number verified successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_mobile_otp TO authenticated;

-- =========================================================
-- 8. RPC: Verify NIN (admin approval workflow)
-- =========================================================
-- Workers submit their NIN; admin verifies it.
-- This function creates a verification request with NIN.
CREATE OR REPLACE FUNCTION submit_nin_verification(
  p_nin_number TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
  v_nin_valid BOOLEAN;
BEGIN
  -- Validate NIN format (11 digits)
  IF p_nin_number !~ '^[0-9]{11}$' THEN
    RETURN QUERY SELECT false, 'NIN must be exactly 11 digits'::TEXT;
    RETURN;
  END IF;

  SELECT id INTO v_profile_id FROM pro_profiles WHERE user_id = p_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, 'No professional profile found'::TEXT;
    RETURN;
  END IF;

  -- Check if NIN is already used by another profile
  PERFORM 1 FROM pro_profiles WHERE nin_number = p_nin_number AND id != v_profile_id;
  IF FOUND THEN
    RETURN QUERY SELECT false, 'This NIN is already registered to another account'::TEXT;
    RETURN;
  END IF;

  -- Store NIN (pending admin verification)
  UPDATE pro_profiles
  SET nin_number = p_nin_number
  WHERE id = v_profile_id;

  -- Create identity verification request
  INSERT INTO pro_verification_requests (profile_id, request_type, status, identity_document_type, identity_document_number)
  VALUES (v_profile_id, 'identity', 'pending', 'national_id', p_nin_number)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'NIN submitted for verification. An admin will review it shortly.'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_nin_verification TO authenticated;

-- =========================================================
-- 9. RPC: Admin approves NIN (sets identity_verified_at)
-- =========================================================
CREATE OR REPLACE FUNCTION admin_approve_nin(
  p_profile_id UUID,
  p_admin_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin
  PERFORM 1 FROM profiles WHERE id = p_admin_id AND role = 'admin';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Only admins can approve NIN'::TEXT;
    RETURN;
  END IF;

  -- Update profile
  UPDATE pro_profiles
  SET nin_verified = true,
      nin_verified_at = now(),
      identity_verified_at = now(),
      verification_status = 'verified'
  WHERE id = p_profile_id;

  -- Approve pending verification requests
  UPDATE pro_verification_requests
  SET status = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = now()
  WHERE profile_id = p_profile_id
    AND request_type = 'identity'
    AND status = 'pending';

  RETURN QUERY SELECT true, 'NIN verified successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_approve_nin TO authenticated;

-- =========================================================
-- 10. RPC: Get user verification tier for channel access
-- =========================================================
CREATE OR REPLACE FUNCTION get_user_verification_tier(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier INTEGER := 0;
  v_pro_level BOOLEAN;
  v_identity_verified TIMESTAMPTZ;
  v_contact_verified TIMESTAMPTZ;
BEGIN
  SELECT pro_level, identity_verified_at, contact_verified_at
  INTO v_pro_level, v_identity_verified, v_contact_verified
  FROM pro_profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_pro_level THEN
    v_tier := 3;
  ELSEIF v_identity_verified IS NOT NULL THEN
    v_tier := 2;
  ELSEIF v_contact_verified IS NOT NULL THEN
    v_tier := 1;
  END IF;

  RETURN v_tier;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_verification_tier TO authenticated;
