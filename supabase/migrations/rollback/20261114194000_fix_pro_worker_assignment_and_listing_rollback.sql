-- Reverses 20261114194000_fix_pro_worker_assignment_and_listing.sql
--
-- The function body it replaced is not recoverable from this file, so the
-- rollback drops the function rather than restoring an older definition. Any
-- caller of admin_update_pro_profile breaks until the earlier body is restored
-- from version control.
DROP FUNCTION IF EXISTS public.admin_update_pro_profile(uuid, jsonb, uuid);

-- The migration set a default on is_listed; removing it restores the column to
-- having no default, which is how it stood before.
ALTER TABLE public.pro_profiles ALTER COLUMN is_listed DROP DEFAULT;

-- Column-level grants added by the migration are left in place: they only widen
-- SELECT on non-contact columns of pro_profiles, and revoking them blindly could
-- remove access the table had before this migration ran. Review manually before
-- reverting those grants.
