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

| #   | Calculator                         | Category  | Status                                                                                     |
| --- | ---------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| 1   | Foundation Designer                | structure | **Audited 2026-11-21**, 18 tests, no arithmetic defect                                     |
| 2   | Reinforcement / Steel              | structure | **Audited 2026-11-21**, 15 tests, no defect in anchorage or laps                           |
| 3   | ICF Wall Estimator                 | structure | **Audited 2026-11-21**, 19 tests, no defect in geometry or envelope                        |
| 4   | Concrete & Structural              | structure | **Audited 2026-11-21**, 16 tests, 2 DEFECTS FIXED: IS 456 tau_c and ACI axial              |
| 5   | Concrete Slab Takeoff              | structure | **Audited 2026-11-21**, 11 tests, no defect in mix or rebar mass                           |
| 6   | Earthworks Cut & Fill              | structure | **Audited 2026-11-22**, 7 tests, no arithmetic defect (end-area bias documented)           |
| 7   | Retaining Wall Calculator          | structure | **Audited 2026-11-21**, 9 tests, DEFECT FIXED: overturning 1.5 -> 2.0 (BS 8002)            |
| 8   | Roof Framing & Board Feet          | structure | **Audited 2026-11-21**, 12 tests, DEFECT FIXED: sections entered as actual                 |
| 9   | Masonry & Blockwork                | structure | **Audited 2026-11-21**, 17 tests, no defect in module, mortar or cement                    |
| 10  | German Floor Calculator            | structure | **Audited 2026-11-21**, 10 tests, DEFECT FIXED: blinding sand lacked allowance             |
| 11  | Fence Block Calculator             | structure | **Audited 2026-11-21**, 18 tests, no defect in blocks, mortar or footing                   |
| 12  | Drywall & Partitions               | structure | **Audited 2026-11-21**, 17 tests, DEFECT FIXED: tape and compound per layer                |
| 13  | Paving & External Works            | structure | **Audited 2026-11-21**, 26 tests, DEFECT FIXED: jointing sand was missing                  |
| 14  | Formwork & Temporary Works         | structure | **Audited 2026-11-21**, 20 tests, 2 DEFECTS FIXED: half the standards, phantom frame       |
| 15  | Demolition & Debris Takeoff        | structure | **Audited 2026-11-21**, 18 tests, COMPLETENESS FIXED: no debris mass                       |
| 16  | Steel I-Beam Weight                | structure | **Audited 2026-11-21**, 13 tests, DEFECT FIXED: IPE 150 does not exist                     |
| 17  | Soffit, Fascia & Gutter            | structure | **Audited 2026-11-21**, 16 tests, DEFECT FIXED: soffit corners counted twice               |
| 18  | Overhead Water Tank Staging        | structure | **Audited 2026-11-21**, 23 tests, no arithmetic defect, wind method disclosed              |
| 19  | Tall Building Structure            | structure | **Audited 2026-11-21**, 18 tests, no defect; first suite on a 1,935-line engine            |
| 20  | Build-to-Roof Estimator            | structure | Queued (engine has tests, page chain untested)                                             |
| 21  | Mathematical Plan Elevation        | structure | Queued                                                                                     |
| 22  | Foundation Cost Estimate           | structure | Queued                                                                                     |
| 23  | Plumbing                           | services  | **Audited 2026-11-22**, 36 tests, DEFECT FIXED: cold-only buildings were never completable |
| 24  | Electrical Wiring                  | services  | Queued                                                                                     |
| 25  | Conduit & Wiring Loops             | services  | Queued                                                                                     |
| 26  | Solar PV Estimator                 | services  | Queued                                                                                     |
| 27  | Backup Power / Generator           | services  | Queued                                                                                     |
| 28  | Heat & Comfort                     | services  | Queued                                                                                     |
| 29  | Autonomous Borehole & Water Supply | services  | Queued                                                                                     |
| 30  | Septic & Soakaway Worksheet        | services  | Queued                                                                                     |
| 31  | External Drainage Takeoff          | services  | Queued                                                                                     |
| 32  | Live Material Price Index          | services  | Queued                                                                                     |
| 33  | International Code Reference       | services  | Queued                                                                                     |
| 34  | Climate Material Advisor           | services  | Queued                                                                                     |

