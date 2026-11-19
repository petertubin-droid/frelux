# ICF and EIFS estimators: verification and completion

Verified at `9be81e70`, 2026-11-19.

## Engineering methodology

| Check                                                                                                   | Source                                | Verdict                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| Block face 1200 x 400 mm                                                                                | StaxICF published specification       | Correct for metric systems      |
| North American face 1219 x 406 mm (48 x 16 in)                                                          | US manufacturer practice              | Was missing, now an input       |
| Rebar mass per metre (10M 0.785, 12M 0.888, 16M 1.578, 20M 2.466, #4 0.994, #5 1.552, #6 2.235 kg/m)    | Standard bar masses                   | Correct                         |
| EPS R per inch 3.85, graphite 4.4                                                                       | ASTM C578 type II and Neopor data     | Correct                         |
| Concrete mix by grade (C20/25 320 kg/m3 at 0.60 w/c, C25/30 350 at 0.52, C30/37 400 at 0.45)            | EN 206 practice                       | Plausible, unchanged            |
| Core fill factors flat 0.985, waffle 0.60, screen 0.45                                                  | Published form-family proportions     | Reasonable, disclosed in output |
| EIFS layer model: WRB, drainage, board, adhesive, mesh, base coat, primer, finish, trims                | ASTM E2568, E2579/E2486, IBC 1407.4.1 | Complete, already present       |
| EIFS consumption: adhesive 4.5-5.5 kg/m2, base coat 4.5 (+2.5 high impact), primer 0.22, finish 2.2-3.6 | EIMA/ASTM application guidance        | Plausible, unchanged            |

The one methodology error found was mine, not the engine's: the form area
pricing quantity was computed as `netArea * (1 + cuttingWasteFactor)` when the
factor is already multiplicative (1.04), which doubled the form area. Fixed, and
pinned by a test.

## Market pricing: what was actually missing

Neither estimator had any price, currency or cost code. They were quantity
engines with no path to money, and the twelve ICF/EIFS materials already in the
price book were referenced by nothing.

Now:

- Nine material roles (`icf-form-block`, `icf-concrete`, `icf-rebar`,
  `eifs-insulation`, `eifs-adhesive`, `eifs-basecoat`, `eifs-mesh`,
  `eifs-finish`, `eifs-primer`).
- Role mappings for US, GB and AU, pointed at the existing materials.
- A shared `priceSystemBoq` that resolves through the same city-aware resolver
  as every other calculator, so evidence, currency and provenance match.
- Unit enforcement: a form block is sold per m2 of face, ready-mix per m3,
  rebar and coatings per kg. The engine states each line's quantity in the
  priced unit, and a disagreement is refused rather than multiplied.

Verified end to end against the live book for a 40 x 3 m US wall:

| System            | Priced lines | Subtotal      | Per m2 |
| ----------------- | ------------ | ------------- | ------ |
| ICF, 200 mm core  | 5            | 13,306.42 USD | 110.89 |
| EIFS, 50 mm board | 7            | 7,247.30 USD  | 60.39  |

Both fall inside published US materials-only ranges, which is the check that
matters: the arithmetic reaches real money, not a plausible-looking zero.

Data defects fixed to make that possible: all twelve materials had a null unit,
and the catalogue had no cubic-metre unit at all, so ready-mix had nothing to
denominate in. Units are now set and `m³` exists.

## Inputs

ICF brackets: core 100/150/200/250/300 mm plus a custom value clamped to
75-400 mm; foam standard/graphite; form flat/waffle/screen; vertical spacing
400/600; horizontal every course or every second; rebar metric and US sizes;
openings with count; corners 90 and 45; T-walls; dowels; basement; fire lining;
bars per web and per course. Block face length and height are now inputs, since
templates and buyers already distinguish 1200 x 400 from 1219 x 406.

EIFS brackets: insulation 25/40/50/75/100/120/150/200 mm plus a custom value
clamped to 10-300 mm; substrates; barrier versus drainable; adhesive, mechanical
or both; five finish textures; impact zone height; expansion joints; corners.

## Templates

Four public templates already existed in `calculator_templates` for these two
types, and the database check constraint already accepted `icf` and `eifs`. The
TypeScript union did not, and the market globalizer had no branch for either, so
those templates rendered an empty dimension sentence. Both fixed, plus four
matching fallback templates for the offline path.

ICF and EIFS prefilled inputs keep metres in every market, because their engines
take metres under `wallLengthM` and `wallHeightM`. The test states that
exception explicitly instead of labelling a metre value as feet.

## Still open

- Price coverage is partial and honest. Nine roles exist per system, and the
  book currently maps: US 9 of 9, GB 5 of 9 (missing concrete, rebar, finish,
  primer), AU 4 of 9 (missing form block, concrete, adhesive, finish, primer).
  Every unmapped role makes the BOQ say "quantities only" rather than borrow a
  currency. NG is left empty on purpose: ICF and EIFS are not stocked at retail
  there, so any NG figure would be invented.
- The migration `20261119150000_icf_eifs_gb_au_roles.sql` adds the GB and AU
  roles that could be sourced from a retailer page, records the pack size and
  VAT/GST basis in each note, and sets `verification_status` on the first twelve
  rows, which were written with none. `icf-eifs-seed-units.test.ts` fails if a
  seeded unit_label ever disagrees with the unit the engine prices that role in,
  because system-boq-pricing would otherwise drop the line silently.
- Bracing, fixings, WRB, drainage, trims and labour are quantity-only, on
  purpose: no market price is recorded for them.
- The two pages display rates and subtotals but do not yet load a saved
  template into the form. That is the Calculator Templates System work, not a
  defect in these engines.

## Independent arithmetic audit

Formulas were recomputed by hand from the published rules and diffed against
engine output, rather than reading the code and agreeing with it. Case: 10 m x
3 m wall, 200 mm core, flat form, 4% cutting waste, 5% concrete over-order, four
90 degree corners.

| Quantity                         | Hand calculation            | Engine | Verdict                           |
| -------------------------------- | --------------------------- | ------ | --------------------------------- |
| Courses                          | ceil(3.0 / 0.4) = 8         | 8      | Correct                           |
| Blocks before corners            | ceil(30 / 0.48 x 1.04) = 65 | 65     | Correct                           |
| Corner blocks                    | 4 x 8 = 32                  | 32     | Correct                           |
| Straight blocks                  | 65 - 32 = 33                | 33     | Correct                           |
| Cutting allowance                | 65 x 0.48 - 30 = 1.20 m2    | 1.20   | Correct                           |
| Net concrete                     | 30 x 0.20 x 0.985 = 5.91 m3 | 5.91   | Correct                           |
| Pump prime                       | 5.91 x 5% = 0.30 m3         | 0.30   | Correct                           |
| Total concrete                   | 6.21 m3                     | 6.21   | Correct                           |
| Sand at 790 kg/m3                | 4.91 t                      | 4.91   | Correct                           |
| Aggregate at 1150 kg/m3          | 7.14 t                      | 7.14   | Correct                           |
| Water at 182 L/m3                | 1,131 L                     | 1,131  | Correct                           |
| Cement at 350 kg/m3, 42.6 kg bag | 51.0 bags                   | 52     | Correct, rounded up to whole bags |

EIFS, same wall, 50 mm board, 6% waste:

| Quantity            | Hand calculation           | Engine         | Verdict |
| ------------------- | -------------------------- | -------------- | ------- |
| Effective area      | 30 x 1.06 = 31.8 m2        | 31.8           | Correct |
| Boards              | ceil(31.8 / 0.72) = 45     | 45             | Correct |
| Board volume        | 45 x 0.72 x 0.05 = 1.62 m3 | 1.62           | Correct |
| Continuous R        | 1.9685 in x 3.85 = 7.58    | R-7.6          | Correct |
| RSI at lambda 0.038 | 0.05 / 0.038 = 1.32        | 1.32           | Correct |
| U factor            | 1 / (1.32 + 0.17) = 0.67   | 0.671          | Correct |
| Starter track       | perimeter 10 m, 3 m pieces | 10 m, 4 pieces | Correct |
| Corner bead         | 4 corners x 3 m = 12 m     | 12 m, 4 pieces | Correct |

Every figure reconciles. Nothing in the core arithmetic is a placeholder.

## Expansion joints

`expansionJointLengthM` documents "auto-calculated if 0", and the audit found the
auto path only fires when the wall run exceeds 15 m. That is defensible, since
movement joints belong on long runs, but the input description overstates it. The
behaviour is correct; the wording is not. Left as a documented nuance rather than
changing an engineering threshold without a source.

## Shared calculator shell

Both pages render inside `ToolShell` with their own route
(`/icf-wall-estimator`, `/eifs-wall-estimator`), the same wrapper every other
calculator uses, so navigation, header, disclaimer and layout come from one
place. The two aliases `/icf-calculator` and `/eifs-calculator` redirect to them
rather than rendering a second implementation.
