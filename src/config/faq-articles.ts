/**
 * The article body behind each FAQ group.
 *
 * The questions answer one thing at a time, which a reader wants when
 * they are checking a figure. This is the long form: what the tool is, what it
 * actually calculates, why it is worth using, and what it deliberately refuses
 * to do. Rendered at /faq/:slug next to the group's own questions, so one page
 * holds description, function, advantage, limits and answers.
 *
 * Same rule as the question copy: nothing here invents a coverage rate, a price
 * or a design claim. If a tool does not price something, the limits say so.
 */

import { ENGINE_FAQ_ARTICLES } from "@/config/engine-faqs";
import { RENOVATION_FAQ_ARTICLES } from "@/config/faq-renovation";

export interface FaqArticle {
  /** One sentence standfirst under the page title. */
  summary: string;
  /** "What it is" */
  description: string;
  /** "What it calculates": three or more concrete steps. */
  functions: string[];
  /** "Why contractors use it" */
  advantages: string[];
  /** "What it leaves out" */
  limits: string[];
}

export const FAQ_ARTICLES: Record<string, FaqArticle> = {
  "borehole-water-system": {
    summary:
      "Sizes the well, the pump, the treatment train, the tank and the stand that carries it.",
    description:
      "A borehole is a chain of decisions that all have to agree: hole depth, drawdown under pumping, storage against the morning peak, treatment, and what holds the tank up. The tool works that chain on the numbers you enter and shows every step it took.",
    functions: [
      "Sizes casing, slotted screen, gravel pack and sanitary seal from the annular volume of the drilled hole.",
      "Estimates drawdown, sets the pump below the pumping water level and works riser friction by Hazen Williams.",
      "Turns head and flow into a motor rating, and warns when the duty needs more than the largest stocked size.",
      "Sizes storage against the morning peak plus a reserve, then rounds to a tank that is sold.",
      "Designs the stand under the tank: pads, ring beam, piers or columns, and a wind check with the tank empty.",
    ],
    advantages: [
      "Pump, tank and stand are sized together, so a tank the pump cannot fill or a stand that cannot carry the tank is caught before pouring.",
      "Assumptions are labelled: presumed bearing, modelled strata, a wind speed that is a market figure not a site study.",
      "Quantities are separate from money, so the same estimate travels between markets.",
    ],
    limits: [
      "Geology is modelled from depth and aquifer type, not logged from the hole.",
      "Structural quantities are a bill, not a signed design; the ring beam, pads and columns still need an engineer.",
      "Water quality is judged against standard limits from the figures you enter, not from a sample.",
    ],
  },

  "wallpaper-calculator": {
    summary:
      "Plans wallpaper rolls or mural panels from measured walls, product dimensions, pattern repeat and your own budget inputs.",
    description:
      "A wallpaper order starts with the wall, but the quantity depends on the product width, roll length, pattern match and the cuts that fit within each roll. This calculator works from those details and shows how the estimate is assembled, while keeping wall area and full height drops distinct.",
    functions: [
      "Counts full height drops across each wall from its measured width and the product width.",
      "Calculates cut lengths from wall height, trimming allowance and the pattern repeat you enter.",
      "Packs cut lengths against usable roll length, then rounds to whole rolls or priced packages.",
      "Estimates fixed mural panels separately, using their dimensions and panels per priced set.",
      "Shows opening area as a deduction while retaining full height drops across the wall for ordering.",
    ],
    advantages: [
      "Product dimensions and pattern repeat remain visible inputs, not hidden market assumptions.",
      "The roll takeoff and wall area are reported separately, so an opening deduction cannot conceal the ordering method.",
      "Material and fitting prices are entered by the user and are not labelled as live supplier prices.",
      "Multiple walls, package formats and mural panels can be planned in one estimate.",
    ],
    limits: [
      "It does not create a full installer cutting plan or use the positions of doors and windows to recover offcuts.",
      "Pattern direction, batch matching, substrate preparation and product hanging instructions require product and site checks.",
      "Example roll presets are not universal standards; verify usable dimensions on the package.",
      "Prices and fitting rates are manual inputs, not verified market data, and tax is not inferred.",
    ],
  },
  "window-blinds": {
    summary:
      "Prices a schedule of window blinds per window and per square metre, with the minimum charge and the waste allowance shown.",
    description:
      "Blinds are sold on two rules at once: a rate per square metre and a minimum charge per window that overrides it on small openings. Add the fabric that is cut away to clear the hardware and line up a pattern, and the rate on the shop wall stops predicting the invoice. The calculator prices each opening from its measured width and drop, applies the type's waste allowance, lifts the result to the market minimum, then totals the schedule.",
    functions: [
      "Converts the measured opening, in feet or metres, into square metres before any price is applied.",
      "Applies the waste allowance for that blind type, larger for folded fabric than for rigid slats.",
      "Prices the window from the market rate, then lifts it to the minimum charge per window when the opening is small.",
      "Multiplies by the count on each row and adds fitting, extras and the grade the job is specified in.",
      "Totals the schedule and reports a blended rate per square metre alongside the individual window prices.",
    ],
    advantages: [
      "The result is per window, which is how the customer signs off, and per square metre, which is how the shop buys.",
      "Every row shows the charged area, the rate and whether the minimum applied, so a quote can be defended line by line.",
      "The same schedule works in any market once a local rate is entered, because the arithmetic never changes.",
    ],
    limits: [
      "Rates come from the market book, not from this article; where a market has no verified band the calculator asks for a rate.",
      "Motors, cassette headrails and taking down old blinds are added only when you supply the figure.",
      "Tax is never assumed, and installation is a per window figure and not a surveyed labour rate.",
    ],
  },

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
      "Buying by tin, not by litre stops the quiet shortfall that appears on the second coat.",
      "A sound wall that only needs a refresh is not priced as new work, because primer stays optional.",
    ],
    limits: [
      "It does not judge surface condition. Bare plaster and heavy patching need products and quantities you decide.",
      "It uses the coverage figure you supply, not guessing a spread rate for a product it has not seen.",
      "Labour, access equipment and tax are outside it, and tax is reported as undetermined, not assumed.",
    ],
  },
  "tile-calculator": {
    summary:
      "Converts a measured area into the tiles and packs you have to buy, with the waste you choose.",
    description:
      "A tiling quantity estimator built on the area you measure and the tile size you are laying. It counts tiles for that area, adds the waste you allow for cuts, and rounds up to the packs the tiles are sold in.",
    functions: [
      "Calculates the area to be tiled from the dimensions you enter, not from a default room.",
      "Counts tiles from the area and the tile size, so a change of format changes the count immediately.",
      "Applies the waste percentage you choose for cuts, edges and breakages.",
      "Rounds to whole packs and shows the pack count, which is the number a supplier quotes against.",
    ],
    advantages: [
      "Waste is a visible line you set, not a hidden margin added at the counter.",
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
      "Converts area and thickness into a volume of plaster, not a flat rate per square metre.",
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
      "Splits the volume by the mix ratio you choose, not assuming one.",
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
      "Counts blocks for the foundation courses, not for the whole wall above.",
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
      "Mix ratios and roof geometry stay visible, since a client questions those first.",
    ],
    limits: [
      "It stops at the roof covering. Finishes, electrical and plumbing are priced from different quantities.",
      "It does not size structural members or certify a design.",
      "Labour, plant and tax are outside it, and tax is reported as undetermined.",
    ],
  },
  "retaining-wall-calculator": {
    summary:
      "The buried footing and the stem, with soil type changing the geometry, not the opinion.",
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
      "The footing width stays on screen, so a site investigation can correct it, not be ignored.",
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
      "A contractor who already ran the roof gets the same perimeter, not a second, different one.",
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
      "Span to tonnage, because steel is bought and quoted by mass, not by length.",
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
      "Steel price is yours to enter, because there is no verified price book for it in most markets, and tax is reported as undetermined, not assumed.",
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
      "Counts come from your schedule, so a change of plan is a change of number, not a re-estimate.",
    ],
    limits: [
      "It does not specify sizes, glazing, ironmongery brands or fire ratings.",
      "Installation labour, sealants and finishing are separate items.",
      "It cannot price a schedule you have not counted, and it says so, not guessing.",
    ],
  },
  electrical: {
    summary:
      "A wiring material take off that refuses to size a cable category you have not measured.",
    description:
      "An electrical materials estimator for a building's wiring. Point counts and distribution board counts come from you, and so do the average cable run lengths, because a run length is a site measurement, not a number a calculator can know.",
    functions: [
      "Computes each cable category separately from the average run length you measure for it.",
      "Uses switch and distribution board counts you enter to set the accessory quantities.",
      "Applies verified planning rules for circuit grouping, conduit allowance, junction boxes and waste.",
      "Leaves a cable category unsized and flagged when you have not given it a run length.",
    ],
    advantages: [
      "Cable lengths are never invented, which is the failure that makes an electrical quote wrong.",
      "Circuit grouping comes from stored rules that can be inspected, not a rule of thumb.",
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
      "An empirical conduit and wiring estimator. It converts floor area and point counts into the physical materials an installation consumes, using the local trade's own multipliers, not a circuit schematic.",
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
      "A missing run length leaves the line visibly unsized, not silently filled with a guess.",
      "Categories are sized separately, so a long drainage run does not distort the hot water order.",
      "Allowances are printed, which makes the fittings count arguable, not mysterious.",
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
      "It is not an e-signature or a contract, and approval here records a client's answer, not a signed agreement.",
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
      "The markup is visible as its own amount, so a client can see what is being added, not inferring it.",
      "Editing a line changes that line only; it never re-runs a calculation behind your back.",
      "Approval locks the record, which keeps an agreed figure from drifting afterwards.",
    ],
    limits: [
      "Tax is never applied automatically, and the quote reports it as undetermined, not guessing a rate.",
      "Transport is a figure you enter, not a distance calculation.",
      "It does not collect payment, produce a signed contract, or replace your own terms of business.",
    ],
  },
  "using-frelux": {
    summary:
      "What FRELUX does, how the numbers are produced, and what it will never pretend to know.",
    description:
      "FRELUX is a construction estimating platform. The quantities come from deterministic engines that show their steps, and AI is restricted to extracting data from documents and photographs, not deciding quantities.",
    functions: [
      "Runs each discipline through its own engine, from finishes to structure to services, with the arithmetic printed.",
      "Prices materials from verified price books where they exist and asks you to enter prices where they do not.",
      "Reports tax as undetermined instead of applying a jurisdiction's rate on your behalf.",
      "Runs in a browser on a phone, so a quantity can be checked on site, not in an office.",
    ],
    advantages: [
      "Every figure can be traced to an input and a printed step, so a quote defensible.",
      "Manual price entry replaces invented fallbacks, so an unpriced market reads as unpriced.",
      "Estimates are not padded with mock data, so a blank section means missing input, not fiction.",
    ],
    limits: [
      "It is not a substitute for a structural, electrical or plumbing engineer's design.",
      "It estimates materials; labour rates, plant and programme remain your judgement.",
      "It cannot price a market with no verified price book without your own prices entered.",
    ],
  },
  "mathematical-plan-elevation": {
    summary:
      "Turns typed dimensions into an elevation, a geometry check and a preliminary quantity schedule.",
    description:
      "An elevation is a set of consequences that follow from four inputs: length, width, storey height and roof pitch. The page works those consequences line by line across five numbered levels, from the strip footing to the roof covering, and prints each figure beside the arithmetic that produced it.",
    functions: [
      "Derives footing width from an assumed line load and the bearing value you select, and compares the contact pressure with it.",
      "Calculates excavation, blinding, footing and slab volumes from the plan dimensions and the stated thicknesses.",
      "Measures wall area from the perimeter and storey height, then deducts the openings you list by wall side.",
      "Calculates ring beam concrete and main reinforcement from the beam length and its section.",
      "Calculates ridge rise, rafter length and true roof area from the span and the pitch for gable and hip roofs.",
      "Displays the same SI calculation in feet, square feet, cubic feet and pounds, and exports the schedule as CSV.",
    ],
    advantages: [
      "Geometry and quantities come from one set of dimensions, so the roof and the walls cannot disagree.",
      "Each result is shown with the step that produced it, so a reader can check the figure and see where it comes from.",
      "The unit system is a display choice, so switching to feet cannot change a quantity.",
      "The exported summary carries the assumption boundary and any screening flag with the numbers.",
    ],
    limits: [
      "It does not read, scale or measure an uploaded plan image or photograph.",
      "It does not design foundations, size reinforcement for a load case or check masonry capacity.",
      "It does not determine code compliance; bearing and wind values are planning assumptions.",
      "It does not price anything by itself, since unit rates are the ones you enter.",
    ],
  },
};