Queue order is by risk: engines with no tests at all come first, because an
untested engine can be wrong in a way a tested one cannot.

---

## Safety-factor sweep (2026-11-22)

Prompted by the retaining-wall overturning defect (audit 7), every engine that
states a factor of safety was swept. Two sites exist:

- `retaining-wall-engine.ts`: fixed. Overturning 2.0 (BS 8002), sliding 1.5,
  both named constants, both interpolated into every message, with a
  source-scan guard in the suite so a stale literal cannot return.
- `tank-stand.ts`: 1.5 against wind overturning of an empty elevated tank
  stand. Correct as written: ASCE 7 load combinations give an effective 1.5
  for wind overturning of non-building structures, and the message states the
  expected value.

No other engine states a factor of safety, so no further mismatch remains.

---

## Services audit 1: Plumbing (`plumbing-engine.ts`, ledger #23)

First services calculator audited. 637-line engine, no test file before this.

**Defect fixed.** The file header promises hot water is "included only when the
user provides a hot water run", but `hot_run_m === null` pushed a `missing`
line and named it in `missing[]`. Every cold-only building was therefore
permanently `incomplete` and withheld its grand total, and the user was asked
for a length that did not exist. Hot water is now genuinely optional: the
category is omitted, nothing is added to `missing`, and one warning states the
estimate assumes no hot water system.

**Verified (13 new tests, plus the existing 23 updated):** WSFU ratings per
fixture match IPC Table E103.3(2), including floor drains carrying zero supply
demand; sums are additive; peak flow is monotonic; every header reported
adequate keeps velocity at or under the 1.8 m/s ceiling of BS EN 806-3; a
demand above the largest bore (73.2 mm) is flagged short rather than described
as adequate; storage is 150 L per person per day with a two-person floor;
waste applies before whole-metre rounding; blank runs stay unsized and named;
prices are never invented.

**Documented, not changed:** the peak-flow fit (0.25 WSFU^0.75 below 10, then
0.4 WSFU^0.55) runs conservative against Hunter's curve, roughly +70% at 10
WSFU and +29% at 100, so it oversizes the header rather than undersizing it.
That is the safe direction and the behaviour is now locked by tests.

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

---

## Audit 19: Tall Building Structure (`engineering/tall-building-engine.ts`)

Suite: `src/lib/engineering/__tests__/tall-building-conformance.test.ts`, 18
tests. Evidence label: `CI green only`.

This engine had no test file at all, which is why it sat near the top of the
queue: 1,935 lines producing wind, seismic, gravity, foundation and schedule
output for a tower, with nothing pinning any of it. The suite now works from
ASCE 7-22 and ACI 318-19 rather than from the implementation.

Verified against the published tables:

- Kz reproduces the ASCE 7-22 rows at the heights the table actually tabulates.
  The table steps in feet, so the quoted "10 m" value of 0.98 is the 30 ft row
  (9.144 m); at exactly 10 m the formula gives 1.00, and both readings are
  correct. 15 ft = 0.85, 30 ft = 0.98, 100 ft = 1.26, and exposure B at 30 ft =
  0.70, all reproduced to the table's two decimals.
- Rougher exposure gives a higher coefficient at the same height (B < C < D), and
  the coefficient rises with height and holds its 4.6 m floor rather than
  extrapolating toward zero below it.
- Ec = 4700 sqrt(fc) in MPa, per ACI 318-19 19.2.2: 29,725 MPa at 40 MPa, and
  the ratio between two strengths follows the square root.
- Live load reduction per ASCE 7-22 4.7.2 with KLL = 4: 0.707 at 25 m2, 0.4785
  at 100 m2, floored at 0.50 for one floor and 0.40 for two or more, never above
  1.0.
