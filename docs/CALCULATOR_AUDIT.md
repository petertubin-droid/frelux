# Calculator Audit Ledger (structure and building services)

Started 2026-11-21. Owner mandate: audit every building-structure and
building-services calculator, one after another, for correctness, completeness,
global readiness and code compliance.

Method: each calculator is audited by writing a conformance suite whose
expectations come from the published standard (BS, EN, ACI, IEC, ASTM), not from
the code under test. A test that merely restates the implementation proves
nothing. Where the engine and the standard disagree, the finding is recorded here
before any code changes.

Evidence labels: `verified live` means checked against the production database or
a real model file; `CI green only` means the suite passes but nothing live has
been exercised; `staged` means written but not executed.

---

## Status summary

| #   | Calculator                         | Category  | Status                                                                          |
| --- | ---------------------------------- | --------- | ------------------------------------------------------------------------------- |
| 1   | Foundation Designer                | structure | **Audited 2026-11-21**, 18 tests, no arithmetic defect                          |
| 2   | Reinforcement / Steel              | structure | **Audited 2026-11-21**, 15 tests, no defect in anchorage or laps                |
| 3   | ICF Wall Estimator                 | structure | **Audited 2026-11-21**, 19 tests, no defect in geometry or envelope             |
| 4   | Concrete & Structural              | structure | **Audited 2026-11-21**, 16 tests, 2 DEFECTS FIXED: IS 456 tau_c and ACI axial   |
| 5   | Concrete Slab Takeoff              | structure | **Audited 2026-11-21**, 11 tests, no defect in mix or rebar mass                |
| 6   | Earthworks Cut & Fill              | structure | **Audited 2026-11-21**, 8 tests, no defect in volumes or soil conversion        |
| 7   | Retaining Wall Calculator          | structure | **Audited 2026-11-21**, 9 tests, DEFECT FIXED: overturning 1.5 -> 2.0 (BS 8002) |
| 8   | Roof Framing & Board Feet          | structure | **Audited 2026-11-21**, 12 tests, DEFECT FIXED: sections entered as actual      |
| 9   | Masonry & Blockwork                | structure | **Audited 2026-11-21**, 17 tests, no defect in module, mortar or cement         |
| 10  | German Floor Calculator            | structure | Queued                                                                          |
| 11  | Fence Block Calculator             | structure | Queued                                                                          |
| 12  | Drywall & Partitions               | structure | Queued                                                                          |
| 13  | Paving & External Works            | structure | Queued                                                                          |
| 14  | Formwork & Temporary Works         | structure | Queued                                                                          |
| 15  | Demolition & Debris Takeoff        | structure | Queued                                                                          |
| 16  | Steel I-Beam Weight                | structure | Queued                                                                          |
| 17  | Soffit, Fascia & Gutter            | structure | Queued                                                                          |
| 18  | Overhead Water Tank Staging        | structure | Queued                                                                          |
| 19  | Tall Building Structure            | structure | Queued                                                                          |
| 20  | Build-to-Roof Estimator            | structure | Queued (engine has tests, page chain untested)                                  |
| 21  | Mathematical Plan Elevation        | structure | Queued                                                                          |
| 22  | Foundation Cost Estimate           | structure | Queued                                                                          |
| 23  | Plumbing                           | services  | Queued                                                                          |
| 24  | Electrical Wiring                  | services  | Queued                                                                          |
| 25  | Conduit & Wiring Loops             | services  | Queued                                                                          |
| 26  | Solar PV Estimator                 | services  | Queued                                                                          |
| 27  | Backup Power / Generator           | services  | Queued                                                                          |
| 28  | Heat & Comfort                     | services  | Queued                                                                          |
| 29  | Autonomous Borehole & Water Supply | services  | Queued                                                                          |
| 30  | Septic & Soakaway Worksheet        | services  | Queued                                                                          |
| 31  | External Drainage Takeoff          | services  | Queued                                                                          |
| 32  | Live Material Price Index          | services  | Queued                                                                          |
| 33  | International Code Reference       | services  | Queued                                                                          |
| 34  | Climate Material Advisor           | services  | Queued                                                                          |

Queue order is by risk: engines with no tests at all come first, because an
untested engine can be wrong in a way a tested one cannot.

---

## Engines with no test file at all (highest risk)

Found 2026-11-21 by mapping the 34 calculators to `src/lib/estimation/*.ts`:

