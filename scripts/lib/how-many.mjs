/**
 * The "how many" answer for each tool.
 *
 * Most of the traffic a construction calculator can win is a question of the
 * form "how many blocks / tiles / bags of cement do I need", and a search
 * result earns that click only when the page answers it in the first sentence
 * rather than making the reader hunt for an input box. So every tool carries
 * one question and one direct answer, written here so the prerendered page, the
 * FAQ schema and the hydrated page all read the same sentence.
 *
 * Rules this file keeps:
 *  - the answer opens with the quantity, not with a description of the tool;
 *  - no currency, market or unit is baked in, because the same answer is
 *    served to every market (money is mentioned only as "at the rate you
 *    enter", which is what the calculators actually do);
 *  - a tool that cannot answer a quantity question says so in NOT_A_QUANTITY
 *    instead of being given a question it would answer badly.
 */

/** @type {Record<string, { q: string, a: string }>} */
export const HOW_MANY = {
  "/cost-estimator": {
    q: "How much will this construction work cost?",
    a: "Pick the work and enter the measurements: quantities come from the engines and the cost follows the prices in your market's book, with labour and waste shown as separate lines.",
  },
  "/painting-estimator": {
    q: "How much paint does a room need?",
    a: "Walls and ceiling area, less the openings, divided by the coverage per coat gives the litres: pick the room preset or enter your own measurements to get litres, containers and cost.",
  },
  "/mineral-stone-calculator": {
    q: "How much mineral stone finish do I need?",
    a: "Wall area divided by the coverage of the product you select gives the bags or packs, plus the waste allowance: the cost follows the product data, not an assumed price.",
  },
  "/stucco-calculator": {
    q: "How much stucco do I need for this wall?",
    a: "Wall area times the coat thickness gives the volume, and the package yield turns that into packages: the calculator states the coverage it used and the waste it allowed.",
  },
  "/tyrolene-estimator": {
    q: "How many bags of tyrolene do I need?",
    a: "Wall area divided by the coverage per bag for the build-up you choose gives the bags, plus primer and the waste allowance, priced at the rate you enter.",
  },
  "/screeding-cost-estimator": {
    q: "How much does screeding cost per square metre?",
    a: "Cement and sand follow from area times thickness, and the cost from the rates in your market's book: the per-square-metre figure and the total are shown separately.",
  },
  "/pop-ceiling-cost-estimator": {
    q: "How much does a POP ceiling cost?",
    a: "Ceiling area drives the POP cement, boards, mesh and screws, and the labour rate turns the quantities into a total, with the waste allowance stated beside each line.",
  },
  "/tile-cost-estimator": {
    q: "How much do tiles cost for this area?",
    a: "Area divided by the tile size gives the tiles, the box count follows from tiles per box, and the cost from the price of the tile you select, with adhesive and grout added.",
  },
  "/boq-studio": {
    q: "How do I build a priced bill of quantities?",
    a: "Measure or import the work, choose the standard, and the studio builds the BOQ with rate build-up, preliminaries and contingency, so every rate can be traced to its parts.",
  },
  "/tools/visual-finishing-estimator": {
    q: "How do I compare the cost of two finishes?",
    a: "The same measured area is costed across paint, tile, screed and cladding, so the comparison is per square metre rather than per tin or per bag.",
  },
  "/prices": {
    q: "How much do building materials cost right now?",
    a: "Each material shows the price, the currency, the market and the date it was verified, so a budget is built on dated evidence rather than a remembered figure.",
  },
  "/paint-calculator": {
    q: "How many litres of paint do I need?",
    a: "Divide the paintable wall and ceiling area by the coverage printed on the tin for each coat, then add the number of coats you are applying: the calculator does that sum and returns whole buckets to buy, walls and ceiling counted separately.",
  },
  "/tile-calculator": {
    q: "How many tiles and boxes do I need?",
    a: "Floor or wall area divided by the area of one tile gives the tile count, and tiles per box gives the boxes: the calculator adds a cutting allowance, then returns boxes, adhesive and grout bags for the tile size you enter.",
  },
  "/masonry-calculator": {
    q: "How many blocks do I need for a wall?",
    a: "Wall area divided by the face area of one block, including its mortar joint, gives the block count: enter length, height, openings and the block sold in your market to get blocks, mortar, cement and sand.",
  },
  "/fence-block-calculator": {
    q: "How many blocks do I need for a fence?",
    a: "Perimeter times the number of coaches high gives the wall area, and the block face area turns that into blocks: enter plot size, height in coaches and block size to get blocks with a breakage allowance, cement and sand.",
  },
  "/screeding-calculator": {
    q: "How many bags of screeding do I need?",
    a: "Area times coat thickness gives the volume, and the bag yield printed on the product turns that into bags: enter the wall or floor area and thickness to get bags, putty and finishing materials.",
  },
  "/pop-ceiling-calculator": {
    q: "How much POP cement and mesh do I need for a ceiling?",
    a: "Ceiling area drives every line: enter the area and the design to get POP cement, mesh, boards and screws, with the waste allowance stated beside each quantity.",
  },
  "/german-floor-calculator": {
    q: "How many bags of cement do I need for a german floor?",
    a: "Floor area times slab thickness gives the concrete volume, and the mix turns that into cement bags, sand and granite: the calculator also returns the hardcore, blinding and membrane the slab sits on, in the order they are laid.",
  },
  "/concrete-takeoff-calculator": {
    q: "How much concrete do I need for a slab?",
    a: "Length times width times depth gives the wet volume, and the mix converts it into whole bags of cement, sand, coarse aggregate and scheduled rebar weight for the element you enter.",
  },
  "/structural-calculator": {
    q: "How much cement, sand and granite does this concrete need?",
    a: "The member volume and the selected mix decide it: enter the element and the design code in force to get cement bags, sand, granite and the reinforcement the section requires.",
  },
  "/foundation-calculator": {
    q: "How much concrete and rebar does a foundation need?",
    a: "Footing size times depth gives the concrete volume for each base: enter the load and the bearing capacity to get foundation dimensions, excavation, concrete and the rebar schedule.",
  },
  "/reinforcement": {
    q: "How many bars of reinforcement do I need?",
    a: "Bar count comes from the spacing along each member, and length from the member plus laps and hooks: enter the elements to get bar lengths, tonnage and a bending schedule.",
  },
  "/plastering-calculator": {
    q: "How many bags of cement do I need for plastering?",
    a: "Area times coat thickness gives wet mortar volume, and the dry factor turns that into cement and sand: enter the wall or ceiling area and thickness to get bags, sand and indicative labour.",
  },
  "/drywall-calculator": {
    q: "How many drywall sheets do I need?",
    a: "Wall and ceiling area divided by the sheet size sold in your market gives the boards, and stud spacing gives the studs: the calculator also returns track, screws, tape and jointing compound.",
  },
  "/paving-calculator": {
    q: "How many pavers do I need?",
    a: "Paved area divided by the area of one paver gives the count, plus a cutting allowance: enter the area and paver size to get pavers, bedding sand, sub-base volume and edge units.",
  },
  "/wallpaper-calculator": {
    q: "How many rolls of wallpaper do I need?",
    a: "Wall area divided by the usable area of one roll gives a first count, and the pattern repeat pushes it up because each drop must be cut to the repeat: the calculator returns rolls, a drop diagram and the waste.",
  },
  "/flooring": {
    q: "How many packs of flooring do I need?",
    a: "Room area divided by the coverage on the pack gives packs, plus the waste allowance for cuts and the laying pattern: enter room areas and the finish to get packs, underlay and installation.",
  },
  "/waterproofing": {
    q: "How many rolls of membrane do I need?",
    a: "Wet area plus the laps at every sheet edge gives the membrane area, and the roll size turns that into rolls: enter the areas and detail lengths to get membrane, coating litres, primer and protection.",
  },
  "/insulation-calculator": {
    q: "How many insulation packs do I need?",
    a: "Gross area divided by the coverage printed on the pack gives the packs: enter the area, thickness and product coverage to get boards or rolls, fixings and the waste allowance.",
  },
  "/roof-framing-calculator": {
    q: "How many roof members and board feet do I need?",
    a: "Roof geometry decides the members: enter the span, pitch and spacing to get common, jack, hip and ridge counts, their lengths, linear metres and board feet, with the section sold in your market.",
  },
  "/rainwater-gutter-soffit-cost-estimator": {
    q: "How many metres of gutter and soffit do I need?",
    a: "Eaves length gives the gutter and fascia runs, and eaves depth gives the soffit area: enter the building's eaves to get gutter, fascia, soffit boards, downpipes, brackets and fixings.",
  },
  "/electrical-conduit-wiring-estimator": {
    q: "How many metres of conduit and cable do I need?",
    a: "Point-to-point runs along the routes you enter give the conduit lengths, and the same runs give cable coils: the calculator returns conduit, 1.5 mm and 2.5 mm coils, boxes, switches and sockets.",
  },
  "/electrical": {
    q: "How much electrical material does a building need?",
    a: "The fitting schedule drives it: enter the points and circuits to get a full material list, from cable and conduit to switches, sockets and accessories, priced at the rates you enter.",
  },
  "/plumbing": {
    q: "How much pipe and how many fittings do I need?",
    a: "Fixture counts and the runs between them give the pipe and fittings: enter the bathrooms, kitchen and tank position to get the full plumbing material list and cost at your rates.",
  },
  "/septic-sizing-calculator": {
    q: "How big does my septic tank need to be?",
    a: "Tank volume follows the number of users and the desludging interval: enter the household and the retention you want to get working and total volumes, plus a conditional soakaway area.",
  },
  "/solar-pv-estimator": {
    q: "How many solar panels and batteries do I need?",
    a: "Daily load divided by the sun hours and panel rating gives the panel count, and the night load plus autonomy gives the battery bank: enter your appliances to get panels, batteries, inverter size and cost.",
  },
  "/generator": {
    q: "What size generator do I need?",
    a: "Starting and running loads decide the size, not the number of appliances: enter the load you must carry to get the recommended generator size, fuel consumption per hour and cost at your rate.",
  },
  "/borehole-water-system-estimator": {
    q: "How many tanks and what pump do I need for a borehole?",
    a: "Peak demand and the head from the water table to the tank decide it: enter the depth, tank height and demand to get total dynamic head, pump power, tank sizing, treatment stages and a full bill of quantities.",
  },
  "/water-tower-staging-estimator": {
    q: "How big should the staging under a water tank be?",
    a: "Tank volume gives the dead load, and the height gives the overturning moment: enter tank size and height to get dead load, pad footing size, leg section and utilisation, with the steel or concrete quantities.",
  },
  "/icf-wall-estimator": {
    q: "How many ICF blocks and concrete volume do I need?",
    a: "Wall perimeter and height less openings give the block count, corner units and core volume, and the form family decides how much of the cavity is concrete: enter core width, flat, waffle or screen forms and the interior lining to get blocks, rebar, bracing, ready-mix and the R-value with its basis.",
  },
  "/eifs-wall-estimator": {
    q: "How much continuous insulation, mesh and acrylic finish for EIFS / ETICS?",
    a: "Gross wall area minus rough openings gives the net facade area: enter wall dimensions, insulation thickness, and texture to calculate WRB air barrier, rigid foam boards, reinforcing mesh rolls, base coat mortar, and synthetic finish pails.",
  },
  "/retaining-wall-calculator": {
    q: "How much concrete and blockwork does a retaining wall need?",
    a: "Wall length, height and stem thickness give the volumes: enter them to get footing concrete, blocks, rebar and weep holes, with the rule behind each quantity stated.",
  },
  "/structural-steel-i-beam-calculator": {
    q: "How much does a steel I-beam weigh?",
    a: "Section mass per metre times the length gives the weight: pick the section and span to get kilograms, tonnes, priming area and the cost at your own rate.",
  },
  "/doors-windows": {
    q: "How many doors and windows do I need to buy?",
    a: "The schedule is the answer: enter each opening with its size and type to get frame, leaf and fitting quantities with the total cost at your rates.",
  },
  "/window-blind-calculator": {
    q: "How much do blinds cost per window?",
    a: "Chargeable area for each opening times the rate for that blind type gives the price: enter each window's size and type to get the price per window, the total before tax and a per-window average.",
  },
  "/tv-console-calculator": {
    q: "How many sheets and panels do I need for a TV console?",
    a: "The panel schedule is the answer: enter the console's width, height and depth to get a transparent rectangular-panel schedule and the sheet area it needs, not a cut-optimised list.",
  },
  "/increte-flooring-calculator": {
    q: "How much decorative concrete flooring material do I need?",
    a: "Surface area drives the packs: enter the area and the build-up to get package counts, optional concrete volume and itemised costs, with missing data flagged rather than guessed.",
  },
  "/wall-finish-estimator": {
    q: "How much material does this wall finish need?",
    a: "Each layer is costed on its own: enter the wall area and the layer build-up to get quantity by layer, labour and total cost, with the calculation shown line by line.",
  },
  "/temporary-works-calculator": {
    q: "How much formwork and propping do I need?",
    a: "Concrete elements give the form-contact area, and the element height gives a simplified scaffold grid: enter the elements to get contact area, sheet allowance and the grid.",
  },
  "/demolition-calculator": {
    q: "How much debris will demolition produce?",
    a: "In-place volume times the bulking factor gives loose debris, and the skip or lorry size turns that into loads: enter the elements being removed to get volume and indicative loads.",
  },
  "/earthworks-cut-fill": {
    q: "How much cut and fill does this site need?",
    a: "Average end area between sections gives the cut and the fill: enter the sections to get cut, compacted fill, loose haul volume and a qualified reuse balance.",
  },
  "/blueprint-takeoff": {
    q: "How do I measure quantities from a plan?",
    a: "Calibrate the drawing against a known dimension, then measure: the takeoff returns linear, area and counted quantities per sheet, and compares revisions so a change cannot slip through unnoticed.",
  },
  "/build-to-roof-estimator": {
    q: "How much material does a building need from foundation to roof?",
    a: "The building's dimensions drive every line: enter them to get a complete schedule, from excavation and concrete to blockwork, timber, roofing sheets and labour.",
  },
  "/renovation-estimator": {
    q: "How much will my renovation cost?",
    a: "Only the rooms you are changing are measured, so a bathroom is not priced as a house: pick a preset or your own rooms to get net quantities with waste, and a total once you enter your rates.",
  },
  "/global-site-safety-estimator": {
    q: "How much site safety equipment do I need?",
    a: "Perimeter, workforce and programme length set the quantities: enter them to get hoarding, signage, PPE, first aid and welfare as a transparent inventory with the standards cited.",
  },
  "/labour-estimator": {
    q: "How many labourers and days will this take?",
    a: "Quantity divided by the output per gang-day gives the days, and the gang size gives the labourers: enter the work and the trade to get crew sizes, days and labour cost per trade.",
  },
  "/carbon-footprint": {
    q: "How much embodied carbon is in these materials?",
    a: "Quantity times the emission factor for that material gives kgCO2e per line: enter the materials to get a total, with any line lacking a factor flagged rather than guessed.",
  },
  "/circular-reuse": {
    q: "How much material can be recovered from demolition?",
    a: "Quantities times the recovery factor for each material give what can be reused or recycled: enter the elements to get recoverable, reusable and recyclable amounts from sourced factors.",
  },
  "/count-vision": {
    q: "How many blocks, bags or tiles are in this photo?",
    a: "Upload a photo and the counter returns the count with a confidence level and a permanent log, so a disputed count can be checked later rather than argued about.",
  },
  "/image-estimator": {
    q: "How much material is in this photo?",
    a: "The photo gives a starting quantity, and the FRELUX engines check it against their own rules: you get line items you can correct, with the assumptions shown.",
  },
  "/smart-calculator": {
    q: "How do I estimate a job from a description?",
    a: "Describe the work and the engines assemble the quantities: you get material quantities, line items and cost at your rates, with the engine that produced each line identified.",
  },
  "/conversational-estimator": {
    q: "How do I build an estimate by answering questions?",
    a: "Each answer narrows the scope, and the estimate is assembled from the FRELUX engines rather than guessed: the result is a full estimate you can edit line by line.",
  },
  "/surface-assessment": {
    q: "How much preparation does this surface need?",
    a: "The condition decides the preparation, not the area alone: record what you see to get ranked preparation steps with priorities, saved to the project.",
  },
  "/defect-diagnosis": {
    q: "How do I find the cause of this defect?",
    a: "The symptoms narrow the causes: describe the defect to get ranked root causes with the checks that confirm or rule out each one, instead of a single guess.",
  },
  "/heat-comfort": {
    q: "How do I make this building cooler?",
    a: "The building's orientation, openings and materials decide the comfort score: enter them to get a score and the cooling measures that will actually change it.",
  },
  "/maintenance-planner": {
    q: "How much should I budget for maintenance each year?",
    a: "Each element's cycle and cost give the annual figure: enter the building's elements to get a maintenance schedule with an expected annual cost.",
  },
  "/estimate-refresh": {
    q: "How much has this estimate changed with current prices?",
    a: "The same quantities are recalculated against the current price book, so the difference is price movement alone and not a changed scope.",
  },
  "/quote-check": {
    q: "How much of this quote is above market?",
    a: "Each line is compared with the price book for your market: the result lists the lines that sit above market, by how much, and the lines that cannot be judged for lack of a reference price.",
  },
  "/unit-converter": {
    q: "How many feet, tonnes or bags is this measurement?",
    a: "Enter the number and the unit it arrived in to get the same measurement in the unit you need, with the exact ratio and any depth, density or bag weight the answer depends on.",
  },
  "/diaspora-budget-tracker": {
    q: "How much will my build cost by the time it is finished?",
    a: "The exchange rate gap and compound inflation are applied to today's budget to give a forward projected target, with variance health shown rather than a single optimistic number.",
  },
  "/mathematical-plan-elevation": {
    q: "How do I turn dimensions into a plan and elevation?",
    a: "Enter the dimensions to get a parametric plan and elevation with preliminary quantities, priced only where you supply a supplier rate.",
  },
  "/material-price-index": {
    q: "How much do building materials cost in my city?",
    a: "Each material shows a median, a range and the price basis, compared city by city, with recorded history and movement only where the evidence supports one.",
  },
  "/paint-comparison": {
    q: "How much does each paint cost per square metre?",
    a: "Total cost per product divided by its coverage gives the comparable figure: the comparison ranks paints by cost per area so the cheapest tin is not mistaken for the cheapest job.",
  },
  "/finish-estimator": {
    q: "How much does each wall finish cost?",
    a: "The same measured area is costed across the finishes: you get material quantities and total cost per finish, so the choice is made on numbers rather than on the sample board.",
  },
  "/boq-generator": {
    q: "How do I turn an estimate into a bill of quantities?",
    a: "The estimate is arranged into a BOQ under the standard you choose, with preliminaries, rate build-up, contingency and tax, ready to share or export for tender.",
  },
  "/margin-calculator": {
    q: "How much should I charge to hit my margin?",
    a: "Cost divided by one minus the margin gives the selling price: enter material, labour and overhead costs to get markup, gross margin and the price to quote.",
  },
  "/cash-flow-timeline": {
    q: "How much cash do I need each month?",
    a: "Spend follows the programme, not the total: enter the stages and their durations to get a monthly cash-flow timeline and the month the balance runs lowest.",
  },
  "/regional-cost-index": {
    q: "How much should I adjust this estimate for my region?",
    a: "The index for your region is applied to the estimate, so the same scope is priced for where it is being built rather than where the price book was recorded.",
  },
  "/project-timeline": {
    q: "How long will this project take?",
    a: "Stage durations and their overlaps give the programme: enter the scope to get a stage-by-stage timeline with milestones and the critical path.",
  },
  "/construction-sequence": {
    q: "How is a building put together, step by step?",
    a: "The sequence runs from setting out to finishes, with each step's prerequisite stated, so work is not scheduled before what it depends on.",
  },
  "/material-advisor": {
    q: "How do I choose materials for this climate?",
    a: "Climate and exposure decide the specification: enter the location and exposure to get material guidance for paint, waterproofing, roofing, tiles, concrete, steel, insulation and drainage, with the standards cited.",
  },
  "/code-reference": {
    q: "How do I know which building code applies here?",
    a: "The jurisdiction selects the code family and edition, then lists the references for concrete, reinforcement, loads, wind, snow, foundations, durability and materials, and states plainly what cannot be verified locally.",
  },
  "/warranty-certificate": {
    q: "How do I issue a warranty certificate to a client?",
    a: "The certificate is generated from the project's own record, so the scope, the dates and the issuer are the ones on file, and it can be verified later.",
  },
  "/contractor-credit": {
    q: "How do I show a credit rating to clients and suppliers?",
    a: "The rating is built from the record you keep on the platform, so it can be shared as evidence rather than as a claim.",
  },
  "/drainage-calculator": {
    q: "How much pipe and excavation does drainage need?",
    a: "Run length gives the pipe, and the pipe diameter plus the fall you enter gives the trench: the takeoff returns pipe lengths, fall, bedding, excavation and indicative chambers for each run.",
  },
  "/foundation": {
    q: "How much will the foundation cost?",
    a: "Each element is priced on its own quantities, so the excavation, blinding, concrete, blockwork and rebar stay separable: the total follows the prices in your market's book.",
  },
  "/ai-color-assistant": {
    q: "How do I choose a paint colour scheme that works together?",
    a: "The assistant returns colour combinations rather than a single colour, so the walls, trim and accent are chosen as a set and can be previewed before anything is bought.",
  },
  "/color-preview": {
    q: "How will this colour look on my wall?",
    a: "Upload a photo of the room and the preview paints the wall in the colour you choose, so the decision is made on the actual light and furnishings rather than on a swatch.",
  },
  "/bim-ifc-import": {
    q: "How do I get quantities out of a BIM model?",
    a: "Import the IFC model and the elements are read into a takeoff you can measure and price, instead of re-entering dimensions from drawings.",
  },
  "/field-sync": {
    q: "How do I record site work with no network?",
    a: "Captures queue on the device and sync when connectivity returns, one by one, so a measurement taken in a basement is not lost and is not silently overwritten.",
  },
  "/material-prices": {
    q: "How much are materials being quoted in my market today?",
    a: "Each material shows the price, the date it was verified and where the number came from, so a budget is built on dated evidence rather than on a remembered figure.",
  },
  "/tall-building-structure": {
    q: "How much concrete and steel does a tall building need?",
    a: "Height, wind and seismic base shear select the lateral system: enter them to get the system, drift, raft thickness, pile schedule, quantities and a programme, as a screening check rather than a design.",
  },
};

/**
 * Tools whose honest answer is not a quantity. Kept explicit so a tool can
 * never end up with no question at all, and so nobody "fixes" the gap later by
 * inventing a how-many question the page cannot answer.
 *
 * @type {Record<string, string>}
 */
export const NOT_A_QUANTITY = {
  "/pricing": "a plan and pricing page, not a calculator",
  "/credits": "a credit balance page, not a calculator",
  "/marketplace": "a listing directory, not a calculator",
  "/faq": "a question index",
  "/learn": "an article index",
};

export const howManyFor = (path) => HOW_MANY[path] ?? null;

/** The visible question and answer, as HTML, for a tool page body. */
export function howManyHtml(path) {
  const entry = HOW_MANY[path];
  if (!entry) return "";
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  return `<h2>${esc(entry.q)}</h2><p>${esc(entry.a)}</p>`;
}

/** The same pair as a schema.org Question, for the page's FAQPage block. */
export function howManyFaq(path) {
  const entry = HOW_MANY[path];
  if (!entry) return null;
  return {
    "@type": "Question",
    name: entry.q,
    acceptedAnswer: { "@type": "Answer", text: entry.a },
  };
}
