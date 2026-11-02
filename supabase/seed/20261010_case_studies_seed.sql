-- =========================================================
-- Track 2 (worldwide audit, 2026-10-10): seed the empty showcase.
--
-- Three ILLUSTRATIVE case studies on the existing gallery ->
-- case_studies model. The before/after images are AI-generated
-- illustrations, NOT photos of real client work, and every entry
-- says so in its title and description. Replace with real
-- project photos as they are submitted through the gallery.
--
-- Owned by the admin profile. Idempotent: skipped if a gallery
-- entry with the same title already exists.
-- =========================================================

DO $$
DECLARE
  admin_id uuid := 'd74ffbd7-281b-4445-9728-ad87c287e0b9';
  g_id uuid;
BEGIN
  -- 1. Living room refresh --------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.gallery_entries WHERE title = 'Living room refresh: paint, POP ceiling and tiles (illustrative)') THEN
    INSERT INTO public.gallery_entries
      (user_id, title, description, project_category, location, completion_date, is_public, status, is_featured)
    VALUES
      (admin_id,
       'Living room refresh: paint, POP ceiling and tiles (illustrative)',
       'Illustrative example, not a real client photo. A tired living room with peeling paint and a bare floor, finished with smooth emulsion walls, a POP cove ceiling and porcelain tiles.',
       'finishing', 'Lagos, Nigeria', '2026-09-30', true, 'featured', true)
    RETURNING id INTO g_id;

    INSERT INTO public.gallery_images (gallery_entry_id, image_type, image_url, caption, sort_order) VALUES
      (g_id, 'before', 'https://media.base44.com/images/public/6a9055a461b20103e239f8a5/63e4b4578_generated_image.png', 'Before: peeling paint and scuffed walls (AI illustration)', 0),
      (g_id, 'after',  'https://media.base44.com/images/public/6a9055a461b20103e239f8a5/78ad83011_generated_image.png', 'After: fresh paint, POP ceiling, tiled floor (AI illustration)', 1);

    INSERT INTO public.case_studies
      (gallery_entry_id, headline, summary, project_scope, challenges, outcome, materials_used, project_duration, budget, currency, is_published, created_by)
    VALUES
      (g_id,
       'From worn walls to a finished living room (illustrative example)',
       'An illustrative walkthrough of a typical living room refresh: surface repair, two-coat emulsion paint, a POP cove ceiling and porcelain floor tiles, planned with FRELUX calculators.',
       'Wall preparation and repainting (about 85 m2 of wall area), POP ceiling with cove cornice (about 24 m2), and porcelain floor tiling (about 24 m2).',
       'Peeling paint and uneven plaster had to be scraped and skimmed before any new coat. Quantities were estimated first so paint, POP and tiles were bought once with sensible waste allowances.',
       'A bright, even finish with a clean ceiling line. Estimating quantities up front avoided mid-job shortages and over-ordering.',
       ARRAY['Emulsion paint (2 coats)', 'Wall primer', 'POP (plaster of Paris)', 'Porcelain floor tiles', 'Tile adhesive and grout'],
       '10 to 14 days', 1450000, 'NGN', true, admin_id);
  END IF;

  -- 2. Exterior repaint -----------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.gallery_entries WHERE title = 'Bungalow exterior repaint (illustrative)') THEN
    INSERT INTO public.gallery_entries
      (user_id, title, description, project_category, location, completion_date, is_public, status, is_featured)
    VALUES
      (admin_id,
       'Bungalow exterior repaint (illustrative)',
       'Illustrative example, not a real client photo. A faded, algae-stained bungalow exterior cleaned, repaired and repainted in masonry paint.',
       'painting', 'Abuja, Nigeria', '2026-09-20', true, 'approved', false)
    RETURNING id INTO g_id;

    INSERT INTO public.gallery_images (gallery_entry_id, image_type, image_url, caption, sort_order) VALUES
      (g_id, 'before', 'https://media.base44.com/images/public/6a9055a461b20103e239f8a5/20087ed3b_generated_image.png', 'Before: faded paint, algae and damp staining (AI illustration)', 0),
      (g_id, 'after',  'https://media.base44.com/images/public/6a9055a461b20103e239f8a5/759a42ac6_generated_image.png', 'After: cleaned, repaired and repainted (AI illustration)', 1);

    INSERT INTO public.case_studies
      (gallery_entry_id, headline, summary, project_scope, challenges, outcome, materials_used, project_duration, budget, currency, is_published, created_by)
    VALUES
      (g_id,
       'Bringing a stained bungalow exterior back to life (illustrative example)',
       'An illustrative exterior repaint: wash down, crack repair, sealer and two coats of masonry paint, with the paint quantity worked out from wall area and coverage rates.',
       'Pressure wash and algae treatment, patching of cracked render, sealer coat and two coats of exterior masonry paint over roughly 160 m2.',
       'Damp staining and algae near the base needed treating before painting, otherwise the new coat would fail early.',
       'A clean, uniform exterior that is protected against weather. Treating the damp first is what makes the finish last.',
       ARRAY['Exterior masonry paint (2 coats)', 'Alkali-resistant sealer', 'Render repair mortar', 'Anti-algae wash'],
       '5 to 7 days', 620000, 'NGN', true, admin_id);
  END IF;

  -- 3. Room tiling ----------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.gallery_entries WHERE title = 'Bare room to tiled and finished space (illustrative)') THEN
    INSERT INTO public.gallery_entries
      (user_id, title, description, project_category, location, completion_date, is_public, status, is_featured)
    VALUES
      (admin_id,
       'Bare room to tiled and finished space (illustrative)',
       'Illustrative example, not a real client photo. A rough concrete slab screeded, tiled with porcelain tiles and finished with skirting and painted walls.',
       'tiling', 'Port Harcourt, Nigeria', '2026-09-12', true, 'approved', false)
    RETURNING id INTO g_id;

    INSERT INTO public.gallery_images (gallery_entry_id, image_type, image_url, caption, sort_order) VALUES
      (g_id, 'before', 'https://media.base44.com/images/public/6a9055a461b20103e239f8a5/b1e939a61_generated_image.png', 'Before: rough slab and bare block walls (AI illustration)', 0),
      (g_id, 'after',  'https://media.base44.com/images/public/6a9055a461b20103e239f8a5/7bb4604ba_generated_image.png', 'After: porcelain tiles, plastered and painted walls (AI illustration)', 1);

    INSERT INTO public.case_studies
      (gallery_entry_id, headline, summary, project_scope, challenges, outcome, materials_used, project_duration, budget, currency, is_published, created_by)
    VALUES
      (g_id,
       'Screed, tile and finish: a bare room made ready (illustrative example)',
       'An illustrative tiling job: levelling screed, porcelain tiles with a waste allowance, adhesive, grout and skirting, with tile counts planned from the room dimensions.',
       'Levelling screed, porcelain tiling (about 30 m2 with 10 percent waste), grouting, skirting and wall finishing.',
       'The slab was uneven, so a levelling screed had to cure before tiling. Tile quantity needed a waste allowance for cuts.',
       'A flat, clean tiled floor and finished walls. Planning the tile count and screed volume first kept the budget predictable.',
       ARRAY['Cement and sharp sand screed', 'Porcelain tiles', 'Tile adhesive', 'Grout', 'Skirting', 'Emulsion paint'],
       '7 to 10 days', 780000, 'NGN', true, admin_id);
  END IF;
END $$;
