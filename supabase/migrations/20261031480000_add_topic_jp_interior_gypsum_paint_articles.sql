-- Japan batch 3: five researched draft articles for gypsum board to emulsion paint (assembly:jp-interior-gypsum-paint).
-- SEO-aware per docs/wall-finishing-seo-standard.md.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='JP' AND candidate_key='assembly:jp-interior-gypsum-paint') THEN RAISE EXCEPTION 'JP interior gypsum paint topic is missing'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Yoshino Gypsum','https://www.yoshino-gypsum.com/','Yoshino Gypsum','Gypsum board substrates, joint treatment and paint suitability'),
  ('The Japan Institute of Architects','https://www.jia.or.jp/','Japan Institute of Architects','Japanese interior finishing specification practice'),
  ('Japan Paint Manufacturers Association','https://www.jpma.or.jp/','JPMA (jpma.or.jp)','Japanese paint product classification, VOC and labelling'),
  ('Ministry of Land, Infrastructure, Transport and Tourism','https://www.mlit.go.jp/','MLIT (Japan)','Japanese building standards, interior finish classification and ventilation'),
  ('JLIC','https://www.jlic.or.jp/','JLIC (jlic.or.jp)','Japanese construction trade standards')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='JP' AND t.candidate_key='assembly:jp-interior-gypsum-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: Painting an interior wall, David Mulder, CC BY-SA 2.0','https://commons.wikimedia.org/wiki/File:203_365_Painting_the_basement._(35705667550).jpg','Wikimedia Commons','Cover photograph overview article, CC BY-SA 2.0'),
  ('Image credit: Roller painting, Kristopher Radder, public domain','https://commons.wikimedia.org/wiki/File:Defense.gov_photo_essay_110617-O-ZZ999-012.jpg','Wikimedia Commons','Cover photograph materials article, public domain'),
  ('Image credit: Man painting a wall, ALTposes, CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Man_Painting_Wall.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 4.0'),
  ('Image credit: Sanding drywall, Georgia National Guard, CC BY 2.0','https://commons.wikimedia.org/wiki/File:Sanding_Drywall_(5891937910).jpg','Wikimedia Commons','Cover photograph quality article, CC BY 2.0'),
  ('Image credit: Painters at work, Sundaram Perumal, CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Painting_Time.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 4.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='JP' AND t.candidate_key='assembly:jp-interior-gypsum-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'JP',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='JP' AND t.candidate_key='assembly:jp-interior-gypsum-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.meta_title,a.meta_description,'JP','JP',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('painting-japanese-gypsum-board-overview', 'Painting Japanese Gypsum Board: Putty, Primer and Emulsion', 'Painting a Japanese gypsum board wall means putty, sanding, sealer and emulsion in that order: what each stage does, why paint is the minority finish in Japan, and where it wins.', $wallarticle1$# Painting Japanese Gypsum Board: Putty, Primer and Emulsion

Painting Japanese gypsum board is a four-stage job: putty the joints and screw heads, sand the surface flat, seal the board, then apply emulsion paint. The paint is the last and least important part; the putty and the sealer decide how the wall reads.

Gypsum board is the standard interior substrate in Japan, but the dominant finish here is a sheet wallcovering rather than paint. Paint wins in bathrooms, kitchens, rental units being refreshed on a budget, and modern interiors where a flat matt surface is wanted. This article explains how that painted wall is built up, and what distinguishes it from the wallcovering route.

## What does painting Japanese gypsum board involve?

Painting gypsum board in Japan means treating every joint and screw head with putty, sanding the treated areas flush, applying a sealer to equalise absorption, and then applying two or more coats of water-based emulsion.

The sequence exists because gypsum board is not a uniform surface. The board face is paper, the joints are filled with a compound, and the screw heads are filled again. Paint applied over those three materials draws differently into each, so without a sealer the joints and screeds show through as a patchwork of sheen and texture.

That is the structural reason for the four stages. Skipping the sealer is the most common shortcut and the most visible.

## Why is paint the minority finish in Japan?

Paint is the minority finish because a sheet wallcovering is faster to install, hides more, and is easier to renew in a rental market.

A wallcovering covers a joint that was filled but not perfectly sanded. A paint film does not: it reveals every ridge, every screw dimple and every change in the paper. In a market where interiors are renewed between tenancies on a short cycle, that tolerance is worth money.

Paint's advantages are different. It is cheaper per square metre on a simple room, it does not peel at a seam, it can be touched up locally, and it does not trap moisture against the board. In a humid climate that last point matters, and it is the main technical argument for paint in kitchens and bathrooms.

## Which rooms get paint and which get wallcovering?

The choice follows moisture and traffic rather than fashion.

Bathrooms, kitchens, entrance halls and utility rooms are the paint rooms, because a paint film tolerates cleaning and does not lift at a seam in damp air. Living rooms, bedrooms and children's rooms are the wallcovering rooms, because a covering is quieter, warmer to the touch and easier to patch invisibly with a spare length.

Rental housing is mixed: a painted wall is cheaper to refresh, a covered wall looks better on a listing. Many Japanese landlords paint the wet rooms and re-cover the dry ones, which is also the most durable split.

## What is putty and why does it matter more than paint?

Putty, called pate in Japanese practice, is the compound used to fill joints, screw heads and any imperfection in the board before painting.

Its job is to make the wall a single plane, and its quality decides whether the paint has anything to sit on. A putty that shrinks leaves a groove along every joint; one that is too hard sands unevenly and dishes the board around it; one applied too thickly cracks as it cures.

The putty stage is where a painted Japanese wall is won or lost, and it is the stage a cheap job compresses. Two thin passes sanded flat beat one thick pass, always.

## What does the sealer do?

The sealer equalises absorption across the paper face, the putty and the screw fills, and it binds any residual dust.

Without it, the paint dries at different rates across those materials. The joints then read as duller or shinier lines, and on a light colour in raking light that difference is obvious. The sealer also reduces the risk of the board's paper lifting when the emulsion is applied.

Japanese sealers are specified for gypsum board and for the paint system over them. A sealer bought for concrete or for timber is not a substitute, because its absorption and its adhesion are tuned for a different substrate.

## What kind of paint is used?

Water-based emulsion, called jusui or emulsion paint, is the standard interior product: low odour, quick drying, and available in matt, low sheen and washable grades.

The sheen grade is a practical decision rather than a decorative one. Matt hides imperfections and is the usual choice for living areas, low sheen cleans better and suits corridors and kitchens, and washable grades are chosen for rooms where marks are expected.

Solvent-based paints exist and are used where a harder film is needed, but in a Japanese interior the odour and the drying time make them the exception rather than the default.

## How many coats are needed?

Two coats over a sealed surface is the normal specification, with a third on a strong colour change or a repaired area.

Coverage is a function of the colour difference and the film build, not of the number printed on the tin. Painting white over white can be done in two coats; painting a deep colour over white often needs three, and painting white over a deep colour may need more.

The honest way to price a job is coats multiplied by area, with the sealer as its own line. A quote that names a total area but no coats is a quote that will be delivered in one thin pass.

## Where does a painted Japanese wall fail?

It fails at the joints, at the screw heads and at the corners, and it fails for the same reason every time: insufficient preparation.

A joint that was filled and not sanded shows as a ridge. A screw head that was not dimpled shows as a bump. A corner that was not taped cracks. In a humid room, a wall painted without the right sealer blisters or lifts at the joint lines.

None of those failures is the paint's fault, which is why a warranty argument about paint is usually an argument about the stage before it.

## What does it cost and who does it?

Painting a Japanese room is priced by area, with the preparation as the largest variable.

A simple repaint over a sound surface is modest. The same room with cracks, water stains or loose putty becomes a repair job before it becomes a paint job, and the price reflects that. Masking, furniture moving and access are quoted separately or built in, and it is worth asking which.

The work is done by a painter, usually a specialist firm rather than a general builder. In a rental unit the landlord's contractor does it; in an owned house the owner engages the painter directly, and the questions to ask are about coats and preparation rather than about brand.

## How long does a painted interior last?

A painted Japanese interior lasts six to ten years in a dry room and less in a wet one, depending on the sheen grade and the ventilation.

Washable low-sheen paint in a bathroom may need refreshing sooner because of cleaning and moisture. Matt paint in a bedroom may last longer than the guide because it is rarely touched, although it marks more easily.

The cycle is set by appearance rather than by failure. A painted wall is repainted when it looks tired, and the paint is usually still doing its job when it is replaced.

## Can paint go over wallcovering?

Paint can go over a wallcovering, and in Japan it is done, but only when the covering is sound and firmly adhered.

A vinyl covering that is lifting at the seams will lift under paint, and the seams will show as lines. A fabric covering absorbs paint unevenly and loses its texture. A covering that has been painted cannot easily be stripped later, which closes the option of returning to a covering.

The usual Japanese advice is the opposite direction: strip the covering, prepare the board, and then choose either paint or a new covering. Painting over is a shortcut for a landlord's quick refresh, not a specification.

## Is a painted wall easier to repair than a covered one?

Yes, and that is paint's quiet advantage.

A scuff or a small hole in a painted wall is filled, sanded, sealed and touched in, and if the paint is more than a year old the touch-in may still read as a patch, but it will not require a whole wall. A covered wall needs a piece of the original covering, cut in at a seam, and without a spare length it becomes a wall.

For a household with children, pets or a lot of furniture moved against walls, that difference in repair cost is worth more than the appearance advantage of a covering.

## What should an owner specify in writing?

Five things: the putty passes, the sanding standard, the sealer product, the paint product with its sheen grade, and the number of coats.

Those five lines turn a paint job into a specification, and they make a comparison between two quotes possible. Without them, two quotes for the same room can describe two different jobs at the same price.

Add the masking and the furniture protection, because those are where a cheap quote usually saves its money.

## Related reading

Materials covers putty types, sealers, emulsion grades and the sheen choices. Installation follows the sequence from board to final coat. Quality covers what to check at each stage, and maintenance covers repainting cycles and mould.

Related topics in this library: the exterior ALC paint assembly for the outside face, and the timber frame with gypsum board for the wall underneath this finish.

## Does the board need to be new?

A painted wall can go over old board, and the age of the board matters less than its condition.

Sound board with an intact paper face takes paint well after washing and sealing. Board that has been damp and has softened, or whose paper has lifted at a joint, is replaced first, because paint over a failing substrate fails with it.

Inspecting the board before specifying is the cheapest part of a paint job, and it is the part that most often changes the price.

## How does Japanese paint compare with wallcovering for a landlord?

For a landlord, paint is cheaper to refresh and easier to touch up; a covering looks better on a listing and hides more.

The deciding factor is the tenancy cycle. A short cycle favours paint, because a coat of emulsion renews a room in a day. A long cycle with a premium tenant favours a covering, because it presents better and lasts without visible marks.

Many Japanese landlords split the difference by room type, which is the most durable strategy available.

## References

1. Yoshino Gypsum.
2. Japan Institute of Architects.
3. JPMA.
4. MLIT.
5. JLIC.

## Image credit

The cover photograph shows an interior wall being painted, taken by David Mulder and made available under CC BY-SA 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the painting stage of an interior wall of the kind this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 10, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/203_365_Painting_the_basement._%2835705667550%29.jpg/1280px-203_365_Painting_the_basement._%2835705667550%29.jpg',
   'Painting Japanese Gypsum Board: Guide', 'Painting Japanese gypsum board: putty, sanding, sealer and emulsion in order, why paint beats wallcovering in wet rooms, and where a painted wall fails first.')

