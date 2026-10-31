# Phase 4 baseline: calculators against the canonical engine layer

Measured at `cfc1c6e5`. 19 calculator and tool pages in `src/pages`, 20
canonical engines in the manifest.

Method: counted textual references to canonical engine ids per page, then
inspected imports where a page referenced none. Text matching is a proxy.
A dynamic import or a template-built id would not show up, so treat the per-page
numbers as indicative and the import evidence below as the actual finding.

## Headline

Only 5 of 19 calculators reference a canonical engine id. 14 reference none.
13 of the 20 canonical engines are referenced by no page at all:
`build_to_roof`, `roof_geometry`, `painting_wall_area`, `tyrolene_partition_area`,
`painting_project`, `tile_estimate`, `screeding_system`, `tyrolene_system`,
`regional_cost`, `margin_calculator`, `doors_windows`, `sequence_planner`,
`timeline_estimator`.

## Why: two computation paths exist

The missing references are not dead code. Those pages compute, they just do it
through the local estimation libraries instead of the registry:

| Page                  | Imports it computes through                                       |
| --------------------- | ----------------------------------------------------------------- |
| `PaintCalculator`     | `estimation/paint-engine`, `calc`                                 |
| `TileCalculator`      | `pop-tile-calc`, `estimation/multi-unit`                          |
| `MarginCalculator`    | `estimation/margin-engine`, `estimation/advanced-takeoff-engine`  |
| `ScreedingCalculator` | `use-calc-defaults` only, so the arithmetic is effectively inline |

So there are two ways to produce a number in this platform: through
`executeEngine` in the AI layer, and directly through an estimation library from
a page. The directive prohibits duplicated systems, and this is one.

## What does not apply to the direct path

This is why it matters rather than being untidy:

- **Precision.** `executeEngine` enforces 2dp for money and 3dp for quantities
  and refuses non-finite values. A page calling `paint-engine` directly gets
  whatever the library returns, so the same calculation can format differently
  depending on which path ran it.
- **Identification.** The canonical manifest, and therefore the admin matrix,
  only sees work routed through the registry. Two thirds of the calculators are
  invisible to it.
- **Metering and cost.** Credit metering, cost accounting and billing run at the
  gateway around `executeEngine`. Direct page computation sits outside it.
- **Refusal behaviour.** The registry refuses to calculate without an explicit
  market code rather than defaulting to Nigeria. A direct library call makes
  that guarantee only if the library itself does.

## Recommended next step, deliberately small

Do not migrate 14 pages at once. Pick one, instrument it end to end, and prove
the numbers are identical before touching a second.

`PaintCalculator` is the pilot: it already imports `estimation/paint-engine`,
that engine is well covered by tests, and paint has a documented US unit defect
in its history, so a silent behaviour change would be caught. Route it through
`executeEngine`, compare old and new output across the existing fixtures, and
only then generalise.

The general shape should be a thin adapter from page to engine, not a rewrite of
the estimation libraries. Those libraries are the tested core; the gap is the
missing seam between them and the registry.

## Not done yet

No page was modified. This is measurement only, because a change here alters
numbers users have already seen, and that deserves a deliberate pilot rather
than a sweep.
