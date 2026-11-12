-- =========================================================
-- Automatic name matching for client identity.
--
-- The identity check used to end in an admin's queue. Most submissions are
-- obviously the same person: a bank prints ANTHONY OKON EFFIONG in capitals
-- and the NIN slip says Anthony Effiong. This records the funding account, the
-- name the bank itself reports for it, a score, and the decision that score
-- produced. Only the genuinely ambiguous middle goes to a person.
--
-- The account number is never stored, only its last four characters: the bank
-- resolution happens once, and the name it returns is what we keep.
-- =========================================================

ALTER TABLE public.client_verifications
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_last4 text CHECK (account_last4 IS NULL OR account_last4 ~ '^[0-9]{4}$'),
  ADD COLUMN IF NOT EXISTS resolved_account_name text,
  ADD COLUMN IF NOT EXISTS name_match_score numeric(4,3)
    CHECK (name_match_score IS NULL OR (name_match_score >= 0 AND name_match_score <= 1)),
  ADD COLUMN IF NOT EXISTS match_method text
    CHECK (match_method IS NULL OR match_method IN ('bank_resolve', 'declared_account_name', 'admin_manual')),
  ADD COLUMN IF NOT EXISTS match_reason text,
  ADD COLUMN IF NOT EXISTS auto_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE public.worker_safety_settings
  ADD COLUMN IF NOT EXISTS identity_auto_approve_score numeric(4,3) NOT NULL DEFAULT 0.850
    CHECK (identity_auto_approve_score > 0 AND identity_auto_approve_score <= 1),
  ADD COLUMN IF NOT EXISTS identity_manual_review_score numeric(4,3) NOT NULL DEFAULT 0.600
    CHECK (identity_manual_review_score >= 0 AND identity_manual_review_score <= 1),
  ADD COLUMN IF NOT EXISTS identity_auto_review boolean NOT NULL DEFAULT true;

-- A client may supply their bank details; the verdict columns stay closed.
GRANT INSERT (bank_code, bank_name, account_last4) ON public.client_verifications TO authenticated;
GRANT UPDATE (bank_code, bank_name, account_last4) ON public.client_verifications TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_client_verification_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.status := 'pending';
      NEW.name_match := NULL;
      NEW.name_match_score := NULL;
      NEW.auto_reviewed := false;
      NEW.resolved_account_name := NULL;
      NEW.resolved_at := NULL;
      NEW.match_method := NULL;
      NEW.match_reason := NULL;
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.rejection_reason := NULL;
    END IF;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.status := OLD.status;
    NEW.name_match := OLD.name_match;
    NEW.name_match_score := OLD.name_match_score;
    NEW.auto_reviewed := OLD.auto_reviewed;
    NEW.resolved_account_name := OLD.resolved_account_name;
    NEW.resolved_at := OLD.resolved_at;
    NEW.match_method := OLD.match_method;
    NEW.match_reason := OLD.match_reason;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END $$;

COMMENT ON COLUMN public.client_verifications.name_match_score IS
  '0 to 1 similarity between the ID legal name and the name returned for the funding account. Set by the identity function, never by the client.';

COMMENT ON COLUMN public.client_verifications.match_method IS
  'bank_resolve when the provider returned the account name, declared_account_name when only the client supplied one, admin_manual when a person decided.';
