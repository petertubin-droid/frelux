-- =========================================================
-- DEFS DICTIONARY TERMS (2026-11-20)
--
-- Four English canonical terms so the DEFS bill of quantities can be
-- translated by the existing technical-label pipeline:
--   cement sheathing board, alkali-resistant joint tape,
--   weep screed track, corrosion-resistant board screws.
--
-- country and region are NOT NULL on this table and default to NG and West
-- Africa. These are the DEFS (direct-applied exterior finish) terms used by the
-- North American estimator, so they are recorded as US and North America rather
-- than inheriting a default that would claim Nigerian provenance.
--
-- English rows only. No translation is invented here: translations are added
-- through the admin dictionary workflow, where a human verifies them, and the
-- construction_terms CHECK gates keep provisional rows from claiming
-- verification.
--
-- The canonical_term values match the DEFS BOQ descriptions exactly (case
-- insensitive), because the label translator substitutes on a longest-match
-- basis and an unmatched string stays in English by design.
-- =========================================================

INSERT INTO public.construction_terms (
  canonical_term, category, definition, technical_definition, simple_definition,
  language, translation, alternative_terms, local_terms, synonyms, abbreviations,
  unit, measurement_type, construction_context, example_usage, related_terms,
  common_mistakes, translation_notes, country, region, source, source_date,
  confidence_score, verified, verified_by, translation_status, keep_in_english,
  explanation_required, source_details, version
) VALUES
  (
    'cement sheathing board',
    'finishing',
    'A moisture-resistant cement-based board fixed to framing as the backing for a direct-applied exterior finish.',
    'Fiber-cement or cement-bonded sheathing board, typically 1.2 x 2.4 m, screwed to studs at the published spacing and taped at the joints before the base coat.',
    'The stiff board a direct-applied finish is spread onto when there is no foam insulation.',
    'en', NULL, ARRAY['cement board', 'fiber cement board'], ARRAY[]::text[], ARRAY['cement board', 'fiber cement board'], ARRAY[]::text[],
    'm2', 'area',
    'Used in DEFS on framed walls: the board is screwed off, the joints are taped, then the mesh and base coat go straight onto it.',
    'Fix the cement sheathing board before the base coat.',
    ARRAY['base coat', 'joint tape'],
    ARRAY['Using interior plasterboard where a moisture-resistant board is required'],
    NULL, 'US', 'North America', 'FRELUX DEFS estimator (Wave 2.1)', '2026-11-20',
    0.9, false, NULL, 'provisional', false, false, NULL, 1
  ),
  (
    'alkali-resistant joint tape',
    'finishing',
    'A mesh tape laid over board joints so the base coat cannot crack along the seam.',
    'Alkali-resistant fiberglass seam tape bedded in the first pass of base coat at every board joint, before the full-field reinforcing mesh.',
    'Tape that stops the base coat cracking where two boards meet.',
    'en', NULL, ARRAY['scrim tape', 'seam tape'], ARRAY[]::text[], ARRAY['scrim tape', 'seam tape'], ARRAY[]::text[],
    'm', 'length',
    'About 1.15 m of tape is taken per square metre of board in a direct-applied system.',
    'Bed the alkali-resistant joint tape at every board seam.',
    ARRAY['cement sheathing board', 'base coat'],
    ARRAY['Skipping the tape because the full-field mesh is specified anyway'],
    NULL, 'US', 'North America', 'FRELUX DEFS estimator (Wave 2.1)', '2026-11-20',
    0.9, false, NULL, 'provisional', false, false, NULL, 1
  ),
  (
    'weep screed track',
    'finishing',
    'The perforated metal track at the base of the wall that carries the finish and lets moisture out.',
    'Galvanised or PVC weep screed fixed at the foundation line, providing a drip edge and drainage path behind the base coat.',
    'The metal strip at the bottom of the wall that lets water out.',
    'en', NULL, ARRAY['starter track', 'weep screed'], ARRAY[]::text[], ARRAY['starter track', 'weep screed'], ARRAY[]::text[],
    'm', 'length',
    'Counted along the facade perimeter in stock lengths of 3.0 m, or 10 ft in the US and Canada.',
    'Set the weep screed track before the first board goes on.',
    ARRAY['casing bead', 'base coat'],
    ARRAY['Running the base coat to the ground with no drainage path'],
    NULL, 'US', 'North America', 'FRELUX DEFS estimator (Wave 2.1)', '2026-11-20',
    0.9, false, NULL, 'provisional', false, false, NULL, 1
  ),
  (
    'corrosion-resistant board screws',
    'finishing',
    'Coated or stainless screws that hold the sheathing board to the framing without rusting through the finish.',
    'Corrosion-resistant self-drilling screws at 18 to 22 per board, driven flush so the head never telegraphs through the base coat.',
    'Rust-proof screws that fix the board to the wall.',
    'en', NULL, ARRAY['board screws', 'sheathing screws'], ARRAY[]::text[], ARRAY['board screws', 'sheathing screws'], ARRAY[]::text[],
    'pcs', 'count',
    'About 7 screws per square metre of board in a direct-applied exterior system.',
    'Use corrosion-resistant board screws at the published spacing.',
    ARRAY['cement sheathing board'],
    ARRAY['Using drywall screws that corrode and bleed through the finish'],
    NULL, 'US', 'North America', 'FRELUX DEFS estimator (Wave 2.1)', '2026-11-20',
    0.9, false, NULL, 'provisional', false, false, NULL, 1
  )
ON CONFLICT (canonical_term, language) DO NOTHING;
