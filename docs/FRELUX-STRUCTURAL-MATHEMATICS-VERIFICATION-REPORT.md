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

### D-3 CONFIRMED DEFECT (corrected) — invented raft footprint

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

### 4.2 Foundation input integrity

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

### 5.2 Foundation

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
| `structural-calculator.ts` | Column slenderness, second-order moments, biaxial interaction, tie spacing limits | NOT IMPLEMENTED |
| `structural-calculator.ts` | Slab one-way/two-way classification, support-condition coefficients, punching shear, deflection | NOT IMPLEMENTED |
| `structural-calculator.ts` | Beam development length, shear link spacing, deflection limits | NOT IMPLEMENTED |
| `retaining-wall-engine.ts` | Rankine only; no groundwater, surcharge, seismic, stem or base steel check; result must be labelled preliminary | REQUIRES ENGINEERING REVIEW |
| `tank-stand.ts` | Empty-case stability is present; member and footing checks are preliminary sizing | REQUIRES ENGINEERING REVIEW |
| `tall-building-engine.ts` | SDOF period and drift screening presented near design language | REQUIRES ENGINEERING REVIEW |
| `reinforcement-engine.ts` | Theoretical vs procurement weight, BS 8666 shape codes and bend allowances | NOT IMPLEMENTED |
| `build-to-roof-engine.ts` | Rafter/purlin geometry verified? Not in this pass | NOT IMPLEMENTED |
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
| — | Column design completeness | NOT IMPLEMENTED |
| — | Slab design completeness | NOT IMPLEMENTED |
| — | Beam detailing checks | NOT IMPLEMENTED |
| — | Retaining wall load cases | REQUIRES ENGINEERING REVIEW |
| — | BBS against BS 8666 | NOT IMPLEMENTED |
| — | Roof geometry verification | NOT IMPLEMENTED |
| — | Concrete takeoff assumptions | NOT IMPLEMENTED |
| — | Per-check result statuses in the UI | NOT IMPLEMENTED |

---

## 9. Honest limitations

- Two engines were corrected and independently verified in this pass. The
  structural calculator's beam, column and slab paths were read but not
  corrected, so their results remain Level 2.
- The benchmarks compare the engine against hand calculations written from the
  same stated assumptions; they do not constitute a check by a chartered
  engineer. Where a result feeds construction, it needs one.
- Sliding resistance uses a single friction coefficient. On clay or made ground
  the real value differs and the check should be redone with site data.
- Nothing in this pass was deployed.
