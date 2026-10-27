-- =========================================================
-- INTERNATIONAL ILLUSTRATIVE CASE STUDIES (2026-10-24)
--
-- Owner-directed gap closure: text-only illustrative case
-- studies for non-NG markets, built on the existing gallery +
-- case-study system. No fabricated photos: the entries carry no
-- gallery_images rows, so the UI renders its existing "No photo"
-- empty states. Budgets are derived from each market's REAL
-- active book prices and wallfin_labour_rates (cited per line),
-- rounded to illustrative figures and clearly labelled as
-- illustrative examples - zero-fabrication rule preserved.
--
-- Fresh-database / preview-branch behavior:
-- gallery_entries.user_id requires a valid auth.users(id) FK.
-- In databases where no auth user exists yet (empty previews/CI),
-- seed insertion skips cleanly with a NOTICE. Where a user exists,
-- the admin/earliest account is resolved dynamically.
-- =========================================================

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Resolve the target user: prefer an existing admin/user profile, or earliest auth user
  SELECT id INTO target_user_id
  FROM auth.users
  ORDER BY (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.users.id)) DESC,
           created_at
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'No auth user exists yet — international illustrative case studies seed skipped. Will run once an auth user is created.';
    RETURN;
  END IF;

  -- Gallery entries (media shell; no photos, professional empty states apply)
  INSERT INTO gallery_entries (id, user_id, title, description, project_category, paint_type_used, paint_quality_used, colour_used, location, is_public, status, is_featured)
  VALUES
  ('2f9017f3-4d3a-43ec-b817-213dbaac7659', target_user_id,
   'Illustrative repaint example: Austin living room and hallway',
   'An illustrative walkthrough planned with FRELUX calculators. Not an actual completed project - no project photos are shown.',
   'painting', 'Interior emulsion', 'Standard', 'Warm white',
   'Austin, Texas, United States', true, 'approved', false),
  ('6c4adab7-f883-4932-bea8-6793cec64764', target_user_id,
   'Illustrative skim and repaint example: Manchester front room',
   'An illustrative walkthrough planned with FRELUX calculators. Not an actual completed project - no project photos are shown.',
   'painting', 'Matt emulsion', 'Standard', 'Soft neutral',
   'Manchester, United Kingdom', true, 'approved', false),
  ('b521a5e0-a763-44de-b47f-afefed936cf3', target_user_id,
   'Illustrative filler and repaint example: Berlin apartment',
   'An illustrative walkthrough planned with FRELUX calculators. Not an actual completed project - no project photos are shown.',
   'painting', 'Interior emulsion', 'Standard', 'White',
   'Berlin, Germany', true, 'approved', false)
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    project_category = EXCLUDED.project_category,
    paint_type_used = EXCLUDED.paint_type_used,
    paint_quality_used = EXCLUDED.paint_quality_used,
    colour_used = EXCLUDED.colour_used,
    location = EXCLUDED.location,
    is_public = EXCLUDED.is_public,
    status = EXCLUDED.status,
    is_featured = EXCLUDED.is_featured;

  -- Case studies: budgets derived from live market book prices and labour rates
  -- US: paint 5 gal x 39.20 USD (Behr Premium Plus, Home Depot) + primer 2 x 24.99 (KILZ 2, Ace) + filler; labour from wallfin_labour_rates US
  INSERT INTO case_studies (id, gallery_entry_id, headline, summary, project_scope, challenges, outcome, materials_used, project_duration, budget, currency, is_published, created_by)
  VALUES
  ('2f6809be-1508-4830-a3b4-db41bf19d204', '2f9017f3-4d3a-43ec-b817-213dbaac7659',
   'A living room and hallway repaint, planned coat by coat (illustrative example)',
   'An illustrative walkthrough of a typical US interior repaint: patching, sanding, priming and a two-coat finish, planned with FRELUX calculators using active Austin-area retail prices.',
   'Wall preparation and repainting of a living room and hallway (about 90 m2 of wall area): drywall patching, spot sanding, one primer coat and two top coats.',
   'Old repairs and hairline cracks had to be filled and sanded flat before priming. Quantities were estimated first so paint and primer were bought once for the whole scope.',
   'A clean, even finish with no patch shadows. Estimating gallons up front avoided a second store trip and left less than half a can spare.',
   ARRAY['Interior acrylic paint (Behr Premium Plus, 2 coats)','All-purpose primer (KILZ 2)','Drywall joint filler'],
   '3 to 5 days', 1250, 'USD', true, target_user_id)
  ON CONFLICT (id) DO UPDATE SET
    gallery_entry_id = EXCLUDED.gallery_entry_id,
    headline = EXCLUDED.headline,
    summary = EXCLUDED.summary,
    project_scope = EXCLUDED.project_scope,
    challenges = EXCLUDED.challenges,
    outcome = EXCLUDED.outcome,
    materials_used = EXCLUDED.materials_used,
    project_duration = EXCLUDED.project_duration,
    budget = EXCLUDED.budget,
    currency = EXCLUDED.currency,
    is_published = EXCLUDED.is_published,
    created_by = EXCLUDED.created_by;

  -- GB: skim 58 m2 + materials (Thistle MultiFinish 4 x 11.25 GBP, Dulux Easycare 10L x 2, Zinsser); labour from wallfin_labour_rates GB
  INSERT INTO case_studies (id, gallery_entry_id, headline, summary, project_scope, challenges, outcome, materials_used, project_duration, budget, currency, is_published, created_by)
  VALUES
  ('94424393-7fcf-40f2-9c5b-f5528dfc87a4', '6c4adab7-f883-4932-bea8-6793cec64764',
   'Skimmed flat and repainted: a terrace front room (illustrative example)',
   'An illustrative walkthrough of a typical UK room refresh: a fresh skim coat over tired plaster, then mist coat and two coats of emulsion, planned with FRELUX calculators using active UK trade prices.',
   'Reskimming and repainting of a terrace front room (about 58 m2 of wall area): Thistle MultiFinish skim, sanding, mist coat and two coats of matt emulsion.',
   'The old plaster was blown in patches and had to be reskimmed, so drying time shaped the schedule. Quantities were estimated first so plaster and paint were ordered once with sensible allowances.',
   'A flat, even finish ready for decor. Estimating bags and litres up front kept the job to one materials run and no mid-job shortages.',
   ARRAY['MultiFinish plaster (Thistle, 25 kg)','Matt emulsion (Dulux Easycare, 10 L)','Primer sealer (Zinsser Bulls Eye 1-2-3)'],
   '5 to 7 days', 1200, 'GBP', true, target_user_id)
  ON CONFLICT (id) DO UPDATE SET
    gallery_entry_id = EXCLUDED.gallery_entry_id,
    headline = EXCLUDED.headline,
    summary = EXCLUDED.summary,
    project_scope = EXCLUDED.project_scope,
    challenges = EXCLUDED.challenges,
    outcome = EXCLUDED.outcome,
    materials_used = EXCLUDED.materials_used,
    project_duration = EXCLUDED.project_duration,
    budget = EXCLUDED.budget,
    currency = EXCLUDED.currency,
    is_published = EXCLUDED.is_published,
    created_by = EXCLUDED.created_by;

  -- DE: filler 70 m2 + primer (Caparol Tiefgrund TB) + emulsion; labour from wallfin_labour_rates DE
  INSERT INTO case_studies (id, gallery_entry_id, headline, summary, project_scope, challenges, outcome, materials_used, project_duration, budget, currency, is_published, created_by)
  VALUES
  ('5dd4a97a-7c56-4030-974d-37352bf0974c', 'b521a5e0-a763-44de-b47f-afefed936cf3',
   'Filled, primed and repainted: a Berlin apartment refresh (illustrative example)',
   'An illustrative walkthrough of a typical German apartment repaint: fine filler over uneven areas, priming and a two-coat finish, planned with FRELUX calculators using active German retail prices.',
   'Wall preparation and repainting of a two-room apartment (about 70 m2 of wall area): fine filler skim, sanding, Tiefgrund primer and two top coats.',
   'Uneven filler patches and old repair marks had to be feathered flat before priming. Quantities were estimated first so filler, primer and paint were bought in one run.',
   'An even, consistent finish across both rooms. Estimating litres and kilos up front avoided over-ordering and left minimal surplus.',
   ARRAY['Fine filler (Knauf Feinspachtel, 25 kg)','Deep primer (Caparol Tiefgrund TB)','Interior emulsion paint (2 coats)'],
   '4 to 6 days', 1500, 'EUR', true, target_user_id)
  ON CONFLICT (id) DO UPDATE SET
    gallery_entry_id = EXCLUDED.gallery_entry_id,
    headline = EXCLUDED.headline,
    summary = EXCLUDED.summary,
    project_scope = EXCLUDED.project_scope,
    challenges = EXCLUDED.challenges,
    outcome = EXCLUDED.outcome,
    materials_used = EXCLUDED.materials_used,
    project_duration = EXCLUDED.project_duration,
    budget = EXCLUDED.budget,
    currency = EXCLUDED.currency,
    is_published = EXCLUDED.is_published,
    created_by = EXCLUDED.created_by;

END $$;
