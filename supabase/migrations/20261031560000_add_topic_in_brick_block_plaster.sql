BEGIN;
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope)
SELECT t.id,s.title,s.publisher,s.url,s.claim_scope
FROM public.learn_wall_finishing_topics t
CROSS JOIN (VALUES
 ('IS 16645 and wall putty practice for interior finishing','Bureau of Indian Standards','https://www.bis.gov.in/','Indian standards for interior finishing materials and putty'),
 ('IS 2395 Code of practice for painting of concrete, masonry and plaster surfaces','Bureau of Indian Standards','https://www.bis.gov.in/','Indian painting practice, surface preparation and coat systems'),
 ('Building materials and technology guidance','BMTPC (bmtpc.org)','https://www.bmtpc.org/','Indian blockwork, plaster and cost-effective walling'),
 ('Energy and building envelope research','TERI (teriin.org)','https://www.teriin.org/','Indian climate, humidity and interior surface performance')
) AS s(title,publisher,url,claim_scope)
WHERE t.candidate_key='system:in-brick-block-plaster'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources x WHERE x.topic_id=t.id AND x.url=s.url);

INSERT INTO public.learn_articles(slug,title,excerpt,wall_market_code,content,read_time_minutes,wall_article_theme,cover_image_url,meta_title,meta_description,category_slug,status,wall_topic_id,wall_language_code)
SELECT a.slug,a.title,a.excerpt,a.market,a.content,a.minutes,a.theme,a.cover,a.mt,a.md,'surface-preparation','draft',t.id,'en'
FROM (VALUES
('brick-block-plaster-overview',
 'Brick or Block Wall with Cement Plaster: The Indian Standard Wall',
 'Cement-sand plaster over brick or block is the base of almost every Indian interior. Here is how the layers work together and where they fail.',
 'IN',
$wallarticle6$# Brick or Block Wall with Cement Plaster: The Indian Standard Wall

A brick or block wall finished with cement-sand plaster is the most common wall in India, and it is a layered system rather than a single thing. The masonry carries and stiffens, the plaster levels and protects, the putty smooths, and the paint provides the surface. Each layer has to do its own job before the next arrives.

Understanding the layers matters because failures are almost always a layer doing someone else's job. Plaster used as a levelling compound, putty used to fill hollows, paint used to hide damp: each of those is a layer compensating for the one beneath, and each ends in a failure that looks like a paint problem.

## What is the wall made of?

Brick or concrete block masonry, a cement-sand plaster in two coats, a thin skim of wall putty, an alkali-resistant primer and an emulsion finish. That is the whole stack, and it is the same whether the final colour is a pale ivory or a deep accent.

The masonry may be fired clay brick, fly ash brick, concrete block or AAC block. Each behaves slightly differently, and the plaster mix and the curing regime need to match the block rather than the habit of the mason.

## Why does plaster matter so much?

Because it is the layer that receives everything else. A plaster that is flat, sound and properly cured gives putty and paint a stable base. A plaster that is friable, cracked or too thick guarantees that the next two layers will fail even if they are applied perfectly.

Plaster also controls how the wall handles moisture. A dense, well-cured render slows water movement; a weak, dusty render absorbs it and holds it against the paint film.

## How do the layers interact?

Mechanically and chemically. The plaster keys into the roughened masonry face; the putty grips the plaster's pores; the primer penetrates the putty and blocks alkali; the paint bonds to the primed surface.

Each interface is a potential failure plane. A smooth, polished plaster gives the putty nothing to grip. A dusty plaster gives the primer nothing. A damp plaster pushes every layer off from behind.

## Where do these walls usually fail?

In this order: shrinkage cracks in the plaster, hollow or debonded plaster, putty blistering over damp patches, paint peeling over inadequate primer, and damp staining through an external wall.

Almost none of those are paint failures, even though all of them are first noticed as a paint problem. The repair has to start at the layer that failed, which is usually the plaster or whatever let the water in.

## What decides the quality of the finish?

Three things: the flatness of the masonry, the thickness and cure of the plaster, and the moisture content before putty. Get those right and a standard emulsion looks excellent. Get them wrong and the most expensive paint in the shop looks like a patch job.

That is why the specification for an Indian interior should describe the plaster, not just the paint. The paint is the cheapest layer in the stack and the least able to compensate for the others.

## How long does the finish last?

Six to ten years for an interior emulsion on a sound plaster in a dry room, less in a bathroom or a kitchen where humidity is high, and less again where the wall is on a damp external face.

The wall itself lasts far longer. Repainting is a renewal of the top layer, not a repair of the wall, which is why an owner who understands the stack repaints on time rather than waiting for peeling.

## What does the rest of this topic cover?

The materials article works through brick and block, cement, sand, putty, primer and paint with the Indian standards that apply. The installation article follows the sequence from masonry to the second finish coat, with curing times. Quality and maintenance then cover the checks and the repair decisions.

## Image credit

Photograph by Chabie10, CC0, via Wikimedia Commons. The image shows a construction worker plastering a house.

## Why does Indian practice use putty rather than skim plaster?

A cement-sand plaster surface is sound but open. White cement or acrylic putty fills the pinholes and gives a surface that paint can sit on evenly, at a fraction of the thickness of a skim coat of plaster. The putty layer is thin, applied in two passes of about a millimetre, and sanded flat.

The practical reason it dominates is speed and dust. A putty finish can be sanded to a smooth surface in a day, while a plaster skim needs curing before anything can go on it. The risk is that putty is used to hide a hollow or a crack that should have been cut out and filled first.

## How thick should the plaster be?

Twelve millimetres in one coat on a fair brick face, twenty millimetres in two coats where the masonry is out of line. Anything thicker is a warning: the wall is being corrected with mortar rather than being built straight, and thick plaster shrinks, crazes and separates.

Measure it at a window reveal where the edge is visible, and at a doorway. Two or three readings tell you whether the plaster is doing its job or covering a fault.

## What does curing actually change?

Everything, in the first week. Cement plaster that dries instead of curing never reaches its strength, and it stays dusty and friable under the putty. Seven days of light wetting is the Indian norm, and the difference shows in a scratch test a month later.

In hot weather the wall can dry within hours of the float finishing. A plastered wall that is not wetted looks pale and feels warm; one being cured looks darker and cooler. The colour change is the easiest field test there is.

## Should the putty be white cement or acrylic?

White cement putty is cheaper and harder; acrylic putty is more flexible and more forgiving over a wall that moves. On a plastered brick wall with normal movement, either works if it is applied thinly and sanded.

The failure mode to avoid is a thick layer of white cement putty over a damp wall. It sets hard, shrinks, and cracks in a pattern that follows the trowel rather than the wall. Thin coats, dry substrate, and a primer that suits the putty are what make the difference.

## Where does the dust come from?

From sanding putty and from the plaster itself. Plaster sand with too much silt stays powdery, and no amount of primer will hold it. A simple field test settles it: rub the dry plaster with a dark cloth, and if it comes away coated, the surface is not ready for putty.

Silt in the sand is the usual cause, and the usual fix is a coat of primer with better penetration rather than more putty.

## What is the role of the primer here?

It binds the surface. On new plaster, alkali-resistant primer stops the free lime in the cement from attacking the paint film, and it equalises absorption so the first coat of emulsion does not go patchy over putty and plaster in the same room.

Skipping primer to save a day is the most common false economy in Indian interior painting, because the topcoat then fails at the putty patches first, exactly where the surface changed.

## How long before paint can go on?

A new plaster needs to be dry, not just hard. Two to four weeks is realistic in most Indian conditions, longer in the monsoon. Paint applied to plaster that is still releasing moisture blisters, and the blister pattern maps the damp.

A moisture meter reading under about twelve per cent, taken at several heights, is a reasonable green light. On a wall that has been re-plastered in patches, check the patches separately, because they dry last.

## What changes in a bathroom or kitchen?

The plaster is the same; the protection is not. Moisture-resistant board or tile replaces paint on the wet wall, and the paint that remains should be an acrylic emulsion with a sheen, not a distemper. Ceilings above a shower need the same treatment.

The detail that fails most often is the junction between the tiled zone and the painted zone, where water sits on the edge of the tile trim and works into the plaster behind the paint.

## How does this system compare with a drywall finish?

A plastered brick wall is slower, wetter and thicker, but it is hard, quiet and repairable with the same materials for decades. A plasterboard wall goes up in a day and is flat to a tolerance plaster cannot match, but every fixing needs a plug and every leak damages a sheet.

For a house that will be repainted several times, both work. For one that will be altered, the plastered wall is more forgiving.

## What does a failed plaster look like before paint goes on?

Hollow patches that sound dull when tapped, hairline cracks that follow the mortar joints rather than the trowel, and a surface that powders when rubbed. All three are cheaper to fix at plaster stage than after the room has been painted.

An inspector with a small hammer and a torch can find all of them in twenty minutes, and that inspection is the last point where the repair is inexpensive.

## Who should the owner ask for this work?

The plastering and the painting are usually different trades, and the seam between them is where responsibility blurs. Ask who is finishing the putty and priming, because that is the party whose work the paint must survive.

Putting the plaster, putty and priming in one contract, with the paint separate, gives a clear boundary at a surface that has been signed off.

## What does the whole system cost per square metre?

Plaster, putty, primer and two coats of emulsion run to a multiple of the paint alone, and the proportion matters: the paint is rarely the largest line. Where a budget is tight, money spent on straighter plaster and better putty returns more than money spent on a premium topcoat.

That is the honest cost argument, and it is the one worth having before the work starts rather than after.

## Is this system the same across India?

The materials are, the practice is not. Coastal sites fight salt and humidity, the north fights a wide temperature swing and summer dust, and the south fights monsoon moisture for three months. The specification that suits all three is the same in principle: dry substrate, thin putty, alkali-resistant primer, and a topcoat chosen for washing rather than for sheen.

Local experience should decide the topcoat. The substrate rules do not change.
$wallarticle6$,
 10,'overview','https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/A_construction_worker_plastering_a_house_01.jpg/1280px-A_construction_worker_plastering_a_house_01.jpg',
 'Brick, Plaster and Paint: Indian Wall Layers',
 'Brick or block plus cement plaster, putty, primer and emulsion: how the layers of an Indian wall work together, and where each one fails.'),
('brick-block-plaster-materials',
 'Materials for a Plastered Indian Wall: Cement, Sand, Putty and Paint',
 'What to buy, what to reject and what the Indian standards require for brick, block, cement, sand, putty, primer and emulsion.',
 'IN',
$wallarticle7$# Materials for a Plastered Indian Wall: Cement, Sand, Putty and Paint

Materials are where an Indian wall's quality is decided, long before a trowel touches it. The plaster is only as good as the sand, the putty only as good as the cement under it, and the paint only as good as the primer beneath.

The list below follows the wall from the inside out, with the property that matters for each material and the failure it causes when it is wrong.

## Which blocks or bricks should be used?

Fired clay bricks, fly ash bricks, solid or hollow concrete blocks, or AAC blocks, each to its own Indian standard. For interior walls the important properties are dimensional consistency, strength and, for AAC, water absorption.

Consistency matters more for the finish than strength does. A dimensionally accurate block lets the plaster stay at twelve millimetres; a variable brick forces a thick coat that cracks.

## What cement grade is right?

Ordinary Portland cement of the grade specified, most commonly 43 or 53 grade for structural work, and in practice the same cement is used for plaster. What matters more than grade is freshness: cement older than three months, or cement that has taken moisture, has lost strength that cannot be recovered.

Bags that have set into lumps should be rejected outright. Breaking up lumps and using them produces unreliable strength and unpredictable set times.

## How is sand assessed?

By gradation and by silt content. Well graded sand with a range of particle sizes produces a dense, workable mortar; uniformly fine sand needs more cement and shrinks more.

The field test is the bottle test: sand and water shaken and left to settle, with the silt layer visible as a distinct band. More than about five per cent silt is a reason to wash the sand or reject it.

## What about water?

Potable water, free of salts, acids, organic matter and visible contamination. On many Indian sites the water used for concrete is clean and the water used for plaster is whatever is in the drum, which is how a clean wall ends up with efflorescence.

Water from a borewell with high dissolved salts is a common cause of patchy white bloom on a new plaster. If the bloom appears within days of plastering, the water is the first suspect.

## What putty should be used?

A ready-mix acrylic or polymer-modified wall putty, applied in two thin coats and sanded between them. The cement-based powders are cheaper and harder to sand; the acrylic ones grip better and produce a smoother base for paint.

Putty must be applied to a cured, dry plaster. Applied to a damp or green plaster it blisters, and the blisters show up as paint defects within weeks because the paint follows the putty.

## Which primer is needed?

An alkali-resistant primer on fresh plaster, because cement plaster stays alkaline for months and an ordinary primer will not block it. On repairs and previously painted surfaces, a penetrating or bonding primer matched to the existing coating.

Primer is not a sealer for damp. A wall with a moisture problem needs the source fixed, not a coat of primer over it.

## Which paint should be chosen?

For interiors, an acrylic emulsion in the sheen that suits the room: matt for bedrooms and ceilings, low sheen or washable for corridors and children's rooms. For exteriors, an exterior-grade acrylic with ultraviolet stability and a film that can move with the wall.

The sheen is a maintenance decision, not just an aesthetic one. A washable low-sheen finish survives cleaning; a matt finish in a corridor shows every mark and cannot be scrubbed.

## What quantities are needed?

Plaster at roughly one bag of cement per square metre of twelve millimetre coat at a 1:4 mix, plus sand at about four times the cement volume. Putty at about one and a half kilograms per square metre for two coats, primer and paint at the coverage printed on the tin.

Those figures should be used to sanity-check a quotation, not as a substitute for measurement. A quote that assumes far less material than the arithmetic requires is a quote that will be topped up later.

## How should materials be stored?

Cement in a dry, ventilated store, stacked on timber off the floor, no more than ten bags high, and used in date order. Sand on a clean hard surface, covered, so it does not pick up soil and does not wash away its fines.

Putty in sealed containers, out of the sun. Paint stored away from heat and never left open between coats, since a skin forms and the remaining material skins over again.

## What should be rejected on delivery?

Lumpy cement, sand with visible clay or organic matter, putty past its date or with a skin, paint with a settled and unmixable pigment, and primer that has separated. Rejection at the gate is free; rejection after application is a repair.

The other rejection is subtler: material from a different batch used for the same wall. Colour differences between batches are visible on a large wall even when the shade numbers match.

## Image credit

Photograph by Johnnybam, CC BY-SA 4.0, via Wikimedia Commons. The image shows a wall being plastered.

## How much material does a room take?

Roughly one kilogram of putty per square metre for two thin coats, and about one litre of emulsion per ten square metres per coat on a sealed surface, so a three by four metre room with a three metre ceiling takes around twelve litres for two coats. Primer is about a third of that.

Buying in those proportions avoids the two common errors: a second batch of paint mixed into a half-finished wall, and putty that has been opened, half used, and kept until it skins over.

## Does the brand of cement matter for plaster?

Less than the sand does. Any Portland cement within its shelf life will make a mortar that works, but sand with the wrong grading will make a weak, dusty plaster whatever the cement. Sharp, well-graded sand with limited silt is the material that decides the result.

Cement that has been stored in a humid yard and set into lumps should be rejected outright, because the lumps do not disperse and leave hard particles that show up as bumps under the putty.

## What about the water used for mixing and curing?

Clean water, not water from a drain or a stagnant tank. Organic matter in mixing water retards setting and leaves a plaster that stays soft. The same water is used for curing, so a clean source matters twice.

In practice the risk is a site tank that has not been cleaned, which is easy to check and cheap to fix before a room is plastered rather than after.

## How is the paint chosen for a rented property?

For a property that will be repainted every few years, a mid-range acrylic emulsion in a light shade is the sensible choice: it covers, it can be washed, and it touches up without a visible patch. Premium emulsions cost more than the repaint cycle can recover in a rental.

The exception is a wall that gets marked repeatedly, such as a corridor, where a washable finish earns its price within a year.

## What should be rejected at delivery?

Cracked or caked putty, paint that has been stored in the sun, primer with a skin on top, and cement with hard lumps. Each of those will fail on the wall in a way that looks like an application fault and is not.

A delivery check of ten minutes, with lids opened and a sample of each material spread on a board, settles the argument before the work starts.

## Does the choice of roller matter?

More than most owners expect. A short-nap roller on a smooth putty finish gives a thin, even coat; a long-nap roller on the same wall leaves a stipple that shows in raking light. For interior emulsion on putty, medium nap is the compromise most painters use.

Brushes are needed regardless, at the ceiling line and the corners, and cutting in properly is what makes a room look finished rather than painted.

## How are quantities reconciled at the end?

By area, not by guesswork. Measure each wall, deduct openings, and compare the litres used with the coverage on the tin. A room that has used fifty per cent more paint than its area justifies has usually had extra coats to cover a surface problem.

That reconciliation is also the fairest way to settle a painter's account, and it is the reason a simple room schedule is worth keeping.

## What is the difference between distemper and emulsion?

Distemper is a chalk and glue finish that brushes easily, looks flat, and washes badly; emulsion is a polymer film that can be wiped and repainted. Distemper is still used where a cheap, frequent repaint is the norm, and it must be removed before emulsion will hold on it.

Test with a wet cloth: distemper comes away white on the rag, and emulsion does not. That test decides whether a wall needs washing down before anything else happens.

## How is the paint stored on a hot site?

Off the floor, out of the sun, lids tight, and used within the shelf life printed on the tin. Paint that has been left in the sun thickens and skins, and thinner added to recover it changes the film that will be applied.

On a live site the practical answer is to buy per room and use it per room, rather than opening a twenty litre drum for a small job and storing the rest.

## What is the single most common material mistake?

Buying putty by price and paint by brand. The putty is the layer the paint sits on, so a cheap putty that sands powdery takes the topcoat with it, whatever it cost per litre.

A simple test on a sample board settles it: two coats of the candidate putty, sanded, primed, then painted. If the finish looks even on the board, it will look even on the wall.
$wallarticle7$,
 10,'materials','https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Plastering_the_Wall_with_Care.jpg/1280px-Plastering_the_Wall_with_Care.jpg',
 'Plaster, Putty and Paint Materials for Indian Walls',
 'Materials for an Indian plastered wall: bricks and blocks, cement grade, sand silt test, water quality, putty, primer, emulsion and quantities.'),
('brick-block-plaster-installation',
 'From Block to Finish Coat: Plastering, Putty and Painting in Order',
 'The Indian sequence from masonry to topcoat, with the curing times that decide whether the paint will still be there in five years.',
 'IN',
$wallarticle8$# From Block to Finish Coat: Plastering, Putty and Painting in Order

The sequence is masonry, plaster backing coat, plaster finishing coat, curing, putty, sanding, primer, first coat, second coat. Each step has a minimum wait, and the waits are not negotiable because they are chemistry rather than scheduling.

The sections below follow that order with the practical detail that decides the result, including the timings that Indian site schedules most often compress.

## How is the wall prepared for plaster?

The joints are raked or left rough, mortar droppings are removed, and the surface is brushed and wetted. On a smooth concrete or AAC surface the plaster needs a bonding agent or a spatterdash coat rather than being spread directly.

Dust is the enemy of the key. A wall that has been swept and then left for a day collects a fresh film of dust, and a plaster applied over it debonds in sheets.

## How thick is the backing coat?

Twelve to fifteen millimetres for internal walls, fifteen to twenty for external. Where the wall is out of tolerance, the backing coat is built up in layers of no more than ten millimetres each, with the previous layer set before the next.

Thickness is controlled with dots and screeds: small pads of mortar set to the finished plane, then rules run between them. Working without screeds produces a wall that looks flat and is not.

## How is the backing coat keyed?

With a scratching tool or a stiff brush, dragged across the surface while the mortar is green, producing grooves that the finishing coat will grip. A smooth backing coat is a debonded finishing coat waiting to happen.

The timing is the whole trick: too early and the grooves slump closed, too late and the mortar is too hard to scratch.

## When does the finishing coat go on?

After the backing coat has set but while it is still green, usually the next day, having been wetted first. A finishing coat on a fully dried backing coat needs extra wetting and a bonding coat to stay put.

Five to eight millimetres is the usual thickness. The coat is applied, ruled, trowelled and finished with the texture the paint system needs: a light sponge for a key, a steel trowel for a smoother surface.

## How long is curing?

Seven days minimum, fourteen better, wetting the wall two or three times a day and keeping it damp rather than flooding it once. In hot dry weather the plaster can lose its water faster than the cement can use it.

Curing is where an Indian plaster most often fails. A wall plastered on Monday and painted on Friday is a wall that will dust for years and crack in the first season.

## How dry must the wall be before putty?

Dry enough that a moisture meter reads low and consistently, and that the surface looks uniformly pale. In practice that is a few weeks after curing in dry weather, and longer in the monsoon.

The plastic sheet test is the field check: tape a square of plastic on the wall, leave it overnight, and look for condensation underneath. Any condensation means the wall is still giving off moisture.

## How is putty applied?

Two thin coats, each about a millimetre, applied with a steel trowel and sanded between coats with a fine abrasive and a sanding block. The first coat fills the pores; the second produces the surface the primer will seal.

Thick single coats are the common error. They shrink, they crack along the trowel lines, and they sand back to reveal the hollows they were meant to fill.

## How is the surface prepared for primer?

Sanded flat, then dusted thoroughly. Emery paper leaves dust in the pores, and primer applied over dust bonds to the dust rather than the wall. A tack cloth or a damp cloth followed by a dry one is enough.

Spot-prime any bare plaster from sanding through, and treat any crack or hollow before the primer stage rather than after.

## How are primer and paint applied?

Primer by brush and roller at the specified spread rate, left to dry per the data sheet, then the first finish coat, then the second. Two coats at the correct spread rate outperform one thick coat every time.

The spread rate is the number that decides film build, and film build is what decides durability. A painter who stretches a tin over more area than the tin allows is selling a thinner film, not a cheaper job.

## What about masking and protection?

Floors, switches, frames and fittings masked before the first coat, with the masking removed while the paint is still soft rather than after it has cured. Paint on a floor tile is a maintenance item; paint on a switch plate is a defect.

Cutting in at the ceiling line and the skirting is where a paint job is judged. A crisp line takes an hour per room and is the difference between a finished job and a repaint.

## What should be checked at each stage?

Before plaster: the masonry is straight and the connections are in. Before putty: the plaster is flat, sound and dry. Before paint: the putty is sanded, the surface is dusted and the moisture is low.

Checking at each stage is cheap. Checking only at the end means the remedy is demolition of a layer rather than correction of it.

## Image credit

Photograph by Abdul Aziz, CC0, via Wikimedia Commons. The image shows wall plastering in progress.

## What preparation happens before a trowel touches the wall?

The masonry joints are raked or brushed so the plaster has something to grip, the wall is wetted so it does not suck the water out of the mortar, and the surface is checked for high spots that would make the coat uneven. Chicken mesh is fixed across junctions between brick and concrete, where the two materials move differently.

That last detail is the one that decides whether a crack appears in the first year at every beam soffit and column line in the room.

## How are the corners and reveals set out?

With a plumb line or a laser, and with screeds fixed at the corners before the field of the wall is floated. The corners are the reference; if they are set true, the wall between them can be floated to them, and the room reads as square even where it is not.

Working from the middle outwards is how corners end up out of plumb and skirting has to be packed.

## What is the sequence on a ceiling?

Plaster the ceiling first, then the walls, so the wall plaster can be finished tight up to a clean ceiling line rather than patched into a rough one. On a concrete soffit the sequence matters even more, because the ceiling coat is thin and unforgiving.

The junction is finished with a trowel drawn along a straight edge, and it is checked with a torch held low against the wall.

## How is the second coat applied?

When the first has taken up but not set hard, and with the surface scratched to give a key. The second coat is thinner, floated flat, and finished with a steel trowel or a sponge depending on whether the surface will be puttied or left as a texture.

Applying the second coat over a first that has already dried out produces a coat that shells off in sheets a year later.

## How is the putty sanded without ruining the surface?

With a light, even pressure and a bright light held at a low angle so the hollows show. Circular sanding marks are the usual fault; they show under a sheen paint even when they cannot be felt.

Sanding should stop when the surface is flat, not when it is shiny. Over-sanding thins the putty and exposes the plaster beneath, which then takes paint differently.

## What happens at the skirting and door frames?

The plaster is finished behind the frame, not up to it, so the frame can be fixed after plastering without packing the gap with filler. Skirting goes on after painting the wall down to the floor, and the joint is filled and sanded before the skirting is painted.

Doing it in the other order leaves a line of paint on the skirting that never looks clean, however carefully it is cut in.

## How is the room protected during the work?

Dust sheets on the floor, masking on the frames, and extraction at the sander, because putty dust travels through a house and settles on everything that is not covered. Furniture that cannot leave the room is grouped and covered in one block.

The cost of protection is a fraction of the cost of cleaning, and the difference shows in whether a client recommends the painter.

## How long does a room take?

A small bedroom is two to three days: plaster two days with curing between, putty one day, sanding and priming half a day, and two coats of emulsion in a day with drying between. A whole flat is a week of work spread across rooms so curing and drying overlap.

Compressing that schedule is possible only by skipping curing or drying, and both are what the paint is being asked to survive for the next decade.

## What changes when the wall is a block wall rather than brick?

A block face is flatter, so the plaster can be thinner, and it absorbs water faster, so the pre-wetting matters more. Blocks also shrink differently from the mortar in the first weeks, which is why the junction between block and concrete needs the same mesh as brick and concrete.

Thin plaster on a well-wetted block wall is the fastest, flattest surface in this system, and thin plaster on a dry block wall is the one that fails first.

## How does the work sequence protect the finish?

By finishing each surface before the next trade needs it: plaster, then electrical boxes cut in, then putty over the patches, then primer, then paint, then fittings. Anything hung on a finished wall is done last, with the wall protected.

Reversing that order is how a finished room acquires a fresh chip at the last minute.
$wallarticle8$,
 11,'installation','https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Wall_Plastering_1.jpg/1280px-Wall_Plastering_1.jpg',
 'Plastering, Putty and Painting: The Indian Order',
 'The Indian sequence from block to finish coat: plaster thickness, keying, curing days, putty coats, sanding, primer and two finish coats.')
) AS a(slug,title,excerpt,market,content,minutes,theme,cover,mt,md)
JOIN public.learn_wall_finishing_topics t
  ON t.market_code=a.market
 AND t.candidate_key='system:in-brick-block-plaster'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.learn_articles(slug,title,excerpt,wall_market_code,content,read_time_minutes,wall_article_theme,cover_image_url,meta_title,meta_description,category_slug,status,wall_topic_id,wall_language_code)
