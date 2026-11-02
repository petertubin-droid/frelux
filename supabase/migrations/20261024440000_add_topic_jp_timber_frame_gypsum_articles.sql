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

## Why the frame is post and beam

The Japanese frame carries loads on posts and beams rather than on closely spaced studs, and that choice has consequences that reach all the way to the wallcovering.

Posts at wide centres mean big openings and rooms that can be joined or divided without touching the structure. Beams span between posts and carry the floors above. The resulting frame is a visible grid that a carpenter can explain to an owner, and it is also a frame with fewer, larger members to get right.

Because the frame does not brace itself, panels take that job. That is why the sheathing is a structural element with a specified fixing pattern rather than a convenient backing for boards, and why removing a panel during a renovation is a structural act rather than a decorative one.

## The interior that is boarded, not plastered

Japanese interiors went from plaster on lath to gypsum board quickly, and the reasons were speed, cost and flatness.

A boarded wall is dry, fast and dimensionally predictable. It accepts a wallcovering without the curing time a plaster needs, and it can be opened for services and closed again by a competent carpenter rather than by a plasterer. In a country where houses are frequently rebuilt and services are frequently renewed, that matters.

The trade is that a boarded wall is lighter and less massive than plaster, so it contributes less to sound insulation. Japanese practice compensates with the frame and with added insulation rather than with the wall's surface mass.

## The wallcovering economy

The dominance of sheet wallcovering is not a stylistic accident; it is an economic system.

A covering can be installed by a small crew in a day, changed in a decade without plaster work, and repaired at a seam by a competent householder. It also hides the joint treatment beneath it, which lowers the standard demanded of the board stage compared with a painted wall in critical light.

The cost of that system is that a wallcovering cannot be spot-repaired invisibly, and that a room's finish is renewed wholesale rather than touched up. Japanese households accept that, and it explains why re-covering is treated as routine rather than as a failure.

## Lateral load and the panels

Japan's seismic design puts the lateral resistance of a timber house substantially into its wall panels.

That has three practical consequences for anyone specifying or altering this wall. The panel material and thickness are specified, the fixing pattern is specified, and the panels are placed where the structural plan requires rather than wherever a wall exists. A wall that has been opened for a renovation and had its sheathing cut away has lost performance that no amount of board restores.

The same panels that brace the house also carry the plasterboard, which is why their flatness matters to the finish as well as to the structure.

## Climate and assembly

Japan spans a cold north and a hot, humid south, and the wall assembly changes with the climate even where the visible materials do not.

In the colder regions the insulation is thicker and the vapour control more critical, because condensation inside the wall is driven by the temperature difference. In the humid south the priority shifts toward drying and ventilation, with less heating-driven vapour movement and more summer moisture.

A specification that ignores that difference is a specification copied from another region, and the wall will show it in the first few seasons.

## The room and its proportions

Japanese rooms are proportioned in units derived from the tatami, and the wall treatment follows.

A wall in a traditional room is a composed surface: a tokonoma alcove, a shoji or fusuma screen, a plastered panel above the timber rail, and a defined skirting line. Those elements are not applied to the wall; they are part of how it is built.

In modern housing that composition simplifies, but the habit remains: a room is designed as a set of surfaces with frames, and a wallcovering is stretched across the broad fields between them. That is why the quality of a Japanese wall is judged at the edges as much as at the field.

## What an owner should take from this

Two things. First, the visible finish is the last of six stages, and the five behind it decide how the wall behaves.

Second, the specification is short and nameable: panel type, batten spacing, board type, joint treatment, covering and adhesive. A householder who asks for those six in writing has a wall that can later be repaired to match.

## The wall as a system, not a surface

Read as a system, this wall is a chain: frame, sheathing, cavity, board, joint treatment, covering. Each link has a job and each job is verified before the next link covers it.

That is why the specification is written as a sequence rather than as a shopping list, and why a change at any link is a change to the whole. A householder who understands the chain can ask the right question at every stage, and that is most of what an owner needs.

