-- ==========================================================================
-- Migration: 20261120170000_admin_controls_and_calculator_settings.sql
-- Add TV Console support to calculator_templates and add SEO / branding fields
-- to site_settings for complete admin control.
-- ==========================================================================

-- 1. Extend calculator_templates constraint to include tv_console
ALTER TABLE public.calculator_templates 
  DROP CONSTRAINT IF EXISTS calculator_templates_calculator_type_check;

ALTER TABLE public.calculator_templates
  ADD CONSTRAINT calculator_templates_calculator_type_check
  CHECK (calculator_type = ANY (ARRAY['paint','tile','pop','screeding','build_to_roof','icf','eifs','tv_console']::text[]));

-- 2. Add custom SEO columns to site_settings if not present
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
  ADD COLUMN IF NOT EXISTS seo_canonical_base TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS robots_txt_custom TEXT;

-- 3. Seed default public TV Console templates into calculator_templates
INSERT INTO public.calculator_templates
  (name, description, calculator_type, input_data, schema_version, visibility,
   is_featured, is_published, display_order, slug, seo_title, seo_description, category)
VALUES
  ('Minimalist Japandi Slats',
   'Fluted side panels, two open media bays for 55 inch screen',
   'tv_console', 
   '{"widthMm": 1800, "heightMm": 400, "depthMm": 350, "material": "White oak veneer board", "layout": {"thicknessMm": 18, "backThicknessMm": 6, "shelves": 1, "dividers": 2, "drawers": 0, "doors": 0, "revealMm": 2}, "tvInches": 55, "mounting": "floating"}'::jsonb,
   1, 'public', true, true, 140, 'japandi-slats',
   'TV Console Calculator Template: Minimalist Japandi Slats | FRELUX',
   'Cut schedule, board sheet optimization, and hardware requirements for a 1.8m Japandi floating TV console.',
   'interior'),
  ('Executive Charcoal Floating',
   'Concealed cable channel, push-to-open drawer bank for 65 inch screen',
   'tv_console',
   '{"widthMm": 2400, "heightMm": 350, "depthMm": 400, "material": "Matte charcoal HDF-faced board", "layout": {"thicknessMm": 18, "backThicknessMm": 6, "shelves": 0, "dividers": 0, "drawers": 3, "drawerFrontHeightMm": 100, "doors": 0, "revealMm": 2}, "tvInches": 65, "mounting": "floating"}'::jsonb,
   1, 'public', true, true, 141, 'charcoal-floating',
   'TV Console Calculator Template: Executive Charcoal Floating | FRELUX',
   'Cut schedule and sheet nesting for a 2.4m executive charcoal media console with three push-to-open drawers.',
   'interior'),
  ('Marble & Gold Feature Wall',
   'Centred stone panel with brass inlay lines, fluted returns, floating drawer bank',
   'tv_console',
   '{"widthMm": 2600, "heightMm": 420, "depthMm": 380, "material": "Bookmatched marble-look panel + fluted charcoal flanks", "layout": {"thicknessMm": 18, "backThicknessMm": 6, "shelves": 0, "dividers": 2, "drawers": 3, "drawerFrontHeightMm": 120, "doors": 0, "revealMm": 2}, "tvInches": 65, "wallTreatment": "marble", "wallPanelHeightMm": 1600, "mounting": "floating", "ledProfileMetres": 2.6}'::jsonb,
   1, 'public', true, true, 142, 'marble-gold-feature',
   'TV Console Calculator Template: Marble & Gold Feature Wall | FRELUX',
   'Panel schedule and materials list for a luxury 2.6m feature wall with integrated floating media unit.',
   'interior')
ON CONFLICT (slug) DO NOTHING;
