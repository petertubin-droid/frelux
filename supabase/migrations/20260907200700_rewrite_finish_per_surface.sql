-- Full body rewrite: choosing-right-finish-different-surfaces (finishing-guides #8)
-- Replaces the phase52/53 template body (~95% duplicated across 55 articles)
-- with a structure that delivers the article's title. Unique intro preserved.
-- Guarded on the template heading '## Understanding the Fundamentals'; re-run is a no-op.
UPDATE learn_articles SET content = $body$
## Introduction

Not every wall wants the same finish. A living room wall, a kitchen splash area, an exterior face battered by sun and rain, and an interior concrete column each demand different surface treatments — and applying the wrong one means peeling paint within one rainy season.

This guide maps the common surfaces in Nigerian buildings to the finishes that suit them: what works on new blockwork, on concrete, on previously painted walls, in wet areas, and outdoors. Each pairing comes with the reason it works, so the next time you face an unusual surface you can reason your way to the right answer.

## The Reasoning — Three Questions for Any Surface

Every correct surface-finish pairing answers three questions:

1. **What is the surface made of, and how does it suck?** High-suction backgrounds (new blockwork, fresh plaster) need suction control; low-suction ones (dense concrete, old gloss paint) need mechanical key or bonding primer.
2. **Will water touch it?** Rain, splash, or steam decides whether the build-up must be cement-based and water-resistant — gypsum fails wherever water recurs.
3. **Will it move?** Daily thermal cycling (exteriors) and drying shrinkage (new work) demand flexible coats and sealants, not rigid fillers.

Hold any surface against those three questions and the right finish is usually obvious. The rest of this guide applies them to the surfaces you actually meet.

## New Blockwork and Fresh Plaster

**Situation:** high suction, still drying, minor to moderate deviations.

**The answer:** patience, then a cement-based build-up. Allow roughly 28 days of drying after plastering (polythene test to confirm), dampen before cement coats to control suction, then skim thin if needed, putty, prime, paint.

**Why:** fresh masonry is full of construction moisture and will pull water out of any coating faster than it can cure. Anything applied early bonds to dust over damp, and both peel.

**Never:** gypsum skim directly onto visibly damp blockwork, or paint as a "sealer" for wet walls — paint is not a damp-proof course.

## Concrete — Columns, Beams, Slab Soffits

**Situation:** dense, low-suction, often cast smooth against formwork, sometimes carrying form-oil.

**The answer:** degrease where form oil remains, then create a key — hack, scarify, or apply a bonding primer — before any cement-based coat. A fine skim or a textured coating suits the rest. On soffits and beams, expect formwork ripple; skim + putty handles it where a smooth painted look is wanted.

**Why:** concrete's low suction means cement coats cure slowly and bond weakly without help. The smooth form-face is chemically almost paint-repellent; the key is not optional.

## Previously Painted Walls

**Situation:** unknown history — sound paint, tired paint, or multiple buried generations.

**The answer:** test before trusting. Press tape firmly and rip it; if paint comes away, or scraping lifts flakes, strip to a sound layer first. Sound, well-bonded matte emulsion can be washed, sanded lightly to de-gloss, spot-primed at repairs, and recoated. Gloss or oil finishes need sanding to a matte key plus a suitable primer before water-based coats will hold.

**Why:** a new coat bonds only to the layer directly beneath it. If that layer is loose, the new coat becomes a sail for the old one — peeling in sheets within months, rain or no rain.

## Kitchens and Wet Areas

**Situation:** steam, splashes, grease near cookers, occasional direct wetting.

**The answer:** cement-based build-up only (no gypsum in wet zones), washable matte or satin emulsion on walls away from direct water, and a proper splashback system — tiles or a purpose-made panel — behind sinks and cookers where water and grease are constant. Primers and fillers chosen for the wet zone.

**Why:** repeated wetting dissolves gypsum and lifts non-washable films; grease defeats adhesion in a way no decorative coat survives. Behind cookers, any paint is a temporary solution — treat it as a splashback question, not a paint question.

## Exterior Faces and Sun-Battered Walls

**Situation:** UV, driven rain, daily thermal movement, dust.

**The answer:** cement-based prep with flexible exterior fillers for cracks, an exterior-grade 100% acrylic system, and flexible sealant — not rigid filler — at movement joints. Detail parapets and horizontal tops like waterproofing, not like paint. Expect to repaint sun faces more often than the whole building.

**Why:** thermal movement re-opens rigid repairs within a season, and UV decomposes non-exterior binders into chalk. The [interior vs exterior guide](/learn/interior-vs-exterior-wall-finishing-differences) covers the full reasoning; the [tyrolene estimator](/tyrolene-estimator) sizes the textured exterior route.

## Ceilings and Soffits

**Situation:** overhead work, large flat area, often the most visible surface in the room under evening light.

**The answer:** skim if the concrete ripple warrants it, putty always, prime, and paint — typically in a flat matte white to maximize light bounce and hide minor imperfection. Overhead coats run thin and even; plan a little more material and considerably more neck.

**Why:** ceilings get inspected by everyone lying down and raked by every bulb; matte white is the forgiving finish. (For POP or suspended ceiling systems instead of direct soffit finishing, see the [POP ceiling calculator](/pop-ceiling-calculator).)

## Trim, Doors, and Joinery

**Situation:** wood or metal, small areas, constant touching.

**The answer:** sand to a clean key, prime with the correct primer for the substrate (wood primer, metal primer), then undercoat and topcoat — gloss or satin for washability. Water-based wood paints exist and suit interiors; metal outdoors wants a corrosion-inhibiting system.

**Why:** trim takes more contact wear than any wall; the film must be harder and the primer must match the substrate, or wear shows and rust creeps.

## Quick Reference Table

| Surface | Build-up | Watch out for |
|---|---|---|
| New blockwork/plaster | Damp-cure wait → cement skim → putty → primer → paint | Painting before 28 days; gypsum over damp |
| Concrete (smooth, dense) | Degrease → key/bonding primer → skim or texture | Form-oil; bonding without a key |
| Previously painted | Test adhesion → strip or sand-and-prime → recoat | Buried loose layers under sound-looking paint |
| Kitchen / wet area | Cement-based only; tiles behind water points | Gypsum anywhere wet; washable-only films |
| Exterior | Flexible filler + exterior acrylic; sealant at joints | Interior products outdoors; rigid crack repair |
| Ceilings / soffits | Skim if needed → putty → primer → matte paint | Over-thick overhead coats; skipping putty |
| Trim / joinery | Sand → matched primer → undercoat → gloss/satin | Wrong primer for wood vs metal |

## Closing

Surface-by-surface reasoning is three questions — suction, water, movement — applied honestly to what the wall is made of and what its life is like. Get the pairing right and the paint is the easy part. To size the materials for any of these build-ups against your real measurements, use the [finishing estimator](/finish-estimator); the application discipline behind them is in the [complete guide to interior wall finishing](/learn/complete-guide-interior-wall-finishing).
$body$, updated_at = now()
WHERE slug = 'choosing-right-finish-different-surfaces' AND status = 'published' AND content LIKE '%## Understanding the Fundamentals%';
