-- Full body rewrite: cost-estimation-wall-finishing-projects (finishing-guides #7)
-- Replaces the phase52/53 template body (~95% duplicated across 55 articles)
-- with a structure that delivers the article's title. Unique intro preserved.
-- Guarded on the template heading '## Understanding the Fundamentals'; re-run is a no-op.
UPDATE learn_articles SET content = $body$
## Introduction

Wall finishing quotes in Nigeria vary by a factor of three for the same job, and the cheapest quote rarely stays cheapest. Some contractors price without preparation, some skip primer, some quote per coat instead of per job — and the differences only surface after work begins.

This guide shows how to build a wall finishing estimate from first principles: measuring area correctly, pricing materials per square metre, accounting for labour models, and comparing quotes line by line so you can see what each one silently omits. Estimating this way takes twenty minutes and removes the guesswork from a notoriously variable trade.

## Step 1 — Measure the Area Honestly

The estimate is only as good as the measurement, and the standard error is measuring everything as if it were flat wall.

- **Gross wall area** = perimeter × height, room by room. Measure each wall separately — rooms are rarely square.
- **Subtract openings**: doors and windows. But only the glazing-and-frame area; reveals (the jambs and sills inside an opening) take material and are usually *added back* as metres of edge work, because they consume coating disproportionately.
- **Height matters more than people expect**: high ceilings add area faster than floor plans suggest, and anything above normal reach adds scaffolding time to labour, not just area to materials.
- **Do not forget ceilings** if they are in scope — the ceiling is often the largest single "wall" in the room, plus a different (often white) paint.

The honest number you need: net wall area per room, net ceiling area, total metres of internal and external corners and reveals, and the reach/scaffolding question for anything above about 2.4 m.

## Step 2 — Build the Materials Line from the System

Materials follow directly from the system the wall needs (see [types of wall finishes](/learn/types-of-wall-finishes-skim-coat-putty-paint) for choosing). Per square metre of wall, a full build-up consumes:

| Layer | Consumption driver | Planning figure |
|---|---|---|
| Skim (cement-based) | Thickness ~3 mm, two passes | Under 0.01 m³ of mix per m² — roughly a bag of cement serves a few tens of m² with plaster sand |
| Skim (gypsum, bagged) | ~1–1.5 kg per m² per mm of thickness | A 40 kg bag covers roughly 25–35 m² at skim thickness |
| Putty | Thin scrapes, 2 passes | A 20 kg tub covers a large room's pinholes — small money, never skip it |
| Primer | First coat on fresh skim | Roughly 10–12 m² per litre |
| Emulsion | Two coats | Roughly 10–14 m² per litre per coat — two coats over primer |

These are planning figures, not gospel — coverage varies with surface suction, application, and product. The point of building the estimate bottom-up is that you know exactly which numbers to adjust when a coverage rate surprises you. For an automated version that prices current quantities against your own measurements, use the [finishing estimator](/finish-estimator) and the [paint calculator](/paint-calculator).

**One budget rule:** buy primer for the full wall area, always. The line most often silently deleted from cheap quotes is the one whose absence cannot be seen on completion day — and shows up as peeling within a season.

## Step 3 — Cost Labour Correctly

Labour in Nigerian finishing is priced in three common models, and quotes are incomparable until you know which one you are looking at:

1. **Per square metre (rate per m²).** The cleanest model for large, well-defined jobs — but confirm what the rate *includes*: skim only? skim + sand + putty + prime + paint? Scaffolding?
2. **Per day (labourer-days).** Flexible for unpredictable work; dangerous for you unless someone competent controls the pace.
3. **Job-and-finish (total for the room/project).** Simple to compare, but only comparable if the scope in writing is identical.

What drives labour cost up honestly: wall condition (every mm of deviation adds skim time), height (scaffolding, slower work), detail density (reveals, corners, fittings), and sanding quantity. Two identical rooms can carry meaningfully different labour if one is sound plaster and the other is rippled.

## Step 4 — Put the Estimate Together

A complete wall finishing estimate has five lines, and each must appear in every quote you compare:

1. **Preparation** — cleaning, crack repair, hollow-patch re-plastering (the invisible stage; the classic omission)
2. **Levelling** — skim or alternative, plus sanding consumables
3. **Filling** — putty
4. **Sealing** — primer
5. **Decoration** — paint coats, plus edge/corner labour

Add contingency of roughly 10 to 15% for the stages that surprise: re-plastering reveals, and material coverage worse than planning figures. That percentage is not pessimism — it is the standard experience of finishing in old or hand-built stock.

## Step 5 — Compare Quotes Line by Line

Put three quotes side by side against the five-line structure. Typical findings:

- **The cheapest quote** is usually preparation-free and primer-free. It is not cheaper; it is later. Repainting a failed room costs more than the difference.
- **Per-coat pricing** looks low per coat and multiplies silently — count the coats, not the coat price.
- **Quotes without measured areas** are opinions. A contractor who never measured your walls has estimated nothing.
- **The "same paint" question** — confirm brand and grade in writing; the same colour name exists at several price points.

Ask each bidder the same three questions: *What wall condition did you assume? What exactly does your rate include? What would you charge extra for, if you find X?* The answers reorganize the price list more honestly than the totals do.

## What Moves Prices Between Markets and Months

Material prices move — cement and gypsum noticeably — so any fixed price list in an article (including this one) is out of date before publication. What stays stable is the *structure*: area × system layers × labour model × contingency. Rebuild the numbers each project; for current pricing run your measurements through the [finishing estimator](/finish-estimator).

## Closing

A wall finishing estimate you can trust is measured honestly, built from the system the walls actually need, priced across five visible lines, and compared quote-to-quote on those lines — not on totals. Twenty minutes of first-principles work eliminates the factor-of-three guesswork. Size and price your own project with the [finishing estimator](/finish-estimator); for the application sequence behind these costs, see the [complete guide to interior wall finishing](/learn/complete-guide-interior-wall-finishing).
$body$, updated_at = now()
WHERE slug = 'cost-estimation-wall-finishing-projects' AND status = 'published' AND content LIKE '%## Understanding the Fundamentals%';
