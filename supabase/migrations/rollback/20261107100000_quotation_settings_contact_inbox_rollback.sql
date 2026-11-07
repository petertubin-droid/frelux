-- Rollback for 20261107100000_quotation_settings_contact_inbox.sql
-- Restores each affected row by id to the address it held before the change.

BEGIN;

UPDATE public.quotation_settings
SET company_email = 'Frenzyanthony39@gmail.com', updated_at = now()
WHERE id = 'b3bd8b8d-e1c5-4bca-8d0c-3d806fadd957';

UPDATE public.quotation_settings
SET company_email = 'hello@freluxpaintcalc.com', updated_at = now()
WHERE id = 'fe8d0a98-b8ab-46ce-8e9d-b90e4dc98d96';

COMMIT;