## Where Japanese practice differs

Three differences separate this wall from its Western equivalents, and each is worth stating plainly.

The frame is post and beam with panels for bracing rather than a closely studded platform frame. The interior is boarded and then covered rather than plastered or painted. And moisture control is treated as the dominant design problem, because the climate makes it one.

None of those differences is exotic. Together they explain why the trades, the materials and the maintenance cycle all look the way they do.

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

## Sheathing grades

Structural sheathing in Japan is graded and marked, and the marking is the thing to read before buying.

The grade states the panel's structural performance, its thickness tolerance and its durability class, and those are what the bracing calculation assumed. A panel from a different grade may look identical and behave differently, and a substitution made on site quietly changes the wall's performance.

The panel also carries a moisture performance, which matters because sheathing is installed in weather and can get wet before the wall is closed. A panel that has swollen at the edges will not sit flat, and the battens will follow it.

## Board sizes and thicknesses

Japanese gypsum board comes in standard sheet sizes matched to the frame module, and in thicknesses that determine stiffness and fire performance.

A thicker board is stiffer, better in fire and heavier to handle, and it is chosen where the wall's performance requires it rather than where handling is easier. The board thickness also determines the screw length, since the screw must reach the batten through the board without standing proud.

Sheet size drives the layout and the waste. A layout that uses whole sheets and puts the cut edges at the floor and ceiling produces less waste and fewer joints than one that starts from a corner.

## Tapes, meshes and compounds

Joint tape in Japan is usually paper, with mesh used for repairs and awkward junctions.

Paper tape is stronger in tension and produces a flatter joint, which matters because the wallcovering is thin. Mesh is quicker and more forgiving for a small repair but its texture can telegraph under a smooth covering.

The compound must be matched to the board type, since a compound formulated for standard board behaves differently over a moisture-resistant surface. Mixing product families is the quiet cause of joints that crack in the first season.

## Covering widths and pattern

Wallcoverings come in standard roll widths and in patterns with a repeat, and both affect the quantity.

A pattern with a large repeat requires more material, because each length must be aligned to the previous one and the waste can be substantial. A plain covering can be cut with a small allowance and produces little waste.

Ordering from one batch is essential, since a second batch of the same product can differ in shade in a way that is obvious across a wall. Keeping a spare length costs a little and makes every future repair possible.

## Fixings that suit the substrate

Fixings on this wall are chosen for the board and the batten rather than for the load alone.

A light item hangs on a board fixing that spreads its load behind the board. A heavy item is fixed into the batten or into the frame, which means finding the batten with a detector or from the layout drawing. An item fixed into the board alone will eventually pull out and take a piece of the covering with it.

Knowing where the battens are is therefore part of maintaining the wall, and it is worth recording at installation rather than rediscovering with a detector every time something is hung.

## Waste and the second order

The material that is wasted on this wall is mostly cut-offs at openings and at the top and bottom of sheets.

A layout that is planned before the first sheet is cut reduces that waste to a small percentage. An unplanned job produces a skip full of narrow offcuts and a second order in the middle of the work, which is worse than the waste because of the delay.

Keeping the offcuts that are large enough to patch a hole is worth doing, since they are the only material guaranteed to match.

## A short list for a room

For a single room: structural sheathing already fixed, battens, gypsum board of the specified type, screws, paper tape, joint compound, primer, wallcovering from one batch, and adhesive matched to the covering weight.

Every item answers a requirement. None of them is a preference, and the covering batch is the one that cannot be fixed later.

## Why gypsum rather than a cement board

Gypsum board is the default interior substrate for reasons that are about workability as much as performance.

It cuts and fixes quickly, it takes compound and tape cleanly, and its surface is smooth enough that a thin wallcovering sits flat over it. A cement board would resist moisture better but would be slower to finish and would demand different joint treatment.

Where moisture is a real risk, the answer in Japanese practice is to use the moisture-resistant gypsum type and to correct the ventilation, rather than to substitute a board that solves the symptom.

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

## Planning the layout before the first sheet

