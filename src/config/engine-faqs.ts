/**
 * FAQ coverage for the engine family beyond the original sixteen tools.
 *
 * Same contract as src/config/tool-faqs.ts: five questions per engine, then a
 * five section article body. The copy below is written against each engine's
 * stated inputs and its honesty contract, so nothing here claims coverage the
 * engine does not have. Anything excluded (hydraulic design, permits, hazardous
 * waste, structural design) is named in the limits rather than left to be
 * discovered later.
 *
 * Split from the main registry purely for file size. Both are merged into the
 * same FAQ index, so a reader sees one catalogue rather than two.
 */

import type { FaqCategoryId, ToolFaqGroup } from "@/config/tool-faqs";
import type { FaqArticle } from "@/config/faq-articles";

export type EngineFaqEntry = ToolFaqGroup & { article: FaqArticle };

const ENGINE_FAQ_ENTRIES: EngineFaqEntry[] = [
  {
    slug: "demolition-calculator",
    route: "/demolition-calculator",
    name: "Demolition and Debris Takeoff",
    category: "sitework",
    questions: [
      {
        q: "How is demolition debris volume worked out?",
        a: "Each element you list is measured as length by width by thickness and multiplied by its quantity, so a wall run and a slab area are counted as the solids they are. Those volumes are then bulked, because broken material takes more space than it did in place.",
      },
      {
        q: "What is the bulking factor for?",
        a: "It converts a volume in place into the volume a skip has to hold. Rubble, blockwork and concrete do not bulk by the same amount, so the factor is yours to set rather than assumed by the tool.",
      },
      {
        q: "How many skips will the job need?",
        a: "The bulked volume is divided by the skip capacity you enter and adjusted for the loading efficiency you allow, so a partially filled skip is not counted as a full one.",
      },
      {
        q: "Can I mix walls, slabs, floors and roofs in one estimate?",
        a: "Yes. Each type gets its own line with its own dimensions, and the totals roll up, so a strip out of partitions plus a slab removal stays readable.",
      },
      {
        q: "Does it cover permits, asbestos or disposal charges?",
        a: "No. Permits, hazardous material surveys and disposal classifications sit outside the tool. It measures volume and skip count; the compliance side is your responsibility and your contractor's.",
      },
    ],
    article: {
      summary:
        "Turns a strip out into a debris volume and a skip count, element by element.",
      description:
        "A demolition takeoff built on solid volumes. You list the walls, slabs, floors and roofs coming out with their dimensions and quantities, and the engine converts that into the volume of debris the job produces and the skips needed to move it.",
      functions: [
        "Measures each element as length by width by thickness, multiplied by the quantity you enter.",
        "Applies the bulking factor you set to convert volume in place into volume in a skip.",
        "Divides bulked volume by skip capacity, adjusted for loading efficiency, to give a skip count.",
        "Totals every element type into one debris volume while keeping the lines visible.",
      ],
      advantages: [
        "Skip numbers come from measured volumes rather than a guess about how many lorries a job needs.",
        "The bulking factor is a visible assumption you can correct once you see how the material breaks.",
        "Mixed strip outs stay itemised, so a change to one element does not hide in a bulk figure.",
      ],
      limits: [
        "It excludes permits, hazardous material surveys and disposal classifications.",
        "It does not price plant, labour or haulage rates.",
        "It cannot measure what you have not listed: a site survey still decides the elements and thicknesses.",
      ],
    },
  },
  {
    slug: "drainage-calculator",
    route: "/drainage-calculator",
    name: "Drainage Materials Takeoff",
    category: "sitework",
    questions: [
      {
        q: "Does the drainage tool design the falls?",
        a: "No. You enter the fall per metre for each run and the engine carries it through the schedule. Gradients are a design decision, and a tool that invented them would be handing you a liability.",
      },
      {
        q: "How are pipes counted?",
        a: "Each run is measured at the length you give it and converted to stock lengths, so the order is in pipes rather than metres. Lengths it cannot size are left visible rather than filled in.",
      },
      {
        q: "Where do inspection chambers come from?",
        a: "From the count you enter, plus the per connection allowance you set. Chambers are a layout decision, so the tool multiplies your numbers instead of placing them for you.",
      },
      {
        q: "Are bedding and surround included?",
        a: "Yes, as a separate line: bedding depth multiplied by a width factor gives the granular material under and around the pipe.",
      },
      {
        q: "Is this a hydraulic or code compliance design?",
        a: "No. It is a preliminary materials takeoff. Pipe sizing against flow, gradients to code and invert levels belong to a drainage engineer.",
      },
    ],
    article: {
      summary:
        "A preliminary pipe, chamber and bedding takeoff from the runs you measured.",
      description:
        "A gravity drainage materials estimator. Runs are entered with length, diameter and fall, and the engine returns the pipes to buy in stock lengths, the inspection chambers your count implies, and the bedding material the trench consumes.",
      functions: [
        "Converts each run length into stock pipe lengths at the diameter you specified.",
        "Carries the fall per metre through the run schedule instead of assuming a gradient.",
        "Adds inspection chambers from your count and a per connection allowance.",
        "Calculates bedding from trench depth and a width factor around the pipe.",
      ],
      advantages: [
        "Pipe is ordered in lengths a merchant sells, not in a theoretical metre figure.",
        "Falls stay your decision and stay visible, which keeps the takeoff honest.",
        "Chambers and bedding are priced as the separate items they are on site.",
      ],
      limits: [
        "It is not a hydraulic design: flow, capacity and code compliance are outside it.",
        "It does not set invert levels or draw a drainage layout.",
        "Excavation, shoring, testing and labour are separate.",
      ],
    },
  },
  {
    slug: "drywall-calculator",
    route: "/drywall-calculator",
    name: "Drywall and Stud Partitioning",
    category: "finishes",
    questions: [
      {
        q: "What does the drywall tool take off?",
        a: "Boards, studs and tracks, fasteners, jointing compound and tape, and insulation, from the partition areas you enter. Openings are deducted so a doorway is not boarded twice.",
      },
      {
        q: "Are openings deducted automatically?",
        a: "Yes, on the widths and heights you enter, with the quantity attached to each opening, so three identical doors are one line rather than three.",
      },
      {
        q: "How is framing counted?",
        a: "From the stud spacing and the wall run, which is why the spacing you choose changes the steel. Tracks follow the run rather than the area.",
      },
      {
        q: "Are screws and jointing included?",
        a: "Yes, as their own lines from planning rules, so the fixing count and the compound are visible rather than buried in a board price.",
      },
      {
        q: "Does it design the partition?",
        a: "No. Fire rating, acoustic performance and deflection are design decisions. The tool measures materials for the system you specified.",
      },
    ],
    article: {
      summary:
        "Boards, studs, tracks, fixings and jointing for the partitions you measured.",
      description:
        "A drywall and stud partitioning takeoff. Partition areas and the openings inside them become boards, studs and tracks at the spacing you work to, plus the fasteners, jointing and insulation those walls consume.",
      functions: [
        "Calculates board quantity from the partitioned area, deducting the openings you list.",
        "Counts studs from the spacing you set and tracks from the wall run.",
        "Adds drywall screws from a fixing rule and jointing compound and tape from the joint length.",
        "Separates insulation as its own line where the partition is filled.",
      ],
      advantages: [
        "Openings come off the board count, which is where drywall orders usually overshoot.",
        "Stud spacing is a visible input, so a heavier partition shows up in the steel.",
        "Fixings and jointing are itemised, so nothing is hidden in a per square metre rate.",
      ],
      limits: [
        "It does not specify a system: fire rating and acoustic performance are your design.",
        "Suspended ceilings, cornices and bulkheads are not covered here.",
        "Taping, finishing labour and decorative finishes are separate.",
      ],
    },
  },
  {
    slug: "flooring",
    route: "/flooring",
    name: "Flooring Materials Estimator",
    category: "finishes",
    questions: [
      {
        q: "Which floor coverings does it price?",
        a: "Plank and sheet coverings: laminate, vinyl and parquet, with underlay and adhesive switched on or off. Tiling has its own tools, and screeding has another, because each is bought and laid differently.",
      },
      {
        q: "How is the pack count decided?",
        a: "Area is divided by the coverage of the product you are using and rounded up to whole packs, with the waste percentage you choose. A pack you cannot split is a pack you have to buy.",
      },
      {
        q: "Why does it ask for skirting perimeter as well as area?",
        a: "Because skirting is a linear item with its own waste, and a floor area cannot tell you how many walls a room has.",
      },
      {
        q: "Is the waste percentage fixed?",
        a: "No. Laying pattern, room shape and the number of cuts decide it, so the percentage is yours and it is printed as its own line.",
      },
      {
        q: "Does it include levelling or underlay preparation?",
        a: "Underlay is included when you switch it on. Screeding and levelling compounds are separate tools, because they are measured in volume rather than area.",
      },
    ],
    article: {
      summary:
        "Plank and sheet flooring by the pack, with the skirting and underlay that go with it.",
      description:
        "A flooring materials estimator for laminate, vinyl and parquet. Floor area and skirting perimeter are entered once, and the engine returns packs, underlay, adhesive and skirting with the waste you allow, in the packaging the product is actually sold in.",
      functions: [
        "Converts floor area into packs using the product coverage you are buying.",
        "Adds the waste percentage you set for cuts and room shape.",
        "Counts underlay and adhesive when you switch them on for the chosen covering.",
        "Calculates skirting length from the perimeter, with its own waste line.",
      ],
      advantages: [
        "Pack rounding means the order matches the shelf rather than a theoretical area.",
        "Skirting and underlay are visible items, which is where a flooring quote quietly slips.",
        "Coverage comes from the product being fitted, so changing ranges changes the quantity.",
      ],
      limits: [
        "It does not measure subfloor condition, moisture or levelling, which need a separate screed or compound.",
        "It does not lay out a pattern or advise on plank direction.",
        "Removal of an old floor, trims and labour are outside it.",
      ],
    },
  },
  {
    slug: "masonry-calculator",
    route: "/masonry-calculator",
    name: "Masonry, Brickwork and Blockwork",
    category: "structure",
    questions: [
      {
        q: "Which wall types does the masonry tool cover?",
        a: "Load bearing, partition, perimeter fence, retaining and cavity walls, each with its own mortar and opening deductions. A fence is not counted as a house wall.",
      },
      {
        q: "How are openings handled?",
        a: "Every opening is deducted by width and height with its quantity, so doors, windows and vents come out of the block count rather than being added as an afterthought.",
      },
      {
        q: "Does it work outside Nigeria?",
        a: "Yes. The engine carries local cement packaging and mortar specifications across the supported markets, and it does not fall back to a single country's packaging when a market is set.",
      },
      {
        q: "Are mortar and packaging included?",
        a: "Yes: mortar volume follows the wall type and joint thickness, and cement is expressed in the bag size sold in your market.",
      },
      {
        q: "Does it check the wall structurally?",
        a: "No. It measures materials. Slenderness, lateral support and reinforcement for a retaining wall belong to an engineer.",
      },
    ],
    article: {
      summary:
        "Blocks, mortar and packaging for walls, with the openings taken out first.",
      description:
        "A masonry takeoff for load bearing, partition, fence, retaining and cavity walls. Wall runs and heights become blocks and mortar at the joint thickness you specify, with openings deducted and cement expressed in the local bag size.",
      functions: [
        "Counts blocks or bricks from the wall area, the unit size and the joint thickness.",
        "Deducts every opening by width, height and quantity before the material is counted.",
        "Calculates mortar volume from the wall type and joint, then converts it to bags of the local packaging.",
        "Applies the market's packaging and mortar convention rather than a single country default.",
      ],
      advantages: [
        "A retaining wall and a partition are priced from their own rules, not one blended rate.",
        "Opening deductions stop the common habit of quoting a wall as if it were solid.",
        "Packaging follows the market you set, which keeps the order usable on site.",
      ],
      limits: [
        "It does not design the wall: slenderness, lateral support and reinforcement are excluded.",
        "Foundations under the wall are a separate tool, as are plaster and finishes.",
        "Labour, scaffolding and plant are outside the takeoff.",
      ],
    },
  },
  {
    slug: "paving-calculator",
    route: "/paving-calculator",
    name: "Paving and Block Paving",
    category: "sitework",
    questions: [
      {
        q: "How are pavers counted?",
        a: "From the paving area, the paver size and the joint width you set, then rounded up with the waste percentage you allow for cuts along edges and around obstructions.",
      },
      {
        q: "Does the laying pattern change the quantity?",
        a: "Yes. Running bond, herringbone and basketweave cut differently, so the pattern you select changes the waste that area alone cannot express.",
      },
      {
        q: "Are bedding sand and subbase included?",
        a: "Yes, as separate depths: bedding sand and subbase are calculated from the depths you enter and converted with the compaction factor between loose and compacted volume.",
      },
      {
        q: "Are these depths design values?",
        a: "No. They are editable planning assumptions you supply, not a pavement design. Traffic loading decides real depths.",
      },
      {
        q: "Is edge restraint included?",
        a: "Edge constraints and kerbs are separate items on the paving side unless your project takes them from another tool.",
      },
    ],
    article: {
      summary:
        "Pavers, bedding sand and subbase from the area, the pattern and the depths you set.",
      description:
        "A block paving takeoff. Paving area, paver dimensions and laying pattern decide the units to buy, while bedding sand and subbase are calculated from the depths you supply and converted using a compaction factor between loose and compacted states.",
      functions: [
        "Counts pavers from area, unit size and joint width, with a waste line for cutting.",
        "Adjusts quantity expectations by laying pattern, because herringbone cuts more than running bond.",
        "Calculates bedding sand and subbase from depth and area, using the compaction factor you set.",
        "Returns sand as volume and mass using the bulk density you provide.",
      ],
      advantages: [
        "Pattern is an input rather than a footnote, which matches what happens on the ground.",
        "Compaction is a stated conversion, not a hidden 20 percent added to every tonne.",
        "Depths stay yours, so a driveway and a footpath are not given the same pavement.",
      ],
      limits: [
        "It does not design the pavement for traffic loading.",
        "Kerbs, edging, drainage and geotextile are separate items.",
        "Excavation, disposal of spoil and labour are outside it.",
      ],
    },
  },
  {
    slug: "plastering-calculator",
    route: "/plastering-calculator",
    name: "Plastering and Rendering",
    category: "finishes",
    questions: [
      {
        q: "What does the plastering tool distinguish?",
        a: "Internal plaster, external render, backing coats and waterproof renders. Each has its own thickness and mix convention, so a render is not priced as an internal skim.",
      },
      {
        q: "How is the sand and cement worked out?",
        a: "From area and thickness into a wet volume, then through the dry volume bulking and shrinkage factors to sand and cement, with cement in the local bag size.",
      },
      {
        q: "Does thickness really change the quantity that much?",
        a: "Yes, and that is the point. A 12 mm skim and a 20 mm render differ by two thirds of the material, so thickness is an input rather than a trade assumption.",
      },
      {
        q: "Are beads, scrim and bonding agents included?",
        a: "They are separate items you add. The engine measures the plaster, render and backing materials themselves.",
      },
      {
        q: "Does it allow for surface preparation?",
        a: "No. Keying, hacking off, damp treatment and bonding coats depend on the wall you are working on and are yours to judge.",
      },
    ],
    article: {
      summary:
        "Cement and sand for plaster and render, by area and by the thickness you build.",
      description:
        "A plastering and rendering estimator. It separates internal plaster from external render and backing coats, turns area and thickness into a wet volume, then applies the dry volume factors to give sand and cement in the packaging sold locally.",
      functions: [
        "Calculates wet volume from wall or ceiling area and the coat thickness you set.",
        "Converts wet to dry volume using the bulking and shrinkage factors the engine holds.",
        "Splits the result by your mix ratio into cement bags and sand volume.",
        "Treats internal plaster, external render, backing and waterproof render as separate applications.",
      ],
      advantages: [
        "Thickness is a real input, so a heavier render shows up in the sand and cement.",
        "External render is not priced on the internal plaster convention.",
        "Cement is returned in the bag size you can actually buy.",
      ],
      limits: [
        "Beads, scrim, mesh and bonding agents are separate purchases.",
        "It does not judge the substrate or order preparation work such as hacking off.",
        "Scaffolding, labour and finishing are outside the quantity.",
      ],
    },
  },
  {
    slug: "reinforcement",
    route: "/reinforcement",
    name: "Reinforcement and Bar Weight",
    category: "structure",
    questions: [
      {
        q: "What does the reinforcement tool need from me?",
        a: "Cutting lengths per bar diameter, taken from a bar bending schedule or from your own measured estimate. Lengths are never inferred, because a bar length is a drawing fact.",
      },
      {
        q: "How is the weight calculated?",
        a: "From standard unit weights per diameter, which are physical constants, multiplied by your cutting lengths, then increased by the lap, cut and waste percentages you allow.",
      },
      {
        q: "Which diameters are supported?",
        a: "Eight, ten, twelve, sixteen, twenty, twenty five and thirty two millimetre bars, including links and stirrups, which is what residential and light commercial work actually uses.",
      },
      {
        q: "Is binding wire included?",
        a: "Yes, as kilograms per tonne of bar from the rule the engine applies, so the wire appears as its own line rather than disappearing.",
      },
      {
        q: "Does it design the reinforcement?",
        a: "No. Bar diameter, spacing and lap lengths are engineering decisions. This tool converts a schedule into tonnage and money.",
      },
    ],
    article: {
      summary:
        "A bar schedule turned into tonnage, with laps and binding wire priced.",
      description:
        "A reinforcement estimator driven by the schedule. Cutting lengths per diameter become weight through standard unit weights, then lap and waste allowances, then cost, which is how steel actually leaves a merchant.",
      functions: [
        "Converts cutting length per diameter into weight using standard unit weights.",
        "Applies the lap, cut and waste percentage you set for each diameter.",
        "Calculates binding wire from kilograms per tonne of reinforcement.",
        "Shows the unit weight used for each diameter so the tonnage can be checked by hand.",
      ],
      advantages: [
        "Tonnage is computed from your schedule rather than a rate per cubic metre of concrete.",
        "Laps and waste are visible assumptions instead of being buried in the rate.",
        "The unit weights are printed, which is what makes a tonnage arguable on site.",
      ],
      limits: [
        "It does not design reinforcement or verify a schedule against a drawing.",
        "It excludes couplers, spacers, chairs and formwork.",
        "Bending, fixing labour and wastage from site handling are separate.",
      ],
    },
  },
  {
    slug: "waterproofing",
    route: "/waterproofing",
    name: "Waterproofing Materials",
    category: "finishes",
    questions: [
      {
        q: "Which waterproofing does it cover?",
        a: "Damp proof courses, damp proof membranes, wet area floors and walls, perimeters and roof or terrace treatment, each measured from the run or area you provide.",
      },
      {
        q: "How are coats and coverage handled?",
        a: "Coats per surface and coating coverage per bag are held as rules, so a two coat wet area is priced as two coats rather than one generous one.",
      },
      {
        q: "What about membranes and tape?",
        a: "Membrane roll coverage decides roll quantity, and tape follows the overlap percentage applied to the runs and perimeters you enter.",
      },
      {
        q: "What happens if I leave an area blank?",
        a: "That surface is left unsized rather than filled with a guess, so an incomplete scope reads as incomplete instead of quietly under quoted.",
      },
      {
        q: "Does it guarantee the detail is watertight?",
        a: "No. It measures materials for the areas you identify. Upstands, fillets, falls and termination details are installation quality, not arithmetic.",
      },
    ],
    article: {
      summary:
        "DPC, membrane, coatings and tape for the areas you actually identify.",
      description:
        "A waterproofing materials estimator. Instead of one rate over a floor area, it separates the six surfaces that get protected (DPC run, DPM area, wet floor, wet wall, wet perimeter, roof or terrace) and prices each from the rule that governs it.",
      functions: [
        "Prices DPC and DPM from the run and area you measure, with overlap applied.",
        "Applies coats per surface and coverage per bag to wet area floors and walls.",
        "Calculates membrane rolls from roll coverage on terraces and roofs.",
        "Applies tape quantities from the perimeter and overlap you allow.",
      ],
      advantages: [
        "A wet room and a roof terrace are priced from their own rules rather than one blended figure.",
        "Coats are counted, which is where waterproofing budgets usually fall short.",
        "Blank areas stay blank, so missing scope is visible before the quote is sent.",
      ],
      limits: [
        "It does not design the waterproofing detail: upstands, fillets and falls are site workmanship.",
        "It excludes screeds, protection boards and drainage outlets.",
        "Surface preparation and labour sit outside the material takeoff.",
      ],
    },
  },
  {
    slug: "painting-estimator",
    route: "/painting-estimator",
    name: "Painting Estimator",
    category: "finishes",
    questions: [
      {
        q: "What makes this different from the paint calculator?",
        a: "The paint calculator works from area and coverage. This engine works room by room with the product and quality level you select, so coverage comes from the product data rather than a single spread rate.",
      },
      {
        q: "Why does it show theoretical and practical quantities separately?",
        a: "Because a theoretical litre figure and a purchasable tin count are different facts. The engine always shows both, so you can see the gap between the maths and the order.",
      },
      {
        q: "How is the ceiling treated?",
        a: "As its own surface with the house rule applied, rather than being folded into wall area, because ceilings are coated differently and usually with a different product.",
      },
      {
        q: "Do colour and surface condition change the quantity?",
        a: "They raise warnings rather than silently adding percentages. A dark colour over light or bare plaster generates a flag you decide on, and any adjustment you make is recorded without overwriting the original estimate.",
      },
      {
        q: "Where does coverage come from?",
        a: "From the configured product and quality level, never a hardcoded rate. If a product has no coverage data, the engine says so instead of inventing one.",
      },
    ],
    article: {
      summary:
        "Room by room painting quantities from real product data, with warnings instead of hidden percentages.",
      description:
        "A room based painting estimator. Length, breadth and wall height give the surfaces, the product you select gives the coverage, and the engine returns theoretical and practical quantities side by side so the tin order is never confused with the maths.",
      functions: [
        "Builds wall and ceiling areas from room dimensions, deducting openings.",
        "Takes coverage from the selected product and quality level rather than a fixed rate.",
        "Reports theoretical quantity and practical purchase quantity as separate figures.",
        "Raises warnings for colour and surface conditions, and records any manual adjustment you make.",
      ],
      advantages: [
        "Product data drives coverage, so a premium paint is not estimated like a budget one.",
        "The tin count is shown next to the litre figure, which is what prevents a mid job shortage.",
        "Adjustments are recorded separately, so an experienced judgement never rewrites the base estimate.",
      ],
      limits: [
        "It does not select colours, products or finishes for you.",
        "Surface preparation, filling and priming bare substrates are your call.",
        "Spray versus brush application, access equipment and labour are outside it.",
      ],
    },
  },
  {
    slug: "structural-calculator",
    route: "/structural-calculator",
    name: "Concrete and Structural Takeoff",
    category: "structure",
    questions: [
      {
        q: "What does the structural takeoff measure?",
        a: "Concrete for slabs, beams, columns and footings from the dimensions you survey, then the cement, sand and granite that volume needs, alongside reinforcement grouped by bar diameter and length.",
      },
      {
        q: "Where do the dimensions come from?",
        a: "From you. The engine works only from explicit surveyed dimensions and schedules, because an assumed column size is a guess that ends up in a quote.",
      },
      {
        q: "Is this a structural design?",
        a: "No. It is an estimating method. Member sizes, reinforcement design and load paths belong to a structural engineer, and the tool says so rather than implying approval.",
      },
      {
        q: "How are the concrete ingredients split?",
        a: "By the mix ratio you choose, applied to the dry volume, so a stronger mix shows up in the cement line instead of being absorbed into a rate.",
      },
      {
        q: "Can I mix slabs, beams, columns and footings?",
        a: "Yes, each element type is its own line with its own dimensions and quantity, and the totals roll up by material rather than by element.",
      },
    ],
    article: {
      summary:
        "Concrete volumes and reinforcement quantities for the structural elements you survey.",
      description:
        "A structural materials takeoff. Slabs, beams, columns and footings are measured from the dimensions you survey, converted into concrete and its ingredients by the mix you intend to use, with reinforcement taken from the bar groups you provide.",
      functions: [
        "Calculates concrete volume per element from length, width and depth or section.",
        "Converts volume into cement bags, sand and granite at the mix ratio you select.",
        "Totals reinforcement by diameter and bar length so the steel order is a schedule rather than a guess.",
        "Keeps each element as its own line, so a change to one column does not disturb the slab.",
      ],
      advantages: [
        "Ingredient quantities follow the mix you actually use, which makes a stronger pour visible in the order.",
        "Element level lines mean a client question about one beam can be answered from the page.",
        "The tool refuses assumed dimensions, so nothing is invented on a drawing you have not measured.",
      ],
      limits: [
        "It is not structural design and does not size members or reinforcement.",
        "Formwork, props and temporary works are a separate tool.",
        "Labour, plant and tax sit outside the quantity, and tax is reported as undetermined.",
      ],
    },
  },
  {
    slug: "concrete-takeoff-calculator",
    route: "/concrete-takeoff-calculator",
    name: "Concrete Slab Takeoff",
    category: "structure",
    questions: [
      {
        q: "How is slab concrete calculated?",
        a: "Length by width by thickness gives the wet volume, which is increased by the waste you allow, then converted to cement, sand and granite by the mix ratio you choose.",
      },
      {
        q: "Why does the thickness matter so much?",
        a: "Because concrete is priced by volume. Fifty millimetres across a large slab is a significant quantity of cement, so thickness is an input rather than a trade assumption.",
      },
      {
        q: "Does it allow for a poured edge or beam thickening?",
        a: "Those are separate elements. A slab on its own is one rectangle of thickness; edge beams and thickenings are measured as beams so they are not double counted.",
      },
      {
        q: "Is reinforcement included?",
        a: "Not in this tool. Bar quantities come from the reinforcement tool, where you give it cutting lengths per diameter from the schedule.",
      },
      {
        q: "Does it check the slab structurally?",
        a: "No. It measures materials for a thickness you have decided. Span to depth and reinforcement design are engineering decisions.",
      },
    ],
    article: {
      summary:
        "A slab volume, its ingredients and the bags behind them, from three dimensions.",
      description:
        "A concrete slab takeoff. Length, width and thickness give the volume, the mix ratio gives the ingredients, and the waste allowance gives a purchasable order rather than a theoretical one.",
      functions: [
        "Calculates wet volume from the slab dimensions you enter.",
        "Applies the waste percentage you allow for overfill and uneven substrates.",
        "Splits the volume by mix ratio into cement bags, sand and granite.",
        "Shows the dry volume conversion behind each ingredient quantity.",
      ],
      advantages: [
        "The order is expressed in bags and trips, which is how concrete materials are bought.",
        "Mix ratio is visible, so a change of specification is a change of cost rather than a surprise.",
        "Waste is a stated line instead of a hidden loading on the rate.",
      ],
      limits: [
        "It does not design the slab or its reinforcement.",
        "Blinding, hardcore and formwork are separate items.",
        "Pumping, labour and finishing are outside the takeoff.",
      ],
    },
  },
  {
    slug: "earthworks-cut-fill",
    route: "/earthworks-cut-fill",
    name: "Earthworks Cut and Fill",
    category: "structure",
    questions: [
      {
        q: "How are cut and fill volumes calculated?",
        a: "From the surveyed levels or depths you enter against the areas they apply to, giving cut and fill separately rather than as one net figure.",
      },
      {
        q: "Why separate cut from fill?",
        a: "Because spoil has to leave the site and fill has to arrive, and neither is free. A net volume hides two movements and two costs.",
      },
      {
        q: "What are the bulking and compaction factors for?",
        a: "Excavated soil bulks when it is disturbed and compacted fill shrinks, so the engine converts between in situ, loose and compacted states using the factors you set.",
      },
      {
        q: "Can I price the haulage?",
        a: "The engine gives volumes and trips from the capacity you provide. Haulage rates and disposal charges are yours to add.",
      },
      {
        q: "Is this geotechnical advice?",
        a: "No. It measures earth from levels you survey. Bearing capacity, slope stability and soil classification are outside the tool.",
      },
    ],
    article: {
      summary:
        "Cut and fill volumes kept apart, with the bulking that decides how many trips leave site.",
      description:
        "An earthworks estimator. Levels and areas give cut and fill volumes separately, and the bulking and compaction factors convert those volumes into the loose spoil to be removed and the compacted fill to be placed.",
      functions: [
        "Calculates cut and fill volume from the areas and depths or levels you enter.",
        "Converts in situ volume to loose volume with the bulking factor you set.",
        "Converts fill to compacted volume for the layer depths you are placing.",
        "Derives load counts from the transport capacity you provide.",
      ],
      advantages: [
        "Spoil and fill are costed as two movements, which is what a site actually pays for.",
        "Bulking is an explicit assumption you can correct from the first skip or lorry.",
        "Volumes stay tied to surveyed levels rather than to a guess from a drawing.",
      ],
      limits: [
        "It is not geotechnical advice: bearing capacity and stability are excluded.",
        "It does not design drainage, retaining structures or ground improvement.",
        "Plant rates, disposal fees and compaction testing are separate.",
      ],
    },
  },
  {
    slug: "roof-framing-calculator",
    route: "/roof-framing-calculator",
    name: "Roof Framing and Board Feet",
    category: "structure",
    questions: [
      {
        q: "What does the roof framing tool measure?",
        a: "Rafters and purlins from the roof span, pitch and spacing you set, expressed as lengths and as board feet of timber, so the order matches how timber is sold.",
      },
      {
        q: "How does pitch change the quantity?",
        a: "Rafter length is the slope length, not the plan length, so a steeper roof uses more timber for the same footprint. The engine computes that rather than applying a flat factor.",
      },
      {
        q: "Why board feet as well as linear length?",
        a: "Because timber merchants price by volume. A rafter schedule in linear metres cannot be ordered; board feet can.",
      },
      {
        q: "Does it size the members?",
        a: "It gives indicative member checks as a preliminary aid, not a certificate. Span tables and structural design remain the engineer's work.",
      },
      {
        q: "Are roof coverings included?",
        a: "No. Sheets, tiles and their fixings come from the roof covering side, and the build to roof estimator carries the covering quantity.",
      },
    ],
    article: {
      summary:
        "Rafters, purlins and board feet from the span, pitch and spacing you set.",
      description:
        "A roof framing takeoff. Span, pitch, spacing and the framing arrangement you describe become rafter and purlin quantities, reported in both linear length and board feet so the timber order is usable.",
      functions: [
        "Calculates rafter length from the span and pitch rather than the plan dimension.",
        "Counts rafters and purlins from the spacing and the run they cover.",
        "Converts the schedule into board feet so timber can be ordered by volume.",
        "Reports indicative member figures as a preliminary check, clearly marked as such.",
      ],
      advantages: [
        "Slope length is computed, which is the step most roof quantities get wrong.",
        "Board feet means the number can be handed to a timber merchant unchanged.",
        "The framing arrangement is your input, so a hip and a gable are not priced the same.",
      ],
      limits: [
        "It is not a structural design or a certified member sizing.",
        "Roof coverings, battens and fixings are outside it.",
        "Access, labour and erection are separate.",
      ],
    },
  },
  {
    slug: "temporary-works-calculator",
    route: "/temporary-works-calculator",
    name: "Formwork and Temporary Works",
    category: "structure",
    questions: [
      {
        q: "What does the temporary works tool take off?",
        a: "Formwork contact areas for slabs, beams, columns and walls, plus the props and scaffold components those areas imply.",
      },
      {
        q: "How are reuse cycles treated?",
        a: "Formwork is bought once and used several times, so the reuse cycles you enter reduce the quantity of new material rather than inflating it.",
      },
      {
        q: "Why measure contact area instead of volume?",
        a: "Because formwork is priced by the surface it touches. A beam has three faces to box, a slab has one, and the areas differ completely from the concrete volume.",
      },
      {
        q: "Does it check the falsework?",
        a: "No. It is a preliminary quantity takeoff. Prop spacing, loading and stability are a temporary works design and an engineer's responsibility.",
      },
      {
        q: "Are scaffold and access included?",
        a: "The access components the takeoff covers are included as quantities. Hire rates, inspections and certificates are not.",
      },
    ],
    article: {
      summary:
        "Formwork areas and the props behind them, reduced by the reuse cycles you plan.",
      description:
        "A temporary works takeoff. Each element's contact area is measured, aggregated into formwork quantity, and adjusted by the reuse cycles you intend, alongside the props and access components the work needs.",
      functions: [
        "Calculates formwork contact area per element from its dimensions and faces.",
        "Applies the reuse cycles you enter to give the new material actually required.",
        "Counts props and access components from the areas they support.",
        "Keeps element types separate so a beam's three faces are not lost in a slab rate.",
      ],
      advantages: [
        "Reuse is treated as a real multiplier, which is how formwork is actually bought.",
        "Contact area avoids the common error of pricing formwork from concrete volume.",
        "Element separation means the boxing for a column is visible next to the slab.",
      ],
      limits: [
        "It is not a temporary works design: prop spacing and stability are excluded.",
        "It does not issue inspection or handover documentation.",
        "Hire, transport and labour for erection are outside it.",
      ],
    },
  },
  {
    slug: "foundation-designer",
    route: "/foundation-calculator",
    name: "Foundation Designer",
    category: "structure",
    questions: [
      {
        q: "What does the foundation designer produce?",
        a: "Preliminary strip, pad and raft sizing from an assumed or user entered soil bearing capacity, then the concrete and materials that sizing implies.",
      },
      {
        q: "Where does the bearing capacity come from?",
        a: "From you, either as an assumed value or from a soil report. The engine will not invent one, because bearing capacity decides the whole footing.",
      },
      {
        q: "Is the sizing certified?",
        a: "No. It is a preliminary estimate to get quantities moving. A geotechnical investigation and a structural design are required before construction.",
      },
      {
        q: "How does it differ from the foundation calculator?",
        a: "The foundation material takeoff measures concrete and blocks from dimensions you set. This one proposes the dimensions themselves from the load and the soil, which is why its limits are stricter.",
      },
      {
        q: "Can I override the suggested size?",
        a: "Yes, and you should when a site investigation says otherwise. The suggested dimensions are a starting point, and the material quantities follow whatever you settle on.",
      },
    ],
    article: {
      summary:
        "Preliminary strip, pad and raft sizing from the soil capacity you supply.",
      description:
        "A foundation sizing aid. Load and soil bearing capacity give preliminary footing dimensions for strip, pad and raft options, which then drive the concrete and material quantities for the job.",
      functions: [
        "Proposes strip, pad and raft sizes from the load and bearing capacity you enter.",
        "Uses the soil value you supply rather than a default assumption.",
        "Carries the chosen sizing into concrete volume and its ingredients.",
        "Leaves the dimensions editable so a soil report can correct the proposal.",
      ],
      advantages: [
        "Sizing starts from the load and the soil, which is the order the physics runs in.",
        "Every proposed dimension can be overridden and traced, so nothing is locked behind an assumption.",
        "Quantities follow the size you accept, so a corrected footing does not leave stale numbers.",
      ],
      limits: [
        "It is not a certified geotechnical or structural design, and no code compliance check is performed.",
        "Settlement, differential movement and reinforcement design are outside it.",
        "Excavation, dewatering and labour are separate items.",
      ],
    },
  },
  {
    slug: "septic-sizing-calculator",
    route: "/septic-sizing-calculator",
    name: "Septic and Soakaway Worksheet",
    category: "services",
    questions: [
      {
        q: "What decides the septic tank size?",
        a: "Occupants, the design flow per person per day and the retention days you set give the working volume, with a storage allowance for sludge added as its own line.",
      },
      {
        q: "Why do I have to enter the flow rate myself?",
        a: "Because it is a code and jurisdiction decision, not a physical constant. The engine will not apply one country's figure to another country's project.",
      },
      {
        q: "How is the soakaway sized?",
        a: "From the accepted soil loading rate per square metre per day and the depth you give, either as base area or sidewall area only, depending on what the ground allows.",
      },
      {
        q: "Does it issue a permit or environmental approval?",
        a: "No. It is a preliminary quantity worksheet. Permits, setbacks, groundwater separation and environmental sign off sit with your authority and your engineer.",
      },
      {
        q: "Can I work in gallons and feet?",
        a: "Yes. Both SI and US customary sizing are supported, so the same worksheet serves a metric or an imperial jurisdiction.",
      },
    ],
    article: {
      summary:
        "Tank and soakaway volumes from your occupancy, flow and soil figures.",
      description:
        "A preliminary septic and soakaway worksheet. Occupancy and design flow give the tank working volume, retention and storage allowances add the sludge space, and the soil loading rate with the soakaway depth gives the absorption area.",
      functions: [
        "Calculates working volume from occupants, design flow per person per day and retention days.",
        "Adds a storage allowance and freeboard percentage as separate labelled additions.",
        "Sizes the soakaway from the accepted soil loading rate, depth and whether sidewalls count.",
        "Works in litres and cubic metres or gallons and cubic feet.",
      ],
      advantages: [
        "Flow rate and soil loading stay your inputs, so no country's code is imposed on another's site.",
        "Storage and freeboard are visible additions rather than padding inside a volume.",
        "One worksheet serves metric and imperial markets without a conversion sheet alongside it.",
      ],
      limits: [
        "It is not a permit or environmental design: setbacks, groundwater and approvals are excluded.",
        "It does not test soil or confirm the loading rate it is given.",
        "Excavation, lining, labour and desludging are separate.",
      ],
    },
  },
  {
    slug: "insulation-calculator",
    route: "/insulation-calculator",
    name: "Insulation Takeoff",
    category: "finishes",
    questions: [
      {
        q: "What does the insulation takeoff measure?",
        a: "Area, layers and thickness for the insulation you are fitting, converted into packs at the coverage the product is sold in, with the waste you allow.",
      },
      {
        q: "Does it calculate thermal performance?",
        a: "No. It measures quantity. U values, condensation risk and code compliance are a building physics assessment, and the tool says so rather than implying a rating.",
      },
      {
        q: "How do layers affect the order?",
        a: "Multi layer build ups multiply the area rather than the thickness, because each layer is a separate purchase at the same coverage.",
      },
      {
        q: "Is pack rounding applied?",
        a: "Yes. Area is divided by the pack coverage you supply and rounded up, since a part pack is still a pack.",
      },
      {
        q: "What about vapour barriers and fixings?",
        a: "They are separate items. The engine measures insulation only.",
      },
    ],
    article: {
      summary:
        "Insulation by pack from the area, layers and thickness you are fitting.",
      description:
        "A thermal and acoustic insulation quantity takeoff. The area to be insulated, the number of layers and the product coverage decide the packs, with waste as a visible allowance rather than a hidden loading.",
      functions: [
        "Calculates insulated area from the surfaces you enter.",
        "Multiplies by layers so a two layer build up is ordered as two coverages.",
        "Divides by the pack coverage you supply and rounds up to whole packs.",
        "Applies your waste percentage as its own line.",
      ],
      advantages: [
        "Layers are counted properly, which is where multi layer specifications usually under order.",
        "Pack rounding keeps the order usable at a merchant counter.",
        "The tool is clear that it measures quantity, not thermal performance.",
      ],
      limits: [
        "It does not calculate U values, dew points or code compliance.",
        "Vapour barriers, tapes, fixings and trims are separate.",
        "Labour, access and removal of existing insulation are outside it.",
      ],
    },
  },
  {
    slug: "solar-pv-estimator",
    route: "/solar-pv-estimator",
    name: "Solar PV Estimator",
    category: "services",
    questions: [
      {
        q: "How does the solar estimator work?",
        a: "Two ways. Give it usable roof area and it fits whole panels from the configured panel size, or give it an energy target and it works back through sun hours and system losses to the panels needed.",
      },
      {
        q: "Where do panel and component figures come from?",
        a: "From configured panel models, component prices and rules. Nothing about wattage, coverage or price is hardcoded into the tool.",
      },
      {
        q: "What if a component has no price?",
        a: "It is reported as unpriced and left out of the total, rather than given an invented figure. An incomplete price list shows as an incomplete cost.",
      },
      {
        q: "Does it design the array?",
        a: "It sizes panels, inverter, mounting and cabling quantities from your inputs. String design, shading and structural fixing of the roof remain engineering work.",
      },
      {
        q: "Are sun hours and losses assumed?",
        a: "They come from configuration, and they are shown in the calculation so you can see what the energy estimate rests on.",
      },
    ],
    article: {
      summary:
        "Panels, inverter and mounting from either the roof area you have or the energy you need.",
      description:
        "A solar PV material takeoff with two entry points. Roof area fits the panels that physically go on the roof, an energy target works back through sun hours and losses to the kilowatt peak required, and both routes price the system from configured component data.",
      functions: [
        "Fits whole panels into usable roof area using the configured panel dimensions.",
        "Works back from an energy target through sun hours and system losses to panels and kWp.",
        "Adds inverter, mounting and cabling quantities from the rules that govern them.",
        "Reports any component without a configured price as unpriced rather than estimating it.",
      ],
      advantages: [
        "Two sizing routes mean a roof limited job and a load limited job are both handled honestly.",
        "Unpriced components are declared, so a quotation cannot quietly assume a price.",
        "The energy calculation is shown, so sun hours and losses can be argued with rather than trusted blindly.",
      ],
      limits: [
        "It does not design strings, earthing or roof fixing details.",
        "It does not assess shading, structural capacity or roof condition.",
        "Installation labour, permits and utility approvals are separate.",
      ],
    },
  },
  {
    slug: "generator",
    route: "/generator",
    name: "Backup Power and Generator",
    category: "services",
    questions: [
      {
        q: "Does the tool size my generator?",
        a: "No, and it says so. You bring a load assessment and choose the size bracket; the engine measures the materials around that set instead of pretending a kilovolt ampere figure can be derived from a floor area.",
      },
      {
        q: "What does it actually take off?",
        a: "The changeover arrangement where an automatic transfer switch is included, and the cable for the measured generator to panel run, with the route and waste allowance you set.",
      },
      {
        q: "Why is a blank cable run reported as missing?",
        a: "Because an unmeasured run cannot produce a cable quantity. A zero is reported as unmeasured or panel mounted, and a blank asks you to measure, rather than producing a plausible number.",
      },
      {
        q: "Are fuel and consumption covered?",
        a: "No. Fuel sizing, consumption and running cost depend on load profile and are outside this material takeoff.",
      },
      {
        q: "Is the installation checked?",
        a: "No. Earthing, protection and changeover wiring are electrical design and inspection work.",
      },
    ],
    article: {
      summary:
        "Materials around a generator you have sized, with the cable run measured rather than guessed.",
      description:
        "A backup power material estimator. You choose the size bracket from your own load assessment, state whether an automatic transfer switch is included, and measure the run to the panel; the engine returns the changeover and cable quantities that follow.",
      functions: [
        "Records the generator bracket you selected from your load assessment.",
        "Adds the transfer switch arrangement where one is included.",
        "Calculates cable length from the measured run, with a route and waste allowance.",
        "Reports an unmeasured cable run as missing instead of estimating it.",
      ],
      advantages: [
        "The engine refuses to size a generator, which is the number most likely to be wrong in a cheap estimate.",
        "Cable follows a measured run, so the longest item on the job is not a guess.",
        "Changeover scope is explicit, so an ATS is either quoted or visibly absent.",
      ],
      limits: [
        "It does not size generators or produce a load list.",
        "Earthing, protection settings and inspection certificates are excluded.",
        "Fuel, installation labour and housing are separate.",
      ],
    },
  },
  {
    slug: "heat-comfort",
    route: "/heat-comfort",
    name: "Heat and Comfort",
    category: "services",
    questions: [
      {
        q: "What does the heat and comfort tool compare?",
        a: "Two finish choices on the same area, using their solar reflectance. It reports the absorbed energy difference per day and the percentage reduction the lighter or darker choice achieves.",
      },
      {
        q: "Where do reflectance figures come from?",
        a: "From configuration, and they are shown on the page. The tool does not invent a reflectance for a product it does not know.",
      },
      {
        q: "Does it predict indoor temperature?",
        a: "No. It reports absorbed energy, not room temperature. Ventilation, mass, shading and occupancy all move the outcome and none of them are modelled.",
      },
      {
        q: "Why compare two surfaces instead of one?",
        a: "Because the useful question is a choice between finishes, and a single figure gives you nothing to compare it with.",
      },
      {
        q: "Does it qualify for any green certification?",
        a: "No. It is an indicative comparison to support a conversation about specification, not a compliance submission.",
      },
    ],
    article: {
      summary:
        "How two finish choices change the solar energy a surface absorbs, side by side.",
      description:
        "A comparison tool rather than a single answer. Two surface finishes on the same area are compared through their reflectance, giving the absorbed energy difference per day and the relative reduction, so a specification decision has a number attached to it.",
      functions: [
        "Calculates absorbed solar fraction from the reflectance of each finish.",
        "Computes the daily absorbed energy difference across the area you enter.",
        "Reports the reduction as a percentage, with a guard against extreme reflectance values.",
        "Works in square metres or square feet.",
      ],
      advantages: [
        "Frames the question as a choice between two finishes, which is how it arises on a project.",
        "Reflectance values are visible, so the comparison can be checked against product data.",
        "States plainly that absorbed energy is not indoor temperature.",
      ],
      limits: [
        "It does not model room temperature, ventilation or thermal mass.",
        "It does not certify energy performance or green building compliance.",
        "Reflectance values must come from configured or vendor data.",
      ],
    },
  },
  {
    slug: "labour-estimator",
    route: "/labour-estimator",
    name: "Labour and Crew Productivity",
    category: "project",
    questions: [
      {
        q: "How are worker days calculated?",
        a: "From the quantities in front of you and the productivity rate for each task, converted into worker days, then into a crew duration for the crew size you plan.",
      },
      {
        q: "Where does the site efficiency loss sit?",
        a: "As its own labelled line, never folded into the base rate. You can see what the base productivity assumes and what the site allowance adds.",
      },
      {
        q: "Why are durations whole days?",
        a: "Because you cannot schedule part of a working day. Fractions are rounded up so a duration is something a programme can hold.",
      },
      {
        q: "What if a productivity rate is missing?",
        a: "The task is refused rather than given a guessed rate. A missing rate is an honest gap, and it is shown as one.",
      },
      {
        q: "Does it produce a full programme?",
        a: "It gives durations per task and per crew. Sequencing those durations into a programme is the project timeline's job.",
      },
    ],
    article: {
      summary:
        "Worker days and crew duration per task, with the efficiency loss shown separately.",
      description:
        "A labour productivity estimator. Each task's quantity is multiplied by a configured productivity rate to give worker days, then divided across the crew you plan, with a site efficiency allowance carried as a separate line.",
      functions: [
        "Converts task quantities into worker days using configured productivity rates.",
        "Divides worker days by crew size to give a duration in whole working days.",
        "Carries the site efficiency loss as a separate labelled allowance.",
        "Refuses a task whose productivity rate is not configured instead of guessing one.",
      ],
      advantages: [
        "The efficiency allowance is visible, so a slow site can be seen rather than absorbed into a rate.",
        "Whole day durations mean the output can go into a programme without adjustment.",
        "Missing rates surface as gaps, which keeps the labour estimate honest.",
      ],
      limits: [
        "It does not sequence work or produce a programme.",
        "Wage rates, overtime and statutory costs are separate from productivity.",
        "Weather, access constraints and supervision ratios are not modelled.",
      ],
    },
  },
  {
    slug: "margin-calculator",
    route: "/margin-calculator",
    name: "Margin and Markup Calculator",
    category: "project",
    questions: [
      {
        q: "What is the difference between margin and markup?",
        a: "Markup is a percentage on cost; margin is a percentage of the selling price. They are different numbers for the same job, and the tool shows which basis every preset uses rather than leaving you to assume.",
      },
      {
        q: "Why does the basis matter so much?",
        a: "Because a twenty percent markup is a sixteen point seven percent margin. Confusing the two is how a contractor wins work at a loss.",
      },
      {
        q: "Is tax added automatically?",
        a: "Only from a configured rule. With no rule, the tool warns and adds no tax line instead of assuming a rate, which keeps the price honest in every jurisdiction.",
      },
      {
        q: "Can I work backwards from a target price?",
        a: "Yes. Give it the price you want to achieve and it shows the margin and markup that price implies on your cost.",
      },
      {
        q: "Does it include overheads?",
        a: "Your base cost should. The engine separates cost, margin and tax so each is visible, not blended into one number.",
      },
    ],
    article: {
      summary:
        "Client price, profit and tax with the margin or markup basis stated every time.",
      description:
        "A pricing calculator that refuses to blur margin and markup. Base cost and a configured preset give the client price, with the basis named on every step and tax added only when a rule exists.",
      functions: [
        "Calculates client price from base cost and the margin or markup preset you choose.",
        "States the basis in use, so the same percentage cannot be read two ways.",
        "Works backwards from a target price to the margin it implies.",
        "Adds tax only from a configured rule, and warns when none exists.",
      ],
      advantages: [
        "The margin against markup distinction is explicit instead of a footnote in a conversation.",
        "Tax honesty means a price is never inflated by an invented rate.",
        "Each step of the breakdown is shown, so the price can be defended line by line.",
      ],
      limits: [
        "It does not decide what margin your business needs.",
        "Overheads, financing and risk allowances must already sit in the base cost.",
        "It is not accounting software and does not post transactions.",
      ],
    },
  },
  {
    slug: "cash-flow-timeline",
    route: "/cash-flow-timeline",
    name: "Cash-Flow Timeline",
    category: "project",
    questions: [
      {
        q: "How are payment stages built?",
        a: "From a milestone template: label, percentage and offset in months, applied to the project value. Dates come from the start date plus each offset, so nothing is invented.",
      },
      {
        q: "What happens if the percentages do not total one hundred?",
        a: "The template is refused. The engine will not silently normalise the stages or spread the shortfall, because a cash flow that does not add up is worse than no cash flow.",
      },
      {
        q: "Can I model a retention?",
        a: "If the template carries it as a stage. Retention, mobilisation and completion are all just stages with a share and a timing.",
      },
      {
        q: "Does it track actual payments?",
        a: "No. It projects the intended schedule from the value and the template. Recording what has actually been received is a separate ledger.",
      },
      {
        q: "Why phase payments at all?",
        a: "Because a contractor funds materials before being paid. Seeing the money arrive across months is what turns a profitable job into a survivable one.",
      },
    ],
    article: {
      summary:
        "A phased payment schedule from the contract value, with stages that must add to one hundred.",
      description:
        "A project cash-flow projection. A milestone template, with a share and a month offset for each stage, is applied to the project value to show when money is expected to arrive, and the engine rejects any template that does not total one hundred percent.",
      functions: [
        "Applies milestone percentages to the project value to give each stage amount.",
        "Places stages on a timeline from the project start date and each offset.",
        "Refuses a template whose percentages do not sum to exactly one hundred.",
        "Shows the cumulative position month by month.",
      ],
      advantages: [
        "A template that does not reconcile is refused rather than quietly adjusted.",
        "Cumulative timing shows the funding gap a profitable job can still have.",
        "Stages are yours to define, so mobilisation and retention are modelled as they really are.",
      ],
      limits: [
        "It does not record received payments or reconcile against a bank account.",
        "It does not model interest, credit facilities or late payment penalties.",
        "Cost timing is not included; this is the inflow side of the picture.",
      ],
    },
  },
];

export const ENGINE_FAQ_GROUPS: ToolFaqGroup[] = ENGINE_FAQ_ENTRIES.map(
  ({ article: _article, ...group }) => group,
);

/** Article bodies for the engine groups above, keyed by slug. */
export const ENGINE_FAQ_ARTICLES: Record<string, FaqArticle> =
  Object.fromEntries(
    ENGINE_FAQ_ENTRIES.map((group) => [group.slug, group.article]),
  );

export type EngineFaqCategory = FaqCategoryId;
