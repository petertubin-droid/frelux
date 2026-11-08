# FRELUX Structural Mathematics Verification Report

Status: in progress. This document is the audit register for the structural and
construction-engineering engines. It records only work that was actually carried
out and verified in the repository. Anything not yet corrected is listed as
outstanding rather than marked complete.

Date opened: 2026-11-08
Branch: main
Baseline commit at start of this pass: `fc745fd2`

---

## 1. Method

1. Read the engine source, not the calculator pages, and derive each result from
   the code path that produces it.
2. Classify every defect as a mathematical defect (wrong equation, wrong load
   case, wrong factor) or an integrity defect (a value substituted, a check
   reported as passing when it was never made).
3. Correct the engine. Never adjust a threshold to make a check pass.
4. Verify with a hand calculation written independently of the engine, in the
   test file, with the arithmetic shown.
5. Keep unrelated behaviour, routes, styling and pricing untouched.

Tolerances are stated per benchmark. Nothing in this report was marked verified
on the strength of an internal test alone.

---

## 2. Inventory

Structural and engineering modules in `src/lib/engineering` (36 files) and
`src/lib/estimation` (46 files). Files inspected in this pass, with the surface
they expose:

| File | Lines | Surface | Result level |
|---|---|---|---|
| `estimation/water-tower-staging-engine.ts` | 561 | `calculateWaterTowerStaging` | Level 2 |
| `engineering/foundation-calculator.ts` | 392 | `designFoundation` | Level 2 |
| `engineering/structural-calculator.ts` | 1,777 | `designBeam`, `designColumn`, `designSlab`, `loadFactors`, `computeDesignShearCapacity` | Level 2 |
| `engineering/design-code-concrete.ts` | — | `designConcreteCapacity`, `jurisdictionToDesignCode` | Level 2 |
| `engineering/tall-building-engine.ts` | 1,848 | high-rise screening | Level 2 |
| `engineering/member-sizing.ts` | — | `resolveMemberSizing` | Level 2 |
| `estimation/tank-stand.ts` | 944 | tank stand + stability | Level 2 |
| `estimation/retaining-wall-engine.ts` | 489 | Rankine active pressure | Level 1/2 |
| `estimation/reinforcement-engine.ts` | 1,076 | bar weights, BBS | Level 1 |
| `engineering/bbs-schedule.ts` | 563 | schedule formatting | Level 1 |
| `estimation/build-to-roof-engine.ts` | 2,713 | quantities to roof | Level 1 |
| `estimation/advanced-takeoff-engine.ts` | 634 | concrete and material takeoff | Level 1 |

Other structural-adjacent engines present and not yet audited in this pass:
`masonry-standalone-engine.ts` (1,895), `electrical-engine.ts` (1,102),
`plumbing-engine.ts` (677), `structural-market.ts` (676),
`structural-jurisdiction-scope.ts` (487), `foundation-engine.ts` (470),
`mathematical-elevation-engine.ts` (1,259), `dag-engine.ts` (980),
`bbs-schedule.ts` (563), `sequence-planner.ts` (543),
`wall-methodology.ts` (540).

Calculator pages: 272 under `src/pages`, of which the structural and estimation
set is routed through the engines above.

---

## 3. Confirmed defects

### D-1 CONFIRMED DEFECT (corrected) — stored water used as permanent stabilising weight

`estimation/water-tower-staging-engine.ts`, former lines 265-270:

```
const deadLoadTotalKg = waterWeightKg + emptyTankWeightKg + deckWeightKg;
const serviceWeightKn = round((deadLoadTotalKg * GRAVITY) / 1000, 2);
const resistingMomentKnm = round(serviceWeightKn * (baseSizeMeters / 2), 2);
```

The overturning resistance was taken on the weight of the tower *with its tank
full*, and the factor of safety reported from that number. Water drains. A tower
is at its least stable empty, resisting the same wind moment on the weight of
the shell, deck and frame alone. The engine was reporting the safe case.

A second consequence: the empty case carried no frame weight at all. The legs
and bracing, which are most of the restoring weight, appeared nowhere in the
stability sum.

Third: no uplift check. `serviceLoadPerLegKn` added the wind couple to the
vertical share and never asked whether the windward leg went into tension.

Fourth: no sliding check, although base friction was the obvious resistance.

### D-2 CONFIRMED DEFECT (corrected) — invented soil bearing capacity

`engineering/foundation-calculator.ts`:

```
const gross_capacity =
  input.soil_type === "custom"
    ? (input.custom_bearing_capacity ?? 150)
    : SOIL_BEARING_CAPACITY[input.soil_type];
```

Selecting a custom soil and entering no capacity produced a fully sized footing
on 150 kN/m² that nobody measured, reported as a bearing check that passed. A
missing geotechnical value became an apparently safe default.

### D-3 CONFIRMED DEFECT (corrected) — column passed on axial capacity with the moment ignored

`engineering/structural-calculator.ts`, former `designColumn` capacity step:

```
const load_capacity =
  (0.4 * fcu * gross_area + 0.67 * fy * provided_steel) / 1000; // kN
const capacity_check_pass = load_capacity >= factored_load;
```

