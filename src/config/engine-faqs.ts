/**
 * FAQ coverage for the engine family beyond the original sixteen tools.
 *
 * Same contract as src/config/tool-faqs.ts: five questions per engine, then a
 * five section article body. The copy below is written against each engine's
 * stated inputs and its honesty contract, so nothing here claims coverage the
 * engine does not have. Anything excluded (hydraulic design, permits, hazardous
 * waste, structural design) is named in the limits, not left to be
 * discovered later.
 *
 * Split from the main registry purely for file size. Both are merged into the
 * same FAQ index, so a reader sees one catalogue, not two.
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
        a: "It converts a volume in place into the volume a skip has to hold. Rubble, blockwork and concrete do not bulk by the same amount, so the factor is yours to set, not assumed by the tool.",
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
        "Skip numbers come from measured volumes, not a guess about how many lorries a job needs.",
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
        a: "Each run is measured at the length you give it and converted to stock lengths, so the order is in pipes, not metres. Lengths it cannot size are left visible, not filled in.",
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
        a: "Yes, on the widths and heights you enter, with the quantity attached to each opening, so three identical doors are one line, not three.",
      },
      {
        q: "How is framing counted?",
        a: "From the stud spacing and the wall run, which is why the spacing you choose changes the steel. Tracks follow the run, not the area.",
      },
      {
        q: "Are screws and jointing included?",
        a: "Yes, as their own lines from planning rules, so the fixing count and the compound are visible, not buried in a board price.",
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
        a: "Underlay is included when you switch it on. Screeding and levelling compounds are separate tools, because they are measured in volume, not area.",
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
        "Pack rounding means the order matches the shelf, not a theoretical area.",
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
        a: "Every opening is deducted by width and height with its quantity, so doors, windows and vents come out of the block count, not added as an afterthought.",
      },
      {
        q: "Does it work in different countries and markets?",
        a: "The engine supports market-specific cement packaging and mortar settings where configured. Confirm the selected market details before relying on an estimate.",
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
        "Applies the market's packaging and mortar convention, not a single country default.",
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
        "Pattern is an input, not a footnote, which matches what happens on the ground.",
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
        a: "Yes, and that is where the saving is. A 12 mm skim and a 20 mm render differ by two thirds of the material, so thickness is an input, not a trade assumption.",
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
        a: "Eight, ten, twelve, sixteen, twenty, twenty five and thirty two millimetre bars, including links and stirrups, the sizes residential and light commercial work actually uses.",
      },
      {
        q: "Is binding wire included?",
        a: "Yes, as kilograms per tonne of bar from the rule the engine applies, so the wire appears as its own line instead of vanishing into the rate.",
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
        "Tonnage is computed from your schedule, not from a rate per cubic metre of concrete.",
        "Laps and waste are visible assumptions instead of being buried in the rate.",
        "The unit weights are printed, so a tonnage arguable on site.",
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
        a: "Coats per surface and coating coverage per bag are held as rules, so a two coat wet area is priced as two coats, not one generous one.",
      },
      {
        q: "What about membranes and tape?",
        a: "Membrane roll coverage decides roll quantity, and tape follows the overlap percentage applied to the runs and perimeters you enter.",
      },
      {
        q: "What happens if I leave an area blank?",
        a: "That surface is left unsized, not filled with a guess, so an incomplete scope reads as incomplete instead of quietly under quoted.",
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
        "A wet room and a roof terrace are priced from their own rules, not one blended figure.",
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
        a: "The paint calculator works from area and coverage. This engine works room by room with the product and quality level you select, so coverage comes from the product data instead of a single spread rate.",
      },
      {
        q: "Why does it show theoretical and practical quantities separately?",
        a: "Because a theoretical litre figure and a purchasable tin count are different facts. The engine always shows both, so you can see the gap between the maths and the order.",
      },
      {
        q: "How is the ceiling treated?",
        a: "As its own surface with the house rule applied, not folded into wall area, because ceilings are coated differently and usually with a different product.",
      },
      {
        q: "Do colour and surface condition change the quantity?",
        a: "They raise warnings, not silently adding percentages. A dark colour over light or bare plaster generates a flag you decide on, and any adjustment you make is recorded without overwriting the original estimate.",
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
        "Takes coverage from the selected product and quality level, not a fixed rate.",
        "Reports theoretical quantity and practical purchase quantity as separate figures.",
        "Raises warnings for colour and surface conditions, and records any manual adjustment you make.",
      ],
      advantages: [
        "Product data drives coverage, so a premium paint is not estimated like a budget one.",
        "The tin count is shown next to the litre figure, so a mid job shortage.",
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
        a: "No. It is an estimating method. Member sizes, reinforcement design and load paths belong to a structural engineer, and the tool says so. It does not imply approval.",
      },
      {
        q: "How are the concrete ingredients split?",
        a: "By the mix ratio you choose, applied to the dry volume, so a stronger mix shows up in the cement line instead of being absorbed into a rate.",
      },
      {
        q: "Can I mix slabs, beams, columns and footings?",
        a: "Yes, each element type is its own line with its own dimensions and quantity, and the totals roll up by material, not by element.",
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
        "Totals reinforcement by diameter and bar length so the steel order is a schedule, not a guess.",
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
        a: "Because concrete is priced by volume. Fifty millimetres across a large slab is a significant quantity of cement, so thickness is an input, not a trade assumption.",
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
        "A concrete slab takeoff. Length, width and thickness give the volume, the mix ratio gives the ingredients, and the waste allowance gives a purchasable order, not a theoretical one.",
      functions: [
        "Calculates wet volume from the slab dimensions you enter.",
        "Applies the waste percentage you allow for overfill and uneven substrates.",
        "Splits the volume by mix ratio into cement bags, sand and granite.",
        "Shows the dry volume conversion behind each ingredient quantity.",
      ],
      advantages: [
        "The order is expressed in bags and trips, which is how concrete materials are bought.",
        "Mix ratio is visible, so a change of specification is a change of cost, not a surprise.",
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
        a: "From the surveyed levels or depths you enter against the areas they apply to, giving cut and fill separately, not as one net figure.",
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
        "Spoil and fill are costed as two movements, the two a site actually pays for.",
        "Bulking is an explicit assumption you can correct from the first skip or lorry.",
        "Volumes stay tied to surveyed levels, not to a guess from a drawing.",
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
        a: "Rafter length is the slope length, not the plan length, so a steeper roof uses more timber for the same footprint. The engine computes that instead of applying a flat factor.",
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
        "Calculates rafter length from the span and pitch, not the plan dimension.",
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
        a: "Formwork is bought once and used several times, so the reuse cycles you enter reduce the quantity of new material instead of inflating it.",
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
        "Uses the soil value you supply, not a default assumption.",
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
        "Storage and freeboard are visible additions, not padding inside a volume.",
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
        a: "No. It measures quantity. U values, condensation risk and code compliance are a building physics assessment, and the tool says so. It does not imply a rating.",
      },
      {
        q: "How do layers affect the order?",
        a: "Multi layer build ups multiply the area, not the thickness, because each layer is a separate purchase at the same coverage.",
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
        "A thermal and acoustic insulation quantity takeoff. The area to be insulated, the number of layers and the product coverage decide the packs, with waste as a visible allowance, not a hidden loading.",
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
        a: "It is reported as unpriced and left out of the total, not given an invented figure. An incomplete price list shows as an incomplete cost.",
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
        "Reports any component without a configured price as unpriced instead of estimating it.",
      ],
      advantages: [
        "Two sizing routes mean a roof limited job and a load limited job are both handled honestly.",
        "Unpriced components are declared, so a quotation cannot quietly assume a price.",
        "The energy calculation is shown, so sun hours and losses can be argued with, not trusted blindly.",
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
        a: "Because an unmeasured run cannot produce a cable quantity. A zero is reported as unmeasured or panel mounted, and a blank asks you to measure instead of producing a plausible number.",
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
        "Materials around a generator you have sized, with the cable run measured, not guessed.",
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
        a: "Because the question worth asking is a choice between finishes, and a single figure gives you nothing to compare it with.",
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
        "A comparison tool, not a single answer. Two surface finishes on the same area are compared through their reflectance, giving the absorbed energy difference per day and the relative reduction, so a specification decision has a number attached to it.",
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
        a: "The task is refused instead of given a guessed rate. A missing rate is an honest gap, and it is shown as one.",
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
        "The efficiency allowance is visible, so a slow site can be seen, not absorbed into a rate.",
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
        a: "Markup is a percentage on cost; margin is a percentage of the selling price. They are different numbers for the same job, and the tool shows which basis every preset uses, so you never have to assume one.",
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
        "A template that does not reconcile is refused, not quietly adjusted.",
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
  {
    slug: "boq-generator",
    route: "/boq-generator",
    name: "BOQ and Quote Generator",
    category: "commercial",
    questions: [
      {
        q: "Where do the BOQ lines come from?",
        a: "From estimates you have already saved. The engine assembles them into a bill of quantities, and every line keeps the reference to the estimate and input that produced it.",
      },
      {
        q: "Are contingency and tax added automatically?",
        a: "Only from configured rules. With no rule set, the quote is produced without those lines and a warning says so. A missing rate is left visible, never filled with a guess.",
      },
      {
        q: "Can I defend a line to a client?",
        a: "Yes. Each line is replayable back to its source, so a question about a quantity can be answered from the record instead of from memory.",
      },
      {
        q: "Does it replace a quantity surveyor?",
        a: "No. It assembles and totals what the engines measured. Pricing judgement, preliminaries and commercial strategy stay with you.",
      },
      {
        q: "What if an estimate changes after the quote?",
        a: "You generate a new quote. The saved bill keeps the state it was built from, so the document stays auditable later.",
      },
    ],
    article: {
      summary:
        "Saved estimates assembled into a bill of quantities, with every line traceable.",
      description:
        "A bill of quantities builder that works from estimates you have already produced. Lines are assembled, totals follow the configured commercial rules, and each item keeps its source reference so the document can be replayed line by line.",
      functions: [
        "Assembles saved estimates into BOQ sections with their quantities and rates.",
        "Applies contingency and tax only where a configured rule exists.",
        "Keeps a source reference on every line for audit and dispute.",
        "Warns and omits the line when a commercial rate is not configured.",
      ],
      advantages: [
        "The quote traces back to the calculations behind it, which ends most arguments early.",
        "Missing commercial rules show as gaps, so nothing is quietly assumed.",
        "One document replaces the retyping that introduces most transfer errors.",
      ],
      limits: [
        "It does not price work you have not estimated.",
        "Preliminaries, overheads and commercial strategy are yours.",
        "It does not manage variations or post contract valuations.",
      ],
    },
  },
  {
    slug: "project-timeline",
    route: "/project-timeline",
    name: "Project Timeline",
    category: "project",
    questions: [
      {
        q: "What does the timeline build from?",
        a: "Durations and dependencies of the tasks you list. Each task keeps its own length and its predecessors, so a change to one date moves what follows it.",
      },
      {
        q: "Where do durations come from?",
        a: "From the labour engine, from your own programme, or from the task you enter. The timeline holds the sequence, it does not invent how long a job takes.",
      },
      {
        q: "Can I see the critical path?",
        a: "The schedule shows which tasks have no float left, so the chain that decides the finish date is visible, not buried in a bar chart.",
      },
      {
        q: "Does it track progress?",
        a: "It shows planned dates and the effect of changes. Recording what actually happened on site is a progress record, a separate job.",
      },
      {
        q: "What about weather and access?",
        a: "Those become lost days or longer durations you enter. The tool will not model a rainy season for you.",
      },
    ],
    article: {
      summary:
        "A task schedule with dependencies, float and a visible critical path.",
      description:
        "A project programme built from tasks, their durations and the links between them. Dates follow the dependencies, float is calculated, and the chain that decides completion is highlighted instead of hidden.",
      functions: [
        "Places tasks on a calendar from start dates, durations and dependencies.",
        "Calculates float and identifies the critical path.",
        "Moves dependent tasks when an earlier one changes.",
        "Shows the finish date implied by the schedule you entered.",
      ],
      advantages: [
        "Dependencies make the knock on effect of a delay visible on the day it happens.",
        "The critical path points at the tasks that actually decide the end date.",
        "Durations stay your numbers, so the programme reflects your site.",
      ],
      limits: [
        "It does not estimate durations from quantities; the labour engine does that.",
        "It does not record actual progress or earned value.",
        "Resource levelling and cost loading are outside it.",
      ],
    },
  },
  {
    slug: "construction-sequence",
    route: "/construction-sequence",
    name: "Construction Sequence",
    category: "project",
    questions: [
      {
        q: "What is the construction sequence for?",
        a: "It sets the order trades follow, which work must finish before the next can start, and where inspection points sit. The order matters as much as the durations.",
      },
      {
        q: "Is the sequence fixed?",
        a: "It follows the method you are building to. Change the method and the order changes, which is why it is an input, not a rulebook.",
      },
      {
        q: "How does it relate to the timeline?",
        a: "The sequence decides order, the timeline turns that order into dates. Use them together: sequence first, durations second.",
      },
      {
        q: "Does it include inspections?",
        a: "It shows where inspection and hold points fall in the order, so a foundation is not covered before it has been seen.",
      },
      {
        q: "Who uses it?",
        a: "The person coordinating trades on site, and the client who wants to know what happens next and what depends on what.",
      },
    ],
    article: {
      summary:
        "The order trades follow, with the hold points that stop work being covered too early.",
      description:
        "A sequencing view of a building job. Trades and activities are placed in the order they must happen, with the dependencies that make the order real and the inspection points that decide when the next trade can start.",
      functions: [
        "Orders activities from substructure through finishes and handover.",
        "Shows which work must complete before the next trade starts.",
        "Marks inspection and hold points in the sequence.",
        "Links each stage to the tool that measures it.",
      ],
      advantages: [
        "Trade order is explicit, which prevents the rework that comes from finishing too early.",
        "Hold points are visible, so inspections are planned instead of discovered.",
        "Each stage points at the estimator that prices it, so sequence and quantities stay together.",
      ],
      limits: [
        "It does not assign durations or dates; the timeline does that.",
        "It does not replace a method statement or a safety plan.",
        "It does not manage subcontractor procurement lead times.",
      ],
    },
  },
  {
    slug: "maintenance-planner",
    route: "/maintenance-planner",
    name: "Maintenance Planner",
    category: "project",
    questions: [
      {
        q: "Where do service lives come from?",
        a: "From configured maintenance profiles, each with a source reference. A category without an active profile produces a data requirement warning and a refused schedule, not an assumed interval.",
      },
      {
        q: "What does the planner produce?",
        a: "A schedule of inspections and renewals across the life of the building, with costs where the profile carries a cost factor.",
      },
      {
        q: "Can I change an interval?",
        a: "Through configuration, which keeps the source visible. Editing a number on the page would leave no record of where it came from.",
      },
      {
        q: "Is this a condition survey?",
        a: "No. It plans future work from profiles. What state a building is actually in is a site inspection.",
      },
      {
        q: "Why plan maintenance at all?",
        a: "Because a roof renewal or a repaint is a cost the owner will meet. Spreading it across the years it accrues is the difference between a funded and an unfunded renewal.",
      },
    ],
    article: {
      summary:
        "Inspections and renewals across a building's life, from sourced service life data.",
      description:
        "A maintenance schedule for the years after handover. Each element carries an interval and a service life from a configured profile, which turns into planned inspections and renewals with their cost implications.",
      functions: [
        "Builds a multi year schedule from element category and profile interval.",
        "Calculates inspection and renewal dates from the in service date.",
        "Attaches cost factors where the profile holds one.",
        "Refuses a category with no active profile and states what is missing.",
      ],
      advantages: [
        "Every interval traces to a stored profile with its own source, so a number can be defended.",
        "Renewals appear as planned events instead of surprises.",
        "Missing profiles are declared, which keeps the schedule honest about what it does not cover.",
      ],
      limits: [
        "It does not assess current condition or predict failure.",
        "It does not schedule reactive repairs.",
        "Costs reflect configured factors, not live contractor prices.",
      ],
    },
  },
  {
    slug: "carbon-footprint",
    route: "/carbon-footprint",
    name: "Embodied Carbon Estimator",
    category: "commercial",
    questions: [
      {
        q: "How is embodied carbon calculated?",
        a: "Quantity multiplied by a configured carbon factor, summed across the estimate lines. Factors carry a source reference so each figure can be checked.",
      },
      {
        q: "What happens to a line with no factor?",
        a: "It is excluded and a warning says so. The engine will not invent an emission factor, and an incomplete total is reported as incomplete.",
      },
      {
        q: "Which stages are covered?",
        a: "What the configured factors cover. If your data is cradle to gate, the result is cradle to gate, and the boundary is stated with the number.",
      },
      {
        q: "Can I compare two specifications?",
        a: "Yes. Change the materials in the estimate and the carbon total moves, which makes the comparison between two build ups straightforward.",
      },
      {
        q: "Is this a certification?",
        a: "No. It is an indicative calculation from configured factors. Formal assessment needs a recognised methodology and verified data.",
      },
    ],
    article: {
      summary:
        "Kilograms of carbon dioxide equivalent per estimate line, from sourced factors.",
      description:
        "An embodied carbon calculation laid over the estimate. Each line's quantity is multiplied by a configured factor, the results are summed, and any line without a factor is named, never estimated.",
      functions: [
        "Multiplies quantity by carbon factor for every configured line.",
        "Sums the result into a total with the system boundary stated.",
        "Lists the lines excluded for want of a factor.",
        "Recalculates when the underlying specification changes.",
      ],
      advantages: [
        "Factors carry source references, so a total can survive scrutiny.",
        "Excluded lines are declared instead of being absorbed as zero.",
        "Comparing two specifications takes one change and a reload.",
      ],
      limits: [
        "It is not a certified carbon assessment.",
        "It covers what the factors cover and nothing beyond that boundary.",
        "Operational energy and end of life emissions need separate data.",
      ],
    },
  },
  {
    slug: "circular-reuse",
    route: "/circular-reuse",
    name: "Demolition Recovery",
    category: "commercial",
    questions: [
      {
        q: "What does the recovery tool calculate?",
        a: "Recovered, reused, recycled and landfilled quantities for a strip out, plus the landfill diversion rate and what the reclaimed material is worth.",
      },
      {
        q: "Where do recovery rates come from?",
        a: "From configured material reuse factors. A material without a factor is refused with a warning, because an assumed recovery rate is a made up quantity.",
      },
      {
        q: "Why does the split matter?",
        a: "Reuse, recycling and landfill are three different destinations with three different costs and three different values. One blended rate hides all of them.",
      },
      {
        q: "Can I show a client the diversion rate?",
        a: "Yes, and it comes out of the quantities, so it is a calculation and not a claim. It is the kind of figure a sustainability submission asks for.",
      },
      {
        q: "Does it handle hazardous material?",
        a: "No. Contamination, asbestos and special waste need survey and separate handling before any recovery calculation is meaningful.",
      },
    ],
    article: {
      summary:
        "Reused, recycled and landfilled quantities with the diversion rate they produce.",
      description:
        "A demolition recovery calculation. Materials from a strip out are split by configured reuse factors into recovered, reused, recycled and landfilled quantities, giving a diversion rate and a value for what can be sold on.",
      functions: [
        "Applies recovery and reuse factors to each material quantity.",
        "Splits the result into reuse, recycle and landfill destinations.",
        "Calculates the landfill diversion rate from those quantities.",
        "Values reclaimed material from configured figures.",
      ],
      advantages: [
        "Three destinations instead of one blended rate, because the costs follow the destination.",
        "The diversion rate is derived, so it can be defended in a submission.",
        "Unconfigured materials are refused, so no plausible recovery share is invented.",
      ],
      limits: [
        "It does not survey for contamination or hazardous materials.",
        "It does not arrange haulage, processors or buyers.",
        "Values are configured figures, not live scrap prices.",
      ],
    },
  },
  {
    slug: "warranty-certificate",
    route: "/warranty-certificate",
    name: "Warranty Certificate",
    category: "commercial",
    questions: [
      {
        q: "What does a warranty certificate contain?",
        a: "A frozen snapshot of the estimate: inputs, calculated quantities and per line price snapshots, with a configuration hash computed over the set.",
      },
      {
        q: "Why freeze the configuration?",
        a: "So a claim made a year later can be replayed against what was actually quoted, not against today's prices or today's settings.",
      },
      {
        q: "What does the hash prove?",
        a: "That the record has not changed since it was issued. The same estimate always produces the same hash, so tampering shows.",
      },
      {
        q: "Is this a legal warranty?",
        a: "No. It is an evidence record of what was estimated and priced. Warranty terms themselves are contractual.",
      },
      {
        q: "When should one be issued?",
        a: "At handover, or whenever a priced scope is agreed. The useful moment is before anyone needs it.",
      },
    ],
    article: {
      summary:
        "A frozen, hashed snapshot of an estimate that a claim can be replayed against.",
      description:
        "An evidence record, not a contract. It captures the estimate exactly as issued, including inputs, quantities and line prices, then hashes that configuration so a later dispute has a fixed reference point.",
      functions: [
        "Freezes inputs, calculated quantities and price snapshots into a certificate.",
        "Computes a deterministic hash over the frozen configuration.",
        "Replays the estimate from the snapshot when a dispute arises.",
        "Shows the configuration the issued price depended on.",
      ],
      advantages: [
        "A claim is answered from the record that produced the price, not from memory.",
        "The hash makes any later change to the record detectable.",
        "Price snapshots protect both sides from drift between quote and delivery.",
      ],
      limits: [
        "It is not a legal warranty or contract document.",
        "It records what was estimated, not what was installed.",
        "It does not arbitrate a dispute or assign liability.",
      ],
    },
  },
  {
    slug: "contractor-credit",
    route: "/contractor-credit",
    name: "Contractor Credit Check",
    category: "commercial",
    questions: [
      {
        q: "How is the credit score calculated?",
        a: "From verified job statistics: completion, punctuality, error rates and history, combined into a score out of one hundred.",
      },
      {
        q: "What if a contractor has no history?",
        a: "The score is refused with insufficient verified history. Zero would read as bad, and no record is not a bad record.",
      },
      {
        q: "Where do the statistics come from?",
        a: "From admin verified records. The engine will not score from self reported numbers, and invalid statistics are rejected, not smoothed over.",
      },
      {
        q: "Who uses the score?",
        a: "Clients weighing a contractor, and lenders or suppliers considering terms. Both need the same underlying record.",
      },
      {
        q: "Does a low score mean avoid?",
        a: "No. It describes a record. A new firm with little history scores nothing because it can score nothing, and that is a different statement from a poor record.",
      },
    ],
    article: {
      summary:
        "A score out of one hundred from verified job history, refused when there is no history to score.",
      description:
        "A trust score built from verified job statistics. Completion rates, punctuality and error records combine into a number a client or a lender can read, and a contractor with no verified work is refused instead of being scored zero.",
      functions: [
        "Combines verified completion, punctuality and error statistics into a score.",
        "Rejects invalid statistics instead of correcting them silently.",
        "Refuses a score when there is no verified job history.",
        "Shows the components behind the score.",
      ],
      advantages: [
        "An absent record is distinguished from a bad one, which is the difference between a new firm and a poor one.",
        "Components are shown, so a score can be discussed instead of simply quoted.",
        "Only verified records count, which keeps the number meaningful.",
      ],
      limits: [
        "It does not assess financial standing or creditworthiness.",
        "It does not verify workmanship quality beyond recorded errors.",
        "It is not a guarantee of performance on a future job.",
      ],
    },
  },
  {
    slug: "measurement-converter",
    route: "/unit-converter",
    name: "Measurement Converter",
    category: "commercial",
    questions: [
      {
        q: "Which units does the converter handle?",
        a: "Length, area, volume and mass units in metric and imperial systems. Pressure and temperature conversions are not part of this converter.",
      },
      {
        q: "Why does area conversion go wrong so often?",
        a: "Because the squared factor is squared again. One metre is 3.281 feet, one square metre is 10.764 square feet, and the converter applies the squared factor, not a scaled single length.",
      },
      {
        q: "Can I convert a material quantity?",
        a: "Yes for the units themselves. Converting tonnes to bags needs the bag weight, and converting litres to gallons depends on which gallon the supplier means, so those stay your input.",
      },
      {
        q: "Does it round the answer?",
        a: "The converter returns a numeric result from the configured unit factors and labels any geometry, depth or density assumption. It does not expose a factor readout for every conversion, so verify critical figures against the project specification.",
      },
      {
        q: "Where is it most useful?",
        a: "At the join between a design in metres and a supplier quoting in feet and inches, which is where most quantity errors start.",
      },
    ],
    article: {
      summary:
        "Metric and imperial conversion for construction measurements, with cross-dimension assumptions stated.",
      description:
        "A measurement converter for construction drawings, delivery notes and quotations. Length, area, volume and mass use registered metric and imperial unit factors; geometry, depth and density assumptions are identified when dimensions differ.",
      functions: [
        "Converts registered length, area, volume and mass units between metric and imperial systems.",
        "Offers explicit geometry assumptions for eligible length, area and volume pairs.",
        "Requires a supplied depth or density for conversions that need one.",
        "Includes construction-focused material, plot and paint bucket tools with editable assumptions.",
      ],
      advantages: [
        "The factor is visible, so an error can be found in the arithmetic instead of guessed at.",
        "Area and volume conversions are handled correctly, which is where most hand conversions fail.",
        "One tool covers the units a site actually meets in a week.",
      ],
      limits: [
        "It does not convert a material quantity without the unit weight or density.",
        "It does not decide which gallon or ton a supplier means.",
        "It does not validate the dimension you type in.",
      ],
    },
  },
  {
    slug: "paint-comparison",
    route: "/paint-comparison",
    name: "Paint Comparison",
    category: "finishes",
    questions: [
      {
        q: "What does the paint comparison show?",
        a: "Products side by side on coverage, price and suitability for the surface you have, so the cost per square metre is visible next to the tin price.",
      },
      {
        q: "Why compare cost per square metre?",
        a: "Because a cheaper tin with lower coverage can cost more on the wall. Comparing tin prices compares packaging, not paint.",
      },
      {
        q: "Where do the product figures come from?",
        a: "From the product records behind the estimator. A product without coverage data is listed without it, never filled with an average.",
      },
      {
        q: "Does it tell me which paint to buy?",
        a: "It ranks the options on the numbers you give it. Suitability for a damp wall or a metal surface is a judgement the comparison informs, not one it makes.",
      },
      {
        q: "Do prices include tax?",
        a: "No. Tax is not determined here, and each product's price is shown as the supplier states it.",
      },
    ],
    article: {
      summary:
        "Two or more paints compared on coverage and cost per square metre, not tin price.",
      description:
        "A comparison surface for paint products. Coverage, tin size and price are placed side by side and reduced to a cost per square metre, which is the figure that decides a purchase once a wall area is known.",
      functions: [
        "Compares coverage and tin size across selected products.",
        "Reduces each option to a cost per square metre.",
        "Shows how much a given wall area requires of each product.",
        "Leaves products without coverage data visible but unpriced per area.",
      ],
      advantages: [
        "Cost per square metre makes a cheap tin with thin coverage look as expensive as it is.",
        "The comparison uses the same product data as the estimator, so the two cannot disagree.",
        "Missing coverage data is shown as a gap instead of an average.",
      ],
      limits: [
        "It does not judge suitability for a particular substrate.",
        "It does not include tax, labour or preparation.",
        "It compares only the products loaded in the system.",
      ],
    },
  },
  {
    slug: "finish-estimator",
    route: "/finish-estimator",
    name: "Finish Comparison",
    category: "finishes",
    questions: [
      {
        q: "What is being compared here?",
        a: "Wall finishing options for the same area: paint, screeding, tiling or POP, with the material quantity and cost each one implies.",
      },
      {
        q: "Why compare finishes at all?",
        a: "Because a client asks what a different finish would cost, and answering from four separate tools takes long enough that the question goes unanswered.",
      },
      {
        q: "Are preparation and labour included?",
        a: "No. Each option gives its materials from the same area, so the comparison is like for like on materials. Labour follows the method you choose.",
      },
      {
        q: "Does it pick a finish for me?",
        a: "No. It puts the numbers side by side. Durability, maintenance and appearance decide the choice, and none of those are quantities.",
      },
      {
        q: "Can I compare a partial area?",
        a: "Yes. Change the area and every option recalculates, which is how a single room and a whole building get answered in the same conversation.",
      },
    ],
    article: {
      summary:
        "Paint, screed, tile and POP priced from one wall area so a client can choose.",
      description:
        "A finishing options comparison. One wall area is run through each finishing method, giving the quantity of material and the cost each implies, so a specification decision can be made on numbers instead of impressions.",
      functions: [
        "Runs the same area through paint, screeding, tiling and POP.",
        "Reports material quantity and cost per option.",
        "Recalculates every option when the area changes.",
        "Keeps the options on the same basis so the comparison holds.",
      ],
      advantages: [
        "One area, several answers, which is the shape of the question a client actually asks.",
        "Options stay on the same basis, so the cheapest is genuinely cheapest on materials.",
        "Each option links to its own tool when the detail is needed.",
      ],
      limits: [
        "It compares materials only, not labour or preparation.",
        "It does not assess durability, maintenance or appearance.",
        "It does not price a mix of finishes on one elevation.",
      ],
    },
  },
  {
    slug: "increte-flooring-calculator",
    route: "/increte-flooring-calculator",
    name: "Decorative Concrete Flooring",
    category: "finishes",
    questions: [
      {
        q: "What does the decorative concrete tool measure?",
        a: "The topping and sealer for a given floor area, with a separate allowance for borders and stencilled edges where the pattern changes the rate.",
      },
      {
        q: "Why measure topping separately from concrete?",
        a: "Because a decorative topping is thin and spread over an area, so it is bought by coverage, not by the cubic metre of the slab underneath.",
      },
      {
        q: "How is a border handled?",
        a: "As its own band with its own width, because a pattern edge consumes material at a different rate from the field.",
      },
      {
        q: "Is the substrate included?",
        a: "No. The slab, its reinforcement and its finish are separate concrete work. This tool covers what goes on top.",
      },
      {
        q: "Does it allow for waste?",
        a: "Yes, as a percentage you set, and it is a visible line, not a loading buried in a rate.",
      },
    ],
    article: {
      summary:
        "Topping and sealer quantities for a decorative concrete floor, with borders as their own band.",
      description:
        "A quantity takeoff for decorative concrete flooring. Floor area and topping coverage give the material, borders and stencilled bands are measured as separate runs, and sealer follows the area it protects.",
      functions: [
        "Calculates topping quantity from floor area and coverage rate.",
        "Measures borders and pattern bands as their own runs.",
        "Adds sealer from the area it covers.",
        "Applies your waste percentage as a stated line.",
      ],
      advantages: [
        "Border bands are priced as bands, which is where a decorative floor usually goes over budget.",
        "Topping is bought by coverage, matching how it is sold.",
        "The substrate stays out of the number, so the concrete slab is not counted twice.",
      ],
      limits: [
        "It does not design or price the structural slab.",
        "It does not cover surface preparation or repair of the base.",
        "Colour, pattern and finish quality are specification choices, not quantities.",
      ],
    },
  },
  {
    slug: "wall-finish-estimator",
    route: "/wall-finish-estimator",
    name: "Wall Finish Estimator",
    category: "finishes",
    questions: [
      {
        q: "What does the wall finish estimator cover?",
        a: "Screeding, skimming and texturing on the wall areas you identify, with the material each method consumes and the thickness it assumes.",
      },
      {
        q: "Why is thickness an input?",
        a: "Because a twelve millimetre skim and a twenty millimetre render differ by two thirds of the material. Treating thickness as a fixed trade assumption is how depth gets lost from a quotation.",
      },
      {
        q: "Are ceilings included?",
        a: "Only when you add them as their own surface, since ceilings are coated differently and usually with a different product.",
      },
      {
        q: "Does it account for openings?",
        a: "Yes. Deduct the doors, windows and vents you list and the areas come out of the wall total instead of being estimated around.",
      },
      {
        q: "What about corner beads and reveals?",
        a: "They are linear items. The estimator covers surface area, so beads and trims are a separate count.",
      },
    ],
    article: {
      summary:
        "Screed, skim and texture quantities from the wall areas you identify, at the thickness you set.",
      description:
        "A wall finishing takeoff. Walls, ceilings and openings are measured as separate surfaces, thickness is your input per method, and the material follows from area, depth and the coverage the product provides.",
      functions: [
        "Calculates finish material from wall area, method and thickness.",
        "Treats ceilings as their own surface with their own rate.",
        "Deducts the openings you list from the total area.",
        "Prices beads and trims as separate linear items.",
      ],
      advantages: [
        "Thickness is an input, so a deeper render shows up as more material.",
        "Openings come out of the measurement instead of being guessed around.",
        "Ceilings are separated, which keeps products and rates from being blended.",
      ],
      limits: [
        "It does not assess the condition or suction of the substrate.",
        "It does not include scaffolding, access or protection.",
        "It does not decide the specification, only the quantity it implies.",
      ],
    },
  },
  {
    slug: "blueprint-takeoff",
    route: "/blueprint-takeoff",
    name: "Blueprint and Plan Takeoff",
    category: "commercial",
    questions: [
      {
        q: "How does the plan takeoff work?",
        a: "You take dimensions off a drawing and enter them, and the tool converts them into quantities through the same engines as the calculators. The measuring stays with you, the arithmetic does not.",
      },
      {
        q: "Can it read a PDF for me?",
        a: "Where extraction is available it proposes figures, and every proposed figure is shown for you to accept or correct. Nothing enters a quantity without your confirmation.",
      },
      {
        q: "Why not measure the drawing automatically?",
        a: "Because a scale bar, a scan and a revision cloud all look like geometry. An unverified dimension in a takeoff is worse than a missing one.",
      },
      {
        q: "Which quantities does it produce?",
        a: "Whatever the downstream engine measures: concrete, blockwork, finishes, roofing. Each line keeps the dimension it came from.",
      },
      {
        q: "Is the drawing stored?",
        a: "Only as part of the estimate you build from it. The takeoff is a record of what you measured, and that record is what answers a client question.",
      },
    ],
    article: {
      summary:
        "Dimensions taken off a plan, converted into quantities with every figure traceable.",
      description:
        "A plan based takeoff. Dimensions read from a drawing are entered once and converted by the same deterministic engines that power the calculators, with each line keeping the measurement that produced it. Extracted figures are proposals you confirm, not silent inputs.",
      functions: [
        "Converts entered plan dimensions into quantities per trade.",
        "Shows every extracted figure for confirmation before it is used.",
        "Keeps the source dimension on each takeoff line.",
        "Feeds the estimate and the bill of quantities downstream.",
      ],
      advantages: [
        "The measurement is yours and the arithmetic is the engine's, which is the split that keeps a takeoff defensible.",
        "Every line can be traced back to a dimension on a drawing.",
        "Extraction accelerates entry without ever adding an unconfirmed number.",
      ],
      limits: [
        "It does not measure a drawing automatically without your confirmation.",
        "It does not check the drawing for completeness or revision.",
        "It does not design anything from the plan.",
      ],
    },
  },
  {
    slug: "global-site-safety-estimator",
    route: "/global-site-safety-estimator",
    name: "Global Site Safety & PPE Estimator",
    category: "sitework",
    questions: [
      {
        q: "Does this estimator certify that my site complies with OSHA, HSE or ISO requirements?",
        a: "No. It produces planning quantities from the assumptions you enter and names relevant framework references. It is not a risk assessment, legal interpretation, safety plan or compliance certificate.",
      },
      {
        q: "Why doesn't the tool automatically use a 6 ft or 2 m fall threshold?",
        a: "Fall-protection duties depend on the governing jurisdiction, task, exposure and available controls. The familiar figures are not universal triggers, so the estimator asks you to identify fall hazards and enter the workers requiring controls, and it does not declare compliance from building height.",
      },
      {
        q: "How are perimeter signs calculated?",
        a: "The perimeter length is divided by your chosen sign-spacing assumption and rounded up. That is a planning count only; visibility, access points, hazards and local sign rules determine the actual placement.",
      },
      {
        q: "Are first-aid kit ratios regulatory requirements?",
        a: "No universal worker-per-kit ratio is asserted. The displayed quantity uses the planning allowance you enter; first-aid coverage, kit contents, trained responders and access to medical care must be assessed for the actual site and local rules.",
      },
      {
        q: "What does ISO 7010 contribute?",
        a: "ISO 7010 specifies registered safety-sign symbols. The selected reference helps identify the sign framework, but local adoption and applicable workplace law still need confirmation. The tool does not reproduce or approve sign artwork.",
      },
    ],
    article: {
      summary:
        "A transparent, adjustable inventory for construction-site PPE and safety logistics, with regulatory references kept separate from site-specific judgement.",
      description:
        "The Global Site Safety & PPE Estimator converts user-entered crew, perimeter and hazard information into a planning list. OSHA construction, UK HSE/CDM and ISO 7010 references provide context without pretending that one formula can determine whether a real site is safe or legally compliant.",
      functions: [
        "Counts perimeter signs from the perimeter and sign-spacing assumption entered by the user.",
        "Plans basic PPE quantities from the active crew and the reserve allocation selected by the user.",
        "Adds fall-control worker counts, excavation barrier/sign quantities and hot-work extinguisher quantities only when the corresponding site condition is selected.",
        "Shows framework references and exports the resulting planning quantities to CSV.",
      ],
      advantages: [
        "Every ratio and count is visible and adjustable, and none is presented as an unsupported statutory rule.",
        "The selected jurisdiction reference is separated from the site hazard assessment, so a label does not masquerade as certification.",
        "The inventory can be downloaded and reviewed alongside the site-specific safety plan.",
      ],
      limits: [
        "It does not assess hazards, select protective systems, design fall arrest, determine sign placement, or verify training and emergency arrangements.",
        "It does not interpret local legislation, state-plan rules, CDM duties or ISO adoption for a specific project.",
        "A competent local safety professional must confirm controls and quantities before procurement or work begins.",
      ],
    },
  },
  {
    slug: "material-price-index",
    route: "/material-price-index",
    name: "Live Material Price Index",
    category: "commercial",
    questions: [
      {
        q: "What does the price index show?",
        a: "How material prices have moved over time by market, as a series, not a single figure, so a quote can be read against the trend it sits in.",
      },
      {
        q: "Where do the prices come from?",
        a: "From verified price records with their dates and sources. A series without a source is not published.",
      },
      {
        q: "Can I use it to price a job?",
        a: "It shows the direction and size of movement. A quotation still needs a current supplier figure for the quantity you need.",
      },
      {
        q: "Why does the index matter to a contractor?",
        a: "Because a fixed price held for three months is exposed to the trend. Seeing the movement makes a validity period a decision, not a habit.",
      },
      {
        q: "Does it cover every material?",
        a: "It covers what has been recorded. Coverage is stated with the series, and gaps are visible instead of interpolated.",
      },
    ],
    article: {
      summary:
        "How material prices have moved by market, from sourced and dated records.",
      description:
        "A price movement index. Each material carries a series built from verified, dated price records, so a contractor can see whether the figure in a quotation sits above or below the recent trend and how quickly it is moving.",
      functions: [
        "Plots price movement per material over time and by market.",
        "Shows the date and source behind each recorded price.",
        "Reports coverage so gaps are visible.",
        "Compares a quoted figure against the current series.",
      ],
      advantages: [
        "A trend makes a price validity period a decision with evidence behind it.",
        "Sources and dates travel with each point, so a figure can be checked.",
        "Missing coverage is shown, not filled by interpolation.",
      ],
      limits: [
        "It is not a live supplier quotation.",
        "It does not forecast future prices.",
        "It does not adjust a quotation automatically.",
      ],
    },
  },
  {
    slug: "code-reference",
    route: "/code-reference",
    name: "International Code Reference",
    category: "commercial",
    questions: [
      {
        q: "What does the code reference contain?",
        a: "Reference notes on the standards that govern materials and methods in each market, with the jurisdiction they apply to named on every entry.",
      },
      {
        q: "Is this the standard itself?",
        a: "No. It is a pointer to the clause that matters, with a summary. The published standard is the authority and the tool says so.",
      },
      {
        q: "Why does jurisdiction matter so much?",
        a: "Because a mix ratio, a cover to reinforcement or a fall on a roof changes at a border. A note without its jurisdiction is a note you cannot rely on.",
      },
      {
        q: "Does the calculator check compliance?",
        a: "No. The estimators measure quantities. Compliance is a design and inspection activity, and this reference supports reading a drawing, not certifying it.",
      },
      {
        q: "How current is it?",
        a: "Each entry carries the edition it refers to, so a superseded standard is visible as superseded instead of quietly wrong.",
      },
    ],
    article: {
      summary:
        "Reference notes on the standards behind each method, with jurisdiction and edition stated.",
      description:
        "A standards reference indexed by trade and market. Each entry names the jurisdiction, the edition and the clause it summarises, so a specification can be checked against the right document instead of a remembered rule of thumb.",
      functions: [
        "Indexes reference notes by trade and jurisdiction.",
        "Names the edition and clause each note summarises.",
        "Links a note to the calculator that applies it.",
        "Flags a superseded edition where one is recorded.",
      ],
      advantages: [
        "Jurisdiction sits on every entry, so a rule is never applied in the wrong country.",
        "Editions are dated, which keeps a superseded standard visible.",
        "Notes are tied to the tools that use them, so reading and calculating stay together.",
      ],
      limits: [
        "It summarises standards, it does not replace them.",
        "It does not certify compliance with any code.",
        "It does not interpret a standard for a specific design.",
      ],
    },
  },
  {
    slug: "material-advisor",
    route: "/material-advisor",
    name: "Climate Material Advisor",
    category: "commercial",
    questions: [
      {
        q: "What does the material advisor do?",
        a: "It narrows material choices for a climate and exposure, so a specification starts from what suits the conditions instead of from what was last used.",
      },
      {
        q: "What does it base the advice on?",
        a: "On the climate zone and exposure you select, matched against recorded performance notes, with the reasoning shown instead of a verdict.",
      },
      {
        q: "Does it price anything?",
        a: "No. It guides selection. Once a material is chosen, the calculators price it with their own inputs.",
      },
      {
        q: "Is this engineering advice?",
        a: "No. It is a starting point for specification. Structural and waterproofing design decisions remain with the designer.",
      },
      {
        q: "What about availability locally?",
        a: "Availability changes and is market specific, so the advisor flags suitability and leaves sourcing to you and your supplier.",
      },
    ],
    article: {
      summary:
        "Material choices narrowed by climate and exposure, with the reasoning shown.",
      description:
        "A specification aid. Climate zone and exposure conditions are matched against recorded material performance, giving a shortlist that suits the conditions with the reasoning visible, so a specification starts from suitability instead of habit.",
      functions: [
        "Matches climate zone and exposure to suitable material classes.",
        "Shows the reasoning behind each suggestion.",
        "Links a chosen material to the calculator that measures it.",
        "Keeps unsuitable options visible with the reason they were excluded.",
      ],
      advantages: [
        "Reasoning is shown, so a suggestion can be argued with instead of obeyed.",
        "A shortlist replaces a blank page at the start of a specification.",
        "Excluded options stay visible, which is useful when local stock forces a second choice.",
      ],
      limits: [
        "It is not engineering advice and does not design anything.",
        "It does not check local availability or lead times.",
        "It does not price the materials it suggests.",
      ],
    },
  },
  {
    slug: "regional-cost-index",
    route: "/regional-cost-index",
    name: "Regional Cost Index",
    category: "commercial",
    questions: [
      {
        q: "What does the regional index do?",
        a: "It expresses how costs differ between locations, so an estimate built for one market can be read against another without pretending the prices are the same.",
      },
      {
        q: "Where do the indexes come from?",
        a: "From configured regional factors with their basis recorded. A region without a factor stays unpriced instead of taking the default.",
      },
      {
        q: "Does it convert currency too?",
        a: "Currency and cost level are separate questions. The index handles the cost level; exchange rates are a displayed figure, not a hidden multiplier.",
      },
      {
        q: "Why not just use one national price?",
        a: "Because transport, labour availability and local materials move a price by a wide margin. A single national figure is accurate nowhere in particular.",
      },
      {
        q: "Can I apply it to a saved estimate?",
        a: "The factor applies to the estimate it is used with, and the factor is shown so the adjusted figure can be explained.",
      },
    ],
    article: {
      summary: "How costs differ by location, from recorded regional factors.",
      description:
        "A regional cost comparison. Each location carries a factor with its basis recorded, which lets an estimate built in one market be read in another with the adjustment visible instead of buried in new rates.",
      functions: [
        "Applies recorded regional factors to an estimate.",
        "Shows the factor and its basis beside the adjusted figure.",
        "Keeps currency conversion distinct from cost level adjustment.",
        "Leaves a region without a configured factor unpriced.",
      ],
      advantages: [
        "The adjustment is stated, so a client can see why a price moved between towns.",
        "Currency and local cost level stay separate, which prevents double counting.",
        "A missing region shows as missing instead of inheriting a national default.",
      ],
      limits: [
        "It does not produce local supplier prices.",
        "It does not handle exchange rate movement or hedging.",
        "It does not account for site specific access and transport.",
      ],
    },
  },
  {
    slug: "defect-diagnosis",
    route: "/defect-diagnosis",
    name: "Defect Diagnosis",
    category: "commercial",
    questions: [
      {
        q: "What does the defect diagnosis do?",
        a: "It takes the symptoms you describe, such as damp patches, cracking or paint blistering, and lists the causes that commonly produce them, with the checks that separate one from another.",
      },
      {
        q: "Does it tell me what is wrong?",
        a: "It narrows the field and names the test that settles it. Diagnosis from a description alone is a guess, and the tool is explicit about that.",
      },
      {
        q: "Why give several causes?",
        a: "Because a damp patch can be a leak, a bridged damp course, condensation or a failed seal. Naming one cause from a sentence is how a remedial job gets done twice.",
      },
      {
        q: "Does it price the repair?",
        a: "No. It identifies what to check. Once the cause is established, the relevant estimator prices the work.",
      },
      {
        q: "Where does the knowledge come from?",
        a: "From recorded cause and symptom pairs with their sources, so an entry can be traced to the guidance behind it.",
      },
    ],
    article: {
      summary:
        "Symptoms mapped to likely causes, with the check that tells them apart.",
      description:
        "A diagnostic aid for building defects. Symptoms are matched against recorded cause and symptom pairs, giving a shortlist of likely causes each paired with the inspection that confirms or eliminates it, so a repair follows a finding, not an assumption.",
      functions: [
        "Matches described symptoms to recorded causes.",
        "Pairs each cause with the check that distinguishes it.",
        "Links a confirmed cause to the estimator that prices the repair.",
        "Shows the source behind each recorded entry.",
      ],
      advantages: [
        "A shortlist with tests beats a single confident guess, which is how the same defect gets repaired twice.",
        "Checks are named, so the next site visit has a purpose.",
        "Entries trace to a source, so the reasoning can be reviewed.",
      ],
      limits: [
        "It cannot diagnose from a description alone.",
        "It does not replace a site inspection or a specialist survey.",
        "It does not price remedial work.",
      ],
    },
  },
  {
    slug: "bim-ifc-import",
    route: "/bim-ifc-import",
    name: "BIM and IFC Import",
    category: "commercial",
    questions: [
      {
        q: "What does the IFC import do?",
        a: "It reads element quantities from an IFC model and maps them to the trade engines, so a model becomes an estimate without retyping dimensions.",
      },
      {
        q: "What happens to elements it cannot map?",
        a: "They are listed as unmapped with their type and quantity, so a gap in the model is visible instead of silently missing from the total.",
      },
      {
        q: "Are the model quantities trusted directly?",
        a: "They are shown before use. A model carries its own modelling conventions and errors, so quantities are presented for confirmation and the source element stays attached.",
      },
      {
        q: "Which quantities come through?",
        a: "Whatever the model states for area, volume and length per element, mapped to the engine that measures that trade. Derived design quantities are not invented.",
      },
      {
        q: "Does it validate the model?",
        a: "No. It reads what the model says. Model quality and coordination are a design review activity.",
      },
    ],
    article: {
      summary:
        "Model element quantities mapped to trade engines, with unmapped elements listed.",
      description:
        "An IFC import path into estimating. Element area, volume and length are read from the model, mapped to the engine that measures each trade, and presented with the source element attached, while anything unmapped is listed, not dropped.",
      functions: [
        "Reads element quantities from an uploaded IFC model.",
        "Maps element types to the trade engines that measure them.",
        "Lists unmapped elements with their type and quantity.",
        "Keeps the source element reference on each resulting line.",
      ],
      advantages: [
        "Dimensions transfer from model to estimate without retyping.",
        "Unmapped elements are declared, so a missing trade is noticed before the quote is sent.",
        "Source references make a model based estimate as auditable as a manual takeoff.",
      ],
      limits: [
        "It does not validate or coordinate the model.",
        "It does not invent quantities the model does not carry.",
        "It does not design anything from the geometry it reads.",
      ],
    },
  },
  {
    slug: "field-sync",
    route: "/field-sync",
    name: "Field Sync",
    category: "commercial",
    questions: [
      {
        q: "What does field sync do?",
        a: "It brings measurements and notes recorded on site back into the estimate, so a dimension taken at the wall does not have to be remembered and retyped later.",
      },
      {
        q: "What happens if a sync clashes with a stored figure?",
        a: "The clash is shown and you choose which value stands. Nothing is overwritten quietly, because the site figure and the drawing figure are both evidence.",
      },
      {
        q: "Does it work offline?",
        a: "Records can be captured and sent when a connection returns. The state of each record is shown so an unsent measurement is not mistaken for a saved one.",
      },
      {
        q: "Is it a project management tool?",
        a: "No. It moves measurements and notes between site and estimate. Task tracking and document control are separate.",
      },
      {
        q: "Who can see a synced record?",
        a: "Whoever has access to the estimate it belongs to, under the same permissions as the rest of the project.",
      },
    ],
    article: {
      summary:
        "Site measurements and notes returned to the estimate, with conflicts shown instead of overwritten.",
      description:
        "A link between the site and the estimate. Measurements and notes captured on site are returned to the project record, each with its state visible, and a value that disagrees with a stored figure is presented as a choice instead of being resolved silently.",
      functions: [
        "Returns site measurements and notes to the estimate they belong to.",
        "Shows the sync state of every captured record.",
        "Presents a conflicting value as a decision instead of overwriting.",
        "Keeps the site record alongside the figure it replaced.",
      ],
      advantages: [
        "Dimensions reach the estimate without a retyping step and its errors.",
        "Conflicts are explicit, so the drawing and the wall can both be considered.",
        "Unsent records are visible, which prevents a measurement being lost quietly.",
      ],
      limits: [
        "It is not project management, task tracking or document control.",
        "It does not resolve a conflict for you.",
        "It does not validate a measurement against a tolerance.",
      ],
    },
  },
  {
    slug: "material-prices",
    route: "/material-prices",
    name: "Material Prices",
    category: "commercial",
    questions: [
      {
        q: "What does the material price page show?",
        a: "Current recorded prices per material and market, each with the date it was captured and the source it came from.",
      },
      {
        q: "Are these prices guaranteed?",
        a: "No. They are recorded figures with dates. A supplier quotation for your quantity is the authority, and the page says so.",
      },
      {
        q: "Why does the date matter?",
        a: "Because a price without a date cannot be judged. A figure from six months ago is history, and showing its date is what stops it being used as current.",
      },
      {
        q: "Can I see where a price came from?",
        a: "Yes. Each recorded price carries its source reference, so a figure can be checked against the supplier or the survey it came from.",
      },
      {
        q: "How does this relate to the calculators?",
        a: "The estimators use configured price data. Where a material has no verified price, the calculator asks you to enter one instead of assuming it.",
      },
    ],
    article: {
      summary:
        "Recorded material prices by market, each with a date and a source.",
      description:
        "A price record, not a price list. Every material carries the figure recorded for it, the date it was captured and the source behind it, so a reader can judge whether the number is current and where it came from.",
      functions: [
        "Lists recorded prices per material and market.",
        "Shows the capture date and source reference beside each price.",
        "Marks materials with no verified price as unpriced.",
        "Links a priced material to the calculators that use it.",
      ],
      advantages: [
        "A date on every figure prevents an old price being read as today's.",
        "Source references make a price checkable.",
        "Unpriced materials are declared, which keeps a quotation honest.",
      ],
      limits: [
        "It is not a supplier quotation or a commitment to supply.",
        "It does not include delivery, tax or quantity breaks.",
        "It does not update itself from a supplier feed.",
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