Board layout is decided on paper, and the decision governs everything that follows.

The rule is that every joint lands on a batten or on a framing member, and that joints between courses are staggered so that four corners never meet. Openings are placed in the layout so that their edges fall on solid backing, and cut edges are kept where they will be least visible, at the floor and the ceiling.

A layout done on site as the work proceeds produces joints that miss their backing and a wall whose covering shows a line exactly where a joint was not supported. That is the most common structural cause of a failed wallcovering on this assembly.

## Board orientation

Boards are fixed with their long edge horizontal or vertical depending on the module and the height of the wall.

Horizontal fixing uses the board's length across the wall and puts fewer joints in the field, which suits a wall that is wider than it is tall. Vertical fixing puts the joints at the studs and is easier around openings and high walls. Both are legitimate; the layout drawing picks one and stays with it.

What is not legitimate is mixing the two directions within a room, because the joints then fail to align with the battens and the covering shows the result along every change.

## Cutting openings

Openings are cut after the board is fixed, using the board's own fixing as a guide, and cut cleanly enough that the covering will not have to bridge a ragged edge.

A cut with a straight blade against a straightedge produces an edge that a wallcovering can be trimmed to. A cut made with several passes in slightly different places produces a frayed edge that shows as a dark line under a light covering.

Around sockets and switches the cut is measured rather than guessed, and the plate is checked against the wall before the compound goes on, since the plate is what will eventually hide the cut.

## Corners and reveals

Internal corners between boards are taped and filled like any joint, and external corners at reveals are formed against a bead or a folded tape.

The reveal at a window or a door is where a wall's workmanship is most visible, because it is a narrow surface with two edges that the eye follows. A reveal that is square, flat and correctly finished to the covering reads as part of the architecture; one that is slightly out reads as a mistake.

In a traditional room the reveal meets the frame and the shoji track, and those junctions are formed by the carpenter rather than by the boarder, which is why the trade sequence matters.

## Seam cutting

The overlap-and-cut method is the standard way to produce a seamless butt joint on a wallcovering.

The first length is hung to a plumb line and smoothed. The second is hung overlapping it by a small margin, aligned on the pattern or on the edge, and then both layers are cut through with a sharp blade against a straightedge, the waste is removed and the two edges are pressed together.

The method depends on a sharp blade and a single confident cut. A blade that drags tears the face, and a cut that is repeated leaves a stepped seam that will open as the adhesive cures.

## Sequencing with other trades

The wall is finished after the trades that open it and before the trades that would damage it.

Electrical, plumbing and air conditioning rough-in happens before the boards go on, so that the services are inside the cavity rather than chased afterwards. Painting and flooring follow the wallcovering, or precede it where the wallcovering is the last surface to be touched.

Getting that sequence wrong is how a finished wall ends up with a chased channel through its covering and a patch that cannot be made invisible.

## Signing off the stage

Each stage is signed off before the next covers it, because the next stage hides it.

The frame is signed off before sheathing, the sheathing and vapour layer before battens, the battens before boards, the joints before priming, and the primer before the covering. That chain of sign-offs is the whole quality system of a wall that will be invisible.

## The order cannot be reversed

Every stage in this sequence exists because the next one hides it, and hiding is irreversible.

The vapour layer cannot be inspected after the boards go on. The batten plane cannot be corrected after the covering. The joint treatment cannot be sanded after the sheet is hung. A tradesman who understands that works in the order given, and a client who understands it inspects at the right moments rather than at the end.

## Materials arriving in order

On a Japanese site the materials arrive in the sequence they are used, which is a schedule discipline rather than a storage convenience.

Sheathing and battens come first, then board, then compound and tape, then primer, then the covering. Each is stored briefly and used, which suits a climate where a board left standing will absorb moisture and a covering left rolled in a damp room will take the smell of it.

A delivery plan built around the trades rather than around a discount is what keeps the wall dry and the programme predictable.

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

## Inspecting in the light the room will have

A Japanese wall is inspected under the light it will live with, which usually means daylight from one side.

