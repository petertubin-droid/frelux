-- Print the public inbox on quotation headers.
--
-- Two saved quotation settings rows still carried retired addresses: the
-- personal gmail and hello@freluxpaintcalc.com. Both are stamped onto every
-- quote PDF that uses those company profiles, so a customer replying to a
-- quote reached a mailbox nobody monitors. The site contact address is
-- freluxtools@gmail.com, and quotes should publish the same one.
--
-- Idempotent: only rows still holding a retired address are touched.

BEGIN;

UPDATE public.quotation_settings
SET company_email = 'freluxtools@gmail.com',
    updated_at = now()
WHERE lower(company_email) IN (
  'frenzyanthony39@gmail.com',
  'hello@freluxpaintcalc.com',
  'contact@freluxtools.com'
);

COMMIT;
