/**
 * Tool FAQ registry — the single source for every on-page question.
 *
 * Two rules keep this honest and useful:
 *
 * 1. Answers are plain text, never JSX. The same string renders in the
 *    accordion and in the FAQPage structured data, so the markup Google reads
 *    can never say something the visitor cannot see.
 * 2. Answers describe what the calculator actually does with the inputs, and
 *    name what it leaves out. No coverage rate, mix ratio or price is quoted
 *    here that the tool does not print in its own breakdown.
 *
 * Pages read this by slug through <ToolFaqs />, and /faq lists every group.
 */

export interface ToolFaqQuestion {
  q: string;
  a: string;
}

export interface ToolFaqGroup {
  /** Stable key used by pages. */
  slug: string;
  /** Public route of the tool the questions belong to. */
  route: string;
  /** Tool name as it appears on the page and in the FAQ index. */
  name: string;
  category: FaqCategoryId;
  questions: ToolFaqQuestion[];
}

import { ENGINE_FAQ_GROUPS } from "@/config/engine-faqs";

export type FaqCategoryId =
  | "finishes"
  | "structure"
  | "services"
  | "sitework"
  | "project"
  | "commercial"
  | "quotes"
  | "platform";

export const FAQ_CATEGORIES: { id: FaqCategoryId; label: string }[] = [
  { id: "finishes", label: "Painting, tiling and finishes" },
  { id: "structure", label: "Foundation, roof and structure" },
  { id: "services", label: "Electrical and plumbing" },
  { id: "sitework", label: "Groundwork and site clearance" },
  { id: "project", label: "Programme, labour and cash flow" },
  { id: "commercial", label: "Costing and commercial control" },
  { id: "quotes", label: "Quotes and client estimates" },
  { id: "platform", label: "Using FRELUX" },
];

