# Shared openings schedule

2026-11-20.

## Why

Three unrelated opening shapes existed: build-to-roof carried `{type: "door" | "window", width, height, count}` in metres, estimation carried `quantity`, and wall-finishing carried its own. Each allowed exactly one door size and one window size per building, so a house with a 600 mm toilet window and an 1800 mm living room window could only be described by averaging them, and an entrance door wider than the bedroom doors could not be described at all.

## The model

`src/lib/estimation/openings.ts` is the single source of truth.

- Three categories: `window`, `internal_door`, `entrance_door`. Entrance and security doors are one category because they are the same physical product ordered at the same size; separating them would ask the user to decide something the takeoff does not act on.
- `OpeningGroup` is one size: category, optional label, width and height in millimetres, count. Any number of groups per category, so 18 windows can be 8 at 1800 x 1500, 4 at 1200 x 1200 and 6 at 600 x 600.
- `normaliseOpenings` accepts the canonical shape and the legacy shapes, clamps to buildable limits (200 to 6000 mm wide, 200 to 4000 mm high, 200 per group) and reports what it changed instead of silently pricing nonsense.
- `openingTotals` returns per-category counts and areas, total area, and reveal perimeter.
- Two deduction policies, because two different questions are being asked:
  - `structuralDeduction` removes the whole opening. A void in a wall is a void, whatever its size.
  - `tradeDeduction` is the finishing rule already used by the paint engine: nothing deducted at or below 0.5 m2, 85 percent between 0.5 and 3 m2, full deduction plus reveals above 3 m2. Applying the 85 percent rule to masonry would overstate the blockwork; applying the structural rule to paint would understate it.

## Where it is used

- Build-to-roof: walls deduct structurally; the result carries `openings_schedule` with groups, totals and per-category counts; the page edits one section per category with add/remove rows in millimetres.
- Build-to-roof templates: three public templates (3-bedroom bungalow, 2-storey duplex, US single family home) carry full schedules, in the database and in the offline fallback list.
- Globaliser: build-to-roof templates now produce a dimension sentence ("15 x 12 m footprint, 1 floor, 10 windows, 5 internal doors, 1 entrance door") instead of an empty string.

## Adoption status

ICF and EIFS engines now accept `openingGroups` and prefer it over their legacy metre list, converting at the boundary with `toMetreOpenings` so their tested internals, including ICF lintel cages and EIFS reveal depths, are untouched. Parity is pinned by test: the same openings produce identical block counts, concrete volumes, board counts and reveal areas whichever shape they arrive in.

`OpeningGroup` gained optional `id`, `level`, `room`, `sillMm` and `revealDepthMm`. Arithmetic ignores the first four; they exist so a schedule can be compared between revisions and read floor by floor. `revealDepthMm` is used by EIFS, where a deeper reveal adds clad area.

Legacy adapters (`fromMetreOpenings`, `fromDisplayOpenings`) read the old shapes into the canonical model, including the unit trap: 1.2 ft is 366 mm, not 1200 mm.

Still to do: the ICF and EIFS **pages** still render their own metre-based opening editors. The engines accept both shapes, so nothing is broken and no saved draft changes meaning, but the shared editor component has not been swapped into those two pages yet.

## Not yet adopted

Paint, screeding, drywall and EIFS still hold their own opening inputs. Paint's tiered rule is the source of `tradeDeduction`, so the policy is shared even though the input shape is not. Moving those pages onto `OpeningGroup` is a separate change and should be done one calculator at a time with before/after numbers on existing fixtures, because it changes inputs users have already saved.

## Building types

`src/lib/estimation/building-types.ts` holds 15 types, up from 7, each with a per-region opening profile: window, internal and entrance counts that reflect how that building is actually built in that region rather than one global guess. `buildingTypesForMarket` puts the region's own types first and always offers `custom`.

These profiles are typical practice, not code. They seed a schedule the user can edit; they are not a claim about what a building must contain.
