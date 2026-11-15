/**
 * Renovation questions, grouped by the decision a person is actually making.
 *
 * Eleven groups instead of one, because "how much will my refurb cost" and
 * "how thick is the bed of mortar under these tiles" are answered by different
 * arithmetic and read by different people. Every group points at the same tool,
 * so the questions on the estimator and the article behind it cannot disagree.
 *
 * Nothing here quotes a price, a coverage rate or a tax rate. Those come from
 * the market the visitor selects.
 */

import type { ToolFaqGroup } from "@/config/tool-faqs";
import type { FaqArticle } from "@/config/faq-articles";

export const RENOVATION_FAQ_GROUPS: ToolFaqGroup[] = [
  {
    slug: "renovation-estimator",
    route: "/renovation-estimator",
    name: "Renovation cost estimator",
    category: "project",
    questions: [
      {
        q: "How does the renovation estimator measure a whole house?",
        a: "It measures room by room. For each room you enter the length, width and height, and the tool derives wall area net of openings, floor area, ceiling area and skirting length from those three figures. It then applies only the work you ticked in that room, so a bedroom with no plumbing carries no plumbing line.",
      },
      {
        q: "Can I use feet instead of metres?",
        a: "Yes. Rooms can be entered in metres or feet, and switching units converts what is already on screen so a room keeps its real size. The arithmetic is done in metres once, at the boundary, and every figure is reported with the unit it was measured in.",
      },
      {
        q: "Why does the total stay blank until I enter prices?",
        a: "Because a total built from guessed rates is worse than no total. Every line is a quantity with its unit and the arithmetic behind it. Until you enter a price for each line, the money stays empty and the line is listed as unpriced instead of shown as zero.",
      },
      {
        q: "Does the estimate include tax?",
        a: "No. Tax is returned as not determined, never as a default percentage. A rate that is right in one country is wrong in another, and a fabricated rate is how a quote becomes undefendable. Load a market rate and apply it to the subtotal yourself.",
      },
      {
        q: "What does it refuse to estimate?",
        a: "Statutory fees, structural design, asbestos removal, service connections and anything it cannot measure from your inputs. Those appear as named blockers or warnings instead of being buried in an allowance, so nothing silently disappears into a lump sum.",
      },
    ],
  },
  {
    slug: "renovation-strip-out",
    route: "/renovation-estimator",
    name: "Renovation strip out",
    category: "sitework",
    questions: [
      {
        q: "How much debris does stripping a room actually produce?",
        a: "More than the finished area suggests. Removing tiles takes the tiles plus the bed of adhesive or mortar under them, and removing plaster takes the coat plus some of the backing. The tool measures the finished surface, applies a thickness for the finish you say is there, then applies a bulking factor for the loose arisings.",
      },
      {
        q: "Why does the tool ask what the existing finish is?",
        a: "Because thickness and effort follow the finish, not the wall. Paint and wallpaper come off thin and leave a surface to prepare. Tiles and screed come off thick, add volume to the skip and leave a substrate that usually needs making good before anything new goes on.",
      },
      {
        q: "What happens if the building predates 2000?",
        a: "The estimate raises an asbestos survey warning. Asbestos containing materials were used in floor tiles, ceiling tiles, pipe lagging and cement sheet, and they are only identified by survey and testing. The tool flags the survey instead of pricing removal it cannot measure.",
      },
      {
        q: "Is demolition of a partition included?",
        a: "Only when you state it. Removing a wall carries debris, making good to the floor and ceiling, and usually a structural question about what is carrying the load above. The tool measures the debris and flags the structural check; it does not decide whether the wall is load bearing.",
      },
      {
        q: "How are skip or container loads worked out?",
        a: "From the loose volume of the arisings, including bulking, divided by the container size you enter. If you leave the container size empty the tool reports volume only, because container sizes differ by market and a guessed size would produce a confident wrong count.",
      },
    ],
  },
  {
    slug: "renovation-plastering",
    route: "/renovation-estimator",
    name: "Plaster and render in a renovation",
    category: "finishes",
    questions: [
      {
        q: "How thick is plaster, and why does it matter?",
        a: "Internal plaster is usually a backing coat plus a thin finish coat, around twelve to fifteen millimetres in total. The thickness matters because it sets how much cement and sand the job needs, and because a patch that thick changes the level of the wall against adjoining surfaces.",
      },
      {
        q: "Does the tool deduct doors and windows from plaster area?",
        a: "Yes. Wall area is the perimeter times height, less the openings you declare. Deducting openings is not cosmetic: a room with a wide window and a full height door loses several square metres, which is a bag of cement and a delivery trip on a small job.",
      },
      {
        q: "Can I plaster straight over paint or tiles?",
        a: "Not without preparation. Glossy paint needs a key or a bonding agent, and tiles normally come off before plaster goes on. The tool's strip out lines exist so the preparation is costed as its own work instead of assumed free inside the plaster line.",
      },
      {
        q: "How long does new plaster take to dry?",
        a: "Roughly a day per millimetre of thickness for the moisture to leave, and longer in cool humid weather without ventilation. Painting too early traps that moisture. The tool reports the plaster quantity; it leaves the programme decision to you and warns when a paint line sits on new plaster.",
      },
      {
        q: "What about corners, beads and reveals?",
        a: "They are linear work, not area. The tool reports the skirting run and the opening perimeters it measured so the trim, beads and edge work can be priced against a length instead of an area guess.",
      },
    ],
  },
  {
    slug: "renovation-screed",
    route: "/renovation-estimator",
    name: "Screed and floor levelling",
    category: "finishes",
    questions: [
      {
        q: "How is screed quantity calculated?",
        a: "Floor area times the thickness you specify, with a waste allowance for the edges and the levels. A screed is a volume job, so a ten millimetre difference in thickness on a large floor moves the cement and sand order by several bags.",
      },
      {
        q: "Bonded, unbonded or floating screed?",
        a: "Bonded screed is thin and sticks to the slab, unbonded sits on a separation layer and is thicker, and a floating screed sits over insulation. The tool measures the volume you ask for and states the thickness; choosing the type is a site decision that depends on the substrate and the build up.",
      },
      {
        q: "How long before I can lay tiles or flooring?",
        a: "Traditional sand and cement screed dries slowly, on the order of a millimetre a day, and thicker sections take longer. Laying a floor finish over damp screed traps moisture. The tool warns when a flooring line follows a new screed, because that is where failures come from.",
      },
      {
        q: "Do wet rooms need falls?",
        a: "Yes, and a level screed is the wrong answer in a bathroom or shower area. Falls to a drain are a designed gradient, not an average thickness, and the tool flags wet areas as needing a laid to fall detail instead of measuring a flat slab.",
      },
      {
        q: "Can screed replace the old floor build up?",
        a: "Only up to a point. Screed adds dead load, and on an upper floor that load has to be carried. The tool reports volume and thickness so the structural question is visible; it does not decide whether the slab can take the extra weight.",
      },
    ],
  },
  {
    slug: "renovation-tiling",
    route: "/renovation-estimator",
    name: "Tiling a renovated room",
    category: "finishes",
    questions: [
      {
        q: "How much tile waste should I allow?",
        a: "It depends on the pattern and the room shape, not on habit. A straight lay in a simple room wastes least, a diagonal or herringbone lay wastes more, and small rooms with many cuts waste more than large ones. The tool applies a layout waste it states, and reports the net area beside the buy area.",
      },
      {
        q: "Does the tool count adhesive and grout?",
        a: "It counts adhesive against the bought tile area using a coverage for the notch size, and grout against the joint width, tile size and thickness. Those are separate lines because they are bought separately and run out separately.",
      },
      {
        q: "Why does substrate flatness matter so much?",
        a: "Because tile and adhesive tolerances are tight. Standards for wall and floor tiling allow only a few millimetres out of level over a two metre straightedge. A wavy substrate needs levelling compound or a thicker adhesive bed, and either way it is work that has to be measured.",
      },
      {
        q: "Are wet areas treated differently?",
        a: "Yes. Shower and wet room floors need a waterproofing layer under the tile, and the wall junctions need to be detailed, not just tiled. The tool flags unmeasured waterproofing in wet areas instead of quietly including a token allowance.",
      },
      {
        q: "How do I price tiles I have already chosen?",
        a: "Enter the price per square metre or per box for the tile line, and use the bought area the tool reports so the order matches what you pay for. Do not price the net area: the difference is the waste you still have to buy.",
      },
    ],
  },
  {
    slug: "renovation-flooring",
    route: "/renovation-estimator",
    name: "Floor finishes in a renovation",
    category: "finishes",
    questions: [
      {
        q: "Does the estimator measure each room for flooring?",
        a: "Yes, room by room, and it does not merge rooms into one area. Separate rooms mean separate cuts, separate door thresholds and separate offcuts, which is why a house measured as one big rectangle comes up short on the order.",
      },
      {
        q: "What allowance does it make for fitting?",
        a: "It applies a layout waste to the floor finish so the buy quantity covers cuts and edges, and it reports the skirting run so the trim can be priced. Underlay, gripper, adhesive and thresholds are separate decisions and are not invented.",
      },
      {
        q: "Does the subfloor have to be dry?",
        a: "For most finishes, yes. Timber expands with moisture, vinyl adhesive releases, and laminate joints swell. The tool warns when a new floor finish sits over a new screed, because that sequence is the commonest cause of a floor failing in the first year.",
      },
      {
        q: "How are imperial rooms handled?",
        a: "Rooms entered in feet are converted to metres once and measured there, then reported back in the unit you used. The area you see is the area you measured, so a 12 by 10 foot room does not silently become a metric figure you cannot check.",
      },
      {
        q: "Is the old floor removed as part of the estimate?",
        a: "Only if you tick strip out for that room and state what is there. Taking up carpet is not the same job as taking up tiles on a mortar bed, and the tool measures the arisings from the finish you declare instead of from an average.",
      },
    ],
  },
  {
    slug: "renovation-ceilings",
    route: "/renovation-estimator",
    name: "Ceilings in a renovation",
    category: "finishes",
    questions: [
      {
        q: "How is ceiling area calculated?",
        a: "It is the room's plan area, length times width, with no deduction for light fittings. Ceiling work is measured flat, and the boarding, the jointing and the paint all follow that area, so the number is stated plainly instead of estimated from wall area.",
      },
      {
        q: "Which board should I use in a bathroom?",
        a: "A moisture resistant board, and in some cases a cement based board. Standard plasterboard softens in a wet room. The tool asks for the ceiling type and reports the area; the board choice is yours and it changes the price, not the quantity.",
      },
      {
        q: "Does a new ceiling mean I can hide cables and pipes?",
        a: "It gives you the chance, and it is the cheapest moment to do it. Dropped ceilings hide services but lose headroom and need access hatches at valves and junctions. The tool will measure the ceiling; it will not design the void.",
      },
      {
        q: "What about downlights and fire ratings?",
        a: "A hole in a fire rated ceiling weakens it unless the fitting is rated for that ceiling. The tool flags that the lighting layout is a design decision, and it does not add fittings you have not asked for.",
      },
      {
        q: "Are old ceilings removed?",
        a: "When you tick strip out for that room. Old lath and plaster ceilings are heavy and messy to remove, and some older boards contain asbestos, which is why a survey warning appears for buildings from before 2000.",
      },
    ],
  },
  {
    slug: "renovation-repaint",
    route: "/renovation-estimator",
    name: "Repainting after renovation",
    category: "finishes",
    questions: [
      {
        q: "Why does new plaster need less paint than a repaint?",
        a: "Because absorption and surface texture change how much paint the wall drinks. Fresh plaster takes a sealing mist coat and then finishes tight, while a previously painted wall often needs less on the first coat but more on textured or patched areas. The tool uses a surface factor instead of one flat coverage rate.",
      },
      {
        q: "How many coats should I allow?",
        a: "Two is normal over a prepared surface, three over a strong colour change or a repaired wall. You state the coats and the tool multiplies. It also warns when a coat count looks implausible for the work described, instead of silently using it.",
      },
      {
        q: "Does it include filling and sanding?",
        a: "Preparation follows from strip out and making good, which are their own lines. Painting over filler dust or a glossy patch fails. The tool measures paint; if you need filling and sanding priced, that is a making good line and it should be measured, not assumed.",
      },
      {
        q: "Are ceilings and walls priced the same?",
        a: "They are measured separately because they are different surfaces with different access. A ceiling is worked overhead, which is slower, and its area is often larger than people expect in a small room.",
      },
      {
        q: "What about doors, trim and skirting?",
        a: "They are linear and unit work, not wall area. The tool reports the skirting length and door count it measured so trim paint can be priced against a length and a number, instead of a percentage of the wall.",
      },
    ],
  },
  {
    slug: "renovation-electrical-points",
    route: "/renovation-estimator",
    name: "Power and lighting points in a renovation",
    category: "services",
    questions: [
      {
        q: "How are electrical points counted?",
        a: "As points, one by one, per room. A socket, a switch, a light and a data outlet are each a point with its own cable run, box and termination. Counting points is honest; counting rooms as a lump is how an electrical quote goes wrong.",
      },
      {
        q: "Does the tool design the circuit?",
        a: "No. It measures the points you ask for. Cable sizing, circuit arrangement, protective device ratings and earthing are design decisions that belong to a competent electrician working to the wiring regulations of the country, and they are certified, not estimated.",
      },
      {
        q: "First fix or second fix?",
        a: "Both are needed and they happen at different times. First fix is chasing, boxes and cable before the walls are closed; second fix is fittings after decoration. The tool measures the work from the point count and the stage you are at.",
      },
      {
        q: "Are chases and making good included?",
        a: "Chasing into plaster or block produces dust and debris and leaves a channel to fill. The tool names chase patching as unmeasured instead of burying it in the point price, so you can see the gap and price it deliberately.",
      },
      {
        q: "Is testing and certification included?",
        a: "It is named as a requirement, not priced. A completion certificate and test results are part of the job and are the electrician's responsibility, and no quantity of cable substitutes for them.",
      },
    ],
  },
  {
    slug: "renovation-plumbing-points",
    route: "/renovation-estimator",
    name: "Plumbing points in a renovation",
    category: "services",
    questions: [
      {
        q: "What counts as a plumbing point?",
        a: "A fitting that needs a water supply or a waste connection: a basin, a WC, a bath, a shower, a sink, a washing machine point or an outside tap. Each has its own supply, its own waste and its own isolation, so each is counted separately.",
      },
      {
        q: "Does the estimate include pipe runs and falls?",
        a: "It counts points and states that runs are not measured. A waste run needs a fall, and a fall needs length, which depends on where the stack is in your building. That is a site measurement, and the tool flags it instead of guessing a length.",
      },
      {
        q: "Why does moving a bathroom cost more than refitting one?",
        a: "Because moving a point moves the supply, the waste and often the falls. A refit keeps the positions and changes the fittings; a move turns a joinery job into a drainage job, and drainage is where the cost and the risk sit.",
      },
      {
        q: "Are waterproofing and tanking included?",
        a: "They are flagged in wet areas, not measured, because the area depends on the shower type and the floor build up. Tanking is cheap done with the strip out and expensive done after a leak, so it is named where it belongs.",
      },
      {
        q: "Is pressure testing and commissioning included?",
        a: "It is named as a requirement. A renovated system needs to be proved before it is closed up, and that proof is a test with a result, not a quantity the tool can derive from your room sizes.",
      },
    ],
  },
  {
    slug: "renovation-waste",
    route: "/renovation-estimator",
    name: "Renovation arisings and waste",
    category: "sitework",
    questions: [
      {
        q: "How is renovation waste measured?",
        a: "As a loose volume from the finishes you remove, with a bulking factor applied because stripped material takes more space than it did in place. Tiles, screed, plaster and timber each produce a different volume for the same wall area.",
      },
      {
        q: "Why does bulking matter?",
        a: "Because a container is priced by its volume, not by the wall you took down. Loose arisings occupy noticeably more space than the compacted material, and ignoring bulking is why a skip that looked generous is full by lunchtime.",
      },
      {
        q: "What waste cannot go in a general container?",
        a: "Asbestos containing material, lead painted items, aerosols, solvents and some sealants. Those are hazardous and need separate handling by a licensed carrier. The tool names them and does not price them.",
      },
      {
        q: "Does the tool include the carrier's charges?",
        a: "No. It reports volume and container loads. Disposal charges, permits and landfill taxes differ by council and by country, and they are entered by you against a real quote instead of invented.",
      },
      {
        q: "Can I reduce the volume?",
        a: "Sometimes. Segregating timber, metal and rubble allows some of it to be recycled or sold, and crushing rubble on site reduces loads on a large job. That is a site plan decision, and the tool leaves the volume and the container count visible so the saving can be measured.",
      },
    ],
  },
];