const BASE_TOOL_FAQS: ToolFaqGroup[] = [
  {
    slug: "paint-calculator",
    route: "/paint-calculator",
    name: "Paint Calculator",
    category: "finishes",
    questions: [
      {
        q: "How many coats of paint do I need for a room?",
        a: "Two coats is the normal finish for an interior repaint, and three when the colour is changing sharply or the wall is patching bare plaster. The calculator applies the number of coats you choose to your wall and ceiling area and shows the litres for each coat separately, so a one-coat refresh is not priced as a full job.",
      },
      {
        q: "How do I work out how much paint to buy for a room?",
        a: "Measure the wall area you are painting, subtract the doors and windows you are not painting, then divide by the coverage stated on the tin. The calculator does the subtraction and division for you and rounds up to the tin sizes sold in your market, because paint is bought by the tin rather than the litre.",
      },
      {
        q: "Does the paint estimate include primer and undercoat?",
        a: "Primer and undercoat are separate products with their own coverage, so they appear as their own lines with their own quantities rather than being folded into the topcoats. If you are painting over a sound, previously painted wall you can leave them out.",
      },
      {
        q: "What is not included in a paint estimate?",
        a: "Labour, masking, sanding, filler and any surface repair are outside the material quantities. The estimate covers paint and primer, which is what you take to the paint shop.",
      },
    ],
  },
  {
    slug: "tile-calculator",
    route: "/tile-calculator",
    name: "Tile Calculator",
    category: "finishes",
    questions: [
      {
        q: "How many tiles do I need for a floor or wall?",
        a: "Divide the surface area by the area of one tile, then add the waste allowance for edge cuts and breakage. The calculator does that from your room dimensions and your tile size, and rounds up to whole tiles because suppliers do not sell fractions of a box.",
      },
      {
        q: "Why does the tile calculator add a waste allowance?",
        a: "Edge cuts rarely use a whole tile, and tiles break in handling and during later repairs. The allowance is shown as its own figure so you can see the number of tiles you need to lay and the number you need to buy.",
      },
      {
        q: "How much tile adhesive and grout will I need?",
        a: "Adhesive comes from the bed thickness and the coverage stated on the bag, and grout from the joint width and the tile size. Both appear as separate lines in the estimate, priced from the shared material database.",
      },
      {
        q: "Should I buy exactly the tiles the calculator shows?",
        a: "Keep at least one box back from the order for future repairs: matching a tile dye lot later is not reliable. The waste allowance covers cuts, not a spare box for the future.",
      },
    ],
  },
  {
    slug: "pop-ceiling-calculator",
    route: "/pop-ceiling-calculator",
    name: "POP Ceiling Calculator",
    category: "finishes",
    questions: [
      {
        q: "How do I calculate how much POP I need for a ceiling?",
        a: "Start from the ceiling area, add the waste allowance for cuts and offcuts, and the calculator converts that into the plaster of Paris and backing materials it lists. Screed and adhesive quantities follow the coverage of the product you are using.",
      },
      {
        q: "Does the POP calculator account for the ceiling design?",
        a: "A design changes the framing and the number of noggins and trims rather than the board or screed area. The calculator works from area and prints the rule it used, so you can check that figure against your layout drawing before ordering.",
      },
      {
        q: "Are labour and scaffolding included in a POP ceiling estimate?",
        a: "No. The estimate is materials only: boards, screed, adhesive, tape and fixings. Ceiling labour and any scaffolding are separate costs that vary too much by crew to sit inside a material estimate.",
      },
    ],
  },
  {
    slug: "screeding-calculator",
    route: "/screeding-calculator",
    name: "Screeding Calculator",
    category: "finishes",
    questions: [
      {
        q: "How much sand and cement do I need for a floor screed?",
        a: "Screed volume is the floor area multiplied by the thickness, and the cement and sand split follows the mix ratio printed in the estimate. Change the thickness and every quantity moves with it, which is why the thickness is the first thing to confirm on site.",
      },
      {
        q: "How thick should a floor screed be?",
        a: "The calculator does not choose your thickness: it converts the thickness you specify. Thin screeds over an uneven slab crack, so confirm the depth with the person laying it before you order material.",
      },
      {
        q: "Does a screeding estimate include the floor finish?",
        a: "No. It covers the screed itself: cement, sand and any additive the mix calls for. Tiles, screed boards or resin finishes are priced by their own calculators.",
      },
    ],
  },
  {
    slug: "foundation-calculator",
    route: "/foundation",
    name: "Foundation Calculator",
    category: "structure",
    questions: [
      {
        q: "How much concrete do I need for a foundation?",
        a: "Concrete volume comes from the footing and strip dimensions you measure, and the calculator splits that volume into cement, sand and granite using the mix ratio it prints. Every constant is visible, so you can check the split against the mix you actually use on site.",
      },
      {
        q: "How many blocks do I need for the foundation?",
        a: "Block count follows the blocks-per-square-metre rule for the block size you are using, plus the waste allowance. Change the block size and the count changes, because the rule is about coverage rather than a fixed number per metre.",
      },
      {
        q: "Is this foundation design?",
        a: "No. It is a material estimate from dimensions you provide. Footing size, depth and reinforcement are structural engineering decisions, and the calculator refers you to an engineer rather than sizing a foundation for you.",
      },
      {
        q: "Does the foundation estimate include formwork?",
        a: "Formwork is its own line. The calculator asks for the contact area of formwork and accepts zero when you are pouring directly against the soil, which is normal for a strip footing. Nothing is added on your behalf, so a foundation poured against earth is not priced as though it were boxed.",
      },
      {
        q: "Does the foundation cost include tax?",
        a: "No. Tax is not determined by FRELUX: the estimate reports tax as undetermined rather than applying a percentage that may be wrong for your jurisdiction. Add your own VAT or withholding figure afterwards if your contract requires it.",
      },
    ],
  },
  {
    slug: "build-to-roof-estimator",
    route: "/build-to-roof-estimator",
    name: "Build to Roof Estimator",
    category: "structure",
    questions: [
      {
        q: "What is a build-to-roof estimator?",
        a: "It estimates the materials from setting out up to and including the roof: blocks, mortar, concrete, lintels, timber and roofing sheets. It exists because most self-builders want to know the cost of getting a building watertight before committing to finishes.",
      },
      {
        q: "How are roofing sheets calculated from a roof area?",
        a: "Sheet count comes from the roof area and the effective cover of the sheet profile you choose, with the pitch applied to the plan area. The calculator shows the roof area it used so you can compare it with your drawing.",
      },
      {
        q: "Where does the eaves perimeter come from?",
        a: "The same perimeter calculation the roof engine uses for fascia. The soffit and gutter estimator reads that figure too, so both tools start from one perimeter instead of two that disagree.",
      },
      {
        q: "Where does the build to roof estimate stop?",
        a: "At the roof covering. The estimator follows the structure from foundation through walls to roof, and finishes, electrical and plumbing stay separate because they are priced from different quantities. A build to roof figure is the shell, not a finished house.",
      },
      {
        q: "Why does the cement bag count change when I change the mix ratio?",
        a: "Because the ratio is the calculation rather than a preference. Wet concrete volume is converted to dry volume, split by the mix parts you choose, and cement is expressed in bags of a fixed size, so a 1:2:4 mix and a 1:3:6 mix give different bag counts for the same pour. The breakdown prints the volume behind each figure so you can check the arithmetic.",
      },
    ],
  },
  {
    slug: "retaining-wall-calculator",
    route: "/retaining-wall-calculator",
    name: "Retaining Wall Calculator",
    category: "structure",
    questions: [
      {
        q: "How wide should a retaining wall footing be?",
        a: "Width scales with wall height, and the calculator widens the recommendation for soils that push harder, such as loose sand and wet clay. The recommended width is shown next to the width actually used, and any override you enter is recorded as an override rather than presented as the recommendation.",
      },
      {
        q: "How many weep holes does a retaining wall need?",
        a: "The estimate places weep holes at the spacing printed in the inputs, along the wall length, and counts the pipe and aggregate they need. Drainage is what keeps a wall standing, so the weep holes are never optional lines.",
      },
      {
        q: "Can I use this instead of an engineer for a retaining wall?",
        a: "No. This is a material takeoff, not a design. Footing width, stem thickness and reinforcement need a structural engineer, and a site investigation matters more than any calculator because water behind a wall is what makes walls fail.",
      },
      {
        q: "What does the soil type change?",
        a: "The footing geometry. Loose sand and wet clay carry more lateral thrust, so the recommended footing width grows by a printed rule instead of an opinion. The width stays visible and editable, because a site investigation beats a dropdown.",
      },
      {
        q: "What happens if I do not know the soil type?",
        a: "The wall is calculated on the default footing width and the breakdown shows that default, so the figure is traceable rather than quietly conservative. Confirm the soil on site and then override the width, since a wall holding back unknown fill should not be built on a guess.",
      },
    ],
  },
  {
    slug: "soffit-gutter-cost-estimator",
    route: "/rainwater-gutter-soffit-cost-estimator",
    name: "Soffit, Fascia and Gutter Estimator",
    category: "structure",
    questions: [
      {
        q: "How much gutter and fascia do I need for a roof?",
        a: "Both follow the roof perimeter at the eaves, plus a cutting allowance. If you only have the building footprint, the calculator derives the eaves perimeter from it and the overhang width, and shows the perimeter it used.",
      },
      {
        q: "How many downpipes does a roof need?",
        a: "Downpipes are placed at the spacing printed in the estimate along the gutter run, so a longer perimeter gets more of them. Outlets, stop ends and the soakaway or tank at the bottom are not included.",
      },
      {
        q: "How much soffit area does an overhang create?",
        a: "Soffit area is the eaves perimeter multiplied by the overhang width, per side of the roof. A deeper overhang increases the soffit boards and the support needed for them, which is why overhangs beyond the common depth are flagged.",
      },
      {
        q: "Will the fascia length match my roof estimate?",
        a: "Yes, it runs through the same eaves perimeter helper as the roof engine. The band between roof and wall is measured once and then split into linear fascia and gutter, so a contractor who already ran the roof does not get a second and different perimeter here.",
      },
      {
        q: "How is downpipe spacing decided?",
        a: "By the spacing you enter. The gutter run is divided by that spacing and rounded up to whole downpipes, so a shorter spacing buys more pipe. FRELUX does not assume a spacing for you, because rainfall and roof area decide it.",
      },
    ],
  },
  {
    slug: "electrical",
    route: "/electrical",
    name: "Electrical Estimator",
    category: "services",
    questions: [
      {
        q: "How do I estimate electrical materials for a building?",
        a: "Count the points first: lights, sockets, switches and dedicated outlets. The calculator converts those counts into cable, conduit, boxes and accessories, and prices them from the shared material database.",
      },
      {
        q: "Can I use the electrical estimate instead of an electrician?",
        a: "It tells you what material to buy, not how to wire it. Circuit sizing, breaker ratings, earthing and volt drop remain the electrician's design, and a takeoff cannot substitute for them.",
      },
      {
        q: "Why is the cable quantity different from what my electrician measured?",
        a: "Estimates work from allowances per point, while an electrician measures actual routes through ceilings, walls and switch drops. Ceiling height, wall thickness and the route between points all change the real figure.",
      },
    ],
  },
  {
    slug: "conduit-wiring-estimator",
    route: "/electrical-conduit-wiring-estimator",
    name: "Conduit and Wiring Estimator",
    category: "services",
    questions: [
      {
        q: "How much conduit do I need for a house?",
        a: "Conduit comes from floor area using the metres-per-square-metre rule printed in the estimate, plus the cable allowance for each lighting and socket point. Long corridors and multiple floors need longer runs than the area figure suggests.",
      },
      {
        q: "How do I know which cable size to use?",
        a: "The calculator uses the standard split between lighting circuits and power circuits, and shows which cable each line refers to. It does not size cable for load: that is the electrician's calculation.",
      },
      {
        q: "Are junction boxes and switch plates included?",
        a: "Yes, along with sockets and switches, counted from the number of points you enter. Without a configured price a line shows its quantity and asks you for the price you were quoted rather than inventing one.",
      },
    ],
  },
  {
    slug: "steel-beam-calculator",
    route: "/structural-steel-i-beam-calculator",
    name: "Steel I-Beam Calculator",
    category: "structure",
    questions: [
      {
        q: "How do I calculate the weight of a steel I-beam?",
        a: "Mass is span multiplied by the nominal weight per metre of the section, multiplied by the number of beams. Sheet and merchant tables both work in kilograms per metre, so the total in kilograms and tonnes is the figure you order against.",
      },
      {
        q: "How far can a steel I-beam span without support?",
        a: "It depends on the section, the load and the deflection limit, so no calculator should answer it as a single number. The estimate flags open spans beyond eight metres for an engineer's deflection check before fabrication.",
      },
      {
        q: "Why is there no default price for steel?",
        a: "FRELUX does not publish steel rates because merchants quote per tonne and rates move weekly. You enter the rate you were quoted, and the mass figure stays the part that is certain.",
      },
      {
        q: "How do I choose the beam profile?",
        a: "The profile is your structural decision. The calculator asks which one you are using, or which situation you are in such as a floor slab span or a medium opening, and then converts span and beam count into mass using that profile's kilograms per metre.",
      },
      {
        q: "Does the steel estimate include connections, base plates or fire protection?",
        a: "No. It prices steel by mass, which is what a fabricator quotes against. Bolts, welded connections, base plates, painting and fire protection are separate items you take from your own fabricator, and none of them are assumed for you.",
      },
    ],
  },
  {
    slug: "plumbing",
    route: "/plumbing",
    name: "Plumbing Estimator",
    category: "services",
    questions: [
      {
        q: "How do I estimate plumbing materials for a building?",
        a: "Start from the fixtures and wet areas, then the pipe runs between them. The calculator converts that into pipe, fittings, and the fixture schedule, priced from the shared material database.",
      },
      {
        q: "Does the plumbing estimate include a soakaway or septic tank?",
        a: "Not by default. Drainage structures are sized by their own calculators, so add the septic or soakaway estimate to the plumbing figure before you compare it with a contractor's quote.",
      },
      {
        q: "Which pipe sizes should I choose?",
        a: "Sizes follow the fixtures served and the run length. The estimate prices the sizes you select and shows the quantities, but pressure and flow design for a large building belongs with a plumber or engineer.",
      },
    ],
  },
  {
    slug: "doors-windows",
    route: "/doors-windows",
    name: "Doors and Windows Estimator",
    category: "structure",
    questions: [
      {
        q: "How do I estimate doors and windows for a building?",
        a: "Count openings by type and size, and the calculator converts that into door leaves, frames, ironmongery and window units with glazing. Openings are the one quantity that comes straight from the drawing rather than from a rule.",
      },
      {
        q: "Are frames and hardware included?",
        a: "Yes, frames and standard ironmongery appear as their own lines so you can see what a complete opening costs. Specialist hardware, such as security doors or automation, is priced separately.",
      },
      {
        q: "Should I add a waste allowance to doors and windows?",
        a: "Not for the units themselves: they are made to size and there are no cuts. Allowance matters for trims and architraves, which do get cut and mitered on site.",
      },
      {
        q: "What happens if I leave the door and window counts blank?",
        a: "The estimate reports the schedule as missing instead of inventing openings. A blank schedule and a house with no doors are different things, and pricing the wrong one wastes your time.",
      },
      {
        q: "How are hinges and locksets handled?",
        a: "Frames follow the door count at one set per door, and hinges appear as a labelled planning allowance per door rather than a hidden extra. Locksets are included only when you switch them on, so a quote for doors alone is not padded with ironmongery.",
      },
    ],
  },
  {
    slug: "quotes",
    route: "/quotes",
    name: "Quote Pipeline",
    category: "quotes",
    questions: [
      {
        q: "What do the stages on a quote mean?",
        a: "Draft is still yours and not shared. Sent means the link has gone to the client, viewed means they opened it, approved is their yes, changes requested is their no with notes, and expired means the validity ran out. The pipeline holds one stage per quote, so the list reads as a pipeline rather than a pile.",
      },
      {
        q: "When does a quote expire?",
        a: "Validity is counted from the day the client first had the quote, which is the send date, and from creation for a quote that was never shared. The expiry date and the days remaining are derived from the stored record, so nobody has to remember when it went out.",
      },
      {
        q: "Why are the totals shown per currency?",
        a: "Because FRELUX does not convert money. A naira quote and a dollar quote are separate figures, and adding them would invent an exchange rate. Each currency gets its own open, approved and draft lines.",
      },
      {
        q: "How is the acceptance rate calculated?",
        a: "Approved quotes divided by the quotes the client has actually decided on, which is approved plus changes requested. Open and expired quotes are left out, so a full inbox neither flatters nor punishes the ratio.",
      },
      {
        q: "Which quotes should I chase?",
        a: "A sent or viewed quote is flagged for follow up after three days, and one within three days of expiry is flagged as expiring. Both are computed from the stored dates and the clock, so the list maintains itself.",
      },
    ],
  },
  {
    slug: "client-estimate",
    route: "/project-workspace/:id/client-estimate/new",
    name: "Client Estimate and Quote Engine",
    category: "quotes",
    questions: [
      {
        q: "How is the total on a quote built?",
        a: "Materials, labour, transport and miscellaneous are added to give a subtotal, and your markup percentage is applied to that subtotal once. The three figures are printed separately, so a client can see what the markup actually is.",
      },
      {
        q: "Does editing a quote recalculate the job?",
        a: "No. The estimation engine decided the quantities; the quote engine only adds and marks up the figures you typed. Editing a line changes that line, and it never re-runs a calculation behind you.",
      },
      {
        q: "Why can I not edit an approved quote?",
        a: "An approved quote is the record of what the client agreed to, so editing it would rewrite history. Editing stops at approval, and the honest way forward is a new quote carrying the corrected figures.",
      },
      {
        q: "What does the client see when I share a quote?",
        a: "A link to the same stored figures, with no account needed. Because the link reads the saved quote rather than a screenshot of it, the numbers the client sees are the numbers you can see.",
      },
      {
        q: "Are transport and tax added automatically?",
        a: "Transport is a figure you enter, not one FRELUX derives from distance. Tax is never applied automatically: the quote reports tax as undetermined rather than guessing a rate that may be wrong for the client's jurisdiction.",
      },
    ],
  },
  {
    slug: "using-frelux",
    route: "/faq",
    name: "Using FRELUX",
    category: "platform",
    questions: [
      {
        q: "Are the FRELUX construction calculators free?",
        a: "Yes. Every calculator, estimator and guide is free, with no trial or paywall. The platform is supported by advertising in clearly labeled slots, and no calculation or estimate is ever influenced by an advertiser.",
      },
      {
        q: "Do I need an account to use the calculators?",
        a: "No. You can run any calculator and read the full breakdown without signing up. An account is for saving projects, keeping estimates and working with clients.",
      },
      {
        q: "How accurate are FRELUX calculators?",
        a: "Each calculator applies its formulas deterministically and prints every constant it used, along with the arithmetic, so you can check each number. What a calculator cannot know is your site: confirm quantities and prices with your supplier or contractor before committing money.",
      },
      {
        q: "Where do the prices in an estimate come from?",
        a: "From the shared material database that the price tracker maintains for your market. A material with no configured price shows its quantity and asks you for your quoted price instead of displaying an invented figure.",
      },
      {
        q: "Why does an estimate say tax is not determined?",
        a: "Because FRELUX will not apply a rate it cannot verify for your jurisdiction. Tax is reported as not determined and left for you or your accountant to apply at the correct rate.",
      },
    ],
  },
];

/**
 * One catalogue: the original tool groups plus the wider engine family. Kept as
 * two declarations only because the second file would otherwise be unwieldy.
 */
export const TOOL_FAQS: ToolFaqGroup[] = [
  ...BASE_TOOL_FAQS,
  ...ENGINE_FAQ_GROUPS,
];

const BY_SLUG = new Map(TOOL_FAQS.map((g) => [g.slug, g]));

export function getToolFaqGroup(slug: string): ToolFaqGroup | undefined {
  return BY_SLUG.get(slug);
}

/** Every question across the registry, for the /faq page and its schema. */
export function allToolFaqQuestions(): {
  q: string;
  a: string;
  group: ToolFaqGroup;
}[] {
  return TOOL_FAQS.flatMap((group) =>
    group.questions.map((q) => ({ ...q, group })),
  );
}

/** Tool groups in a category, in registry order. */
export function toolFaqGroupsByCategory(
  category: FaqCategoryId,
): ToolFaqGroup[] {
  return TOOL_FAQS.filter((g) => g.category === category);
}
