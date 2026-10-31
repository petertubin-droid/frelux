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