, ('japanese-interior-paint-materials', 'Japanese Interior Paint Materials: Putty, Sealer, Emulsion', 'What to buy for a painted Japanese interior: putty grades and shrinkage, board sealers, emulsion sheen levels, washable and anti-mould grades, and the masking and tools that decide the finish.', $wallarticle2$# Japanese Interior Paint Materials: Putty, Sealer, Emulsion

Japanese interior paint materials are a short list, and the order of importance is the reverse of the order of price. Putty and sealer cost little and decide almost everything; the top coat costs the most and decides the least.

This is a buying guide for a painted gypsum board wall in Japan: what each product is, how it is graded, which grade suits which room, and what a merchant will ask before selling it.

## Is all putty the same?

No, and the differences matter at the joint and after the first heating season.

Japanese joint compounds divide by their setting behaviour: ready-mixed compounds that dry, and powder compounds that set chemically. A drying compound shrinks as the water leaves, which is why it is applied in thin passes. A setting compound shrinks less and hardens faster, which suits a deep fill.

For a painted wall the practical rule is a setting compound for the first pass in a deep joint and a drying compound for the finishing passes. That combination fills without shrinking and sands without dishing.

## Which putty suits which joint?

Lightweight putty sands easily and is the usual choice for a painted wall, because the sanding standard is the visible standard.

A heavier putty is harder and more durable but sands with more effort and more risk of dishing the board around the joint. On a wall that will be painted in raking light, the softer product is generally the better buy.

Where a joint is deep or wide, the first pass uses the harder, more structural product and the finishing passes use the lightweight one. Buying a single product for both jobs is a compromise, not an economy.

## What is board sealer and does it differ from primer?

Board sealer is a primer formulated for gypsum board paper and joint compound, and it is not interchangeable with a primer for concrete or timber.

Its two jobs are to equalise absorption and to bind dust. Both matter because the board face, the putty and the screw fills absorb at different rates, and the paint draws into whichever is thirstiest. A sealer that is too thin leaves the joints dull; one that is too thick builds a film that the emulsion cannot key to.

Japanese specifications name a board sealer rather than a generic primer, and that specificity is worth keeping when buying.

## What sheen levels exist and which should I buy?

Japanese emulsion comes in matt, low sheen and washable grades, and the sheen level is stated on the tin.

Matt hides surface imperfections and is the standard for living rooms and bedrooms. Low sheen cleans better and is used in corridors, kitchens and children's rooms. Washable grades carry a higher scrub resistance and are the sensible choice where marks are expected.

The mistake is choosing a sheen for its look in a shop. In a room, a higher sheen reveals every putty ridge and every screw dimple, so a glossy paint raises the standard of the preparation beneath it.

## Should I use anti-mould paint in a Japanese bathroom?

Anti-mould additives help, and they do not replace ventilation.

A bathroom paint with a mould inhibitor resists growth on the film, which is useful in a room that stays humid. It does not stop mould growing on dirt, on sealant or on the ceiling above the shower, and it does not fix a room without mechanical ventilation.

The practical Japanese specification for a wet room is a washable, mould-resistant emulsion over a well-sealed board, with the ventilation working. Paint alone is not a moisture strategy.

## What about VOC and smell?

Water-based emulsion with a low VOC content is the normal interior product in Japan, and it is chosen for smell as much as for regulation.

A low-odour product lets a room be occupied sooner, which matters in occupied houses and rental turnovers. Solvent-based paints have their place where a harder film is needed, but their drying time and smell make them a specialist choice indoors.

The tin states the VOC class. For a single room it is a comfort question; for a whole house it is worth specifying.

## Which tools actually change the result?

Four tools change the result: a quality roller sleeve, a cutting-in brush, a sanding block with the right grit, and masking materials that stay stuck.

A cheap roller sleeve splatters, leaves a texture and sheds fibres into the film. A worn cutting-in brush produces a wavy line at the ceiling that no amount of paint hides. The sanding block matters because sanding by hand without one dishes the wall.

Masking tape that lifts mid-job leaves a paint line where it was not wanted, and removing it after the paint has cured pulls the new film at the edge.

## How much paint does a Japanese room need?

A Japanese room's paint quantity follows its wall and ceiling area, not its floor area.

Measure the perimeter, multiply by the height, add the ceiling, and subtract the openings. That number, multiplied by the number of coats and divided by the product's coverage rate, gives the litres required.

Buying for the measured area plus a small allowance is cheaper than a second order in a different batch, because colour can vary between batches. Keeping the leftover for touch-ups is standard practice and it is what makes a later repair invisible.

## Does the board type change the paint specification?

The board type changes the sealer and sometimes the paint, and it is the first question a supplier should ask.

Standard board takes the usual board sealer. Moisture-resistant board has a face that repels water, so it needs a sealer formulated for it or the paint will not adhere. Fire-rated board may carry a specification requirement about what can be applied over it.

On a Japanese wall the board type is recorded at installation, which is why the record is worth keeping: a repaint specification depends on knowing what is under the paint.

## What does a room of materials cost?

For a single Japanese room, the materials for a painted wall are a modest line compared with the labour.

Putty, sealer, emulsion, masking and rollers for one room come to a small fraction of a professional repaint, which is why DIY painting is common here. The cost rises with the number of coats, the sheen grade and any anti-mould requirement.

The variable that surprises owners is preparation: filling, sanding and masking take longer than painting, and a budget that ignores them buys paint for a wall that is not ready.

## Which products should be avoided?

Three products cause most failures: a sealer intended for another substrate, a high-sheen paint chosen for looks, and a putty applied in one thick pass.

Each fails at the same place, which is the joint between materials. A concrete primer will not bond to board paper, a gloss film will reveal the putty work, and a thick putty pass will shrink and crack along its centre.

Avoiding them costs nothing and saves a repaint. That is the practical value of a specification that names products by type rather than by price.

## Related reading

The overview explains why the stages exist. Installation follows the sequence, quality covers what to check, and maintenance covers repainting cycles.

Related topics: the exterior ALC paint assembly for coating practice, and the timber frame with gypsum board for the wall behind this finish.

## Which sealer suits a repaired wall?

A repaired wall needs a sealer that equalises the repaired and the original areas, and that is a different product from a general board sealer.

New putty and original board paper absorb at different rates, so a repaired patch draws paint harder than the field. A sealer designed to bridge that difference, applied over the whole wall rather than only over the repair, is what prevents a dull halo around every patch.

Spot-sealing only the repair is the shortcut that produces exactly the halo it was meant to prevent, which is why the sealer goes over the wall.

## Do you need a different paint for ceilings?

Ceiling paint is usually the same emulsion in a flatter sheen, because a ceiling is seen at a raking angle and shows every variation.

A higher sheen on a ceiling reveals the roller pattern and every imperfection in the board joints, which is why Japanese ceilings are painted matt. The product may be identical; the sheen grade is what changes.

Ceilings also collect moisture in bathrooms and kitchens, so the washable grades are used there even though the surface is out of reach.

## How do you buy paint for a Japanese room?

Buy paint by measured area, number of coats and the product's coverage rate, and buy one extra litre rather than risk a second batch.

Colour can vary between batches, and a room painted from two batches can show the join on a large wall. The spare litre costs little and covers the touch-ups that follow any room's first year.

Store the leftover sealed, labelled with the room and the date, and keep it where it will not freeze.

## Do you need special paint for a bathroom ceiling?

A bathroom ceiling needs a washable, mould-resistant emulsion and a sealer that blocks stains, and that combination is the practical specification.

Steam condenses on the ceiling, dirt film holds it, and mould grows on the film. A paint with a mould inhibitor delays growth; a washable grade allows the surface to be cleaned; a stain-blocking sealer prevents water marks from bleeding.

The paint does not replace ventilation, which remains the deciding factor in a Japanese bathroom.

## What about paint for a rental turnover?

A rental turnover uses a washable low-sheen emulsion in a neutral colour, applied in two coats over a sealed wall, because it cleans and it photographs well.

The colour choice is commercial rather than aesthetic: a light neutral reflects light in small rooms and suits any furniture the next tenant brings. Strong colours cost more to cover on the next turnover, which is why they are rare in rental stock.

Keeping the product and batch on file is what makes the next touch-up possible.

## Which masking products actually work?

Masking tape rated for the surface it is applied to, and a drop sheet with a non-slip backing, are the two that matter.

Low-tack tape on fresh paint and on delicate surfaces, standard tape on frames and skirting, and a sheet that stays where it is put. Cheap tape lifts mid-job and cheap sheets slide, and both cost more in corrections than they save.

Removing tape while the paint is soft is the last rule, and it is the one most often broken.

## References

1. Yoshino Gypsum.
2. Japan Institute of Architects.
3. JPMA.
4. MLIT.
5. JLIC.

## Image credit

The cover photograph shows a paint roller being used on a wall, taken by Kristopher Radder and released into the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the application tool this article explains how to choose. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 10, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Defense.gov_photo_essay_110617-O-ZZ999-012.jpg/1280px-Defense.gov_photo_essay_110617-O-ZZ999-012.jpg',
   'Japanese Interior Paint Materials: What to Buy', 'Japanese interior paint materials: putty grades and shrinkage, board sealer versus primer, emulsion sheen levels, anti-mould grades, masking and tools that')