export const RENOVATION_FAQ_ARTICLES: Record<string, FaqArticle> = {
  "renovation-estimator": {
    summary:
      "Measures a refurbishment room by room and prices it at your own rates.",
    description:
      "A renovation estimate goes wrong at the measuring stage, not the pricing stage. This tool measures each room from its dimensions, applies only the work you state, and reports every quantity with the arithmetic behind it.",
    functions: [
      "Derives wall area net of openings, floor area, ceiling area and skirting length from each room's dimensions.",
      "Applies strip out, plaster, screed, tiling, flooring, ceilings, paint, power points and plumbing points only where you ticked them.",
      "Measures arisings from the finish you declare and turns them into container loads at the size you enter.",
      "Prices each line at your own supplier rate and leaves tax as not determined.",
    ],
    advantages: [
      "Every quantity can be defended line by line when a client asks how it was reached.",
      "Empty fields are reported as missing, never measured as zero.",
      "The same takeoff works in metres or feet without a second calculation.",
    ],
    limits: [
      "Statutory fees, structural design and asbestos removal are flagged, not priced.",
      "Pipe runs, cable routes and waterproofing areas need site measurement.",
      "No tax rate is applied: tax stays undetermined until a market rate is loaded.",
    ],
  },
  "renovation-strip-out": {
    summary:
      "Measures what comes out, including the bed of mortar nobody counts.",
    description:
      "Strip out is where a refurbishment estimate is usually too low. The finished area is not the volume removed, because tiles come with adhesive, screed comes with its thickness, and loose arisings take more space than the material did in place.",
    functions: [
      "Applies a thickness per finish so tiles, screed, plaster and timber each produce their own volume.",
      "Applies a bulking factor to the arisings before any container is counted.",
      "Flags an asbestos survey when the building predates 2000.",
      "Names partitions, structural walls and making good as separate work instead of absorbed lines.",
    ],
    advantages: [
      "Container counts follow from volume instead of habit.",
      "The difference between removing paint and removing tiles is visible in the quantity.",
      "Hazardous material is named so it can be quoted properly.",
    ],
    limits: [
      "Wall thicknesses and build ups are assumptions unless you state them.",
      "Whether a wall is load bearing is a structural question, not an estimating one.",
      "Disposal charges and permits come from your supplier, not from the tool.",
    ],
  },
  "renovation-plastering": {
    summary:
      "Measures plaster and render on the net wall area, openings deducted.",
    description:
      "Plaster is ordered by area and by thickness, and both are easy to overstate. The tool measures the wall, deducts the openings you declare, and reports the run lengths that trim and beading are priced against.",
    functions: [
      "Computes wall area from perimeter and height, less declared openings.",
      "Expands a stated thickness into cement and sand using the same site ratios the other FRELUX engines use.",
      "Reports skirting length and opening perimeters as linear work.",
      "Warns when a paint line sits directly on new plaster.",
    ],
    advantages: [
      "Openings are deducted, which on a small job is a real saving in material.",
      "Trim and beads are priced against measured lengths.",
      "The drying implication of new plaster is stated before the programme is set.",
    ],
    limits: [
      "Patches and remedial work are measured as area, not as difficulty.",
      "Substrate condition and preparation come from the strip out lines you tick.",
      "Scaffolding and access are separate items.",
    ],
  },
  "renovation-screed": {
    summary:
      "Turns floor area and thickness into a screed volume you can order.",
    description:
      "A screed is a volume, not an area. The tool multiplies the floor area by the thickness you specify and states both, so a change of ten millimetres shows up in the order before it shows up on site.",
    functions: [
      "Measures floor area per room and multiplies by the stated screed thickness.",
      "Reports cement and sand from the volume at the site ratio in use.",
      "Warns when a floor finish follows a new screed, because drying takes time.",
      "Flags wet areas as needing a laid to fall detail instead of a flat slab.",
    ],
    advantages: [
      "Thickness is an input, so the consequence of a deeper screed is immediate.",
      "Wet room falls are named instead of averaged away.",
      "Volume and area are both shown, which is the figure a supplier asks for.",
    ],
    limits: [
      "Screed type is a site decision, not something the tool selects for you.",
      "Added dead load on an upper floor still needs a structural view.",
      "Drying time is stated as an order of magnitude, not as a programme.",
    ],
  },
  "renovation-tiling": {
    summary: "Measures tile, adhesive and grout on the area you actually buy.",
    description:
      "Tiling estimates fail on waste and on adhesive. The tool separates the net area from the buy area, states the layout waste it applied, and prices adhesive against the area you purchase.",
    functions: [
      "Reports net tiled area and the buy area after layout waste, per room and per surface.",
      "Computes adhesive from the buy area and the coverage for the notch in use.",
      "Computes grout from tile size, joint width and tile thickness.",
      "Flags wet areas where waterproofing is required but not measured.",
    ],
    advantages: [
      "Waste is stated so it cannot be applied twice.",
      "Adhesive and grout are separate lines, as they are on a supplier invoice.",
      "Wall and floor tiling are measured separately because they are different jobs.",
    ],
    limits: [
      "Substrate flatness and any levelling compound are separate measured work.",
      "Tile patterns are allowed for as a percentage, not laid out tile by tile.",
      "Movement joints and trims are linear items you price from the lengths shown.",
    ],
  },
  "renovation-flooring": {
    summary: "Measures each room separately so cuts and offcuts are covered.",
    description:
      "Floors are bought by area and laid by room. The tool measures each room on its own and applies a layout waste, because a house measured as one rectangle always comes up short at the doorways.",
    functions: [
      "Reports floor area per room and in total, in the unit the room was entered in.",
      "Applies a layout waste to the finish so the buy area covers cuts and edges.",
      "Reports skirting run so trim can be priced from a length.",
      "Warns when a new finish sits over a new screed.",
    ],
    advantages: [
      "Rooms stay separate, so thresholds and offcuts are visible.",
      "Imperial rooms are measured in metres internally and reported back in feet.",
      "Underlay and adhesive are not invented; they are yours to add.",
    ],
    limits: [
      "Subfloor moisture and flatness are checks you carry out, not figures the tool derives.",
      "Acclimatisation time for timber is a programme decision.",
      "Furniture lifting, protection and access are separate site costs.",
    ],
  },
  "renovation-ceilings": {
    summary:
      "Measures ceiling area flat, with the wet area and fire questions named.",
    description:
      "Ceiling work is measured as plan area, because that is what gets boarded, jointed and painted. The tool reports it plainly and names the two decisions that change the price instead of the quantity: board type and fittings.",
    functions: [
      "Reports ceiling area per room from length times width.",
      "Raises the moisture resistant board question in bathrooms and wet rooms.",
      "Names fire rated ceilings where downlights are being added.",
      "Counts old ceiling removal as strip out when you tick it.",
    ],
    advantages: [
      "Boarding and painting are measured on the same area, so the two trades agree.",
      "Wet rooms are flagged instead of treated as ordinary rooms.",
      "Removal is a separate measured line with its own arisings.",
    ],
    limits: [
      "Dropped ceiling voids, bulkheads and cove details are not measured.",
      "Access hatches and their positions are a design decision.",
      "Lighting layout and fire rating certification are not provided.",
    ],
  },
  "renovation-repaint": {
    summary:
      "Applies a surface factor to paint so absorption is not treated as flat coverage.",
    description:
      "The same wall drinks different amounts of paint depending on what is on it. Fresh plaster takes a sealing coat, a sealed repaint takes less, and textured surfaces take more. The tool uses a surface factor instead of one coverage figure for everything.",
    functions: [
      "Computes paint litres from the measured area, the stated coats and a per surface factor.",
      "Reports walls and ceilings separately because access differs.",
      "Warns when a coat count looks implausible for the work described.",
      "Names filling and sanding as making good instead of folding them into paint.",
    ],
    advantages: [
      "New plaster and repaint are not priced as the same surface.",
      "The saving from a sealed surface is stated in plain words.",
      "Ceilings are measured on their own area, not a percentage of walls.",
    ],
    limits: [
      "Colour changes and stain blocking may need extra coats not described here.",
      "Preparation quality is assumed to be adequate once making good is priced.",
      "Spray versus brush application is a labour choice, not a quantity.",
    ],
  },
  "renovation-electrical-points": {
    summary: "Counts points per room and names the design work it will not do.",
    description:
      "Electrical cost follows points, cable runs and certification. The tool counts the points you ask for per room and is explicit that circuit design, cable sizing and testing belong to a competent electrician.",
    functions: [
      "Counts sockets, switches, lights and data outlets as separate points per room.",
      "Separates first fix from second fix in the way the work is sequenced.",
      "Names chase patching as unmeasured instead of absorbing it into a point price.",
      "States that testing and certification are required but not priced.",
    ],
    advantages: [
      "Point counts are visible, so a quote can be checked against the plan.",
      "The gap between first and second fix is clear before work starts.",
      "No cable quantity is invented from a room size.",
    ],
    limits: [
      "Circuit design, protective devices and earthing are not provided.",
      "Cable routes and chase lengths need site measurement.",
      "Certification and inspection are the electrician's responsibility.",
    ],
  },
  "renovation-plumbing-points": {
    summary:
      "Counts supply and waste points and flags the runs it cannot measure.",
    description:
      "A plumbing point is a fitting with a supply and a waste, and the cost of moving one is mostly in the waste. The tool counts points per room and names the pipe runs, falls and tanking that need site measurement.",
    functions: [
      "Counts basins, WCs, baths, showers, sinks and machine points separately per room.",
      "Flags wet areas where waterproofing is required but not measured.",
      "Names pipe runs, falls and pressure testing as separate requirements.",
      "Reports the room count and point count so labour can be discussed against a real figure.",
    ],
    advantages: [
      "Moving a point is visibly different from replacing a fitting.",
      "Tanking is named at the stage where it is cheap to do.",
      "No pipe length is invented from a floor plan.",
    ],
    limits: [
      "Drainage design, stack positions and falls are not calculated.",
      "Pressure testing and commissioning are requirements, not quantities.",
      "Hot water system sizing is outside this tool.",
    ],
  },
  "renovation-waste": {
    summary:
      "Turns stripped finishes into a loose volume and a container count.",
    description:
      "Waste is the line most often absent from a refurbishment quote and most often paid for at the end. The tool converts what you strip into a loose volume with bulking, then into containers at the size you enter.",
    functions: [
      "Applies a thickness per removed finish to produce a volume.",
      "Applies a bulking factor before any container is counted.",
      "Reports container loads at the size you state, or volume only if you state none.",
      "Names hazardous waste that cannot go in a general container.",
    ],
    advantages: [
      "The container count is derived, not guessed.",
      "Hazardous material is separated so it can be quoted correctly.",
      "Segregation and recycling can be planned against a real volume.",
    ],
    limits: [
      "Disposal charges, permits and landfill taxes are yours to enter.",
      "Licensed carrier requirements vary by country and are not listed here.",
      "Reuse and recycling rates are a site plan, not a tool output.",
    ],
  },
};