- Gust effect factor per 26.11.5: rigid at 1 Hz and above with no resonant term
  and G near 0.85, and a flexible case that adds resonance without ever coming
  out below the rigid factor.

Verified as whole-building behaviour: a complete result with a selected system
and a populated check list; the system changes with height; base shear and
overturning moment both grow with height; the top velocity pressure scales with
the square of the wind speed (45 to 60 m/s is 1.78 on pressure); both drift
limits are carried as H/500 and H/400 in millimetres with a storey drift limit
alongside; seismic base shear stays below the seismic weight, as a Cs fraction
must; and the foundation carries a positive service load with an allowable
bearing.

One disclosure checked rather than changed: the engine implements ASCE 7-22 +
ACI 318-19 only, and a caller asking for EN 1991/EN 1992 is told that in the
check list instead of being handed ASCE numbers under a European label. That is
the right behaviour and the suite now pins it.

No arithmetic defect found. Recorded, not changed: the drift band is a plus or
minus 50 per cent stiffness bracket rather than a cracked-section analysis, and
the schedule is a floor-cycle planning figure, not a programme.

## Audit 18: Overhead Water Tank Staging (`water-tower-staging-engine.ts`)

Suite: `src/lib/estimation/__tests__/water-tower-conformance.test.ts`, 23 tests.
Evidence label: `CI green only`.

Expectations are published physics and code rules worked by hand: 1 L of water
is 1 kg, q = 0.613 v^2, the dead-only ultimate case is 1.4 x dead, overturning
resistance is weight x base/2 with a 1.5 factor required, and a four-leg square
base with wind on the diagonal puts the extreme legs at b/sqrt(2).

No arithmetic defect found. Verified correct:

- Loads: a 1,000 L tank is 1,000 kg of water, dead load is water plus tank plus
  deck, and the design load is exactly 1.4 x dead x g.
- Wind: pressure is 0.613 v^2 (552 Pa at 30 m/s) and quadruples when the speed
  doubles. The moment about the base exceeds force x height/2, because the tank
  sits above the frame and adds lever arm.
- Stability is evaluated per load case, and the EMPTY case governs: a full tank
  is stabilised by a tonne of water, an empty one is not, and the reported factor
  is the worst case rather than the normal operating case. That is the single
  most important thing this engine gets right.
- Resisting moment is the case weight x base/2 for each case, the factor of
  safety is resisting over overturning, and a reported pass never sits below 1.5
  on overturning or sliding.
- Leg loads: max + min = half the total vertical load (the couple cancels), and
  max - min = 2M/(b sqrt 2), which is the diagonal wind case.
- Footings: the pad is solved from the worst leg over the allowable bearing, so
  bearing pressure cannot exceed the allowable by construction. Checked across
  400, 200, 150, 100 and 50 kPa. A tower heavy enough for bearing to govern buys
  a bigger pad and more concrete on weaker ground.
- Soil bearing capacity, wind speed and the cement bag weight (via market or
  explicit override) are required inputs and throw rather than defaulting.

Disclosure fixed:

1. **The wind method was not stated.** q = 0.613 v^2 is the BASIC velocity
   pressure. EN 1991-1-4 then applies c_e(z) and ASCE 7 applies K_z K_zt K_d,
   which at 6-10 m in open terrain multiply the pressure by roughly 1.7 to 2.2.
   A designer entering the code's basic wind speed would have been checking the
   tower against a pressure well below the design value. The warnings now name
   the method, the factors that are not applied, and what the entered speed has
   to include. No number changed.

Recorded, not changed:

1. Drag coefficients are 0.8 on the tank cylinder and 2.0 on the frame face at
   20 per cent solidity. EN 1991-1-4 gives about 0.7 for a smooth cylinder, so
   the tank figure is marginally conservative; the frame figure is inside the
   published 1.6-2.0 range for low-solidity lattice towers.