, ('painting-boarded-japanese-wall-sequence', 'Painting a Boarded Japanese Wall: Putty to Top Coat', 'The sequence for painting a Japanese gypsum board wall: masking and protection, joint and screw filling, sanding flat, sealing, cutting in, then two coats of emulsion in order.', $wallarticle3$# Painting a Boarded Japanese Wall: Putty to Top Coat

Painting a boarded Japanese wall runs in a fixed sequence, and each stage prepares the next. Masking and protection come first, then the filling, the sanding, the sealing and the coats.

Getting the order right is the whole method. Filling after sealing does not bond, sanding after sealing removes the sealer, and cutting in after the roller leaves a line nobody can blend.

## Why does masking come before filling?

Masking comes first because dust and paint reach everything, and because the filling stage creates the most dust.

Floors are covered, fittings are removed or wrapped, and the edges at ceilings, frames, sockets and skirting are taped. In a Japanese room that also means protecting the fusuma, the shoji and any timber trim, since those are difficult to clean and expensive to replace.

Masking done properly takes time and saves more. Masking done quickly produces paint lines on adjacent surfaces that cost a return visit.

## How are joints and screw heads filled?

Joints are filled in passes, each wider than the last, with the tape bedded in the first pass and the edges feathered in the following ones.

Screw heads are dimpled slightly, filled and then levelled, and any damage to the board face is filled in the same operation. The first pass is allowed to set before the second, and the second is applied wider so that the transition to the board face is gradual.

Feathering is what makes a joint invisible under paint. A joint that is filled to a hard edge reads as a step, no matter how carefully it is painted.

## How flat does the sanding need to be?

Sanding needs to be flat enough that a straightedge and a raking light show no ridge, which is a higher standard than "smooth to the hand".

The treated areas are sanded with a block, moving along the joint rather than across it, with light pressure. The test is a hand and a light: run a palm across the joint, then look along the wall with a torch held at a shallow angle.

Over-sanding is as damaging as under-sanding, because it removes the board paper and leaves a fuzzy surface that the sealer will raise. Sanding to the edge of the joint and stopping is the skill.

## Why dust removal matters so much

Dust removal between sanding and sealing is the stage that is most often skipped and most often visible later.

Dust left on the wall is bound by the sealer and forms a weak layer under the paint, which shows as a rough texture and can lift under a second coat. Dust left on the floor is tracked into the rest of the house.

A vacuum with a brush attachment, followed by a tack cloth or a damp cloth, is the method. In a Japanese room with tatami or timber floors, the vacuum is worth more than the cloth.

## How is the sealer applied?

Sealer is applied by roller and brush to the whole surface, including the filled areas, in one even coat.

The sealer is not a paint and is not meant to cover; it is meant to penetrate and to equalise. Applying it thickly builds a film that the emulsion struggles to key to, and applying it thinly leaves thirsty patches that draw the paint in.

Drying time is read from the product rather than guessed, and the top coat waits for it. A second coat of sealer is used where the board is very absorbent or where a strong colour change is coming.

## How do you cut in without a wavy line?

Cutting in is done with a brush held at a consistent angle, along a masked or a free edge, in a strip wide enough for the roller to reach without touching the edge.

The line is drawn once, steadily, rather than corrected repeatedly. A wavy ceiling line is almost always the result of a brush that is too dry or a hand that is not braced.

Where the edge is masked, the tape is removed while the paint is still soft, at a shallow angle, which produces a crisp line instead of a torn one.

## How are the coats applied?

The first coat is applied by roller in overlapping passes, worked into the surface and laid off in one direction to avoid a visible pattern.

The second coat follows after the stated interval, and it is the coat that covers. Roller pressure should be light and consistent; pressing hard leaves a texture and a thinner film at the edges of each pass.

Cutting in is repeated before each coat, so that the brush work is always covered by the roller rather than sitting on top of it.

## What about ceilings and corners?

Ceilings are painted before walls, because paint runs downward and because the wall coat then covers any overlap.

Corners are cut in with a brush on both faces, with the second face cut after the first has dried enough not to be marked. A corner painted wet-into-wet pulls the film and leaves a heavy line.

In a Japanese room, the junction between wall and ceiling is often a deliberate line rather than a shadow gap, so the cut is a visible detail rather than an invisible one.

## How long between coats?

The interval between coats is the product's recoat time, adjusted for temperature and humidity, and it is longer than most people expect in a Japanese summer.

Applying the second coat too early drags the first, which produces a surface that looks textured and never flattens. Applying it much later is safe as long as the surface is clean and lightly keyed.

In a humid season the interval may double, which affects a room-by-room programme more than a single wall.

## How is the room returned?

The room is returned after the final coat has cured enough not to be marked, and the masking is removed before that point.

Tape is removed while the paint is soft, fittings are refitted once the film is hard enough, and the floor protection is taken up last. Furniture is moved back after the film has cured rather than when it is touch-dry.

Ventilation continues for a day or two, which is both a comfort measure and a moisture measure in a humid climate.

## What does the labour actually consist of?

The labour on a painted Japanese room divides roughly into preparation, application and making good, and preparation is usually the largest.

Filling and sanding take longer than rolling, especially on a wall that has been previously covered and stripped. Masking takes time in a furnished room. Making good at the end, with fittings refitted and edges checked, is the stage that decides whether the room feels finished.

A quote that prices painting by area alone is pricing the smallest part of the work.

## What can go wrong on the day?

Five things recur: filling over dust, sealing over a damp board, cutting in after the roller, recoating before the interval, and removing tape after the paint has cured.

Each produces a specific defect and each is avoidable by following the order. None of them is corrected by more paint, which is the reason the sequence matters more than the product.

## Related reading

The overview explains the stages. Materials covers the products. Quality covers the checks between stages, and maintenance covers what to do when a painted wall starts to fail.

## What sequence do professionals follow in one room?

Professionals work ceiling, then walls, then trim, and they cut in twice per coat rather than once.

Ceiling first means any spatter falls on walls that will be painted anyway. Walls follow with the cutting-in done ahead of the roller, and trim last because it is the smallest area and the easiest to keep clean.

The double cut-in is the detail that separates a professional finish: the second cut is the one the roller covers, so the brush texture never sits on top of the wall.

## How are sockets and switches handled?

Sockets and switches are masked, painted around, and then released while the film is soft.

The plate is either removed and refitted after painting or masked at its edges. Painting over a plate looks tidy for a week and then flakes at the edges as the plate is used.

Where a plate is removed, the screws are kept in a pot rather than in a pocket, and the plate is refitted after the second coat has cured enough not to be marked by the screwdriver.

## What about old wallcovering before painting?

Old wallcovering is stripped before painting, not painted over, unless it is a thin lining paper in sound condition.

A vinyl covering that is painted cannot be stripped later without damage to the board, and its seams telegraph through a paint film within a year. Stripping, washing off the adhesive and sealing the board is more work and it is the only route that gives a painted wall.

Where a lining paper is sound and firmly adhered, priming and painting over it is acceptable, and it is common in older Japanese houses.

## How is a painted wall dried in a humid season?

Drying in a Japanese summer is managed with ventilation and time rather than with heat.

Windows are opened where the air is drier, mechanical ventilation runs continuously, and the recoat interval is extended rather than shortened. A dehumidifier in the room being painted shortens the interval and reduces the risk of a film that stays soft.

Applying the second coat to a film that is still soft is the most common summer defect, and it produces a surface that never flattens.

## How do you handle a wall with old damage?

Old damage is filled, sanded and sealed as part of the preparation, and large areas are treated as a repair rather than as a paint job.

Deep dents take a setting compound first, then a lightweight finish pass. Areas where the board paper is torn are cut back to sound paper and filled, because a torn edge lifts under paint.

The test is a hand and a light: if a palm feels a step, the paint will show it.

## What is the right order for trim and frames?

Trim and frames are painted last, after the walls, and their edges are cut in against the wall rather than masked where the wall is already finished.

In a Japanese room the timber trim is often left natural and only masked, which changes the order: it is protected before the walls are painted and uncovered at the end.

Either way, the junction between a painted wall and a timber frame is a deliberate line, and it is drawn with a brush rather than produced by tape wherever the frame is to be seen.

## How is a large room sequenced?

A large room is sequenced ceiling, then the far wall, then the remainder, working away from the exit.

That order keeps the painter from walking through wet paint and gives a continuous wet edge on each wall. On a very large wall, two people work together to keep the edge alive.

Where one person is working alone, the wall is divided at a natural break rather than at an arbitrary point, so that a lap mark falls where a corner or a fitting will hide it.

## References

1. Yoshino Gypsum.
2. Japan Institute of Architects.
3. JPMA.
4. MLIT.
5. JLIC.

## Image credit

The cover photograph shows a man painting a wall, taken by ALTposes and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the application stage that this article sequences. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 11, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Man_Painting_Wall.jpg/1280px-Man_Painting_Wall.jpg',
   'Painting a Boarded Japanese Wall: The Sequence', 'Painting a Japanese gypsum board wall step by step: masking, filling joints and screws, sanding flat, sealing, cutting in, then two coats applied in the')