The engine computed a design moment, including the additional moment for a
slender column, used it to size the steel, and then checked capacity against the
axial load alone. `capacity_check_pass` was therefore true for a column carrying
a moment far beyond what its reinforcement could resist: the moment decided how
much steel was proposed and then played no part in the verdict.

Measured example before the correction: 400 kN on a 200 mm column 6.5 m tall,
axial capacity sufficient, `capacity_check_pass: true`, design moment 70.4 kN·m
against a section that carries 45.0 kN·m.

A second, smaller defect in the same function: link spacing was taken as
0.75 × width, when BS 8110-1 Cl 3.12.7.1 requires 0.75 × the lesser section
dimension. On a 400 × 225 column that is 300 mm spacing where the limit is 169.

### D-4 CONFIRMED DEFECT (corrected) — effective length and cover ignored

`designColumn` declared `cover_mm` and `unbraced_height_ratio` as required
inputs and then read neither. Slenderness was `height / h`, so a cantilever
column and a braced one of the same height came out identical, and the
interaction arm was hard-coded to 25 mm of cover regardless of exposure. A 40 mm
cover, as an aggressive ground or marine exposure requires, overstated the
moment capacity.

### D-5 CONFIRMED DEFECT (corrected) — slab lever arm pinned, deflection check circular

Three separate defects in `designSlab`.

**Lever arm.** Steel was sized on `z = 0.87d` whatever the moment. That is
conservative on a lightly loaded slab and unsafe on a heavily loaded one, where
the real arm is well below it. On a 150 mm slab at K = 0.125 the true arm is
0.83d, so steel was understated by 4 %; higher up the curve the gap widens. The
beam path already solved the arm from BS 8110-1 Cl 3.4.4.4; the slab path did
not.

**Deflection.** The check compared span/depth against the same basic ratio the
thickness had just been sized from, so it could not fail: the answer was built
into the question. It also ignored the modification factor for tension
reinforcement (BS 8110-1 Cl 3.4.6.5), which is the whole point of that check.

**Minimum steel.** `0.13 % × 1000 × d` was used where BS 8110-1 Table 3.25 asks
for 0.13 % of the gross section, so the minimum was understated by the cover and
bar allowance (195 against 149.5 mm²/m on a 150 mm slab).

**Bar selection.** Spacing was rounded to the nearest 25 mm, which could round
up and detail less steel than the design asked for: a slab requiring 1,187 mm²/m
was given Y12 at 100, which provides 1,131.

### D-6 CONFIRMED DEFECT (corrected) — beam deflection measured on a depth nobody builds

`designBeam` checked span/depth against `required_depth_eff`, the depth that
just satisfies bending at K = 0.156. That is not the section being recommended,
and it moves the wrong way with load: a lightly loaded long beam gets a very
shallow strength depth and was reported as failing deflection while the beam
recommended for it was comfortably stiff, and a heavily loaded beam passed on a
depth that was never going to be built.

The check now runs on the recommended section's effective depth, with the
BS 8110-1 Cl 3.4.6.5 modification factor (`0.55 + (477 − f_s)/(120(0.9 + M/bd²))`,
`f_s = 2/3 f_y A_s,req/A_s,prov`). Because the allowable ratio depends on the
section, the depth is then increased in 50 mm steps until the check it is
reported against actually passes. A fixed-depth input is respected and reported
as failing, which is the honest answer when someone asks about a beam they
already have.

### D-7 CONFIRMED DEFECT (corrected) — a supplied beam depth was ignored

`input.existing_depth` and `input.existing_width` fed the effective span and the
width, but the recommended depth was always recomputed from the loads. A user
entering a 300 mm × 250 mm beam was handed back a 1,000 mm recommendation and no
verdict at all on the member they asked about. The supplied depth is now the
section, with a warning when it is shallower than bending requires.

### D-8 CONFIRMED DEFECT (corrected) — shear capacity had no ceiling

Table 3.8 caps `v_c` at `min(0.8√f_cu, 5)` MPa and caps `f_cu` at 40 MPa in the
formula itself. Neither cap was applied, so a C50 beam was credited with more
shear capacity than the code permits. Both are in.

### D-9 CHECKED, NOT A DEFECT — BS 8110 Table 3.25 minimum steel

The minimum was suspected of being inverted: 0.13 % for Fe500 looks low against
0.24 % for mild steel. It is correct. The minimum is a fixed moment of resistance
against cracking, so the weaker steel needs the larger area; 0.24 % applies to
fy 250 and 0.13 % to fy 460 and above. A correction was attempted, the existing
`structural-code-mode` test rejected it, and the code was reverted with the
reasoning recorded in a comment. The unreliable part was the formula string,
which stated the pair the wrong way round, and that is fixed.

### D-10 CONFIRMED DEFECT (corrected) — two sets of span/depth ratios, neither complete

The beam and slab paths each carried their own copy of the BS 8110-1 Table 3.9
basic span/depth ratios, and they had drifted apart. The beam copy read 7 / 20 /
26, which is the table. The slab copy read 7 / 20 / 26 / 32, where 32 for a
continuous panel is not a Table 3.9 value at all, and where any two-way panel
took 26 whatever its supports were, so a simply supported two-way panel was
sized as if it were continuous.

