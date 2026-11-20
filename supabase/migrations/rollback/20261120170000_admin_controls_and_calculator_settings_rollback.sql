-- Reverses 20261120170000_admin_controls_and_calculator_settings.sql
DELETE FROM public.calculator_templates
WHERE calculator_type = 'tv_console'
  AND slug IN ('japandi-slats', 'charcoal-floating', 'marble-gold-feature');

-- Restore the constraint without tv_console.
ALTER TABLE public.calculator_templates
  DROP CONSTRAINT IF EXISTS calculator_templates_calculator_type_check;
ALTER TABLE public.calculator_templates
  ADD CONSTRAINT calculator_templates_calculator_type_check
  CHECK (calculator_type = ANY (ARRAY['paint','tile','pop','screeding','build_to_roof','icf','eifs']::text[]));

ALTER TABLE public.site_settings
  DROP COLUMN IF EXISTS seo_keywords,
  DROP COLUMN IF EXISTS seo_canonical_base,
  DROP COLUMN IF EXISTS og_image_url,
  DROP COLUMN IF EXISTS twitter_handle,
  DROP COLUMN IF EXISTS robots_txt_custom;
