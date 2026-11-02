import type { LongFormArticle } from "@/config/faq-longform";

export const STRUCTURE_LONGFORM: Record<string, LongFormArticle> = {
  "foundation-calculator": {
    description: `A foundation estimate comes down to three quantities and one warning. The concrete in the footing, the blocks in the wall above it, and the mortar that holds them, plus a clear statement that none of it is a design. Everything the tool does follows from the dimensions you supply, and nothing is inferred from a building type, a plot size or a habit.

The warning matters as much as the arithmetic. Footing width, depth and reinforcement follow from the load and the ground, which are engineering questions answered by a soil report and a structural design. Once those dimensions exist, the material quantity is simple multiplication, and that is the part this tool owns. When the dimensions do not exist yet, the honest output is a request for them.`,
    functions: [
      "Calculates footing concrete from the length, width and depth of each footing run you enter, with a waste allowance as its own line.",
      "Calculates blockwork from the wall length, height and block size, deducting the openings you list.",
      "Calculates mortar volume from the joint thickness, block size and the wall area the blocks fill.",
      "Expresses cement in the bag size sold in the market you select, with sand by volume, from the mix you specify.",
      "Keeps the strip footing, the column bases and the blockwork on separate lines, so each can be checked against the drawing independently.",
      "Reports a dimension left blank as missing instead of substituting a typical value.",
    ],
    worked:
      "A strip footing one hundred and twenty metres in total run, six hundred millimetres wide and two hundred deep, needs fourteen and four tenths cubic metres of concrete. Add five percent waste and that becomes fifteen cubic metres, which in a one to two to four mix is roughly four and a third cubic metres of cement, eight and two thirds of sand and seventeen and a third of coarse aggregate, expressed in the bag size your market sells. A block wall of one hundred and twenty metres at nine hundred millimetres high is a hundred and eight square metres, and with a block of four hundred and fifty by two hundred and twenty five millimetres each covers just over a tenth of a square metre, so about a thousand and seventy blocks before openings and waste. The two numbers are separate purchases and separate deliveries, which is why they are separate lines.",
    advantages: [
      "Footing concrete and blockwork are measured independently, so each can be checked against its own drawing detail.",
      "Cement follows the bag size sold where you are building, which keeps the order usable across markets.",
      "Openings are deducted with their dimensions, which is where a wall estimate usually over orders.",
      "A blank dimension is reported as missing, so an incomplete drawing is visible before material is ordered.",
      "The tool states plainly that it does not design, which keeps the engineering question with the engineer.",
    ],
    limits: [
      "It does not size footings, columns or reinforcement, and it will not infer them from a building description.",
      "It does not assess ground conditions, bearing capacity or water.",
      "It does not include formwork, hardcore, blinding, damp proofing or excavation.",
      "It does not include the setting out or the labour to place the concrete.",
      "Tax is not determined here, and it appears only where a configured rule applies to your market.",
    ],
    answers: [
      `Multiply each footing run's length, width and depth, add the runs, then add the waste allowance you work to. The calculator does that from the dimensions you enter and shows the total before waste as well as after, so a checking engineer can see both. Cement, sand and coarse aggregate then follow from the mix you specify, expressed in the bag size and the units your market sells, so the order is something a supplier can price.`,
      `Take the wall length, multiply by the height, divide by the face area of the block you are using, then deduct the openings and add waste. The calculator works from the block size you specify, which matters because a four hundred and fifty by two hundred and twenty five millimetre block and a four hundred and forty by two hundred and fifteen millimetre block do not cover the same area. Mortar follows the joint thickness and the wall area, so a thinner joint reduces both the mortar and the cement in it.`,
      `No, and it says so on the page. Footing width, depth and reinforcement are structural design decisions that follow from the load and the ground, and a quantity tool cannot make them. When those dimensions come from your engineer, this tool converts them into a material order. When they do not exist yet, the useful next step is a soil report and a design, not a guessed footing width.`,
      `No. Formwork, hardcore, blinding, damp proofing and excavation are separate items with their own quantities, and they are usually priced by a different trade. The estimate covers the concrete and the blockwork, which are the two materials you need to order before the first pour. Adding formwork to a concrete quantity produces a figure that reads as complete while leaving several real costs out of it.`,
      `No. Tax is not determined in this estimate. Where a configured tax rule applies to your market, it appears as its own line with the basis stated; where no rule applies, the total is shown without tax rather than with an assumed percentage. That matters when you are comparing quotes from different regions, because a figure with an invented tax rate cannot be compared with one without it.`,
    ],
  },
  "structural-calculator": {
    description: `A structural takeoff is a schedule, not a design. Slabs, beams, columns, footings and walls are each measured from their own dimensions, and the totals roll up by material so the steel order and the concrete order are separate documents. The tool holds that shape because a concrete frame is bought as materials, not as elements.

What it will not do is decide the size of anything. A beam is measured at the depth it was designed to, a slab at its designed thickness, and the reinforcement counted in the diameters and lengths on the bar schedule. Those are the inputs. The output is the concrete volume, the formwork area where you ask for it, and the reinforcement weight by diameter, which is what a supplier and a fixer both work from.`,
    functions: [
      "Measures each element type from its own dimensions: length, breadth and depth for a slab, section and length for a beam or column.",
      "Rolls the totals up by material, so all the concrete is one figure and all the reinforcement is another, while each element keeps its own line.",
      "Calculates reinforcement weight from bar diameter, length and count, using the unit mass of the bar size.",
      "Converts concrete volume into cement, sand and coarse aggregate from the mix you specify.",
      "Expresses cement in the bag size sold in your market, and keeps sand and aggregate by volume or by tonne as you prefer.",
      "Reports an element with a missing dimension as incomplete, instead of closing it with a typical value.",
    ],
    worked:
      "A slab ten metres by eight at a hundred and fifty millimetres is twelve cubic metres. Two beams six metres long at three hundred by six hundred add two and two tenths cubic metres. Six columns three metres high at three hundred by three hundred add one and six tenths. The total is close to sixteen cubic metres of concrete, and at a one to one and a half to three mix that is roughly five cubic metres of cement, seven and a half of sand and fifteen of aggregate, in bags and tonnes for your market. Reinforcement comes separately: twenty five bars of sixteen millimetre at seven metres, plus thirty of twelve millimetre at five metres, converted to kilogrammes by bar mass and summed by diameter, so the steel order is a schedule a fabricator can cut from.",
    advantages: [
      "Elements stay separate and materials roll up, which is the shape both a checking engineer and a supplier need.",
      "Reinforcement is summarised by diameter, so the bar order matches how steel is sold.",
      "Concrete splits into ingredients from the mix you set, instead of a single volume nobody can order.",
      "Missing dimensions are reported rather than filled, which prevents an incomplete drawing becoming an incomplete pour.",
      "Cement follows the market's bag size, so the same schedule works in different countries.",
    ],
    limits: [
      "It does not size members, calculate loads or check deflection.",
      "It does not design reinforcement, laps or anchorage, and it measures the bars you specify.",
      "It does not include formwork unless you ask for it, and it does not design the falsework.",
      "It does not replace a bar bending schedule from the designer.",
      "It does not include labour, pumping, testing or curing.",
    ],
    answers: [
      `It measures concrete and reinforcement for the elements you describe. Each slab, beam, column, footing or wall is entered with its own dimensions, and the quantities roll up by material. Reinforcement is counted by bar diameter, length and number, then converted to mass using the unit weight of that bar size, which is how a steel order is placed. What it does not do is decide the dimensions: those come from the structural design, and the schedule assumes they are already fixed.`,
      `From you, and from the drawing you are reading. The length, breadth and depth of each element are entered as they appear on the design, and the bar schedule supplies the diameters and lengths for reinforcement. The tool does not scale a drawing or infer a section from a span, because a takeoff built on inference is a takeoff that cannot be checked. Where a dimension is missing, it is reported as missing so the gap is closed on the drawing before anything is ordered.`,
      `No. It is a material schedule, which is a different document from a design. Sizing members, calculating loads, checking deflection and detailing reinforcement are engineering work, and the tool assumes that work is done. The value it adds is turning a finished design into quantities and an order that can be placed, checked and audited, which is where most of the arithmetic and nearly all of the clerical error live.`,
      `From the mix you specify, in proportions by volume, converted to the bag size sold in your market. A one to one and a half to three mix and a one to two to four mix give noticeably different cement content for the same concrete volume, so the mix is an input rather than a default. Sand and aggregate are then expressed by volume or by tonne, and cement by bag, because that is how each is bought at a merchant in most markets.`,
      `Yes, and they should be, because a frame is placed and poured in sequence rather than in one operation. Each element keeps its own line with its own dimensions and quantity, and the materials roll up across the whole set. That way a slab can be ordered for one pour and columns for another, while the totals still tell you what the whole frame needs. Mixing everything into a single volume loses the sequence and makes a partial pour impossible to price.`,
    ],
  },
  "screeding-calculator": {
    description: `A screed estimate is a volume calculation wearing an area costume. The floor area is what you measure, but the order is sand and cement, and those follow the depth. That is why thickness is the first input the tool asks for and why a change from forty to seventy millimetres changes the material by three quarters on the same floor.

The other half of the job is where the screed sits. A floor screed is ordered by volume, a wall render by area at a stated thickness, and a wearing surface over a sound base is thinner than a levelling screed over an uneven one. Keeping those cases apart is what stops a floor being priced at a render rate and a wall being ordered by the cubic metre.`,
    functions: [
      "Calculates screed volume from the floor area and the thickness you enter.",
      "Converts volume into sand and cement from the mix ratio you specify, with cement in the bag size sold in your market.",
      "Measures wall render separately, by area at the thickness you state, so the two do not share a rate.",
      "Applies your waste percentage as a stated line rather than a loading on the sand price.",
      "Keeps the floor finish, such as tile or paint, out of the screed quantity, since it is a separate product and a separate order.",
      "Reports a blank thickness as missing, because the volume cannot be calculated without it.",
    ],
    worked:
      "A floor of sixty square metres at fifty millimetres needs three cubic metres of screed. At a one to four mix by volume, that is six tenths of a cubic metre of cement and two and four tenths of sand, which in bags of fifty kilogrammes is roughly nine hundred kilogrammes of cement, or eighteen bags, and about four tonnes of sand once its density is applied. Take the same floor to seventy five millimetres and the volume rises to four and a half cubic metres, the cement to twenty seven bags, and the sand to six tonnes. Same floor, same mix, no change in the drawing's intent, and a third more material, which is why thickness cannot sit inside a trade rate.",
    advantages: [
      "Thickness is an input, so a deeper screed shows up as the material it consumes.",
      "Sand and cement are ordered in the units they are sold in, bags and tonnes, not as a bare volume.",
      "Floor screed and wall render stay separate, which keeps their rates from being blended.",
      "Waste is visible, so a rough base can be given the allowance it needs.",
      "The floor finish is excluded, so the screed quantity is not inflated by the tile that sits on it.",
    ],
    limits: [
      "It does not assess the substrate, which decides whether a levelling screed is needed and how deep.",
      "It does not design the mix, and it does not specify admixtures or reinforcement mesh.",
      "It does not include curing compounds, edge insulation or movement joints.",
      "It does not price labour, pumping, preparation or removal of the old floor.",
      "It does not include the finished floor covering.",
    ],
    answers: [
      `Multiply the floor area by the thickness to get a volume, then split that volume by the mix ratio into sand and cement. The calculator does both steps and expresses cement in the bag size sold in your market, with sand by volume or by tonne. Two things move the answer more than the area does: the thickness, which multiplies everything, and the mix, because a one to three screed uses noticeably more cement than a one to five for the same volume.`,
      `Between forty and seventy five millimetres is common for a levelling screed over a prepared base, with thinner sections used for a wearing surface over a sound floor. Below about forty millimetres the risk of curling and debonding rises, and above seventy five the material cost climbs quickly. Those are specification judgements, so the calculator asks for your thickness and shows what it consumes rather than choosing one for you.`,
      `No. Tile, stone, screed paint and any levelling compound above the screed are separate products with their own quantities and their own trades. The estimate covers the screed itself, which is what you order before the floor finish is even selected. Keeping them apart matters on a quotation, because a client changing the tile should not change the screed quantity, and mixing them makes that comparison impossible.`,
      `Enter the depth the specification calls for, in millimetres. If the base is uneven, the average depth is what governs the order, so measure the high and low points and use a figure that reflects the average rather than the minimum. The calculator shows the volume implied, which is the quickest way to sanity check whether the depth on a drawing meets the floor level you are trying to achieve.`,
      `Both, as separate surfaces, because they are measured and bought differently. A floor screed is a volume of sand and cement placed to a depth; a wall render is an area at a stated thickness, often with a different mix and a different finish. The calculator keeps the two apart so a wall is not ordered by the cubic metre and a floor is not priced from a render rate per square metre.`,
    ],
  },
  "build-to-roof-estimator": {
    description: `Building to roof is the stage where money runs out quietly. The frame is up, the roof is not covered, and the gap between the two is where a self build stalls. This estimator prices the work up to and including the roof covering, so the number on the page is what it takes to get a building closed and dry.

It works in the order the work happens. Footings, then blockwork with its openings deducted, then the roof structure, then the sheeting. Each stage produces its own materials, and each takes its quantities from dimensions you supply rather than from a rate per square metre of floor. What it deliberately does not do is carry on into finishes, services or joinery, because a stage estimate that runs past its stage is a number nobody can act on.`,
    functions: [
      "Calculates footing concrete and blockwork from the building's dimensions, with openings deducted and mortar calculated from the joint thickness.",
      "Calculates roof members from the span and the spacing you set, with purlins and ridges counted as runs rather than guessed.",
      "Converts roof area into sheeting at the cover width and sheet length you specify, including the end laps, so the order is in sheets.",
      "Derives the eaves perimeter from the plan you enter, which is what fascia, gutter and soffit are ordered from.",
      "Converts concrete into cement, sand and aggregate from the mix you choose, expressed in the bag size sold in your market.",
      "Stops at the roof covering, leaving every stage beyond it out of the total.",
    ],
    worked:
      "A single storey building ten metres by eight produces a hundred and ninety six metres of wall at a two point six metre height once the eaves overhang is included, less the openings you list. Blockwork for that wall, at a block covering just over a tenth of a square metre, comes to about a thousand eight hundred blocks. A pitched roof over the same plan at a thirty degree pitch gives a roof area of about a hundred and five square metres, which at a cover width of a metre and a sheet length of three metres is around forty sheets counting laps. The eaves perimeter, ten plus eight doubled, is thirty six metres, which is the fascia and gutter order. Four numbers, four deliveries, and none of them derived from the others.",
    advantages: [
      "The total is a stage total, so it answers the question a self builder actually asks before starting.",
      "Sheets are ordered by cover width and length, which is how a roofing supplier sells them.",
      "Eaves perimeter is calculated separately, so gutter and fascia are not under ordered from a roof area.",
      "Openings are deducted, which is where a wall estimate usually runs long.",
      "Mix ratios change the cement count visibly, so a leaner mix shows its saving.",
    ],
    limits: [
      "It stops at the roof covering and does not include windows, doors, finishes, services or external works.",
      "It does not design the structure, the roof pitch or the member sizes.",
      "It does not include scaffolding, plant hire or labour.",
      "It does not include gutters beyond the linear measurement, or rainwater disposal.",
      "It does not determine tax, which appears only where a configured rule applies to your market.",
    ],
    answers: [
      `A build to roof estimator prices the stages from the footings up to the roof covering: footing concrete, blockwork and mortar, roof members, sheeting and the eaves trim. It is a stage estimate, not a whole house estimate, and that boundary is the point. Builders use it to answer the question that comes before every other one, which is whether there is enough money to get the building closed and dry.`,
      `From the roof area, adjusted for pitch, then divided by the cover width of the sheet you are using and rounded up for the length of each run. Laps are part of the calculation, because a sheet that overhangs the eaves or laps the next one covers less than its nominal width. Enter the cover width the manufacturer states and the sheet length you will order, and the count comes back in whole sheets rather than square metres.`,
      `From the plan dimensions of the building, since the eaves perimeter follows the wall line plus whatever overhang you set. It is not the same as the roof perimeter at the pitch, and it is not the wall perimeter at floor level, because both differ once there is an overhang. Fascia, gutter and soffit are all ordered from this figure, which is why a roof area alone cannot produce them.`,
      `It stops at the roof covering. Windows, doors, finishes, plumbing, electrical, ceilings and external works are outside it, as are scaffolding, plant and labour. The stage boundary is deliberate: a number that runs into finishes has to make assumptions about specification, and those assumptions are where an estimate stops being checkable. The next stage is priced with its own tools on the same building dimensions.`,
      `Because cement content is a property of the mix, not of the concrete volume. A one to two to four mix and a one to one and a half to three mix produce visibly different cement quantities from the same cubic metres, while sand and aggregate move in the other direction. Change the mix on the page and the bag count moves with it, which is what lets you compare a specification change against its material cost before you commit to it.`,
    ],
  },
  "retaining-wall-calculator": {
    description: `A retaining wall holds back soil, and the forces on it come from the ground rather than from the wall. That is why this calculator asks for the soil type before it will size a footing, and why it shows the width it derived and lets you overrule it. The material quantities are the easy part. The assumption behind them is the part worth reading.

The tool measures a wall as a wall: footing concrete, the stem in blocks or concrete, weep holes and the drainage behind it. Footing width follows a rule tied to the wall height and the soil, which is a starting point rather than a design. Where the soil is unknown, the honest answer is to say so, and the page does that instead of picking a value that would look confident and be wrong.`,
    functions: [
      "Calculates footing concrete from the width, depth and length of the footing run, with the width derived from the wall height and soil type.",
      "Calculates the stem in blocks or concrete from the wall height and length, with the face area converted at the unit size you choose.",
      "Sets weep holes at a spacing along the wall and counts them, with the pipe and the filter material they need.",
      "Calculates the drainage layer behind the wall from the wall area and the thickness you specify.",
      "Shows the footing width it derived and the rule behind it, so the assumption can be checked and overridden.",
      "Reports an unknown soil type as a missing input instead of substituting a default.",
    ],
    worked:
      "A wall twelve metres long and one point eight metres high, retaining ordinary clay, derives a footing of about nine hundred millimetres wide by two hundred and fifty deep on the rule the page shows. That footing run is twelve metres by zero point nine by zero point two five, which is two point seven cubic metres of concrete, three point two with waste. The stem at one point eight metres by twelve is twenty one and a half square metres of face, which in blocks is about two hundred and ten units plus waste. Weep holes at two metre centres along the retained face give six, each with its pipe and gravel collar. Change the soil to loose sand and the derived footing widens, and the concrete rises with it, before you have changed a single dimension yourself.",
    advantages: [
      "The footing rule is visible, so the assumption can be argued with instead of trusted.",
      "The derived width can be overridden when an engineer has specified something different.",
      "Weep holes and drainage are counted, which is the part most estimates leave to the site.",
      "Soil type changes the quantity rather than sitting in a note, so its cost is visible.",
      "An unknown soil type blocks the calculation instead of hiding behind a typical value.",
    ],
    limits: [
      "It does not design the wall, and it does not check sliding, overturning or bearing pressure.",
      "It does not size reinforcement or specify the block strength.",
      "It does not assess groundwater, surcharge loads or slope stability above the wall.",
      "It does not include excavation, backfill compaction or disposal of spoil.",
      "It does not include drainage beyond the wall, such as a carrier drain or a soakaway.",
    ],
    answers: [
      `The page derives it from the wall height and the soil type, and shows both the width and the rule it came from. As a rule of thumb a footing runs between half and two thirds of the retained height, wider for weaker soils, and that is where the derived figure lands. It is a starting point for a material order, not a design. Where an engineer has specified a width, enter it and the quantities follow your figure, not the rule.`,
      `At roughly two metre centres along the retained face, with a fall to the outside, a gravel collar behind each one and a filter fabric to stop the wall silting up. The calculator counts them from the wall length and adds the pipe and the collar. Weep holes are the cheapest part of the wall and the most expensive to leave out, because a wall that cannot drain holds water and then fails, so the count is worth checking against the drawing.`,
      `No. A retaining wall is a structure that fails suddenly when it fails, and the design depends on the soil, the water, the surcharge above it and the wall's own mass. The calculator measures the materials for a wall whose dimensions have been decided, and it flags the footing rule so the decision can be checked. Use it to order concrete and blocks, and use an engineer to decide how deep, how wide and how reinforced.`,
      `It changes the footing width the page derives, and therefore the concrete and the excavation. Clay holds a steeper face than sand, and loose granular soil needs a wider base for the same height. The switch is deliberately visible rather than buried, because a wall specified for one soil and built in another is a wall whose footing is the wrong size for the ground it is actually in.`,
      `It stops and asks. An unknown soil type is reported as a missing input, because a default would produce a footing width with nothing behind it and a material order that looks finished. The useful next step is a trial pit or a soil report, and until that exists the honest output is a list of what is still unknown rather than a number that would be repeated in a quotation.`,
    ],
  },
  "soffit-gutter-cost-estimator": {
    description: `Rainwater goods are ordered by the metre and by the fitting, and both come from the roof edge rather than from the roof area. The estimator works from the eaves perimeter, adds the overhang to produce soffit area, puts downpipes where the runs justify them, and returns an order that a merchant can fill.

The three lines behave differently. Gutter and fascia follow the perimeter directly. Soffit follows the perimeter multiplied by the overhang depth, so a deeper overhang costs more without changing the roof. Downpipes follow the roof plan area and the spacing you set, which is why a long low roof can need fewer than a compact steep one of the same area. Keeping the three apart is what stops one being scaled from another.`,
    functions: [
      "Calculates the eaves perimeter from the plan dimensions and the overhang you set.",
      "Calculates gutter and fascia in metres from that perimeter, with stop ends, corners and outlets counted from the plan.",
      "Calculates soffit area from the perimeter multiplied by the overhang depth.",
      "Places downpipes from the roof plan area and the spacing you specify, counting the pipe, brackets and shoes.",
      "Applies the fall and the outlet positions you describe, so a long run is not priced as a single outlet.",
      "Reports a blank overhang as missing, because soffit area cannot be calculated without it.",
    ],
    worked:
      "A roof plan of twelve by nine metres with a six hundred millimetre overhang has an eaves perimeter of forty two metres. Gutter and fascia are forty two metres each, with four corners, two stop ends and, at a spacing of ten metres, five outlets. Soffit is forty two metres multiplied by zero point six, which is twenty five square metres of board. Downpipes at a spacing of eight metres around the perimeter give six, each with its brackets and its shoe. The roof area never entered the gutter order, which is the mistake this page exists to prevent.",
    advantages: [
      "Gutter, fascia and soffit are calculated from the edge, which is what they are bought from.",
      "Outlets and downpipes are placed by the spacing you set, not by a count per roof.",
      "Soffit follows the overhang depth, so a deeper detail shows up in the order.",
      "Corners, stop ends and shoes are counted, which is where a linear estimate runs short.",
      "A missing overhang is reported instead of assumed.",
    ],
    limits: [
      "It does not size the gutter or the downpipe, which follows from the rainfall intensity and the roof area.",
      "It does not design the falls or the drainage route beyond the outlet.",
      "It does not include the soakaway, carrier drain or connection to a sewer.",
      "It does not include the roof covering, which is measured by the roofing tool.",
      "It does not include labour, access equipment or replacement of existing goods.",
    ],
    answers: [
      `Measure the eaves perimeter, which is the wall line plus the overhang on every side, then add the fittings the run needs: corners, stop ends, outlets and joints. The estimator takes the plan dimensions and the overhang, returns the perimeter, and counts the fittings from your geometry. Gutter is not scaled from roof area, because a shallow roof and a steep roof of the same area have the same gutter and very different areas.`,
      `From the roof plan area, the perimeter and the spacing you set. Each downpipe serves a length of gutter, so a long run needs more outlets, and the catchments either side are what the pipe has to carry. The estimator places them around the perimeter at the spacing you choose and counts the pipe, the brackets and the shoe for each. Whether that spacing is adequate is a drainage calculation that depends on the rainfall intensity where you are building.`,
      `The overhang depth multiplied by the eaves perimeter. A six hundred millimetre overhang on a forty two metre perimeter is twenty five square metres of soffit board, and the same roof with a three hundred millimetre overhang is half of that. The area is a flat measure of a sloping surface only where the soffit is horizontal, which most are, and where it is raked the depth you enter is the width of the board rather than a vertical drop.`,
      `It should, when both are measured from the same plan. The fascia runs around the same eaves line that the roof edge follows, so the numbers agree once the overhang is included in both. Where they disagree, the usual cause is a roof estimate built from the roof surface at the pitch and a fascia measured from the wall line, which differ by the overhang and by the pitch.`,
      `By the length of gutter each downpipe serves. A common guide is one outlet per twelve to fifteen metres of gutter on a simple roof, closer on a valley or where two roofs meet, and always at the low end of a fall. The estimator takes your spacing and counts the pipe, but the adequacy of that spacing depends on the rainfall the roof will actually see, which varies enough by region that it is a design input rather than a default.`,
    ],
  },
  "steel-beam-calculator": {
    description: `A steel beam is bought by weight, so the calculation is a section multiplied by a length. Everything that makes it interesting sits around that multiplication: which profile, what mass per metre, how long, and what happens when the span gets long enough that the section stops being the only question.

The estimator returns the weight and the cost from a price you enter, because there is no honest default for steel in a market without a verified price book. That is a deliberate refusal, not a gap. Where the tool has a verified price it uses it; where it does not, it asks, because a made up tonne rate is the kind of number that ends up in a tender and then in an argument.`,
    functions: [
      "Calculates the mass of a beam from the profile's mass per metre and the length you enter, with the count for multiple members.",
      "Summarises the order by profile, so a mixed frame produces a schedule rather than a single total.",
      "Flags spans at the threshold where a section needs checking by an engineer, at eight metres on the default rule.",
      "Costs the steel from the price per tonne or per metre you enter, with no assumed market rate.",
      "Adds a cutting and fabrication allowance only as a percentage you set, so its size is visible.",
      "Reports a missing span or profile as incomplete instead of choosing a section.",
    ],
    worked:
      "Two beams of six metres in a three hundred by one hundred and fifty universal beam, at a mass of about forty kilogrammes per metre, come to four hundred and eighty kilogrammes plus a five percent cutting allowance, which is five hundred and four. Enter a price of one thousand per tonne and the steel is five hundred and four units of cost, with fabrication, connections and fire protection outside it. Push the same beam to nine metres and the page raises the span flag, because beyond the threshold the section is no longer something to select from a table without a check.",
    advantages: [
      "Weight is calculated from the profile rather than estimated from the length.",
      "A mixed frame produces a schedule by profile, which is what a fabricator quotes from.",
      "The span threshold is flagged in the open rather than buried in documentation.",
      "The price is yours to enter, so the cost line is traceable to a supplier rather than to an assumption.",
      "A missing input is reported, which keeps an incomplete frame from looking finished.",
    ],
    limits: [
      "It does not design the beam, and it does not check bending, shear or deflection.",
      "It does not size the section for a span, a load or a floor.",
      "It does not include connections, base plates, bolts, welds or fire protection.",
      "It does not include erection, crane hire or paint.",
      "It does not determine tax or duties, which appear only where a configured rule applies.",
    ],
    answers: [
      `Multiply the mass per metre of the profile by the length, then by the number of members. The profile's mass is a published property, so a three hundred by one hundred and fifty universal beam carries roughly forty kilogrammes for every metre of its length, and two six metre beams weigh four hundred and eighty kilogrammes before any cutting allowance. The calculator does that from the profile and length you select, and summarises the order by profile so a fabricator can quote from it.`,
      `There is no single answer, because the span depends on the load above it, the restraint the floor gives the top flange and the deflection the finish can tolerate. What the page does is flag the point at which a section stops being safely selectable from a table, at eight metres on the default rule, and say so rather than return a section. Beyond that point the span is an engineering question with a real answer, and it is not one a weight calculator should invent.`,
      `Because there is no verified steel price book for most markets. A made up rate per tonne would produce a total that looks authoritative and is wrong, and a quotation built on it fails when it meets a real supplier. The tool asks for the price you have been quoted and multiplies it, so every cost on the page can be traced to a document. Where a market does have a verified price, the tool uses it.`,
      `From the design, and the tool measures what the design specifies. Depth follows the span and the load, mass follows the depth once the profile family is chosen, and the family itself follows the connection detail and what the fabricator stocks. Where two profiles work structurally, the lighter one is usually the cheaper one to erect and the heavier one the cheaper to buy, which is a commercial judgement rather than a calculation.`,
      `No. Connections, base plates, bolts, welds and fire protection are all outside the estimate, as are erection, crane hire and painting. They are priced by the fabricator and the erector, and they are often a third of the delivered cost of the steel. The estimate covers the members by profile and weight, which is the part a supplier quotes on and the part you can check with a tape measure on delivery.`,
    ],
  },
};