A raking light across the surface shows joints and screw patterns that a flat light conceals. The same wall seen at noon and at dusk can look like two different jobs. That is why the inspection happens in the room as it will be used, with the curtains or screens in their intended positions.

Where the room has not been decorated yet, a work light placed low and to one side reproduces the worst condition available.

## Measuring flatness

Flatness is measured against a tolerance, and the tolerance belongs to the specification rather than to the eye.

A straightedge of two metres is applied in the four directions that matter: vertically, horizontally and both diagonals. Deviations are recorded in millimetres against the agreed figure. Where the figure was never agreed, the conversation becomes about preference, and preference is not a standard.

On a boarded wall the deviations usually trace back to the battens, which is why a record of batten spacing and packing is part of the quality evidence.

## Fire compliance as evidence

Fire performance on this wall is demonstrated by materials and records rather than by appearance.

The board type must match the specification, the covering must carry its classification, and the fixing pattern must match the assembly that was tested. The evidence is the product labels, photographed before the wall closes, plus the drawing that states the required class.

A substitution on site removes that evidence as well as the performance, and a later inspection cannot recover it from a finished wall. That is why the labels are photographed rather than noted.

## Verifying the vapour layer

The vapour control layer is checked before the boards go on, because afterwards it is inaccessible.

The check is continuity: no unsealed joints, no gaps at the floor and ceiling, no penetrations left open, and no damage from other trades. Those are the points where condensation begins, and they are the points a photograph can record.

A wall that grew mould in its first season almost always had a discontinuity somewhere in that layer, and the photograph from installation is what makes the diagnosis possible rather than speculative.

## Seams and bubbles

Wallcovering defects are inspected at two distances: close for correctness and from across the room for appearance.

Close up, a seam should be tight and even, with no overlap and no gap. From across the room, the seams should not form visible lines. Bubbles are found by sighting along the wall with a light at a shallow angle, which reveals the shadow under a lifted area.

Every defect found at that stage is correctable, because the adhesive is still workable. The same defect found after curing means replacing a length.

## Humidity readings and drying

Moisture readings at handover are the quality record that has the longest useful life.

Readings are taken on the wall surface and, where possible, in the cavity, and they are compared with the ambient conditions. A wall that reads high at handover is a wall that will grow mould when the season changes, and knowing that in advance is the difference between a routine check and a claim.

With a covering in place the readings are indirect, which is why the installation-stage photographs and the ventilation record carry so much of the weight.

## Where the risk concentrates

Three places carry most of the risk on this wall: the vapour layer, which is invisible after closure; the batten plane, which decides flatness; and the seams, which are the first thing to lift.

A wall sound at those three places will look the same in a decade. A wall that failed at one of them will have been re-covered early.

## Judging the wall fairly

A wall is judged against its specification, not against perfection.

The specification names the board type, the batten spacing, the joint standard, the covering and the fire class. A wall that meets those is a sound wall, even if a critical eye finds something to comment on. Knowing where the standard sits, and stopping there, is what a professional assessment looks like.

## The covering hides and reveals

A wallcovering is often described as forgiving, and it is forgiving in one direction only.

It hides the joint treatment and the screw pattern at a glance, which is why it is popular. It also reveals, under raking light and on a smooth face, every ridge, dish and proud head that the board stage left behind. A wall covered without a flatness check is a wall whose defects have been preserved rather than corrected.

That is the argument for inspecting at the joint stage, before priming, when correction is still a matter of a sanding block.

## Records that survive a renovation

A renovation is where the evidence of a wall's performance is most easily lost, and it is the moment the record earns its keep.

Photographs of the sheathing, the vapour layer and the batten layout are what allow a later alteration to avoid cutting a brace or a vapour seal. The fire classification of the board and covering is what prevents a compliant wall from becoming a non-compliant one during a cosmetic upgrade.

Keeping those items together, with the drawings, is the smallest useful archive for a house.

## A wall judged twice

