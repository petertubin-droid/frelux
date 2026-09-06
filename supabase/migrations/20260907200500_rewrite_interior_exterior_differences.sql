-- Full body rewrite: interior-vs-exterior-wall-finishing-differences (finishing-guides #6)
-- Replaces the phase52/53 template body (~95% duplicated across 55 articles)
-- with a structure that delivers the article's title. Unique intro preserved.
-- Guarded on the template heading '## Understanding the Fundamentals'; re-run is a no-op.
UPDATE learn_articles SET content = $body$
## Introduction

Interior and exterior finishing look like the same craft but are separated by one brutal client: the weather. A finish that stays flawless on a bedroom wall can chalk, blister, and peel within eighteen months on a sun-facing exterior — not because the product failed, but because it was asked to do a job it was never designed for.

This guide compares the two environments: UV exposure, thermal movement, rain and humidity, and what they demand of binders, primers, and surface preparation. You will learn which products genuinely bridge both worlds and where the split genuinely matters.

## What the Wall Faces Indoors vs Outdoors

| Factor | Interior walls | Exterior walls |
|---|---|---|
| UV exposure | Almost none | Full sun, especially west-facing walls |
| Temperature swings | Small, gradual | Large daily swings; surface heat far above air temperature |
| Moisture | Occasional (steam, splashes) | Driven rain, humidity cycles, rising damp at the base |
| Movement | Minimal | Daily expansion/contraction; cracks open and close |
| Mould / growth risk | Kitchens, bathrooms, dark corners | Shaded, damp faces; vegetation touching walls |
| Wear | Rubbing, scuffs, washing | Wind-blown dust, impact from weathering |

Interior finishing is an exercise in *appearance under inspection* — raking light, close contact, feel. Exterior finishing is an exercise in *durability under attack* — the surface is a raincoat first and a look second.

## Binders — Where the Product Split Begins

The binder in the coating decides how it handles weather:

- **Emulsion (water-based) paints** dominate interiors: low odour, easy cleanup, matte and silk sheens, cheap per litre. Standard emulsions outdoors chalk and wash out quickly unless the product is specifically formulated as exterior-grade — the binder is simply not built for UV.
- **Exterior emulsions (100% acrylic binder)** resist UV and stay flexible through thermal movement. This is the correct default for Nigerian exterior walls.
- **Weather-shield / elastomeric coatings** add film flexibility and crack-bridging ability at higher cost — worth it on faces that take driven rain or have hairline movement.
- **Textured coatings** (sand/tyrolene-style finishes) hide substrate imperfection and shed water well; the trade-off is a rough surface and a bigger repair job when they fail locally.
- **Gypsum-based materials — skim and putty — have no exterior job.** Gypsum slowly dissolves with wetting. Every exterior build-up must be cement-based. This is the single most consequential interior/exterior split in the Nigerian market.

## Preparation — Same Discipline, Higher Stakes Outside

**Interior:** the sequence from the [complete guide to interior wall finishing](/learn/complete-guide-interior-wall-finishing) — assess, repair, skim or putty as needed, dust, prime, paint.

**Exterior** shares the skeleton but adds weather-specific steps:

1. **Repair cracks properly, not cosmetically.** Exteriors move; a filler that cannot flex re-cracks in one season. V-grove, fill with a flexible exterior filler, and expect hairline movement to reopen anything bridged rigidly.
2. **Kill algae and mould** on shaded faces before coating — fungicidal wash, dry, then coat. Painting over live growth buries the colony, not the problem.
3. **Address the damp paths.** Rising damp at the wall base, splash zones without aprons, blocked gutters dumping water down one face. An exterior coat over an active water path fails from the inside out.
4. **Prime with an exterior-compatible primer.** Interior primer under exterior paint is a separation layer waiting to happen.
5. **Check the forecast for application itself:** work on shaded faces at the right time of day, never under direct blazing sun (the film dries at the surface before it can bond), and never when rain is imminent.

## Movement Joints and Detailing — The Exterior Conversation That Has No Interior Equivalent

Exterior walls cycle through heat every day, and everything rigid eventually cracks at the weakest line. Practical detailing:

- **Respect existing movement joints** — do not fill them with plaster; fill with a flexible sealant system.
- **Beads and flashing at openings** keep water off the flat faces and out of the joints.
- **Parapets, copings, and horizontal tops** get more water than any vertical face — detail them with the waterproofing mindset, not the paint mindset.

## Which Products Genuinely Bridge Both Worlds

- **100% acrylic exterior emulsions** can be used indoors without harm — they are simply more expensive than interior grades and often glossier than wanted.
- **Cement-based skim and screed coats** work in both environments (interior gypsum does not).
- **Primers must match their side** — this is where "universal" claims most often disappoint.
- **Silicone, polyurethane, and hybrid sealants** are outdoor tools; interior acrylic caulk is for skirting and trim, not weather joints.

The honest summary: interior and exterior share technique; they do not share the shopping list.

## Lifespans and Maintenance Cycles

| System | Interior repaint cycle | Exterior repaint cycle (Nigerian conditions) |
|---|---|---|
| Standard emulsion on sound wall | 4–6+ years | Chalking visible within 1–2 years on sun faces |
| 100% acrylic exterior system | — | Roughly 3–5 years before refresh, longer on shaded faces |
| Textured / weather-shield coating | — | 5–8+ years with occasional cleaning |

Budget the exterior repaint as a scheduled maintenance item, not a surprise: sun faces burn through first, so many owners rotate — repaint the south and west faces more often than the whole building.

## Closing

Indoors, finish for the raking light; outdoors, finish for the rain and the sun. Use cement-based build-ups and exterior-grade acrylic systems outside, keep gypsum inside, respect movement joints, and never coat over an active water path. To size the materials for either campaign — interior refinish or exterior repaint — run the [finishing estimator](/finish-estimator); for exterior decorative texture specifically, the [tyrolene estimator](/tyrolene-estimator) sizes that route.
$body$, updated_at = now()
WHERE slug = 'interior-vs-exterior-wall-finishing-differences' AND status = 'published' AND content LIKE '%## Understanding the Fundamentals%';
