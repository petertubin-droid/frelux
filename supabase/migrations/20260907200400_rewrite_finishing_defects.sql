-- Full body rewrite: common-finishing-defects-and-how-to-fix (finishing-guides #5)
-- Replaces the phase52/53 template body (~95% duplicated across 55 articles)
-- with a structure that delivers the article's title. Unique intro preserved.
-- Guarded on the template heading '## Understanding the Fundamentals'; re-run is a no-op.
UPDATE learn_articles SET content = $body$
## Introduction

Every finishing defect tells a story if you can read it. Hairline cracks in a grid pattern say shrinkage; peeling in sheets says adhesion failure; yellow-brown stains creeping from a corner say moisture, not paint. Treating the symptom without the cause guarantees the story repeats itself.

This guide catalogues the defects most common on Nigerian walls — and the correct fix for each: what to remove versus repair, when damp-proofing must precede any refinishing, which cracks are cosmetic, and how to stop the defect from returning once the surface finally looks right again.

## Read the Defect First — Diagnosis Before Treatment

Every defect has three parts: what it looks like, what caused it, and what the wall needs before any new coating goes on. The table below is the field guide; the sections after it explain the fixes that keep tripping people up.

| Defect | What it looks like | Real cause | Fix |
|---|---|---|---|
| Map cracking (hairline grid) | Fine grid of shallow cracks, usually uniform | Skim/filler applied too thick, or dried too fast in sun | Rake out, fill thin, damp-cure |
| Peeling in sheets | Paint lifts in large flakes, plaster face may come with it | Primer skipped, or coat over dust/damp | Strip to sound layer, dry, prime, redo |
| Bubbling / blisters | Dome-shaped bumps, sometimes with moisture inside | Moisture trapped under the film, or painting over damp | Find and stop the water; strip, dry, redo |
| Efflorescence | White salty crystals on the surface | Soluble salts migrating with water through the wall | Stop the water source; brush off salts; do not coat over |
| Damp stains (yellow-brown) | Blotchy tide marks, often from corners or floor level | Rising or penetrating damp | Damp-proof first; cosmetic repair last |
| Hollow patches | Coating sounds drum-like when tapped | Skim over dusty/hollow base; poor suction control | Cut back to sound base, re-plaster the patch |
| Patchy sheen | Same paint, different gloss in patches | Suction unsealed (no primer); uneven absorption | Seal, then full recoat |
| Pinholes everywhere | Tiny voids showing after paint | Putty stage skipped after skim | Putty, fine sand, dust, prime, recoat |
| Ripple in raking light | Wavy shadows under torchlight | Base never flattened; unfeathered strokes | Re-skim thin + progressive sanding |
| Fungal / black growth | Dark patches in damp corners, musty smell | Persistent moisture, poor ventilation | Kill the moisture; treat; anti-fungal coat system |

## The Fixes in Detail

### Peeling and adhesion failure

Peeling is never a paint problem; it is a bonding problem. The film lifted because the layer under it let go — usually dust left on the wall, a skipped primer, or moisture behind the coat.

**Fix, in order:** strip everything back to a sound layer (scraper, then wire brush, sand the edges of what remains so the repair feathers in). Let the wall dry fully — the overnight polythene test applies: tape clear plastic to the wall; condensation by morning means wait. Wash, or at least dust, the surface. Prime. Recoat with the full, correct system. Repainting over loose edges without stripping always returns — the new coat lifts the old one from the edge inward.

### Bubbling and moisture stains

Blisters mean water is (or was) moving through the wall while the film was trying to hold. Find the source first: leaking pipes or roof, splash zones without protection, ground moisture wicking up, or painting before new plaster had dried (allow about 28 days).

**The rule:** no refinishing over an active moisture source. Repairs to the coating before the water is stopped are decoration on a timer. Once the source is fixed and the wall dries, treat like peeling — strip blistered areas, prime, redo.

### Efflorescence — the salt that comes back

White crystals keep returning because the salts are not the problem; the water carrying them is. Brush the salts off dry (washing drives them back in). Stop the water — rising damp at the base, penetrating rain on exteriors — then allow the wall to dry through. Only then coat, and never seal efflorescence under a film: the salt pressure will push the new coating off.

### Map cracking — cosmetic, but permanent if ignored

Shrinkage cracks in a grid pattern come from thick single-pass coats or fast drying. Shallow ones are cosmetic: rake them out with a scraper to give the filler a key, fill with a thin flexible filler, sand flush, and spot-prime. Cracks wider than about 1 to 2 mm, or ones that return along the same line, are structural movement, not shrinkage — they need a crack-repair treatment (V-groove, filler, possibly reinforcement tape) and, if recurring, a look at what is moving.

### Hollow patches

A coating that drums under a tap was applied over a weak or dusty base and has already let go — it is only holding on by habit. Cut the hollow area back to sound plaster, key the edges, dampen, and re-plaster the patch before finishing over it. Burying a hollow patch under more coats just schedules a larger repair.

### Patchy sheen and pinholes

Both are system-sequence defects, not material defects. Patchy sheen means suction was not equalised — prime, then give the full wall two even coats; patching sheen with a third local coat makes the map worse before it makes it better. Pinholes mean the putty pass was skipped — putty, fine sand, dust, prime, then continue.

### Fungal growth

Black or green patches grow where moisture persists. Treat the cause (leaks, condensation, no ventilation), kill the growth with a fungicidal wash, and only then recoat — ideally with a system suited to damp-prone areas. Painting over live fungus produces a film that peels as the colony keeps eating underneath.

## The Prevention List — Cheaper Than Any Repair

1. **Test moisture before coating anything.** The overnight polythene test costs nothing and prevents the most expensive defects on this page.
2. **Prime, always, everywhere.** Nearly every adhesion and sheen defect traces to a skipped primer.
3. **Coats thin, twice.** Thick coats are the single source of map cracking, and sanding cannot undo what shrinkage has already cracked through.
4. **Dust between every stage.** Dust is the invisible separator between coats.
5. **Raking-light check between stages.** Every defect on this page is cheaper to catch at the skim stage than after the second topcoat.

## Closing

Defects are the wall's way of reporting what was skipped — moisture testing, primer, thin coats, dust control. Diagnose before treating, never finish over an active water source, and let the raking light audit each stage. For the material quantities a repair or full refinish will take, run the [finishing estimator](/finish-estimator); for the full application sequence that prevents these defects, see the [complete guide to interior wall finishing](/learn/complete-guide-interior-wall-finishing).
$body$, updated_at = now()
WHERE slug = 'common-finishing-defects-and-how-to-fix' AND status = 'published' AND content LIKE '%## Understanding the Fundamentals%';