2. A 1,000 L tower sits on the 0.6 m minimum pad whatever the soil, because the
   minimum that lets a gang build and stand on the pad binds first. The engine
   notes when the minimum applies rather than pretending bearing governed.
3. Frame self-weight in the empty case uses a nominal section mass before the
   leg section is chosen, then the cases are rebuilt with the real section. The
   sequence is disclosed in the code comments.

---

## Audit 17: Soffit, Fascia & Gutter (`soffit-gutter-engine.ts`)

Suite: `src/lib/estimation/__tests__/soffit-gutter-conformance.test.ts`, 16
tests. Evidence label: `CI green only`.

Expectations come from the geometry of an eaves line and from how the materials
are bought: a perimeter measured at the fascia, linear runs with a cutting
allowance, a soffit that is a band rather than a strip, and fittings bought as
whole pieces at a spacing.

Defect found and fixed:

1. **DEFECT FIXED: the soffit area counted the four corner squares twice.** The
   engine took the eaves perimeter and multiplied by the overhang, which is a
   strip, not a band. On 15 x 10 m with a 0.6 m overhang that is 32.88 m2
   against a true band of 31.44 m2; the error is exactly 4o^2, so a 1 m overhang
   on the same building over-orders 4 m2 of panel. Where the footprint is known
   the engine now takes (L + 2o)(W + 2o) - L x W, the outer rectangle less the
   building. Where only a measured perimeter is known the strip figure stays,
   because the footprint is not there to subtract, and the step now says it is
   a strip figure with each corner counted once.

Verified correct:

- The eaves perimeter is measured at the fascia, so the overhang adds to all
  four sides: 2(15 + 1.2) + 2(10 + 1.2) = 54.8 m, not 50 m at the wall.
- Fascia and gutter are each the perimeter with the cutting allowance (54.8 m
  at 5 per cent is 57.54 m), and a missing side, a zero length or a negative
  overhang is refused with a reason rather than producing a run.
- Downpipes are whole pieces at the spacing, 54.8 / 12 rounded up to 5, and
  brackets are whole pieces along the gutter, 57.54 / 0.6 rounded up to 96. A
  tighter spacing buys more brackets.
- The soffit line picks its price slug from the chosen material, aluminium or
  PVC, rather than pricing one material under another's name.
- The warnings cover the three things that catch people: measure at the eaves
  not the wall, an overhang past 0.9 m needs a bearer, and outlets, stop ends
  and the receiving water are not in the list.

Recorded, not changed:

1. Downpipes are counted from the gutter run, one every 12 m, rather than from
   the roof area the manufacturer's table uses (roughly 50 to 100 m2 per
   downpipe). A 54.8 m perimeter bungalow therefore gets 5 downpipes where the
   area method might give 2 or 3. It over-orders, the spacing is a rule the
   owner can edit, and under-drainage is the more expensive mistake.
2. Bracket spacing is one figure for both materials, at 600 mm. Aluminium
   systems commonly allow wider centres than PVC; a per-material default is a
   modelling change.
3. Outlets, stop ends, corner pieces, sealant and the soakaway or storage that
   receives the water are outside the model, as the warnings state.

---

## Audit 16: Steel I-Beam Weight (`steel-beam-engine.ts`)

Suite: `src/lib/estimation/__tests__/steel-beam-conformance.test.ts`, 13 tests.
Evidence label: `CI green only`.

Expectations are the published nominal mass per metre for each section, from the
Euronorm IPE series and the British universal beam series. The suite holds the
table, not the engine: where they disagree, the table wins.

Defect found and fixed:

1. **DEFECT FIXED: the engine offered an IPE 150.** The Euronorm IPE series runs
   80, 100, 120, 140, 160, 180... and contains no 150. The entry also carried
   14 kg/m, a mass that matches no published size. Anyone selecting it was
   pricing a section a merchant cannot supply, and a fabricator would substitute
   something else at a different mass. The two nearest real sizes, IPE 140
   (12.9 kg/m) and IPE 160 (15.8 kg/m), now stand in its place, and the preset
   that pointed at it was repointed.
