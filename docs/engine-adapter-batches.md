# Engine adapter batches

Engine Studio runs an engine only when that engine has an adapter registered in
`src/lib/ai-foundation/`. On 21 November 2026 the console listed ten engines.
The registry module registers ten itself, and three further adapter modules
(`engines-expanded`, `engines-phase2`, `engines-structural`) each register their
own but were never called outside tests. `register-all.ts` now activates them,
which takes the console from 10 to 26 engines. Every one of the 26 has a UI
surface row and a canonical link.

That leaves the batches below. Each batch is one trade family, so an adapter can
be checked against the calculator page that owns the same maths. Every adapter
must ship with a parity test that calls the adapter and the engine function
directly and compares the quantities, because an adapter that drifts from its
calculator is worse than no adapter.

Rules for every batch:

1. Register with a distinct id. The registry refuses a second claimant for a
   taken id, which is how `foundation_below_dpc` got its name.
2. Add a `engine-surfaces.ts` row with the real route and the function it
   shares, and a `engine-canonical.ts` row. Leave the canonical id null and
   explain why when the international vocabulary has no honest match.
3. Prices stay out unless the engine takes a rate. A tonnage is a quantity;
   a cost without a rate is invented.
4. Compare by label, not by index, and expect the engine's own rounding.

## Batch 1: Concrete and substructure (closed, 22 November 2026)

| Module                                  | Entry point                | State                                                                                                                                                                                                  |
| --------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `estimation/advanced-takeoff-engine.ts` | `calculateConcreteTakeoff` | done as `concrete_takeoff`                                                                                                                                                                             |
| `estimation/icf-engine.ts`              | `calculateIcfWall`         | done as `icf_wall`                                                                                                                                                                                     |
| `globalization/takeoff-engines.ts`      | `calculateConcreteVolume`  | done as `concrete_volume`, surface marked `none` because no page calls it yet                                                                                                                          |
| `estimation/reinforcement-engine.ts`    | `calculateReinforcement`   | declined: `engines-structural.ts` already registers a `reinforcement` engine under that id, so a second claimant is refused and a rename would report the same maths twice                             |
| `estimation/increte-engine.ts`          | `calculateIncrete`         | declined: the engine takes a product list with per-package coverage, and there is no catalogue in the code. Inventing coverage figures would produce quantities that are wrong in a way nobody can see |

## Batch 2: Masonry and blockwork (closed, 22 November 2026)

| Module                                    | Entry point               | State                                                                                                                   |
| ----------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `estimation/masonry-standalone-engine.ts` | `calculateMasonryTakeoff` | done as `masonry`, surface `shared` with `/masonry-calculator`                                                          |
| `measurement/fence-engine.ts`             | `createFenceDimension`    | open: it builds a dimension record rather than quantities, so it needs a different adapter shape than the trade engines |

The masonry adapter passes the market code and lets the engine resolve the unit
profile, so a US CMU wall, a UK block wall and an Indian brick wall are all read
with their own unit size rather than a default.

## Batch 3: Roofing, timber and envelope (closed, 22 November 2026)

| Module                               | Entry point              | State                                                                                                                                     |
| ------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `estimation/waterproofing-engine.ts` | `calculateWaterproofing` | done as `waterproofing`, surface `/waterproofing`                                                                                         |
| `estimation/soffit-gutter-engine.ts` | `calculateSoffitGutter`  | done as `soffit_gutter`, surface `/rainwater-gutter-soffit-cost-estimator`                                                                |
| `roof/geometry-engine.ts`            | roof geometry generation | declined: it returns a geometry object for the 3D roof view, not quantity lines, so it needs a viewer adapter rather than a trade adapter |
| `roof/roof-material-engine.ts`       | `createRoofMaterialSpec` | declined: it builds a material specification record, the same shape problem as `createFenceDimension`                                     |

## Batch 4: Structural and temporary works (closed, 22 November 2026)