- `foundation-engine.ts` (685 lines) - **closed** by audit 1.
- `reinforcement-engine.ts` (1319 lines) - **closed** by audit 2.
- `icf-engine.ts` - **closed** by audit 3. `icf-eifs-market.ts`,
  `system-boq-pricing.ts` - open.
- `conduit-wiring-engine.ts`, `mep-conduit-router-engine.ts` - open.
- `plumbing-engine.ts`, `plumbing-profiles.ts` - open.
- `generator-engine.ts` - open.
- `borehole-water-system-engine.ts` - open.

---

## Audit 9: Masonry & Blockwork (`masonry-standalone-engine.ts`)

Suite: `src/lib/estimation/__tests__/masonry-conformance.test.ts`, 17 tests,
CI green only. Rates are worked in the test from the module.

Verified correct:

- Units per m2 from the jointed module, 1/((L + j)(H + j)): the Nigerian
  9-inch sandcrete block at a 12 mm joint gives 9.13, the US CMU at its 3/8
  inch joint gives 12.43, and a UK facing brick at 10 mm gives 59.26. Widening
  the joint orders fewer units, as it must.
- Leaf count scales the order and the mortar without changing the face rate,
  so a two-leaf wall is not billed as one.
- Openings are deducted by area and quantity (30 m2 gross less 7.89 m2 of
  openings gives 22.11 m2 net), the wall count multiplies, and openings larger
  than the wall hold the net at zero with a notice rather than a negative
  quantity.
- Solid mortar is wall volume less unit volume, exactly, on the 125 mm solid
  block.
- Hollow mortar scales with the joint, doubling when the joint doubles, which
  is the correction recorded in the code from an earlier pass.
- Dry factor 1.33, then the mix split (1:5 gives cement one part in six), then
  cement at 1440 kg/m3 and whole bags; water at a 0.55 water/cement ratio by
  mass; a richer mix orders more cement from the same mortar volume.
- The cement bag mass is the market's own (50 kg NG, 42.6 kg US), not a fixed
  50 kg, and a market with no maintained profile is flagged as an unverified
  placeholder instead of being presented as fact.
- Custom units are used when complete, ignored with a notice naming the unit
  actually used when incomplete, and an unknown unit id falls back to the
  market default with a notice.

Recorded, not changed:

- The hollow-unit mortar allowance is a calibration (0.018 m3 per m2 at 200 mm)
  scaled by thickness and joint, not a geometric derivation from web and
  face-shell dimensions. Deriving it per unit profile would be more exact and
  is a candidate for a later pass; the current figure is inside the published
  0.015 to 0.022 m3 per m2 band.
- Mason and helper hours use one fixed productivity (0.06 h per block, 0.03 h
  per brick) for every market. Productivity is market-specific, so this is a
  labour-rate gap rather than a quantity defect, and it belongs with the
  market labour rates rather than in the quantity engine.

---

## Audit 8: Roof Framing & Board Feet (`advanced-takeoff-engine.ts`)

Suite: `src/lib/estimation/__tests__/roof-framing-conformance.test.ts`, 12 tests,
CI green only. Geometry is worked in the test from the plan.

Verified correct:

- Gable: ridge at the extended building length, rise at half span x tan(pitch),
  rafter measured along the slope (4.5 m plan run at 6:12 is 5.031 m of rafter,
  longer than the run). At 12:12 the rise equals the half span and the rafter is
  half span x sqrt(2).
- Rafter counts land on real spacing: ceil(11 / 0.6) = 19 intervals, so 20
  positions per slope and 40 in total, with the 0.579 m actual spacing printed
  rather than the requested 0.6 m.
- Hip: ridge is long eave less short eave (11 - 9 = 2 m), four hips at
  half span x sqrt(2 + tan^2 pitch), no ridge at all on a square hip, and no
  jack longer than the full run to the ridge.
- Board feet = length (ft) x width (in) x depth (in) / 12, checked against a
  single 10 ft 2x4 (4.375 BF), with group totals summing to the reported total.
- Valleys are refused rather than guessed, and the refusal is printed.

Defect found and fixed:

1. **The page asked for "actual" inches while board feet are traded on nominal
   inches.** The engine is right, but the guidance told the user to enter the
   milled size, so a 2 x 4 was entered as 1.5 x 3.5 and the board feet came out
   33 per cent below what a yard bills for the same timber. The fields now read
   "Width (in, nominal)" and the note says a 2 x 4 is entered as 2 and 4, with
   the milled size shown for clarity. A page test locks the wording so it
   cannot drift back.

