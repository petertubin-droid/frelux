# Structural and foundation engines: verification and fixes

Date: 29 Oct 2026. Scope: `src/lib/engineering/*` (beam, column, slab, foundation)
and the estimation engines that price them.

## Defects found and corrected

### 1. Foundation bearing capacity was divided by a safety factor twice

`SOIL_BEARING_CAPACITY` holds assumed **allowable** pressures (BS 8004 Table 1
style: stiff clay 300, firm clay 150, dense sand 300 kN/m²). Those values already
carry a factor of about 3 on ultimate capacity, but `designFoundation` divided
them by `safety_factor` (default 2.5) before sizing. Every strip and pad footing
therefore came out roughly 2.5x larger than the soil requires.

| Case | Before | After | Hand check |
| --- | --- | --- | --- |
| Strip, stiff clay, 100 kN/m | 917 mm required, 950 mm recommended, 105 kPa | 367 mm required, 400 mm recommended, 250 kPa | 1.10 x 100 / 300 = 367 mm |
| Pad, firm clay, 800 kN | 3,830 mm side, 15.21 m², 57.9 kPa | 2,423 mm side, 6.25 m², 140.8 kPa | 1.10 x 800 / 150 = 5.87 m² |

Consequences of the old behaviour: on the strip example, 3.2 m³ vs 7.7 m³ of
concrete per 36 m of footing, and 2.5x the excavation and backfill.

A custom bearing value is now also treated as allowable, which is what a
geotechnical report normally gives. Callers holding an ultimate value set
`custom_capacity_is_ultimate: true` and the safety factor is applied once.

`factor_of_safety` was reported against the already-reduced value, so a footing
that met the check showed about 1.1 while the screen said the factor was 2.5.
It now reports the margin over the allowable pressure, and the formula
transparency list states it as such.

### 2. Beam effective span ignored the member depth

`effective_span = span + 0.1 m` regardless of section. BS 8110 cl. 3.4.1.1 takes
the clear span plus the effective depth. For a 4.5 m beam, d is about 350 mm, so
moments were understated by roughly 6% (11% on a 6 m beam), which under-sizes
bending steel. The effective span now uses the supplied depth when there is one
and a span/12 preliminary depth otherwise.

### 3. `design_load` contradicted its own documentation

The field is documented as the factored UDL but held the unfactored total. It
now reports the factored load; the factored value is what the moment and shear
calculations already used.

## Verified, not changed

- Punching shear at 1.5d (BS 8110 3.7.7.6): u1, v and v_c reproduce hand
  calculation. An 800 kN column on a 300 mm pad correctly FAILS in punching
  (1.149 vs 0.472 N/mm²) and the warning asks for a thicker pad.
- Moment and shear coefficients per support condition (1/8, 1/12, 1/10, 1/2).
- Load factors per governing standard (BS 8110 1.4G + 1.6Q, ACI 1.2D + 1.6L).
- Strip excavation, concrete (225 mm), blinding (75 mm) and hardcore (150 mm)
  volumes are internally consistent with the chosen width.
- Raft pressure check and volumes.

## Evidence

`npx vitest run`: 1029 files, 9218 tests, 0 failures. The engineering,
estimation and calculator page suites were re-run separately (105 files, 1538
tests) after the changes.

## Not yet covered by this audit

The remaining calculator engines (masonry, tiling, roofing, plumbing,
electrical, screeding, takeoff family) still rely on their existing tests. They
should get the same first-principles check, one family at a time.