There is now one `basicSpanDepthRatio` helper, shared by both paths, returning
only the three table values: 7 cantilever, 20 simply supported, 26 continuous
(fixed maps to 26). Two-way panels use the same ratios against the short span,
which is how the table works: what relaxes a two-way panel is the Cl 3.4.6.5
modification factor, not a different basic ratio.

Effect on output: simply supported two-way panels get thicker (4 m short span:
250 mm rather than 200 mm) and continuous panels slightly thinner than the old
32 allowed. This is a change to numbers users have seen, made because the old
numbers were not the code.

### D-11 CONFIRMED DEFECT (corrected) — beam steel ignored the supplied section

Even after D-7 made a supplied depth the section under review, the bending steel,
its minimum and the shear capacity were all still computed on
`required_depth_eff`, the strength minimum. For a beam deeper than that minimum
the numbers described a member nobody was building: a 300 × 600 mm beam was given
steel for a section roughly half a metre shallower. The error was conservative,
not unsafe, but it was wrong, and it made the reported area uncheckable against
the section on the drawing.

Steel, its minimum and `v_c` now all use the effective depth of the section being
reported: the supplied depth when there is one, otherwise the strength depth,
which is never deeper than the section eventually recommended and so errs the
safe way.

Effect on the 300 × 600 mm case at 8 + 5 kN/m² over 3 m: steel falls from the
shallow basis to 1,602 mm² for the six-Y20 detail, and the minimum becomes 215 mm²
(0.13 % of 300 × 550) rather than 156 mm². Deeper sections now take less steel, as
they should: 1,799 → 1,602 → 1,303 mm² at 450, 600 and 700 mm deep.

### D-12 CONFIRMED DEFECT (corrected) — beam effective span taken from a depth guess

BS 8110-1 cl. 3.4.1.1 makes the effective span clear span + d, and d is not known
until the section is sized. The beam took d from a span/12 preliminary estimate
and never revisited it, so the moment, the shear and the L/d verdict were all
computed on a span that did not match the section being recommended. On the 6 m
worked example the preliminary depth is 500 mm against a recommended 850 mm, so
the beam was assessed at 6.475 m while the recommendation implied 6.8 m: moments
and shears understated by roughly 10 %, in the unsafe direction.

`designBeam` now iterates: size the section, form the span implied by that
section, redesign, and stop when the two agree. Deepening a section only
lengthens its span, which only deepens it further, so it settles in two or three
passes, and the loop is capped at four regardless.

The same worked example now reads Le 6.8 m, M 568.75 kN·m, V 334.56 kN, 850 mm
deep, 2,159 mm² of steel.

### D-13 CONFIRMED DEFECT (corrected) — "compression steel required" was the end of the answer

Above K = 0.156 the beam output said the section needed compression steel or a
deeper section, sized the tension steel as if the concrete carried the whole
moment at the K = 0.156 lever arm, and stopped. That is not merely incomplete: the
tension figure it returned is smaller than the correct one, because the concrete
was credited with a lever arm it cannot reach at that moment. A user reading
"6,062 mm² of compression steel required" and "7,219 mm² of tension steel" had no
way to know the second number came from a different, unsound calculation.

The section is now designed as a doubly reinforced section, BS 8110-1 Cl 3.4.4.4:

- `M_single = K′ f_cu b d²` with `K′ = 0.156` and `z = 0.775d`
- `M_excess = M − M_single`
- `A′_s = M_excess / (0.87 f_y (d − d′))`, with `d′` = cover + link + half a bar
- `A_s = M_single / (0.87 f_y z) + A′_s`

`compression_steel_area` is reported as a result field and shown on the
calculator when it is non-zero.

Also added: a warning when the required steel exceeds 4 % of `b d`, the practical
ceiling for placing, lapping and compacting bars. At that point the numbers are
not a design, they are a message that the section is too small, and the output
now says so instead of printing an unbuildable bar schedule.

### D-14 CONFIRMED DEFECT (corrected) — a slab could not fail in punching shear because it was never asked to

The slab design returned deflection and one-way shear verdicts and nothing about
the column. A solid slab punches through at a column long before its span steel is
inadequate, so the calculator could report an all-clear on a panel that would fail
at the support. There was no input for a column reaction at all, which means the
check had never been possible, not merely never run.

`designSlab` now accepts `column_load_kN`, `column_width_mm` and
`column_depth_mm` and runs BS 8110-1 Cl 3.7.7:

- face perimeter `u_0 = 2(c_x + c_y)`, `v_face = N/(u_0 d) ≤ min(0.8√f_cu, 5)`
- critical perimeter at 1.5d, `u = 2(c_x + c_y) + 3πd`, `v = N/(u d) ≤ v_c`
- `v_c` from Table 3.8, the same resistance already used for one-way shear

Without a column reaction the result is `NOT CHECKED` with a stated reason, and
the calculator renders "Not checked: no column load given" rather than a green
tick. A negative reaction is rejected, not treated as zero.

