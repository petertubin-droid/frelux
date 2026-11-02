-- =========================================================
-- FRELUX Phase 2: production upload gate
-- Migration 20261025130000
--
-- The privacy & legal review (docs/CREDENTIAL_PRIVACY_REVIEW.md)
-- was completed and signed off by the owner on 2026-10-25.
-- This flag gates document uploads in production; the client
-- hides the upload affordance whenever it is false, and the
-- honest fallback is a submission without an evidence document.
-- =========================================================

ALTER TABLE public.pro_settings
  ADD COLUMN IF NOT EXISTS credential_uploads_enabled boolean
    NOT NULL DEFAULT false;

-- Owner signed off: enable production uploads.
UPDATE public.pro_settings
   SET credential_uploads_enabled = true
 WHERE id = 1;