2. **COMPLETENESS: three profiles.** A 254 x 146 UB or an IPE 240, both everyday
   sections, could not be entered at all. The table now carries 19 published
   sizes: IPE 100 to 300 in the standard steps, and universal beams at 203 x 133
   (25/30/37), 254 x 146 (31/37/43) and 305 x 165 (40/46/54), each at its
   published mass.

Verified correct:

- Mass is cut length, not clear span: span plus 300 mm of bearings, times the
  section's kg/m, times the number of beams. A 6 m span of 203 x 133 x 30 is
  6.3 m and 189 kg per beam.
- Tonnage is carried to four decimals, because a per-tonne rate multiplies
  straight into money: 96.32 kg at 1,200,000 per tonne is 115,560, not a figure
  rounded to two places.
- No rate leaves the result incomplete with the mass intact, which is the point
  of the tool: you still learn what you are buying.
- Unknown profile, zero span, zero or fractional beam count are refused with a
  reason, and the open-span guardrail fires past 8 m and not at 8 m.

Recorded, not changed:

1. No offcut or cutting allowance is added. Steel is ordered to cut length and
   merchants weigh what they deliver, so an allowance here would double-count;
   the warning tells the buyer to check weighbridge tickets instead.
2. The 8 m guardrail is a deflection prompt, not a design check, and the
   warnings already say connections, coating, fabrication and erection are
   outside a per-tonne material rate.

---

## Audit 15: Demolition & Debris Takeoff (`demolition-standalone-engine.ts`)

Suite: `src/lib/estimation/__tests__/demolition-conformance.test.ts`, 18 tests.
Evidence label: `CI green only`.

Expectations come from how debris is measured and carted away: geometry in
place, a published bulking band for masonry rubble, a skip that is limited by
mass as well as volume, and the loading fraction that stops a skip being booked
as if rubble filled it edge to edge.

Verified correct:

- Volume in place is length x height x thickness per element, times quantity,
  summed across types. A 5 x 2.5 m wall at 115 mm is 1.4375 m3, and three of
  them are three times that.
- Loose volume is the in-place volume times the bulking factor, default 1.35,
  which sits inside the published 1.3-1.5 band for concrete and brickwork
  rubble.
- Skip loads divide the loose volume by nominal capacity times loading
  efficiency, and round a part-filled skip up: 1.94 m3 loose against a 6.1 m3
  skip at 0.85 usable is one booking, four walls is two.
- No capacity, or a zero loading efficiency, returns null rather than a divide
  by zero or an invented count.
- A bulking factor below 1 is treated as 1, and the assumptions now say so
  instead of clamping in silence.

Completeness fixed:

1. **DEFECT FIXED: the takeoff had no mass.** Volume alone cannot book a skip.
   An 8-yard skip holds about 6.1 m3 but is limited to roughly 8 tonnes on the
   road, so a load of concrete can be legal by volume and illegal by weight.
   The engine now reports mass from the in-place volume at an editable density
   (default 1.8 t/m3, mixed masonry and concrete rubble; 2.35 for concrete),
   and the assumptions state the density used and the 8-tonne check.

Recorded, not changed:

1. One bulking factor covers every element type. Timber and sheet roofing bulk
   far more than a slab (published ranges run to 1.8-2.5), so a mixed
   demolition containing a roof is under-bulked. A per-type factor is a
   modelling change, not a correction, and the field is editable.
2. Loading efficiency defaults to 0.85, which is optimistic for irregular
   rubble; published practice often uses 0.7-0.8. Kept, and now visible next to
   the skip figure.
3. Wall openings are not deducted: a demolished wall with a door and two
   windows is measured as solid. Conservative for debris, but it over-orders.
4. Permits, service isolation, hazardous-material surveys and waste
   classification remain out of scope, stated in the safety notice.

