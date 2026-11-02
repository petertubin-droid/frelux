-- Seed the house cross-promo provider row. Network Hub → House Promos
-- manages this row afterwards (upsert on slug), but a first deployment
-- needs the row to exist so the public config fetch exposes it.
--
-- is_active defaults to false: the promo system appears only after the
-- admin flips the master switch in Network Hub, matching Heartsyncx's
-- opt-in behaviour.

INSERT INTO public.ad_providers (
  name,
  slug,
  provider_type,
  priority,
  is_active,
  credentials,
  settings,
  is_system
) VALUES (
  'House Cross-Promo',
  'house_cross_promo',
  'native',
  99,
  false,
  '{}'::jsonb,
  '{
    "format": "card",
    "base_url": "",
    "external_promos": []
  }'::jsonb,
  true
) ON CONFLICT (slug) DO NOTHING;