Recorded, not changed:

- The takeoff section fields accept inches only. The market timber schedule
  (`timber-sections.ts`, milled sizes and stock lengths per market) is wired to
  the section-properties panel but not to the takeoff fields, so a metric user
  converts by hand. Offering a market preset that writes nominal inches is a
  small follow-up, not a correctness fix.
- Member counts are geometric quantities, not a structural design; the
  assumptions say so.

---

## Audit 5: Concrete Slab Takeoff (`advanced-takeoff-engine.ts`)

Suite: `src/lib/estimation/__tests__/concrete-takeoff-conformance.test.ts`,
11 tests, CI green only. Expected quantities are the published nominal-mix
figures, worked in the test from the dry-volume method.

Verified correct:

- 1:2:4 at 1 m3 wet gives 6.34 bags of 50 kg, 0.44 m3 sand and 0.88 m3
  granite, procured as 7 whole bags. That is the site figure the method
  produces, and the engine reproduces it to two decimals.
- 1:1.5:3 gives 8.06 bags, procured as 9. 1:3:6 gives 4.43, procured as 5.
- A 25 kg market bag doubles the count (12.67, procured as 13), so the same
  mix is right in every market that sells a different pack.
- The allowance is applied to the wet volume before the 1.54 dry factor, which
  is the correct order and matches audit 1's finding on the same method.
- Scheduled rebar weight uses the BS 4449 nominal mass 0.006165 d squared
  (T16 1.578 kg/m, T12 0.888 kg/m) and is reported as null, not zero, when no
  schedule is entered. Rows with a zero count are dropped rather than counted.
- Missing or non-positive dimensions return errors with no data, so a blank
  field cannot produce a quantity.

Recorded, not changed:

- The volume is a rectangular prism. Haunches, drops, slab openings and
  irregular geometry are neither deducted nor added, and the assumptions list
  says so rather than implying a measured model.
- Bar displacement is not deducted from the concrete volume. At normal
  reinforcement ratios it is well under one per cent, and deducting it would
  put the engine below the quantity a supplier invoices.

---

## Audit 6: Earthworks Cut & Fill (`advanced-takeoff-engine.ts`)

Suite: `src/lib/estimation/__tests__/earthworks-conformance.test.ts`, 8 tests,
CI green only.

Verified correct:

- Average end-area volumes, interval by interval: two stations 100 m apart at
  10 and 20 m2 give 1500 m3, and a three-station run gives 750 + 1000 = 1750
  m3, so intervals are added rather than the whole run being averaged once.
- Bulking converts bank cut to loose haul only, and shrinkage converts
  compacted fill back to a bank source volume only. 900 m3 compacted at 10 per
  cent shrinkage needs 1000 m3 of bank material. The two factors never touch
  the same figure.
- The balance is split into a surplus or an import, never both, and both are
  suppressed to null when the user has not confirmed the cut is suitable for
  fill. The measured volumes are still reported in that case, which is the
  honest split between measurement and reuse claim.
- Fewer than two stations, duplicated or reversed chainages, and a shrinkage of
  100 per cent (no finite source volume) are all refused with errors.

Recorded, not changed:

- No prismoidal correction is offered. Average end-area over-states volume
  where the areas change non-linearly, which is conservative for cut and for
  haul, so the simpler method stays and the assumption is printed.
- Topsoil strip and subgrade layer volumes are not part of the model; they are
  separate measured items in earthworks practice.

---

## Audit 4: Concrete & Structural (`structural-calculator.ts`)

Suite: `src/lib/engineering/__tests__/structural-conformance.test.ts`, 16 tests,
CI green only. Expected values are computed in the test from the clause, not
read back from the engine.

Verified correct against the published clauses:

- BS 8110-1 Table 3.9 basic span/effective depth ratios: cantilever 7, simply
  supported 20, continuous and fixed 26. Correct.
- EN 1992-1-1 Table 3.1: fctm = 0.30 fck^(2/3) to C50/60, then
  2.12 ln(1 + fcm/10). Both branches correct.