, ('checking-painted-japanese-wall', 'Checking a Painted Japanese Wall: Filler, Sheen, Coverage', 'How to check a painted Japanese wall: joint and screw invisibility in raking light, sheen uniformity, film build and coverage, edge lines, and the moisture checks behind a paint failure.', $wallarticle4$# Checking a Painted Japanese Wall: Filler, Sheen, Coverage

Checking a painted Japanese wall means checking three things before the paint is even mentioned: are the joints invisible, is the sheen even, and is the film thick enough to perform. Only then does colour matter.

The order reflects cause and effect. A perfect colour over a ridge is still a ridge, and a uniform colour over an uneven film will fail at the joints within a couple of years.

## How do you check that a joint is invisible?

A joint is checked with a straightedge and with raking light, on the sealed surface before the top coat goes on.

The straightedge shows the local step. The raking light, held low and to one side, shows the shadow of any ridge, and it is the test that matches how the wall will look in a room with a window on one side.

Doing this check after the sealer is the last cheap moment. After two coats, a ridge is a sanding and repainting job rather than a sanding job.

## What does even sheen tell you?

Even sheen tells you the sealer worked and the paint was applied to a consistent film.

Patchy sheen is caused by uneven absorption, which is a sealer problem, or by uneven application, which is a technique problem. On a light colour it is subtle; on a low-sheen or washable grade it is obvious.

The check is done by viewing the wall from an angle in daylight rather than straight on with a work light. Straight-on light flattens the very difference being assessed.

## How is film build checked?

Film build is checked against the stated number of coats and against the product's coverage rate, with a physical check on a sample.

The arithmetic is simple: litres used divided by area, compared with the product's stated coverage. A job that used noticeably less paint than the arithmetic predicts was applied thin.

A cross-cut adhesion test on an inconspicuous area tells you whether the film has bonded to the sealer, which is the failure that shows later as peeling at the joints.

## What about screw heads?

Screw heads are checked like joints: by light and by hand.

A head that was not dimpled enough shows as a small bump, and a head that was over-filled and under-sanded shows as a small dish. Both are visible in raking light and both are invisible straight on, which is why a straight-on inspection is not an inspection.

On a large wall the pattern of heads is what the eye reads, so a single proud head reads as a rhythm rather than as a spot.

## How are edge lines judged?

Edge lines at ceilings, frames and corners are judged for straightness and for sharpness.

A straight line is one that does not wander by more than a couple of millimetres over a wall's length; a sharp line has no bleed onto the adjacent surface. Both come from bracing the hand and from masking, and neither can be corrected later without repainting the line.

In a Japanese room, the ceiling junction is a deliberate line, so it is a visible standard rather than a hidden one.

## What moisture checks matter after painting?

After painting, the moisture checks are about the wall behind the paint rather than the paint itself.

A painted wall in a Japanese bathroom that blisters or lifts is telling you about moisture moving through the board, not about the paint. Readings taken after the room has been used, compared with a dry reference point, separate a surface condensation issue from water entering behind the board.

The distinction matters because the remedy differs: better ventilation for the first, a leak investigation for the second.

## What defects repeat most often?

Six defects repeat, and each names a stage: ridges at joints (filling or sanding), dished patches (over-sanding), a visible screw rhythm (dimpling), patches of differing sheen (sealer), bleeding edges (masking or cutting in), and peeling at joints (sealer or dust).

None of them is a paint defect in the sense of a bad tin. All of them are decisions made before the tin was opened.

Knowing that stops a conversation from becoming an argument about brand, and turns it into a conversation about preparation.

## How is a big wall judged?

A large wall is judged from a distance first and up close second, in that order.

From across the room, look for the joint grid and the light. Anywhere the wall changes tone or shows a line, note it. Then approach and identify whether it is a joint, a screw, a patch or a sheen difference.

Judging close-up first produces a list of small findings and misses the one that matters, which is usually a global unevenness.

## What should a handover record contain?

The record names the board type, the putty passes, the sealer, the emulsion with its sheen grade, and the number of coats, with the date of each stage.

Add photographs in raking light at the joint stage and at completion, and the litres used against the area. Those items make a defect claim factual and a future repaint specification possible.

In a rented Japanese unit the record also tells the next occupant what paint to buy for a touch-up.

## What does an inspection cost and who does it?

An inspection is a few hours of time rather than a large cost, and it is done by whoever specified the work rather than by the painter.

For a domestic job, the owner performs the raking-light check with a torch and a straightedge, which costs nothing and catches the majority of what matters. For a building, a clerk of works or the architect does it with a written checklist.

The value is in doing it at the joint stage, when the correction is a sanding block.

## Related reading

The installation article sets out the sequence these checks verify. Materials explains the products that cause each defect. The maintenance article covers what to do when a check finds a fault after the room is in use.

## How do you check a paint job you did not watch?

A paint job that was not observed is checked by looking for the evidence each stage leaves.

Even sheen shows the sealer was applied uniformly. Invisible joints show the filling and sanding were done. Sharp edges show masking and bracing. A film thick enough to clean shows the coats were applied at the stated rate.

Where all four are present, the stages were probably done properly. Where one is missing, that stage is the one to question first.

## What is the honest test for coverage?

The honest test is arithmetic: litres used against area and coats, compared with the product's coverage rate.

A room that should have taken twelve litres and took eight was painted thin, whatever it looks like. Coverage arithmetic is also the only test that works on a wall that has already been decorated and looks acceptable.

Keep the receipts. They turn a suspicion into a measurement.

## Why does raking light matter so much?

Raking light matters because paint film defects are changes of plane and of sheen, and both are invisible under flat light.

A torch held against the wall at a shallow angle produces a shadow behind every ridge and a highlight on every dish. That is why inspections happen at night with a torch as often as in daylight.

The technique is the same one used for plaster and for drywall finishing elsewhere, and it costs nothing.

## How are ceilings judged?

Ceilings are judged from the floor, at the angle at which they will always be seen.

Stand at the far wall and look along the ceiling: a joint that was not sanded reads as a line, and a roller pattern reads as a texture. Both are more visible on a ceiling than on a wall because of the viewing angle.

A ceiling that looks flat from the door will look flat in use, which makes the doorway view the practical test.

## What does a checklist look like?

A checklist for a painted Japanese wall has nine lines: joints flat, screws invisible, patches flush, surface dust-free, sealer even, sheen uniform, film build to spec, edges sharp, room protected and returned.

Each line is a yes or a no, with a photograph where the answer is a no. A checklist that invites comment produces an opinion; one that invites a yes or no produces a finding.

The list takes twenty minutes on a domestic room and is the whole of a practical inspection.

## How do you check work you can only see at night?

Work inspected at night is checked with a torch in the same raking positions used in daylight, and the findings are recorded rather than remembered.

Artificial light is harsher than daylight and reveals ridge and sheen differences more clearly, so a wall that passes at night will generally pass in daylight. The reverse is not true, which is why nighttime checks are useful.

Recording the findings with photographs freezes the evidence at the moment it was found, which matters if the painter returns to correct the work.

## How do you check a colour match between rooms?

A colour match between rooms is checked by standing in a doorway and looking at both surfaces together, in daylight.

Paint mixed for one room and mixed again for the next is nominally the same colour and visibly different at the junction, which is why a whole floor is usually painted from one mix. Where two rooms are painted separately, the doorway is where the difference will be seen.

Keeping the batch code on file is what makes a later match possible, and it is the item most often lost.

## What is the most useful single check?

The most useful single check is a torch held along the wall at a shallow angle from a doorway, with the room otherwise dark.

That one observation shows ridges, dishes, screw patterns, sheen differences and roller marks at once, and it takes a minute. A wall that survives it will look correct in use.

Everything else in this article refines that check; none of it replaces it.

## How are repairs judged after the fact?

Repairs are judged by whether they are visible in the same light that found the original defect.

A patch that was filled, sanded and sealed across the whole wall should pass the torch test. A patch that was filled and painted locally will show as a change of sheen, and that is the finding.

Judging a repair in the light it was made in, rather than in daylight, is how a repair passes an inspection and then disappoints an owner. The check belongs in the room's real light.

## References

1. Yoshino Gypsum.
2. Japan Institute of Architects.
3. JPMA.
4. MLIT.
5. JLIC.

## Image credit

The cover photograph shows drywall being sanded, taken by a member of the Georgia Air National Guard and made available under CC BY 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the sanding stage that this article explains how to judge. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 10, 'quality', 'https://upload.wikimedia.org/wikipedia/commons/7/74/Sanding_Drywall_%285891937910%29.jpg',
   'Checking a Painted Japanese Wall: What to Look For', 'Checking a painted Japanese wall: joint and screw invisibility in raking light, even sheen, film build and coverage, sharp edge lines and the moisture behind')

