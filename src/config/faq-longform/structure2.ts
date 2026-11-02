import type { LongFormArticle } from "@/config/faq-longform";

export const STRUCTURE2_LONGFORM: Record<string, LongFormArticle> = {
  reinforcement: {
    description: `Reinforcement is measured in weight, and weight comes from three facts about each bar: its diameter, how many there are and how long each one is. A bar schedule already contains those, which is why the tool asks for the schedule rather than for a percentage of concrete volume.

That distinction matters commercially. A rate per cubic metre of concrete for reinforcement is a guess that hides the design, and it is wrong in both directions on different jobs. Counting actual bars tells you what to buy, what to cut and what to bend, and the total in kilogrammes is the figure a fabricator quotes from. Where a bar is entered without a length, the tool reports it rather than assuming an overlap.`,
    functions: [
      "Calculates bar weight from diameter, length and count, using the unit mass of each bar size.",
      "Summarises the schedule by diameter, which is how steel is ordered and how a bending schedule is grouped.",
      "Handles multiple bar marks, so a slab, a beam and a column can be scheduled together.",
      "Applies a cutting and lapping allowance only as a percentage you set, with its size visible.",
      "Converts weight to length where a fabricator quotes by the metre instead of the tonne.",
      "Reports a bar mark without a length or a count as incomplete.",
    ],
    worked:
      "Twenty five bars of sixteen millimetre at seven metres weigh sixteen millimetre bar at about one point five eight kilogrammes per metre, so eleven kilogrammes each, and two hundred and seventy six in total. Thirty bars of twelve millimetre at five metres come to about four point four four kilogrammes each, so a hundred and thirty three. Together the schedule is just over four hundred kilogrammes, and with a five percent lap allowance about four hundred and twenty. Nothing in that total came from the concrete volume, which is why it can be checked bar by bar.",
    advantages: [
      "Weight follows the schedule, so the order matches what will be cut.",
      "The summary is by diameter, which is how steel is sold.",
      "Lapping is an allowance you control rather than a hidden loading.",
      "Weight converts to length for fabricators who quote by the metre.",
      "An incomplete bar mark is reported rather than closed with an assumption.",
    ],
    limits: [
      "It does not design reinforcement, laps, anchorage or curtailment.",
      "It does not check bar spacing against the element's dimensions.",
      "It does not include binding wire, spacers or chairs beyond what you add.",
      "It does not include cutting, bending, delivery or fixing labour.",
      "It does not replace the designer's bar bending schedule.",
    ],
    answers: [
      `A bar schedule. For each bar mark the tool needs a diameter, a length and a number of bars, which is exactly what a bending schedule already states. From those three it calculates the weight using the unit mass of that bar size, sums the marks by diameter, and returns a total in kilogrammes. If you have a drawing without a schedule, the schedule has to be made first, because the weight cannot be inferred from the concrete.`,
      `Diameter gives the unit mass, and the mass multiplied by the length gives the weight of one bar, and that multiplied by the count gives the bar mark's total. A sixteen millimetre bar is about one point five eight kilogrammes for every metre, so a seven metre bar is eleven kilogrammes. The unit masses are physical properties of the bar, not market prices, so the arithmetic is the same wherever the steel is being bought.`,
      `The common diameters from six millimetres to thirty two, which covers most building work. Ranges beyond that depend on the supplier, and where a bar size is not in the list it can still be entered by its unit mass. Grade matters for strength but not for weight, so a schedule in a higher grade weighs the same as one in a lower grade, which is why the tool asks for diameter rather than grade.`,
      `Binding wire is not included, and neither are spacers, chairs or tying labour. They are real costs and they are usually priced per tonne of reinforcement or as a separate sundries line. The estimate covers the bar weight from the schedule, which is what the fabricator quotes and what arrives on the lorry. Adding a wire percentage would be inventing a figure whose basis nobody could check later.`,
      `No. It measures the bars you specify. How much steel an element needs, where laps fall, how bars are anchored and curtailed are design decisions that come from the structural engineer's calculations. The tool's value is that it turns a finished schedule into a weight, a cost and an order, and it is deliberately incapable of deciding the schedule itself.`,
    ],
  },
  waterproofing: {
    description: `Waterproofing is bought by area, by coat and by detail. A tanking membrane, a cementitious coating and a liquid applied system all cover a stated area per unit, all need more than one coat, and all need tape and reinforcement at the corners and junctions where water actually gets in.

The calculator handles those three separately because they fail separately. The area gives the bulk material, the coats multiply it, and the details are counted from the junctions you list. Where the area of a detail is not measured, it is reported, because a waterproofing estimate with an unmeasured wet room corner is an estimate that has left the hardest part out.`,
    functions: [
      "Calculates material from the treated area and the coverage the product states, per coat.",
      "Multiplies by the number of coats you specify, showing the per coat and total quantities separately.",
      "Counts tape and reinforcement from the junctions, corners and pipe penetrations you list.",
      "Separates liquid applied, sheet membrane and cementitious systems, since their coverage and detailing differ.",
      "Applies the waste allowance you set to the sheet materials, where cutting produces offcuts.",
      "Reports an area left blank as missing rather than treating it as zero.",
    ],
    worked:
      "A bathroom with twelve square metres of floor and eighteen of wall to be tanked is thirty square metres of treated area. A liquid system at one point five kilogrammes per square metre per coat, in two coats, needs forty five kilogrammes per coat and ninety in total. Tape for the floor to wall junction runs the room perimeter, fourteen metres, plus the internal corners, plus two pipe collars. A sheet membrane instead needs the same area in square metres of membrane with laps, and its tape only at the joints. The same room, two systems, two different orders, and both from the same measured area.",
    advantages: [
      "Coats are applied explicitly, so a two coat system is not priced as one.",
      "Details are counted from junctions, which is where failures happen.",
      "Systems are kept apart, so coverage is not carried across products.",
      "Sheet waste is a stated percentage for the cuts at corners and upstands.",
      "A blank area is treated as missing, not as nothing to do.",
    ],
    limits: [
      "It does not guarantee the detail is watertight, which depends on workmanship and preparation.",
      "It does not design the system or select a product for the substrate.",
      "It does not include drainage falls, screeds or protection boards.",
      "It does not include testing, and it does not cover remedial work.",
      "It does not assess the structure or the movement the detail has to accommodate.",
    ],
    answers: [
      `Liquid applied coatings, sheet membranes and cementitious systems, each with its own coverage and detailing. The one you choose follows from the substrate, the water pressure and what will be laid over it, and that is a specification decision. The calculator asks which family you are using, because a sheet membrane is ordered in square metres with laps and a liquid is ordered in kilogrammes per coat.`,
      `Coverage per coat from the product, multiplied by the area, then multiplied by the number of coats you enter. Both figures are shown, because the per coat number is what tells you whether a tin is enough for one pass and the total is what you order. Coats are never assumed: a two coat system specified by a manufacturer and applied as one coat is the most common way a waterproofing job fails.`,
      `Both are counted from the details you list rather than from the area. Tape goes at the floor to wall junctions, the internal and external corners and the pipe penetrations, which means a small bathroom can need more tape than its area suggests. Sheet membranes also need their joints taped. Reinforcement fabric goes where movement is expected, and the calculator counts it from the runs you describe.`,
      `A blank area is reported as missing and left out of the total, so an incomplete scope is visible rather than invisible. Treating a blank as zero is how a tanking estimate comes to look complete while missing a wall. The same applies to a detail with no length, which is reported rather than assumed to be a metre.`,
      `No. It calculates materials for a system you have specified. Whether the detail is watertight depends on the substrate, the preparation, the number of coats actually applied, the laps and the workmanship, and none of those can be verified from a quantity. What the estimate does is make sure the material to do the job properly is on site, which is the part that can be arranged in advance.`,
    ],
  },
  "painting-estimator": {
    description: `The paint calculator answers how much paint a room needs. The painting estimator answers what the job costs, which is a different question with more lines: preparation, ceilings, trim, the difference between theoretical coverage on paper and what a painter actually gets out of a tin.

That difference is why the page shows two quantities. Theoretical coverage is the product's stated spread rate multiplied by the area and the coats. Practical quantity adds the losses that real work has: roller retention, cutting in, porous surfaces and the second pass over a patch that did not cover. Showing both is what stops a job being ordered at the theoretical figure and running out two thirds of the way through.`,
    functions: [
      "Calculates paint from the area, the coats and the product's stated coverage, showing the theoretical and practical quantities separately.",
      "Treats ceilings as their own surface, with their own product and their own area.",
      "Counts trim, doors and frames as their own items, since they are measured by length or by unit rather than by area.",
      "Adds preparation products, such as filler, primer and sanding, where you specify them.",
      "Applies the practical loss percentage you set, so the gap between theory and site is visible.",
      "Reports a surface entered without dimensions as incomplete.",
    ],
    worked:
      "A flat with a hundred and eighty square metres of wall and sixty of ceiling, in two coats at twelve square metres per litre, is theoretically thirty litres of wall paint and ten of ceiling paint. Add a practical loss of ten percent and the order becomes thirty three and eleven, which is the difference between finishing with a part tin and going back for more. Trim at forty metres of skirting and twelve doors is priced by length and unit, not by area, and two of the doors need a primer coat because they are bare timber.",
    advantages: [
      "Theoretical and practical quantities are both shown, so the loss is visible and adjustable.",
      "Ceilings, walls and trim are measured by their own rules.",
      "Preparation products are priced as lines rather than absorbed into a trowel rate.",
      "Doors and frames are counted rather than converted to an area.",
      "An unfinished surface is reported as incomplete.",
    ],
    limits: [
      "It does not assess the condition of the surface or specify a coating system.",
      "It does not include labour, access equipment or masking.",
      "It does not judge colour coverage, which is a product property.",
      "It does not include exterior systems with different products and exposure.",
      "It does not include decoration of specialist substrates.",
    ],
    answers: [
      `Scope and cost rather than a single quantity. The paint calculator gives litres for a room. The estimator covers walls, ceilings, trim, doors and preparation separately, each measured by its own rule, and shows theoretical against practical quantities so the losses that site work produces are visible. It is the same arithmetic underneath, applied to a whole job instead of one surface.`,
      `Because theoretical coverage assumes a perfect substrate and a perfect applicator. The product states a spread rate on a prepared, sealed surface, and a real wall takes more: porous plaster absorbs, cutting in uses paint that never reaches the wall, and a roller holds a litre that never leaves it. Practical quantity applies the loss percentage you set to the theoretical figure, and showing both means the difference can be argued about rather than discovered.`,
      `As its own surface, with its own area and often its own product. A ceiling takes a matt emulsion in most specifications, and it may need a different preparation from the walls. Measuring it separately means the ceiling quantity can be ordered and priced on its own, which matters on a job where ceilings and walls are being decorated at different times or by different people.`,
      `Colour does not change the quantity in the arithmetic, and surface condition does, through the coats you specify and the preparation you list. A sharp colour change usually needs an extra coat, which is a decision you make and enter. A porous or patched wall needs sealer or primer, which is a separate product with its own coverage. The tool does not decide either; it prices what you decide.`,
      `From the product record for the paint you select, not from an assumed spread rate. Where a product has no stated coverage, the page asks for the figure rather than substituting a typical one, because coverage varies widely between a premium emulsion and a contractor grade product in the same tin size. That is also why the estimate is honest about the gap between the stated coverage and the practical one.`,
    ],
  },
  "concrete-takeoff-calculator": {
    description: `A slab takeoff is a volume with a waste allowance and a mix, and the arithmetic is trivial until the thickness matters. Thickness is the input that moves everything: a slab at a hundred and fifty millimetres is half the concrete of one at three hundred on the same plan, and every tonne of sand and aggregate follows it.

The takeoff measures the slab you describe, including thickenings under load bearing walls where you enter them, and converts the volume into cement, sand and aggregate at the mix you specify. Reinforcement is not included, because it is measured from a bar schedule rather than from a slab area, and the tool says so rather than adding a percentage of steel that nobody could check.`,
    functions: [
      "Calculates slab concrete from the area and the thickness you enter, with a waste allowance as its own line.",
      "Adds beam thickenings and poured edges from the runs and sections you describe.",
      "Converts the volume into cement, sand and coarse aggregate at the mix you select.",
      "Expresses cement in the bag size sold in your market, with sand and aggregate by volume or tonne.",
      "Separates slabs from footings and columns, so a pour can be ordered in stages.",
      "Reports a slab without a thickness as incomplete rather than assuming a depth.",
    ],
    worked:
      "A slab of eighty square metres at a hundred and fifty millimetres is twelve cubic metres. Two thickenings of nine metres at three hundred wide by four hundred deep add two point one six, so fourteen point one six in total, and fifteen with waste. At a one to two to four mix that is roughly four and a third cubic metres of cement, eight point two of sand and sixteen of aggregate, converted to bags and tonnes for the market you are building in. The reinforcement for that slab is a separate schedule, and the takeoff does not attempt it.",
    advantages: [
      "Thickness is an input, so a deeper slab shows its full material cost.",
      "Thickenings and poured edges are measured rather than absorbed into the area.",
      "Concrete splits into ingredients from the mix you specify.",
      "Pours can be ordered in stages because elements stay on separate lines.",
      "An incomplete slab is reported instead of being given a typical depth.",
    ],
    limits: [
      "It does not design the slab, its thickness or its reinforcement.",
      "It does not include reinforcement, which is measured from a bar schedule.",
      "It does not include formwork, membrane, hardcore or insulation.",
      "It does not include pumping, placing, finishing or curing.",
      "It does not determine tax or levies, which appear only where configured.",
    ],
    answers: [
      `Area multiplied by thickness, plus any thickenings and poured edges you describe, plus a waste allowance. The takeoff does that from the dimensions you enter and shows the volume before and after waste, because a checking engineer wants to see both. The volume then converts into cement, sand and aggregate at the mix you select, in the units your market sells, so the order is in bags and tonnes rather than cubic metres of concrete that nobody delivers.`,
      `Because volume is area times depth, so the depth multiplies the entire order rather than adding to it. Going from a hundred to a hundred and fifty millimetres on the same eighty square metre slab adds four cubic metres of concrete, and with it a tonne and a half of cement and several tonnes of aggregate. That is why a slab depth is a design decision with a material consequence, and why the page will not assume one for you.`,
      `Yes, where you enter them. A thickening under a load bearing wall or a poured edge at the perimeter is a run with a width and a depth, and the takeoff adds its volume to the slab rather than ignoring it. Most slab estimates that come out short are short on exactly these details, because the area was measured and the edges were not.`,
      `No. Reinforcement is measured from a bar schedule, by diameter, length and count, which is a different calculation with a different unit. A percentage of concrete volume is a rule of thumb that produces a figure nobody can check against the design. The takeoff says plainly that the steel is separate, and the reinforcement tool measures it properly.`,
      `No. It measures materials for a slab whose thickness and reinforcement have been designed. Span to depth ratios, loading, restraint and crack control all belong to a structural engineer, and a slab that is under designed does not fail politely. The takeoff's job is to turn a decided design into concrete, sand and aggregate that can be ordered and poured.`,
    ],
  },
  "earthworks-cut-fill": {
    description: `Cut and fill is the discipline of moving soil from where there is too much to where there is too little. The two volumes are calculated separately, because they behave separately: soil dug out of the ground gains volume, and soil placed and compacted loses it, so a site that balances on paper rarely balances in a lorry.

The calculator computes cut from the areas and depths you enter and fill from the areas and depths you need, then applies bulking to the cut and compaction to the fill so the two can be compared honestly. Where they do not balance, the difference is a quantity of soil that has to be imported or removed, and that is the number the earthworks budget actually turns on.`,
    functions: [
      "Calculates cut volume from the areas and depths of each excavation you describe.",
      "Calculates fill volume from the areas and depths of each area to be raised.",
      "Applies a bulking factor to cut material, since excavated soil occupies more space than it did in the ground.",
      "Applies a compaction factor to fill, since placed soil occupies less.",
      "Reports the balance between cut and fill, as a surplus to remove or a deficit to import.",
      "Calculates haulage from the volume and the capacity of the vehicle you specify.",
    ],
    worked:
      "A site with a hundred and twenty cubic metres of cut and ninety of fill does not have thirty cubic metres spare. At a bulking factor of one point two five the cut is a hundred and fifty loose, and at a compaction factor of zero point nine the fill needs a hundred in its placed state, so the surplus is fifty cubic metres to remove rather than thirty. At eight cubic metres a lorry that is seven loads, not four. The two factors are what turn a balanced site into a haulage order.",
    advantages: [
      "Cut and fill are kept apart, so the balance is a real comparison rather than a subtraction of raw numbers.",
      "Bulking and compaction are explicit, so their effect can be seen and adjusted.",
      "The surplus or deficit is reported in loose volume, which is how it is moved.",
      "Haulage is calculated from the vehicle capacity you specify.",
      "Depths are inputs, so a change of formation level shows its cost immediately.",
    ],
    limits: [
      "It is not geotechnical advice, and it does not assess soil class or bearing capacity.",
      "It does not design levels, slopes, retaining or drainage.",
      "It does not include compaction plant, testing or layer thicknesses.",
      "It does not include disposal charges, permits or contaminated soil handling.",
      "It does not verify the survey the areas came from.",
    ],
    answers: [
      `Area multiplied by depth for each excavation and each area to be raised, then adjusted for how soil behaves when it is moved. The calculator takes each area and depth you enter, sums the cut and the fill separately, and applies bulking to the former and compaction to the latter. What it will not do is assume a factor: both are inputs, because they vary with the soil and the method.`,
      `Because excavated soil occupies more space than it did in the ground, and compacted fill occupies less. Adding the two raw volumes and subtracting one from the other produces a balance that no lorry can achieve. Keeping them separate lets each be adjusted by its own factor, and the difference between them becomes a real quantity of soil to import or remove, which is the number the haulage is priced on.`,
      `Bulking accounts for the increase in volume when soil is disturbed, which is why a cubic metre of cut becomes more than a cubic metre in a lorry. Compaction accounts for the reduction when fill is placed in layers and rolled, which is why a cubic metre of fill needs more than a cubic metre of loose material to achieve it. Both are properties of the soil and the method, so both are yours to enter rather than defaults the tool invents.`,
      `Haulage is calculated from the volume to be moved and the capacity of the vehicle you enter, in loads. What is not included is the distance, the rate per load or the time, because those are commercial terms rather than quantities. You get the number of loads, which is the figure a haulier quotes against, and the surplus or deficit that decides whether they are taking soil away or bringing it in.`,
      `No. It is a volume calculation for a site whose levels have been designed. Soil classification, bearing capacity, slope stability, groundwater and contamination are geotechnical questions, and the factors you enter are assumptions that a geotechnical assessment would confirm or correct. Use the takeoff to price the movement you have designed, and use a geotechnical engineer to decide what can be moved and where it can go.`,
    ],
  },
};