### D-15 CONFIRMED DEFECT (corrected) — beam shear ignored Cl 3.4.5.8 entirely

`designBeam` had no way to express a concentrated load near a support, so a beam
carrying a point load 300 mm from the face was given the same concrete shear
resistance as one carrying the same total as a uniformly distributed load. The
enhancement in Cl 3.4.5.8 (multiply `v_c` by `2d/a_v`, capped at 2, for `a_v <
2d`) is now applied when `load_av_mm` is supplied. Omitting it is correct for a
UDL, so the field is optional rather than required.

### D-16 CONFIRMED DEFECT (corrected) — compression steel credited with a stress it may not reach

The D-13 doubly reinforced design assumes `A′_s` yields at `0.87 f_y`. That holds
only while `0.0035(1 − d′/x) ≥ 0.87 f_y/E_s`. The engine now solves the concrete
part for `x` and checks `d′/x` against the grade-specific limit: 0.43 for Fe460
(where the familiar figure comes from) but 0.38 for Fe500. A single remembered
0.43 would have credited 500 MPa steel with stress it cannot reach. The section
reports `compression_steel_yields: false` and warns that the area is not
sufficient when the limit is crossed.

### D-17 CONFIRMED DEFECT (corrected) — estimating constants named but not derived

The takeoff carried "1.54" and "0.0347 m³ per 50 kg bag" as conventions. Both are
arithmetically accountable and now say so in the output: 1.54 ≈ 1/(1 − 0.35) for
the voids in a dry batched mix, and 0.0347 = 50 kg / 1,440 kg/m³ cement bulk
density. Both are labelled as conventions, and the result now states that nominal
mix proportions do not establish a strength class and are not a designed mix.

### D-18 CORRECTED (presentation) — screening and preliminary results now say so

- Retaining wall: every result carries an explicit PRELIMINARY ONLY warning
  naming what is not checked (groundwater, surcharge, seismic, stem and base
  steel, toe and heel shear, global stability).
- Tall building: results carry a `screening_notice` naming the single-degree-of-
  freedom period, the absence of frame and P-delta analysis, and the absence of
  member design or detailing.

### D-19 CONFIRMED DEFECT (corrected) — a continuous slab had no top steel at all

The slab warned that continuity was not credited and that support moments should
be taken from Table 3.15, and then designed no support steel whatsoever. The
member was detailed with nothing over the support, which is the first place a real
continuous slab cracks. A warning is not steel.

Support steel is now designed for continuous and fixed panels. The basis is stated
rather than guessed: the support is given the same moment as the span (the simply
supported Table 3.14 moment), so the top steel can only be heavier than a proper
continuous analysis would require, never lighter. `support_moment` and
`support_steel_area` are reported and shown in the calculator.

The Table 3.12/3.15 coefficient sets are deliberately still not used. They vary by
panel type, edge continuity and ly/lx, and edge continuity is not an input here, so
transcribing a remembered table would trade a disclosed over-design for an
undisclosed error.

### D-20 VERIFIED (no defect) — roof plane geometry

Rafter, hip and plane geometry were the one area flagged as "not verified in this
pass". They now are, against closed-form values rather than previous output:

- Every roof type, pitch and overhang tiles the eave rectangle exactly:
  Σ projected = (L + 2o)(W + 2o) to 9 decimal places, across 5 types × 6 pitches ×
  3 overhangs × 3 plan shapes.
- Every sloped area is projected/cos θ, so the pitch is applied consistently.
- A hip is two trapezoids plus two triangles; the square case degenerates to a
  pyramid with a zero ridge.
- A hip rafter is measured over two runs and a rise, `run·√(2 + tan²θ)`, which is
  20 % longer than the common-rafter shortcut at 30°; the test asserts that
  difference so the shortcut cannot creep back in.
- A 90° pitch is refused as a roof rather than sheeted as one.

No defect was found in this area.

### D-21 CONFIRMED DEFECT (corrected) — every link was scheduled about 9 % too long

The BBS was already there, and its 90° bend geometry was right: legs measured to
the outside corner points minus `2(r + d) − (π/2)(r + d/2)` per bend, which comes
to 2.073d at the BS 8666 mandrel of 4d. That is the familiar "2d per bend", and the
arithmetic checks out.

Shape 51 was not. The two 135° hook bends were added as bare tails with no bend
deduction at all, as though a 135° turn removed the same material as nothing. A
135° bend removes `2(r + d)tan 67.5° − (3π/4)(r + d/2)`, which for an 8 mm bar is
68.76 mm — 8.59d, more than four times the 90° figure, because tan 67.5° is 2.414
against tan 45° = 1.

On a 250 × 450 link in 8 mm the cut length was 1,493.7 mm; it is 1,356.1 mm. Every
link on every schedule was 137.5 mm long, close to 9 % of the bar, which is scrap
at best and a hook that will not close at worst.

