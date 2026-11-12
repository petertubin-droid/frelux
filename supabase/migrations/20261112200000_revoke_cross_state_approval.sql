-- =========================================================
-- Revoking a travel approval.
--
-- Rule 4 reads cross_state_approvals and honours expires_at, so revoking is an
-- expiry rather than a delete: the decision stays in the table with who made
-- it and why, which is the point of recording it in the first place.
-- =========================================================

CREATE OR REPLACE FUNCTION public.revoke_cross_state_approval(
  p_approval_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE = 'check_violation';
  END IF;

  IF p_approval_id IS NULL THEN
    RAISE EXCEPTION 'APPROVAL_ID_REQUIRED' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.cross_state_approvals
  SET expires_at = now(),
      note = concat_ws(' | ', note, coalesce(p_reason, 'Revoked by admin')),
      approved_by = COALESCE(approved_by, v_admin)
  WHERE id = p_approval_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPROVAL_NOT_FOUND' USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMENT ON FUNCTION public.revoke_cross_state_approval(uuid, text) IS
  'Ends a cross state travel approval by expiring it, keeping the record of who approved it and why it was withdrawn.';

GRANT EXECUTE ON FUNCTION public.revoke_cross_state_approval(uuid, text) TO authenticated;
