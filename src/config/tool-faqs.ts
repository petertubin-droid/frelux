/**
 * Tool FAQ registry: the single source for every on-page question.
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
import { RENOVATION_FAQ_GROUPS } from "@/config/faq-renovation";

export type FaqCategoryId =
  | "finishes"
  | "structure"
  | "services"
  | "sitework"
  | "project"
  | "commercial"
  | "quotes"
  | "interiors"
  | "platform";

export const FAQ_CATEGORIES: { id: FaqCategoryId; label: string }[] = [
  { id: "finishes", label: "Painting, tiling and finishes" },
  { id: "structure", label: "Foundation, roof and structure" },
  { id: "services", label: "Electrical and plumbing" },
  { id: "sitework", label: "Groundwork and site clearance" },
  { id: "project", label: "Programme, labour and cash flow" },
  { id: "commercial", label: "Costing and commercial control" },
  { id: "quotes", label: "Quotes and client estimates" },
  { id: "interiors", label: "Home decor and window treatments" },
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
        a: "Measure the wall area you are painting, subtract the doors and windows you are not painting, then divide by the coverage stated on the tin. The calculator does the subtraction and division for you and rounds up to the tin sizes sold in your market, because paint is bought by the tin, not the litre.",
      },
      {
        q: "Does the paint estimate include primer and undercoat?",
        a: "Primer and undercoat are separate products with their own coverage, so they appear as their own lines with their own quantities, not being folded into the topcoats. If you are painting over a sound, previously painted wall you can leave them out.",
      },
      {
        q: "What is not included in a paint estimate?",
        a: "Labour, masking, sanding, filler and any surface repair are outside the material quantities. The estimate covers paint and primer, so you can take it to the paint shop.",
      },
      {
        q: "Does the calculator work in square feet?",
        a: "Switch the measurement unit and the wall area, coverage and tin sizes all convert together, so a job measured in feet and a specification written in litres still produce one order. Coverage is entered in the unit you work in, so the division stays in one system instead of being converted twice.",
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
      {
        q: "How do I allow for cuts, breakages and spares?",
        a: "Cuts at edges, breakages in transit and a spare box for future repair are all waste, and waste is a percentage you set. Ten percent is typical for a straight lay, more for a diagonal or herringbone, and it appears as its own line so nobody has to guess how much was allowed.",
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
        a: "A design changes the framing and the number of noggins and trims, not the board or screed area. The calculator works from area and prints the rule it used, so you can check that figure against your layout drawing before ordering.",
      },
      {
        q: "Are labour and scaffolding included in a POP ceiling estimate?",
        a: "No. The estimate is materials only: boards, screed, adhesive, tape and fixings. Ceiling labour and any scaffolding are separate costs that vary too much by crew to sit inside a material estimate.",
      },
      {
        q: "Can I estimate a POP ceiling by room count instead of area?",
        a: "A room count alone cannot price a ceiling, because two rooms of the same count can differ by several square metres. Enter each room's length and width and the calculator builds the area from them, so the board, compound and framing depend on.",
      },
      {
        q: "How is the perimeter used in a POP estimate?",
        a: "Screed, channel and trim follow the perimeter of each room, not its area. The calculator takes the perimeter from the dimensions you enter, so a long narrow room gets the framing it needs even when its area matches a square one.",
      },
    ],
  },
  {
    slug: "wallpaper-calculator",
    route: "/wallpaper-calculator",
    name: "Wallpaper Calculator",
    category: "interiors",
    questions: [
      {
        q: "How does the wallpaper calculator estimate the number of rolls?",
        a: "It divides each measured wall width by the product width to estimate full-height drops, adds the selected allowance, calculates each drop's cut length from wall height, trimming allowance and pattern repeat, then packs those lengths against the roll length. This is a planning estimate; it does not replace a product-specific cutting plan or installer check.",
      },
      {
        q: "Can I estimate wide rolls, US single or double rolls, and mural panels?",
        a: "Yes. Choose a preset or enter the dimensions printed on the package. Set physical rolls per priced package, or select fixed mural panels and panels per priced set. The estimator packs cuts within roll lengths and prices whole packages; panels are counted individually. Presets are examples, not universal standards.",
      },
      {
        q: "Can I estimate paper, vinyl, non-woven, textile, peel-and-stick and patterned wallpaper?",
        a: "Yes. Choose the material description and a visual design/match type. The material label does not trigger an invented coverage multiplier: the estimate uses the product dimensions, wall measurements, selected pattern repeat and trim allowance. Follow the exact product's hanging, direction and adhesive instructions.",
      },
      {
        q: "How do free match, straight match and half-drop affect the estimate?",
        a: "Free-match uses no pattern repeat. Straight match rounds every drop cut up to the repeat you enter. Half-drop rounds the same way and then cuts every second drop half a repeat longer, so the motif lines up across strips instead of only on alternate ones. Read the match symbol and repeat from the product label; the simplified estimate is not a full installer cutting schedule.",
      },
      {
        q: "Do doors and windows reduce the number of wallpaper rolls?",
        a: "Their measured area is always subtracted from the net area. A drop is removed from the takeoff only when the opening reaches the ceiling, because wallpaper cannot run behind it. A door or window with wall above it keeps its drop, since the strip still has to pass the opening and is cut around it. The actual layout and reusable pieces depend on opening positions and the installer.",
      },
      {
        q: "Does the calculator show live wallpaper prices or labor rates?",
        a: "No. Material and installation amounts are editable manual quotes shown in the selected market currency. FRELUX does not claim they are live or verified supplier prices, and changing markets does not convert one market's quote into another currency.",
      },
      {
        q: "How much wallpaper paste should I buy?",
        a: "Paste packs are estimated only when Paste required is selected, using the number of rolls or panels covered by one pack that you enter; you can also enter its price. Pre-pasted and self-adhesive options do not add separate paste packs. Follow the wallpaper and adhesive manufacturers' instructions because coverage depends on the specific products and surface.",
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
      {
        q: "What thickness should I enter for screeding?",
        a: "Between forty and seventy five millimetres is common for a levelling screed, and thinner for a wearing surface over a sound base. Thickness is an input because the material follows it directly, and the calculator shows the volume it implies so you can check the depth against the specification.",
      },
      {
        q: "Does screeding cover a floor or a wall?",
        a: "Both, as separate surfaces, because they are measured and ordered separately. Floor screed is usually bought by volume of sand and cement, wall render by area at a stated thickness, and the calculator keeps the two apart so one is not priced at the other's rate.",
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
        a: "Block count follows the blocks-per-square-metre rule for the block size you are using, plus the waste allowance. Change the block size and the count changes, because the rule is about coverage, not a fixed number per metre.",
      },
      {
        q: "Is this foundation design?",
        a: "No. It is a material estimate from dimensions you provide. Footing size, depth and reinforcement are structural engineering decisions, and the calculator refers you to an engineer, not sizing a foundation for you.",
      },
      {
        q: "Does the foundation estimate include formwork?",
        a: "Formwork is its own line. The calculator asks for the contact area of formwork and accepts zero when you are pouring directly against the soil, which is normal for a strip footing. Nothing is added on your behalf, so a foundation poured against earth is not priced as though it were boxed.",
      },
      {
        q: "Does the foundation cost include tax?",
        a: "No. Tax is not determined by FRELUX: the estimate reports tax as undetermined, not applying a percentage that may be wrong for your jurisdiction. Add your own VAT or withholding figure afterwards if your contract requires it.",
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
        a: "Because the ratio is the calculation, not a preference. Wet concrete volume is converted to dry volume, split by the mix parts you choose, and cement is expressed in bags of a fixed size, so a 1:2:4 mix and a 1:3:6 mix give different bag counts for the same pour. The breakdown prints the volume behind each figure so you can check the arithmetic.",
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
        a: "Width scales with wall height, and the calculator widens the recommendation for soils that push harder, such as loose sand and wet clay. The recommended width is shown next to the width actually used, and any override you enter is recorded as an override, not presented as the recommendation.",
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
        a: "The wall is calculated on the default footing width and the breakdown shows that default, so the figure is traceable, not quietly conservative. Confirm the soil on site and then override the width, since a wall holding back unknown fill should not be built on a guess.",
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
      {
        q: "How do I count points for a wiring estimate?",
        a: "Count the points you are actually installing: sockets, switches, light positions and any fixed appliance outlet, each with its own cable run. The calculator converts the count and run lengths into cable, conduit and accessories, so the estimate follows the layout, not a rate per room.",
      },
      {
        q: "Does the cable length include the drop to each point?",
        a: "Each run is the distance from the distribution board to the point, following the route the cable takes, which includes the drop from ceiling level to a socket. A measured route is what the estimate uses, and an unmeasured run is reported as missing, not estimated.",
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
        a: "Yes, along with sockets and switches, counted from the number of points you enter. Without a configured price a line shows its quantity and asks you for the price you were quoted, not inventing one.",
      },
      {
        q: "Which conduit types can I estimate?",
        a: "Surface, concealed and buried runs, in the sizes your market sells. The diameter and length you enter give the conduit, and the box and coupling count follows the points and joints, so accessories are not left to be worked out on site.",
      },
      {
        q: "How much cable goes inside a conduit?",
        a: "The conduit holds the cable the circuit needs, so cable length follows the same run as the conduit with the number of cores you specify. Where a draw wire or a spare capacity is required, that is a separate item, not extra allowance added to the cable.",
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
        a: "No. It prices steel by mass, so a fabricator can quote against it. Bolts, welded connections, base plates, painting and fire protection are separate items you take from your own fabricator, and none of them are assumed for you.",
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
      {
        q: "What does a plumbing estimate include?",
        a: "Pipe runs measured by length, fittings by count, and the fixtures you install. Each item keeps its own quantity, so a bathroom refit and a whole building can be priced from the same layout with different fixtures.",
      },
      {
        q: "How do I allow for pipe falls and bends?",
        a: "Falls add length on drainage runs and bends add fittings, so measure the route along its actual line, not in straight lines between fixtures. The estimate uses your measured route, and a route you have not measured is reported as missing.",
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
        a: "Count openings by type and size, and the calculator converts that into door leaves, frames, ironmongery and window units with glazing. Openings are the one quantity that comes straight from the drawing, not from a rule.",
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
        a: "Frames follow the door count at one set per door, and hinges appear as a labelled planning allowance per door, not a hidden extra. Locksets are included only when you switch them on, so a quote for doors alone is not padded with ironmongery.",
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
        a: "Draft is still yours and not shared. Sent means the link has gone to the client, viewed means they opened it, approved is their yes, changes requested is their no with notes, and expired means the validity ran out. The pipeline holds one stage per quote, so the list reads as a pipeline, not a pile.",
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
        a: "A link to the same stored figures, with no account needed. Because the link reads the saved quote, not a screenshot of it, the numbers the client sees are the numbers you can see.",
      },
      {
        q: "Are transport and tax added automatically?",
        a: "Transport is a figure you enter, not one FRELUX derives from distance. Tax is never applied automatically: the quote reports tax as undetermined, not guessing a rate that may be wrong for the client's jurisdiction.",
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
      {
        q: "How long does identity verification take?",
        a: "An administrator normally reviews a submitted identity document the same working day. If no administrator is available, the request is approved automatically fifteen minutes after submission, so verification never waits on someone being at a desk, and the account changes status without you resubmitting.",
      },
      {
        q: "Why is my account still unverified after I uploaded my ID?",
        a: "Because uploading a document does not grant pro status by itself. The document is held as a pending check while the account stays a client account and unverified, until an administrator approves it or the fifteen minute automatic approval runs and elevates the account.",
      },
      {
        q: "Which document can I upload to become a pro?",
        a: "One government identity document in your own name: a Nigerian NIN of eleven digits, an international passport, a drivers licence or a voters card. The number must be readable and must match the name on the account, and anything that does not match is sent back for review.",
      },
    ],
  },
];

const BLINDS_FAQ_GROUPS: ToolFaqGroup[] = [
  {
    slug: "window-blinds",
    route: "/window-blind-calculator",
    name: "Window Blinds",
    category: "interiors",
    questions: [
      {
        q: "How is a window blind priced per window and per square metre?",
        a: "Both rules apply. The calculator prices the measured opening at the market rate per square metre, then lifts the result to the minimum charge per window when the opening is small, because the same headrail, brackets, cutting and visit go into a small window as a large one.",
      },
      {
        q: "Why does a small window cost almost as much as a large one?",
        a: "Because the minimum charge takes over. A quarter of the fabric still needs the same hardware and the same fitter, so below a certain size the price stops following the area. The page shows when the minimum applied, so the figure is explained instead of argued about.",
      },
      {
        q: "What measurements do I need before ordering blinds?",
        a: "The finished opening: width across the reveal and the drop from head to sill, in the same unit. Measure every window instead of assuming they match, and decide the control side and whether the blind fits inside the reveal or over it.",
      },
      {
        q: "What changes the price between blind types?",
        a: "The waste allowance and the minimum first, then grade. Folded fabric is cut with more spare than a rigid slat, and premium prints sell at a large multiple of standard stock. The calculator applies grade as a multiplier on the rate and never on the minimum.",
      },
      {
        q: "Can I price blinds outside Nigeria?",
        a: "Yes. Measurement, waste, minimum charge and fitting are the same everywhere. Where a market has no verified price band the calculator asks for the rate you were quoted and prices the schedule with the same rules instead of converting another country's figures.",
      },
    ],
  },
];

export const EIFS_FAQ_GROUPS: ToolFaqGroup[] = [
  {
    slug: "eifs-wall-estimator",
    route: "/eifs-wall-estimator",
    name: "EIFS / ETICS Wall Estimator & Takeoff",
    category: "finishes",
    questions: [
      {
        q: "What does the EIFS / ETICS wall calculator estimate?",
        a: "It turns entered facade dimensions and openings into a full material schedule: fluid-applied water-resistive barrier (WRB), continuous insulation boards (EPS, GPS Neopor, or Mineral Wool), dual adhesive and mechanical washer fasteners, standard and high-impact armor mesh, base coat mortar, acrylic textured finish coat, starter weep screeds, corner mesh beads, and joint sealant sausages.",
      },
      {
        q: "Why is a drainage plane required in EIFS systems?",
        a: "Modern building codes (IBC 1407.4.1 and ASTM E2273) mandate EIFS with Drainage over wood-framed and light-gauge steel stud walls. The drainage cavity behind the continuous insulation provides a gravity pathway for incidental moisture to drain down to starter weep screeds, preventing water trapping.",
      },
      {
        q: "How does the calculator determine continuous insulation R-values?",
        a: "Continuous insulation (ci) eliminates thermal bridging across studs. R-values are calculated per inch/mm of thickness based on material conductivity (EPS R-3.85/in, Neopor GPS R-4.7/in, Mineral Wool R-4.2/in, XPS R-5.0/in), reporting both imperial continuous R-value and metric U-factor (W/m²·K).",
      },
      {
        q: "Where is high-impact armor mesh required on EIFS facades?",
        a: "Ground-level walls, building entrances, and vehicular traffic zones are susceptible to blunt force impacts. Heavy-duty 400 g/m² armor mesh is embedded in base coat up to 2.0 meters (6.5 feet) above grade, overlaid with standard field mesh to meet ASTM E2486 high-impact standards.",
      },
      {
        q: "What are 45-degree butterfly mesh patches and why are they counted?",
        a: "Stress concentrates diagonally at window and door rough opening corners. The takeoff calculates 45-degree diagonal mesh patches (butterfly strips, minimum 200mm x 300mm) at every fenestration corner to prevent re-entrant cracking in the base coat.",
      },
    ],
  },
];

const ICF_FAQ_GROUPS: ToolFaqGroup[] = [
  {
    slug: "icf-wall-estimator",
    route: "/icf-wall-estimator",
    name: "ICF Wall Estimator & Takeoff",
    category: "structure",
    questions: [
      {
        q: "What does the ICF wall calculator actually calculate?",
        a: "It turns entered perimeter, height, and core thickness into a complete physical takeoff: straight form blocks, 90-degree corner pairs, 45-degree splays, ready-mix concrete pump volume (deducting internal tie webs), rebar schedules for starter dowels, vertical grid, horizontal courses, and lintel cages, turnbuckle bracing strongbacks, rough bucking, and envelope thermal ratings.",
      },
      {
        q: "How is concrete core volume calculated for ICF walls?",
        a: "From net wall face area multiplied by core thickness (100mm to 300mm), minus approximately 1.5% internal volume displaced by molded polypropylene webs, plus an explicit pump hopper and placement waste allowance (typically 3% to 5%). It outputs ready-mix truck counts (6m³ and 8m³) as well as site-mix ingredient weights for cement, sand, pea gravel, and water.",
      },
      {
        q: "What rebar schedule does an ICF wall require?",
        a: "Vertical reinforcing steel spaced at 400mm or 600mm centers with matching footing starter dowels, continuous horizontal runs in molded web saddles at 400mm or 800mm vertical increments with 48 bar diameter lap splices, and reinforced lintel header cages with top and bottom tensile steel plus shear stirrups over door and window openings spanning 0.8m or wider.",
      },
      {
        q: "Why is turnbuckle alignment bracing required?",
        a: "Lightweight EPS forms must be held plumb, aligned, and braced against hydrostatic concrete pressure and wind before and during the pour. The estimator sizes adjustable turnbuckle strongbacks every 2.0 meters along the wall perimeter plus additional units at all corners, along with integrated catwalk scaffolding brackets for safe placement access.",
      },
      {
        q: "What are the fire, acoustic and thermal ratings of ICF?",
        a: "Double 64mm EPS panels provide continuous insulation with an R-22 rating (RSI 3.87) or R-28.5 (RSI 5.02) for graphite Neopor. The solid concrete core delivers STC 48 to STC 58 acoustic isolation and a 1.5 to 4-hour fire rating depending on thickness. Building codes mandate a 15-minute thermal barrier (such as 12.5mm gypsum board) on all interior living surfaces.",
      },
    ],
  },
];

const WATER_FAQ_GROUPS: ToolFaqGroup[] = [
  {
    slug: "borehole-water-system",
    route: "/borehole-water-system-estimator",
    name: "Borehole and Water System",
    category: "services",
    questions: [
      {
        q: "How is the overhead tank and its stand sized?",
        a: "From the load the tank puts on the ground. A litre of water is a kilogram, so a 5,000 litre tank is five tonnes before the shell, ring beam, deck and piers are added. The tool divides that between piers, sizes a footing pad under each one against an allowable bearing figure, and puts a reinforced ring beam under the tank so it is supported all round.",
      },
      {
        q: "Why does the stand need wind and footing checks?",
        a: "Because a tank six metres in the air is a weight on the ground and a sail in the wind. The tool converts a basic wind speed into pressure, applies it to the tank and the stand, and compares the overturning moment with what the empty stand resists, expecting a factor of safety of 1.5. Separately it checks the pad pressure against the ground.",
      },
      {
        q: "How deep should the submersible pump sit?",
        a: "Below the pumping water level, not the static level. The tool estimates drawdown from safe yield and aquifer type, sets the pump about five metres under the result, and warns when the cased depth is too shallow, when submergence falls under two metres, or when the pump would sit at or below the top of the screen.",
      },
      {
        q: "How much tank storage does a house need?",
        a: "Enough for the peak and for an outage. The tool takes daily demand from occupants and consumption tier, scales the average hourly rate to the morning rush, measures that against the pump delivery, and adds a reserve of a day or more. The total is rounded to a tank that is actually sold.",
      },
      {
        q: "What is left for a person to decide?",
        a: "Anything that needs a site. Strata, specific capacity and water quality are modelled from your inputs, so a driller's log and a laboratory assay replace them. Structural quantities are checked against simple limits but still need an engineer to sign, and prices, tax and labour come from your own price book and the page does not price it.",
      },
    ],
  },
  {
    slug: "mathematical-plan-elevation",
    route: "/mathematical-plan-elevation",
    name: "Mathematical Plan Elevation",
    category: "structure",
    questions: [
      {
        q: "What does the plan elevation calculator actually calculate?",
        a: "It turns entered dimensions into geometry and quantities: strip footing width from an assumed line load and bearing value, excavation and concrete volumes, blockwork net of openings, ring beam steel, roof rise and true roof area from the pitch, and a phased programme. Each figure appears with the arithmetic that produced it.",
      },
      {
        q: "Does it read an uploaded floor plan?",
        a: "It can, once you sign in. Upload a floor plan, elevation or section and the reader lifts the sizes the drawing actually states, such as overall length and width, storeys, wall thickness and roof pitch, each with a confidence figure. Nothing is used until you tick the values you accept. Anything the drawing leaves out is listed as missing, so you can type it yourself.",
      },
      {
        q: "Can I enter dimensions in feet and inches?",
        a: "Yes. Imperial mode shows and accepts lengths in feet, and converts area, volume and reinforcement to square feet, cubic feet and pounds in the schedule cards, the summary and the CSV. Bearing pressure, wind speed and line load stay in SI, and the schematic itself is always drawn in metres.",
      },
      {
        q: "How is the footing width chosen?",
        a: "The line load from roof, walls, ring beam, slab edge and reduced live load is divided by the bearing value you enter, then lifted by 15 percent for footing self weight. The adopted width is the larger of that and three times the wall thickness, and the contact pressure is compared with your value.",
      },
      {
        q: "Can I export the schedule and the assumptions?",
        a: "Yes. The export writes one row per scheduled item with its level, unit, quantity and any rate you typed, plus a totals row when rates exist. The copy button produces a text summary that states the unit system, the assumption boundary and every screening flag, so it does not travel without the caveats.",
      },
      {
        q: "Are the wind and soil results a design check?",
        a: "No. Wind pressure follows the ASCE 7-22 velocity pressure form but the coefficients illustrate one height, and the bearing value is yours to supply. Both are screening figures that show whether the geometry deserves a closer look. Foundation and uplift design need a site investigation and a licensed engineer.",
      },
    ],
  },
  {
    slug: "tall-building-structure",
    route: "/tall-building-structure",
    name: "Tall Building Structure",
    category: "structure",
    questions: [
      {
        q: "What height does this calculator cover?",
        a: "It is built for towers between about 8 and 140 storeys. It selects a rigid frame below 15 storeys, a shear core to about 35, core and outriggers to 70, a tube in tube to 90, and a mega frame above that. Those ranges are tall building practice and not code limits, and the page says when the entered height sits outside the range for the chosen system.",
      },
      {
        q: "How is wind load calculated for a tall building?",
        a: "Velocity pressure uses the ASCE 7-22 exposure coefficient Kz at each storey, applied to the loaded face with a force coefficient, then summed from the base to the top. That storey by storey integration produces the base shear and the overturning moment. A single top pressure would understate both.",
      },
      {
        q: "Which drift limit is applied?",
        a: "Top drift is compared with H/500 and H/400, the serviceability limits commonly specified for occupied towers. The estimate uses virtual work on the core section with Ec equal to 4700 times the square root of fck and the ACI 318-19 cracked stiffness of 0.70. Occupant comfort and acceleration need a dynamic check, which this page does not perform.",
      },
      {
        q: "How is the foundation chosen between a raft and piles?",
        a: "The raft is checked as a rigid plate for axial load plus moment. If the contact pressure exceeds the entered allowable bearing, or the building is taller than 15 storeys, the scheme becomes a piled raft. Piles then carry the excess, and the count is set so the largest pile load, including the moment couple, fits the allowable capacity at a factor of safety of 2.5.",
      },
      {
        q: "How is pile capacity worked out?",
        a: "Shaft friction uses the alpha method in clay, where friction is a fraction of undrained strength, and the beta method in sand, where friction is a fraction of effective overburden. End bearing in sand uses the Meyerhof SPT relationship qp equal to 40 N times length over diameter, capped at 400 N, with a 30 percent reduction for bored piles because of base cleanliness.",
      },
      {
        q: "Can I use the output for construction or permits?",
        a: "No. The page is a preliminary screen built on single cantilever stiffness, elastic pile group distribution and soil and hazard inputs you supply. It does not perform a structural analysis, a geotechnical investigation or a wind tunnel study. Use it to size the scheme, then have a licensed structural engineer confirm every figure against site data and the local code.",
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
  ...WATER_FAQ_GROUPS,
  ...ICF_FAQ_GROUPS,
  ...EIFS_FAQ_GROUPS,
  ...BLINDS_FAQ_GROUPS,
  ...RENOVATION_FAQ_GROUPS,
  {
    slug: "fence-block-calculator",
    route: "/fence-block-calculator",
    name: "Fence and Coach Block Calculator",
    category: "structure",
    questions: [
      {
        q: "How many blocks does a fence wall need?",
        a: "The calculator derives wall length from the plot dimensions you enter, multiplies by the coaches you set and divides by the face area of the block you choose, then adds the breakage allowance. The block count therefore follows the geometry you measured instead of a per-metre guess.",
      },
      {
        q: "Why does the wall height matter so much?",
        a: "Blocks are counted by face area, so every extra coach adds a full course along the whole run. Because height also decides the pier spacing and the mortar volume, a wall entered one coach taller needs more blocks, more cement and more sand across the entire length, not just at the top.",
      },
      {
        q: "What is the cement and sand figure based on?",
        a: "Mortar for the joints and the rendering you select, converted at a stated bag weight for your market. The bags, sand, tipper trips and head pans are all printed with the mix and the allowance they were derived from, so you can check the figure against the specification you are pricing.",
      },
      {
        q: "Does a 9 inch block change the quantities?",
        a: "It changes the face area per block, so the same wall needs fewer of them than a 6 inch block, while the mortar for the thicker joint and the concrete in the filled cores increases. Selecting the block you will actually buy keeps both the count and the mortar from being priced on the wrong unit.",
      },
      {
        q: "Is this a structural design for a boundary wall?",
        a: "No. The calculator sizes blocks, mortar, sand and cement from the height and block you enter. Pier spacing, foundation width, reinforcement and resistance to wind load depend on the site and are the work of a structural engineer.",
      },
    ],
  },
  {
    slug: "german-floor-calculator",
    route: "/german-floor-calculator",
    name: "German Floor Calculator",
    category: "structure",
    questions: [
      {
        q: "What is a German floor made of?",
        a: "A layered ground floor: hardcore or laterite fill, a blinding layer, a damp proof membrane, and the concrete slab. Each layer is priced from its own thickness, so the estimate shows the hardcore volume, the blinding volume, the membrane area and the slab concrete separately.",
      },
      {
        q: "How is the slab concrete calculated?",
        a: "Floor area multiplied by the slab thickness you set, then converted to cement bags, sharp sand and granite at the mix you choose. The dry volume of the materials is higher than the wet slab, so the calculator applies a dry factor and prints it with the mix ratio.",
      },
      {
        q: "Does a thicker hardcore add concrete?",
        a: "No, the layers are independent. Deepening the fill adds laterite, blinding sand and membrane volume, but leaves the slab concrete unchanged. What the fill must achieve is a level, compacted surface, because the slab spans the ground instead of bridging soft spots.",
      },
      {
        q: "Why is a membrane included with the floor?",
        a: "Because the membrane keeps ground moisture out of the slab, and it covers the area it protects instead of the volume it fills. The calculator reports it as an area with an overlap allowance, which is why it is measured separately from the layers above and below it.",
      },
      {
        q: "Can I cost a ground floor on a filled plot from this?",
        a: "You can cost the hardcore, blinding, membrane and slab for the area and thicknesses you enter. Fill depth that exists to raise the site above flood level, compaction in layers and the structural thickness of the slab itself are engineering decisions the calculator does not make.",
      },
    ],
  },
  {
    slug: "tv-console-calculator",
    route: "/tv-console-calculator",
    name: "TV Console and Media Unit Calculator",
    category: "interiors",
    questions: [
      {
        q: "How many sheets of board does a TV console need?",
        a: "The calculator builds a panel schedule from the concept and the carcass dimensions you set: sides, top, bottom, shelves, dividers, back and doors. Those panels are packed into sheets of the size you entered, and the workshop allowance is added to the packed count, so the sheet figure is what a workshop would order for that schedule.",
      },
      {
        q: "Why is the sheet count described as a lower bound?",
        a: "Because the panels are packed in strips and the calculator states that plainly. Grain direction, book matching, saw kerf and the reuse of offcuts inside a lane are not simulated, and any of them can raise the sheets a real cutting plan needs. A workshop laying out cuts by hand should expect the figure to be met or beaten, not matched exactly.",
      },
      {
        q: "What does the workshop allowance actually buy?",
        a: "Spares against cutting error and defects. The allowance is applied to the packed board count and the result is rounded up, so two packed sheets at ten percent becomes three sheets, since a third sheet is what the workshop has to buy to hold a spare panel.",
      },
      {
        q: "Are edge banding and hardware included?",
        a: "Edge banding is measured on the exposed edges in the schedule, and hinges are counted per door from the door height. Slides, handles and other fittings follow the concept you chose. Prices come from the rates you enter, so the cost roll-up reflects your own supplier and not a national average.",
      },
      {
        q: "Can the panel schedule be used as a cut list?",
        a: "No. The schedule is a planning estimate and the page says so. Panel sizes follow the stated assembly rules, where the sides span the full height and the top, bottom and shelves fit between them, and drawer boxes carry the slide clearances the note gives. A cutting list that accounts for grain and kerf has to be produced from the sheet goods you actually buy.",
      },
    ],
  },
  {
    slug: "water-tower-staging-estimator",
    route: "/water-tower-staging-estimator",
    name: "Overhead Water Tank Staging",
    category: "structure",
    questions: [
      {
        q: "How is the dead load on the staging calculated?",
        a: "From the tank capacity and the staging you describe: the water mass at one kilogram per litre, plus the tank and the frame above the legs, reported in kilonewtons so it can be compared with a leg capacity. The load is stated with the assumption behind it, and that is what makes it checkable against a manufacturer's tank data sheet.",
      },
      {
        q: "How does the wind check work?",
        a: "The calculator reports a wind overturning factor from the pressure and the staging geometry you enter, with the cross bracing that resists it. The factor is a ratio: below one the legs carry the tank down, above one the tower wants to go over. Because water cannot be relied on as ballast, the empty tank is the case that matters, and the check is reported with the height and leg spread it used.",
      },
      {
        q: "What decides the pad footing size?",
        a: "The leg load and the bearing you assume for the ground, applied to the leg spread you set. A wider spread lowers the load each leg carries and changes the pad, which is why the calculation follows your entered geometry instead of a stock footing. The bearing value is an assumption to be checked against the soil, not a measurement the calculator can make.",
      },
      {
        q: "Does the estimate include the steel or concrete quantities?",
        a: "Yes, the bills are reported for the tower material you selected, whether that is steel sections or concrete columns, together with the pad footings. The step by step build sequence shows the order the staging is assembled in, from the pads through the legs to the tank itself.",
      },
      {
        q: "Is this a structural design for an elevated tank?",
        a: "No. It is a load, stability and quantity estimate built from the figures you enter. Foundation bearing, member design to a code, welding or bolt details and the tank manufacturer's loading requirements need a chartered engineer and the tank data sheet.",
      },
    ],
  },
  {
    slug: "diaspora-budget-tracker",
    route: "/diaspora-budget-tracker",
    name: "Diaspora Construction Budget and Inflation Tracker",
    category: "project",
    questions: [
      {
        q: "What is the exchange rate gap, and why does it matter?",
        a: "It is the difference between the official rate and the parallel rate you enter, expressed as a spread. A sponsor sending foreign currency wants to know how much local money the same remittance buys at each rate, because the gap is often the largest single swing in a diaspora budget, larger than a change of finish or a change of block.",
      },
      {
        q: "How is inflation applied over the timeline?",
        a: "It compounds. Each year of the build multiplies the budget by the annual rate on the balance that is still to be spent, so a three year project at a given rate costs more than the same rate taken once. The calculator reports the compound multiplier it used, which is the figure to show a sponsor who is comparing a simple multiplication.",
      },
      {
        q: "Why is my forward budget higher than what I sent?",
        a: "Because two effects are working at once: the gap between the rate you sent at and the rate on the day each milestone is paid, and the inflation that has accumulated between the plan and that milestone. The tracker projects a forward target budget so the shortfall is visible before a site stops work.",
      },
      {
        q: "Where do the exchange rates and the inflation figure come from?",
        a: "From you. The tracker does not quote a live rate and it does not publish a forecast, so the rates and the inflation figure must be the ones you can actually observe in your own market and record with the date you saw them. A rate entered without a date tells you nothing about when it was true.",
      },
      {
        q: "What does the variance health figure mean?",
        a: "It compares the budget you have available with the projected cost at the timeline you set, and reports how far apart they are. It is a planning signal, not a guarantee: a change of rate, a delay that adds a year of inflation, or a milestone priced before a currency move will all move the number.",
      },
    ],
  },
  {
    slug: "quote-check",
    route: "/quote-check",
    name: "Quote Check",
    category: "project",
    questions: [
      {
        q: "What counts as over the market on a quote?",
        a: "A rate is compared with the price book rate for the same item, and a band of 10 percent either side counts as fair. Outside that band the line is reported as over or under, with the rate difference and the money difference both printed, so the size of the gap is visible and not only established.",
      },
      {
        q: "Why can some quoted lines not be judged?",
        a: "Because the price book holds no rate for that item, and the line is reported as having no reference. A comparison tool that invents a market rate for an item it does not know is worse than no comparison, so the line is listed separately and the advice is to confirm it directly with suppliers.",
      },
      {
        q: "What happens when the quote uses a different unit?",
        a: "The line is reported as a unit mismatch and no rate comparison is made. The check compares units as strings after trimming case and spacing, so square metres written as m2 and as sqm are not treated as the same unit. That refusal is deliberate: guessing an alias is how a comparison reports a saving that does not exist.",
      },
      {
        q: "Is the comparison on the rate or on the total?",
        a: "Both. The rate per unit is the figure compared against the band, because a total hides a short quantity, and the line amount is then calculated as quantity times the rounded reference rate so the money difference can be shown beside it.",
      },
      {
        q: "Does a fair verdict mean the quote is acceptable?",
        a: "No. A fair line means the rate sits inside the band around the market rate for that item. The check does not judge the specification, the quantity, the wastage allowed, the preliminaries, the labour rate or the terms, and a quote can pass every line and still be a poor quote.",
      },
    ],
  },
  {
    slug: "photo-estimator",
    route: "/image-estimator",
    name: "AI Photo Estimator",
    category: "commercial",
    questions: [
      {
        q: "What does the estimator read from a photograph?",
        a: "It extracts the building details the estimate needs, such as the overall dimensions, the building type and the roof type, and asks you to confirm each one. Anything the photograph does not establish is left for you to enter instead of being invented from a plausible guess.",
      },
      {
        q: "Does the AI calculate the quantities and the cost?",
        a: "No. The photograph is read into the calculator form and the FRELUX engines do the arithmetic from those confirmed figures. Extraction is separated from estimation on purpose, so a wrong reading can be corrected in the form and the same engine produces a different, defensible answer.",
      },
      {
        q: "What is the review step for?",
        a: "It is where the readings and the engine defaults are shown apart, so you can see which figures came from the photograph and which are assumptions the calculator would make anyway. You correct the readings, and the corrections are what the estimate is built from.",
      },
      {
        q: "How accurate are the measurements read from a photo?",
        a: "Only as good as the photograph. Perspective, obstruction and the absence of a scale reference all limit what can be read, and a single view of a building cannot establish depth that is hidden behind a wall. The review step exists because a site measurement is the authority and the photograph is a starting point.",
      },
      {
        q: "What happens to the photograph I upload?",
        a: "It is sent to the estimation service so the building details can be extracted from it, and the estimate is then built from the figures you confirmed instead of from the image itself. The saved project holds the estimate and its measurements, and a later recalculation starts from those figures.",
      },
    ],
  },
  {
    slug: "count-vision",
    route: "/count-vision",
    name: "Counter-Vision",
    category: "commercial",
    questions: [
      {
        q: "What does Counter-Vision actually return?",
        a: "A count with a verdict, a confidence and a reason. The verdict is one of three: counted, unclear or nothing to count. A count that cannot be shown to be reliable comes back as unclear, and the reason is preserved, so a failed count is never rounded up into an order.",
      },
      {
        q: "Why does a count come back as unclear instead of a low number?",
        a: "Because a number below the confidence floor is not evidence of anything. The floor is a configured rule and the default is 0.6, and a response reporting less than that is refused as unclear. An undercount presented as an answer is how a site buys short and finds out on the last course.",
      },
      {
        q: "What are the limits the tool enforces?",
        a: "An 8 megabyte image ceiling, a count ceiling of 5,000 units, and the confidence floor. A reported count above the ceiling is treated as unreliable and the advice is to photograph a smaller section, since a stack too large to see clearly cannot be counted from one frame.",
      },
      {
        q: "Is the answer checked before it is shown?",
        a: "Yes, twice. The count is validated where it is produced, and the page runs its own check on the answer, refusing any shape it cannot read, any count that is not a positive whole number inside the range, and any confidence below the floor. The second check is there because a page that trusts a response blindly has no answer at all.",
      },
      {
        q: "Does the count price the material?",
        a: "No. Counter-Vision counts what is in the photograph and states how sure it is about that count. Pricing belongs to the calculators that hold rates for your market, and the count has to be carried across into a priced takeoff, which is a separate step you decide to take. A count on its own is a quantity, not a cost.",
      },
    ],
  },
  {
    slug: "surface-assessment",
    route: "/surface-assessment",
    name: "Surface Condition Assessment",
    category: "finishes",
    questions: [
      {
        q: "What does the surface assessment produce?",
        a: "A preparation list for the condition you select. You pick one of six conditions (new wall, previously painted, rough, dirty, damp or cracked), optionally name the room and add notes, and the page returns the preparation steps that condition needs, each with a priority of high, medium or low.",
      },
      {
        q: "Does it read a photograph or use AI?",
        a: "No. The assessment is chosen from a fixed set of conditions and the preparation steps come from a rule table keyed by that choice, so the same condition always returns the same list. There is no image analysis and no model in the path, and treating the output as a machine judgement of your wall would be wrong.",
      },
      {
        q: "Why does the condition matter more than the paint?",
        a: "Because preparation decides whether the coating stays. Damp or cracked masonry needs work that new plaster does not, and a finish applied over the wrong condition fails on the surface it was meant to protect. Naming the condition honestly is the whole input.",
      },
      {
        q: "Can the assessment be saved with a project?",
        a: "Yes, with the condition, the room and any notes, and the preparation list is stored with it. That record is what a painter or a screeder prices from, and it is what shows later whether the surface was dealt with before the finish went on.",
      },
      {
        q: "Is the preparation guidance a diagnosis?",
        a: "No. It is guidance for a condition you identified yourself. Damp needs a source investigation and a moisture reading, cracks need a structural opinion when they are more than surface deep, and neither is established by selecting a condition on a page.",
      },
    ],
  },
  {
    slug: "estimate-refresh",
    route: "/estimate-refresh",
    name: "Estimate Refresh",
    category: "project",
    questions: [
      {
        q: "What does refreshing an estimate change?",
        a: "It reprices each line of a saved snapshot at the price that is active today, using the price reference the line already carries. Every line is reported with its snapshot price, its current price, the money difference and the percentage, and the totals carry the same delta so the size of the movement is visible.",
      },
      {
        q: "What happens to a line with no current price?",
        a: "It keeps its snapshot price and is counted as missing. The tool never extrapolates a missing price, and the warning names the item, the reference and the price that was kept, so a stale line is visible instead of being quietly smoothed into the total.",
      },
      {
        q: "What if a line has no price reference at all?",
        a: "It cannot be refreshed. The line stays at its stored price and is reported with the reason, which is a statement about the snapshot instead of about today's market. The line has to be repriced by hand or rebuilt from the calculator that produced it.",
      },
      {
        q: "Why is a percentage sometimes blank?",
        a: "Because there is nothing to take a percentage of. Where the earlier line total is zero, the money difference is still reported and the percentage is null, since dividing by zero would invent a rise that did not happen.",
      },
      {
        q: "Does a refresh check anything besides the price?",
        a: "It flags a currency mismatch between the line and the price it was matched to, and it prints the effective date of each price it used. A price that is current but in the wrong currency, or one whose effective date is older than expected, is not a refresh you can rely on.",
      },
    ],
  },
  {
    slug: "smart-calculator",
    route: "/smart-calculator",
    name: "Smart Calculator",
    category: "commercial",
    questions: [
      {
        q: "Does the Smart Calculator use AI to work out the quantities?",
        a: "No. The reading that decides which calculator to open, and which numbers to put in it, is deterministic and can be inspected: the same sentence always produces the same reading. The engine that owns the trade then does the arithmetic. A model is asked afterwards only to explain the resulting cost.",
      },
      {
        q: "What happens when the description is missing something?",
        a: "It says so. A project without a length and width, or without a floor area, comes back with that listed as missing instead of filled in, and a measurement with no unit is reported as having no unit instead of being assumed to be metres. Only values that appear in your sentence reach the calculator.",
      },
      {
        q: "How is a description of a building read into a calculator?",
        a: "The work type is matched from the words you used, the dimensions are read as rectangles or as a stated area and converted to metres, and room, door and window counts are taken when they are stated. Each of those appears in a line of text you can check before the estimate is generated.",
      },
      {
        q: "Does it handle feet as well as metres?",
        a: "Yes. A rectangle stated in feet is converted to metres and both figures are shown, so a plan written in feet does not silently enter a calculator that expects metres. Where the unit is absent the reading says so instead of choosing for you.",
      },
      {
        q: "What is the AI part for then?",
        a: "Explaining the cost once the engines have produced it, in the words of the project you described. The explanation sits on top of the numbers and cannot replace them, which is the point of separating the reading from the estimate.",
      },
    ],
  },
  {
    slug: "conversational-estimator",
    route: "/conversational-estimator",
    name: "Conversational Estimator",
    category: "commercial",
    questions: [
      {
        q: "How does the conversational estimator build an estimate?",
        a: "It reads the project out of your messages, in order, and shows each fact it has taken with the words that produced it. When something essential is still missing it asks for that instead of estimating, so the answer is never assembled from assumptions silently.",
      },
      {
        q: "Is the conversation run by an AI model?",
        a: "No. The parsing is deterministic, so the same thread read twice produces the same estimate. That matters because the quantities have to be defensible: an estimate that changes when the same conversation is reread cannot be checked by anyone.",
      },
      {
        q: "What happens once there is enough detail?",
        a: "The estimator works out which trade the project belongs to and routes you to that calculator with the figures already entered. For a paint job it runs the same quantity chain as the paint calculator, including the litres, the container sizes, the paintable area and the coat count.",
      },
      {
        q: "Does it work in more than one language?",
        a: "Yes. The language of the thread is detected and the replies follow it, and the numbers are extracted from the same message either way. A description given in one language and a reply expected in another is a support question, not an estimator feature.",
      },
      {
        q: "Are the prices it uses mine or the defaults?",
        a: "It uses the price book configured for your market where one exists, and it says when it has fallen back to engine defaults. Container sizes and rates that come from defaults are disclosure, not a quote, and the estimate says which it used.",
      },
    ],
  },
  {
    slug: "color-assistant",
    route: "/ai-color-assistant",
    name: "Smart Color Assistant",
    category: "finishes",
    questions: [
      {
        q: "What does the colour assistant actually return?",
        a: "Suggestions, in colour names and codes, for a room you describe. They are inspiration for a scheme instead of a specification, and the page says so: the codes can be looked up in the colour library to see the shade properly before anything is bought.",
      },
      {
        q: "Is there a limit on how many recommendations I get?",
        a: "Yes. Recommendations are metered against a daily free allowance, and the page says when that allowance is used up and that it resets. That limit exists because each recommendation is generated instead of looked up.",
      },
      {
        q: "Can I describe lighting and furniture as well as the room?",
        a: "Yes, and the description is where the useful detail lives. Light direction, floor tone and the furniture already in the room change which colours work, and a recommendation made without them is a guess dressed as advice.",
      },
      {
        q: "Are the suggested colours guaranteed to work?",
        a: "No. A scheme that reads well in a description can still fail on the wall, because the description is not the room and a screen is not daylight. Buy a sample pot and put it on the actual surface in the actual light before committing to a whole room.",
      },
      {
        q: "Does the assistant tell me how much paint to buy?",
        a: "No. It suggests colours. Quantities come from the paint calculator, which measures the surface and applies the coverage of the product, and a colour recommendation carries no quantity, no coverage and no price.",
      },
    ],
  },
  {
    slug: "color-preview",
    route: "/color-preview",
    name: "AI Before & After Preview",
    category: "finishes",
    questions: [
      {
        q: "What does the colour preview produce?",
        a: "A rendered preview of a room with the colours you chose applied, based on a photograph you upload or a description you give. It is a way to see a scheme before buying paint, not a measurement of the room.",
      },
      {
        q: "Why is this page kept out of search results?",
        a: "Because it is a working surface, not an answer to a question people search for. The page is marked no-index deliberately, so a generated preview of somebody's room never turns up in search, and the same reasoning keeps its copy off the indexed surface.",
      },
      {
        q: "Do the previews take lighting into account?",
        a: "Only as far as the inputs describe it. The lighting condition, room type and mood you select steer the render, but a preview cannot measure how daylight falls in your room, and a colour that looks right in the render can read differently on the wall.",
      },
      {
        q: "Does it need a photograph?",
        a: "No. A description of the room is enough to generate a preview, and a photograph gives the render a real surface to work with. Either way at least one valid colour has to be chosen before anything is generated.",
      },
      {
        q: "Can I use the preview to order paint?",
        a: "Not on its own. The preview shows a scheme, and the quantities come from the paint calculator using the measured area. Ordering from a preview is ordering from a picture, which is how rooms end up three litres short.",
      },
    ],
  },
];

const BY_SLUG = new Map(TOOL_FAQS.map((g) => [g.slug, g]));

export function getToolFaqGroup(slug: string): ToolFaqGroup | undefined {
  return BY_SLUG.get(slug);
}

const BY_ROUTE = new Map(TOOL_FAQS.map((g) => [g.route, g]));

/**
 * A tool's question set, found by the address the page is served at. The shell
 * uses this so a page cannot be wired to another tool's questions, which is how
 * a slab takeoff page once shipped the window blind set.
 */
export function getToolFaqGroupByRoute(
  route: string,
): ToolFaqGroup | undefined {
  const clean = route.replace(/\/+$/, "") || "/";
  return BY_ROUTE.get(clean);
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
