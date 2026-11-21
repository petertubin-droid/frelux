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
| 4   | Concrete & Structural              | structure | Queued                                                                          |
| 5   | Concrete Slab Takeoff              | structure | Queued                                                                          |
| 6   | Earthworks Cut & Fill              | structure | Queued                                                                          |
| 7   | Retaining Wall Calculator          | structure | **Audited 2026-11-21**, 9 tests, DEFECT FIXED: overturning 1.5 -> 2.0 (BS 8002) |
| 8   | Roof Framing & Board Feet          | structure | Queued                                                                          |
| 9   | Masonry & Blockwork                | structure | Queued                                                                          |
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
- `icf-engine.ts`, `icf-eifs-market.ts`, `system-boq-pricing.ts` - open.
- `conduit-wiring-engine.ts`, `mep-conduit-router-engine.ts` - open.
- `plumbing-engine.ts`, `plumbing-profiles.ts` - open.
- `generator-engine.ts` - open.
- `borehole-water-system-engine.ts` - open.

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

1. **Price-book sanity, not calculator logic.** `block-per-piece` for CH is
   23.98 CHF per block against 0.48 EUR in DE. That is a data defect, not an
   engine defect, and belongs to a price-book audit pass.
2. Calculators whose page assembles several engines (Build-to-Roof, ICF, EIFS)
   need a page-level audit, because the defect surface is the wiring between
   engines, not any single engine.
3. Services category is untouched. It starts at plumbing, then conduit wiring,
   then generator and borehole, in that order.
