-- Clean up the trade list after the identity work landed upstream.
--
-- The pro worker signup gained extra trades earlier this month from an
-- uncommitted branch while the same ground was being covered upstream. The
-- result was two categories with the same name in the signup dropdown, and an
-- extra listing trigger on pro_profiles that contradicts the admin flow added
-- in 20261114193000, which deliberately lists an assigned worker before
-- identity review. An owner editing their profile would have been silently
-- removed from the directory, so that trigger goes.
--
-- Nothing here removes a category that anybody is attached to.

DROP TRIGGER IF EXISTS trg_gate_pro_profile_listing ON public.pro_profiles;
DROP FUNCTION IF EXISTS public.gate_pro_profile_listing();

DELETE FROM public.pro_categories c
WHERE c.slug IN (
  'welders-fabricators',
  'borehole-drillers',
  'paving-installers',
  'landscapers',
  'demolition-contractors',
  'bricklayers'
)
AND NOT EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.category_id = c.id);

-- Trades worth keeping that no other migration carries, so the chain rebuilds
-- the same list the live database has.
INSERT INTO public.pro_categories (name, slug, description, sort_order)
SELECT v.name, v.slug, v.description, 0
FROM (VALUES
  ('Iron Benders & Steel Fixers', 'iron-benders', 'Rebar cutting, bending and fixing for slabs, beams and columns.'),
  ('Roofers & Roofing Contractors', 'roofers', 'Roof covering, carpentry, waterproofing and repairs.'),
  ('Solar & Inverter Installers', 'solar-installers', 'Solar PV, inverter and battery installation and servicing.'),
  ('CCTV & Security Installers', 'cctv-security', 'CCTV, access control and intercom installation.'),
  ('Project Managers & Site Supervisors', 'project-managers', 'Site supervision, programme and cost control.')
) AS v(name, slug, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.pro_categories c WHERE c.slug = v.slug
);

-- Sequential ordering, so the signup dropdown reads top to bottom.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY sort_order, name) AS position
  FROM public.pro_categories
)
UPDATE public.pro_categories c
SET sort_order = o.position,
    updated_at = now()
FROM ordered o
WHERE c.id = o.id
  AND c.sort_order <> o.position;

-- Services that only the removed duplicates carried, left behind by the
-- foreign key's set null. Nothing can reach a service with no category.
DELETE FROM public.pro_services WHERE category_id IS NULL;
