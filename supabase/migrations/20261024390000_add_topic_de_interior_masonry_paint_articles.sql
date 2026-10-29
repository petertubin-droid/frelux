-- First DE batch: five researched draft articles for the native German interior masonry paint topic.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='DE' AND candidate_key='assembly:de-interior-masonry-paint') THEN RAISE EXCEPTION 'DE interior masonry paint topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Caparol','https://www.caparol.de/','Caparol','Interior coating systems, primers and substrate preparation for German practice'),
  ('Sto','https://www.sto.de/','Sto','Plaster and coating systems, surface quality and substrate requirements'),
  ('Bundesverband Farbe Gestaltung Bautenschutz','https://www.farbe.de/','Bundesverband Farbe','Trade guidance and technical leaflets for painting and finishing work'),
  ('Beuth Verlag, German standards','https://www.beuth.de/de','Beuth Verlag','Published DIN standards including plaster and coating series'),
  ('DIN, Deutsches Institut für Normung','https://www.din.de/de','DIN','Standards framework for plaster, painting and surface classification'),
  ('VOB online','https://www.vob-online.de/','VOB','Contract rules and technical conditions of contract for building work (ATV)'),
  ('Umweltbundesamt','https://www.umweltbundesamt.de/','Umweltbundesamt','Indoor air, low-emission products and health assessment of coatings'),
  ('Deutsches Institut für Bautechnik','https://www.dibt.de/','DIBt','Technical approvals and construction product regulation'),
  ('Brillux','https://www.brillux.de/','Brillux','Coating products, application guidance and surface assessment')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='assembly:de-interior-masonry-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: White lime plaster, Patrick Oberdörfer (CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Kalkputz_wei%C3%9F.jpg','Wikimedia Commons','Cover photograph overview article, CC BY-SA 4.0'),
  ('Image credit: Gypsum plaster finish, Achim Hering (CC BY 3.0)','https://commons.wikimedia.org/wiki/File:Gipsputz_stucco.jpg','Wikimedia Commons','Cover photograph materials article, CC BY 3.0'),
  ('Image credit: Plasterer at work on a wall, Adrian Pingstone (public domain)','https://commons.wikimedia.org/wiki/File:Plasterer_at_work_on_a_wall_arp.jpg','Wikimedia Commons','Cover photograph installation article, public domain'),
  ('Image credit: Plastering a wall, Haktwo2004 (CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Plastering.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: Painting a wall, Jonathan Billinger (CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Painting_a_wall_-_geograph.org.uk_-_6894343.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 2.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='assembly:de-interior-masonry-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'DE',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='DE' AND t.candidate_key='assembly:de-interior-masonry-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'DE','DE',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('de-interior-masonry-paint-overview', 'German Interior Masonry Finishing: Plaster, Filler, Tiefgrund, Paint', 'A German overview of the interior finishing chain on masonry: base plaster, fine filler, penetrating primer and interior paint, and why the surface quality class is agreed before work starts.', $wallarticle1$# German Interior Masonry Finishing: Plaster, Filler, Tiefgrund, Paint

German interior finishing on masonry is a chain with an unusually strict idea of quality at its centre. The wall is plastered, filled, primed and painted, and the level to which the plaster surface is worked is not a matter of taste: it is a defined quality class that the client, the plasterer and the painter all work to.

That single convention explains most of what distinguishes the German approach from the drylining traditions of the English-speaking world. The surface is built, not boarded over, and its flatness and texture are specified.

## The chain, in order

The sequence runs: masonry substrate, base plaster (Unterputz), finishing plaster or a skim of fine filler, a penetrating primer (Tiefgrund), and two coats of interior paint.

Each stage in that list is a separate trade in German practice, and the interfaces between them are where quality is won or lost. A plasterer produces a surface to a stated class; a painter prepares and coats it without being expected to correct the plaster.

Where gypsum board is used, the board receives filler and paint in the same way, and the surface quality classes apply to it as well. The convention is about the finished surface rather than about the material behind it.

## Surface quality classes

German finishing work is defined by surface quality classes, from a basic surface suitable for a flat paint in an undemanding position up to a high-grade surface for gloss finishes and critical lighting or for strongly coloured paints.

The classes describe what can be seen from a defined viewing distance under defined lighting: whether trowel marks are permissible, whether the surface must be free of visible texture, and how flat the plane must be. The reference is published in the plaster standards and applied through the ATV for plastering work [4](https://www.beuth.de/de) [6](https://www.vob-online.de/).

The practical value is that the argument about whether a wall is acceptable has a document behind it. Nobody has to win an aesthetic debate in a hallway.

## Why Tiefgrund is not optional

Tiefgrund is a penetrating primer, and in German practice it is treated as a required stage rather than an optional extra.

Its job is to equalise suction across a surface that is rarely uniform: plaster, filler patches, repaired areas and the occasional harder or softer patch all absorb differently. Without a primer, the paint's binder is drawn into the substrate unevenly, and the finish shows as patchiness and a loss of sheen.

The second reason is adhesion. A penetrating primer consolidates a lightly dusting surface and gives the finish coat something to key into, which matters on a mineral plaster that has been sanded [1](https://www.caparol.de/) [2](https://www.sto.de/).

## Plaster as the substrate

Interior plaster in Germany is typically a gypsum-based finishing plaster over a lime-cement or gypsum base coat, with machine application common on larger projects. The finishing plaster is worked with a float and then smoothed, and the surface it leaves is dense, slightly absorbent and mineral.

That surface is a good substrate for paint and an unforgiving one for poor paint, because it shows any unevenness in sheen. It is also why the German approach to interior paint tends towards matt and deeply matt finishes: a matt surface hides what a silk or gloss finish would reveal [9](https://www.brillux.de/).

## Paint types and where each belongs

Interior paint in Germany is dominated by dispersion paints, with matt and silk-matt the usual wall finishes. Mineral paints based on silicate are used where a very matt, highly permeable surface is wanted, and latex or scrub-resistant products are used in kitchens, bathrooms and circulation areas.

The classification that matters when comparing products is the European paint standard, which defines scrub resistance, opacity and other performance classes. A paint's class tells a buyer more than its marketing.

Low-emission products are a genuine consideration in German practice rather than a niche, and the environment agency publishes guidance on indoor air and on products with reduced emissions [7](https://www.umweltbundesamt.de/).

## The code and standards frame

Interior finishing sits inside the German standards and contract framework rather than a single building regulation. The relevant DIN series cover plaster and coating work, and the VOB/C ATV define what is included in each trade's scope and what standard of finish is owed [5](https://www.din.de/de).

Product approvals and construction product regulation add a layer where a material is covered by a technical approval, which the German institute for building technology administers [8](https://www.dibt.de/).

For a householder the practical consequence is that a specification is normally written by reference to a standard and a quality class rather than to a description in prose. That is more precise and, once understood, simpler.

## What the later articles cover

Materials deals with plasters, fillers, primers and the paint families. Installation follows the work from the substrate to the second coat. Quality covers the surface classes, the inspection method and the defects that matter. Maintenance covers repainting, patching and the care of plaster surfaces.

The thread is that the German interior wall is a specified product with a specified surface, and that the paint is the last stage of that specification rather than a separate decorative decision.

## Why the German model exists

The class-based approach grew out of a trade structure in which plastering and painting are separate trades with separate contracts.

If a painter were responsible for correcting a plasterer's surface, every job would end in an argument about who owns a hollow or a trowel mark. The class removes that argument by defining, in advance, what the plasterer owes and what the painter can therefore assume.

The same logic explains why the German interior wall so rarely receives a skim coat as a decorative extra. Where the surface class requires it, it is paid for as plastering work; where it does not, nobody sells it as an upgrade.

## Plaster versus board, honestly

A plastered masonry wall and a drylined wall can both reach a high surface class, and they behave differently in use.

A plastered wall is monolithic, has no joints to telegraph and takes a knock as a local repair. It is also slower to build, wetter during construction, and dependent on the masonry behind it being stable.

A boarded wall is fast, dry and consistent, and it introduces joints, fixings and a cavity. In German residential work both are common, and the choice is usually made by the structural system rather than by the finish.

## What this means for a householder

For anyone commissioning work, the German convention offers two practical protections.

The first is a written definition of what good looks like, so that a handover is a comparison rather than an impression. The second is a clear split of responsibility between the plastering and painting stages, which prevents the common situation where a painter is asked to hide a surface that was never built to the standard being asked for.

## The one-line summary

If the German chain had to be reduced to a sentence, it would be this: build a surface to a stated class, seal its suction with a primer, and coat it twice with a product whose class suits the room.

Every product decision and every inspection in the following articles is an application of that sentence.

## Common misconceptions

Three ideas recur when German and English-speaking practice meet, and each is worth correcting.

The first is that a plastered wall is automatically better than a boarded one. It is better where it suits the structure and the surface class is specified; it is worse where speed and consistency matter more than mass.

The second is that quality classes are a bureaucratic formality. They are the opposite: a definition that protects both the client and the trades from an argument that cannot otherwise be settled.

The third is that primer is a manufacturer's invention to sell extra product. It is the stage that makes a uniform finish possible on a non-uniform substrate, and its absence is the most common explanation for a wall that looks patchy under light.

## What a householder should take from this

Two things are worth carrying away from this overview.

The first is that the wall you see is a built surface, and its quality was decided before any paint was opened. A wall that looks uneven in the evening light was an uneven wall in the afternoon, painted.

The second is that the German convention gives you a way to say what you want without describing it. Ask for a class, agree it in writing, and the rest of the conversation is about price and programme rather than about taste.

## Regional variation and older stock

German practice is unusually consistent because the standards are national, but the buildings are not.

A post-war block in a western city and a pre-war Altbau in an eastern one present different substrates, different plasters and different moisture behaviour. The Altbau often has lime plaster, high ceilings and walls that move; the post-war block has denser plasters and straighter planes.

A specification that treats both as the same building will produce different results in each, and the difference is entirely predictable.

## Why this series leads with standards

Most English-language finishing guidance leads with products and technique, and German guidance leads with a standard and a class.

The difference is not pedantry. A product changes every few years and a class does not, so a document written around a class stays useful for decades, while one written around a product dates within a season.

That is why the following articles name products only as examples and describe the method as a sequence of decisions that can be checked.

## A note on language

German technical terms are used in this series because they are the ones that appear on specifications, quotations and product data sheets.

Understanding Tiefgrund, Unterputz and Spachtelmasse is not decoration: it is how a householder reads a quote and knows what is being bought. The following articles define each term as it appears.

## The practical value of the whole series

Read end to end, the five articles answer the questions that arrive in a fixed order: what is being built, what it is made of, how it is done, how it is judged, and how it is kept.

A householder who has read them can hold a sensible conversation with a plasterer and a painter on the same afternoon, which is more than most specifications achieve.

## A final practical note

Nothing in this overview requires a specialist product or a rare skill. It requires a decision about the surface, a primer applied properly, and two coats applied without haste.

Those three things are available to anyone who asks for them by name, which is the reason this series names them.

## References

1. Caparol.
2. Sto.
3. Bundesverband Farbe Gestaltung Bautenschutz.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Umweltbundesamt.
8. Deutsches Institut für Bautechnik.
9. Brillux.

## Image credit

The cover photograph shows white lime plaster on a wall, taken by Patrick Oberdörfer and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the mineral plaster surface this article treats as the substrate for the coating chain. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Kalkputz_wei%C3%9F.jpg/1280px-Kalkputz_wei%C3%9F.jpg')

, ('de-interior-masonry-paint-materials', 'German Interior Materials: Plaster, Spachtelmasse, Tiefgrund and Paint', 'A German materials guide for interior finishing: gypsum and lime plasters, fine filler, penetrating primer, dispersion and silicate paints, and how the European paint classification helps choose between products.', $wallarticle2$# German Interior Materials: Plaster, Spachtelmasse, Tiefgrund and Paint

The materials for a German interior wall are few and each has a defined role. The variety is in the grades, and the grades exist because the surface quality classes demand them.

## Base plaster and finishing plaster

A base coat (Unterputz) levels the masonry and provides the body of the plaster. It is typically lime-cement or gypsum based, applied by machine on larger areas, and it is not expected to be the finished surface.

The finishing plaster, or a separate skim, is where the surface quality is created. Gypsum finishing plasters dominate interiors because they are smooth, workable and quick; lime finishing plasters are used where a more permeable or more traditional surface is wanted.

The mineral content matters for what follows. A dense gypsum plaster is less absorbent than a lime plaster, which changes how much primer and paint it takes and how the finish dries.

## Fine filler (Spachtelmasse)

Fine filler is the material that closes the last layer of texture and produces the flat plane the higher quality classes require.

Gypsum-based fillers are the norm, supplied as powder or ready-mixed, and applied with a broad trowel in one or two passes. Lightweight fillers are easier to sand; harder fillers are more resistant in circulation areas.

The grade of filler belongs to the quality class: a basic class does not need a full-surface fill, a high class does, and the difference in labour is substantial. That is why the class is agreed before the work, not after.

## Tiefgrund and the primers

Tiefgrund is a penetrating, solvent or water-based primer that soaks into the substrate rather than forming a film. It is the standard preparatory coat on plaster, filler and repaired areas.

Its purpose is to bind and to equalise absorption so the finish coat dries evenly. On very absorbent surfaces a stronger concentration is used; on dense surfaces a weaker one, and on surfaces that are already sealed the product may be unnecessary.

Where a mineral paint is to be applied, a mineral-compatible primer is specified instead, since a film-forming acrylic primer under a silicate paint works against the point of the silicate.

## Interior paints

Dispersion paint is the default: a water-based acrylic product, matt or silk-matt, with good opacity and reasonable scrub resistance.

Silicate paint bonds with mineral substrates and is highly permeable, which makes it a natural finish on lime and mineral plasters. It is less tolerant of a poor substrate and needs a mineral-compatible primer.

Latex and scrub-resistant paints are used where the wall will be washed: kitchens, corridors, stairwells, and rooms used by children. They are less permeable, which is acceptable on an interior wall that has no moisture load from behind.

## Reading the paint classification

The European standard for interior paints classifies products by wet scrub resistance, opacity, and gloss level, and the classification appears on the technical data sheet.

That gives a buyer a way to compare two products on performance rather than on price and packaging. A paint in a high scrub class is genuinely more durable than one in a low class, and the difference matters on a wall that will be cleaned.

Opacity classes matter equally on a colour change, because a paint with poor opacity needs a third coat whatever its price [1](https://www.caparol.de/).

## Emission and indoor air

German practice takes indoor air quality seriously, and low-emission products are widely available and clearly labelled.

The environment agency's guidance on indoor air and on construction products is the reference a householder can actually use, and the practical advice is straightforward: choose products with a recognised low-emission label for the rooms where people sleep and spend their evenings [7](https://www.umweltbundesamt.de/).

Ventilation during and after application is part of the method in any case, especially in a newly finished building.

## Tools

The tool list is short and specific: a broad stainless trowel for filler, a plasterer's float for finishing plaster, a long-pile roller for textured surfaces and a short-pile roller for filled ones, a cutting-in brush, and a radiator brush for the awkward places.

A pole sander and a hand sander with fine paper cover the preparation, and a moisture meter is worth having on any older building.

## Storage and shelf life

Powder products keep for months in dry conditions and are ruined by damp. Ready-mixed fillers and paints must not freeze, and a German winter in an unheated garage will destroy both.

The practical habit is to buy for the job, keep the leftover paint indoors with its label intact, and record the product and colour for future touch-ups.

## What the painters' trade guidance adds

The trade association's technical leaflets cover the cases the standards leave open: how to assess a substrate, when a primer is required, how to treat a repaired area so it does not flash, and what to do with a surface that is too absorbent or too dense.

Those leaflets are written for professionals and are unusually useful to anyone specifying work, because they describe the decision method rather than a product [3](https://www.farbe.de/).

## A materials list for a room

For a single room the list is: filler, primer, one wall paint in the chosen class, one ceiling paint, a trim paint, tape, sheeting, and the consumables. The decisions that matter are the quality class and the paint class, and both are made before anything is bought.

Buying on those two decisions and not on a colour chart is the habit that produces a wall which still looks right in five years.

## Densities, absorbency and the primer decision

Two plasters can look identical and behave completely differently under a roller.

A dense gypsum plaster absorbs slowly, and paint applied to it stays wet on the surface for longer, which risks a lap mark if the work is rushed. A lime-rich or open plaster absorbs quickly and can starve the first coat, producing a thin film and a patchy appearance.

The primer is chosen for the difference rather than for the product family. Where absorbency varies across a wall, which is normal after repairs, the primer is what makes the wall behave as one surface.

## Filler grades and sanding

Filler grades differ in hardness and in how much they shrink, and the difference shows at the edges of a patch.

A soft filler sands easily and can dish below the surrounding plane if the sander is too eager. A hard filler holds its plane and is harder to feather. Choosing between them is a decision about the wall's use: a corridor that takes impacts wants the harder grade, a bedroom ceiling does not care.

## The consumables that decide a finish

Tape, sheeting, sanding paper in two grits, a good cutting-in brush, a roller sleeve matched to the surface, and a bucket of clean water for the wash before painting.

The two items most often missing from a householder's kit are the second grit of paper and a roller sleeve suited to a filled wall. Both are cheap, and both are the difference between a surface that reads as smooth and one that reads as worked.

## Buying against the class, not the brand

Two products from different manufacturers in the same performance class are more similar than two products from the same manufacturer in different classes.

That is the practical use of the classification: it lets a buyer choose on measured performance and price rather than on advertising. The remaining differences are in working properties, such as openness and drying, which matter to a professional and rarely to a householder.

## What a specification looks like

A German interior specification is short: substrate, plaster system, class, filler, primer, paint product with its performance class, colour, and the number of coats.

That list is complete enough to price and precise enough to inspect. Where a householder is commissioning work without professional help, writing those lines down before asking for quotes is the single most useful preparation, because it makes the quotes comparable.

## Where the money goes

Across a German interior job the material cost is modest and the labour cost dominates, and it dominates most heavily at the filler and sanding stage.

That is the useful thing to know when a budget is being set: the difference between a basic and a high surface class is almost entirely labour, and it is the labour that the eye actually sees. Spending on a premium paint over a basic surface buys very little; spending on the surface and using an ordinary paint buys a wall that reads as high quality.

## What a painter expects on arrival

A painter arriving on a German site expects a plastered surface to a stated class, dry, dusty but sound, with the boxes set and the floors protected.

When those conditions are met, the work is quick and the result predictable. When they are not, the painter either spends time correcting another trade's work or produces a finish that will be judged as their own failure.

## Materials for an Altbau

Older German housing stock changes the material list, and the changes are not decorative.

Lime-based fillers and primers are more appropriate on a lime plaster than gypsum products, because a gypsum filler beside a soft lime plaster produces a hard island that cracks at its edge. A mineral paint keeps the wall's ability to dry inward.

Where the plaster is historic and the owner wants to keep it, the materials are chosen for compatibility rather than for convenience, and the finish is expected to look like a mineral surface rather than a plastic one.

## What to ask the merchant

A merchant in Germany will answer technical questions well if they are asked precisely.

Useful questions: which filler for this plaster, which primer for this substrate and this paint, and which product class for this room. The answers are specific, and they are more reliable than a colour card's advice.

## Consolidation and the limits of primer

A primer consolidates a lightly dusting surface and it does not rebuild a failing one.

Where the plaster is friable to depth, or where it sounds hollow, the answer is removal and repair rather than a stronger primer. Recognising that boundary is what separates a specification that works from one that postpones a failure by a year.

The test is simple: scratch the surface with a fingernail in an inconspicuous place. Material that comes away in flakes means repair, material that powders lightly means primer.

## Where to buy

Specialist merchants rather than general hardware shops are the normal source in Germany for plasters, fillers and trade paints, and the difference shows in advice as much as in stock.

A merchant who supplies plasterers knows which filler suits which plaster, and that knowledge is worth the small price difference on a room-sized job.

## References

1. Caparol.
2. Sto.
3. Bundesverband Farbe Gestaltung Bautenschutz.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Umweltbundesamt.
8. Deutsches Institut für Bautechnik.
9. Brillux.

## Image credit

The cover photograph shows a gypsum plaster finish over gypsum wallboard, taken by Achim Hering and made available under CC BY 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the dense mineral surface that German interior coatings are designed to sit on. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Gipsputz_stucco.jpg/1280px-Gipsputz_stucco.jpg')
, ('de-interior-masonry-paint-installation', 'From Plaster to Second Coat: The German Interior Sequence', 'A German installation sequence for interior finishing: substrate assessment, plaster and filler work, drying, Tiefgrund, priming, cutting in and two finish coats under the stated surface quality class.', $wallarticle3$# From Plaster to Second Coat: The German Interior Sequence

The German interior sequence is orderly in a way that repays following, because each stage exists to make the next one possible and the standard for each is written down.

This article follows the work from the substrate to the second coat, for a plastered masonry wall in a residential building.

## Step one: assess the substrate

Before any material arrives, the substrate is assessed for three things: strength, absorbency and moisture.

A plaster that is friable, hollow-sounding or salt-stained is not a substrate for paint, and a wall that is damp is not either. The assessment is done by hand, with a moisture meter, and by looking at the surface under a light, and its output is a decision about preparation rather than a decision about paint.

German trade guidance treats this assessment as a distinct stage with its own outcome, which is why a specification often begins with a survey rather than a product [3](https://www.farbe.de/).

## Step two: repair and fill

Defects are repaired before the surface is prepared for coating: cracks filled, hollow plaster removed and patched, and the patch brought level with the surrounding plane.

Where the quality class requires a full-surface fill, the filler is applied across the whole wall rather than only at the defects, and then sanded flat. The difference between a filled wall and a spot-repaired one is visible in raking light for the life of the finish, which is why the class decides the method.

## Step three: dry

Plaster and filler both bring water, and paint applied over water fails. The wall is allowed to dry, and in a German winter that means a heated building with ventilation rather than a cold one with windows shut.

A gypsum filler dries quickly in a warm room and slowly in a cold one, and a plaster base coat can hold moisture for weeks. The moisture meter decides, not the calendar.

## Step four: Tiefgrund

The penetrating primer is applied to the whole surface, generously enough to be absorbed rather than to sit on top, and allowed to dry.

Application is by brush or roller, working it into the surface rather than laying it on, and the tell-tale of a correct application is a uniformly darker but not glossy surface. A primer that sits on the surface has been applied to a substrate that did not need it or has been over-applied.

## Step five: prime and cut in

Where the paint system calls for a separate priming coat, it goes on next, followed by cutting in.

Cutting in is done with a brush along the ceiling line, the corners and the edges of trim, in a band wide enough to be rolled into while it is still wet. In German practice the ceiling is painted first when a room is being done as a whole, so that spatter is covered by the wall coats.

## Step six: two coats

Two finish coats are the norm, with the second applied after the first has dried to the manufacturer's recoat time.

The first coat is applied to establish coverage and the second to achieve an even film, and on a strong colour change a third may be needed. The work is done in a single direction per elevation so that the finish is uniform, and the wet edge is maintained so that no lap marks appear.

Roller choice follows the surface: a short pile on a filled wall, a medium pile on a textured one.

## Step seven: the inspection under light

The wall is inspected once dry, with light raking across the surface, and compared against the quality class that was agreed.

This is the German convention working as intended: the question is not whether the painter likes the wall but whether it meets the stated class. Trowel marks, hollows and visible texture are permissible or not according to that document.

Where a defect is found it is corrected with the same material and method, because a patch with a different sheen is visible even when the colour matches.

## Interfaces with other trades

The finishing stage meets the electrical, plumbing and joinery work at every socket, switch, radiator and door frame.

The German convention is that boxes and frames are set to the finished surface, and that the painter's work ends cleanly at them. Where a frame was fitted after plastering, the junction is sealed; where it was fitted before, it is masked and cut in.

The details that decide how a room looks two years later are all at these interfaces rather than in the middle of a wall.

## Weather, season and the building

Interior work in Germany is less seasonal than exterior work, but not unaffected. A new building in winter needs temporary heat, and a plaster that has just been applied needs that heat to be steady rather than intermittent.

Ventilation is part of the method: a building that is sealed while plaster dries becomes humid, and a humid building slows every subsequent stage and encourages mould on cold surfaces. Short, frequent airing is the practice, and it is more effective than a window left open all day.

## Handover

Handover is a walkthrough with the light on, the quality class in hand, and the products recorded.

The record should name the plaster and filler used, the primer, the paint with its performance class and colour, and the date. That record is what a later touch-up or repaint relies on, and it takes five minutes to write.

## Machine plaster and the finish

Large German projects are plastered by machine, which changes the labour but not the sequence.

The material arrives as a dry mix, is mixed and pumped to the wall, and is levelled by rule and float before being smoothed. The surface left by machine application can be very consistent, and the finishing passes are what determine the class.

The practical consequence for a householder is that machine plaster is fast and that the scheduling of the following stages depends on how the building dries rather than on how quickly the plasterer can work.

## Working around the heating season

Interior plastering in an unheated new building is a winter problem in Germany as anywhere.

Temporary heating is normal, and the heat has to be steady rather than switched on for the plaster and off for the night. A plaster that dries unevenly develops shrinkage cracks and a surface that no filler will fully hide.

The sequencing habit that avoids it is to complete the wet trades early and to allow a drying period with heat and ventilation before any coating work begins.

## Cleanliness as a stage

German site practice treats cleanliness between stages as part of the method, and the reason is practical: dust from plaster and filler is fine enough to travel through a building and to settle on surfaces that will later be painted.

Vacuum-assisted sanding, sealed doorways and a final wipedown before primer are the controls, and they are the same controls that make interior work in any country look effortless when done properly.

## Interfaces with joinery and radiators

Radiators, window boards and door frames sit on the plastered wall, and the finish has to meet them cleanly.

The order that works is plaster, filler, primer, then the fitting of the items that will be painted around or masked. Where a radiator is removed for painting, the wall behind it is finished as carefully as the rest, because someone will one day move it.

## Ordering the trades

The sequence of trades is fixed: plasterer, then electrician for the second fix where boxes are set to the finished surface, then painter, then joinery where frames are fitted afterwards.

Compressing that order produces the defects everyone recognises: boxes that stand proud of the plaster, frames that have to be caulked rather than margined, and paint over patches that were never filled. The order is not bureaucracy; it is the reason the details look right.

## The last inspection before the room is used

Before furniture returns, the room is inspected in the light it will live in, with the floor clean and the protection removed.

This is the moment when a missed patch, a paint line that wandered or a socket halo is easiest to see and cheapest to correct. Ten minutes at this stage prevents the slow accumulation of small annoyances that make a newly decorated room feel unfinished.

## What to write down at handover

The record is one page: plaster and filler, class, primer, paint product with its class and colour, dates, and any area that needed particular attention.

A householder who keeps that page can touch up a wall in five years without guessing, and a painter who receives it can quote a repaint with confidence rather than with a survey.

## Working in an occupied Altbau

Tall rooms and old buildings bring practical issues that a new flat does not: higher walls, more surface, uneven planes that take more filler, and radiators that are difficult to remove.

The method adapts rather than the standard. Reach is solved with a tower rather than a ladder, the filler is worked to the class with more passes because the planes are less true, and the radiator is painted around with a brush designed for the purpose rather than removed.

The result takes longer and looks no different from work in a new building, which is the point.

## Sample boards for difficult rooms

Where a room has critical lighting, a sample board painted with the chosen system and propped against the wall gives a preview of both colour and surface.

It costs a square of board and a small quantity of paint, and it answers the question that photographs cannot: how the finish will look in that room's light.

## Drying times that actually apply

Manufacturer drying times assume a room at around twenty degrees with normal humidity, which is not what a German building site often offers in January.

The practical adjustment is to measure the room conditions rather than to trust the tin, and to extend the interval when the room is cooler or damper. A coat that is dry to the touch is not necessarily dry enough to receive the next one.

Keeping a note of the room temperature at each stage is a small habit that explains a great deal later.

## Protecting finished surfaces during the rest of the build

Where finishing happens before other trades are complete, protection becomes part of the finishing scope.

Boards on the floor, corner guards and a rule about who walks where cost little and prevent the most common cause of a repaint before the building is even occupied.

## The final coat, and the temptation to add one

A wall that looks slightly uneven after two coats tempts a third, and a third coat rarely helps.

Unevenness in the plane is a substrate issue, and additional paint makes it more visible by increasing sheen uniformity across the surface. The remedy for a plane problem is filler and sanding, and it is worth saying so before a painter is asked for one more coat.

## References

1. Caparol.
2. Sto.
3. Bundesverband Farbe Gestaltung Bautenschutz.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Umweltbundesamt.
8. Deutsches Institut für Bautechnik.
9. Brillux.

## Image credit

The cover photograph shows a plasterer at work on a wall, taken by Adrian Pingstone and placed in the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the stage at which the surface quality of a German interior wall is actually created. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Plasterer_at_work_on_a_wall_arp.jpg/1280px-Plasterer_at_work_on_a_wall_arp.jpg')

, ('de-interior-masonry-paint-quality', 'Surface Quality Classes and the German Interior Standard', 'A German quality framework for interior finishing: what the surface quality classes require, how to inspect a wall against them, the defects that matter, and the emission and substrate checks that decide whether a coating belongs on the wall.', $wallarticle4$# Surface Quality Classes and the German Interior Standard

The German interior standard is unusual in being measurable. A wall is assessed against a quality class, under defined lighting, from a defined distance, and the assessment is a comparison rather than an opinion.

That is the most useful idea in this topic for anyone commissioning work, because it converts a dispute into a check.

## What a quality class actually defines

The classes describe the appearance of the finished surface. A basic class accepts visible trowel texture and is suitable for a flat paint in a position where the wall is not scrutinised. Higher classes require a fuller fill, a flatter plane and a surface free of visible texture, and the highest are intended for gloss finishes, strong colours and critical lighting.

The classes do not describe how flat the wall is in millimetres, which surprises people. They describe what can be seen, because that is what the client will judge, and the reference standards set the conditions of viewing.

Where the class is agreed in writing before work starts, the inspection at the end is straightforward. Where it is not, the inspection becomes a negotiation [4](https://www.beuth.de/de) [6](https://www.vob-online.de/).

## The inspection method

The method is to view the surface under the lighting the room will have, and under a light held at a shallow angle to reveal texture.

Daylight from a window is the harshest test; a ceiling fixture is the most forgiving. A wall-washer or an uplight is somewhere between and is common in German interiors, which is why critical lighting is named in the class descriptions.

The inspection is done at a stated distance, because a wall that is acceptable at two metres is not acceptable at thirty centimetres. Both distances are legitimate and they answer different questions; the class decides which applies.

## The defects worth naming

Six defects recur in German interior work. Visible trowel texture where the class requires a filled surface. Hollows and ridges in the plane. Filler patches that flash because they were not primed. Suction marks where the primer was thin. Lap marks from a wet edge that was lost. And paint applied too thin over a strong colour, showing the substrate through.

Each is a stage failure rather than a product failure, and each is diagnosable by looking at the pattern rather than at a single point.

## Substrate checks before coating

The German trade framework is emphatic that a coating cannot be assessed in isolation from its substrate, and the checks before coating are part of the quality record.

Strength: the surface must be sound and not dusting. Absorbency: it must be uniform, which is what the Tiefgrund is for. Moisture: it must be within the range the coating allows. Alkalinity: a fresh mineral plaster may need time or a specific primer before an emulsion paint.

A wall that passes those four checks and receives a correctly specified system will perform. A wall that fails any of them will produce a defect that looks like a paint fault and is not.

## Emission and indoor air

Because German practice treats indoor air as a quality subject, a low-emission specification is a legitimate requirement rather than a preference.

The environment agency's guidance names the product groups and the labels worth looking for, and the practical specification is to require low-emission products in bedrooms and living rooms and to ventilate properly during the work [7](https://www.umweltbundesamt.de/).

The quality record can then include the products used, which is a small document with a long usefulness.

## Interfaces and complete work

A quality assessment includes the edges. Painting that stops short of a reveal, a cut-in line that wanders, sealant applied over a gap that should have been filled, and a socket left with a halo of bare plaster are all defects at the interface rather than in the field.

German practice tends to treat the interface as part of the painter's scope, which is why the standard for complete work is high at the details. Checking those details is where an inspector spends most of their time.

## Documentation and the evidence trail

The documentation for a German interior job is short and specific: the agreed quality class, the products, the dates, the substrate checks, and photographs of the wall under raking light before and after.

That file answers the two questions that arrive later, which are whether the wall met what was agreed and what exactly is on it. Both matter at the first touch-up and at any later repaint.

## Warranty conversations

Where work is done under a German contract, the standards and the ATV define what is owed, and a defect is a departure from that definition.

That is a stronger position than a general assurance of quality, and it is why the class is worth agreeing explicitly even on small jobs. A painter who resists naming a class is a painter who intends to be judged on impression.

## The judgement

A German interior wall is judged by its surface, and its surface is the product of four decisions taken in order: the class, the plaster and filler, the primer, and the paint.

The paint is the least expensive of those decisions and the most visible, which is why it attracts the most attention and changes the outcome least. A householder who spends the same money on a better class and an ordinary paint will have a better wall than one who does the opposite.

## Sample surfaces and the agreement

Where the class is high or the lighting is difficult, a sample surface is the practical way to agree what the document means.

A square metre, filled, primed and painted, viewed in the room's own light, resolves the interpretation question before it becomes a dispute about the whole room. It also demonstrates whether the substrate can reach the class at all, which is information nobody has until it is tried.

The sample is cheap and it is the single most useful quality instrument in interior finishing.

## Judging a repair against the class

Repairs made years after the original work are judged differently, and reasonably so.

A patch in a wall that was originally finished to a mid class cannot be expected to raise the whole wall, and the standard is that the repair matches its surroundings rather than that it improves them. Where the surrounding wall has aged, a perfect patch can look worse than a careful one.

Stating that expectation at the time of the repair prevents the argument that follows a patch that is technically better than the wall around it.

## The role of the primer in the audit

For an inspector, the presence or absence of a primer is often the explanation for a defect that otherwise makes no sense.

Suction marks, patchy sheen and poor adhesion in defined areas all point to an absent or thin primer coat, and the pattern of the defect maps almost exactly onto the pattern of the substrate. Reading that pattern is the fastest diagnostic available, and it costs nothing but attention.

## When a wall is not the problem

A wall that looks uneven may be telling you about the light rather than the plaster.

A single window at the end of a room throws light along the surface and finds every deviation, and a wall that looks perfect under a ceiling fixture can look poor in that light. Adjusting the lighting is sometimes the cheaper answer, and it is always worth knowing before a room is refinished.

## Accepting a wall at handover

At handover, walk the room with the class in hand and the room's own light on.

Look along each wall at a shallow angle, check the corners and the reveals, look at the ceiling from the doorway, and check that every socket and switch sits flush. Then compare what you see with what the class permits.

Anything beyond the class is a defect to be corrected. Anything inside it is the wall you bought, and knowing the difference is what the class is for.

## Reading a defect backwards

Most interior defects can be traced backwards through the stages, and the trace is quick once the pattern is recognised.

A patch that flashes means the primer stopped at the patch. A uniform dullness on one wall means the primer was thin or the paint was starved. A ridge that follows a line means a filler edge that was not sanded. A halo at a socket means the box was set after the surface was finished.

Each answer names a stage, and naming the stage is what makes the conversation about correction rather than about blame.

## The difference between a defect and character

In an older building the line between a defect and the character of the fabric is a judgement, and it is worth making explicitly.

A bow in a wall that has been there for eighty years is not a defect to be filled flat at the cost of the plaster's integrity. A crack that has opened since last winter is. Agreeing which is which before work starts prevents both the over-correction of historic fabric and the acceptance of new movement.

## The value of a written class in a dispute

If work is disputed, the written class is the document that resolves it.

Without one, the discussion is about preference, and preference has no answer. With one, the discussion is about whether the wall meets a definition, which is answerable by looking.

## Lighting design and the finish

Where a client is choosing lighting at the same time as the finish, the two decisions interact and are usually made separately.

A wall-washer or a downlight close to a wall reveals texture that a ceiling fixture hides, so the finish class should match the lighting scheme rather than the other way round. On a project where both are being decided, naming the lighting in the specification is the cheapest way to keep them consistent.

## Keeping photographs

Two photographs per wall, one under raking light before coating and one after, cost nothing and settle most later questions.

They show what was accepted and what was delivered, and in a dispute they are worth more than a recollection of what the light was like on the day.

## What an inspector photographs

An inspection record is four photographs per wall: raking light before coating, raking light after, the wall in daylight, and each interface with a socket or frame.

Those four cover both the surface and the edges, which are the two things a later dispute is about. The file takes five minutes and outlasts every recollection of how the room looked.

## One more check worth doing

Press the wall with the flat of your hand in a few places before accepting it.

A hollow sound behind a smooth face means a patch that did not bond, and it will show within a season as a blister or a hairline crack. It takes ten seconds and catches the defect that photographs miss.

## References

1. Caparol.
2. Sto.
3. Bundesverband Farbe Gestaltung Bautenschutz.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Umweltbundesamt.
8. Deutsches Institut für Bautechnik.
9. Brillux.

## Image credit

The cover photograph shows plaster being applied to a wall, taken by Haktwo2004 and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the work that determines which surface quality class a wall can reach. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Plastering.jpg/1280px-Plastering.jpg')
, ('de-interior-masonry-paint-maintenance', 'Repainting and Repairing German Interior Walls', 'A German maintenance guide for plastered and painted interiors: the repaint cycle, filling and touching in, why patches flash, moisture and salt in old plaster, and the choices that keep a surface class intact.', $wallarticle5$# Repainting and Repairing German Interior Walls

A plastered interior wall in Germany lasts for decades and its appearance is refreshed every ten to fifteen years, or sooner in a rental flat where the decor is renewed at each change of tenancy.

The maintenance question is therefore not whether the wall will be repainted but how, and the German answer follows the same logic as the original work: assess, prepare, prime, coat.

## The repaint cycle

The trigger for repainting is condition rather than a calendar. Walls in circulation areas lose their sheen and gather marks; walls behind furniture develop a film of dust that becomes visible when the furniture moves; ceilings yellow with age and cooking.

Where a flat is redecorated between tenancies, the practical question is coverage. A light colour over a light colour needs two coats; a strong colour over a strong colour may need three, and a primer tinted towards the new colour saves a coat.

The most common error is painting over a wall that has not been washed, which locks in dust and produces a film that fails at the first wipe.

## Preparing a previously painted wall

Preparation is a wash, an inspection and a repair.

The wash removes grease, dust and marks; in a kitchen it needs a degreaser, and in a smoking household it needs more than one pass. The inspection looks for cracks, hollow plaster, blisters and any area where the coating has lost adhesion. The repair addresses what the inspection found.

Where the existing coating is soundly adhered, no primer is needed across the whole wall. Where it is chalky or has been repaired, a primer over the affected area and a feathered edge is the correct treatment.

## Filling and the flashing problem

A patch that has been filled and painted without primer shows as a dull or glossy island, because the filler absorbs the paint differently from the surrounding film.

The remedy is to spot prime the patch and to feather the new paint well beyond its edge. In German practice the filler is also matched to the surrounding hardness, since a hard filler in a soft plaster sanding back produces a ridge.

Where a wall is to be recoated to a higher quality class than it currently meets, the correct answer is a full-surface fill rather than a series of patches.

## Cracks

Fine cracks are raked slightly, filled with a flexible filler and sanded flush. Cracks at joints and at the corners of openings are treated with a reinforcement strip bedded into the filler.

Cracks that recur in the same place every year are telling you about movement, and the German response is the same as anywhere else: diagnose before filling. A crack that follows a wall's construction, such as the junction between different materials, needs an elastic treatment rather than a hard one.

On old buildings with lime plaster, cracking is often normal and cyclical, and a flexible repair that moves with the wall outlasts a rigid one.

## Moisture, salt and old plaster

Two problems are specific to older German housing stock: damp and salt.

Damp at the base of a wall points to a failed horizontal barrier, a raised external ground level or a leaking pipe, and painting over it produces blistering within a season. Salt contamination shows as a white bloom and repeated paint failure in the same area, and it needs a sacrificial render or a poultice treatment rather than a coating.

Both are building problems rather than decorating problems, and in a rented flat they belong to the landlord rather than the tenant. Recognising them is the useful skill.

## Mould on cold surfaces

Mould in a German flat almost always appears in a corner, behind furniture, or on the underside of a ceiling in a bathroom, and its cause is a cold surface with humid air against it.

The remedy is a combination: heat the room adequately, ventilate briefly and fully rather than leaving a window tilted all day, keep furniture off the wall, and clean the affected area with an appropriate product.

Painting over mould without addressing the cause is the most common wasted weekend in interior maintenance [7](https://www.umweltbundesamt.de/).

## Touch-ups and colour matching

A leftover tin of the correct product is worth more than any matching service. Failing that, a colour matched from a hidden area, such as behind a radiator or inside a cupboard, is more accurate than one matched from a faded wall.

Touch-ups are feathered rather than dabbed, and on a wall in a critical light the honest answer is often to repaint the whole elevation rather than to patch it.

## When to raise the quality class

A wall that is being repainted can be improved, and the two upgrades that matter are a full-surface fill and a better primer.

A full fill removes texture and produces a surface that will accept a matt paint in a critical light without showing every trowel mark. A better primer solves suction and flashing. Both are labour rather than material, which is why they are worth deciding at the same time as the colour.

Improving the class during a repaint is the cheapest moment a wall will ever be improved, since the room is already empty and protected.

## Working in a rented flat

German tenancy practice gives the tenant a defined scope for decoration, and the boundary is worth knowing before buying paint.

The practical points are that structural and moisture defects belong to the owner, that the standard expected is normally a neutral finish, and that a documented report of a damp or salt problem is a better use of a tenant's time than a coat of paint over it.

Where a wall is repainted, keeping a note of the product and the colour is a courtesy to whoever comes next and a protection for the deposit.

## The long view

A plastered and painted wall in Germany is maintained, not replaced, and its life is measured in decades of repainting.

The maintenance habit that keeps it good is small: wash before painting, prime what you patch, treat moisture as a building matter, and record what you used. None of it is skilled, and all of it is what separates a wall that still looks right after twenty years from one that has been painted over its problems.

## A room-by-room routine

Kitchen: wash with a degreaser, repaint every five to seven years, use a scrub-resistant product near the hob.

Bathroom: check the extract and the sealant before painting, use a moisture-tolerant product, and expect the ceiling to need attention before the walls.

Hallway and stairs: the highest wear in the flat, so scrub-resistant paint and a washable finish, with touch-ups twice a year rather than a repaint.

Bedroom and living room: the surfaces that are judged most and used hardest to clean, so a matt low-emission product and a wash before repainting.

Cellar and utility: moisture first, paint second, and no expectation that a coating solves a damp wall.

## Repainting without emptying the room

Most German flats are repainted while occupied, which changes the method more than the products.

Furniture is grouped in the centre and covered, one wall is completed at a time so the room stays usable, and the cutting in is done wall by wall so that the rolled coat meets a wet edge. Drying times are planned around the household's routine rather than around the painter's convenience.

The result is slower and far less disruptive, and on a single room it is usually the difference between a job that happens and one that is postponed for years.

## The flat between tenancies

The German rental market renews decor more often than an owner-occupier would, and the practical consequence is that small repairs accumulate between tenancies rather than during them.

The efficient approach is to treat the changeover as a small project: wash, fill the marks, prime the patches, and coat the walls in one product and one colour. Doing it that way costs several days and leaves a flat that will not need attention for years.

Doing it in a rush, with paint over unfilled marks, costs a weekend and leaves a flat that looks its age in photographs.

## Keeping a record as a tenant

A note of the product and the colour used at each changeover is worth more to a tenant than it looks.

It answers the question the landlord asks at the end of a tenancy, it makes the next repaint faster, and it demonstrates that the flat was maintained rather than merely occupied.

## Working with a painter in an older flat

Ask three questions before work starts: what will be done about the cracks, what product suits the plaster, and how will the patches be made invisible.

The answers tell you whether the painter has understood the building. A painter who proposes a gypsum filler and an acrylic paint on a lime plaster has answered for a modern wall, and the result will be a surface that fails at the patch edges within two winters.

## Salt in old walls, practically

Salt damage in an older flat usually shows in one area at the base of a wall, returns after every repaint, and is worse in humid weather.

The practical order is to stop the water first, then to allow the wall to dry, then to consider a sacrificial treatment rather than a coating. A paint film over salt is a paint film that will fail on a predictable schedule.

## Tools a householder can borrow rather than buy

A moisture meter and a long trowel are the two tools a householder rarely owns and often needs once.

Both can be borrowed or hired, and both answer questions that no amount of looking resolves: whether the wall is dry, and whether the plane is flat. Hiring them for a weekend is cheaper than buying them for a lifetime.

## When not to repaint

If a wall is damp, salty or mouldy, repainting is the wrong first move.

The order that works is to find the cause, correct it, dry the wall and then finish. Painting first hides the evidence that the diagnosis needs, which is why the failures people describe as paint failures so often start as building failures.

## A last word on expectations

A properly maintained German interior wall can go twenty years between full repaints with a wash and a touch-up in between.

That is a modest claim and a realistic one. It assumes the moisture problems were dealt with early, the patches were primed, and the products matched their rooms. None of those assumptions is difficult; all of them are optional, and skipping any of them shortens the interval.

## References

1. Caparol.
2. Sto.
3. Bundesverband Farbe Gestaltung Bautenschutz.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Umweltbundesamt.
8. Deutsches Institut für Bautechnik.
9. Brillux.

## Image credit

The cover photograph shows a wall being painted, taken by Jonathan Billinger and made available under CC BY-SA 2.0 via Wikimedia Commons through the geograph project. It is a real photograph, not AI generated, and it shows the repainting stage this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Painting_a_wall_-_geograph.org.uk_-_6894343.jpg/1280px-Painting_a_wall_-_geograph.org.uk_-_6894343.jpg')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='DE' AND t.candidate_key='assembly:de-interior-masonry-paint'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='DE' AND t.market_code='DE'
  AND t.candidate_key='assembly:de-interior-masonry-paint'
  AND a.wall_topic_id=t.id AND a.wall_market_code='DE' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
