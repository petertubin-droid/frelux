# FRELUX engine UI audit, 29 October 2026

Scope: the engine inventory (`src/lib/international/engine-inventory.ts`), the route table
(`src/App.tsx`, 293 routes), and a live smoke test of 20 engine-facing pages on the current
production build served locally at 390x844 with cookie consent pre-accepted.

Verdict: the customer-facing calculator layer is in good shape for a v1 launch in the markets it
was built for, but it is not yet at "global operations standard". Three things block that: the
inventory says 8 engines are unbuilt in 18 of 20 markets even though their pages ship, one engine
page carries the wrong identity, and the share/PDF promise is uneven across the calculator family.

## 1. Catalogue reality

- The inventory holds **56 engines**, not 58. Two engines referenced in conversation are not
  catalogued; either they were dropped or they live outside the inventory and are unaudited.
- Classification: 37 independent engines, 7 AI pipelines, 5 workflow orchestrations,
  4 shared services, 3 intelligence crawlers.
- Market matrix: 20 markets x 56 engines = **1120 cells**. Verified **813 (72.6%)**,
  partially verified 138 (12.3%), not implemented 144 (12.9%), requires verification 25 (2.2%).
- Internationalisation status: 33 engines `verified_full`, 5 `verified_15_markets`,
  8 `partially_verified`, 7 `requires_verification`, 3 `market_method_bound`.

## 2. UI smoke test (20 engine routes)

All 20 routes returned 200 with a real heading except `/build-to-roof-estimator`, which rendered
no `<h1>` and one input (wizard shell renders after interaction; needs a deliberate check).

Inputs and calculation buttons were present and working on every finishing, structural and MEP
estimator tested: paint, screeding, tile, POP ceiling, wall finish, flooring, waterproofing,
foundation, reinforcement, doors and windows, electrical, plumbing, generator, solar PV,
finishing, demolition. PDF export appeared after calculation on flooring, waterproofing,
foundation, reinforcement, doors and windows, electrical, plumbing and generator.

### Defects found

| Severity | Finding | Evidence |
| --- | --- | --- |
| P0 | `/generator` renders as "Doors & Windows Estimator" in its heading, breadcrumb and shell title | `src/pages/GeneratorEstimator.tsx:66,323,325` |
| P1 | 8 engines are marked not implemented in 18 of 20 markets while their UI ships: tyrolene, grafitex, mineral stone, stucco, flooring, waterproofing, build to roof, doors and windows. Either the matrix is stale or those pages compute with non-local rules in US/GB/DE/JP and 14 others | inventory `marketMatrix` |
| P1 | Share is not universal: `ShareEstimateButton` is used on 6 pages (build to roof, finish, painting, POP cost, screeding cost, tile cost), not across the whole calculator family | `grep ShareEstimateButton src/pages` |
| P1 | PDF export is uneven: present on the estimator family, absent on the four hub calculators until a cost mode is chosen | smoke test + `Export quote (PDF)` usage |
| P2 | `/build-to-roof-estimator` ships an empty heading and no visible first-step input | smoke test |
| P2 | Ad units rendered 2 to 4 per calculator page; the agreed cap is 2 for calculators, 3 for long pages | smoke test (`ins.adsbygoogle`, GPT, Monetag iframes) |
| P2 | `/fence-calculator` and `/heat-comfort-estimator` 404. Fence has no route at all despite being catalogued; heat comfort lives at `/heat-comfort` | smoke test, `src/App.tsx:1631` |
| P2 | Screeding hub is titled "Wall Mudding / Skim Coating Calculator" while the route, nav and SEO copy say screeding; naming drift hurts trust and search alignment | smoke test |

## 3. What is launch-ready

- Room-based painting method with feet/metric input and 20 L bucket purchasing, no m2 input
  exposed, holds up under the smoke test.
- Structural, MEP and costing estimators produce numeric output and PDF quotes.
- Every engine in the inventory has at least one verified market; none is orphaned.
- No page error surfaced in any of the 20 routes tested.

## 4. Fix order

1. Correct the generator page identity (title, breadcrumb, shell) and confirm the engine it runs is
   the generator engine. Cheap, high trust impact.
2. Reconcile the inventory with the shipped UI: for the 8 engines marked unbuilt in 18 markets,
   decide per market whether the UI should be hidden, labelled "beta, non-local rules", or given
   local rules. Then update the matrix to match reality so audits stop contradicting the product.
3. Make share universal: mount `ShareEstimateButton` on every calculator and estimator route,
   including the hub calculators, with the "FRELUX SMART CALC" header on the PDF.
4. Close the 25 `requires_verification` cells and the 138 partially verified cells, starting with
   the markets that carry traffic (NG, US, GB, CA, AU, DE, IN).
5. Verify the ad cap at runtime on a deployed build, not just in code.
6. Fix the build-to-roof first paint, the screeding naming, and the two dead paths.

## 5. Method limits

Detection of share and PDF buttons was text and DOM based on the built bundle; pages that expose
them behind a result state or a menu can read as missing. The market matrix was taken as authored,
not re-derived from engine code. Both are worth a second pass before any of these numbers are
quoted externally.