---

## Audit 14: Formwork & Temporary Works (`temporary-works-standalone-engine.ts`)

Suite: `src/lib/estimation/__tests__/temporary-works-conformance.test.ts`,
20 tests. Evidence label: `CI green only`.

Expectations come from how the work is measured and bought: the concrete
surface each element actually touches, plywood bought as 2440 x 1220 mm sheets
of 2.98 m2, and a scaffold standing on two rows of standards.

Verified correct:

- Contact areas by element: slab soffit L x W; beam soffit plus two sides
  L(2d + w), so 6 m at 0.3 wide and 0.6 deep is 9 m2; column perimeter x height,
  so a 0.3 m square column 3 m high is 3.6 m2; wall on both faces, 2Ld. Repeated
  elements multiply and a mixed pour sums.
- The cutting allowance is added once to the contact area (10 per cent on 80 m2
  is 88 m2) and reuse divides that gross figure (four cycles of 88 m2 is 22 m2
  of sheet to own). A reuse count of zero is held at one rather than dividing by
  zero.
- Ledgers and guardrails are counted in pairs along the run, deck area is the
  deck width over the run at each lift, and a part bay rounds up, so a 21 m run
  at 2 m bays is 11 bays.
- The safety notice is explicit that this is a quantity estimate, not a
  scaffold design, and names the competent-person checks that are out of scope.

Defects found and fixed:

1. **DEFECT FIXED: standards were counted as a single row.** A scaffold stands
   on an inner and an outer leg at every frame position, and the ledgers and
   guardrails beside them were already counted in pairs, so the engine was
   internally inconsistent as well as half short. On a 20 m run at 2 m bays and
   4 m height it returned 33 standards where the grid needs 66. Standards are
   the most expensive component in the bill, so this was a serious under-order.
   Now 2 x (bays + 1) x (lifts + 1), pinned by three tests.
2. **DEFECT FIXED: an empty input still returned a frame.** With no run and no
   height the engine returned two standards (one before the row fix), because
   the position count is bays + 1 and ceil(0) is 0. It now returns zero for
   every scaffold line when either dimension is missing.
3. **COMPLETENESS: there was no sheet count.** The engine reported formwork
   area only, so the user had to divide by a sheet size the engine never
   stated. It now returns whole sheets to buy after reuse, from a 2440 x 1220 mm
   default with the size overridable per market (80 m2 with no waste is 27
   sheets; at three reuses, 9).

Recorded, not changed:

- Transoms are counted as two per bay per lift, which is about 21 per cent above
  a one-per-frame-per-lift reading of the same grid. It over-orders rather than
  under-orders, and the grid is disclosed as simplified.
- Reuse cycles apply to the whole formwork set rather than per element type. In
  practice a slab soffit is struck later and reused fewer times than column
  forms; splitting the cycles is a modelling change.
- Props, walers, ties, bracing, base plates, toeboards and scaffold ties are not
  in the model, and the assumptions say so rather than implying a complete bill.
- Quantities only: prices, tax and labour come from the price book.

---

## Audit 13: Paving & External Works (`paving-standalone-engine.ts`)

Suite: `src/lib/estimation/__tests__/paving-conformance.test.ts`, 26 tests.
Evidence label: `CI green only`.

Expectations come from published practice rather than from the engine: the
jointed module for unit counts, the BS 7533-3 bedding band, the driveway band
for compacted DTp Type 1 sub-base, and the trade rate for kiln-dried jointing
sand (one 25 kg bag over 8 to 15 m2, which is 1.7 to 3.1 kg/m2).

Verified correct:

- Unit count uses the jointed module, not the nominal face: a 200 x 100 paver
  at a 3 mm joint occupies 0.203 x 0.103 m, so 100 m2 is 4783 units (47.8 per
  m2). A nominal-face count would order 5000 and over-buy by 4.5 per cent.
  Widening the joint orders fewer units, as it must.
