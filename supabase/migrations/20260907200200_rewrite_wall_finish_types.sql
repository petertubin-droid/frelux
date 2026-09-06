-- Full body rewrite: types-of-wall-finishes-skim-coat-putty-paint (finishing-guides #3)
-- Replaces the phase52/53 template body (~95% duplicated across 55 articles)
-- with a structure that delivers the article's title. Unique intro preserved.
-- Guarded on the template heading '## Understanding the Fundamentals'; re-run is a no-op.
UPDATE learn_articles SET content = $body$
## Introduction

Ask for "wall finishing" at a Nigerian building materials market and you will be asked a follow-up question: skim coat, putty, or direct paint? They are three different products with three different costs, lifespans, and surface outcomes — and much confusion in the trade comes from treating them as interchangeable.

This guide explains what each material actually is, the wall condition each one is designed for, how they are applied, and what they cost per square metre. By the end you will know exactly which system your walls need instead of guessing at the counter.

## The Short Answer

These three materials are not competitors — they are layers in one system, and mature walls usually need two or all three of them:

- **Skim coat** builds trueness. It corrects ripples, hollows, and trowel marks up to about 3 to 5 mm. It is the structural work of a smooth wall.
- **Putty** builds perfection. It fills pinholes and hairline pores after sanding, in scrapes thinner than 2 mm. It is the cosmetic work.
- **Paint** is the finish itself — colour and sheen, over a sealed surface.

Choosing "one of the three" is the wrong question; the right one is which layers your wall actually needs, starting from its condition.

## Skim Coat — The Levelling Layer

### What it is

A thin finishing coat, 2 to 5 mm, whose job is a flat, true surface rather than strength. Two families dominate the Nigerian market:

| | Cement-based skim | Gypsum skim (pre-mixed bags) |
|---|---|---|
| Composition | Cement + fine sieved plaster sand (+ sometimes lime) | Gypsum powder, bagged, just add water |
| Mix control | You control the ratio and sand quality | Factory-controlled, consistent |
| Finish | Very good with skilled application | Excellent, whiter and finer |
| Setting | Slower; needs damp curing in heat | Fast setting; simply dries |
| Best for | Budget jobs, damp-prone walls, bulk areas | Interior walls, speed, uniform results |
| Watch out for | Shrinkage if over-thick; sand quality varies | Sets in the bucket in minutes; not for wet areas |

### When the wall needs it

Run a straightedge over the plaster: gaps over about 2 mm under the rule mean paint alone will memorialise the ripples rather than hide them. Anywhere the hand feels a ridge, the wall wants a skim.

### How it goes on

Mixed to a trowel-firm paste, applied with a steel trowel in two thin passes (never one thick one), the second pass flattening at a shallower blade angle, every section boundary feathered. Cement skims then get 2 to 3 days of damp curing in hot weather; gypsum skims dry through in roughly 24 to 48 hours, then sand.

## Putty — The Pore Filler

### What it is

A very fine, creamy paste — gypsum or acrylic-based — sold in tubs and small bags. It contains no coarse particles; its entire purpose is the last sub-millimetre of surface.

### When the wall needs it

After the skim (or bare plaster) has been sanded, two defects remain that paint will emphasise: **pinholes** — tiny air voids from the skim stage — and **sand-scratches**. If the raking light shows texture, putty is the answer.

### How it goes on

One thin, scraped pass with a wide flex knife (300 to 400 mm), let dry, sand flush with fine grit, remove dust. It must be thin: putty buried deeper than about 2 mm shrinks, cracks, and pops out in flakes. Bigger defects belong to the skim stage, not the putty tub.

### The mistake that costs most

Painting straight over an un-puttied skim. The first coat of paint sinks into every pinhole, and the second coat frames them in sheen. One putty pass before primer prevents a full repaint later.

## Direct Paint — When Nothing Between Is Needed

### What it is

Primer (or sealer) plus two to three topcoats applied straight onto plaster.

### When it genuinely works

Only on the best backgrounds: machine-finished or genuinely well-hand-trowelled plaster with deviations under about 1 to 2 mm, fully cured (28 days or more) and dry. In that case a primer to equalise suction plus two quality coats is a legitimate, economical finish — and any skim on top would be wasted money.

### When it is a false economy

Hand plaster almost always carries ripples. Two coats of paint do not level — they tint what is there. Direct paint over mediocre plaster is the most common "saving" in Nigerian finishing, and the most visible one in every evening's raking light.

## Primer — The Fourth Player Nobody Budgets

Whichever route you take, primer is not optional: it equalises suction, bonds the coats above to the surface, and evens out sheen. On new skim and putty, use a sealer primer or the paint manufacturer's stated first-coat dilution; on previously painted walls, prime every repaired or sanded-through patch at minimum. Skipping primer saves one coat of cost and repays it with patchy sheen that no number of extra topcoats fixes.

## What Each System Delivers — and Costs

Approximate relative economics per square metre of interior wall (materials only, order-of-magnitude, Nigerian market):

| System | Coats | Relative material cost | Surface result |
|---|---|---|---|
| Direct paint on good plaster | 1 primer + 2 paint | Base | Good where background is good |
| Putty + paint | 1 putty + 1 primer + 2 paint | Base + a little | Even, pore-free |
| Skim + putty + paint | 1–2 skim + 1 putty + 1 primer + 2 paint | Roughly 1.5–2× | Flat, true, professional |
| Re-plaster first, then skim+putty+paint | Full build-up | Whole new budget conversation | Depends entirely on the re-plaster |

Two honest rules: gypsum skim costs more per bag than cement but covers the drama of mixing skill; and labour is usually the deciding line, not material — skimming and sanding are skilled, slow stages. Rather than trusting any fixed price list, size your own rooms and price current materials with the [finishing estimator](/finish-estimator).

## Choosing in Practice — A Decision Path

1. Straightedge the wall. Deviations under 2 mm? → putty + primer + paint.
2. Deviations 2 to 5 mm, sound plaster? → skim + putty + primer + paint.
3. Hollow-sounding patches or cracks wider than hairline? → cut out and re-plaster those areas first, then step 2.
4. Wall damp (polythene test shows condensation)? → stop, find the moisture source, wait. No coating system survives an active damp problem.
5. Exterior or wet-area walls? → cement-based route only, plus waterproofing considerations — gypsum has no place where water is in play.

## Closing

Skim coat, putty, and paint are one system seen from three angles: skim for trueness, putty for pores, paint for appearance — with primer quietly holding all of them to the wall. Buy the layers your wall's condition demands, not the ones the counter suggests. For a room-by-room quantity and cost picture of whichever route you choose, run the [finishing estimator](/finish-estimator); for the full application sequence, see the [complete guide to interior wall finishing](/learn/complete-guide-interior-wall-finishing).
$body$, updated_at = now()
WHERE slug = 'types-of-wall-finishes-skim-coat-putty-paint' AND status = 'published' AND content LIKE '%## Understanding the Fundamentals%';
