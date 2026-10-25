-- =========================================================
-- FRELUX Phase 2: the public credential view never shows an
-- expired credential as verified, regardless of when the daily
-- expiry pass last ran. Freshness is enforced at the view, not
-- only at the cron.
-- =========================================================

CREATE OR REPLACE VIEW public.pro_credentials_public
WITH (security_invoker = false) AS
SELECT
  c.id,
  c.profile_id,
  c.professional_body,
  c.credential_type,
  c.verification_status,
  CASE
    WHEN c.verification_status = 'verified_by_source' THEN 'registry_verified'
    WHEN c.verification_status = 'verified_by_reviewer' THEN 'document_reviewed'
    WHEN c.verification_status = 'verified' THEN 'document_reviewed'
    ELSE 'not_verified'
  END AS public_verification_label,
  c.country_code,
  c.subnational_scope,
  c.credential_class,
  c.expires_at,
  c.verified_at,
  c.verification_method,
  c.verification_checked_at,
  c.created_at
FROM public.pro_credentials c
WHERE c.verification_status IN ('verified_by_source', 'verified_by_reviewer', 'verified')
  AND (c.expires_at IS NULL OR c.expires_at >= current_date);