- The cutting allowance multiplies the module count and is applied once: 5 per
  cent default for running bond, 10 per cent for herringbone, and an explicit
  allowance overrides the pattern default.
- Bedding sand is ordered loose for the compacted bed: 30 mm compacted x 1.20
  is 36 mm loose per m2, inside the published 25 to 40 mm band, and converts at
  the 1,600 kg/m3 bulk density (100 m2 gives 3.6 m3, 5.76 t).
- Bedding sand is independent of paver size and of the laying pattern. That is
  right: the sand is spread over the area, and the pattern only changes how the
  pavers are cut.
- Sub-base is 150 mm compacted by default (inside the 100 to 200 mm driveway
  band), ordered loose at 1.25 (15 m3 compacted becomes 18.75 m3 loose, 33.75 t
  at 1.8 t/m3), and the loose figure is always the larger of the two.
- Edge units are counted from the run and the unit length, and a 600 mm kerb
  doubles the count on the same run.
- Degenerate input is refused, not guessed: zero area returns zeros rather than
  NaN, negative dimensions clamp at zero, and a missing paver size falls back to
  200 x 100 explicitly.

Defect found and fixed:

1. **DEFECT FIXED: the takeoff had no jointing sand at all.** The engine
   returned pavers, bedding sand and sub-base, and nothing for the kiln-dried
   sand that locks the pavement together. A takeoff built from it would send a
   gang to site without the one material that makes block paving interlock.
   Jointing sand is now the joint area of the specified unit (4.35 per cent of
   the surface for a 200 x 100 at 3 mm) filled to a stated depth of 40 mm at the
   sand's bulk density, giving 2.78 kg/m2. Two published cross-checks pin it: a
   50 mm fill reproduces the 3.5 kg/m2 supplier figure, and one 25 kg bag then
   covers 9 m2, inside the 8 to 15 m2 the trade quotes.

Disclosure fixed:

2. Edge units were counted at a silent 1 m per unit, and the assumptions list
   never mentioned it. A user who left the field alone ordered 12 units for a
   12 m run that needs 20 at a 600 mm kerb. The assumptions now state the unit
   length used and say what changing it does, and the field returns null when no
   edge run is entered, so the page shows no row at all instead of "Edge units
   0" on a patio with no kerb. The default unit length itself is kept, since a
   made-up kerb length would be worse than a stated one.
3. The summary rows for this engine read "Area M2" and "Pavers Required",
   falling back to the key humaniser. They now read "Paved area (m²)" and
   "Pavers required", alongside labels for the sand and sub-base lines.

Recorded, not changed:

- The bedding depth field is the _compacted_ bed, and the engine takes it loose
  at 1.2. A specification that says "30 mm bedding sand" means loose laid, so a
  user copying it into this field orders about 20 per cent more sand than the
  drawing calls for. Conservative, and the assumption text says so; renaming the
  field to "compacted bedding depth" is the cleaner fix when the page copy is
  next touched.
- The sub-base compaction factor defaults to 1.25 where the common site rule is
  1.3, about 4 per cent light on a 150 mm bed. The field is editable and the
  factor is printed, so it stays.
- Kerb bedding and haunch concrete are not part of the model, and neither is the
  sub-base under the kerb line. Both are real quantities; adding them is a
  modelling change rather than a correction, and the assumptions do not claim
  otherwise.
- The page passes area, paver size, cutting allowance and both depths, so joint
  width (3 mm), joint fill depth (40 mm) and edge length stay at their defaults
  there. Exposing joint width would matter for a 10 mm-jointed clay paver, which
  is a page change, not an engine one.
- Quantities only: prices, tax and labour come from the price book.

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

---

## Audit 12: Drywall & Partitions (`drywall-standalone-engine.ts`)

Suite: `src/lib/estimation/__tests__/drywall-conformance.test.ts` (17 tests).

Verified against trade figures:

