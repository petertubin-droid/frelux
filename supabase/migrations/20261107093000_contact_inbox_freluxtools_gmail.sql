-- Point the public contact inbox at freluxtools@gmail.com.
--
-- site_settings.contact_email still read the old personal address, and the
-- brand document defaults and newsletter "from" name kept the retired
-- freluxpaintcalc.com mailbox, so enquiries landed in two places nobody
-- watched. One address, one inbox.
--
-- Idempotent: each update only touches rows still holding a retired address.

BEGIN;

UPDATE public.site_settings
SET contact_email = 'freluxtools@gmail.com'
WHERE contact_email IN (
  'frenzyanthony39@gmail.com',
  'hello@freluxpaintcalc.com',
  'contact@freluxtools.com'
);

UPDATE public.site_settings
SET pdf_default_contact_email = 'freluxtools@gmail.com'
WHERE pdf_default_contact_email IN (
  'frenzyanthony39@gmail.com',
  'hello@freluxpaintcalc.com',
  'contact@freluxtools.com'
);

COMMIT;