, ('repainting-japanese-interior', 'Repainting a Japanese Interior: Cycles, Prep and Mould', 'When to repaint a Japanese interior, how to prepare a painted wall, dealing with mould and stains in a humid climate, and the touch-up routine that keeps a room looking sound.', $wallarticle5$# Repainting a Japanese Interior: Cycles, Prep and Mould

Repainting a Japanese interior is a maintenance operation, not a decoration, and its timing is set by how the wall looks and how the room is used. A painted wall in a dry room is refreshed every six to ten years; a bathroom sooner.

The work itself is mostly preparation. This article covers when to repaint, how to prepare, what to do about mould and stains, and how to keep a painted room looking sound between full repaints.

## When does a Japanese interior need repainting?

It needs repainting when the film has lost its uniformity, when cleaning leaves marks that do not come off, or when the surface has failed at the joints.

Signs that are reliable: patchy sheen in daylight, a chalky residue on a cloth after wiping, ridges appearing at joints, and peeling at the junction between the wall and the ceiling or the wall and a frame.

A wall can look acceptable in artificial light and tired in daylight, so the assessment is made in the room's own light rather than under a work lamp.

## How is a painted wall prepared for repaint?

Preparation is washing, repairing, sanding and sealing, in that order, with the repairs assessed rather than painted over.

The wall is washed to remove grease and dust, which matters most in kitchens. Cracks and dents are filled and sanded flat. Glossy areas are keyed so the new coat can bond. Then a sealer is applied where the surface is patchy or where repairs have changed the absorption.

Skipping the wash is the most common cause of a repaint that peels, because paint does not bond to grease, whatever the tin says.

## What about mould in a humid climate?

Mould is treated by removing it, correcting the moisture, and only then repainting.

The surface is cleaned with an appropriate product and dried thoroughly, and the source of moisture is investigated: ventilation, a cold bridge, a leak, or a room that is closed up in the rainy season. Painting over mould without correcting the cause produces a film that lifts within months.

In a Japanese bathroom, that investigation usually ends at the ventilation system, which is why the maintenance routine and the repaint routine belong together.

## How are stains treated?

Stains are sealed before painting, because water-soluble marks bleed through a new emulsion film.

A stain from water, smoke or a marker is sealed with a stain-blocking sealer formulated for it, then painted. Painting directly over a water stain in a humid room often produces the mark's return within a season, and its reappearance is evidence of the stain rather than of the paint.

Where a stain follows a leak, the leak is repaired first. Sealing a stain over an active leak traps moisture and produces blistering.

## Can a room be repainted without moving out?

Yes, and Japanese practice is organised around it: one room at a time, with furniture moved to the centre and covered.

The practical constraints are drying time, smell and access to the ceiling. A water-based emulsion with low odour allows a room to be used the same day, which is why it dominates in occupied houses.

Sequencing rooms rather than painting everything at once keeps a household functional and reduces the risk of freshly painted walls being knocked while they cure.

## How do you touch up without a visible patch?

Touch-up is done with the same product, thinned slightly, feathered at the edges, and applied in raking light so the boundary can be watched.

A touch-up on paint more than a year old will usually still read as a slight difference in sheen, because the film has aged. That is normal; the aim is to reduce the contrast, not to make it invisible.

Where a large area is affected, a corner-to-corner coat on that wall is often the honest solution, and it is cheaper than an argument about matching.

## What is the repaint cycle for each room?

Wet rooms are repainted sooner than dry ones: a bathroom or kitchen may need attention at five to seven years, a bedroom at eight to ten.

Corridors and entrance halls wear from traffic and cleaning, so they sit between the two. Ceilings last longer than walls because they are rarely touched, but they collect moisture in wet rooms.

Those figures are guides for a well-ventilated Japanese house. A poorly ventilated room shortens every interval, which is why ventilation maintenance is part of the repaint plan.

## What does repainting cost and who does it?

Repainting is priced by area with preparation as the variable, and the range between two quotes usually reflects different preparation.

A single room is a small job for a painter and a weekend for a careful owner. A whole house is a sequence of rooms with access and drying time built in, and it is usually quoted as one package.

The trades are painters, and on larger jobs a separate preparation crew. Asking what the preparation includes is the question that separates quotes.

## What should not be repainted?

Three situations warrant repair rather than repaint: widespread blistering, a wall that sounds hollow when tapped, and a ceiling that sags.

Each indicates a problem behind the paint, in the board, the fixing or the moisture control. Repainting covers the symptom and consumes the budget that the repair needed.

A single blister is a spot repair; blistering across a wall is a diagnosis.

## How is a repainted room brought back into use?

The room is returned when the film has cured, not when it is touch-dry, and the ventilation continues for a day or two.

Furniture is moved back with care at the wall line, since fresh paint marks easily. Curtains and blinds are refitted after the film has hardened, because they hold moisture against the wall.

In a Japanese summer the extra day matters, and it prevents the marks that make a new paint job look old within a month.

## What records are worth keeping?

Keep the paint product, its sheen grade and its batch, the date, and the rooms covered, with a photograph of each wall.

Keep a small quantity of the paint in a sealed container for touch-ups. In a rented unit, hand that record to the next occupant, since it is what allows a small damage to be repaired rather than charged for.

## Related reading

The overview explains the stages and the paint-versus-covering choice. Installation covers the sequence from bare board, and quality covers what to check before the room is signed off.

Related topics: the exterior ALC paint assembly for the outside of the same building, and the timber frame with gypsum board for the wall behind the paint.

## How is a kitchen wall prepared for repaint?

A kitchen wall is prepared by degreasing before anything else, because cooking vapour leaves a film that paint will not bond to.

The wall is washed with a degreasing product, rinsed and dried, and any areas of failed paint are scraped back to a sound edge. Only then is it filled, sanded and sealed.

A kitchen repaint that peels within a year is almost always a degreasing failure, and it shows first above the hob.

## What about a bathroom ceiling?

A bathroom ceiling is the most demanding surface in a Japanese house, and it is repainted more often than the walls.

Steam condenses there, the surface is cold, and mould grows on any dirt or grease film. The preparation is a wash, a mould treatment where needed, a stain-blocking sealer and a washable, mould-resistant emulsion.

Where the ceiling fails repeatedly, the ventilation is the problem rather than the paint, and the remedy is mechanical rather than decorative.

## Can you repaint over a repaired patch?

Yes, provided the patch was filled with a compatible product and sanded flush, and the whole wall is sealed afterwards.

A patch that is painted without sealing the wall around it shows as a change of sheen, which is the most common complaint after a repair. Sealing the whole wall costs a litre of sealer and prevents the complaint.

A patch that is still soft, or that was filled with a hard mortar, is removed and redone before painting.

## How do you keep a painted room looking sound?

The routine is simple: wipe marks early, keep furniture off the wall, ventilate daily, and touch in small damage before it spreads.

Marks that are wiped within a day come off; the same mark left for a month becomes a stain that needs sealing. Furniture against a wall traps moisture and marks the film. Ventilation is the single measure that delays every form of failure in a humid climate.

None of that is painting, and all of it is what makes a paint job last.

## How do you decide patch or repaint?

Decide by area and by view: a patch smaller than a hand in an inconspicuous place is touched in, and anything larger or in the sight line of the room is repainted wall to wall.

The judgement is about sheen difference rather than about colour. Fresh paint over a wall a year old will usually match in colour and differ in sheen, and that difference is what the eye notices.

Repainting wall to wall removes the question and often costs less than the time spent trying to match.

## What is the cheapest way to keep a wall sound?

The cheapest measure is ventilation, followed by keeping furniture off the wall and wiping marks early.

Ventilation costs the electricity of a fan and prevents the moisture that drives mould. Furniture moved a few centimetres off an external wall allows air to move. Wiping a mark within a day stops it becoming a stain that needs sealing.

All three are habits rather than purchases, and together they extend the interval between repaints by years.

## What does a repaint schedule look like over ten years?

Over ten years a well-kept Japanese interior sees a bathroom refresh at five to seven years, a corridor refresh at seven to eight, and a whole-floor repaint at nine to ten.

That schedule is not a rule; it is a budget shape. Writing it down turns paint from an unplanned expense into a known line, and it makes the decision to repaint a comparison between the schedule and the wall's actual condition.

Rooms that are used harder move earlier, and rooms that are barely used can wait.

## When should an owner stop repainting and start repairing?

Stop repainting when the same defect returns twice in the same place, or when the paint fails in a pattern rather than at random.

A repeated crack at one joint is movement or a failed tape. Blistering across a wall is moisture. Peeling above a hob is grease. Each of those is a repair, and each will outlast a fresh coat.

The test is simple: if the defect has a shape, it has a cause, and paint is not the cause.

## References

1. Yoshino Gypsum.
2. Japan Institute of Architects.
3. JPMA.
4. MLIT.
5. JLIC.

## Image credit

The cover photograph shows painters at work on a wall, taken by Sundaram Perumal and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the kind of small-team application this article describes for repainting an occupied room. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 10, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Painting_Time.jpg/1280px-Painting_Time.jpg',
   'Repainting a Japanese Interior: Cycles and Prep', 'Repainting a Japanese interior: when to repaint each room, how to prepare a painted wall, treating mould and stains in a humid climate, and touch-ups that')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url,meta_title,meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code='JP' AND t.candidate_key='assembly:jp-interior-gypsum-paint'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='JP' AND t.market_code='JP'
  AND t.candidate_key='assembly:jp-interior-gypsum-paint'
  AND a.wall_topic_id=t.id AND a.wall_market_code='JP' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
