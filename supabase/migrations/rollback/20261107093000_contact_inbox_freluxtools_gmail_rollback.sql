-- Rollback for 20261107093000_contact_inbox_freluxtools_gmail.sql
-- Restores the address that was live before the change.

BEGIN;

UPDATE public.site_settings
SET contact_email = 'frenzyanthony39@gmail.com'
WHERE contact_email = 'freluxtools@gmail.com';

UPDATE public.site_settings
SET pdf_default_contact_email = 'frenzyanthony39@gmail.com'
WHERE pdf_default_contact_email = 'freluxtools@gmail.com';

COMMIT;
