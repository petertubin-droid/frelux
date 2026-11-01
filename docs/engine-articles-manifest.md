# Engine article content manifest

This manifest documents the 25 Learn articles seeded by `20261031130000_engine_articles_and_faqs.sql`. Each article is tagged `GLOBAL`, uses the existing Learn renderer, and has six structured FAQs. Word counts include headings and the embedded FAQ section. Counts are computed from the exact content strings written by the generator; rerun the validation script when content changes.

| Engine family | Count | Minimum words | Articles |
|---|---:|---:|---|
| Diaspora Budget Tracker | 5 | 2224 | diaspora-construction-budget-tracking-across-currencies<br>foreign-exchange-rate-scenarios-for-overseas-construction-sponsors<br>inflation-buffers-and-project-cost-forecasts-a-planning-guide<br>milestone-budgets-funds-sent-and-local-spend-reconciliation<br>a-responsible-diaspora-project-finance-review-checklist |
| Manhattan Conduit Routing Estimator | 5 | 2236 | manhattan-conduit-routing-geometry-waypoints-and-cable-takeoff<br>planning-device-routes-from-a-distribution-board-to-lights-and-sockets<br>conduit-length-vertical-drops-and-installation-allowances-explained<br>electrical-takeoff-qa-separating-cable-quantity-from-circuit-design<br>a-room-by-room-workflow-for-coordinating-conduit-and-wiring-estimates |
| Universal Concrete Grade & Mix Ratio Engine | 5 | 2286 | concrete-volume-to-materials-a-transparent-preliminary-takeoff-workflow<br>concrete-grades-mix-ratios-and-why-they-are-not-interchangeable<br>estimating-cement-sand-and-aggregate-with-visible-assumptions<br>concrete-takeoff-checks-for-slabs-beams-columns-and-foundations<br>from-preliminary-concrete-estimate-to-a-verified-mix-submittal |
| Universal Rebar & BBS Engine | 5 | 2324 | rebar-takeoff-from-a-bar-bending-schedule-from-cutting-lengths-to-purchase-quantities<br>rebar-unit-weight-and-metric-imperial-conversion-for-construction-estimates<br>rebar-waste-laps-stock-lengths-and-procurement-planning<br>reading-reinforcement-quantities-by-bar-diameter-and-structural-element<br>a-practical-quality-control-checklist-for-reinforcement-estimates |
| Water Tower Staging Estimator | 5 | 2238 | planning-an-elevated-water-tank-loads-site-inputs-and-professional-review<br>how-to-read-a-preliminary-water-tower-material-takeoff<br>concrete-and-steel-tank-staging-comparing-estimate-categories<br>water-tank-capacity-operating-loads-and-a-responsible-estimate-brief<br>water-tower-estimate-review-a-checklist-before-procurement |

## Editorial boundaries

- These are educational explainers, not engineering approvals, code-compliance claims, live price research, financial advice, or construction instructions.
- Concrete grade-to-ratio mapping is described as an illustrative configured estimating convention, not a universal structural mix design.
- Water-tower outputs are described as a preliminary prototype using fixed assumptions, not structural sizing or an approved factor of safety.
- Conduit routing is described as ordered Manhattan geometry and simple ceiling rises, not route optimization or circuit design.
- Diaspora calculations are described as user-entered FX/inflation scenarios and bookkeeping comparisons, not live market data or escrow custody.
- Rebar estimator articles distinguish schedule-based material takeoff from structural detailing and note configurable allowances and unconfigured prices.
- The SQL migration is idempotent by article slug and replaces FAQs for those article IDs on reapplication.
