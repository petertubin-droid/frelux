BEGIN;
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope) SELECT t.id,v.title,v.publisher,v.url,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES ('IS 1661 cement plaster application','Bureau of Indian Standards','https://www.bis.gov.in/','Application of cement plaster finishes and their curing'),('IS 2395 painting of plaster surfaces','Bureau of Indian Standards','https://www.bis.gov.in/','Painting of plaster, masonry and concrete surfaces in Indian practice'),('BMTPC building materials guidance','BMTPC','https://www.bmtpc.org/','Indian building material selection and site practice'),('TERI building performance research','TERI','https://www.teriin.org/','Indian climate, moisture and building envelope performance')) AS v(title,publisher,url,claim_scope) WHERE t.candidate_key='assembly:in-interior-brick-paint' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);
INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,status,author,read_time_minutes,cover_image_url,meta_title,meta_description) SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation',a.market,t.id,a.theme,'en','draft','FRELUX Learn',a.read_time_minutes,a.cover_url,a.meta_title,a.meta_description FROM (VALUES
  ($a1$in-interior-brick-paint-overview$a1$, $b1$Interior Brick to Paint in India: What the Four Layers Do$b1$, $d1$An interior brick wall in India finished in four layers. What plaster, putty, primer and paint each do, and why skipping one shows within a season.$d1$, 'IN', $w1$# Interior Brick to Paint in India: What the Four Layers Do

An interior brick wall in India is finished in four layers: cement-sand plaster, wall putty, primer and paint. Each layer has one job, and the finish fails at whichever layer was hurried. A wall painted directly over plaster will look right for a month and then show every trowel mark; a wall puttied over wet plaster will blister from the inside out.

The order is not negotiable. Plaster brings the wall to line and level and gives the paint a mineral surface to grip. Putty fills the trowel texture and the pinholes so the paint film is continuous. Primer seals the suction so the topcoats dry evenly. Paint provides the colour, the washability and the barrier that keeps the wall clean.

## Why does plaster come before everything else?

Because it is the only layer that can correct a wall. Brickwork is laid to a tolerance measured in millimetres over a storey, and the plaster absorbs that variation. If the plaster is thin in one place and thick in another, the finish will still be flat, because the putty and paint follow the plaster.

A 12 mm single coat is common on fair brickwork; 20 mm in two coats is used where the wall needs correcting or where the blocks are uneven. The mix is typically 1:4 or 1:6 cement to sand depending on the surface and exposure, and the relevant Indian Standard sets out the application requirements.

## Why is putty its own layer?

Wall putty does two jobs that paint cannot. It fills the shallow hollows left by the trowel, and it gives a uniformly absorbent surface so the primer and topcoat dry at the same rate across the wall. Without it, the paint film follows the plaster texture, and raking light from a window shows every ripple.

Putty is applied in two thin coats, sanded between them, and the wall is wiped clean before primer. Thick single coats shrink and craze, and the crazing telegraphs through the paint.

## What does primer actually do?

It controls suction. A dry plaster and putty surface is porous, and a water-based paint applied to it loses water into the wall faster than the binder can form a film. The result is a patchy first coat that needs extra paint to cover, and a film that can chalk early.

Primer also improves adhesion and, on interior work, reduces the risk of alkali from the plaster attacking the paint. Cement-based primers are used on fresh plaster; water-based primers on putty and on repainting.

## Which paint belongs on an Indian interior wall?

Emulsion is the normal choice, and the grades differ more in binder and washability than in colour. Economy emulsions cover and are adequate in bedrooms and low-traffic areas. Premium emulsions resist scrubbing, which matters in kitchens, corridors and anywhere children reach.

Distemper is cheaper and still used, but it chalks and cannot be washed. On a wall that will be cleaned, emulsion is the more economical choice over ten years even though it costs more per litre.

## How long does the whole sequence take?

Allow a week for a room, and longer in the monsoon. Plaster needs to be cured and then to dry; putty needs to harden and be sanded; primer needs its drying time; each paint coat needs to be dry before the next.

The temptation is to compress the drying stages, and that is where most failures begin. A wall that is painted before the plaster has dried will hold moisture behind the film, and the symptoms appear weeks later as blistering, peeling or a bloom of white salts.

## Does the weather decide when you can paint?

It decides more than most owners expect. High humidity slows the drying of every water-based coat, and the monsoon can double the interval between coats. Painting in the rain season without dehumidification is how a wall ends up with a soft film that marks when touched.

In the hot months the opposite problem appears: the surface dries too fast, the paint does not flow out, and brush marks stay visible. Damping the wall lightly and working out of direct sun fixes most of it.

## What does the work cost, and who does it?

Plastering, puttying and painting are separate trades in most Indian cities, and the price is usually quoted per square foot of surface rather than per hour. A quotation that covers plaster, putty, primer and two coats of emulsion as one figure is easier to compare than four separate rates.

Ask what is included at the edges: scaffolding or ladder work, sanding, masking of switches and frames, and the number of putty coats. Those items move the total more than the brand of paint.

## Which failures trace back to this sequence?

Cracks at the junction of brickwork and concrete follow a plaster that was not reinforced with mesh at the joint. Hollow patches follow plaster that was not cured or was laid too thin over dusty brick. Peeling paint follows primer applied over a dusty or damp surface.

Each of these is cheaper to prevent than to repair, because repair means removing the finish back to the layer that failed.

## What should an owner check before the primer goes on?

Four things, all visible in daylight with a torch held at a low angle. The wall should be flat under a straightedge, free of hollow patches when tapped, uniformly pale where the putty has been sanded, and dry to the touch and to a moisture meter.

Once primer is on, those checks are gone. This is the last moment when a defect can be corrected at little cost.

## How does this sequence change for a repaint?

The plaster and putty layers are usually sound, so the work reduces to cleaning, filling, spot priming and two coats. The trap is painting over a wall that is damp or has been patched with a different filler.

Testing a patch by wiping it with a damp cloth tells you whether it is sound and whether it is the same material as the rest. Where it is not, the patch is cut back and redone rather than painted over.

## What this topic covers next

The four articles that follow take each stage in turn: the materials and what to specify, the sequence on site, the checks that catch a failure before the paint hides it, and the maintenance that keeps a finished wall serviceable through Indian weather.

## How much does the sequence cost in an Indian city?

Quotations are usually per square foot of wall area, and the four layers are often priced separately: plaster, putty, primer and paint. A combined rate is easier to compare, provided it states how many putty coats and how many paint coats are included.

The range across cities is wide, and the variation comes mostly from labour rather than material. A rate at the bottom of the local range almost always means one putty coat, no sanding between coats, and primer omitted or diluted. Asking three contractors to price the same written specification removes most of that ambiguity, and it takes an hour to write.

## Does the wall thickness change the job?

It changes the drying, not the number of layers. A 230 mm brick wall carries more moisture than a 115 mm partition and gives it up more slowly, so the interval between plaster and putty is longer. On a partition, the same wall can be puttied sooner.

This is why two rooms plastered on the same day are not necessarily painted on the same day, and why a schedule that treats all walls the same is a schedule that will be adjusted by failures.

## What is different about a bathroom wall?

Waterproofing, and the order in which it is done. The wet area is treated before plaster and the finish is applied over a sound, dry substrate. A bathroom wall painted like a bedroom wall will show blistering at the base within a couple of seasons.

The same applies to the wall on the other side of a bathroom. It is worth checking that side for damp whenever the bathroom is retiled.

## When should an owner walk away from a quotation?

When it bundles everything into one figure without stating coats, when it offers to skip putty because the plaster is smooth, or when it proposes painting over an existing wall without washing it. Each of those is a way of moving work off the bill and onto the wall.

## Does the finish change what the wall can do?

It does, in one direction. A breathable finish lets a wall dry inwards, which matters in a flat that is closed up for weeks. A sealed, heavy film stops that, and the moisture finds a slower path, usually a crack or a corner.

That is the argument for thin, well-cured layers over thick ones, and for not adding coats in the hope of a smoother look.

## What happens if the plaster is skipped and putty goes straight onto the brick?

The wall looks acceptable for a season and then fails at the joints. Putty is a thin filler, not a leveller, so it follows every irregularity of the brick or block face and builds thicker in the hollows. Thick putty shrinks, and shrinkage shows as a network of fine cracks that no amount of sanding removes.

There is also a moisture problem. A brick face that is not plastered has no continuous barrier against damp migrating from outside, and putty has almost no resistance to it. The bloom that follows is salts, not dirt, and it returns after every cleaning until the water path is closed.

## Does the paint system change between a bedroom and a kitchen?

Between living rooms, no. The substrate and primer are the same, and the topcoat is chosen for sheen and scrubbing rather than location. Between a dry room and a kitchen, yes: cooking vapour condenses on cool surfaces and carries grease with it, and a matt finish in a kitchen holds both.

Two changes are worth the cost in service spaces. A washable emulsion with a slight sheen in kitchens and bathrooms, and a coat of the same on the ceiling above cooking. Neither is expensive, and both extend the interval before the room needs repainting by years rather than months.

## Is it worth painting a wall that will be tiled later?

No, and the money is better spent on the plaster. A wall that will carry tiles in a bathroom or kitchen needs a flat, sound plaster and nothing more; paint under tile adhesive is a weak layer in a stack that depends on adhesion.

Mark the walls on a plan instead. Knowing which surfaces are due for tiling after handover prevents a wasted paint system and a messy removal later.$w1$, 9, 'overview', $v1$https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_150_--_2025_--_0905.jpg/1280px-Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_150_--_2025_--_0905.jpg$v1$, $t1$Interior Brick to Paint in India: What the Layers Do$t1$, $m1$An interior brick wall in India finished in four layers. What plaster, putty, primer and paint each do, and why skipping one shows within a season.$m1$),
  ($a2$in-interior-brick-paint-materials$a2$, $b2$Interior Wall Materials in India: Plaster, Putty, Primer and Paint$b2$, $d2$Choosing plaster mix, putty, primer and emulsion for Indian interiors. Grades, coverage, what to refuse, and how to keep a batch record for later patches.$d2$, 'IN', $w2$# Interior Wall Materials in India: Plaster, Putty, Primer and Paint

Specifying an interior wall finish in India comes down to four decisions, and each one is made before the painter arrives. The plaster mix, the putty type, the primer and the paint grade determine how the wall looks in a year, not how it looks on handover day.

## What goes into the plaster?

Cement, sand and water, in a ratio chosen for the surface. A 1:4 mix is stronger and denser; 1:6 is more workable and more forgiving on uneven brickwork. Ordinary Portland cement or Portland pozzolana cement both work, and the choice often follows what the site already stocks.

The sand matters as much as the cement. Graded sand with a range of particle sizes packs tightly and gives a dense plaster; sand that is uniformly fine needs more cement and still shrinks more. Sand carrying silt or clay is the commonest cause of a weak, dusty plaster.

## Does the plaster need an admixture?

On interior walls, usually not. Where the wall is exposed to damp, or where the plaster is over a concrete soffit prone to condensation, a waterproofing compound or a polymer modifier helps. It is not a substitute for curing, and it does not fix a bad mix.

## Which putty should be specified?

Two families dominate: white-cement-based putty and acrylic or polymer putty. White cement putty is hard, sands to a fine finish and is inexpensive. Acrylic putty is more flexible, adheres better to a range of substrates, and is less prone to hairline cracking in thin coats.

For a wall that will be painted in a light colour under strong side light, the harder putty gives the flatter finish. For a wall that moves, or a repair patch, the flexible putty survives better.

## Which primer?

Cement primer on fresh plaster, because it tolerates alkali and seals a mineral surface. Water-based primer on putty, on previously painted walls, and anywhere solvent smell is unwanted in an occupied flat.

Primer is not a paint and should not be judged by its colour. A tinted primer helps coverage in deep colours, but the film's job is to seal, not to hide.

## Which paint grade?

Emulsion in three broad tiers: economy, standard and premium washable. The difference is in the binder content and the pigment dispersion, which show up as coverage, scrub resistance and how the colour holds over years.

For a hall or a corridor, the premium tier pays for itself. For a ceiling, economy is adequate because nothing touches it. For a kitchen wall behind a hob, an scrubbable finish matters more than the sheen level.

## What about sheen?

Matt hides imperfections in the plaster and is the default in Indian interiors. Silk or low sheen wipes clean more easily and shows the wall's texture, which is a problem on a wall that was not puttied well. Gloss is rare on interiors because it exaggerates every defect.

## What quantities should an owner expect?

Coverage figures are printed on the tin and are optimistic. In practice, a first coat over new putty takes more paint than the second, and textured or porous surfaces take more again. Ordering about a tenth more than the calculated area avoids a second purchase of a slightly different batch.

The cost of a wall is dominated by the number of coats and the labour, not by the price of a premium tin over an economy one. A cheap paint in three coats often costs more than a good paint in two.

## How are materials checked on delivery?

Batch numbers on all tins from the same production run, seals intact, and dates within the usable period. Paint that has frozen or been stored in a hot yard can be lumpy or separated, and it will not flow out even after stirring.

Cement should be free of lumps and fresh enough to set properly. Sand should be tested by feel and by a simple jar test for silt before it goes into a mix.

## What substitutions should be refused?

Putty replaced by a thin coat of plaster, primer replaced by a diluted first coat of paint, and mesh omitted at the junction of brickwork and concrete. Each of the three saves a small amount on the bill and creates a repair that costs many times more.

A fourth is thinner added to paint beyond the maker's limit. It improves spread, reduces the film thickness, and shortens the life of the coating.

## What does the material list look like in order?

Cement, sand and mesh for the plaster; putty, sanding paper and a straightedge for the filling stage; primer, brush and roller for sealing; two topcoats, masking tape and drop sheets for the finish. Consumables such as sanding paper and masking tape are where cheap quotations cut corners.

## How does the climate change the list?

In coastal cities, salt-laden air pushes the specification towards better primers and washable emulsions. In the dry interior, the opposite applies: the risk is the plaster drying too fast and cracking, so curing materials matter more than the coating brand.

In the monsoon belt, the deciding factor is drying time between coats, and that is a scheduling question more than a material one.

## How is the material choice recorded?

On the quotation and on the tin. A short note of product names and batch numbers, kept with the flat's papers, is what lets a future repair match the existing finish instead of repainting a whole wall to make a patch disappear.

## How much material does a room actually need?

Area first, then coverage. A room of twelve square metres of wall and ceiling has roughly twice that in paintable surface once reveals and returns are counted. Coverage printed on the tin assumes a smooth, sealed surface and one coat at the specified film thickness.

The practical rule is to buy the topcoats together from one batch and to buy about a tenth more than the calculated need. A second purchase of the same shade from another batch is where visible patchwork begins.

## What does a material failure look like?

Paint that has separated into layers in the tin, cement that has set in lumps, putty that crumbles when squeezed. All three are storage failures rather than manufacturing ones, and all three are avoidable by not accepting material that has sat in a hot yard.

Sand is the quiet one. Sand with visible clay, or that stains the hand when rubbed, will produce a plaster that dusts and a putty that does not bond, and the fault will be blamed on the painter.

## Where does an owner overspend?

On premium paint over a bad substrate, and on too many coats to compensate for poor preparation. A premium emulsion on a wall that was not sanded looks worse than an economy emulsion on a wall that was.

The other overspend is repainting a whole flat when two rooms needed it, which is a scheduling decision rather than a material one.

## What is worth paying more for?

Mesh at the brickwork and concrete junctions, a second putty coat, and the primer. Those three items are small in the bill and large in the outcome, because each one addresses a failure that otherwise appears months later and costs more to correct than the whole wall did to finish.

## How is a shade matched later?

By the shade code, the brand and the batch number on the tin, not by eye. Ranges are refreshed and shades shift slightly between production runs, which is why a wall painted from two batches can show a join even when the shade is nominally the same.

Photographing the tin label and keeping the picture with the flat's papers is the cheapest record available, and it takes a moment.

## What if the owner wants a deep colour?

Expect more coats and a tinted primer. Deep colours have less hiding power per coat, so the film builds slowly over a light putty. A tinted primer to a mid-tone of the chosen colour usually saves a coat.

Expect the wall to show imperfections more than a light colour would. Deep and dark finishes are unforgiving of a plaster that was not checked under raking light.

## How much material does an ordinary room need?

Wall area, not floor area, drives the estimate. A room of about a hundred square feet has roughly four times that in wall and ceiling area once openings are deducted, and each layer has its own coverage figure: plaster by thickness, putty by kilogram per square metre, primer and paint by litres per coat.

Buying short is the commonest mistake, because a second purchase from a different batch can differ in sheen. Recording the batch numbers on the tin and keeping half a litre of each product is the cheapest insurance against a patch that never quite matches.

## What separates an economy emulsion from a premium one?

Mostly binder content and pigment grade. An economy emulsion carries more filler, which means fewer coats to hide the wall and a film that chalks earlier on a surface wiped often. A premium product hides better in two coats, scrubs without polishing, and holds colour longer on a wall that takes sunlight.

For a rental that will be repainted every few years, the economy product is rational. For a home where the same wall is expected to look right for eight or ten years, the difference in cost per year of service usually favours the better product.

## Which accessories are worth paying for?

Three of them. A proper roller sleeve that does not shed, a sanding block with a flat face, and a dust sheet that stays put. Everything else in a paint shop is optional, and much of it exists to be sold rather than used.

The one accessory that repays its cost most reliably is masking tape of decent quality. Cheap tape lifts the new paint with it when removed, which turns a clean line into a repair.

## Does the brand matter more than the specification?

Less than the specification, and more than most buyers admit. Two brands of the same grade behave similarly, but a swap from one grade to another within a brand changes hiding power and scrub resistance more than a change of label.

Write the grade into the quotation rather than the brand name alone. A quoted brand with no grade lets the contractor choose the cheapest product that carries the label.

## Is a primer always needed?

On new plaster, yes. Fresh plaster is alkaline and porous, and a primer equalises suction so the first paint coat does not dry patchy. On a previously painted wall in sound condition, a primer is optional and often skipped in favour of a mist coat.

Where it cannot be skipped is over putty that has been sanded, because the dust left behind is enough to stop the paint bonding. One wipe with a damp cloth and a few minutes of drying prevent a whole class of peeling.$w2$, 8, 'materials', $v2$https://upload.wikimedia.org/wikipedia/commons/b/ba/Evolution_of_Faux_Finishing.jpg$v2$, $t2$Interior Wall Materials in India: Plaster to Paint$t2$, $m2$Choosing plaster mix, putty, primer and emulsion for Indian interiors. Grades, coverage, what to refuse, and how to keep a batch record for later patches.$m2$),
  ($a3$in-interior-brick-paint-installation$a3$, $b3$Plaster, Putty and Paint: The Interior Sequence on an Indian Site$b3$, $d3$The stage-by-stage order for finishing an interior wall in India, from plaster cure and putty sanding to priming and two emulsion coats, in monsoon and$d3$, 'IN', $w3$# Plaster, Putty and Paint: The Interior Sequence on an Indian Site

The sequence for an interior wall is fixed, and the delays between stages matter as much as the stages themselves. An owner who understands the order can tell within a site visit whether the work is being done properly.

## What happens before plaster starts?

The brickwork is finished, the chases for conduit are cut and made good, the boxes are set to line, and the mesh is fixed over the junctions between brickwork and concrete. Any of these left until after plastering means cutting into a finished surface.

The wall is then brushed down and damped. Plaster applied to dry, dusty brickwork grabs unevenly, and the thin patches are where hollow spots form.

## How is the plaster applied?

Background first, then a level coat, then the finish. On a 12 mm single coat the mason rules off between screeds and closes the surface with a float. On two-coat work, the backing coat is scored to key the finish coat.

Thickness is checked with a nail or a depth gauge at intervals, because a plaster that is thin in one bay and thick in the next dries at different rates and cracks at the boundary.

## How long is curing?

Seven days is the working figure for cement plaster, and it is the stage most often cut short. Curing is not a formality: it is what converts the mix into a hard, dense layer rather than a crumbly one.

Damping the wall twice a day in hot weather, or covering it, is enough. Plaster left to dry in the sun on day two will be dusty and weak, and no amount of primer will fix that.

## When does putty go on?

Only when the plaster is dry, not merely set. A moisture meter or a simple plastic sheet taped to the wall overnight tells you; a wall that holds damp will hold it under putty and paint as well.

The first putty coat is thin, applied across the wall with a broad knife, and left to harden. The second follows after sanding, filling the remaining hollows. Two thin coats beat one thick one in every case.

## How is it sanded?

With a sanding block and a light, in circles, checked against a torch held flat to the wall. The point is to remove the ridges without gouging hollows, and the check is visual rather than by hand.

Dust is then brushed and wiped off. Putty dust left on the surface is the commonest reason primer fails to bond.

## How are primer and paint applied?

Primer by brush into the corners and by roller across the field, one coat, dry before the next stage. Then the first topcoat, thinned as the maker allows, and the second after the first has dried.

Cutting in around frames and skirting is done before the field, so the roller can run into the edge without a second pass and a visible overlap.

## What goes wrong when the sequence is rushed?

Paint applied over damp putty blisters within weeks. Putty applied over uncured plaster cracks along the shrinkage lines. Primer omitted leaves a first coat that dries patchy and needs a third to look even.

Each failure has the same signature: it appears at the boundary between two stages, not in the middle of either.

## How is the room protected?

Masking on frames, switches and skirting, drop sheets on the floor, and polythene over anything that cannot be moved. A painter who does not mask is a painter whose cutting-in will be judged on the finished wall.

## What order should rooms be done in?

Ceilings first, then walls, then the trim, and the floor last. Working in that order means nothing is dropped on a finished surface and no ladder leans against fresh paint.

In a flat being done room by room, sequence the rooms so that occupied space is finished last and the dust-producing work is concentrated early.

## How long between stages in practice?

Two days between plaster and putty in dry weather, longer in the monsoon. A day between putty coats. Half a day to a day between primer and first coat. Four to six hours between topcoats, longer in humid conditions.

A schedule that assumes otherwise is a schedule that is being met by skipping drying time.

## How does an owner verify progress without testing anything?

By looking at the wall and the calendar together. If putty is being sanded the day after plastering, the sequence is being compressed. If the primer went on while the wall still felt cool to the back of the hand, it went on too early.

Those two observations catch most of the trouble before it is painted in.

## Who should be on site when each stage closes?

The owner or their representative, at the end of plastering and at the end of puttying. Those are the two moments when a defect can still be corrected by the trade that created it, without argument about who pays.

After the first topcoat, every correction is a repaint, and repainting a wall to hide a patch is more expensive than the original wall coat.

## How should the flat be handed over between trades?

With the previous stage accepted and photographed. A plasterer who leaves before the wall is checked leaves a dispute behind; a painter who starts on an unchecked wall inherits it.

A one-page handover note per room, signed by the two trades and the owner, removes almost all of the argument that otherwise arrives at the end of a project.

## What should the wall look like the day the painter leaves?

Even under raking light, uniform in sheen, with crisp lines at frames and skirting, and no dust on horizontal surfaces. Anything short of that is a snag rather than a finish, and it is easier to list on that day than a week later.

## How long should the wall be left between coats?

Long enough that the film is dry to the touch and short enough that it is not fully cured. In Indian conditions that is usually four to six hours for primer and overnight for a first emulsion coat, but the tin and the ambient humidity decide it rather than a habit.

The test is simple. Press a finger on an inconspicuous patch; if it feels cool and tacky, wait. Recoating a tacky film traps solvent, and trapped solvent shows later as a soft spot that marks when something is leaned against it.

## What does the painter need from the electrician before starting?

Conduit and boxes finished, chases filled and cured, and switch plates removed rather than taped over. A painter who has to work around a live fitting will either leave a halo of unpainted wall or paint over the plate, and both are visible afterwards.

The same applies to plumbing. Any chase that is still to be cut should be cut before the putty stage, because a chase cut after painting removes three layers at once and the patch is never invisible.

## How is a ceiling treated differently from a wall?

It receives light at a shallow angle, so every ripple in the plaster reads as a shadow. That is why ceilings are usually finished in a flatter sheen and checked with a light held against the surface rather than from the doorway.

Ceilings also take the first and worst of cooking vapour and monsoon humidity. A slightly higher sheen on a kitchen ceiling is not a design choice but a maintenance one, and it costs almost nothing at the time of painting.

## What changes during the monsoon?

Drying times roughly double, and the risk moves from the paint to the substrate. Plaster and putty hold moisture for far longer, and a wall that reads dry to the eye can still be wet a millimetre below the surface.

The practical rule is to test before each stage rather than to schedule by calendar. A moisture meter reading taken in the morning, in the same place each time, tells the painter more than any instruction about waiting a fixed number of days.

## How are cracks dealt with before the putty goes on?

Hairline cracks are opened slightly with a scraper, brushed clean, and filled; anything wider is cut back to sound material and filled in layers rather than in one deep pass. Filling deep in a single application leaves a soft core that reopens within a season.

Junctions between dissimilar materials need more than filler. A strip of mesh bedded across the joint, extending either side, is what keeps the crack from returning at exactly the same line, and it takes minutes to place before plaster rather than hours to chase afterwards.

## What should happen on the day the painter leaves?

A walk-through with a light held against each wall, a check of every switch and socket for a clean edge, and a note of the batch numbers. The batch record is what allows a patch in two years to match, and nobody remembers it after the invoice is paid.

Photographs of each room, taken square on, take a minute and answer most of the questions that arise later about what the finish looked like at handover.

## How are electrical chases and conduits handled?

Cut before plaster, filled with mortar rather than with putty, and covered with mesh when the chase is wide. A conduit buried without mesh leaves a line in the finished wall that appears within weeks as the fill shrinks around the pipe.

Boxes are set to a depth that leaves the plate flush with the finished surface, not the plaster. Getting that wrong is the most common cause of a plate that stands proud, and it is unfixable without cutting back three layers.

## Does the sequence differ for a repaint?

It starts at the putty stage and works backwards only where the surface demands it. Sound paint is cleaned, deglossed and spot primed; failing paint is scraped back to a firm edge and feathered, not removed wholesale.

What should not be skipped is the wash. Grease from cooking and hands is invisible until the new paint crawls away from it within days, and a sugar-soap wash followed by clean water is the difference between a repaint that lasts and one that does not.

## Can a wall be painted in sections as furniture arrives?

It can, and it usually should be in an occupied home. Cutting in at a doorway and finishing a room at a time keeps the work honest, provided each room is completed with the same batch and the same spread rate rather than being abandoned half finished.

The rule that matters is never to stop mid-wall. A break at a corner is invisible; a break in the middle of a lit wall shows as a band forever.$w3$, 8, 'installation', $v3$https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Painter_applying_primer_on_wall.jpg/1280px-Painter_applying_primer_on_wall.jpg$v3$, $t3$Plaster, Putty and Paint: the Interior Sequence$t3$, $m3$The stage-by-stage order for finishing an interior wall in India, from plaster cure and putty sanding to priming and two emulsion coats, in monsoon and$m3$),
  ($a4$in-interior-brick-paint-quality$a4$, $b4$Checking a Painted Interior Wall in India: What to Measure$b4$, $d4$Flatness, tap tests, moisture readings and raking light. The three inspection moments that catch interior defects while they are still cheap to fix.$d4$, 'IN', $w4$# Checking a Painted Interior Wall in India: What to Measure

Most interior wall defects are visible before the paint goes on, which is why the checks that matter happen at three moments: after plaster, after putty, and after the first coat.

## How flat should a wall be?

Flatness is judged with a straightedge held against the wall, in both directions, and a torch behind it. The gap should be consistent across the length; a wall that touches in the middle and stands off at the ends is bowed, and no paint will disguise it.

The other test is light. A wall lit from the side shows every ripple, which is why inspections are done at night with a work lamp rather than in daylight.

## How are hollow patches found?

By tapping with a knuckle or a light hammer across the wall in a grid. A dull, hollow sound marks plaster that has debonded from the brickwork. Small hollows at the edges of a wall are common and repairable; large ones in the field mean the plaster has to come off.

Marking them with chalk before the putty stage is the difference between a repair and a paint-covered defect.

## What about cracks?

Cracks are recorded by position, width and direction, and rechecked after a week. A hairline that stays hairline is cosmetic. A crack that widens, or that runs diagonally from the corner of a door, is telling you something about movement and should be looked at before it is filled.

## How is moisture checked?

With a moisture meter, at the base of the wall, around window reveals, and beside bathrooms. A reading taken in the monsoon is not comparable with one taken in April, so the number only means something alongside the season.

The practical check is a taped polythene sheet left overnight. Condensation on the underside means the wall is still giving up water, and paint should wait.

## How is the paint film judged?

For continuity, colour consistency and sheen uniformity, viewed along the wall rather than square on. Patches that flash differently under raking light show where the film thickness varies or where a spot repair was made without priming.

Coverage is checked by looking at the corners and the ceiling line, where thin application shows first.

## What is a reasonable defect list at handover?

A short list: a few pin holes, a mark where a ladder touched, a fine crack at a junction that is expected to move. These are touched up in a single visit.

A long list of hollow patches, visible trowel ridges or patchy sheen is not a snag list, it is a stage that was not completed.

## Who signs it off?

The person who will live with it, ideally, because the standard being applied is visual and the light in the room is part of the judgement. A handover done at midday in a north-facing room will look different at night under a lamp.

## How are defects recorded?

By room, wall and position, with a photograph. A snag list that says the finish is patchy cannot be acted on; one that identifies the wall behind the door in the second bedroom can.

## What can be fixed without repainting a wall?

Small holes, hairline cracks and isolated marks can be spot filled, primed and touched in, provided the paint batch is available. Larger areas cannot, because the sheen and colour of a patch show against the field.

That is why a litre of each colour is worth keeping.

## What is the standard for a repaint?

Less demanding than new work, because the plaster and putty are already accepted. The checks reduce to adhesion, dryness and uniformity: does the new coat bond, is the wall dry, and does it match.

## What should be checked in the room rather than the wall?

Ventilation, because a wall in a room that cannot dry will fail regardless of how well it was painted. An exhaust fan that works, a window that opens, and a door that allows cross flow do more for the finish than an extra coat.

# Checking a Painted Interior Wall in India: What to Measure

Most interior wall defects are visible before the paint goes on, which is why the checks that matter happen at three moments: after plaster, after putty, and after the first coat. Each moment catches a different mistake.

## What is checked once the plaster has cured?

Flatness first, with a straight edge held in several directions including diagonally. Plaster that is flat in the vertical and hollow in the diagonal shows as a ripple once light rakes across the finished paint, and no amount of putty corrects it without building a thick layer that will shrink.

Then soundness, by tapping. A hollow note means the plaster has debonded from the masonry, and paint over a hollow patch will crack in a ring around it. The third check is the junction line at every door and window, where a gap that is not filled before painting becomes a crack with a straight edge.

## How is putty judged before sanding?

By eye and by hand. Run a palm across the surface: a step you can feel will read as a shadow when the wall is lit from the side. Look along the wall from one corner rather than standing square to it, because the eye finds undulations that a straight-on view hides.

Check the corners and the reveals too. These are where the putty is thinnest and where a rushed job shows first, and they are also the places least likely to be inspected, which is why a painter who knows this will do them last and quickly.

## What does a moisture reading have to do with paint?

Everything, in a coastal or monsoon-affected city. Paint applied over a substrate above roughly twelve per cent moisture traps water, and the film then blisters, blushes or lifts. The reading determines whether the next stage can begin, and it is a two-minute check.

Readings should be taken in the same place on each visit so they can be compared. A single number in the middle of a wall tells you less than three numbers showing a wall drying from the outside inwards.

## How is the finished coat assessed?

Light is the tool. A torch held near the wall and moved slowly across it reveals roller marks, misses and patches where the film is thin. Daylight from a window does the same job at a shallow angle early or late in the day.

Coverage is checked by count rather than by eye: two coats on every surface, including the strip above door heads and behind radiators, which are the two places most often left with one. Sheen uniformity then shows whether the coats were applied at a consistent spread rate.

## Which defects justify refusing the work?

Four. A hollow patch that was painted over, a crack that was filled without being opened, a visible step at a junction, and a film so thin that the substrate colour reads through in raking light. Each one is cheap to fix before handover and expensive afterwards.

Everything else, from a stray brush mark to a slightly uneven corner, is a conversation rather than a rejection. Categories help: structural, adhesion, appearance.

## How is a wall checked where the light is poor?

With a torch and a straight edge rather than by looking harder. Poor light hides exactly the defects that matter in good light, and the person inspecting is usually standing in the worst-lit part of the room when they make the judgement.

Take the readings and photographs near a window during the day. The same wall photographed at night under a bulb will look either worse or better than it is, depending on the angle, and neither impression helps a contractor fix the right thing.

## Who should be present at each check?

The person paying, at least once, and at the plaster stage rather than at the end. Plaster is the layer that decides flatness, and a check that happens after the paint is finished can only record a defect that is now expensive to undo.

A contractor inspecting their own work finds what they expect to find. A second pair of eyes at the putty stage, with a torch and a straight edge, changes what gets fixed while fixing is still cheap, and it takes twenty minutes.

## How is a repair judged after the fact?

By the light test in the same conditions as the original inspection, and by whether the patch reads as a patch. A repair that is invisible in daylight but visible under a bulb at night has not failed; one that shows in ordinary daylight has.

Consistency matters more than perfection. A wall with three honest, well-blended repairs looks better than a wall repainted to hide them, and costs less.

## What is a reasonable defect list at handover?

A short written list with locations, agreed before the painter packs up. Two or three items per room is normal in a building of any size, and most are touched up in an hour.

What is not reasonable is a verbal list delivered a month later, when the painter has moved to another site and the attribution of each mark is disputed. Put it in writing on the day, with photographs.

## How is a ceiling checked without scaffolding?

With a long straight edge and a bright light held low, from a ladder placed to keep the light raking across rather than shining at the surface. The angle is the whole technique; standing underneath with a torch pointed up shows almost nothing.

Look along the junction between wall and ceiling as well. That line is the one the eye reads first, and a wavy line there is more noticeable than a small hollow in the field of the ceiling.

## Should the check be repeated after a season?

Yes, once, and cheaply. A single walk-through after the first monsoon or the first hot season finds the cracks and blisters that appear as the building moves, and it is the moment when a warranty conversation is still possible.

## Does a painted wall need to be checked again before sale?

A short walk-through with a torch is enough, and it is worth doing while there is still time to fix what it finds. Buyers look at walls first, and a visible repair line is a question that costs more than the repair.

## What if the painter disputes a finding?

Show it in the same light and from the same distance, with the straight edge in place. A defect that can be photographed is a defect that can be discussed without argument.

Photograph it at the same time, and keep the photograph with the handover file so the next inspection starts from a known state rather than from memory.$w4$, 8, 'quality', $v4$https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_176_--_2025_--_0935.jpg/1280px-Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_176_--_2025_--_0935.jpg$v4$, $t4$Checking a Painted Interior Wall: What to Measure$t4$, $m4$Flatness, tap tests, moisture readings and raking light. The three inspection moments that catch interior defects while they are still cheap to fix.$m4$),
  ($a5$in-interior-brick-paint-maintenance$a5$, $b5$Maintaining Painted Interior Walls in India: Cracks, Damp and Repainting$b5$, $d5$Repaint intervals, hairline crack repair, efflorescence and mould. What Indian interiors actually need, and the records that make the next repaint cheaper.$d5$, 'IN', $w5$# Maintaining Painted Interior Walls in India: Cracks, Damp and Repainting

A painted interior wall in India does not fail suddenly. It gives warnings, and maintenance is mostly a matter of reading them early enough to act cheaply.

## What does a wall need every year?

A walk through with a hand torch, looking at the base of walls, around window reveals, ceilings under bathrooms and behind furniture. Those four places account for most of the damage found in a decade.

The other annual task is cleaning: a damp cloth on marks, a mild detergent solution on greasy areas, and nothing abrasive on a matt finish.

## How are hairline cracks treated?

They are opened slightly into a V, filled with a flexible filler, sanded, primed and touched in. Filling over a hairline without opening it leaves the filler sitting on the surface, and it lifts within a season.

Where the crack returns in the same place after two repairs, the cause is movement rather than shrinkage and the joint should be treated as a movement joint rather than a crack.

## What does a white bloom on the wall mean?

Efflorescence: salts carried to the surface by water and left behind when it evaporates. It is a symptom, not a problem in itself. Brushing it off and repainting without finding the source guarantees its return.

The source is almost always moisture at the base of the wall, a leaking pipe in the wall, or a bathroom on the other side. Those are plumbing and waterproofing jobs, not painting ones.

## How is mould handled?

With ventilation first and chemistry second. A wall in a room with no cross flow will grow mould whatever is applied to it. Cleaning with a dilute solution, letting the wall dry fully, and then repainting with a finish that resists mould is the order.

Painting over mould without killing it seals the spores and the stain returns through the new film.

## When should a wall be repainted?

When the film has chalked, thinned or lost adhesion, not when the colour has faded. A cloth wiped across the wall tells you: heavy white residue means the binder has broken down and the next coat will not have anything to grip.

In most Indian interiors that is somewhere between five and eight years, earlier in kitchens and corridors.

## What does a repaint require beyond paint?

Washing, filling, sanding, spot priming and masking. The painting itself is the shortest part of the job, and the part that decides how the result looks in two years is the preparation.

## How are patches made invisible?

By feathering. The edge of the repair is sanded so it blends into the surrounding wall over a hand's width, then primed, then coated, then the whole wall is coated once so the sheen is continuous. Touching in only the patch is what leaves a visible rectangle.

## What about walls behind furniture?

They are the ones most likely to hold damp and least likely to be seen, which makes them worth an annual check. Moving a wardrobe out once a year is cheaper than discovering a mould colony behind it after three.

## What fixes are within an owner's reach?

Filling and touching up small holes, cleaning marks, re-sealing around a window frame, replacing a failed exhaust fan. Anything involving cutting into the wall, plumbing inside it, or a crack that keeps returning belongs to a trade.

## How is a repair recorded?

A photograph, the date, the product used and the reason. The record is what turns a recurring problem into a pattern, and a pattern into a diagnosis.

## What does maintenance cost over a decade?

Less than one repaint done early beats a full repaint done late. The annual walk and the small repairs keep the wall in a state where two coats restore it, rather than one where plaster has to be replaced in patches first.

## What is the single most useful habit?

Keeping a note of the paint brand, shade code and batch, and a spare litre of each colour. In a country where shades are discontinued as ranges are refreshed, that litre is what makes the difference between a repair and a whole wall.

# Maintaining Painted Interior Walls in India: Cracks, Damp and Repainting

A painted interior wall in India does not fail suddenly. It gives warnings, and maintenance is mostly a matter of reading them early enough that the response is a repair rather than a redecorate.

## What are the first warning signs?

Hairline cracks at corners and above openings, a chalky residue on a hand wiped across the wall, and a dulling of sheen in the places people touch. None is serious on its own, and together they say the film is at the end of its service life.

Damp is different. A tide mark low on a wall, a bloom of white salts, or paint that has lifted in a blister are all evidence of water, and repainting over them buys a season at most.

## How often should an interior be repainted in Indian conditions?

Six to eight years for a well-painted wall in a dry room, four to five in kitchens, bathrooms and rooms that stay closed through the monsoon. A rental repainted at every change of tenant is on a different cycle again, and a cheaper product is rational there.

The interval shortens with every repair done badly. Each patch that is filled without being opened, or painted without being primed, becomes the place the next failure starts, and the cost of painting a room is dominated by moving furniture rather than by materials.

## How is a hairline crack repaired properly?

Open it with a scraper along its length, remove the dust, and fill with a filler that is slightly softer than the surrounding plaster. Sand flush once cured, spot prime, and bring the topcoat out beyond the repair so the edges blend rather than showing as a rectangle.

A crack repaired this way twice in the same place is telling you something. Look for movement, a joint between materials, or a chase behind the plaster rather than filling it a third time.

## What does efflorescence mean, and what should be done about it?

White salts on a plaster surface come from moisture carrying salts to the face as it evaporates. Brushing them off treats the symptom; the salt will return within weeks unless the water path is found and closed.

The source is usually outside: a leaking pipe, a damp course that has been bridged, or an external wall with a cracked render. Interior work should wait until the wall has dried and the readings are stable, otherwise the new paint will lift in the same pattern.

## How are kitchen and bathroom walls kept clean without damage?

With a mild detergent and a soft cloth, and with the surface rinsed rather than scrubbed. Abrasive powders cut through the sheen and leave a dull patch that collects dirt faster than the surrounding wall, so the cleaning becomes the cause of the next problem.

Steam and grease are the real enemies. An extractor that works, and a washable sheen on the walls around cooking and washing, do more for the finish than any cleaning routine.

## What records make the next repaint cheaper?

The products and grades used, the batch numbers, the date, and a photograph of each room afterwards. With those, a painter can match the existing system rather than guessing, and a patch can be made to disappear instead of announcing itself.

Keep them with the property documents rather than in a drawer in the room. The next owner will need them, and the next painter will ask.

## Is mould a paint problem or a building problem?

A building problem, almost always. Mould needs sustained moisture, and a wall that stays wet enough to grow it is either leaking, bridging a damp course, or unable to ventilate. Anti-mould paint suppresses the growth for a while and does nothing about the cause.

The order of work therefore starts with air and water: fix the leak, clear the ventilation, dry the wall, and only then treat the surface. A wall that is dried first holds its finish for years; one painted while damp repeats the cycle.

## What does a full repaint cost, and who does the work?

Priced by area, with the number of coats and the height of the room changing the figure more than the brand of paint. Two-storey rooms, heavy furniture and intricate joinery all add labour, and labour is the larger part of the bill.

A specialist painting contractor is worth the difference on large or awkward jobs. On a single room, an experienced local painter with a good reputation does the same work, and the outcome depends more on preparation than on the sign on the van.

## When is it time to replaster rather than repaint?

When the plaster is hollow over a large area, when the surface crumbles under a scraper, or when the wall has been damp long enough that the salts have eaten into the render. Paint cannot rescue any of those, and applying it wastes the money.

A patch test settles it. Scrape a small area in an inconspicuous corner: if the plaster comes away in sheets rather than dust, the wall needs more than decoration.

## What does a two-year plan look like for a rented flat?

At the start of a tenancy: wash the walls, touch up the marks that will otherwise grow, and photograph each room. At the end: a single-room repaint where it is needed rather than a whole-flat job, priced before the tenant leaves so there is no dispute about who pays.

Between those points, cleaning with a mild detergent and fixing leaks immediately is the whole of it. A maintenance plan for paint is mostly a plan for water.

## What is the single most useful maintenance habit?

Looking once a month at the walls that face the weather, from inside and out. Nearly every expensive repair in an Indian flat starts as a stain that was noticed late, and noticing it a season earlier changes the bill entirely.

## Is there any reason to repaint a wall that still looks fine?

One: fading that has happened evenly reads as fine until a picture comes down. Otherwise a wall that is sound and clean can wait, and spending money on paint that is still doing its job is not maintenance.

## Does the type of paint change the interval?

A washable emulsion holds its appearance longer in wet rooms, and a matt finish lasts longer in dry bedrooms. Matching product to room is cheaper than repainting everything on the shortest cycle.

Keep the product names and dates with the property papers, and note which rooms were done in which year so a single-room repaint never has to match an unknown batch.$w5$, 8, 'maintenance', $v5$https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_176_--_2025_--_0936.jpg/1280px-Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_176_--_2025_--_0936.jpg$v5$, $t5$Maintaining Painted Interior Walls in India$t5$, $m5$Repaint intervals, hairline crack repair, efflorescence and mould. What Indian interiors actually need, and the records that make the next repaint cheaper.$m5$)
) AS a(slug,title,excerpt,market,content,read_time_minutes,theme,cover_url,meta_title,meta_description) JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='assembly:in-interior-brick-paint' ON CONFLICT (slug) DO NOTHING;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code='en' AND sl.article_id IS NULL AND a.slug LIKE 'in-interior-brick-paint-%';
ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s SET review_status='accepted', reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, reviewed_at=now() FROM public.learn_wall_finishing_topics t WHERE s.topic_id=t.id AND t.candidate_key='assembly:in-interior-brick-paint' AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t SET verification_status='verified', verified_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, verified_at=now() WHERE t.candidate_key='assembly:in-interior-brick-paint' AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_topic_id=(SELECT id FROM public.learn_wall_finishing_topics WHERE candidate_key='assembly:in-interior-brick-paint') AND slug LIKE 'in-interior-brick-paint-%';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
COMMIT;