| Module                                            | Entry point                      | State                                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estimation/retaining-wall-engine.ts`             | `calculateRetainingWall`         | done as `retaining_wall`, surface `/retaining-wall-calculator`                                                                                                                     |
| `estimation/temporary-works-standalone-engine.ts` | `calculateTemporaryWorksTakeoff` | done as `temporary_works`, surface `/temporary-works-calculator`                                                                                                                   |
| `engineering/tall-building-engine.ts`             | wind and elevation checks        | declined: it performs design checks and returns pressure coefficients, not a quantity list, so there is nothing for a takeoff console to report                                    |
| `engineering/mathematical-elevation-engine.ts`    | `calculateMathematicalElevation` | declined: it returns a nested per-level math report plus discrepancies against hand calculations, and no page calls it. Flattening that into quantities would lose the point of it |

## Batch 5: Finishing trades (closed, 23 November 2026)

| Module                                       | Entry point                  | State                                                          |
| -------------------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| `estimation/drywall-standalone-engine.ts`    | `calculateDrywallTakeoff`    | done as `drywall`, surface `/drywall-calculator`               |
| `estimation/insulation-standalone-engine.ts` | `calculateInsulationTakeoff` | done as `insulation`, surface `/insulation-calculator`         |
| `estimation/paint-engine.ts`                 | `calculateTheoreticalLitres` | open, next                                                     |
| `estimation/painting-engine.ts`              | `litresToBuckets`            | open, next, pairs with paint-engine                            |
| `estimation/plaster-render-engine.ts`        | `calculatePlasterRender`     | done as `plaster_render`, surface `/plaster-render-calculator` |
| `estimation/exterior-finish-engine.ts`       | `sharedFinishLayers`         | open                                                           |
| `estimation/flooring-engine.ts`              | `calculateFlooring`          | done as `flooring`, surface `/flooring-calculator`             |
| `estimation/mineral-stone-engine.ts`         | `calculateMineralStone`      | declined: takes a product and profile record from a catalogue  |
| `wallfinishing/quantity-engine.ts`           | `calculateWallAreas`         | done as `wall_areas`, surface `/wall-finish-estimator`         |
| `wallfinishing/cost-engine.ts`               | `calculateLayerCost`         | declined: needs a resolved price per layer                      |

The paint pair was taken as one job, as planned: the `paint` adapter reports
theoretical litres from `paint-engine`, then the exact packs and the whole packs
to buy from `painting-engine`'s `litresToBuckets`. Coverage (10 m²/L) and pack
size (20 L) are inputs with disclosed defaults, because both are product
properties rather than rules.

Closed on 23 November 2026 with two adapters and two declines:

- `exterior_finish` reports the DEFS branch through `calculateExteriorFinish`,
  which is the same function the DEFS page reaches as `calculateDefs`: net wall
  area, mesh, base coat, primer and finish coat, plus the backing board, screws,
  tape, track and bead. On masonry the board lines are absent rather than zero,
  because the base coat goes straight onto prepared blockwork.
- `wall_areas` reports the measurement step every finishing layer starts from:
  gross, openings deducted, manual exclusions, net, reveals and finishing area.
  It needs no template, assembly or price, which is exactly why it can be
  adapted on its own.
- `mineral_stone` declined: `calculateMineralStone` takes a product and profile
  record with pack coverage and price, and there is no catalogue in the code.
  Inventing coverage would produce quantities wrong in a way nobody can see,
  the same reason `increte` was declined in batch 1.
- `wallfinishing/cost-engine` declined: `calculateLayerCost` requires a resolved
  price and labour rate. A cost without a rate is invented, so this engine has
  nothing honest to report in a console that supplies no prices.

The surface test now accepts a page that imports the module's barrel
(`@/lib/wallfinishing` for `@/lib/wallfinishing/quantity-engine`), which is how
the wall finishing estimator reaches its arithmetic.

## Batch 6: Building services (closed, 23 November 2026)

| Module                                       | Entry point                    | State                                                                              |
| -------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| `estimation/drainage-standalone-engine.ts`   | `calculateDrainageTakeoff`     | done as `drainage`, surface `/drainage-calculator`                                  |
| `estimation/septic-sizing-engine.ts`         | `calculateSepticSizing`        | done as `septic_sizing`, surface `/septic-sizing-calculator`                        |
| `estimation/plumbing-standards-engine.ts`    | `calculateUpcIpcDrainage`      | done as `plumbing_drainage`, surface `/plumbing`                                    |
| `estimation/nec-electrical-engine.ts`        | `calculateNecPreliminaryCable` | done as `nec_cable`, surface `/electrical`                                          |
| `estimation/conduit-wiring-engine.ts`        | `parseConduitWiringRules`      | declined: exposes a rule parser and `calculateConduitWiring` needs a rules table     |
| `estimation/generator-engine.ts`             | `parseGeneratorRules`          | declined: same shape, a rules table rather than a takeoff                           |
| `estimation/pipe-sizing-engine.ts`           | `boresFor`                     | declined: a static bore lookup, no measurement to report                            |
| `estimation/water-tower-staging-engine.ts`   | `calculateWaterTowerStaging`   | declined: returns an installation sequence, not quantities                          |
| `estimation/borehole-water-system-engine.ts` | `trenchDepthForMarket`         | declined: a trench-depth helper inside a 1,275-line system model                    |
| `estimation/solar-pv-engine.ts`              | `calculateSolarPv`             | open: needs a price input, so only the array sizing half is adapt-able as it stands |
| `estimation/heat-comfort-engine.ts`          | `calculateHeatComfort`         | open: comfort indices rather than quantities, needs a decision on what to report    |

Closed on 23 November 2026 with four adapters and six declines:

- `drainage` takes off pipe, stock pieces, chambers, manholes, bedding and
  excavation. A 20 m run of 110 mm at 1:60 with three chambers is the default
  the calculator opens with.
- `septic_sizing` reports daily design flow and tank working and total volume.
  The soakaway line is absent unless a soil loading rate is supplied, because a
  zero there would read as "no soakaway needed" rather than "not given".
- `plumbing_drainage` reports total fixture units, the drain capacity IPC and
  UPC allow at the recommended size, and the minimum slope. Two WCs, two
  lavatories, a shower and a kitchen sink is the default layout.
- `nec_cable` reports design current, run length, selected ampacity and voltage
  drop for a preliminary NEC size. It is North American only, and the canonical
  link says so.

The six declines share one reason: a parser, a lookup table, a sequence or a
price-dependent result is not a takeoff, and reporting it as one would put a
number in the console that no page produces.

## Batch 7: Siteworks and external works

| Module                                       | Entry point                  |
| -------------------------------------------- | ---------------------------- |
| `estimation/paving-standalone-engine.ts`     | `calculatePavingTakeoff`     |
| `estimation/demolition-standalone-engine.ts` | `calculateDemolitionTakeoff` |
| `estimation/global-site-safety-engine.ts`    | `calculateSiteSafety`        |
| `estimation/circular-reuse-engine.ts`        | `calculateCircularReuse`     |

## Batch 8: Commercial, cost and carbon

| Module                                   | Entry point                  |
| ---------------------------------------- | ---------------------------- |
| `estimation/boq-engine.ts`               | `generateBoq`                |
| `estimation/budget-variance-engine.ts`   | `computeBudgetVariance`      |
| `estimation/cash-flow-engine.ts`         | `calculateCashFlow`          |
| `estimation/margin-engine.ts`            | `calculateMargin`            |
| `estimation/contractor-credit-engine.ts` | `calculateCreditScore`       |
| `estimation/price-forecast-engine.ts`    | `forecastMaterialPrice`      |
| `estimation/embodied-carbon-engine.ts`   | `calculateEmbodiedCarbon`    |
| `estimation/labour-crew-engine.ts`       | `calculateLabour`            |
| `finance/retention-engine.ts`            | `computeRetention`           |
| `finance/tax-engine.ts`                  | `calculateJurisdictionalTax` |

## Not engines

Several modules in the inventory are plumbing rather than calculation:
`engines-registry.ts`, `engine-profile-types.ts`, `engine-inventory*.ts`,
`premium-engine-access.ts`, `use-engine-access.ts`, `engine-availability.ts` and
the measurement factory modules (`createSpace`, `createMaterialSpec`,
`createConstructionProject`, `generateQuotationNumber`, `nextInvoiceRef`). They
should not be adapted, and listing them as engines inflates the denominator the
coverage card reports.
