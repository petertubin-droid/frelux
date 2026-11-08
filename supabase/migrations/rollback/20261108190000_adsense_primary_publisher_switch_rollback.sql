-- Rollback for 20261108190000_adsense_primary_publisher_switch.sql
--
-- Restores the original account as the serving publisher and puts the second
-- account back on the additional list. Both accounts stay authorised in
-- ads.txt either way; only which one verification and serving use changes.
--
-- Note: the static side (index.html loader order and the google-adsense-account
-- meta tag) is not database state. After running this, set the same pairing in
-- src/config/site.ts and Network Hub, or the page source and the units will
-- disagree again.

UPDATE ad_providers
   SET credentials = COALESCE(credentials, '{}'::jsonb)
                     || '{"publisher_id":"ca-pub-3404100134534192"}'::jsonb,
       settings = COALESCE(settings, '{}'::jsonb)
                  || '{"additional_publisher_ids":"ca-pub-4906239537212380"}'::jsonb
 WHERE slug = 'google_adsense';

-- site_settings mirror back to the original pairing
UPDATE site_settings
   SET adsense_publisher_id = 'ca-pub-3404100134534192',
       adsense_additional_publisher_ids = 'ca-pub-4906239537212380'
 WHERE id = (SELECT id FROM site_settings LIMIT 1);
