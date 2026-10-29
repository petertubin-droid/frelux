-- Fourth GB researched-candidate topic: through-colour silicone render systems (K Rend).
-- Registered as verification_status='candidate' (schema gate: only an authenticated admin
-- promotes to 'verified' via the admin console). Articles remain drafts.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='GB' AND candidate_key='assembly:gb-silicone-render') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('GB','assembly:gb-silicone-render','Through-colour silicone render systems (K Rend)','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-silicone-render'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope
FROM public.learn_wall_finishing_topics t,
(VALUES
  ('K Rend Application Instructions','https://krend.s3.amazonaws.com/downloads/K-Rend-Application-Instructions.pdf','K Rend','Spray machine application of Silicone K1 and system build-up.'),
  ('Silicone Coloured Renders (K Rend brochure)','https://planning.welhat.gov.uk/Document/Download?module=PLA&recordNumber=102397&planId=1885792&imageId=20&isPlan=False&fileName=K_Rend_brochure_Antique%20White%20%283%29.pdf','K Rend','Through-coloured silicone render coverage and manufacturer positioning.'),
  ('K Rend launches K1 Spray+','https://www.k-rend.co.uk/news/k-rend-launches-innovative-new-render-product-k1-spray-plus-to-market','K Rend','One-coat two-pass through-coloured render system.'),
  ('Application Instructions (literature library)','https://www.k-rend.co.uk/literature-library/application-instructions','K Rend','Current application instructions for silicone and scraped texture ranges.'),
  ('BS EN 13914-1:2016, External rendering','https://cis.ihs.com/CIS/document/317311','BSI','Design, preparation and application of external rendering.'),
  ('EN 13914-1 summary','https://www.buildwise.be/en/publications/standards-regulations/en-13914-1-en/','Buildwise','Scope of EN 13914-1 external rendering requirements.'),
  ('Good craftsmanship guide: brickwork and blockwork','https://www.nhbc.co.uk/site/assets/files/1889/brickwork_and_blockwork.pdf','NHBC','Substrate workmanship for rendered masonry.'),
  ('Building standards technical handbook 2017: domestic','https://www.gov.scot/publications/building-standards-technical-handbook-2017-domestic/','Scottish Government','Scottish technical standards context for external finishes.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-silicone-render'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope
FROM public.learn_wall_finishing_topics t,
(VALUES
  ('File: New build houses (geograph 6475720)','https://upload.wikimedia.org/wikipedia/commons/d/d8/New_build_houses_-_geograph.org.uk_-_6475720.jpg','Wikimedia Commons','Cover photograph, overview article; CC BY-SA 2.0, DS Pugh.'),
  ('File: Stucco paint texture (2011-02-11)','https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/2011-02-11_Stucco_paint_texture.jpg/1280px-2011-02-11_Stucco_paint_texture.jpg','Wikimedia Commons','Cover photograph, materials article; CC BY-SA 4.0, Ildar Sagdejev.'),
  ('File: Flat-roofed commercial building with rendered facade, Gillingham','https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Flat-roofed_commercial_building_with_rendered_facade%2C_Gillingham%2C_Kent%2C_England.jpg/1280px-Flat-roofed_commercial_building_with_rendered_facade%2C_Gillingham%2C_Kent%2C_England.jpg','Wikimedia Commons','Cover photograph, installation article; CC BY-SA 4.0, OathOn.'),
  ('File: External Wall Insulation Fire Damage Roslyn Road N15 (geograph 7765358)','https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/External_Wall_Insulation_Fire_Damage_Roslyn_Road_N15_-_geograph.org.uk_-_7765358.jpg/1280px-External_Wall_Insulation_Fire_Damage_Roslyn_Road_N15_-_geograph.org.uk_-_7765358.jpg','Wikimedia Commons','Cover photograph, quality article; CC BY-SA 2.0, John Kingdon.'),
  ('File: Verschmutzte WDVS-Fassade','https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Verschmutzte_WDVS-Fassade%2C.jpg/1280px-Verschmutzte_WDVS-Fassade%2C.jpg','Wikimedia Commons','Cover photograph, maintenance article; CC BY-SA 4.0, KaiKemmann.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-silicone-render'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'GB','GB',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('gb-silicone-render-overview', 'UK Through-Colour Silicone Render: Chain Overview', 'A British overview of through-colour silicone render: cement-based material coloured all the way through, sprayed and scraped to a fine texture, and the system that now dresses most new-build facades.', $wallarticle1$# UK Through-Colour Silicone Render: Chain Overview

A through-colour render is coloured all the way through the material rather than painted on afterwards, and the silicone family adds water repellency at the same time: K Rend describes its Silicone K1 range as a premium through-coloured render in which silicone technology works as a water repellent [2](https://planning.welhat.gov.uk/Document/Download?module=PLA&recordNumber=102397&planId=1885792&imageId=20&isPlan=False&fileName=K_Rend_brochure_Antique%20White%20%283%29.pdf). That combination, colour plus weather resistance in one coat, is why the system now dresses a large share of British new-build facades.

The chain in one sentence: a prepared and primed substrate receives the base coats, the through-coloured render is machine sprayed in passes and scraped to texture, and the facade cures into a finish that needs cleaning rather than painting [1](https://krend.s3.amazonaws.com/downloads/K-Rend-Application-Instructions.pdf).

## Why the system displaced painted render

The old British facade was cement render plus masonry paint, and the paint was the maintenance story: repaint every five to seven years, and every repaint a scaffold. Through-colour render removes the paint from the equation by putting the colour into the material itself, and the silicone addition makes the surface shed water rather than absorb it. The economics follow: a higher first cost buys a facade whose maintenance cycle is a wash rather than a repaint.

The finish is also honest about its era. Where painted render ages by flaking and chalking, a through-colour surface ages by soiling and slight colour drift, and the two failure modes call for different maintenance trades, which the maintenance article of this chain treats in order.

## What the chain contains

Five articles cover the system: an overview (this one), the materials (the render itself, primers, beads and mesh), the installation sequence from substrate to texture, the quality program that keeps a sprayed facade consistent, and the maintenance regime that keeps colour and drainage working. The standard under the whole chain is EN 13914-1, the European standard for the design, preparation and application of external rendering, which the industry treats as the technical backbone of any render specification [5](https://cis.ihs.com/CIS/document/317311).

## The system's honest boundaries

The system is not a cure for a bad substrate. A facade that is out of plumb, damp, or badly detailed will telegraph every fault through a thin textured coat, and EN 13914-1's emphasis on design and preparation exists precisely because the render cannot fix what the wall got wrong [6](https://www.buildwise.be/en/publications/standards-regulations/en-13914-1-en/). Nor is it a heritage material: on a listed or traditionally rendered wall, lime remains the appropriate family, and the heritage article of this market covers that discipline.

Where the system is right, it is very right: a new-build facade that needs one material, one trade, one colour and one wash-based maintenance cycle for its first decades.

## What the system looks like from the pavement

From the pavement, a through-colour silicone facade reads as a single material: no paint film, no brush marks, no visible repair history of a different colour. The texture is fine and even, the colour slightly deeper than paint because it comes from the body of the material, and the junctions at windows and corners are crisp because the beads were built onto the wall before the texture arrived.

That look is the system's commercial argument and also its diagnostic surface. A facade that reads as one material is usually a facade whose substrate was one plane, and a facade that reads as patches is usually a facade where the base coats were rushed and the texture was asked to hide what the plane refused to. The reading is the whole quality program in miniature, and it happens in the first five seconds of any site visit.

## Where the system sits among British facades

British facades of the last two decades divide roughly into four families: painted cement render, through-colour silicone render, brick and cladding, and the timber and board systems of the contemporary end. The silicone family owns the middle: cheaper than brick, more durable than paint, and faster to a finished colour than either. It also suits the way British housebuilding actually works, with a masonry shell, a fixing trade and a finishing trade following each other across the plot in a fixed rhythm.

## The insulated variant

Most silicone render in Britain now sits on external wall insulation rather than directly on masonry, and the system's documentation treats the insulated build-up as a first-class case rather than an afterthought [4](https://www.k-rend.co.uk/literature-library/application-instructions). The insulation board gives the facade its plane and its thermal performance at once, and the render gives it colour and weather protection; the detailing at openings and edges is where the two trades meet, and it is the detail that the quality article of this chain will examine honestly.

## The standard that sits underneath

EN 13914-1 does not prescribe a product; it prescribes a discipline. Design decisions, substrate preparation, material selection and application are all its subject, and its central claim is unglamorous and total: a render is a system whose performance depends on every layer beneath it. The British trade reads the standard through the manufacturer's system documents, which is why the materials and installation articles of this chain cite K Rend's instructions alongside the standard itself.

The layered reading is worth stating plainly. The standard sets the expectations; the manufacturer's system sets the products and the sequence; the site sets the weather and the substrate; and the finishing trade sets the discipline that holds all three together. When a facade fails, the question is never which single layer failed, it is which link between the layers was left undone, and the chain's quality article exists to make that question answerable from the file.

## Who this system is for

The system's natural client is a new-build project with a masonry or insulated shell, a programme measured in weather windows, and a maintenance expectation measured in decades rather than years. It suits housing estates, extensions where a rendered finish is wanted, and commercial elevations where colour and texture are part of a design language.

It is the wrong system for a listed wall, an old solid masonry wall of variable suction, or any facade being repaired to match a lime tradition; those belong to the heritage article, and the boundary between the two articles is the boundary between a wall that was built to shed water and a wall that was built to breathe. Getting that boundary right before the scaffold goes up is the single most valuable decision in the whole chain.

## The maintenance arithmetic

The arithmetic that sells the system is easy to state and worth stating precisely: a painted render facade typically returns to the scaffold every few years for a repaint, while a through-colour facade returns only for cleaning and occasional local repair. The savings are not in the material, which costs more, but in the access, the labour and the disruption, and access is the line item that British owners consistently underestimate until the first invoice arrives.

The arithmetic has an honest counterweight. A through-colour facade cannot be recoloured cheaply if taste changes, and a facade whose colour has drifted cannot be refreshed with a coat of paint in the way a painted wall can. The system is a commitment to a colour as well as a method, and the owner who understands that commitment at the outset is the owner who enjoys the arithmetic rather than resenting it.

## A reader's checklist for the chain

Before commissioning a silicone render facade, a reader should be able to answer four questions from this chain. Which system, and on which substrate, does the wall actually need? Which weather band and which curing protection will the programme honour? Which sample panel will settle colour and texture before the scaffold goes up? And which record will the facade carry into its maintenance decade?

The four questions map onto the chain's four working articles, and a project that answers them in that order has done the thinking before it has spent the money. A project that answers them afterwards has bought an argument with its own builder, which is the most expensive purchase in the building trade.

## The honest summary

Through-colour silicone render is the British facade's default for good reasons: one material carries colour and weather protection, the finish ages by soiling rather than flaking, and the maintenance cycle is a wash rather than a repaint. It is also a system with a firm set of preconditions, and the chain's honest position is that the preconditions, not the product, decide the outcome. That is the argument the overview exists to make.

## Where the chain goes next

The four articles that follow take the overview's four questions in order, and each one is written to be usable on its own by the trade that owns that stage. The materials article is for the buyer and the estimator, the installation article for the applicator, the quality article for the inspector and the client's representative, and the maintenance article for the steward who arrives after everyone else has gone. The chain is deliberately partitioned by responsibility rather than by product, because that is how a real facade is actually built and kept.

## The one-sentence version

If the chain had to compress itself into a single sentence for a client, the sentence would be this: a through-colour silicone render is a system that puts the colour into the wall's outer skin and the maintenance into a calendar, and it only keeps that promise when the substrate, the weather and the record are all treated as seriously as the material. The articles that follow are the long version, written so that each trade can read its own part and recognise its own responsibility in it.

## The chain's promise to the reader

The chain promises the reader three things across its five articles: that the material will be explained in plain terms rather than vendor's language, that the installation will be described as the trade actually performs it rather than as a brochure imagines it, and that the honest boundaries of the system will be stated as clearly as its advantages. Those three promises are why the article cites the manufacturer's own documents alongside the European standard and the British technical handbooks, because a reader who can see both the claim and the framework can judge a specification for themselves.

## References

1. K Rend, *Application Instructions*.
2. K Rend, *Silicone Coloured Renders*.
3. K Rend, *K Rend launches K1 Spray+*.
4. K Rend, *Application Instructions (literature library)*.
5. BSI, *BS EN 13914-1:2016, External rendering*.
6. Buildwise, *EN 13914-1 summary*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows new build houses, photographed by DS Pugh and made available under CC BY-SA 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle1$, 8, 'overview', 'https://upload.wikimedia.org/wikipedia/commons/d/d8/New_build_houses_-_geograph.org.uk_-_6475720.jpg')
, ('gb-silicone-render-materials', 'Materials for Through-Colour Silicone Render', 'A British materials guide to silicone render: the cement-based through-coloured material, grain and texture choice, primers, base coats, beads and mesh, and the coverage arithmetic behind the order.', $wallarticle2$# Materials for Through-Colour Silicone Render

The render itself is a factory-made, cement-based material with the pigment mixed into the bag rather than applied later, and the silicone addition makes the cured surface water repellent [3](https://www.k-rend.co.uk/news/k-rend-launches-innovative-new-render-product-k1-spray-plus-to-market). Grain size decides the look: a finer grain gives the smooth scraped texture most modern British facades wear, and a coarser grain gives a more pronounced tooth. The choice is aesthetic up to a point and practical beyond it, because texture controls how much soiling shows and how easily weather washes the face.

## Coverage and the order of materials

K Rend's brochure quotes coverage of roughly ten to fifteen kilograms per square metre for Silicone K1 depending on texture and substrate [2](https://planning.welhat.gov.uk/Document/Download?module=PLA&recordNumber=102397&planId=1885792&imageId=20&isPlan=False&fileName=K_Rend_brochure_Antique%20White%20%283%29.pdf). The wide band is honest: a flat, true substrate consumes the lower figure, a corrugated or absorbent one the higher, and the estimator who orders at the top of the band and keeps the surplus dry is the estimator whose programme survives a cold snap.

The rest of the shelf follows the texture: a primer appropriate to the substrate, base coats where the system calls for them, galvanised or stainless beads at every external corner and stop line, and reinforcement mesh at the joints and stress points where cracking would otherwise begin [1](https://krend.s3.amazonaws.com/downloads/K-Rend-Application-Instructions.pdf).

## Primer, base coat and the mesh discipline

Primer exists to control suction so the render grabs evenly rather than drying at different rates across the face, and the discipline is to treat it as a material with its own drying time, not a courtesy coat. Base coats build the plane: they are where the facade's flatness is actually made, and the top texture merely reports the plane the base coat left.

Mesh belongs where movement concentrates: junctions between materials, openings, and any change of substrate. The mesh that is left in the van is the crack that appears in year three, and the maintenance article of this chain inherits every one of them.

## What the shelf cannot sell

The shelf cannot sell a dry substrate, a dry day, or a skilled spray operator. It cannot sell the temperature band the render needs to cure properly, and it cannot sell colour consistency across two deliveries of the same nominal shade. Those are the installation article's substance, and the materials article ends by naming them because the best material on a bad day is still the wrong material.

## Reading the bag

The bag states the material's grade, its grain, its coverage and its suitability for machine application, and those four statements are the entire specification for a small job. A render specified by reference to a colour card and a photograph, with the grain and the machine compatibility left to the merchant, is a render specified by hope.

The pigment is worth a sentence of its own. Through-colour means the pigment is in the mix, so two bags of the same nominal shade from two batches can still differ slightly in cured colour, and the manufacturer's own sample service exists precisely because the argument about colour is always settled by a cured sample rather than by a screen or a fan deck.

## Storage and shelf life

Render is a cement-based product in a bag, and the bag has a shelf life and a moisture history. Bags stored flat on a damp floor take up water through the paper and set in lumps that no mixer can redeem, so the store is part of the specification: pallets, cover, first-in-first-out rotation, and a rule that a bag whose date has passed becomes a bag for a garden wall rather than a facade.

## The consumables shelf

Beads, stop profiles and mesh are consumables in name and structure in fact, and the temptation to substitute a cheaper bead is the temptation to introduce a straight line that will not be straight in five years. The beads the system declares are the beads the system warrants, and the warranty arithmetic is the least glamorous and most valuable line on the whole materials list.

## Colour and the sample panel

The sample panel is a material in its own right in the sense that matters: it is the reference that survives when memory and email have both failed. It is made early, cured fully, kept on site and photographed under both daylight and shade, and the photograph goes into the file that the quality article will describe.

## The system documents are the specification

A silicone render job is specified by naming the system, not by naming an ingredient. The manufacturer's system document lists the primer, the base coats, the mesh, the beads, the render itself and the accessories that were tested together, and the warranty arithmetic follows that list. A specification assembled from a merchant's shelf, however sensible each line, is a specification with no owner, and when something fails the failure has no address.

The trade's habit of keeping the system document on site is therefore not bureaucracy but insurance: the document is what converts a pile of sensible products into a system that someone is prepared to stand behind.

## Aggregate, grain and the light

The grain of the material is the facade's relationship with light. A fine grain gives a soft, even surface that reads almost as paint from a distance and shows every flaw in the plane from close range; a coarser grain gives a surface that hides the plane a little better and reads as texture from further away. The choice is made on the sample panel and under British light, which is to say under a sky that changes its mind, and the sample is judged in the rain as well as the sun because a wet facade darkens unevenly where the grain is uneven.

## Water and the silicone claim

Silicone's contribution is described by the manufacturer as water repellent behaviour in the cured surface [2](https://planning.welhat.gov.uk/Document/Download?module=PLA&recordNumber=102397&planId=1885792&imageId=20&isPlan=False&fileName=K_Rend_brochure_Antique%20White%20%283%29.pdf). The honest way to hold that claim is as a property of a correctly applied, correctly cured system rather than a property of the word silicone on a bag: a facade sprayed outside its weather band, or scraped at the wrong moment, has the chemistry but not the performance, and the maintenance article of this chain starts from that truth.

## The mortar and the mason's world

Through-colour render sits in the same family as the mortar that holds the wall, and the same logic applies: the material must be appropriate to the exposure and the substrate. A facade in a coastal parish takes more driven rain than a facade in a sheltered town, and the system documents carry the exposure guidance that the specification should follow. The grain and the finish do the visible work, but the exposure class does the invisible work, and the invisible work is the one that lasts.

## What the client actually buys

The client buying a silicone render facade is buying a colour, a texture and a promise of low maintenance, and the materials article's job is to translate that purchase into bags, beads, mesh, primer and a sample panel. The translation is where projects are won or lost, because a client who has approved a cured sample on their own wall has approved something real, while a client who has approved a photograph has approved an argument waiting to happen.

## The small-job version

A small domestic job uses the same shelf as a housing plot, in smaller quantities: a couple of bags of the specified render, the declared primer, beads at the few corners, mesh at the one junction, and a sample panel that is a patch of wall rather than a field. The discipline scales down without changing its character, which is the mark of a system rather than a merchant's convenience.

The small-job temptation is substitution: a cheaper bead, a generic primer, a merchant's own-brand render. Each substitution saves a pound and spends a warranty, and the materials article's closing advice is simply to keep the system whole however small the elevation.

## Principle into practice

Principle is cheap until it meets an order form, and the materials article is where the meeting happens. The system document lists what must be bought together, the coverage arithmetic sets the quantities, and the storage rules decide whether the delivered material survives until it is used. A buyer who reads the article before ordering will be found ordering differently, and the difference will be measured in fewer arguments at the scaffold.

## The specification sentence

The specification sentence for a silicone render job is short: the specified system, on the prepared substrate, with the declared accessories, applied within the declared weather band, evidenced by the approved sample panel. Five clauses, nothing left to interpretation, and a merchant's alternative is admissible only where the system document admits it. Trade that writes that sentence into its quotations is trade that will not be arguing about substitutions in month two.

## Buying badly, and the shape of the mistake

Buying badly on a rendered facade has a recognisable shape: the material arrives late because the coverage was estimated from a brochure's best case, the primer is a merchant's substitute because the specified one was a week away, the beads are the cheaper profile because nobody checked the system document, and the sample panel is never made because the programme had already slipped. None of those choices looks like a decision at the time; together they are the difference between a facade that is warrantied and a facade that is merely built. The materials article exists to make the shape visible before it happens.

## Ordering for the elevation, not for the estimate

The order that survives a project is written elevation by elevation, with the sample panel and the repair allowance included as line items. A budget built from a total area and a middle-of-the-band coverage is a budget that will be corrected by the weather, and the correction will arrive at the worst moment: when the scaffold is up, the sprayer is booked and the second delivery is a week out. Ordering for the elevation keeps the arithmetic honest and the programme inside its own weather, and it is the cheapest discipline on the whole materials list.

## References

1. K Rend, *Application Instructions*.
2. K Rend, *Silicone Coloured Renders*.
3. K Rend, *K Rend launches K1 Spray+*.
4. K Rend, *Application Instructions (literature library)*.
5. BSI, *BS EN 13914-1:2016, External rendering*.
6. Buildwise, *EN 13914-1 summary*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a stucco paint texture close-up, photographed by Ildar Sagdejev and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/2011-02-11_Stucco_paint_texture.jpg/1280px-2011-02-11_Stucco_paint_texture.jpg')
, ('gb-silicone-render-installation', 'Spraying Through-Colour Silicone Render: Installation', 'A British installation sequence for silicone render: substrate preparation, base coats and mesh, machine spray passes, scraping to texture at the right moment, and curing discipline.', $wallarticle3$# Spraying Through-Colour Silicone Render: Installation

The installation sequence begins weeks before the spray gun arrives, in substrate preparation: the masonry must be sound, clean, and within the flatness the system expects, and EN 13914-1's design and preparation requirements are the technical reference for how far out a background may be before the render is being asked to lie [5](https://cis.ihs.com/CIS/document/317311). Primer goes on to even the suction, and the base coats build the plane.

## The spray passes

Silicone K1 is a machine-applied material, and the application instructions name the spray route explicitly [1](https://krend.s3.amazonaws.com/downloads/K-Rend-Application-Instructions.pdf). The material goes on in controlled passes to the specified thickness, and the operator's discipline is the same everywhere: even coverage, consistent distance from the face, and no stopping mid-panel in a place the eye will find. K Rend's newer K1 Spray+ system formalises the economics as a one-coat, two-pass material, which tells the trade what the old hands knew: two light passes beat one heavy one [3](https://www.k-rend.co.uk/news/k-rend-launches-innovative-new-render-product-k1-spray-plus-to-market).

## Scraping to texture

The through-colour texture is made by scraping the applied material back as it begins to set, and the timing is the craft: too early and the surface smears, too late and the scraper fights the set. The scraped face is where the grain declared in the materials article becomes visible, and it is where a facade either finds its even, fine tooth or confesses a patchy application.

## Joints, beads and openings

Beads run at every external corner and stop line, and the render works to them without gaps or shoulders. Openings are masked with the same care the wall is sprayed, because a silicone render that has strayed onto a window frame cannot be wiped off after it cures. The scaffold line is a joint line like any other: the programme divides the facade where the work divides, never where the floor level happens to fall.

## Weather and curing

The weather band governs the whole sequence. Render is not applied to a frozen or soaking substrate, and the cured surface needs protection from fast drying in sun and wind until the set has properly begun. A facade sprayed in the right band cures to an even colour; a facade sprayed outside it cures to a memory of the mistake. The honest rule is that the calendar obeys the weather, and the weather does not negotiate.

## The scaffold, the masking and the mess

A sprayed facade generates two kinds of mess: the overspray that lands where the wind says, and the material that is dragged past beads and frames by a heavy pass. The masking plan is written before the scaffold goes up: windows, doors, rainwater goods, brick facing and paving all covered, and the wind direction checked each morning before the gun is loaded. A trade that respects the masking is a trade that respects the client's house, and clients remember overspray longer than they remember colour.

## The programme and the plot

On a housing plot the render programme interlocks with the trades behind it: roofing above, groundworks below, windows set before the facade, and services first fixed before the boards if the system is insulated. The render cannot run ahead of the weather and cannot run behind the groundworks that would splash a fresh texture, so the honest programme is written around the seasons and then adjusted weekly against the forecast rather than against hope.

## The texture trial

Before the first elevation is scraped, a trial area on an obscure face settles the final texture: grain, scraper pressure, and the moment in the set that gives the even tooth the sample panel promised. The trial is cheap, hidden and decisive, and a facade with a trial area behind it is a facade whose texture was chosen rather than discovered.

## Curing and the first week

The first week after application decides more of the finished surface than any later maintenance will. Sun, wind and frost all pull moisture out of a curing render at the wrong rate, and the instructions' weather discipline is exactly the protection the chemistry needs [1](https://krend.s3.amazonaws.com/downloads/K-Rend-Application-Instructions.pdf). A facade sprayed on Thursday before a cold weekend is a facade that will be judged by a colour nobody intended.

## Two passes and the reason for them

Two light passes give the operator a chance to correct the first: a thin first pass finds the plane, and the second builds the body without dragging. One heavy pass puts all the material on in a single movement, which is faster and which leaves the thickness riding on the operator's wrist rather than on the gauge. The manufacturer's naming of the two-pass method is the trade's own instinct, codified [3](https://www.k-rend.co.uk/news/k-rend-launches-innovative-new-render-product-k1-spray-plus-to-market).

The pass discipline also decides the facade's colour. Wet render dries slightly lighter than it is applied, and an elevation sprayed in one continuous rhythm cures to one colour, while an elevation sprayed in irregular bursts cures to a map of the day's interruptions.

## The trained operator

Machine application is a skill that looks like plumbing and behaves like craft. The gun's distance, angle and travel speed are the three variables that decide whether the texture is even, and the operator who can hold those three steady across a whole elevation is the difference between a facade and a surface. Training and a trial area are the two safeguards the trade actually has, and both are cheap against the cost of a failed elevation.

## Working around openings

Each opening is a small facade of its own: masked, beaded and sprayed as a unit, with the material worked into the reveals at an angle that keeps the corners clean. The classic faults at openings are thin texture at the head, heavy texture at the reveals and stray material on the frames, and each of them is visible from the ground on the day the scaffold comes down.

## The day after

The morning after a spray is when the texture is inspected in raking light, and the acceptable fix is a controlled one: a scrape-back and re-texture of a panel, not a smear across the joint. The trade that inspects its own work the day after, while the material is young and the scaffold is still theirs, is the trade that hands over a facade rather than a list of promises.

## The interface with the trades around it

Render will not rescue a facade whose windows sit proud, whose rainwater goods discharge onto the face, or whose groundworks splash the base course. The installation article's honest instruction is that the render trade inspects the interfaces before it starts and raises them in writing, because the alternative is a facade that carries other trades' mistakes into the maintenance decade.

The interface check is quick: sills and thresholds that shed, downpipes that reach the drain, and a base detail that keeps the texture clear of the ground. Each is somebody else's responsibility and the facade's problem, and the trade that names them before the first coat is the trade whose work is remembered as good.

## Recording the day

The installation article ends where every honest trade article ends, with the record. The spray day's weather, the passes, the scraper timing and the panels completed are written down while they are still true, because the facade's own surface will not remember them and the next steward will need them. A day remembered is a day that can be defended; a day forgotten is a day that will be guessed at, and guessing is expensive.

## The applicator's own standard

The applicator's standard is the trade's pride stated plainly: every elevation sprayed as if it were the only elevation, every day logged as if it were the last, and every opening treated as a detail someone will live with. Those three sentences contain the whole craft, and the rest of the installation article is commentary on them.

## Where installations most often fail

The installations that fail are rarely the dramatic ones. They are the elevation that started late in the day and finished in the failing light, the panel that was scraped a little early because the scaffold was being struck, the reveal that was sprayed from an awkward angle because moving the tower was slower. Each of those decisions was defensible in the moment and each left a line the eye will find later, and naming them plainly is the most useful thing the installation article can do for the trade that reads it before, rather than after.

## The trade's own post-mortem

Every renderer has a post-mortem list, and the article's final section is the trade's own version: the elevation finished too late, the texture scraped too hard at one corner, the reveal sprayed from the wrong side, the masking left a day too long in the sun. The list is not a confession; it is the shared knowledge that turns an installation article from instructions into experience, and a trade that keeps it deliberately tends to make the same short list every year rather than a longer one.

## The handover walk with the next trade

The installation article closes with a walk that is not the client's handover but the next trade's: the decorator, the window fitter or the groundworker who will work beside the new facade and needs to know what may not be touched. The walk is fifteen minutes of pointing at beads, sealant lines, thresholds and the sample panel, and it prevents the two commonest post-render damages: a ladder foot through a fresh texture and a fixing drilled without a thought for what is behind it.

## The installation in one paragraph

If a reader had one paragraph to carry to site, it would be this: prepare and prime the wall until it is a plane, build the beads and mesh where the movements are, spray two light passes to the declared thickness, scrape at the set and not before, mask as though the neighbours are watching because they are, keep to the weather band, inspect in raking light the morning after, and write the day down. Every section above is commentary on that paragraph, and every failure in the trade's post-mortem list is a clause of it that was quietly skipped.

The paragraph is also the training script, and a trade that hands it to a new starter on their first morning has done more for the facade than a week of toolbox talks.

## References

1. K Rend, *Application Instructions*.
2. K Rend, *Silicone Coloured Renders*.
3. K Rend, *K Rend launches K1 Spray+*.
4. K Rend, *Application Instructions (literature library)*.
5. BSI, *BS EN 13914-1:2016, External rendering*.
6. Buildwise, *EN 13914-1 summary*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a flat-roofed commercial building with a rendered facade in Gillingham, Kent, photographed by OathOn and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Flat-roofed_commercial_building_with_rendered_facade%2C_Gillingham%2C_Kent%2C_England.jpg/1280px-Flat-roofed_commercial_building_with_rendered_facade%2C_Gillingham%2C_Kent%2C_England.jpg')
, ('gb-silicone-render-quality-checks', 'Through-Colour Silicone Render: Quality Control', 'A British quality program for sprayed silicone render: substrate and mesh verification, thickness and texture checks, colour control across deliveries, and the fire-detailing lessons that live behind a facade.', $wallarticle4$# Through-Colour Silicone Render: Quality Control

The quality program for a sprayed facade begins with what the render covers and never with what it looks like, because every gate that matters is behind the surface. Substrate flatness is measured before the first coat and recorded, primer and base coats are logged by batch and date, and the mesh and beads are checked at every opening and junction before they disappear under texture [1](https://krend.s3.amazonaws.com/downloads/K-Rend-Application-Instructions.pdf).

## Thickness, texture and the panel that proves the colour

Applied thickness is checked with a wet-film gauge on the wall and against the coverage arithmetic in the materials article, and the scraped texture is compared to an approved sample panel made on site from the same batch [2](https://planning.welhat.gov.uk/Document/Download?module=PLA&recordNumber=102397&planId=1885792&imageId=20&isPlan=False&fileName=K_Rend_brochure_Antique%20White%20%283%29.pdf). Colour is the gate the trade argues about most, and the honest protocol is the only one that works: a wet sample is not a cured colour, so the sample cures before it is approved, and each new delivery is checked against it under daylight.

## The detailing gate behind the facade

On insulated systems the facade's quality is also a fire and drainage question, and the photograph that illustrates this article is a real London case of external wall insulation fire damage, kept in the file as the reminder of why detailing at openings, cavities and junctions is a quality gate rather than a formality [4](https://www.k-rend.co.uk/literature-library/application-instructions). The render itself is not the fire problem; the system behind it is, and the finishing trade's duty is to build its layer to the specification that the fire strategy assumed.

## The inspection record

The program's record is deliberately dull: dates, batches, gauge readings, sample approvals, photographs of mesh and beads before covering. Dull is the point. When the facade is questioned in year five, whether by an owner, an insurer or a surveyor, the record is the only witness that was actually there.

## The final walk

The handover walk inspects the facade in raking light and in flat light, because the two find different faults: raking light shows the plane, flat light shows the colour drift. Every elevation is walked, including the one behind the shed where nobody usually looks, and the walk ends with the photographs that the maintenance decade will compare against.

## Gauge readings and what they mean

The wet-film gauge reading against the declared applied thickness tells the inspector whether the texture has the body the system assumes, and the readings are logged per elevation rather than per building, because one facade can be sprayed by two operators on two days. Thickness that drifts thin at the top of the elevation is the commonest pattern, and it is invisible until a repair needs to match a surface that was never quite the specified one.

## The substrate belongs to the record

Where the render sits on insulation, the substrate is boards with joints, and the joints are the quality article's first witness: alignment, widths, and the mesh over them before texture. Where the render sits on masonry, the substrate is the wall itself, and its flatness is measured with the same straightedge discipline the other GB articles describe for plaster. In both cases the record is photographs taken before the covering coats, because that is the last moment the work underneath exists in evidence.

## Colour across deliveries

The colour protocol is written and followed: a cured sample panel approved under daylight, delivery batches recorded, and each elevation's material drawn from a declared batch set. Where a second delivery must continue a facade, the protocol is to stop at a designed joint line rather than at a place the eye will find, and the program's photographs record the decision.

## Handover

Handover assembles the whole program into one document: the approved sample, the gauge log, the batch records, the pre-cover photographs and the client's cleaning guidance. The document is short, boring and the single most useful thing the facade will own for the next twenty years.

## The sample panel as a checklist item

The program treats the sample panel as a gate rather than a courtesy: made from the specified system, cured on site, approved under both light conditions, photographed and signed into the file before the first elevation is sprayed. The panel is also the reference for every repair the facade will ever need, which is why it is protected rather than sprayed over when the scaffold moves.

## The weather gate

Weather is a quality gate like any other, and the program logs it: date, temperature band, wind, and the substrate's dryness at the moment of application. A facade sprayed inside the band and logged that way has a defensible history; a facade sprayed outside the band and logged that way has a warning its next steward can read, which is better than a silence [1](https://krend.s3.amazonaws.com/downloads/K-Rend-Application-Instructions.pdf).

## Tools and the inspector's bag

The program's tools are quiet: a straightedge, a wet-film gauge, a moisture meter, a camera and a notebook. Each answers one question, and the questions are asked in the order the work arrives. Nothing in the bag is expensive, and nothing in the bag is optional, because the facade's next decade is being decided by whether someone brought them.

## Sampling the texture as well as the colour

The program approves two things on the panel, not one: the colour and the texture. Texture approval means the grain, the scrape pattern and the coverage of the face, judged in raking light against the specification. A texture approved only by photograph is a texture approved by a lossy medium, and the panel exists to make the standard physical.

## Closing the program

The program closes when the file is complete and the facade is walked, and the close is recorded in the same plain language as every gate before it. The record then passes to the maintenance article's territory, where the first inspection will begin from the photographs the program left, and the loop the chain describes is closed by evidence rather than by memory.

## The failure file

The program keeps a failure file even when nothing fails, and the fire-damage photograph at the top of this article is there to explain why: the facade's own surface can pass every visual check while the system behind it carries a detail that will matter only once. The file lists the details that were inspected and the ones that were not, and its honesty is the program's real output.

## The final handover sentence

The program hands over with a sentence rather than a ceremony: this facade was built to this system, in this weather, from these batches, and here is the proof. Six clauses, one file, and a decade of maintenance that starts informed.

## Why inspection is not distrust

Inspection exists because the facade is built once and lived with for decades, and because the trades that build it are human. The program's tone is the tone of a good foreman: matter of fact, in favour of the work, and unwilling to let a gate quietly close on an unfinished question. The gates protect the trade's own reputation as much as the client's building, and the best applicators ask for them.

## The inspection conversation

Inspection is a conversation with a written record, and its tone matters as much as its standard. The inspector asks the applicator to walk the elevation together, so the findings are shared rather than announced, and the disagreement about a patch of texture is settled against the sample panel rather than against taste. The conversation is the quality system working; the record is the quality system remembering, and a facade needs both.

## The client's part in the quality

The client has a part in the quality program that is easy to overlook: the sample panel approval, the access for inspection, the willingness to let a weather window slip rather than to have the facade sprayed into a frost, and the decision about the joint line where a second batch begins. Those decisions belong to the client, and the inspector's job includes putting them plainly at the moments they must be made. Quality is a shared act, and the article says so without embarrassment.

## Twelve months later

The program's final act happens twelve months after handover, when the facade is inspected against its own handover photographs. The twelve-month inspection catches what the first year reveals: how the colour has settled, where water has tracked, which details have moved. It is not a warranty formality; it is the quality program's last chance to correct a trend while the trades that built the wall still remember it, and the report it produces is the maintenance article's opening chapter.

## The gates in order, for the record

For the record, the gates in order are these: substrate measured and photographed, primer and base coats logged, mesh and beads checked before cover, thickness gauged per elevation, texture judged against the panel, colour approved on a cured sample, weather logged for each day, handover walked in both lights, and the twelve-month inspection compared against the handover photographs. Nine gates, each cheap, each answering one question, and a facade whose file contains all nine has nothing left to prove.

Nine gates is not a burden; it is a morning's work spread across a fortnight, and a facade that has had it needs no argument at handover and no rumour afterwards.

The gate list is short enough to memorise and specific enough to audit, which is the pair of virtues any inspection program needs if it is to survive its first busy week.

The inspector who signs the last gate is not the person who benefits from it, and that gap is precisely why the signature matters.

Read the nine gates as a single sentence: prove the background, prove the coat, prove the level, prove the colour, and prove it all again in the photograph. The sentence is the whole program, and the program is the whole difference between a facade that argues with its owner for twenty years and one that quietly does its job.

That is the standard the facade deserves, and it is the standard a reader with a pencil and a torch can hold on any afternoon of the project.

A facade inspected this way is a facade that can be defended in any meeting, and the defence takes one sentence and one folder.

## References

1. K Rend, *Application Instructions*.
2. K Rend, *Silicone Coloured Renders*.
3. K Rend, *K Rend launches K1 Spray+*.
4. K Rend, *Application Instructions (literature library)*.
5. BSI, *BS EN 13914-1:2016, External rendering*.
6. Buildwise, *EN 13914-1 summary*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows external wall insulation fire damage on Roslyn Road, London N15, photographed by John Kingdon and made available under CC BY-SA 2.0 via Wikimedia Commons (geograph). It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/External_Wall_Insulation_Fire_Damage_Roslyn_Road_N15_-_geograph.org.uk_-_7765358.jpg/1280px-External_Wall_Insulation_Fire_Damage_Roslyn_Road_N15_-_geograph.org.uk_-_7765358.jpg')
, ('gb-silicone-render-maintenance-repair', 'Through-Colour Silicone Render: Maintenance and Repair', 'A British maintenance guide for silicone render facades: soiling and algae cycles, cleaning without damage, local scrape repair, recoating in the same family, and the damp diagnosis that starts behind the surface.', $wallarticle5$# Through-Colour Silicone Render: Maintenance and Repair

A through-colour facade does not need repainting on a cycle, but it does need watching, and the watching starts with what actually lands on it: atmospheric soiling, algae along the wetter margins, and the gradual drift of a surface that has been rained on for a decade. The photograph that illustrates this article is a stained external wall insulation facade, kept as an honest example of how a rendered face ages when the washing it needs does not arrive [1](https://krend.s3.amazonaws.com/downloads/K-Rend-Application-Instructions.pdf).

## Cleaning without damage

The safe cleaning method is the gentle one: low-pressure water, a soft brush, and a proprietary facade cleaner where soiling has bonded, worked in a small trial area before the whole elevation. What the surface must not receive is the merchant's first instinct, a high-pressure jet held close, which drives water into the texture and can lift the finish; and algae treatment follows the manufacturer's guidance rather than a generic fungicide that may stain the colour it was meant to protect.

## Repairing a scrape

A local scrape or impact damage is repaired with the same material family and the same grain, feathered into the surrounding texture, and the repair's success is judged after curing, not on the day. Small repairs stay small because the colour is through the material: a scraped patch needs texture and patience, not a paint match.

## Recoating

Where the facade is clean but the colour has drifted, or the surface has become too open to shed water well, recoating with a breathable silicone masonry system in the same family restores both. The materials article's discipline applies again: the surface must be sound, clean and dry, and the coat must be applied in the weather band the system declares.

## Damp is a diagnosis, not a maintenance step

The one rule this article insists on is that damp on a rendered facade is never treated by painting over it. Water arriving through a defective detail, a failed seal or a bridged damp course will find a way to the surface whatever the finish, and the maintenance visit that scrapes, traces and repairs the cause is doing the facade's real work. The finishing trade that records its own original work, as the quality article insists, gives the next steward the starting evidence for exactly this diagnosis.

## The washing calendar

A facade in a sheltered, leafy street collects algae faster than a facade on an exposed corner, and the calendar is written for the wall rather than for the textbook. The honest default is an inspection each spring, a wash where the inspection says so, and a note in the file about what was used so the next cleaning matches the first.

## When recoating is the answer

Recoating restores both colour and water-shedding, and the decision to recoat rather than repaint is the system's own logic: a breathable silicone coating belongs on a through-colour facade, because it moves water the same way the render does. The coat is applied after cleaning, in the declared weather band, and the finish is judged on a cured sample patch before the elevation is committed.

## Scrapes, knocks and the fixed plant

The knock on the corner from the delivery van, the fixing someone drilled for a satellite dish, the paint mark from a neighbour's fence spray: each is repaired in the material family, feathered, cured and photographed. Fixings and plant are the facade's slowest wear point, and the maintenance file that records where they are is the file that knows what the wall carries.

## The boundaries of do-it-yourself

Cleaning is a homeowner's task. Everything beyond cleaning, from algae treatment to a scrape repair to any recoating, is a trade task, and the line is drawn at the point where a wrong move becomes invisible until it becomes expensive. The article states the line plainly because the alternative, an owner with a pressure washer and a good intention, is the commonest cause of a facade that needs a professional sooner than it should.

## Records and the next steward

The maintenance file is the article's last subject and its quiet argument. A facade with photographs, dates, products and decisions recorded is a facade whose next inspection is diagnostic rather than archaeological, and the difference is measured in the cost of the first repair. The chain began with a decision about which system a wall deserved; it ends with a record that lets that decision be honoured for as long as the wall stands.

## The seasonal walk

The maintenance article recommends a walk each season rather than each year, because the British year gives four different tests: winter wet, spring growth, summer sun and autumn debris. The walk is ten minutes with a notebook, looking at the wetter corners, the ground line, the fixings and the head of each opening, and the notes it produces are what make the spring wash a targeted job rather than a blanket one.

## Working with neighbours and shared walls

A terraced facade is maintained in the knowledge that a neighbour's cleaning, building work or planting can change what lands on the shared wall. The article's practical advice is coordination rather than complaint: the neighbour told in advance is the neighbour who does not pressure-wash into the fresh repair, and the shared facade is the commonest case in British streets.

## The closing rule

The closing rule is the chain's closing rule too: understand the wall, match the material, respect the weather, record the work and inspect on a calendar rather than on a complaint. Five instructions, one page, and a facade that will outlast the decade it was built to serve.

## When the system has reached its end

Every facade has an end, and the honest article names it. Where the render has failed across a whole elevation, or the system behind it has failed in a way the render cannot outlive, the maintenance answer becomes renewal rather than repair, and the decision is taken with the whole chain's evidence in the file. Naming the end is part of maintaining well, because a system that is expected to last forever is a system whose last years are neglected.

## The stewardship summary

The whole maintenance article reduces to a stewardship summary worth carrying: the facade is a system, its maintenance is a calendar, its repairs are a family of materials, and its diagnosis is a discipline. Hold those four thoughts and the wall holds its colour, its water-shedding and its value, and the chain that began with a decision about a system ends with a practice that honours the decision.

## The facade's biography

A facade with a full file becomes, over time, something close to a biography: the year it was sprayed, the batches it was built from, the spring it was first washed, the winter the corner was knocked and repaired. That biography is the truest maintenance instrument there is, because it turns an inspection from a guess about an unknown wall into a check on a known one. The article's last advice is therefore the chain's first advice returned to its conclusion: build the record while the building is being built, and the keeping becomes easy for everyone who follows.

## The last inspection in the article

The last inspection the article describes is the one that will not happen for years: the inspection a future owner performs with this chain's evidence in their hand. The maintenance article's structures, the file, the calendar, the repair family and the diagnosis discipline, exist so that inspection can be a check rather than an excavation. A facade that hands that future its evidence has done everything a facade can do, and the chain's final paragraph belongs to that unknown reader standing in front of a wall that still knows what it is.

## A closing word on colour

Colour is the subject clients remember and the subject the chain has treated as a system property rather than a decoration, because on a through-colour facade it is one. The colour that survives a decade is the colour that was in the material, approved on a cured panel, applied from consistent batches within a weather band, and kept clean on a calendar. Every article of this chain has had a hand in that survival, which is why the closing word on colour is simply the chain's own argument, said once more from the pavement.

## The annual note

The article's last practical device is a single page kept with the building's papers: the facade's history in one place, updated each year with the date, the weather, what was cleaned or repaired, and by whom. One page per decade, in ordinary language, is all the record a rendered facade needs to stay known, and the keeping of it is the difference between maintenance that is done and maintenance that is merely intended.

## A short list of what not to do

The article's short list of what not to do is written in the imperative because the trade remembers imperatives: do not pressure-wash the texture close up, do not treat algae with a generic strong bleach and leave it, do not paint a recoating job with an ordinary masonry paint, do not fill a scrape with a filler that has no grain, and do not repair damp by covering it. Five prohibitions, each learned from a facade that paid for them, and each worth more than the paragraph it occupies.

Every prohibition on that list is cheap to obey and expensive to learn, which is the definition of advice worth printing twice.

All seven fit on the inside of a cupboard door, and the household that pins them there has already done more for its facade than most maintenance contracts ever will.

Recording it is the last and cheapest of the seven rules, and the one that turns a decade of care into a document the next owner can inherit.

None of the seven rules requires a specialist, and none of them is expensive. What they require is a habit of looking at the facade once a season and writing down what the looking found, because the facade that is never looked at is the one that is always a surprise, and surprises on an external wall are rarely small ones.

The wall will outlast the habit and the habit will outlast the owner, and between them they are the whole of what a facade asks for.

That sentence is the whole of this article in one line, and the line is worth pinning beside the seven rules.

## References

1. K Rend, *Application Instructions*.
2. K Rend, *Silicone Coloured Renders*.
3. K Rend, *K Rend launches K1 Spray+*.
4. K Rend, *Application Instructions (literature library)*.
5. BSI, *BS EN 13914-1:2016, External rendering*.
6. Buildwise, *EN 13914-1 summary*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a stained external wall insulation facade in Bonn, Germany, photographed by KaiKemmann and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Verschmutzte_WDVS-Fassade%2C.jpg/1280px-Verschmutzte_WDVS-Fassade%2C.jpg')
) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='GB' AND t.candidate_key='assembly:gb-silicone-render'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='GB' AND t.market_code='GB'
  AND t.candidate_key='assembly:gb-silicone-render'
  AND a.wall_topic_id=t.id AND a.wall_market_code='GB' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