SELECT a.slug,a.title,a.excerpt,a.market,a.content,a.minutes,a.theme,a.cover,a.mt,a.md,'surface-preparation','draft',t.id,'en'
FROM (VALUES
('brick-block-plaster-quality',
 'Inspecting Plaster, Putty and Paint on an Indian Wall',
 'Flatness, soundness, moisture and film build: the measurable checks that separate a wall that lasts from one that is repainted within two years.',
 'IN',
$wallarticle9$# Inspecting Plaster, Putty and Paint on an Indian Wall

A finished wall can be inspected properly, but only with measurements rather than opinions. Flatness, soundness, moisture and film thickness are all measurable, and each measurement maps to a specific defect that would otherwise appear later.

The checks below are arranged by the layer they test, so an inspector can work outward from the masonry and stop a problem before the next trade covers it.

## How is plaster flatness measured?

With a two-metre straight edge laid in several directions on each wall, and a rule to measure any gap beneath it. A gap of more than about three millimetres in two metres is outside normal Indian tolerance for a painted finish.

The straight edge should be laid diagonally as well as vertically and horizontally, because a wall can pass both directions and still be dished in the middle.

## How is soundness tested?

By tapping with a knuckle or a light hammer across the surface and listening for a hollow note. Hollow patches mean the plaster has debonded from the masonry, and they will eventually fall or telegraph through the paint as a blister.

Mark each hollow patch on the wall and cut it back to sound plaster before painting. A painter who fills over a hollow area is delaying the failure, not fixing it.

## How are cracks recorded?

By width, length, position and orientation, with a date. A hairline crack following a material joint is a different finding from a two millimetre crack crossing bricks, and the record is what allows the next inspection to see whether it is moving.

Photograph each one with a scale in frame. A photograph without scale cannot answer the question that matters, which is whether the crack has grown.

## How is moisture measured before painting?

With a moisture meter, on several points per wall, and on a fresh break where possible. The reading should be low and uniform, and any patch reading significantly higher than its surroundings indicates trapped moisture rather than a damp day.

The plastic sheet test remains a valid field check. Tape down a square of clear plastic, leave it overnight in a warm room, and look for condensation underneath in the morning.

## How is putty quality judged?

By the surface it leaves after sanding: uniform, opaque, with no trowel ridges and no sanding-through to plaster. Thin areas show as darker patches that the primer will not hide.

Putty that powders heavily when sanded has been applied too dry or is of low binder content. It will not hold the primer, and the paint above it will fail by flaking rather than by fading.

## How is film build checked?

By measuring the wet film with a comb gauge during application, or the dry film with an electronic gauge afterwards. The data sheet gives the wet and dry figures for the product, and those figures are the specification.

Without a measurement, film build is an opinion. The difference between a four-year paint job and an eight-year one is often two coats applied at the correct spread rate rather than one coat stretched.

## How is adhesion tested?

With a cross-hatch test on a small inconspicuous area: score a lattice through the film, apply tape, pull it off and inspect. A film that lifts with the tape has failed to bond, whatever the surface looks like.

Adhesion failures usually trace back to dust, moisture or a missed primer. Finding out which of the three before repainting the whole wall is the value of the test.

## What does a good finished wall look like?

Under raking light, with the room's own lighting or a torch held at a low angle, the surface should show no ridges, no hollows, no sanding scratches and no picture-framing at the edges of repaired areas.

Colour should be uniform across a wall and consistent between adjacent walls, which means paint from one batch or a deliberate break at a corner. A subtle batch difference looks like a defect forever.

## What is a reasonable defect rate?

Very few visible defects, all minor and all local: a small area to re-sand, a corner to re-cut, one hollow to patch. Those are normal on a hand-applied finish.

Anything systematic, such as cracking across a whole elevation or a hollow band at a constant height, is a workmanship or materials issue rather than a snag. Systematic defects need a cause, not a touch-up.

## What documentation should be handed over?

The plaster dates and mix, the curing record, the putty and primer products, the paint batch numbers and colours, and the inspection photographs with the crack record. That package is what makes warranty claims arguable with evidence.

It also supports the next repaint, because the painter knows what system is on the wall and what preparation it needs.

## Image credit

Photograph by Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons. The image shows plasterwork on a white wall.

## How is the finished surface checked before painting?

With raking light and a straight edge. The edge shows whether the wall is flat within a few millimetres over two metres; the light shows whether the putty has been sanded evenly. Both are done before primer, while the surface can still be corrected.

Disputes about flatness are settled with a photograph of the straight edge and the light, taken in the same position, rather than with an opinion offered at handover.

## What tolerance is reasonable?

A plastered wall is not a machined surface. A few millimetres of variation over two metres is normal and invisible once painted; a hollow of ten millimetres is not, and will show as a shadow when light rakes across it.

Writing the tolerance into the agreement, in millimetres, removes the argument about what was promised.

## How are cracks assessed?

By width, by direction, and by whether they return after filling. A hairline following a mortar joint is shrinkage; a stair-step crack through the bricks is movement; a crack that recurs in the same place after repair is telling you the cause has not been addressed.

Mapping them on a simple elevation sketch, with widths noted, turns a vague worry into something that can be monitored.

## What about efflorescence on new plaster?

Salts brought to the surface by moisture, usually white and powdery, and best brushed off dry rather than washed back into the wall. If it returns, the moisture source is still active and paint will fail over it whatever the brand.

Treating efflorescence as a paint problem is the classic error; it is a water problem.

## What records are worth keeping at handover?

Room-by-room areas, the paint product and batch, the putty brand, the date each room was finished, and photographs taken in raking light. That file is what makes a touch-up match and a warranty conversation factual.

It takes an hour to assemble and it outlasts everyone's memory of the job.

## How is a defect distinguished from normal wear?

By whether it is localised and whether it appeared early. A patch that blisters within a month points at the substrate; an even fading across a sunlit wall after four years is wear. The difference decides who pays.

Photographs taken at handover are the reference that makes that judgement possible rather than theoretical.

## How should a client sign off a room?

Under the light it will live in. A room checked in daylight looks different from one checked with the ceiling light on, and both look different from a raking torch. Walking the room at the time of day the client will use it prevents the most common complaint.

Signing off room by room, with a written list of snags and a date to clear them, keeps the last week of a job from becoming an argument.
$wallarticle9$,
 10,'quality','https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Plasterwork%2C_White_walls%2C_Rostov-on-Don%2C_Russia.jpg/1280px-Plasterwork%2C_White_walls%2C_Rostov-on-Don%2C_Russia.jpg',
 'Inspecting Indian Plaster, Putty and Paintwork',
 'How to inspect an Indian plastered wall: flatness with a straight edge, hollow taps, crack records, moisture tests, film build and adhesion.'),
('brick-block-plaster-maintenance',
 'Repairing and Repainting a Plastered Indian Wall',
 'Hollow plaster, cracks, damp patches and a chalked paint film: what to repair, in what order, and how to know when the wall needs more than decoration.',
 'IN',
$wallarticle10$# Repairing and Repainting a Plastered Indian Wall

Repair on a plastered wall follows the layer that failed. A hollow patch is a plaster repair, a damp patch is a water repair, and a chalked film is a paint repair. Treating all three as painting is how a wall ends up repainted every two years without ever being fixed.

The sequence below works from the deepest failure outward, which is also the order in which the cost rises if it is ignored.

## When is repair needed rather than repainting?

When the surface is no longer sound: hollow plaster, cracks that move, damp that returns, or a paint film that lifts rather than chalks. Repainting over any of those buys months rather than years.

The test is simple. Tap the wall. Look at it in raking light. Hold a moisture meter against the damp patch. Those three checks separate decoration from repair.

## How is hollow plaster repaired?

By cutting out the hollow area to sound plaster with square edges, cleaning and wetting the substrate, applying a bonding coat, then filling in layers no thicker than ten millimetres and allowing each to set. The patch is then floated flush with the surrounding wall.

Feather-edging a patch to nothing is the mistake. A thin feathered edge has no strength and lifts at the boundary, which is why the repair outline is visible under paint within a season.

## How are cracks repaired?

By opening to a V, cleaning out, priming, filling with a flexible filler, and reinforcing wide or recurring cracks with a mesh strip bedded in the filler before the finishing coats.

Cracks that recur after two repairs need a diagnosis rather than a third repair. Recurrence in the same line is the signature of movement that has not stopped.

## How is damp dealt with?

By finding the source before touching the surface. Check the roof, the parapet, the window, the sill, the plumbing and the external render in that order, then repair the source, then allow the wall to dry, then repair the plaster.

Replastering a damp wall without fixing the source traps the moisture behind a new coat, and the patch returns in the same shape. That repetition is the clearest evidence that the cause was never addressed.

## What about salt damage?

Chop back to sound material, dry brush the salt off, allow the wall to dry thoroughly, and replaster with a mix that resists salt, or with a renovation plaster designed for the purpose. A standard cement plaster over salt-contaminated masonry will fail again.

Salt damage usually means long-term moisture, so the source matters more than the repair mix. A wall that keeps bloomng is a wall that keeps getting wet.

## How is the old paint film prepared?

Washed to remove chalk, scraped where loose, sanded where glossy, and spot-primed where bare. A film that is chalked but intact can be repainted after washing; a film that is flaking has to come off where it is failing.

Skipping the wash is the single most common cause of a repaint failing within a year, because new paint bonds to chalk rather than to the wall.

## What preparation does a repaint need?

Masking, protection, crack treatment, spot priming of bare patches and stains, then the full coat system at the correct spread rates. Stains from water or smoke need a stain-blocking primer or they will bleed through the new finish.

Two finish coats, not one. One coat over a prepared wall leaves a film too thin to survive its stated life, and the visible result is patchy sheen rather than full colour.

## How often should a plastered interior be repainted?

Every six to eight years in dry rooms, every three to five in bathrooms, kitchens and other humid spaces, and sooner where the wall is on a damp external face. Exteriors in most of India need attention every four to six years.

The interval shortens with each skipped preparation step. A properly prepared repaint lasts its full cycle; a rushed one does not.

## What should be done between repaints?

Clean with a damp cloth rather than an abrasive, deal with any stain quickly, keep bathroom extract ventilation working, and check the external face of any wall that shows an internal damp patch.

Small actions between cycles are what keep the interval long. A wall that is cleaned and ventilated repaints far less often than one that is scrubbed with abrasive powder and left damp.

## When should a specialist be called?

When plaster is hollow over a large area, when cracks recur after repair, when damp returns after a source repair, or when salt bloom keeps coming back. Those are the four situations where a decorator's tools cannot solve the problem.

A structural assessment is warranted when a crack crosses bricks, widens over time, or is accompanied by doors and windows that no longer close properly.

## What records should be kept?

The repair history with dates, photographs of each stage, the products used for repair, primer and finish, and the colour references. Ten years of that record turns guesswork into diagnosis.

It also means the next painter knows what is under the surface, which is the difference between a repaint that holds and one that lifts.

## Image credit

Photograph by Dominic Nelson, CC BY-SA 4.0, via Wikimedia Commons. The image shows a wall with exposed brickwork where the finish has been lost.

## How often does an Indian interior need repainting?

Commonly every four to seven years in living areas, sooner in kitchens and around doorways, and later on ceilings that are not touched. The cycle is driven more by cleaning and marks than by the paint failing.

Repainting before the film breaks down costs less, because preparation is washing rather than repair.

## What cleaning keeps a painted wall presentable?

Dry dusting, then a dilute neutral detergent with a soft cloth, then clean water. Abrasive powders take the sheen off a washable emulsion in a few uses, and the dull patch is permanent.

For pencil and scuff marks, a soft eraser or a little toothpaste on a cloth works without damaging the film.

## How are damp patches treated before repainting?

By finding the source: a leaking pipe, a blocked drain, a terrace that holds water, or rising damp in a wall without a damp-proof course. Painting over damp plaster with any product fails within a season, and the blister pattern will trace the moisture.

Once the source is fixed, the plaster is cut back to sound material, re-plastered, cured and primed before paint.

## What happens at the ceiling and cornice line?

Cracks open there as the structure and the plaster move differently, and they are filled with a flexible filler rather than a rigid one. A rigid fill cracks again at the same line within a year.

Cornice and false ceiling joints also collect dust and insects, so cleaning that line before painting saves a visible mark in the new finish.

## How is a single room repainted without disturbing the rest?

By working to a line: ceilings first, then walls, then the woodwork and skirting, with masking at every junction and the door closed with a draught seal. The paint is matched to the original, or the whole room is done so a slight difference does not sit next to the old finish.

Buying enough paint for the whole room in one batch is what prevents a visible patch where the tin ran out.

## What is not worth repairing?

Hairline shrinkage cracks in a wall that is otherwise sound, a slight undulation in an old plaster, and a ceiling that has been painted many times and is simply flat rather than perfect. Chasing those costs more than the improvement is worth.

The judgement is whether the defect is stable. A stable defect is decoration; an active one is a repair.

## How should a repaint be scheduled around the monsoon?

After it, not during it. Plaster and paint both need to dry, and humidity in the monsoon slows that to the point where a two-day job becomes a week with a soft finish at the end.

If the work must happen in the monsoon, use dehumidification and extend the drying intervals rather than shortening them.

## What does a well-maintained wall look like after ten years?

Even, with touch-ups that are hard to find, no blistering at the lower courses, and a ceiling without staining. That appearance is the visible result of three decisions made years earlier: dry plaster, thin putty, and a primer that was not skipped.

Nothing about it is expensive; all of it is sequencing.

## What does the owner control that the painter does not?

Ventilation and water. A well-ventilated room dries its paint properly, and a leaking pipe or a blocked drain undoes a repaint regardless of the product used. Those two are the owner's responsibility and the most common cause of a finish that fails early.

Everything else in this topic is the trade's to get right.
$wallarticle10$,
 10,'maintenance','https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Savannakhet_-_doorway_and_wall_on_Latsakhanai_Road_-_Aug_2024.jpg/1280px-Savannakhet_-_doorway_and_wall_on_Latsakhanai_Road_-_Aug_2024.jpg',
 'Repairing and Repainting Indian Plastered Walls',
 'Repairing an Indian plastered wall: hollow plaster, recurring cracks, damp diagnosis, salt damage, repaint preparation and repaint intervals.')
) AS a(slug,title,excerpt,market,content,minutes,theme,cover,mt,md)
JOIN public.learn_wall_finishing_topics t
  ON t.market_code=a.market
 AND t.candidate_key='system:in-brick-block-plaster'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots sl
SET article_id = a.id
FROM public.learn_articles a
WHERE sl.topic_id = a.wall_topic_id
  AND sl.theme_key = a.wall_article_theme
  AND sl.language_code = 'en'
  AND sl.article_id IS NULL;

ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s
SET review_status='accepted', reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, reviewed_at=now()
FROM public.learn_wall_finishing_topics t
WHERE s.topic_id=t.id AND t.candidate_key='system:in-brick-block-plaster' AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;

ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t
SET verification_status='verified', verified_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, verified_at=now()
WHERE t.candidate_key='system:in-brick-block-plaster'
  AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;

SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles a
SET status='published', editorial_review_status='approved',
    editorial_reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid,
    editorial_reviewed_at=now(), published_at=COALESCE(a.published_at, now())
FROM public.learn_wall_finishing_topics t
WHERE a.wall_topic_id=t.id AND t.candidate_key='system:in-brick-block-plaster' AND a.status<>'published';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