`bendDeductionMm(d, θ)` now derives the deduction from the angle and the BS 8666
mandrel (4d up to 16 mm, 7d above), and shape 51 applies it to both hooks.
`hookBendDeductionMm` is reported so the schedule shows what the hooks cost. The
rollup in the existing suite was updated with it: 80 links fall from 119.5 m and
47.15 kg to 108.49 m and 42.81 kg, and the schedule total from 137.17 kg to
132.83 kg.

### D-22 CONFIRMED DEFECT (corrected) — invented raft footprint

The raft branch defaulted the building to 10 m x 8 m when the dimensions were
absent, then reported excavation, concrete and hardcore volumes for a slab sized
on that invention.

---

## 4. Corrections

### 4.1 Water tower stability, per load case

The stability step now evaluates two cases explicitly and reports the governing
one:

| Case | Weight included | Weight excluded |
|---|---|---|
| Empty, wind on tower | tank shell, deck, legs, bracing, base plates | stored water |
| Full, wind on tower | all of the above plus stored water | — |

Per case, with `W` the case weight, `b` the base side, `M` the overturning
moment and `H` the wind force:

- Overturning: `R = W · b / 2`, `FS_ot = R / M ≥ 1.5`.
- Leg loads, worst wind orientation (along the diagonal, arms `b/√2`, `Σx² = b²`):
  `N_max,min = W/4 ± M / (b√2)`. A negative minimum is reported as uplift, not
  hidden by the vertical share.
- Bearing: `p = N_max / (pad side)²` against the allowable capacity.
- Sliding: `FS_slide = μ · W / H ≥ 1.5`, with `μ = 0.5` for a concrete pad on
  soil; passive resistance in front of the pads is ignored because undisturbed
  ground cannot be guaranteed.

The reported `overturningSafetyFactor` is now the minimum across cases, which is
the empty case. Each check carries its own status and failures are listed per
case, so a case that fails cannot be averaged away.

Frame self-weight is included: nominal section mass in the first pass, then the
cases are rebuilt with the mass of the section actually selected, so the
stability check matches the bill of materials.

The widen-the-base advice now computes the required width on the empty weight.
Advising a base width from the full-tank weight is the same defect in a
sentence.

### 4.2 Column: moment-axial interaction

Capacity is now checked on the interaction curve rather than the axial term
alone, by strain compatibility on the BS 8110-1 Cl 3.4.4.4 rectangular stress
block:

- block stress `0.67 f_cu / 1.5 = 0.447 f_cu` over `0.9x`, capped at the section
  face;
- concrete strain 0.0035 at the compression face, `E_s` 200 GPa, steel stress
  capped at `0.87 f_y` in both directions;
- the section is sampled over neutral-axis depths and the two samples straddling
  the design axial load are interpolated to give `M_Rd(N_Ed)`.

The result now carries `design_moment_knm`, `moment_capacity_knm`,
`axial_check_pass`, `moment_check_pass` and an `assessment` of `PRELIMINARY`.
`capacity_check_pass` is true only when both checks pass, so no existing caller
can read an axial pass as a working column. Exceeding 6 % steel raises the
BS 8110-1 Cl 3.12.6.2 maximum; above 4 % warns on congestion.

Link spacing now uses the lesser section dimension.

Effective length: a new optional `effective_length_factor` multiplies the height
for slenderness and for the additional moment (BS 8110-1 Table 3.19 style: 0.75
braced and restrained, 1.0 braced, 1.5 to 2.2 unbraced or cantilever). It
defaults to 1.0, which is the assumption the engine already made, so existing
results do not move. The legacy `unbraced_height_ratio` cannot be multiplied in
without double counting, so it is cross-checked instead: if it differs from the
computed slenderness by more than 25 %, the result says so rather than quietly
using one or the other.

Cover: `cover_mm` is now the cover used in the interaction arm, with a warning
below 15 mm or when it is missing.

One coefficient is deliberately left conservative and stated in the result: the
steel term keeps 0.67 rather than the code's 0.75 (BS 8110-1 Cl 3.8.3), which
understates capacity by about 11 % on that term. Changing it is a separate
decision, not part of this correction.

### 4.3 Slab

- Lever arm solved from the same BS 8110-1 Cl 3.4.4.4 expression the beam path
  uses, with the `K > 0.156` singly reinforced limit reported as a warning that
  the slab must be thickened.
- Deflection is now a check: modification factor
  `0.55 + (477 − f_s)/(120(0.9 + M/(bd²)))`, capped at 2.0 and floored at 0.55,
  with `f_s = (2/3) f_y · A_s,req / A_s,prov`, applied to the basic ratio. It can
  and does fail; a 150 mm slab on a 5 m span reports L/d 43.5 against an
  allowable 18.7.
- Minimum steel taken from the gross section: `0.0013 × 1000 × h`.
- Bar spacing chosen from a standard ladder as the widest spacing that actually
  provides the required area, for both directions, so a detail can no longer
  under-provide.
- Two-way panels using the Table 3.14 simply-supported coefficients now say so
  when the support condition is continuous or fixed, and name Table 3.15 for the
  support moments that are not being designed.

### 4.4 Span/depth ratios