A Japanese wall is judged twice: once with the covering off, where the board, the joints and the vapour layer are visible, and once with it on, where only the finished surface remains.

The first judgement is the one that determines the second. A boarder who knows that the second will expose everything the first concealed works differently, and a client who asks for the first judgement gets a wall that passes the second.

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

## Cleaning products that suit the face

A wallcovering's face decides what can be used on it, and using the wrong product is how a clean wall becomes a marked one.

Vinyl-faced coverings tolerate a mild detergent and water. Fabric and non-woven faces tolerate barely any moisture and are best vacuumed. Abrasive pads and solvents damage most faces, and bleach will strip colour from a printed pattern even where it removes the mould.

The practical approach is to test any product on an inconspicuous piece, usually behind a piece of furniture or inside a cupboard, before it touches a wall anyone looks at.

## The rainy-season routine

The weeks before and after the rainy season are the maintenance opportunity of the Japanese year.

Before it, the building's ventilation is checked, filters are cleaned and any sign of previous damp is treated. After it, the wall is inspected at the places where moisture concentrates: behind furniture, at external corners, inside cupboards on external walls, and around window reveals.

Furniture moved a few centimetres away from an external wall for those weeks is a cheap intervention, and it is the difference between a wall that dries and a wall that grows a patch of mould behind a wardrobe nobody can see.

## Sizes of hole and their repairs

Holes divide into three practical sizes, and each has its own repair.

A pinhole or a small fixing hole is filled with compound and touched with a patch of covering if one is available. A hole up to a hand's width is patched with board, taped and finished, then re-covered from a spare length cut in at a seam. A larger hole, or one that has damaged the board behind, means replacing the affected sheet entirely.

Deciding which of the three applies before starting is what prevents a small hole from becoming a wall-wide repair.

## The re-covering cycle

Re-covering is the planned maintenance event, and its timing is set by the room rather than by the calendar.

Living areas last roughly a decade. Kitchens, bathrooms and entrance areas, with their moisture and traffic, last less. A covering that has begun to lift at the seams, has faded unevenly, or has been patched more than once is due.

The decision is economic rather than technical: a wall of patched patches reads as tired even when every patch is sound, and the cost of re-covering a room is modest compared with the effect.

## Fixing heavy items safely

Heavy items need the frame, and finding it is part of the job.

Battens and posts are located with a detector or from the installation record, and the fixing is chosen to reach them. A television bracket, a shelf carrying books or an air-conditioning unit fixed into board alone will come down, and it will take the covering and part of the board with it.

Where the frame is not where it needs to be, a plywood pattress fixed behind the board before the wall is closed is the proper solution, which is why heavy items are worth deciding before the wall is built.

## Ventilation maintenance

The ventilation system is part of the wall's moisture control, and maintaining it is part of maintaining the wall.

Filters are cleaned on the schedule the unit specifies, ducts are checked for disconnection, and the system is left running rather than switched off in spring. A house with a modern wall assembly and a switched-off fan is a house with a wall that will eventually show it.

The check takes minutes twice a year and it does more for the wall than any cleaning product.

## What to keep and what to record

Keep a spare length of the covering, the product name and batch, the board type, and the date each room was finished.

Record the locations of the battens and any fixing that carries a heavy load. Those notes are what make a future repair a small job, and their absence is what turns a pinhole into a wall.

## Small tools for small repairs

A householder can do most of the routine work with a short list: a sharp blade with a straightedge, a filling knife, a sanding block, a sponge, a mild detergent, a spare length of covering and a small tin of the correct compound.

With those, a fixing hole is filled and covered in twenty minutes. Without them, the same hole waits until the next re-covering, which is how walls accumulate a history of small damages that nobody then wants to repair individually.

## What maintenance is really for

Maintenance on this wall is not about keeping it looking new. It is about keeping the wall dry.

Every task in this article either removes moisture, restores a surface that moisture has damaged, or improves the building's ability to dry. The appearance follows from that, which is why a wall kept dry looks well maintained even when nothing has been redecorated for years.

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