- 10 x 2.4 m partition boarded both sides is 48 m2 of board, and 48 / 2.88 m2
  per 1200 x 2400 sheet plus 10 per cent is 19 whole sheets.
- Studs stand at the specified centres plus the closing stud: 18 on a 10 m wall
  at 600 centres, three walls giving 54.
- Tracks run top and bottom of every wall, bought in the market's stock length:
  22 m at 10 per cent is 8 pieces of 3 m.
- Screws follow the boarded area at 12 per m2, so they do rise with a second
  layer, which is correct: every layer is screwed.
- Openings come out of the wall before boarding, and the market's own board and
  framing are used (US 1219 x 2438 at 406 centres, GB at 400, NG at 600), with a
  named generic fallback and "not a verified national standard" note where a
  market has no profile.

Findings:

1. **DEFECT FIXED: tape and joint compound scaled with every layer of board.**
   Both were computed from `boardAreaM2`, which includes `boardLayers`, so a
   two-layer wall ordered 134.4 m of tape where 67.2 m is all the finished face
   can use, and the same doubling on compound. A second layer covers the first
   layer's joints; it does not need them taped. Finishing now follows the
   boarded faces (`netWallAreaM2 x boardSides`), and the result note says so.
   Screws were left on the boarded area, which is right.
2. Track waste borrows the board waste percentage. One allowance drives both
   lines, so setting board waste to 25 per cent also adds 25 per cent to the
   tracks. Kept, and recorded here, because a separate track allowance is a
   modelling change rather than a correction.
3. Stud counts exclude jamb studs, lintels, bracing and deflection heads, which
   the engine's own note already discloses. Not changed.

Not in scope: it is a takeoff, not a fire, acoustic or structural partition
design. The engine says so in its market note.

---

## Audit 11: Fence Block Calculator (`fence-blockwork.ts`)

Suite: `src/lib/estimation/__tests__/fence-blockwork-conformance.test.ts`, 18
tests. Evidence label: `CI green only`.

Expectations come from the geometry a site builds: a perimeter run, coaches of a
named unit at a 10 mm joint, a gate cut out of wall and footing, and mortar as
the joint volume of the blocks actually laid.

Verified against published practice:

- Perimeter is the whole plot, not one side: 30 x 15 m reads 90 m.
- One coach is one unit face plus its bed joint (225 + 10 = 235 mm), so ten
  coaches is 2.35 m, not 2.25 m. The block count uses the same jointed module,
  giving 9.25 blocks per square metre for a 450 x 225 sandcrete block.
- Whole blocks plus a separate breakage line, never a fractional order.
- The gate is deducted from the wall, the mortar and the footing run, and a gate
  wider than the run is clamped instead of producing a negative wall.
- Mortar is the bed and head joint volume of the blocks laid, dry-factor 1.33,
  split exactly one part cement to four parts sand at the default mix, and a
  richer mix moves cement up and sand down.
- Strip footing is twice the wall thickness wide by 200 mm deep unless measured,
  in 1:3:6, and its cement, sand and aggregate split follows the dry volume.
- Cement is counted in the market's own bag (50 kg NG against a smaller US pack,
  so the US count is higher), and a market with no pack configured says so
  rather than borrowing one.

Findings:

1. **Region-locked site units, recorded not fixed.** The result carries sand in
   wheelbarrows and head pans for every market, and the page prints both labels
   unconditionally. Head pans are a West African and Indian site unit; a US or
   UK reader is shown a measure their gang does not use. This belongs with the
   market sand-unit registry in `aggregate-units.ts`, which already knows the
   trips each market sells, so the fix is to gate the two site measures on the
   market rather than to remove them.
2. **Bed joint volume carries one extra joint width of length**,
   `(L + j) x t x j` instead of `L x t x j`, about 2 per cent on a 450 mm block.
   Kept: it offsets the head joint that is not laid above the top course, and
   changing it would move every fence estimate for no measured gain.
3. Quantities only: prices, tax and labour come from the price book, which the
   assumptions already state.