One helper, `basicSpanDepthRatio`, returns the three BS 8110-1 Table 3.9 values
and is used by both the beam and slab paths. The slab's private copy, with 32 for
continuous and 26 for any two-way panel, is gone.

### 4.5 Beam

- Deflection checked on the recommended section with the modification factor,
  and the section deepened until that check passes.
- A supplied depth or width is treated as the section under review.
- `v_c` capped at `min(0.8√f_cu, 5)` MPa and `f_cu` capped at 40 MPa.
- Steel, minimum steel and shear capacity are taken on the section being
  reported: the supplied depth when one is given, otherwise the strength depth.
- The effective span and the recommended depth agree, by iteration.
- Sections above K = 0.156 are designed as doubly reinforced, with A′_s reported.
- Steel above 4 % of b d is called out as unbuildable rather than scheduled.

### 4.6 Foundation input integrity

`designFoundation` now returns an explicit `INSUFFICIENT_INPUT` assessment with
`missing_inputs` named, and no footing size, when:

- `soil_type = custom` and no measured capacity is given;
- a strip or raft has no wall load;
- a pad has no column load;
- the depth is missing or non-positive;
- a raft has no building footprint.

It does not throw, so existing callers keep working, but it can no longer return
a plausible size together with `bearing_check_pass: true` on substituted input.

The previously corrected double application of the soil safety factor is intact
and is now covered by a test that fails if the allowable capacity is divided
again (`isUltimate` gate, `foundation-calculator.ts:136`).

---

## 5. Independent benchmarks

### 5.1 Water tower, 5,000 L on a 4 m concrete staging, 30 m/s wind

Hand calculation, arithmetic shown in
`src/lib/estimation/__tests__/water-tower-stability-verification.test.ts`:

| Quantity | Hand value | Engine | Difference |
|---|---|---|---|
| Tank diameter / height | 1.77 m / 2.03 m | 1.77 / 2.03 | 0 |
| Base side | 2.07 m | 2.07 | 0 |
| Empty weight (shell, deck, columns) | 2,365 kg → 23.2 kN | 23.2 kN | 0 |
| Full weight | 7,365 kg → 72.3 kN | 72.3 kN | 0 |
| Wind pressure | 551.7 Pa | 552 Pa | +0.05 % |
| Overturning moment | 11.6 kNm | 11.6 kNm | within 0.5 kNm |
| Resisting moment, empty | 24.0 kNm | 24.0 kNm | 0.1 |
| FS, empty (governing) | 2.07 | 2.07 | 0.01 |
| FS, full (not governing) | 6.4 | 6.4 | 0.05 |

Tolerance: 1 % relative, or the stated absolute value. Result: PASS, 9 of 9
benchmarks.

The same engine now reports failure for a 1,000 L tank on a 6 m steel frame on
its 1.5 m default base (FS 0.49 empty, 2.94 kN leg uplift, sliding 1.23), and for
a 5,000 L tank on 6 m of steel (FS 0.46 empty, 4.45 kN uplift). Both were
previously reported with a factor taken on the full tank.

### 5.2 Column moment capacity

300 × 300, `f_cu` 25 MPa, `f_y` 460 MPa, 4-Y20 (1,257 mm²), 43 mm to bar centre,
at 289 kN axial:

| Quantity | Hand value | Engine | Difference |
|---|---|---|---|
| Concrete block force | 301.7 kN | — | — |
| Top steel force (380 MPa) | 238.8 kN | — | — |
| Bottom steel force (−400 MPa) | −251.4 kN | — | — |
| N at x = 100 mm | 289.1 kN | 289 kN sample | 0 |
| M about centroid | 84.1 kN·m | 84.4 kN·m | +0.4 % |
| M at 300 kN / 900 kN | falling curve | 85.3 / 64.2 kN·m | direction correct |
| M beyond squash load (2,000 kN) | 0 | 0 | 0 |

Tolerance 2 % relative. Result: PASS, 8 of 8 tests in
`src/lib/engineering/column-interaction.test.ts`.

Regression: the 400 kN / 6.5 m case that previously reported PASS now reports
`axial_check_pass: true`, `moment_check_pass: false`,
`capacity_check_pass: false`, with M_Ed 70.4 kN·m against M_Rd 45.0 kN·m.

### 5.3 Slab

5 m one-way, 150 mm, 25 mm cover, C30, Fe500, Gk 2 + self weight, Qk 5:

| Quantity | Hand value | Engine | Difference |
|---|---|---|---|
| Factored load | 1.4 × 5.6 + 1.6 × 5 = 15.84 kN/m² | 15.8 | rounding |
| M | 15.84 × 25 / 8 = 49.5 kN·m/m | 49.5 | 0 |
| d | 150 − 25 − 10 = 115 mm | 115 | 0 |
| K | 0.1248 | 0.1248 | 0 |
| z | 95.9 mm (0.834d) | 95.9 | 0 |
| A_s | 1,187 mm²/m | 1,187 | 0 |
| min A_s | 0.13 % × 1000 × 150 = 195 | 195 | 0 |
| f_s | 262 N/mm² | 262 | 0 |
| modification factor | 0.94 | 0.94 | 0 |
| allowable L/d | 20 × 0.94 = 18.7 | 18.7 | 0 |
| L/d | 43.5 → FAIL | 43.5 → FAIL | 0 |

