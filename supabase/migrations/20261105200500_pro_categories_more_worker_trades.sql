-- =========================================================
-- Pro Connect: more worker trades for the registration picker
-- =========================================================
-- The registration category picker was seeded once with 14 trades.
-- Contractors in the FRELUX markets asked for the trades below, all of
-- which already have FRELUX estimator engines (roofing, waterproofing,
-- window blinds, boreholes) or are core commercial trades.
--
-- Idempotent: existing categories and services are left untouched, so
-- production rows that were renamed or re-ordered by admins survive.

INSERT INTO pro_categories (name, slug, description, icon, sort_order) VALUES
  ('Roofers', 'roofers', 'Roof installation, sheeting, trusses and leak repairs.', 'Home', 20),
  ('Waterproofing Specialists', 'waterproofing-specialists', 'Basement, roof and wet area waterproofing and damp proofing.', 'Droplets', 21),
  ('Window Blind & Shutter Installers', 'window-blind-installers', 'Roller, vertical and venetian blinds plus window shutters.', 'Blinds', 22),
  ('Borehole & Water System Specialists', 'borehole-water-systems', 'Borehole drilling, pumps, tanks and water treatment.', 'Droplet', 23),
  ('Solar & Renewable Energy Installers', 'solar-installers', 'Solar panels, inverters, batteries and solar water heating.', 'Sun', 24),
  ('HVAC & Air Conditioning Technicians', 'hvac-technicians', 'Air conditioning, ducting, cold rooms and ventilation.', 'Wind', 25),
  ('Welders & Metal Fabricators', 'welders-metal-fabricators', 'Steel gates, railings, structural steel and metal roofing.', 'Flame', 26),
  ('Masons & Blockwork Artisans', 'masons-blockwork', 'Blockwork, plastering, concrete works and stone cladding.', 'Blocks', 27),
  ('Paving & Interlocking Specialists', 'paving-interlocking', 'Interlocking stones, kerbs, drainage and driveways.', 'Grid3x3', 28),
  ('Landscapers & Gardeners', 'landscapers-gardeners', 'Garden design, lawns, irrigation and tree works.', 'Trees', 29),
  ('Land Surveyors', 'land-surveyors', 'Site surveys, setting out and topographic surveys.', 'Compass', 30),
  ('Scaffolding & Access Specialists', 'scaffolding-access', 'Scaffold erection, hire and inspection.', 'Layers', 31),
  ('Demolition & Site Clearance', 'demolition-site-clearance', 'Building demolition, debris removal and site clearing.', 'Truck', 32)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pro_services (name, slug, category_id, sort_order) VALUES
  -- Roofers
  ('Roof Installation', 'roof-installation', (SELECT id FROM pro_categories WHERE slug = 'roofers'), 1),
  ('Roof Repairs', 'roof-repairs', (SELECT id FROM pro_categories WHERE slug = 'roofers'), 2),
  ('Roof Leak Repairs', 'roof-leak-repairs', (SELECT id FROM pro_categories WHERE slug = 'roofers'), 3),
  ('Roof Sheeting & Trusses', 'roof-sheeting-trusses', (SELECT id FROM pro_categories WHERE slug = 'roofers'), 4),
  -- Waterproofing Specialists
  ('Basement Waterproofing', 'basement-waterproofing', (SELECT id FROM pro_categories WHERE slug = 'waterproofing-specialists'), 1),
  ('Roof Waterproofing', 'roof-waterproofing', (SELECT id FROM pro_categories WHERE slug = 'waterproofing-specialists'), 2),
  ('Wet Area Waterproofing', 'wet-area-waterproofing', (SELECT id FROM pro_categories WHERE slug = 'waterproofing-specialists'), 3),
  ('Damp Proofing', 'damp-proofing', (SELECT id FROM pro_categories WHERE slug = 'waterproofing-specialists'), 4),
  -- Window Blind & Shutter Installers
  ('Roller Blinds', 'roller-blinds', (SELECT id FROM pro_categories WHERE slug = 'window-blind-installers'), 1),
  ('Vertical Blinds', 'vertical-blinds', (SELECT id FROM pro_categories WHERE slug = 'window-blind-installers'), 2),
  ('Venetian Blinds', 'venetian-blinds', (SELECT id FROM pro_categories WHERE slug = 'window-blind-installers'), 3),
  ('Window Shutters', 'window-shutters', (SELECT id FROM pro_categories WHERE slug = 'window-blind-installers'), 4),
  -- Borehole & Water System Specialists
  ('Borehole Drilling', 'borehole-drilling', (SELECT id FROM pro_categories WHERE slug = 'borehole-water-systems'), 1),
  ('Water Pump Installation', 'water-pump-installation', (SELECT id FROM pro_categories WHERE slug = 'borehole-water-systems'), 2),
  ('Water Treatment Systems', 'water-treatment-systems', (SELECT id FROM pro_categories WHERE slug = 'borehole-water-systems'), 3),
  ('Overhead Tank Installation', 'overhead-tank-installation', (SELECT id FROM pro_categories WHERE slug = 'borehole-water-systems'), 4),
  -- Solar & Renewable Energy Installers
  ('Solar Panel Installation', 'solar-panel-installation', (SELECT id FROM pro_categories WHERE slug = 'solar-installers'), 1),
  ('Inverters & Batteries', 'inverters-batteries', (SELECT id FROM pro_categories WHERE slug = 'solar-installers'), 2),
  ('Solar Water Heating', 'solar-water-heating', (SELECT id FROM pro_categories WHERE slug = 'solar-installers'), 3),
  -- HVAC & Air Conditioning Technicians
  ('AC Installation', 'ac-installation', (SELECT id FROM pro_categories WHERE slug = 'hvac-technicians'), 1),
  ('AC Servicing', 'ac-servicing', (SELECT id FROM pro_categories WHERE slug = 'hvac-technicians'), 2),
  ('Ducting & Ventilation', 'ducting-ventilation', (SELECT id FROM pro_categories WHERE slug = 'hvac-technicians'), 3),
  ('Cold Room Installation', 'cold-room-installation', (SELECT id FROM pro_categories WHERE slug = 'hvac-technicians'), 4),
  -- Welders & Metal Fabricators
  ('Steel Gates', 'steel-gates', (SELECT id FROM pro_categories WHERE slug = 'welders-metal-fabricators'), 1),
  ('Railings & Balustrades', 'railings-balustrades', (SELECT id FROM pro_categories WHERE slug = 'welders-metal-fabricators'), 2),
  ('Structural Steelwork', 'structural-steelwork', (SELECT id FROM pro_categories WHERE slug = 'welders-metal-fabricators'), 3),
  ('Metal Roofing Fabrication', 'metal-roofing-fabrication', (SELECT id FROM pro_categories WHERE slug = 'welders-metal-fabricators'), 4),
  -- Masons & Blockwork Artisans
  ('Blockwork', 'blockwork', (SELECT id FROM pro_categories WHERE slug = 'masons-blockwork'), 1),
  ('Plastering', 'plastering', (SELECT id FROM pro_categories WHERE slug = 'masons-blockwork'), 2),
  ('Concrete Works', 'concrete-works', (SELECT id FROM pro_categories WHERE slug = 'masons-blockwork'), 3),
  ('Stone & Marble Cladding', 'stone-marble-cladding', (SELECT id FROM pro_categories WHERE slug = 'masons-blockwork'), 4),
  -- Paving & Interlocking Specialists
  ('Interlocking Stones', 'interlocking-stones', (SELECT id FROM pro_categories WHERE slug = 'paving-interlocking'), 1),
  ('Kerbs & Drainage', 'kerbs-drainage', (SELECT id FROM pro_categories WHERE slug = 'paving-interlocking'), 2),
  ('Driveway Paving', 'driveway-paving', (SELECT id FROM pro_categories WHERE slug = 'paving-interlocking'), 3),
  -- Landscapers & Gardeners
  ('Garden Design', 'garden-design', (SELECT id FROM pro_categories WHERE slug = 'landscapers-gardeners'), 1),
  ('Lawn Installation', 'lawn-installation', (SELECT id FROM pro_categories WHERE slug = 'landscapers-gardeners'), 2),
  ('Irrigation Systems', 'irrigation-systems', (SELECT id FROM pro_categories WHERE slug = 'landscapers-gardeners'), 3),
  ('Tree Trimming', 'tree-trimming', (SELECT id FROM pro_categories WHERE slug = 'landscapers-gardeners'), 4),
  -- Land Surveyors
  ('Site Survey', 'site-survey', (SELECT id FROM pro_categories WHERE slug = 'land-surveyors'), 1),
  ('Setting Out', 'setting-out', (SELECT id FROM pro_categories WHERE slug = 'land-surveyors'), 2),
  ('Topographic Survey', 'topographic-survey', (SELECT id FROM pro_categories WHERE slug = 'land-surveyors'), 3),
  -- Scaffolding & Access Specialists
  ('Scaffold Erection', 'scaffold-erection', (SELECT id FROM pro_categories WHERE slug = 'scaffolding-access'), 1),
  ('Scaffold Hire & Inspection', 'scaffold-hire-inspection', (SELECT id FROM pro_categories WHERE slug = 'scaffolding-access'), 2),
  -- Demolition & Site Clearance
  ('Building Demolition', 'building-demolition', (SELECT id FROM pro_categories WHERE slug = 'demolition-site-clearance'), 1),
  ('Debris Removal', 'debris-removal', (SELECT id FROM pro_categories WHERE slug = 'demolition-site-clearance'), 2),
  ('Site Clearing', 'site-clearing', (SELECT id FROM pro_categories WHERE slug = 'demolition-site-clearance'), 3)
ON CONFLICT (slug) DO NOTHING;
