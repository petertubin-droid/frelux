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

## Batch 1: Concrete and substructure (partly done, 22 November 2026)

| Module                                  | Entry point                | State                                                                                                                                                                                  |
| --------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estimation/advanced-takeoff-engine.ts` | `calculateConcreteTakeoff` | done as `concrete_takeoff`                                                                                                                                                             |
| `estimation/icf-engine.ts`              | `calculateIcfWall`         | done as `icf_wall`                                                                                                                                                                     |
| `estimation/reinforcement-engine.ts`    | `calculateReinforcement`   | dropped: `engines-structural.ts` already registers a `reinforcement` engine under that id. The registry refuses a second claimant, and renaming mine would report the same maths twice |
| `globalization/takeoff-engines.ts`      | `calculateConcreteVolume`  | open                                                                                                                                                                                   |
| `estimation/increte-engine.ts`          | `calculateIncrete`         | open, needs a product catalogue to mean anything                                                                                                                                       |

Both shipped adapters have a parity test that calls the adapter and the engine
directly and compares by label.

## Batch 2: Masonry and blockwork

| Module                                    | Entry point                  |
| ----------------------------------------- | ---------------------------- |
| `estimation/masonry-standalone-engine.ts` | `resolveMarketMasonryConfig` |
| `measurement/fence-engine.ts`             | `createFenceDimension`       |

## Batch 3: Roofing, timber and envelope

| Module                               | Entry point               |
| ------------------------------------ | ------------------------- |
| `roof/geometry-engine.ts`            | roof geometry generation  |
| `roof/roof-material-engine.ts`       | `createRoofMaterialSpec`  |
| `estimation/waterproofing-engine.ts` | `parseWaterproofingRules` |
| `estimation/soffit-gutter-engine.ts` | `parseSoffitGutterRules`  |

## Batch 4: Structural and temporary works

| Module                                            | Entry point                      |
| ------------------------------------------------- | -------------------------------- |
| `estimation/retaining-wall-engine.ts`             | `parseRetainingWallRules`        |
| `estimation/temporary-works-standalone-engine.ts` | `calculateTemporaryWorksTakeoff` |
| `engineering/tall-building-engine.ts`             | wind and elevation checks        |
| `engineering/mathematical-elevation-engine.ts`    | `calculateMathematicalElevation` |

## Batch 5: Finishing trades

| Module                                       | Entry point                  |
| -------------------------------------------- | ---------------------------- |
| `estimation/paint-engine.ts`                 | `calculateTheoreticalLitres` |
| `estimation/painting-engine.ts`              | `litresToBuckets`            |
| `estimation/plaster-render-engine.ts`        | render takeoff               |
| `estimation/exterior-finish-engine.ts`       | `sharedFinishLayers`         |
| `estimation/drywall-standalone-engine.ts`    | `calculateDrywallTakeoff`    |
| `estimation/flooring-engine.ts`              | `parseFlooringRules`         |
| `estimation/insulation-standalone-engine.ts` | `calculateInsulationTakeoff` |
| `estimation/mineral-stone-engine.ts`         | `calculateMineralStone`      |
| `wallfinishing/quantity-engine.ts`           | `calculateWallAreas`         |
| `wallfinishing/cost-engine.ts`               | `calculateLayerCost`         |

## Batch 6: Building services

| Module                                       | Entry point                    |
| -------------------------------------------- | ------------------------------ |
| `estimation/conduit-wiring-engine.ts`        | `parseConduitWiringRules`      |
| `estimation/nec-electrical-engine.ts`        | `calculateNecPreliminaryCable` |
| `estimation/pipe-sizing-engine.ts`           | `boresFor`                     |
| `estimation/plumbing-standards-engine.ts`    | `calculateUpcIpcDrainage`      |
| `estimation/septic-sizing-engine.ts`         | `calculateSepticSizing`        |
| `estimation/solar-pv-engine.ts`              | `calculateSolarPv`             |
| `estimation/water-tower-staging-engine.ts`   | `calculateWaterTowerStaging`   |
| `estimation/borehole-water-system-engine.ts` | `trenchDepthForMarket`         |
| `estimation/drainage-standalone-engine.ts`   | `calculateDrainageTakeoff`     |
| `estimation/generator-engine.ts`             | `parseGeneratorRules`          |
| `estimation/heat-comfort-engine.ts`          | `calculateHeatComfort`         |

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