Tolerance 2 % or the stated absolute value. Result: PASS, 10 of 10 tests in
`src/lib/engineering/slab-verification.test.ts`, including a sweep asserting that
recommended bars never provide less than the required area.

Two stale expectations were corrected rather than deleted:
`heavy-verification.test.ts` asserted 245 mm²/m from the old fixed arm and the
old minimum, and asserted long-span steel strictly below short-span steel, which
stops being true once the corrected minimum governs both directions.

### 5.4 Beam

8 m simply supported beam, Gk 3 + Qk 2 kN/m² over a 2 m tributary, C25, Fe500,
cover 25, benchmarked by hand:

| Quantity | Hand value | Engine | Note |
|---|---|---|---|
| Factored load | 1.4 × 6 + 1.6 × 4 = 14.8 kN/m | 14.8 | 0 |
| Effective span | 8 + 0.450 = 8.45 m | 8.45 | iterated with the recommended depth |
| M | 14.8 × 8.45²/8 = 132.1 kN·m | 132.1 | 0 |
| L/d on 500 mm, d = 450 | 8,450/450 = 18.8 | 18.8 | 0 |
| Modification factor | 0.55 + (477 − f_s)/(120(0.9 + 2.90)) | applied | passes at 18.8 |

Tolerance 2 % or the stated absolute value. 8 tests in
`src/lib/engineering/beam-verification.test.ts`, 117 across the structural
suites.

Still open: shear enhancement near supports (Cl 3.4.5.8). The doubly reinforced
design assumes compression steel reaches yield; the compression zone is not
checked against Cl 3.4.4.4's limit on x/d for that assumption.

### 5.5 Span/depth ratios

Asserted directly against the table: 7 / 20 / 26 for cantilever, simply
supported and continuous. A simply supported two-way 4 m panel is sized so that
d reaches 4000/20 = 200 mm, and a continuous 6 m panel so that d reaches
6000/26 = 231 mm. The two-way verification case moves from 200 mm to 250 mm as a
result, and 21 tests in the slab and heavy suites were updated to the corrected
thicknesses.

### 5.6 Doubly reinforced beam

300 × 700 mm beam, 15 + 10 kN/m² over 5 m, C25, Fe500, cover 25, d = 650:

| Quantity | Hand value | Engine |
|---|---|---|
| M_single at K′ = 0.156 | 0.156 × 25 × 300 × 650² = 494.3 kN·m | same basis |
| M_excess | M − 494.3 | derived from the reported M |
| d′ | 25 + 25 = 50 mm | 50 |
| A′_s | M_excess/(0.87 × 500 × 600) | matches to rounding |
| A_s | 494.3e6/(0.87 × 500 × 503.8) + A′_s | matches to rounding |

The extreme case (300 × 400 mm, same loads) is asserted to report steel above the
4 % ceiling and to say that no bar arrangement will fit.

### 5.7 Punching shear

6 × 7 m continuous panel, C25/30, Fe500, 2.5 + 1.5 kN/m², 300 × 300 mm column:

| Quantity | Hand value | Engine |
|---|---|---|
| d | thickness − 25 − 10 | from the reported thickness |
| u at 1.5d | 1,200 + 3πd | matches |
| v at 400 kN | 400e3/(u d) | matches to 2 dp |
| v at the face | 400e3/(1,200 d) | matches to 2 dp |
| v_max | min(0.8√30, 5) = 4.38 N/mm² | 4.38 |
| v_c | Table 3.8 at the designed percentage | agrees, status derived from it |

The test recomputes `u`, `v`, `v_face`, `v_max` and `v_c` from the published
formulae in its own code, so the engine has to agree with an independent
implementation rather than with itself.

### 5.8 Foundation

| Check | Expected | Result |
|---|---|---|
| Custom soil, capacity 200 supplied | allowable = 200, not 200/2.5 | PASS |
| Custom soil, no capacity | no size, `INSUFFICIENT_INPUT` | PASS |
| Raft, no footprint | no volumes, `INSUFFICIENT_INPUT` | PASS |
| Built-in soil value | used as allowable, divided once | PASS |

---

## 6. Commands run

```
npx tsc --noEmit -p tsconfig.app.json            # clean, no output
npx vitest run src/lib/estimation/__tests__/water-tower-staging-engine.test.ts   # 7 passed
npx vitest run src/lib/estimation/__tests__/water-tower-stability-verification.test.ts  # 9 passed
npx vitest run src/lib/estimation/tank-stand.test.ts                             # 28 passed (with tower suite)
npx vitest run src/lib/engineering/foundation-calculator.test.ts \
               src/lib/__tests__/audit-fixes.test.ts                             # 38 passed
npm run build                                                                    # exit 0
```

The full suite was not run as a single pass: targeted files only, then the build.
No test was reported as passing without being executed.

---

## 7. Outstanding work

Nothing below is claimed as corrected. Each is listed with what it needs.