- Minimum tension steel, all five codes, each from its own clause and with no
  blending between them: EC2 9.2.1.1 max(0.26 fctm/fyk, 0.0013) including the
  floor case; ACI 318-19 9.6.1.2 max(0.25 sqrt(f'c)/fy, 1.4/fy) including the
  1.4/fy floor case; BS 8110-1 Table 3.25 at 0.24 per cent for fy 250 and 0.13
  per cent for fy 460; IS 456 26.5.1.1 at 0.85/fy.
- EN 1992-1-1 6.2.2 VRd,c reproduced by hand on a 300 x 500 section with 1000
  mm2 of steel: k = 1.632, vRdc = 0.5315 MPa, 79.7 kN. Matches.
- ACI 318-19 Table 22.5.5.1(a) with no axial force: 0.17 sqrt(f'c) = 0.8996 MPa
  on 250 x 500. Matches.
- Beam statics: a 6 m simply supported beam at 66 kN/m factored gives
  wL^2/8 and wL/2 on the effective span, and the recommended depth never falls
  below the Table 3.9 minimum of L/20.

Defects found and fixed:

1. **IS 456 shear capacity was read at the wrong point on Table 19.** The
   closed form printed in the code is

       tau_c = 0.85 sqrt(0.8 fck) (sqrt(1 + 5 beta) - 1) / (6 beta)
       beta  = 0.8 fck / (6.89 pt)

   and the engine fed `pt` where `beta` belongs. Because beta is the reciprocal
   kind of quantity (5.8 at pt 0.5 per cent on M25), substituting pt reads the
   table at a reinforcement ratio several times the real one. M25 at 0.5 per
   cent returned 1.10 N/mm2 against the table's 0.49, and M20 at 1.0 per cent
   returned 0.82 against 0.62. The error was unconservative, so links would
   have been under-designed on any IS 456 job. Now computed with beta, with
   beta floored at 1 as the code requires, and locked by two table values.

2. **The ACI axial term was not ACI's.** Table 22.5.5.1 makes the axial
   benefit multiplicative on the concrete term,
   0.17 lambda sqrt(f'c) (1 + Nu/(14 Ag)), capped at 0.42 lambda sqrt(f'c).
   The engine added Nu/(6 Ag) as a separate stress instead, which is about 2.6
   times the code's bonus at 28 MPa: 1.34 MPa against 1.13 on a 250 x 550
   section at 500 kN. Now multiplicative and capped. The factor needs a gross
   area, so `memberDepthMm` was added to the input; when it is not supplied the
   axial benefit is left out entirely and the explanation says so, because
   guessing Ag from d alone was the source of the overstatement.

Recorded, not changed:

- IS 456 Cl 40.2.1.1 scales tau_c by k, which is above 1 for sections shallower
  than 300 mm. The engine does not apply k, so shallow sections are
  under-stated, never over-stated. Adding it changes existing Indian estimates,
  so it is left for a turn that can show the before and after.
- EC2 and BS 8110 axial stress used 1.5 b d as a stand-in for the gross area,
  which understates Ac and therefore the benefit. With `memberDepthMm` supplied
  the code's own NEd/Ac is used; the proxy survives only as the no-depth
  fallback and is documented in the explanation.

---

## Audit 1: Foundation Designer (`foundation-engine.ts`)

Suite: `src/lib/estimation/foundation-engine.test.ts`, 18 tests, CI green only.

Verified against published values:

- 1.54 dry-volume factor and 1:2:4 batching: 1 m3 wet concrete = 6.34 bags, so
  7 whole 50 kg bags, 1 m3 sand, 1 m3 granite. Correct.
- Bag volume = mass / 1440 kg/m3, so a 25 kg bag doubles the count (13 bags).
- Market packs: GB prices 25 kg bags, NG 50 kg. Correct.
- Waste is applied before the dry factor, which is the right order.
- Block module: 450 x 225 mm at a 12 mm joint = 9.13 blocks/m2.

Findings:

1. **Mortar joint is 12 mm**, not the 10 mm nominal in BS EN 1996-1-1. The
   standard permits 8-12 mm, and 12 mm over-supplies by ~1.3% rather than
   under-supplying, so it is kept and now locked by a test that also asserts the
   joint stays inside the permitted band. Changing it would silently move every
   existing blockwork estimate by 1.3%.
2. **Block price key is `block-per-piece` (singular).** Live price book has it
   active for all 22 markets (verified live 2026-11-21), so blockwork is priced
   in production. A plural key would have left the line permanently unpriced.
3. **`material_subtotal` stands while `grand_total` is withheld** when any
   measurement is blank. This is the intended honesty rule and is now locked.

Not in scope of this engine, and still true: it estimates materials, it does not
design a foundation. Footing size, depth and reinforcement remain engineering
decisions, and the engine says so in its warnings.

---

## Audit 2: Reinforcement / Steel (`reinforcement-engine.ts`)

Suite: `src/lib/estimation/reinforcement-engine.test.ts`, 15 tests, CI green only.

Verified against the clauses:

- BS 8110-1 Cl 3.12.8.3 derivation reproduces the 40db table value for grade 460
  in grade 30 concrete to within one bar diameter. Correct.
- C20 concrete anchors 1.22x longer than C30 (sqrt(30/20)): the historical
  short-lap defect is genuinely fixed, not just commented.
- Compression anchorage is 0.8 of tension (Table 3.27 32db vs 40db).
- EN 1992-1-1 8.4.4 and 8.7.3 are delegated to the engineering library, so the
  schedule and the engine cannot disagree about one clause.
- ACI 318-19 accepts psi or MPa for f'c without changing the result, applies the
  25/20 divisor split at No. 6, and Class B (1.3 ld) only when over half lap.
- Stock cutting shares a 12 m bar between two 5 m cuts (0.5 bars per cut) and
  rounds up only when a cut exceeds stock.

Findings:

1. **The BS 250 mm lap floor is unreachable.** The anchorage floor is 300 mm, so
   the smallest possible lap is 1.15 x 300 = 345 mm. Harmless dead guard, kept
   and documented rather than removed, because removing a floor from a safety
   function needs more thought than an audit turn allows.
2. Bar diameter 0 or negative returns 0 rather than dividing by zero. Correct.

---

## Open questions carried forward

0. **Repo typecheck is red on the pulled main, not from this audit.**
   `npx tsc --noEmit` reports `AdminLayout.tsx` adding a `Languages` nav item the
   `NavItem` type does not declare, and `AdminTileMaterials.tsx` reading a
   `currency` field that is not in its row type. Both are in admin code from
   commit 9722a39c and block `npm run typecheck` in CI.

1. **Price-book sanity, not calculator logic.** `block-per-piece` for CH is
   23.98 CHF per block against 0.48 EUR in DE. That is a data defect, not an
   engine defect, and belongs to a price-book audit pass.
2. Calculators whose page assembles several engines (Build-to-Roof, ICF, EIFS)
   need a page-level audit, because the defect surface is the wiring between
   engines, not any single engine.
3. Services category is untouched. It starts at plumbing, then conduit wiring,
   then generator and borehole, in that order.

---

## Audit 10: German Floor (`german-floor.ts`)

Suite: `src/lib/estimation/__tests__/german-floor-conformance.test.ts`, 10 tests.
Evidence: `CI green only`.

The page calls this a German floor; the engine's own term is the standard one,
slab-on-grade, and it says so in the result.

Verified against site practice:

- Layer volumes are area times thickness for hardcore, blinding and slab.
- Hardcore is bought loose at 1.25 times its compacted volume, because 150 mm
  of fill is 150 mm only after compaction. The 100 m2 floor orders 19.688 m3
  for 15 m3 placed.
- Concrete runs wet to dry to parts: 10 m3 slab plus 5 per cent is 16.17 m3 dry
  at the 1.54 factor, which splits 1:2:4 into 2.31 m3 cement, 4.62 sand and
  9.24 granite. At 1440 kg/m3 that is 67 whole 50 kg bags, and a 25 kg pack
  doubles the count for the same mass.
- Membrane is bought at the floor area plus 10 per cent for the laps between
  rolls: 100 m2 floor, 110 m2 ordered.

Findings:

1. **DEFECT FIXED: blinding sand was the one layer with no allowance.** The
   assumptions panel promises that 5 per cent is added to every layer, and the
   sand order read the blinding layer's neat volume, so a 5 m3 blinding bed was
   ordered as 5 m3 while the slab beside it was ordered at 10.5. The order now
   uses the blinding purchase volume, 5.25 m3. This is a 5 per cent increase on
   one line of every slab estimate, which is why it is recorded rather than
   slipped in.
2. Blinding is modelled as sand, not as a weak concrete. That is a deliberate
   simplification, it is stated in the assumptions, and it is not changed here:
   a 1:4:8 blinding mix would need cement the engine does not buy.
3. Cement pack size comes from the market with a named 50 kg fallback and a
   warning when the market has no pack configured, so a market without a profile
   is told rather than silently given a Nigerian bag.