/** Base tool articles plus the wider engine family, in one lookup. */
export const ALL_FAQ_ARTICLES: Record<string, FaqArticle> = {
  ...FAQ_ARTICLES,
  ...ENGINE_FAQ_ARTICLES,
  ...RENOVATION_FAQ_ARTICLES,
  "tall-building-structure": {
    summary:
      "Screens a high rise from entered geometry: the lateral system the height calls for, the wind and seismic shear it must resist, the drift that shear causes, and the raft and piles that carry it.",
    description:
      "The page takes the geometry of a tower, its concrete strength, the soil it stands on and the mapped spectral accelerations for its site, then works through the structural screening checks a tall building needs before an engineer is engaged. It selects a lateral system from the entered height, applies the ASCE 7 velocity pressure form for wind base shear and roof drift, computes a seismic base shear from the spectral values supplied, sizes a raft and a pile group for the combined demand, and rolls the result into concrete and reinforcement quantities and a build programme. Each step prints the terms it used and the assumptions behind them, and the page states that the output is a screening check and not a structural design.",
    functions: [
      "Selects the lateral system for the entered height: rigid frame, shear core, core with outriggers, tube in tube or a mega frame, and flags a height that sits outside the range for the chosen system.",
      "Computes wind base shear and roof drift from the velocity pressure form, printing the exposure and topographic factors so the figure can be traced term by term.",
      "Computes seismic base shear from the SDS and SD1 values entered and the occupancy category, and reports the period it used.",
      "Sizes a raft thickness and a pile group for the combined gravity, wind and seismic demand on the soil entered, with the bearing and capacity assumptions stated.",
      "Converts the geometry into concrete and reinforcement quantities and a floor by floor build programme.",
    ],
    advantages: [
      "The first structural conversation is cheaper: the framing system, the governing load case and the foundation type sit on one page before a consultant is booked.",
      "Every figure shows the term it came from, so a reviewer can check the arithmetic without chasing the source document.",
      "The same geometry can be screened at several heights to see the point where the lateral system, not the floor area, starts driving the cost.",
    ],
    limits: [
      "It is a screening check. Member design, reinforcement detailing, connection design and a site investigation are outside it, and a licensed structural engineer must sign off the building.",
      "The wind and seismic coefficients illustrate the form of the calculation for the site class and occupancy entered. They are not a site specific hazard study.",
      "Soil bearing and pile capacity are the values you enter. The page does not derive them from a borehole log.",
      "The lateral system ranges describe the framing types named at the heights where practice puts them. They are not code limits.",
    ],
  },
  "fence-block-calculator": {
    summary:
      "Sizes blocks, mortar, sand and cement for a boundary wall from the plot and the wall height.",
    description:
      "A boundary wall is priced from geometry: how long it runs, how many coaches high it stands, and which block it is built from. The calculator derives the run from the plot dimensions you enter, counts blocks by face area, and carries the same geometry through the mortar, the sand and the cement so the material order matches the wall that will be built.",
    functions: [
      "Derives the wall run from the plot or site dimensions you enter instead of asking for a length twice.",
      "Counts blocks by the face area of the block you select, then adds the breakage allowance.",
      "Sizes mortar for the joints and the rendering you choose from a stated mix and bag weight.",
      "Reports sand in cubic metres and in the tipper trips, barrows and head pans used on site.",
      "Carries piers and courses through the same geometry, so a taller wall costs more along its whole length.",
    ],
    advantages: [
      "The block count follows the wall that is actually being built, so a change of block size or height does not need a new estimate by hand.",
      "Sand and cement are printed with the mix and allowance they came from, which makes the figure checkable against a specification.",
      "Quantities arrive in the units materials are delivered and carried in, not only in cubic metres.",
    ],
    limits: [
      "The tool sizes materials. It does not design the wall: pier spacing, foundation width, reinforcement and wind resistance are engineering decisions.",
      "Soil conditions and site levels are not assessed, although both decide the foundation.",
      "Block strength class and mortar grade are taken as you enter them, not verified against the exposure.",
    ],
  },
  "german-floor-calculator": {
    summary:
      "Prices each layer of a ground floor separately: fill, blinding, membrane and slab.",
    description:
      "A ground floor is built in layers, and each one is bought in a different unit. Hardcore arrives by the trip, blinding sand by the cubic metre, the membrane by the roll and the slab by cement bags, sand and granite. The calculator holds the layers apart so a deeper fill adds fill, and a thicker slab adds concrete, without either one silently changing the other.",
    functions: [
      "Turns the floor area and the fill depth into a hardcore volume.",
      "Sizes the blinding layer from its own thickness and reports the sand it consumes.",
      "Reports the damp proof membrane as an area with a lap allowance, because it covers instead of fills.",
      "Converts slab volume to cement bags, sharp sand and granite at the mix and dry factor you set.",
      "Prints the dry factor and the mix ratio beside the quantities so the conversion can be checked.",
    ],
    advantages: [
      "Layers are independent, so deepening the fill no longer inflates the slab concrete.",
      "The dry factor and mix are visible, which is where a hand estimate usually undercounts cement.",
      "Deliveries are shown in the units used on site, including trips and bags.",
    ],
    limits: [
      "Compaction in layers, the suitability of the fill and the level the floor must reach are site decisions the calculator does not make.",
      "The structural thickness of the slab, and any reinforcement in it, come from the engineer, not from this tool.",
      "Raising a site above flood level is a drainage and levels problem that a material takeoff cannot answer.",
    ],
  },
  "tv-console-calculator": {
    summary:
      "Turns a console concept into a panel schedule, a sheet count and a cost roll-up from your own rates.",
    description:
      "A media unit is a set of rectangular panels before it is a piece of furniture. The calculator expands the concept you choose into that set, packs the panels into the sheet size you buy, adds the workshop allowance and prices the board, the banding and the hardware from the rates you enter, so the furniture quote rests on a schedule a joiner can read.",
    functions: [
      "Expands the chosen concept into sides, top, bottom, shelves, dividers, back and doors at the dimensions you set.",
      "Packs the panels into sheets of your size and reports the packed count before any allowance.",
      "Applies the workshop allowance to the packed count and rounds up, so a spare panel is bought where it is needed.",
      "Measures edge banding on the exposed edges and counts hinges per door from the door height.",
      "Prices board, banding, hardware and labour from the rates you enter and rolls the result into one total.",
    ],
    advantages: [
      "The schedule is stated in panels, so a joiner can check the arithmetic against the drawing.",
      "The sheet count names its packing method, which keeps the figure honest about what it does not simulate.",
      "Hardware follows the concept, so drawers, doors and open shelving are costed as the different jobs they are.",
    ],
    limits: [
      "The figure is a planning estimate. Grain direction, book matching, saw kerf and offcut reuse are not simulated, so a nested cutting list will differ.",
      "It is not a safety or fixing design. Wall anchors, stud finding and the weight the wall can carry are outside it.",
      "Sheet prices and labour rates are yours, so the total is only as current as the rates you enter.",
    ],
  },
  "water-tower-staging-estimator": {
    summary:
      "Sizes an overhead tank staging: dead load, wind stability, footing and the material bill.",
    description:
      "An elevated tank is a load path from the water down to the ground, with one load that pushes sideways and cannot be ignored. The calculator carries the tank capacity and the staging geometry through dead load, overturning, footing bearing and member quantities, and shows the build sequence the staging is assembled in.",
    functions: [
      "Converts tank capacity into water mass and adds the tank and frame above the legs, reported in kilonewtons.",
      "Reports a wind overturning factor from the pressure, the height and the leg spread you enter, with the bracing that resists it.",
      "Sizes the pad footing from the leg load and the bearing you assume.",
      "Reports leg section utilisation and the steel or concrete quantities for the tower material you selected.",
      "Shows the step by step build sequence from the pads through the legs to the tank.",
    ],
    advantages: [
      "Dead load, stability and quantities are worked from one set of geometry, so a taller tower moves every figure together.",
      "The empty tank case is exposed, because water is not ballast that can be relied on in a storm.",
      "Footing and member figures come with the assumptions printed beside them, so an engineer can check the inputs.",
    ],
    limits: [
      "The bearing value is an assumption about the soil, not a measurement of it.",
      "Member design to a code, weld and bolt details, and the tank manufacturer's loading requirements are not carried out.",
      "The result is an estimate for planning and enquiry, not a stamped structural design.",
    ],
  },
  "diaspora-budget-tracker": {
    summary:
      "Projects a cross-border build budget through exchange spreads and compound material inflation.",
    description:
      "A build funded from abroad is exposed twice: to the gap between the rate money arrives at and the rate it is spent at, and to the inflation that has accumulated by the time each milestone is paid. The tracker projects the forward budget from the rates and the inflation you can observe, and reports the variance against what the sponsor has available.",
    functions: [
      "Reports the spread between the official and parallel rates you enter, in currency terms.",
      "Compounds the annual inflation across the timeline and reports the multiplier it used.",
      "Projects a forward target budget milestone by milestone, applying the rate and the accumulated inflation to each.",
      "Compares available funds with the projection and reports variance health.",
      "Keeps each rate dated, so a figure can be traced to the day it was observed.",
    ],
    advantages: [
      "The two exposures are shown separately, so a sponsor can see whether the gap or the inflation is doing the damage.",
      "Compounding is applied year on year instead of one year's rate multiplied by the number of years.",
      "The projection is milestone by milestone, which is the order money is actually spent in.",
    ],
    limits: [
      "No live rate is quoted and no forecast is published. The rates and the inflation figure are the ones you record.",
      "It is a planning model, not financial or investment advice.",
      "A delay, a currency move or a repriced milestone after the projection will change the answer.",
    ],
  },
  "quote-check": {
    summary:
      "Compares each quoted line with the market rate for the same item and shows where the gaps are.",
    description:
      "A quote arrives as a list of rates, and the only useful question about it is which of those rates are sitting away from the market for the same item. The check compares each line against the price book rate for that item, reports the lines inside a 10 percent band as fair, names the lines above and below it, and separates the lines that cannot be judged for want of a reference price.",
    functions: [
      "Compares the quoted rate for each line with the price book rate for the same item.",
      "Reports a line as fair when the rate sits within 10 percent either side of the reference rate.",
      "Names the lines above the band and the lines below it, with the rate difference and the money difference printed.",
      "Refuses to compare lines whose units do not match the reference unit exactly once case and spacing are removed.",
      "Lists lines with no reference price separately, because a market rate cannot be invented for an item the price book does not hold.",
    ],
    advantages: [
      "The band is stated, so a verdict can be argued with instead of taken on trust.",
      "Money differences are printed beside rate differences, which separates a high rate from a large quantity.",
      "Unjudged lines are counted apart from fair ones, so silence is never reported as a pass.",
    ],
    limits: [
      "A fair line is a market check on the rate alone. It does not judge specification, quantity, wastage, preliminaries, labour or terms.",
      "The reference rates are the ones in your price book for your market, so an out of date price book produces a confident wrong answer.",
      "Lines without a reference are listed, not scored, and the comparison makes no claim about whether they are good value.",
    ],
  },
  "photo-estimator": {
    summary:
      "Reads building details from a photograph into the calculator form, then runs the engines on the figures you confirm.",
    description:
      "The photograph is a fast way to get measurements into a calculator and a poor way to decide them. This surface separates the two jobs: the image is read for building details such as overall dimensions, building type and roof type, those readings are put in front of you beside the defaults the engine would otherwise assume, and the estimate is generated from the figures you confirm.",
    functions: [
      "Extracts overall dimensions, building type and roof type from an uploaded photograph.",
      "Presents each reading beside the engine default, so assumptions and observations are not confused.",
      "Records the corrections you make, which is how the readings improve over time.",
      "Runs the FRELUX estimation engines on the confirmed figures and returns quantities and cost.",
      "Saves the estimate to a project, where a later recalculation can pick it up.",
    ],
    advantages: [
      "Extraction and arithmetic are separated, so a bad reading is corrected in the form instead of being buried in a total.",
      "Engine defaults are shown explicitly, which is the difference between an assumption and a measurement.",
      "Corrections are captured, so the same misreading is less likely to reach the next estimate.",
    ],
    limits: [
      "What a photograph can establish is limited by perspective, obstruction and the absence of a scale reference.",
      "A single view cannot reveal depth hidden behind a wall, and a site measurement remains the authority.",
      "The readings are an input to the engines, and the estimate inherits every assumption the engine makes about specification.",
    ],
  },
};

export function getFaqArticle(slug: string): FaqArticle | undefined {
  return ALL_FAQ_ARTICLES[slug];
}

/** Section headings, in the order the article page renders them. */
export const FAQ_ARTICLE_SECTIONS = [
  { key: "description", heading: "What it is" },
  { key: "functions", heading: "What it calculates" },
  { key: "advantages", heading: "Why contractors use it" },
  { key: "limits", heading: "What it leaves out" },
] as const;