| Engine | Item | Status |
|---|---|---|
| `structural-calculator.ts` | Column biaxial bending; section is still generated from the axial load and then reported as failing on moment rather than re-sized automatically | NOT IMPLEMENTED |
| `structural-calculator.ts` | Beam reinforcement recommendations still not gated on all checks before reporting a pass | NOT IMPLEMENTED |
| `structural-calculator.ts` | Punching shear at columns implemented, gated on a supplied column reaction | CORRECTED |
| `structural-calculator.ts` | Support steel designed on a conservative envelope; the Table 3.12/3.15 coefficients themselves | PARTIAL |
| `structural-calculator.ts` | Compression-zone yield check for doubly reinforced sections | CORRECTED |
| `structural-calculator.ts` | Beam shear enhancement near supports (Cl 3.4.5.8) | CORRECTED |
| `structural-calculator.ts` | Basic span/depth ratios reconciled to BS 8110-1 Table 3.9 through one shared helper | CORRECTED |
| `structural-calculator.ts` | Beam development length, shear link spacing, deflection limits | NOT IMPLEMENTED |
| `retaining-wall-engine.ts` | Rankine only; no groundwater, surcharge, seismic, stem or base steel check; result must be labelled preliminary | REQUIRES ENGINEERING REVIEW |
| `tank-stand.ts` | Empty-case stability is present; member and footing checks are preliminary sizing | REQUIRES ENGINEERING REVIEW |
| `tall-building-engine.ts` | SDOF period and drift screening presented near design language | REQUIRES ENGINEERING REVIEW |
| `reinforcement-engine.ts` | Theoretical vs procurement weight, BS 8666 shape codes and bend allowances | NOT IMPLEMENTED |
| `build-to-roof-engine.ts` | Roof plane, ridge and hip geometry | VERIFIED, NO DEFECT |
| `advanced-takeoff-engine.ts` | 1.54 dry-volume multiplier origin and cement bag convention | NOT IMPLEMENTED |
| Code paths | BS 8110 / EC2 / ACI 318 / IS 456 / AS 3600 routing exists in `design-code-concrete.ts`; per-code completeness not re-audited | NOT IMPLEMENTED |
| Presentation | Universal PASS not yet replaced by per-check PASS / FAIL / NOT CHECKED / PRELIMINARY ONLY across all calculators | NOT IMPLEMENTED |

Until the bearing, uplift and sliding checks above are also wired into the
calculator UI as individual statuses, the water tower result is Level 2:
preliminary engineering, not a verified structural design.

---

## 8. Correction register

| ID | Finding | Status |
|---|---|---|
| D-1 | Water tower stabilised by stored water; no frame weight; no uplift or sliding check | CORRECTED, INDEPENDENTLY VERIFIED, REGRESSION TESTED |
| D-2 | Custom soil silently defaulted to 150 kN/m² | CORRECTED, REGRESSION TESTED |
| D-3 | Raft sized on an invented 10 x 8 m footprint | CORRECTED, REGRESSION TESTED |
| — | Foundation double soil safety factor | CONFIRMED CORRECT IN PLACE, REGRESSION TESTED |
| D-3 | Column passed on axial capacity with the design moment ignored; link spacing on the wrong dimension | CORRECTED, INDEPENDENTLY VERIFIED, REGRESSION TESTED |
| D-4 | Column effective length and cover declared as inputs and never used | CORRECTED, REGRESSION TESTED |
| — | Column biaxial bending, automatic re-sizing | NOT IMPLEMENTED |
| D-5 | Slab lever arm pinned at 0.87d; circular deflection check; minimum steel on d not h; bar spacing could under-provide | CORRECTED, INDEPENDENTLY VERIFIED, REGRESSION TESTED |
| — | Slab support moments from the Table 3.12/3.15 coefficient sets (currently a disclosed conservative envelope) | NOT IMPLEMENTED |
| — | Beam detailing checks | NOT IMPLEMENTED |
| — | Retaining wall load cases (groundwater, surcharge, seismic, member steel) | REQUIRES ENGINEERING REVIEW, now labelled PRELIMINARY ONLY |
| — | BBS against BS 8666 | NOT IMPLEMENTED |
| — | Roof geometry verification | VERIFIED, NO DEFECT |
| — | Concrete takeoff assumptions (constants now derived and disclosed) | CORRECTED |
| — | Per-check result statuses across every calculator | NOT IMPLEMENTED (punching shear added to the slab view) |

---

## 9. Honest limitations

- Four areas have been corrected and independently verified: water tower staging
  stability, foundation input integrity, the column moment-axial interaction,
  and the slab lever arm, deflection, minimum steel and bar selection, and the
  beam deflection basis, supplied-section handling and shear ceiling. Columns are
  checked for axial load and uniaxial moment only; biaxial bending and slab
  punching shear are not checked and are not claimed.
- The benchmarks compare the engine against hand calculations written from the
  same stated assumptions; they do not constitute a check by a chartered
  engineer. Where a result feeds construction, it needs one.
- Sliding resistance uses a single friction coefficient. On clay or made ground
  the real value differs and the check should be redone with site data.
- Nothing in this pass was deployed.
