-- Japan batch 1: five researched draft articles for the Japanese timber frame + gypsum board wall system.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='JP' AND candidate_key='system:jp-timber-frame-gypsum') THEN RAISE EXCEPTION 'JP timber frame gypsum topic is missing'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('The Japan Institute of Architects','https://www.jia.or.jp/','Japan Institute of Architects','Japanese architectural practice, timber housing and interior specification'),
  ('Yoshino Gypsum','https://www.yoshino-gypsum.com/','Yoshino Gypsum','Gypsum board products, joint treatment and interior finishing systems'),
  ('JASSO','https://www.jasso.or.jp/','JASSO (jasso.or.jp)','Japanese wall panel and lightweight construction industry information'),
  ('JLIC','https://www.jlic.or.jp/','JLIC (jlic.or.jp)','Japanese construction labour and trade standards information')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='JP' AND t.candidate_key='system:jp-timber-frame-gypsum'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: Washitsu interior, Toki-ke house, Numata (妖精書士, CC0)','https://commons.wikimedia.org/wiki/File:Washitsu_in_Toki-ke_house.jpg','Wikimedia Commons','Cover photograph overview article, CC0'),
  ('Image credit: Drift-pin timber joint in a Japanese frame (CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:Pin-conect4.jpg','Wikimedia Commons','Cover photograph materials article, CC BY-SA 3.0'),
  ('Image credit: Ridgepole raising of a Japanese timber house (CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:Jyoutou.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 3.0'),
  ('Image credit: Tapered edge of a gypsum board (Panamitsu, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Gib_board_aka_plasterboard_tapered_edges_01.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: Wallpaper on a green wall (Дар Ветер, CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:Wallpaper_on_green.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 3.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='JP' AND t.candidate_key='system:jp-timber-frame-gypsum'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'JP',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='JP' AND t.candidate_key='system:jp-timber-frame-gypsum'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'JP','JP',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('jp-timber-frame-gypsum-overview', 'Japanese Timber Frame with Gypsum Board: The Standard Wall', 'How the Japanese timber-frame wall is built and finished: posts and beams, structural sheathing, furring, gypsum board, joint compound and the wallcovering that almost always goes on top.', $wallarticle1$# Japanese Timber Frame with Gypsum Board: The Standard Wall

The Japanese house is a timber frame with a gypsum board interior, and that sentence describes an enormous proportion of the country's housing. The frame carries the load, the sheathing braces it, the board closes it, and a wallcovering finishes it.

The internal logic is Japanese and quite specific. The frame is a post-and-beam system rather than a platform frame, the interior is boarded rather than plastered, and the finish is almost always a sheet wallcovering rather than paint. Understanding those three choices explains everything else about how these walls are built and how they are maintained.

## The frame

The traditional Japanese frame, known as zairai koho, is a post-and-beam structure with posts at intervals and beams spanning between them.

Its advantage is flexibility: openings can be wide, rooms can be reconfigured, and the structure is visible and comprehensible. Its challenge is resistance to lateral loads, which in Japan means earthquakes and typhoons, and that resistance is provided by sheathing panels fixed to the frame rather than by the frame alone.

Those panels, usually structural plywood, are what make the wall a wall rather than a screen, and they are also the substrate onto which everything else is fixed.

## Battens and the cavity

Japanese practice fixes vertical battens, called domaki, to the sheathing and then fixes the boards to those battens.

The battens create a small cavity, and the cavity serves several purposes at once. It allows the wall to dry, it accommodates the unevenness of the frame, and it gives the boards a flat plane independent of the timber behind them. It also lets services run without cutting into the structure.

That layer is the quiet hero of the assembly, and it is the reason a Japanese interior wall is flat even when the timber frame is not perfectly straight.

## Gypsum board as the interior surface

The interior board is gypsum, supplied in standard, reinforced and fire-rated types, and fixed with screws to the battens.

Gypsum is chosen for the same reasons it is chosen elsewhere: it is flat, it is fast, it resists fire, and it takes a joint treatment well. In Japan there is an additional reason, which is that gypsum board is the standard substrate for the wallcovering that follows.

The board is not usually painted. It is jointed, filled and sanded, and then covered, which is the most distinctive departure from Western practice in this whole topic.

## Why wallcovering dominates

Japanese interiors are finished with sheet wallcovering, called kurosu, in the great majority of rooms.

The product is a vinyl or fabric-faced sheet glued to the prepared board surface. It is fast, it hides small imperfections, it is easy to clean, and it can be changed without repainting. Its weakness is moisture, which is significant in a humid climate, and its consequence is that the maintenance of a Japanese wall is mostly the maintenance of the wallcovering.

Paint exists and is used, particularly in kitchens, bathrooms and modern interiors, but the default is the sheet.

## Joint treatment

Before anything goes on the board, the joints are treated.

The tapered edge of the board is designed to receive tape and compound so that the finished joint is flush with the field, and the compound is applied in successive passes and sanded. The standard of that work determines whether the wallcovering sits flat or shows a ridge along every sheet.

This is the same logic as drywall jointing anywhere, and the same consequence applies: a joint that is filled but not sanded shows as a line under a thin covering.

## Fire and legal performance

Japanese building law classifies interior finishes by their fire performance, and the classification restricts which materials may be used in which parts of a building.

Gypsum board is a standard compliant material, and the fire-rated variants are used where a wall must achieve a stated performance. The wallcovering is also classified, and a material that burns readily cannot be used on a wall that must resist fire.

That legal frame is why a Japanese wall specification is written in terms of named materials and classes rather than in terms of appearance.

## Moisture and condensation

Japan's climate gives the wall a problem that dominates its maintenance: condensation.

Summers are hot and humid, winters are cold in much of the country, and the resulting vapour movement through a wall can condense inside it if the assembly is wrong. That is why Japanese wall assemblies pay attention to vapour control and to ventilation of the cavity, and why a wall that is finished beautifully and detailed badly will grow mould within a season.

This is the single most important practical point for anyone owning or renovating a Japanese house.

## What the later articles cover

Materials deals with sheathing, battens, gypsum board types, joint compound and wallcovering. Installation follows the sequence from frame to finished sheet. Quality covers joint treatment, flatness, fire compliance and the moisture checks that matter. Maintenance covers repairing holes, replacing wallcovering and dealing with mould.

## References

1. Japan Institute of Architects.
2. Yoshino Gypsum.
3. JASSO.
4. JLIC.

## Image credit

The cover photograph shows a washitsu interior in the Toki-ke house in Numata, Gunma, taken by 妖精書士 and released under CC0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a finished Japanese room whose walls are built and finished as this series describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Washitsu_in_Toki-ke_house.jpg/1280px-Washitsu_in_Toki-ke_house.jpg')

, ('jp-timber-frame-gypsum-materials', 'Sheathing, Board and Kurosu: Japanese Wall Materials', 'A materials guide to the Japanese interior wall: JAS structural plywood, furring battens, gypsum board types, joint compound and tape, the wallcovering that goes on top and the adhesives that hold it.', $wallarticle2$# Sheathing, Board and Kurosu: Japanese Wall Materials

The Japanese interior wall uses a short list of materials, and each one is chosen against a climate and a legal frame rather than against a fashion.

Sheathing panels brace the frame. Battens create the plane. Gypsum board provides the flat, fire-resistant substrate. Joint compound makes it seamless. And a sheet wallcovering finishes it. Understanding what each contributes makes the specification readable.

## Structural sheathing

The panels fixed to the timber frame are structural, and in Japan they are usually plywood certified under the Japanese agricultural standard for structural use.

Their job is to resist lateral loads, which is why the fixing pattern, the panel thickness and the nailing schedule are specified rather than left to the trade. A sheathed wall is a braced wall, and the bracing is a structural calculation rather than a finish.

Plywood also provides the flat substrate that the battens and boards sit on. A panel that is bowed or a frame that is out of line shows later as a wavy wall, whatever is fixed over it.

## Furring battens

Battens, called domaki, are fixed vertically over the sheathing and carry the boards.

They create a cavity that allows the wall to dry, accommodates service runs and gives the boards a plane independent of the frame. Their thickness determines the cavity, and their spacing determines the board's stiffness and the fixing pattern.

The battens are also the place where a wall loses or gains its flatness. A batten fixed with a packer in the wrong place produces a hump that no amount of joint compound hides.

## Gypsum board types

Japanese gypsum board is supplied in a family of types, and the choice is made by location rather than by preference.

Standard board is the general interior product. Reinforced board has a denser core for impact resistance and is used where a wall will be knocked. Fire-rated board is used where the wall must meet a fire requirement, and moisture-resistant board is used in kitchens, bathrooms and other damp positions.

Each type is marked and its performance is stated, which matters because the board type is one of the items a fire inspection checks and one of the items a renovation can silently destroy.

## Screws and fixings

The boards are fixed with gypsum board screws of a length that reaches the batten through the board thickness.

Screw spacing is tighter at the board edges than in the field, and the heads are driven just below the surface without breaking the paper. A screw that breaks the paper holds nothing, and a screw that misses the batten shows as a bump under the wallcovering.

In Japan the screw pattern also matters for fire performance, since a board that is sparsely fixed will not stay in place as long as the test assembly did.

## Joint compound and tape

Joint treatment uses a compound, called pate, and a paper or mesh tape.

The compound is applied in passes: a bed coat, the tape pressed in, a fill coat and a finish coat, sanded flat between passes. The tapered board edge exists to accommodate the tape and compound so that the joint finishes flush.

Using a compound formulated for a different board type, or skipping the tape, produces a joint that cracks and a wallcovering that shows a line along every sheet.

## The wallcovering

The finish is a sheet wallcovering, kurosu, and it comes in three broad families.

Vinyl-faced covering is the most common: durable, wipeable and inexpensive, and it dominates in rented and family housing. Fabric and non-woven coverings are softer and more expensive and are used in living rooms. Functional coverings with anti-mould or anti-static treatments exist for specific rooms.

The choice is made against the room's humidity and the client's cleaning habits rather than against appearance alone, because a covering that traps moisture will fail in a bathroom regardless of how it looks.

## Adhesives and primers

The wallcovering is bonded with an adhesive chosen to match the covering and the substrate, and the board is primed first.

The primer's job is to equalise the absorption of the board and the joint compound so that the adhesive does not dry at different rates across the wall. That is the same principle as any primer in any market, and its omission produces lifting at the joints, which is the most common wallcovering failure.

Adhesives are matched to the covering's weight, and a heavy fabric on a light adhesive will sag within a season.

## Tools

The tool list is specific: a screwdriver with a depth stop, a taping knife set, a pole sander, a straightedge, a roller for the adhesive, a smoothing brush or spatula, and a sharp knife with a straightedge for trimming.

The trimming tools matter more than they look, because a Japanese wallcovering is applied with an overlap and cut in place. A dull blade tears the sheet and leaves a seam that opens.

## Storage in a humid climate

Japanese materials are stored against humidity as much as against damage.

Gypsum board absorbs moisture and softens, and a board stored on edge in a damp site will sag before it is fixed. Wallcovering is stored rolled and upright, and adhesive is stored sealed because it skins.

The practical rule is that materials arrive close to the time they are needed, which is a schedule decision as much as a storage one.

## Quantities

Quantities are calculated from the wall area with an allowance for cutting, and the allowance for wallcovering is larger than for board because of pattern matching and the overlap needed for cutting in place.

A wallcovering order that is short by a roll is a problem, because a second batch may differ in shade. Ordering the whole room from one batch is the practice, and keeping a spare length is what makes a later repair possible.

## Buying against the wall, not the brand

Two gypsum boards of the same type from different manufacturers are more alike than two different types from one manufacturer.

That is the practical use of the classification: it lets a buyer choose on suitability and price, and it explains why a supplier's first question is about the room rather than about the brand.

## References

1. Japan Institute of Architects.
2. Yoshino Gypsum.
3. JASSO.
4. JLIC.

## Image credit

The cover photograph shows a drift-pin joint in a Japanese timber frame, released under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the kind of structural timber detail that the sheathing and battens are fixed to. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 9, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Pin-conect4.jpg/1280px-Pin-conect4.jpg')

, ('jp-timber-frame-gypsum-installation', 'From Frame to Wallcovering: The Japanese Sequence', 'The Japanese interior wall built in order: sheathing and bracing, insulation and vapour control, furring battens, board fixing, joint treatment and sanding, then the wallcovering applied and cut in place.', $wallarticle3$# From Frame to Wallcovering: The Japanese Sequence

A Japanese interior wall is built in a fixed order, and the order is the whole method. Each stage creates the surface the next stage needs, and a stage skipped cannot be recovered later.

This article follows the sequence for a timber frame wall finished with gypsum board and wallcovering, which is the standard domestic assembly.

## Step one: check the frame

Before sheathing, the frame is checked for plumb, line and the position of openings.

A frame that is out of plumb produces a wall that is out of plumb, and the boards and battens cannot correct it. The check is a level and a string, and it is the cheapest moment to correct anything.

The frame is also checked for the services that will pass through it, since the cavity behind the boards is where they run and the batten positions determine where they can emerge.

## Step two: fix the sheathing

Structural panels are fixed to the frame with the specified nails or screws at the specified spacing.

The fixing pattern is a structural matter, not a matter of convenience: it is what gives the wall its resistance to lateral load, and a panel fixed at half the specified density does not perform as designed. Panels are butted with a small gap and their joints land on framing.

The sheathing is also the moment at which the wall's squareness and flatness become fixed, since everything after it follows the panel plane.

## Step three: insulation and vapour control

Insulation fills the frame cavity, and a vapour control layer is installed on the warm side where the assembly requires it.

In a Japanese climate the vapour question is the one that decides whether the wall grows mould. Vapour moves from the warm humid side toward the cold side, and it must not condense inside the wall. That is why the layer's position and continuity matter more than its thickness.

Penetrations, joints and the junctions at floor and ceiling are where a vapour control layer fails, and they are where the work is inspected.

## Step four: battens

Vertical battens are fixed over the sheathing, packed where necessary to bring them to a true plane.

The battens establish the wall's flatness and create the cavity that allows the assembly to dry and services to run. Their spacing determines the board's fixing pattern, and their line determines whether the finished wall is flat.

Packing is the detail that separates a flat wall from a wavy one, and it takes time. A wall with un-packed battens is a wall with humps that the boards will reproduce faithfully.

## Step five: board fixing

Boards are fixed horizontally or vertically according to the layout, with joints landing on battens and joints staggered between courses.

Screws are driven at the specified spacing, set just below the surface without breaking the paper. The board is cut to openings with a small gap at the floor and ceiling so that it does not bear on the structure.

The layout is decided before the first board goes up, because a layout decided as the work proceeds produces joints that do not land on battens, and joints that miss a batten crack.

## Step six: joint treatment

Joint treatment is the stage that determines whether the wallcovering sits flat.

The joint is bedded, taped and filled in successive passes, each wider than the last, and sanded between passes. Screw heads are filled in the same sequence. The finished joint should be invisible as a change of plane, not merely covered.

Dust control belongs here: sanding dust settles on every surface and contaminates the adhesive and the covering if it is not removed before the next stage.

## Step seven: sealing and priming

The prepared board surface is primed before the wallcovering goes on.

The primer equalises absorption across the board face and the joint compound, which is what allows the adhesive to dry evenly. Without it, the joints draw adhesive differently from the field, and the covering lifts along exactly the lines that were filled.

Priming also seals the surface against dust and improves the adhesive's initial grab, which matters most on a vertical surface.

## Step eight: wallcovering

The wallcovering is cut to length with an allowance, pasted, folded and left to relax, then hung from a plumb line.

Successive lengths are butted or overlapped according to the material, and the seams are cut in place with a straightedge and a sharp blade where an overlap method is used. The surface is smoothed from the centre outward to expel air, and the edges are finished with a seam roller.

Corners, reveals and the junctions at skirting and ceiling are the details that show, and they are worked last while the covering is still workable.

## Step nine: drying and inspection

The finished wall is inspected in daylight and in raking light before handover.

Seams, bubbles, lifted edges and cut lines are checked, and any defect is corrected while the adhesive is still soft enough to allow the sheet to be lifted. After it has cured, a correction means replacing the length.

The room is then ventilated, since fresh adhesive and covering release moisture into a space that is usually closed at that stage.

## Handover

The record names the board type, the joint treatment, the wallcovering product and batch, and the adhesive used.

It also notes the fire classification of the materials where the wall has a requirement, because that is the item a later renovation will most easily destroy and the one an inspection will most easily check.

## References

1. Japan Institute of Architects.
2. Yoshino Gypsum.
3. JASSO.
4. JLIC.

## Image credit

The cover photograph shows the ridgepole raising of a Japanese timber house, released under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the frame stage of the timber construction whose interior sequence this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Jyoutou.jpg/1280px-Jyoutou.jpg')

, ('jp-timber-frame-gypsum-quality', 'Judging a Japanese Wall: Joints, Flatness and Condensation', 'A quality framework for the Japanese board-and-wallcovering wall: what a good joint looks like, checking flatness, verifying fire-classified materials, and the moisture checks that decide whether the wall will grow mould.', $wallarticle4$# Judging a Japanese Wall: Joints, Flatness and Condensation

A Japanese interior wall is judged on four things: how its joints read under the covering, how flat it is, whether its materials match their classification, and whether it will stay dry.

The first two are visible, the third is documentary, and the fourth is invisible until the first humid summer.

## Joints under a covering

A wallcovering is thin, and it reproduces whatever lies beneath it.

A joint that is filled but not sanded flat shows as a ridge along every sheet. A screw head that stands proud shows as a spot. A patch that was sanded harder than the field shows as a shallow dish. Under paint those defects are mild; under a smooth vinyl they are obvious, and under a light colour in raking light they are the first thing anyone sees.

That is why the standard for joint treatment on a Japanese wall is higher than the phrase drywall finishing suggests.

## Checking flatness

Flatness is checked with a straightedge and with light, in the same way as any plastered or boarded wall.

A two-metre straightedge applied vertically, horizontally and diagonally shows the deviation directly. A raking light from a window or a torch along the wall shows the same deviation as a shadow that no straightedge reproduces.

Both checks belong to the stage before the covering, not after. Once a wallcovering is on, the only correction available is to remove the sheet.

## Screws and the invisible pattern

Screw heads are filled and sanded, and the test is whether their pattern is invisible under light.

A visible pattern means the heads were set too high, or the filler shrank, or the screws were spaced irregularly so that the eye reads a rhythm. On a large wall the pattern is the most common quality complaint after joints, and it is entirely preventable at the fixing stage.

Where the boards are to be covered with a light-coloured smooth vinyl, the fixing pattern deserves an inspection before the filler goes on.

## Verifying classified materials

Where a wall carries a fire requirement, the quality check is documentary and physical at once.

The board type must match the specification, the wallcovering must carry the required classification, and the fixing pattern must match the assembly that was tested. A board substituted for a cheaper type removes a performance that nobody can see and an inspector will look for.

The practical record is the product labels, photographed before the wall is closed, plus the drawings that state the required class.

## The condensation check

Condensation is the quality item that most distinguishes a Japanese wall from its equivalents elsewhere, and it is checked by design rather than by inspection.

The vapour control layer must be continuous, the cavity must be able to dry, and any penetration must be sealed. Those three items are checked at the closed-wall stage, because afterwards the only evidence is mould.

Where a room produces a lot of moisture, mechanical ventilation is part of the wall's performance rather than a separate appliance. A wall in a house without working ventilation cannot be made dry by its materials alone.

## Mould and the first summer

A newly finished wall that grows mould in its first humid season is telling you about moisture, not about cleanliness.

The usual causes are a discontinuous vapour layer, an unventilated cavity, a cold bridge at a structural element, or a room without adequate ventilation. Treating the mould without finding the cause produces a repeat the following June.

Assessing a wall in the rainy season, rather than in a dry month, is therefore the honest way to judge it.

## Defects worth naming

Six defects recur: joints that telegraph, screw patterns that show, seams that lift, bubbles under the covering, cracks in the compound along a board joint, and mould at corners and window reveals.

Each maps to a stage: joint treatment, fixing, adhesive and priming, smoothing, tape, and moisture. Naming the stage rather than the symptom keeps a handover conversation technical.

## Sample areas

On a wall where the finish matters, a sample of one board joint and one seam of the actual covering, viewed in the room's light, settles what the standard means.

It is the same instrument used in plastering and in drywall finishing elsewhere, and it costs an hour. On a Japanese job its particular value is that it shows the covering's behaviour over a joint, which is the defect most likely to be disputed.

## Documentation

The record is a page: board type and thickness, batten spacing, joint treatment and passes, primer, covering product and batch, adhesive, and the fire classification of each material.

Add photographs of the frame, the sheathing, the vapour layer and the finished wall. The first three are the only evidence of the parts that can never be seen again.

## What a good wall feels like

A well-finished Japanese wall is flat under the hand, silent under a knuckle where it should be, even in raking light, and free of any pattern across the field.

Those impressions correspond to the batten plane, the cavity, the joint treatment and the fixing, which are the four items in this article. A client who is dissatisfied is usually noticing one of them.

## References

1. Japan Institute of Architects.
2. Yoshino Gypsum.
3. JASSO.
4. JLIC.

## Image credit

The cover photograph shows the tapered edge of a gypsum board, taken by Panamitsu and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the board-edge detail that makes a flush joint possible. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Gib_board_aka_plasterboard_tapered_edges_01.jpg/1280px-Gib_board_aka_plasterboard_tapered_edges_01.jpg')

, ('jp-timber-frame-gypsum-maintenance', 'Keeping a Japanese Wall: Patching, Re-covering and Mould', 'Maintaining a board-and-wallcovering wall in Japan: repairing holes, matching a covering, dealing with mould in the rainy season, replacing a single wall and recognising condensation that no cleaning will fix.', $wallarticle5$# Keeping a Japanese Wall: Patching, Re-covering and Mould

A Japanese interior wall is easy to clean and awkward to repair, because the finish is a continuous sheet rather than a paint film.

That single fact shapes the maintenance routine: small repairs are done with patches and skill, larger ones by replacing a whole wall's covering, and the recurring seasonal problem is not dirt but moisture.

## The seasonal routine

Two moments in the Japanese year matter more than the rest: the end of the rainy season and the start of winter heating.

After the rainy season, walls are checked at corners, behind furniture and around window reveals for the first signs of mould. Before winter, the same places are checked for condensation, which appears where a surface is coldest.

A quick inspection at those two points, with a wipe and a photograph, is the whole of the preventive routine and it prevents most of the expensive work.

## Cleaning a wallcovering

Vinyl wallcovering is cleaned with a damp cloth and a mild detergent, and the rule is not to scrub.

Scrubbing burnishes the surface and leaves a sheen change that no cleaning removes. Solvents attack the vinyl and leave a sticky patch that attracts dirt. A soft cloth, a little detergent and a rinse are the whole method.

Fabric coverings are vacuumed rather than washed, and a stain on a fabric covering is usually a re-covering decision rather than a cleaning one.

## Mould, treated properly

Mould on a wall is treated with an appropriate cleaner and the area is dried thoroughly afterwards.

Alcohol-based cleaners are the usual domestic choice because they evaporate quickly; chlorine-based products are effective but aggressive on some coverings and need ventilation. Whichever is used, the surface is dried rather than left damp.

Treating the mould is the visible half of the job. The other half is finding why the wall was wet, and that is the part that prevents the return.

## Patching a hole

A hole in a Japanese wall is repaired by restoring the board and then restoring the covering.

The board is patched with a piece cut to fit and backed with a batten or a repair plug, and the joint is taped, filled and sanded in the normal sequence. The covering is then replaced over the repair, which is the difficult part.

A small patch of the same covering, cut from the spare length kept at installation, can be fitted and cut in at a seam so that it disappears. Without a spare length, the repair becomes a visible patch or a whole-wall replacement.

## Re-covering a wall

Re-covering is the standard maintenance event for a Japanese wall, and it is the reason the wall's construction matters.

The old covering is stripped, the board surface is cleaned and any damaged compound is filled and sanded, and a new covering is applied. Where the board itself has been damaged or has softened from moisture, the affected boards are replaced before re-covering.

Re-covering a whole room is a small job and it transforms the interior, which is why Japanese interiors are renewed on a cycle rather than patched indefinitely.

## Condensation at windows and corners

The places where condensation shows first are the places where the wall is coldest: window reveals, external corners, and the junction between the wall and the ceiling.

Those are thermal bridges, and the moisture that condenses there in winter is the origin of the mould that appears in summer. Improving ventilation, keeping furniture away from cold corners and using the building's ventilation system as designed are the practical responses.

A wall that condenses heavily in winter needs more than cleaning, and the assembly may need to be assessed rather than the surface treated.

## Ventilation as part of the wall

Modern Japanese houses are built with mechanical ventilation, and its role is not comfort but moisture control.

A wall assembly that relies on ventilation to stay dry fails when the ventilation is switched off, blocked or never maintained. Filters are cleaned, fans are left running, and the system is treated as part of the building rather than as an appliance.

That habit is the single most effective maintenance measure in a Japanese house and it costs nothing.

## Repairing damage around fittings

Air conditioners, curtain rails, shelves and switches all create fixings and penetrations in a Japanese wall.

A penetration through the vapour layer is a small moisture path, and it is worth sealing when a heavy item is mounted. Removed fixings leave holes that are patched as any other hole, with the covering restored afterwards.

Where a fitting is moved, the old holes and the new ones are both repaired at once, since the covering is being handled anyway.

## When to call a specialist

Three situations justify one: mould that returns after treatment, board that has softened or crumbled, and a wall that shows moisture across a wide area rather than at a point.

Each indicates a problem inside the assembly rather than at the surface, and each is cheaper to diagnose than to keep repainting or re-covering.

## Records

A one-page file with the board types, the covering product and batch, the adhesive, the year of installation and a photograph of each wall is enough.

On a Japanese wall that file has a specific value: it identifies whether a wall is finished with a fire-classified material, which is the item a renovation most easily gets wrong.

## Expectations

A wallcovering in a Japanese home has a service life of roughly ten years in living areas and less in kitchens and bathrooms, and re-covering is routine rather than remedial.

A wall that is re-covered on that cycle, kept dry and ventilated, needs nothing else. The failures that make walls feel fragile are almost always moisture, and moisture is the one thing the routine can control.

## References

1. Japan Institute of Architects.
2. Yoshino Gypsum.
3. JASSO.
4. JLIC.

## Image credit

The cover photograph shows wallpaper on a green wall, taken by Дар Ветер and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a sheet wallcovering of the kind used to finish these walls. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 9, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Wallpaper_on_green.jpg/1280px-Wallpaper_on_green.jpg')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='JP' AND t.candidate_key='system:jp-timber-frame-gypsum'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='JP' AND t.market_code='JP'
  AND t.candidate_key='system:jp-timber-frame-gypsum'
  AND a.wall_topic_id=t.id AND a.wall_market_code='JP' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
