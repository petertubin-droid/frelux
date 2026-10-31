/**
 * The article body behind each FAQ group.
 *
 * The questions answer one thing at a time, which is what a reader wants when
 * they are checking a figure. This is the long form: what the tool is, what it
 * actually calculates, why it is worth using, and what it deliberately refuses
 * to do. Rendered at /faq/:slug next to the group's own questions, so one page
 * holds description, function, advantage, limits and answers.
 *
 * Same rule as the question copy: nothing here invents a coverage rate, a price
 * or a design claim. If a tool does not price something, the limits say so.
 */

export interface FaqArticle {
  /** One sentence standfirst under the page title. */
  summary: string;
  /** "What it is" */
  description: string;
  /** "What it calculates" — three or more concrete steps. */
  functions: string[];
  /** "Why contractors use it" */
  advantages: string[];
  /** "What it leaves out" */
  limits: string[];
}

export const FAQ_ARTICLES: Record<string, FaqArticle> = {
  "paint-calculator": {
    summary:
      "Turns room measurements into the paint a repaint actually consumes, coat by coat.",
    description:
      "An area to litres estimator. You give it the room measurements and the openings you are not painting, and it decides the wall and ceiling area that remains, then the paint that area takes at the number of coats you choose.",
    functions: [
      "Works out wall and ceiling area from the dimensions you enter, then subtracts the doors and windows you exclude.",
      "Divides that area by the coverage stated on your tin and shows the litres for each coat separately.",
      "Keeps primer and undercoat as their own lines with their own quantities instead of folding them into the topcoats.",
      "Rounds the result to the tin sizes sold in your market, because paint is bought by the tin.",
    ],
    advantages: [
      "Every litre traces back to a measurement and a stated coverage, so a client can follow the arithmetic.",
      "Buying by tin rather than by litre stops the quiet shortfall that appears on the second coat.",
      "A sound wall that only needs a refresh is not priced as new work, because primer stays optional.",
    ],
    limits: [
      "It does not judge surface condition. Bare plaster and heavy patching need products and quantities you decide.",
      "It uses the coverage figure you supply rather than guessing a spread rate for a product it has not seen.",
      "Labour, access equipment and tax are outside it, and tax is reported as undetermined rather than assumed.",
    ],
  },
  "tile-calculator": {
    summary:
      "Converts a measured area into the tiles and packs you have to buy, with the waste you choose.",
    description:
      "A tiling quantity estimator built on the area you measure and the tile size you are laying. It counts tiles for that area, adds the waste you allow for cuts, and rounds up to the packs the tiles are sold in.",
    functions: [
      "Calculates the area to be tiled from the dimensions you enter rather than from a default room.",
      "Counts tiles from the area and the tile size, so a change of format changes the count immediately.",
      "Applies the waste percentage you choose for cuts, edges and breakages.",
      "Rounds to whole packs and shows the pack count, which is the number a supplier quotes against.",
    ],
    advantages: [
      "Waste is a visible line you set rather than a hidden margin added at the counter.",
      "Changing tile size re-counts the order in front of the client, which settles the commonest argument.",
      "The pack count is what you actually hand to a merchant, so the estimate survives contact with the shop.",
    ],
    limits: [
      "It does not lay out a pattern. Herringbone, diagonal and feature bands need a setting out drawing.",
      "Adhesive, grout and trims follow the layout and substrate you plan, not the tile area alone.",
      "Surface preparation, waterproofing and tiling labour are separate items it does not price.",
    ],
  },
  "pop-ceiling-calculator": {
    summary:
      "Sizes a plaster of Paris ceiling from the area you are covering and the thickness you build.",
    description:
      "A ceiling plaster estimator. It takes the ceiling area and the build up thickness you are working to, then converts that into the plaster and backing material the ceiling consumes, shown as purchasable bags.",
    functions: [
      "Calculates the ceiling area from the dimensions you enter.",
      "Converts area and thickness into a volume of plaster rather than a flat rate per square metre.",
      "Expresses the result in bags of the size you buy, so the shopping list is usable.",
      "Shows the step by step figures so the volume behind each bag count can be checked.",
    ],
    advantages: [
      "A thickness change is reflected honestly instead of being absorbed into a rule of thumb.",
      "The bag count is what a site foreman can order, not a theoretical mass.",
      "The arithmetic is printed, so a disagreement about quantities is settled from the page.",
    ],
    limits: [
      "It does not design the ceiling. Joists, noggins, hangers and fixings are structural decisions outside it.",
      "Decorative features, cornices and bulkheads are not measured from a flat area.",
      "Scaffolding, labour and tax are outside the quantity.",
    ],
  },
  "screeding-calculator": {
    summary:
      "Turns a floor area and a screed thickness into sand, cement and the bags behind them.",
    description:
      "A floor screed estimator. You give it the area and the thickness of the bed you are laying, and the mix you intend to use, and it returns the volume of screed together with the cement and sand that volume needs.",
    functions: [
      "Calculates the screed volume from the floor area and the thickness you enter.",
      "Splits the volume by the mix ratio you choose rather than assuming one.",
      "Shows cement as bags of a fixed size and sand as a volume, which are the units both are sold in.",
      "Prints the wet and dry volumes behind the figures so the conversion is visible.",
    ],
    advantages: [
      "The mix you actually use is the mix that is priced, so a stronger bed does not appear free.",
      "Sand and cement are returned in the units a merchant sells them in.",
      "The dry volume conversion is stated, which is the step most site rules of thumb hide.",
    ],
    limits: [
      "It does not set levels, falls or movement joints, which are site decisions.",
      "Substrate preparation and any reinforcement mesh are separate items.",
      "It assumes the thickness you enter is uniform, which a thin patch repair is not.",
    ],
  },
  "foundation-calculator": {
    summary:
      "The materials a footing consumes: concrete ingredients, blockwork and formwork, from your own dimensions.",
    description:
      "A foundation material take off. From the footing geometry you enter it works out the concrete volume, converts that into cement, sand and granite, counts the blocks for the foundation courses, and accepts a formwork area where you are boxing the pour.",
    functions: [
      "Calculates footing concrete volume from the length, width and depth you set, including pads where there are pads.",
      "Converts wet concrete volume to cement bags, sand and granite using the mix ratio you choose.",
      "Counts blocks for the foundation courses rather than for the whole wall above.",
      "Takes formwork as a contact area, and accepts zero when you are pouring directly against the soil.",
    ],
    advantages: [
      "Ingredient quantities follow the ratio you actually mix, so a stronger concrete shows up in the order.",
      "A trench poured against earth is not quietly priced as if it were boxed.",
      "The block count covers the courses that exist, not an assumed wall height.",
    ],
    limits: [
      "It does not check soil bearing capacity or decide a footing size for you; that is an engineer's job.",
      "Reinforcement is not designed here, and bar bending schedules stay outside the tool.",
      "Setting out, excavation plant and labour are separate, and tax is reported as undetermined.",
    ],
  },
  "build-to-roof-estimator": {
    summary:
      "One pass from substructure to roof covering, so the shell is priced as a single job.",
    description:
      "A build to roof estimator follows the structure from foundation through the walls to the roof covering. It is the tool for answering what the shell of a building costs in materials before any finish is chosen.",
    functions: [
      "Carries concrete quantities from the foundation stage and converts them into cement, sand and granite.",
      "Counts blockwork for the walls from the dimensions you enter.",
      "Prices roofing sheets from the roof area and pitch you set.",
      "Reports the eaves perimeter, which the soffit and gutter tool reuses so both tools agree.",
    ],
    advantages: [
      "The shell is answered as one figure instead of five separate shopping trips.",
      "The eaves perimeter is computed once, so the roof and the gutter band cannot disagree.",
      "Mix ratios and roof geometry stay visible, which is what a client questions first.",
    ],
    limits: [
      "It stops at the roof covering. Finishes, electrical and plumbing are priced from different quantities.",
      "It does not size structural members or certify a design.",
      "Labour, plant and tax are outside it, and tax is reported as undetermined.",
    ],
  },
  "retaining-wall-calculator": {
    summary:
      "The buried footing and the stem, with soil type changing the geometry rather than the opinion.",
    description:
      "A retaining wall estimator. Soil pushes sideways, so the buried footing is the part that matters. The tool takes the wall length, height and the soil you are holding back, and returns concrete for the footing, the stem in blocks or poured concrete, reinforcement, and the drainage points along the base.",
    functions: [
      "Calculates footing concrete from the length, width and thickness, which come from the soil rule.",
      "Counts the stem in blocks or in poured concrete, depending on the wall type you choose.",
      "Places weep holes along the base course at the spacing the wall run implies.",
      "Grows the recommended footing width for loose sand and wet clay, and leaves the figure editable.",
    ],
    advantages: [
      "A harder soil condition changes the footing geometry instead of a hidden safety margin.",
      "The footing width stays on screen, so a site investigation can correct it rather than be ignored.",
      "Drainage points are part of the material list, which is the item most often forgotten on site.",
    ],
    limits: [
      "It is not a structural design. Surcharge loads, water tables and global stability need an engineer.",
      "Backfill, drainage blanket and geotextile are separate materials it does not size.",
      "Wall finishes, copings and labour are outside the quantity.",
    ],
  },
  "soffit-gutter-cost-estimator": {
    summary:
      "The roof to wall band: fascia, gutter run, soffit area and the downpipes that drain it.",
    description:
      "An estimator for the transition between roof and wall. The eaves perimeter becomes linear fascia and gutter, the overhang becomes soffit area, and the gutter run decides how many downpipes you buy.",
    functions: [
      "Takes the roof perimeter and adds a cutting allowance to give the fascia and gutter length to buy.",
      "Multiplies the perimeter by the overhang width to give soffit area.",
      "Divides the gutter run by the downpipe spacing you set and rounds up to whole downpipes.",
      "Runs through the same perimeter helper as the roof engine, so both tools return one number.",
    ],
    advantages: [
      "A contractor who already ran the roof gets the same perimeter rather than a second, different one.",
      "Downpipe spacing stays a decision you make, because rainfall and roof area decide it.",
      "The cutting allowance is a stated line, so the waste is visible instead of being a surprise.",
    ],
    limits: [
      "It does not design the gutter. Profile capacity, fall and outlet sizing are outside the tool.",
      "Brackets, sealant, fascia boards and fixings depend on the system you buy.",
      "Installation labour and access equipment are not priced.",
    ],
  },
  "steel-beam-calculator": {
    summary:
      "Span to tonnage, because steel is bought and quoted by mass rather than by length.",
    description:
      "A steel weight and cost estimator. You pick the profile or the situation it is for, enter the span and the number of beams, and it converts the length into kilograms and tonnes, then into money at the price per tonne you supply.",
    functions: [
      "Multiplies span by the profile's kilograms per metre to give the mass of one beam.",
      "Multiplies by the beam count for the total mass, expressed in both kilograms and tonnes.",
      "Applies your steel price per tonne to give a cost projection in the currency you work in.",
      "Warns when an open span passes eight metres without columns, because deflection then needs checking.",
    ],
    advantages: [
      "Mass is the unit a fabricator quotes in, so the estimate can be read straight back to a supplier.",
      "The profile weight is printed next to the total, which makes the tonnage checkable.",
      "The span warning puts a real limit in front of the user instead of leaving it to memory.",
    ],
    limits: [
      "It is not a structural check. Deflection, buckling and connection design need an engineer.",
      "Connections, base plates, bolts, painting and fire protection are separate purchases.",
      "Steel price is yours to enter, because there is no verified price book for it in most markets, and tax is reported as undetermined rather than assumed.",
    ],
  },
  "doors-windows": {
    summary:
      "A schedule of openings turned into frames, leaves and the hardware that goes with them.",
    description:
      "A doors and windows estimator driven by counts. You enter how many of each type you are fitting and whether locksets are included, and it returns the leaves, frames and hardware for that schedule.",
    functions: [
      "Counts leaves by type, separating flush, panel and security doors and the window types you select.",
      "Follows the door count with one frame set per door.",
      "Applies a labelled hinge allowance per door instead of burying ironmongery in the leaf price.",
      "Includes locksets only when you switch them on, so a doors only order is not padded.",
    ],
    advantages: [
      "A blank schedule is reported as missing, so openings are never invented on your behalf.",
      "Hardware is visible as its own quantity, which is where cheap quotes usually hide.",
      "Counts come from your schedule, so a change of plan is a change of number rather than a re-estimate.",
    ],
    limits: [
      "It does not specify sizes, glazing, ironmongery brands or fire ratings.",
      "Installation labour, sealants and finishing are separate items.",
      "It cannot price a schedule you have not counted, and it says so rather than guessing.",
    ],
  },
  electrical: {
    summary:
      "A wiring material take off that refuses to size a cable category you have not measured.",
    description:
      "An electrical materials estimator for a building's wiring. Point counts and distribution board counts come from you, and so do the average cable run lengths, because a run length is a site measurement rather than a number a calculator can know.",
    functions: [
      "Computes each cable category separately from the average run length you measure for it.",
      "Uses switch and distribution board counts you enter to set the accessory quantities.",
      "Applies verified planning rules for circuit grouping, conduit allowance, junction boxes and waste.",
      "Leaves a cable category unsized and flagged when you have not given it a run length.",
    ],
    advantages: [
      "Cable lengths are never invented, which is the failure that makes an electrical quote wrong.",
      "Circuit grouping comes from stored rules that can be inspected rather than a rule of thumb.",
      "Each category is shown with its own steps, so an electrician can check the reel count.",
    ],
    limits: [
      "It is not electrical design. Load calculations, diversity and protective device selection are not performed.",
      "Volt drop and cable derating need the engineer's tables, not this tool.",
      "It produces a material list, not a certificate or a compliance sign off.",
    ],
  },
  "conduit-wiring-estimator": {
    summary:
      "A shopping list for a wiring loop: conduit, wire by the reel, and the boxes that join them.",
    description:
      "An empirical conduit and wiring estimator. It converts floor area and point counts into the physical materials an installation consumes, using the local trade's own multipliers rather than a circuit schematic.",
    functions: [
      "Calculates conduit pipe length from the floor area and the trade multiplier you work to.",
      "Divides that length by the standard pipe length sold locally to give the number of pipes to buy.",
      "Converts lighting points and socket points into the reels of cable each circuit size needs.",
      "Multiplies outlet points by an allowance for junction and adaptor boxes.",
    ],
    advantages: [
      "The output is the list an electrician actually buys from, which is why it is used on a phone on site.",
      "Conduit is returned in pipes, not metres, matching how it is sold.",
      "Point counts drive the reels, so adding sockets visibly changes the order.",
    ],
    limits: [
      "It is an empirical material estimate, not a circuit calculation.",
      "It does not check volt drop, protective device ratings or earthing requirements.",
      "It cannot produce a distribution board schedule or a test certificate.",
    ],
  },
  plumbing: {
    summary:
      "Fixture counts and measured pipe runs turned into pipes, fittings and valves.",
    description:
      "A plumbing materials estimator. Fixture counts and the total pipe run you measured per category are the only sources of quantity, and the engine sizes each category separately from them.",
    functions: [
      "Takes fixture counts for taps, WC pans, showers, sinks, floor drains, tanks and pumps.",
      "Sizes cold, hot, waste and drainage runs separately from the lengths you measured.",
      "Applies the visible waste percentage and the fitting allowances per fixture connection.",
      "Counts valves per tap, which is the accessory most often left out of a materials list.",
    ],
    advantages: [
      "A missing run length leaves the line visibly unsized rather than silently filled with a guess.",
      "Categories are sized separately, so a long drainage run does not distort the hot water order.",
      "Allowances are printed, which makes the fittings count arguable rather than mysterious.",
    ],
    limits: [
      "It is not plumbing design. Pipe sizing, hydraulic calculations and gradients are outside it.",
      "It does not select fixtures, materials or sanitary ware.",
      "Installation labour, testing and certification are separate.",
    ],
  },
  quotes: {
    summary:
      "Where each quote stands, what came back, and which ones have gone quiet.",
    description:
      "The pipeline view of a contractor's quotes. Once a quote is out the question stops being what it costs and becomes where it is, so this reads the stored quote and the clock to show stage, value and age for everything you have sent.",
    functions: [
      "Shows one stage per quote: draft, sent, viewed, approved, changes requested or expired.",
      "Counts validity from the day the client first had the quote, and shows the days remaining.",
      "Groups open, draft and approved value by currency instead of blending them.",
      "Flags quotes for follow up after three days, and flags those close to expiry.",
    ],
    advantages: [
      "No exchange rate is invented, because naira and dollar quotes are never added together.",
      "The acceptance rate divides approvals by the quotes actually decided on, so a full inbox does not skew it.",
      "The chase list maintains itself from stored dates, so nothing depends on your memory.",
    ],
    limits: [
      "It does not send the follow up. It decides which quotes need one and shows them; the message is yours.",
      "It is not an e-signature or a contract, and approval here records a client's answer rather than a signed agreement.",
      "It does not take payment or reconcile an invoice.",
    ],
  },
  "client-estimate": {
    summary:
      "The quote engine itself: costs in, markup applied once, and a record the client answers.",
    description:
      "The tool that builds and edits a client quote. Quantities decided by an estimator become cost lines here, a markup is applied once to the subtotal, and the saved quote is what the client sees when you share the link.",
    functions: [
      "Adds materials, labour, transport and miscellaneous to give a subtotal, then applies your markup percentage to that subtotal.",
      "Keeps the subtotal, the markup amount and the grand total as separate printed figures.",
      "Allows edits until the quote is approved, and stops there because an approved quote is the record.",
      "Shares a link to the stored quote, which the client can open without an account.",
    ],
    advantages: [
      "The markup is visible as its own amount, so a client can see what is being added rather than inferring it.",
      "Editing a line changes that line only; it never re-runs a calculation behind your back.",
      "Approval locks the record, which keeps an agreed figure from drifting afterwards.",
    ],
    limits: [
      "Tax is never applied automatically, and the quote reports it as undetermined rather than guessing a rate.",
      "Transport is a figure you enter, not a distance calculation.",
      "It does not collect payment, produce a signed contract, or replace your own terms of business.",
    ],
  },
  "using-frelux": {
    summary:
      "What FRELUX does, how the numbers are produced, and what it will never pretend to know.",
    description:
      "FRELUX is a construction estimating platform. The quantities come from deterministic engines that show their steps, and AI is restricted to extracting data from documents and photographs rather than deciding quantities.",
    functions: [
      "Runs each discipline through its own engine, from finishes to structure to services, with the arithmetic printed.",
      "Prices materials from verified price books where they exist and asks you to enter prices where they do not.",
      "Reports tax as undetermined instead of applying a jurisdiction's rate on your behalf.",
      "Runs in a browser on a phone, so a quantity can be checked on site rather than in an office.",
    ],
    advantages: [
      "Every figure can be traced to an input and a printed step, which is what makes a quote defensible.",
      "Manual price entry replaces invented fallbacks, so an unpriced market reads as unpriced.",
      "Estimates are not padded with mock data, so a blank section means missing input rather than fiction.",
    ],
    limits: [
      "It is not a substitute for a structural, electrical or plumbing engineer's design.",
      "It estimates materials; labour rates, plant and programme remain your judgement.",
      "It cannot price a market with no verified price book without your own prices entered.",
    ],
  },
};

export function getFaqArticle(slug: string): FaqArticle | undefined {
  return FAQ_ARTICLES[slug];
}

/** Section headings, in the order the article page renders them. */
export const FAQ_ARTICLE_SECTIONS = [
  { key: "description", heading: "What it is" },
  { key: "functions", heading: "What it calculates" },
  { key: "advantages", heading: "Why contractors use it" },
  { key: "limits", heading: "What it leaves out" },
] as const;
