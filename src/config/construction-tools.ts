import type { LucideIcon } from "lucide-react";
import {
  Paintbrush,
  Square,
  Layers,
  Grid3x3,
  Building2,
  Footprints,
  Umbrella,
  Droplets,
  Landmark,
  BrickWall,
  Blinds,
  Cable,
  Zap,
  ShowerHead,
  Sun,
  Plug,
  Thermometer,
  DoorOpen,
  Ruler,
  Hammer,
  BarChart3,
  ListChecks,
  Users,
  Percent,
  Wallet,
  Globe,
  Globe2,
  LineChart,
  BookOpenCheck,
  CalendarDays,
  Wrench,
  ShieldCheck,
  BadgeCheck,
  Camera,
  Brain,
  MessageCircle,
  ScanLine,
  Palette,
  Eye,
  ClipboardCheck,
  RefreshCw,
  Box,
  CloudOff,
  Tags,
  FileText,
  Leaf,
  Recycle,
  Stethoscope,
} from "lucide-react";

/**
 * FRELUX Construction Tools registry.
 *
 * The single authoritative catalogue of user-facing tools. The public
 * Construction Tools page, the navbar dropdown and FRELUX search all
 * read from this registry so there is exactly one place where a tool is
 * named, described and categorised.
 *
 * Copy rules (Part 3 of the IA restructure):
 * - "does" answers WHAT IT DOES in one plain sentence.
 * - "enters" answers WHAT YOU NEED TO ENTER.
 * - "gets" answers WHAT IT CALCULATES.
 * - No technical/engine wording for users. Internally these all run
 *   deterministic calculation engines; the calculator/estimator split is
 *   an implementation detail that must not leak into user-facing copy.
 */

export type ToolCategoryId =
  | "finishes"
  | "structure"
  | "services"
  | "components"
  | "interiors"
  | "project"
  | "ai"
  | "pro";

export interface ToolCategory {
  id: ToolCategoryId;
  label: string;
  blurb: string;
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "finishes",
    label: "Materials & Finishes",
    blurb:
      "Paint, screeding, tiling, flooring, waterproofing and ceiling finishes.",
  },
  {
    id: "structure",
    label: "Building Structure",
    blurb:
      "Blockwork, concrete, foundations, reinforcement and the full build-to-roof scope.",
  },
  {
    id: "services",
    label: "Building Services",
    blurb: "Electrical, plumbing, solar, backup power and indoor comfort.",
  },
  {
    id: "components",
    label: "Building Components",
    blurb: "Doors, windows and other configurable components.",
  },
  {
    id: "interiors",
    label: "Home Decor",
    blurb:
      "Wallpaper, interior finishes, TV consoles, media units, window treatments and blinds.",
  },
  {
    id: "project",
    label: "Project & Cost",
    blurb: "Budgets, BOQs, labour, timelines and long-term cost planning.",
  },
  {
    id: "ai",
    label: "AI Assistants",
    // Only surfaces that call a model belong here. The conversational
    // estimator, surface assessment and estimate refresh parse or calculate
    // locally and sit with the work they do, because filing a dropdown with a
    // rule table under "AI Assistants" told visitors they were paying for a
    // model that never ran.
    blurb:
      "Assistants that read a photo, a plan or a description with a model, then hand the numbers to the same engines.",
  },
  {
    id: "pro",
    label: "Pro & Field",
    blurb: "Tools for professionals working on site with plans and projects.",
  },
];

export interface Tool {
  slug: string;
  title: string;
  category: ToolCategoryId;
  icon: LucideIcon;
  does: string;
  enters: string;
  gets: string;
  to: string;
  benefit?: string;
  featured?: boolean;
  /**
   * The page's own heading, where the navbar label has to stay short. The
   * navbar reads `title`; a tool page reads `heading` and falls back to it. A
   * crew estimator is labelled "Labour Cost" in a menu and named in full on its
   * own page, and both are true at once.
   */
  heading?: string;
  /** The line under the page heading, where `does` is written for a listing. */
  lede?: string;
  /** The small label above the heading, where the category label is too broad. */
  eyebrow?: string;
  /** Visible on the navbar mega-menu (popular tools only). */
  navVisible?: boolean;
  /**
   * Search listing copy, when the registry name is not what people type.
   * Both fields are optional: without them the listing is composed from `title`,
   * `benefit` and `does` (see scripts/lib/tool-seo.mjs). Only set them where a
   * real query term is missing from the name, never to stuff keywords.
   */
  seoTitle?: string;
  seoDescription?: string;
  /**
   * Markets where this tool's trade vocabulary is the local one.
   *
   * Absent means the tool is offered everywhere. Set it only where the method
   * itself is regional, such as POP ceiling or Tyrolene finishes, so a US or
   * German visitor is not handed a Nigerian trade term and left to guess what
   * it means. A blank or unknown market still sees the full catalogue: hiding
   * tools from a market we have no profile for would be the same region-locked
   * assumption in the other direction.
   */
  markets?: string[];
}

export const CONSTRUCTION_TOOLS: Tool[] = [
  {
    slug: "measurement-converter",
    title: "Measurement Converter",
    category: "pro",
    icon: Ruler,
    does: "Convert any unit a drawing, data sheet or supplier hands you: feet and inches, plots and acres, tonnes and bags, MPa and psi, kN and tonnes-force, kWh and BTU, kW and horsepower, L/min and gpm, and Celsius and Fahrenheit.",
    enters:
      "A number and the unit it arrived in, such as a tape reading in feet and inches, a mix strength in MPa, a pump rate in L/min, or a curing temperature in Celsius.",
    gets: "The same measurement in the unit you need, with the method, the exact ratio and any depth, density or bag weight the answer depends on stated above the result.",
    heading: "Construction Measurement Converter",
    lede: "Convert common metric and imperial measurements for construction, from feet and inches to square metres, cubic yards and tonnes. See the conversion method, and supply depth, density or bag weight when a result depends on it.",
    eyebrow: "Free construction tool",
    seoTitle: "Unit Converter: Feet, Metres, Tonnes, Bags | FRELUX",
    seoDescription:
      "Convert feet to metres, plots to square metres, tonnes and 50 kg bags, litres and buckets. Every conversion factor is exact and each assumption is stated.",
    to: "/unit-converter",
    benefit: "Plots · MPa · Tonnes · °C",
    navVisible: true,
  },
  // ---------------------------------------------------------------- finishes
  {
    slug: "german-floor",
    title: "German Floor Calculator",
    category: "structure",
    icon: Layers,
    does: "Work out the hardcore, blinding, membrane and slab concrete for a ground floor.",
    enters:
      "The floor size or plot, the hardcore depth, the slab thickness and the concrete mix.",
    gets: "Bags of cement, sharp sand and granite in cubic metres and tipper trips, the hardcore and blinding volumes, and the membrane area.",
    heading: "German Floor Calculator",
    lede: "Hardcore, blinding, membrane and slab concrete for a ground floor. Quantities only, worked out from the layer thicknesses you set.",
    eyebrow: "Concrete",
    to: "/german-floor-calculator",
    benefit: "Cement · Granite · Hardcore",
    seoTitle:
      "German Floor Calculator: Cement, Sand and Granite Quantities | FRELUX",
    seoDescription:
      "Calculate cement bags, sharp sand, granite, hardcore and membrane for a German floor or ground slab. Pick the plot, slab thickness and mix and see every quantity with its assumptions.",
    navVisible: true,
  },
  {
    slug: "fence-block",
    title: "Fence Block Calculator",
    category: "structure",
    icon: BrickWall,
    does: "Work out the blocks, cement and sand a perimeter fence needs from the plot size, the coaches high and the block size.",
    enters:
      "The plot or site size, how many coaches high the wall is, and whether you are building with a 9 inch or 6 inch block.",
    gets: "Blocks with a breakage allowance, 50 kg bags of cement, and sharp sand in cubic metres, tipper trips, barrows and head pans.",
    heading: "Fence and Coach Block Calculator",
    lede: "Enter the plot size, how many coaches high the wall is and the block you are using. Every quantity is calculated from the wall geometry and stated with its assumptions.",
    eyebrow: "Blockwork",
    to: "/fence-block-calculator",
    benefit: "Coaches · Trips · Blocks",
    seoTitle:
      "Fence Block Calculator: Coaches, Blocks, Cement and Sand | FRELUX",
    seoDescription:
      "Calculate blocks, cement bags and trips of sharp sand for a perimeter fence. Enter the plot size, the coaches high and the block size for a Nigeria aware quantity take off.",
    navVisible: true,
  },
  {
    slug: "window-blinds",
    title: "Window blind cost calculator",
    category: "interiors",
    icon: Blinds,
    does: "Price window blinds from the measured opening, with waste, the minimum charge per window and fitting.",
    enters:
      "The measured width and drop of the opening, the blind type, and how many windows are the same size.",
    gets: "The price per window and the total before tax, with the waste allowance, minimum charge and fitting shown separately.",
    heading: "Window blind estimator",
    lede: "List every opening, pick the type and grade, and see the price per window and for the whole job before a shop quotes you.",
    eyebrow: "Home Decor",
    seoTitle:
      "Window Blind Calculator: Cost per Window and per Square Metre | FRELUX",
    seoDescription:
      "Price a whole schedule of roller, zebra, day and night, vertical, venetian, roman, faux wood and wooden blinds from the measured openings, with waste, minimum charge per window, grade and fitting.",
    to: "/window-blind-calculator",
    benefit: "Per window · Per m2 · Before tax",
    navVisible: true,
  },
  {
    slug: "tv-console-calculator",
    title: "TV Console & Media Unit Calculator",
    category: "interiors",
    icon: Ruler,
    does: "Explore ten TV-console concepts, adjust dimensions and estimate a panel-by-panel preliminary material takeoff.",
    enters:
      "A concept, cabinet and panel dimensions, optional shelves, dividers, back and doors, sheet size, allowance, and a locally quoted sheet price.",
    gets: "A transparent rectangular-panel schedule and area-based sheet lower-bound, not a cut-optimized list or safety design.",
    heading: "TV Console & Media Unit Calculator",
    lede: "Choose a concept, set the carcass details, and see the panel arithmetic, the packed sheet count, edge banding, hardware and a full cost roll-up from your own rates. Planning estimate, not a cut list.",
    eyebrow: "Home decor · panel, sheet and cost takeoff",
    seoTitle: "TV Console Material Calculator: Panels, Sheets & Cost | FRELUX",
    seoDescription:
      "Calculate TV console and media unit panel areas, packed sheet counts, edge banding, hardware, workshop, finishing and installation cost, with a transparent panel-by-panel schedule.",
    to: "/tv-console-calculator",
    benefit:
      "10 editable concepts · panel-by-panel schedule · Pro image parsing",
    navVisible: true,
  },
  {
    slug: "wallpaper",
    title: "Wallpaper Calculator",
    category: "interiors",
    icon: Blinds,
    does: "Estimate wallpaper rolls, adhesive packs and an optional installation budget from measured wall drops.",
    enters:
      "Wall dimensions, openings, roll size, pattern repeat and your local material and labour quotes.",
    gets: "Net wall area, a full-drop roll estimate, a wall-strip diagram and a clearly itemized planning budget.",
    heading: "Wallpaper Calculator",
    lede: "Plan wallpaper rolls from measured walls, real roll dimensions and pattern allowances. Add your local supplier and fitting quotes for a project budget.",
    eyebrow: "Wall finishes · Quantity & budget",
    seoTitle:
      "Wallpaper Calculator: Rolls, Materials & Installation Budget | FRELUX",
    seoDescription:
      "Estimate wallpaper rolls and mural panels from global product dimensions, measured walls, pattern matches and trimming allowance. Review an accessible wall diagram, materials, adhesive and local quotes.",
    to: "/wallpaper-calculator",
    benefit: "Rolls · Pattern · Budget",
    navVisible: true,
  },
  {
    slug: "paint",
    title: "Paint Calculator",
    category: "finishes",
    icon: Paintbrush,
    does: "Calculate paint quantities, material cost and a full project estimate for any room, house, exterior or fence.",
    enters:
      "Room or wall dimensions, doors and windows, paint type, coats and surface condition.",
    gets: "Exact buckets to buy (walls and ceiling separately), material cost and a shareable estimate.",
    heading: "Painting Calculator",
    lede: "Calculate paint quantities, painting requirements, and estimated costs, all in one place.",
    eyebrow: "Calculator",
    seoTitle: "Painting Calculator: Buckets, Coats and Cost | FRELUX",
    seoDescription:
      "Work out paint quantities, coats, primer and cost from your measured wall and ceiling areas, with coverage and wastage stated for each coat, in the pack sizes the market sells.",
    to: "/paint-calculator",
    benefit: "Buckets · Cost · Project estimate",
    featured: true,
    navVisible: true,
  },
  {
    slug: "paint-comparison",
    title: "Paint Comparison",
    category: "finishes",
    icon: Tags,
    does: "Compare paint products head-to-head on coverage, price and suitability for your project.",
    enters: "Your wall area and the products you want to compare.",
    gets: "Total cost per product so you can pick the best value paint.",
    heading: "Paint Comparison Tool",
    eyebrow: "Tools",
    seoTitle: "Paint Comparison Tool: Matt vs Satin vs Emulsion",
    seoDescription:
      "Compare paint types side by side. See differences in finish, durability, washability, recommended use, and price range to choose the right paint for your project.",
    to: "/paint-comparison",
    navVisible: true,
  },
  {
    slug: "screeding",
    title: "Wall Screeding",
    category: "finishes",
    icon: Square,
    does: "Calculate screeding material quantities and cost for smooth wall finishes.",
    enters: "Wall area and thickness, or room dimensions.",
    gets: "Bags of screeding, putty and finishing materials with total cost.",
    heading: "Screeding Calculator",
    lede: "Calculate wall surface area for fine wall finishes and estimate materials and costs where market configuration is available.",
    to: "/screeding-calculator",
    benefit: "Quantity & cost",
    navVisible: true,
    seoTitle: "Screeding Calculator, Wall Screeding Quantity & Cost",
    seoDescription:
      "Free FRELUX screeding calculator. Calculate wall screeding surface area in m², material requirements, and cost estimates with verified material prices.",
  },
  {
    slug: "finish",
    title: "Finish Comparison",
    category: "finishes",
    icon: Building2,
    does: "Compare painting, Tyrolene and Grafitex finishes side by side for the same walls.",
    enters: "Wall area and the finishes you are considering.",
    gets: "Material quantities and total cost per finish, so you can choose confidently.",
    heading: "Finishing Calculator",
    lede: "Compare wall finishes and calculate Tyrolene material quantities, all in one place.",
    eyebrow: "Calculator",
    seoTitle: "Finishing Calculator, Tyrolene, Grafitex & Painting Finishes",
    seoDescription:
      "Free FRELUX finishing calculator. Compare Painting, Tyrolene, and Grafitex finishes. Detailed Tyrolene estimator with partition-based material calculations.",
    to: "/finish-estimator",
    benefit: "Tyrolene · Grafitex",
    // Tyrolene and Grafitex are Nigerian decorative finishes; outside the
    // region the same calculator is offered as plaster and paint.
    markets: ["NG", "GH"],
    navVisible: true,
  },
  {
    slug: "pop-ceiling",
    title: "POP Ceiling",
    category: "finishes",
    icon: Layers,
    does: "Calculate POP cement, fibreglass mesh and cost for board, cornice or full designs.",
    enters: "Room dimensions and your POP design type.",
    gets: "Material breakdown (cement, mesh, boards) and total cost estimate.",
    heading: "POP Ceiling Calculator",
    eyebrow: "Calculator",
    seoTitle: "POP Ceiling Calculator, Material Quantity & Cost Estimate",
    seoDescription:
      "Free FRELUX POP ceiling calculator. Calculate POP cement, fibreglass mesh, and material quantities. Get a full cost estimate with verified material prices.",
    to: "/pop-ceiling-calculator",
    benefit: "Materials & cost",
    // POP is the West African plasterboard ceiling trade. A US visitor calls
    // the same work drywall ceiling and buys sheets in square feet, so the
    // term would mislead rather than help.
    markets: ["NG", "GH", "KE"],
    navVisible: true,
  },
  {
    slug: "tile",
    title: "Tile Calculator",
    category: "finishes",
    icon: Grid3x3,
    does: "Calculate tile quantity, boxes, adhesive and grout for any floor or wall.",
    enters: "Floor or wall area, tile size and pattern (including waste).",
    gets: "Exact tile boxes, adhesive and grout bags, plus total cost.",
    heading: "Tile Calculator",
    lede: "Calculate tile quantity, boxes, waste, adhesive, grout, and cost, all in one place.",
    eyebrow: "Calculator",
    seoTitle: "Tile Calculator, Tile Quantity, Boxes & Cost Estimate",
    seoDescription:
      "Free FRELUX tile calculator. Calculate tile quantity, boxes, adhesive, grout, and full installation cost with verified material prices.",
    to: "/tile-calculator",
    benefit: "Boxes · Adhesive · Cost",
    navVisible: true,
  },
  {
    slug: "increte-flooring-calculator",
    title: "Decorative Concrete Flooring",
    category: "finishes",
    icon: Footprints,
    does: "Estimate decorative concrete flooring quantities and costs from product coverage, local prices and project measurements.",
    enters:
      "Market, floor dimensions, decorative system, product coverage, coats, waste and local prices.",
    gets: "Surface area, optional concrete volume, package counts, itemized costs and missing-data warnings.",
    heading: "Increte Flooring Calculator & Estimator",
    lede: "Build a transparent quantity and cost estimate for decorative concrete systems. Market presence is not a claim that products, rates or standards are verified.",
    seoTitle: "Increte Flooring Calculator & Estimator | FRELUX",
    seoDescription:
      "Estimate decorative concrete flooring quantities using explicit product coverage, coats, waste, local prices and installation inputs. Missing market data is clearly identified.",
    to: "/increte-flooring-calculator",
    benefit: "Stamped · Overlay · Sealer",
    navVisible: true,
  },
  {
    slug: "flooring",
    title: "Flooring",
    category: "finishes",
    icon: Footprints,
    does: "Compare and calculate laminate, vinyl and other flooring options.",
    enters: "Room area and flooring type.",
    gets: "Material packs, underlay and installation cost.",
    heading: "Flooring Estimator",
    lede: "Enter your measured floor area and skirting run. The engine sizes laminate packs, vinyl or parquet m², underlay, adhesive and skirting with the visible coverage, pack-size and waste rules. Estimation only: not a flooring specification.",
    seoTitle:
      "Flooring Estimator: Laminate, Vinyl, Parquet, Underlay & Skirting | FRELUX",
    seoDescription:
      "Deterministic flooring material estimation: enter your floor area and skirting run and get laminate packs, vinyl or parquet m², underlay, adhesive and skirting quantities with pack coverage and waste shown in the breakdown. Estimation only: not a flooring specification.",
    to: "/flooring",
    navVisible: true,
  },
  {
    slug: "waterproofing",
    title: "Waterproofing",
    category: "finishes",
    icon: Umbrella,
    does: "Calculate waterproofing membranes and coatings for roofs, bathrooms and tanks.",
    enters: "Area to waterproof and the waterproofing system.",
    gets: "Membrane rolls, coating litres and total cost.",
    heading: "Waterproofing Estimator",
    lede: "Enter your measured DPC run, DPM area, wet-area surfaces and terrace area. The engine sizes DPC, DPM, coating, membrane and tape from your measurements with the visible coats, coverage, waste and overlap rules. Estimation only: not waterproofing design.",
    eyebrow: "Waterproofing",
    seoTitle: "Waterproofing Estimator: DPC, DPM, Membrane and Tape | FRELUX",
    seoDescription:
      "Size DPC, DPM, liquid coating, membrane and tape from your measured run, wet areas and terrace, with coats, coverage and overlap stated.",
    to: "/waterproofing",
    navVisible: true,
  },
  {
    slug: "wall-finish-estimator",
    title: "Wall Finish Estimator",
    category: "finishes",
    icon: Paintbrush,
    does: "Plan walls from structure to the final coat, worldwide: render, plaster, putty, primer and paint in your country's standard sequence.",
    enters: "Country, rooms with dimensions, doors and windows.",
    gets: "Layer-by-layer material quantities, labour and total cost with full calculation transparency.",
    heading: "Wall Finish Estimator",
    seoTitle:
      "Wall Finish Estimator: country-aware wall finishing quantities & costs",
    seoDescription:
      "Plan walls from structure to finish anywhere in the world: pick your country's construction method, add rooms and openings, and get layer-by-layer material quantities, labour and costs with full calculation transparency.",
    to: "/wall-finish-estimator",
    navVisible: true,
  },

  // New standalone quantity tools
  {
    slug: "masonry-calculator",
    title: "Masonry & Blockwork",
    category: "structure",
    icon: Building2,
    does: "Estimate bricks, blocks, mortar and related quantities from wall dimensions.",
    enters: "Market, wall dimensions, openings and masonry unit.",
    gets: "Net wall area, unit count, mortar, cement and sand quantities. Includes a step by step animated blockwork sequence.",
    heading: "Masonry Calculator",
    to: "/masonry-calculator",
    navVisible: true,
    seoTitle: "Blockwork Calculator – Blocks, Mortar & Cost | FRELUX",
    seoDescription:
      "Calculate blocks, mortar and cost for a wall. Enter wall length, height and block size to get block quantity, mortar bags and a local cost estimate.",
  },
  {
    slug: "plastering-calculator",
    title: "Plastering & Rendering",
    category: "finishes",
    icon: Paintbrush,
    does: "Estimate cement, sand and water quantities for plaster and render areas.",
    enters: "Market, surface area, thickness, mix and allowance.",
    gets: "Wet and dry mortar volume, cement bags, sand and indicative labour.",
    heading: "Plastering Calculator",
    to: "/plastering-calculator",
    navVisible: true,
    seoTitle: "Plastering & Rendering Calculator – Cement & Sand | FRELUX",
    seoDescription:
      "Estimate plastering and rendering cement, sand and water for internal or external walls. Enter wall area and coat thickness to get bags and quantities.",
  },
  {
    slug: "drywall-calculator",
    title: "Drywall & Partitions",
    category: "structure",
    icon: Square,
    does: "Estimate board, framing, fixings and jointing quantities for partitions.",
    enters: "Market, partition dimensions, openings and framing spacing.",
    gets: "Boards, studs, tracks, screws, tape and compound quantities.",
    heading: "Drywall Calculator",
    to: "/drywall-calculator",
    navVisible: true,
    seoTitle: "Drywall Calculator – Boards, Studs & Screws | FRELUX",
    seoDescription:
      "Estimate drywall boards, studs, track, screws and jointing compound. Enter wall or ceiling area to get partition materials and a cost estimate.",
  },
  {
    slug: "paving-calculator",
    title: "Paving & External Works",
    category: "structure",
    icon: Grid3x3,
    does: "Estimate pavers, bedding sand, sub-base and edge units for paved areas.",
    enters: "Area, paver size, bedding and sub-base assumptions.",
    gets: "Paver count, sand and aggregate quantities, and edge units. Includes a step by step animated paving layer sequence.",
    heading: "Paving Calculator",
    to: "/paving-calculator",
    navVisible: true,
    seoTitle: "Paving Calculator – Pavers, Sand & Base | FRELUX",
    seoDescription:
      "Calculate paving quantity, sand bedding and base material. Enter paved area and paver size to get paver counts, jointing sand and a cost estimate.",
  },
  {
    slug: "drainage-calculator",
    title: "External Drainage Takeoff",
    category: "services",
    icon: Umbrella,
    does: "Estimate gravity pipe, trench, bedding and access chamber quantities.",
    enters: "Pipe runs, diameter, fall and trench assumptions.",
    gets: "Pipe lengths, fall, bedding, excavation and indicative chambers.",
    heading: "Drainage Calculator",
    to: "/drainage-calculator",
    navVisible: true,
    seoTitle: "Drainage Calculator – Pipe, Falls & Trench | FRELUX",
    seoDescription:
      "Calculate external drainage pipe lengths, gradients and trench excavation. Enter run length and fall to get pipe, fittings and excavation quantities.",
  },
  {
    slug: "septic-sizing-calculator",
    title: "Septic & Soakaway Worksheet",
    category: "services",
    icon: Droplets,
    does: "Calculate preliminary tank volumes and soakaway area from explicit local design inputs.",
    enters:
      "Occupants, locally approved flow and retention criteria, and soil-loading rate when known.",
    gets: "Working and total tank volumes, plus a conditional indicative absorption area.",
    heading: "Septic and Soakaway Calculator",
    to: "/septic-sizing-calculator",
    navVisible: true,
  },
  {
    slug: "borehole-water-system-estimator",
    title: "Autonomous Borehole & Water Supply",
    category: "services",
    icon: Droplets,
    does: "Calculate drilling strata, casing, gravel pack, sanitary grout seal, submersible pump hydraulics, check valves, multi-barrier filtration, overhead rush buffering, and gravity reticulation.",
    enters:
      "Drilling depth, static water level, safe yield, aquifer hydrogeology, occupants, water quality assay, and tower elevation.",
    gets: "Total Dynamic Head (TDH), submersible motor HP, check valve schedule, 4-stage water treatment train, peak rush buffer volume, overhead tank sizing, tap hydrostatic pressure, and complete Bill of Quantities.",
    heading: "Autonomous Borehole & Water Supply System Estimator",
    lede: "Drilling strata, submersible pump hydraulics, multi-barrier filtration, overhead peak rush buffering, and gravity reticulation.",
    eyebrow: "Hydraulic & Civil Infrastructure Engineering",
    seoTitle: "Borehole Cost Calculator: Pump HP, Casing & Tank Stand | FRELUX",
    seoDescription:
      "Estimate a borehole end to end: drilling depth by soil type, casing pipe lengths, submersible pump horsepower (HP) for your well depth, overhead tank size and tank stand cost, filtration, and the gravity pressure left at your taps.",
    to: "/borehole-water-system-estimator",
    navVisible: true,
  },
  {
    slug: "renovation-estimator",
    navVisible: true,
    title: "Renovation Cost Estimator",
    category: "project",
    icon: Hammer,
    does: "Measure a refurbishment room by room: strip out and its arisings, plaster, screed, tiling, flooring, ceilings, paint, power points and plumbing points, then price the takeoff at your own supplier rates.",
    enters:
      "The rooms and their length, width and height in metres or feet, the existing wall and floor finish in each room, the work to be done there, the point counts, whether the property is occupied and the year it was completed.",
    gets: "Net quantities with the waste allowance stated beside them, container loads for the arisings, every line unpriced until you enter a price, and tax left as not determined rather than assumed.",
    heading: "Renovation Estimator",
    lede: "Measure a refurbishment room by room, then price it at your own supplier rates. Every quantity states its arithmetic and what is left out.",
    seoTitle: "Renovation Cost Estimator: Room by Room Quantities | FRELUX",
    seoDescription:
      "Measure a renovation room by room in metres or feet: strip out, plaster, screed, tiling, ceilings, paint, power and plumbing points. Load a property template or build a custom room list, then price the takeoff at your own rates.",
    to: "/renovation-estimator",
    benefit: "Room by room · Strip out · Repaint",
  },
  {
    slug: "temporary-works-calculator",
    title: "Formwork & Temporary Works",
    category: "structure",
    icon: Layers,
    does: "Estimate geometric form-contact areas and simplified scaffold quantities.",
    enters: "Element dimensions, scaffold run and working height.",
    gets: "Form-contact area, sheet allowance and a simplified scaffold grid.",
    heading: "Temporary Works Calculator",
    to: "/temporary-works-calculator",
    navVisible: true,
  },
  {
    slug: "insulation-calculator",
    title: "Insulation Takeoff",
    category: "finishes",
    icon: Thermometer,
    does: "Estimate insulation volume and product packs from area and thickness.",
    enters: "Area, product coverage, thickness, layers and cutting allowance.",
    gets: "Gross area, installed volume and pack quantity where entered.",
    heading: "Insulation Calculator",
    to: "/insulation-calculator",
    navVisible: true,
    seoTitle: "Insulation Calculator – Rolls, Batts & Packs | FRELUX",
    seoDescription:
      "Estimate insulation rolls, batts and packs from area and thickness. Enter area, product coverage and cutting allowance to get the quantity to buy.",
  },
  {
    slug: "demolition-calculator",
    title: "Demolition & Debris Takeoff",
    category: "structure",
    icon: Recycle,
    does: "Estimate in-place material volume, loose debris and optional skip loads.",
    enters: "Element dimensions, bulking factor and skip capacity.",
    gets: "In-place volume, loose debris volume and indicative skip loads.",
    heading: "Demolition Calculator",
    to: "/demolition-calculator",
    navVisible: true,
    seoTitle: "Demolition Takeoff – Debris Volume & Skip Loads | FRELUX",
    seoDescription:
      "Estimate demolition debris volume and skip loads before hiring. Enter element dimensions, bulking factor and skip capacity to get in-place and loose volumes.",
  },
  {
    slug: "blueprint-takeoff",
    title: "Blueprint & PDF Plan Takeoff",
    category: "pro",
    icon: Ruler,
    does: "Measure linear, area and counted quantities from calibrated plan drawings.",
    enters:
      "A PDF or image plan and one known drawing dimension for scale calibration.",
    gets: "A measured takeoff schedule that can be exported as CSV.",
    heading: "Blueprint & PDF Plan Takeoff",
    lede: "Calibrate a drawing, trace linear and area quantities, count items, and export an editable takeoff schedule.",
    eyebrow: "Construction quantity tools",
    seoTitle: "Blueprint & Plan Takeoff | FRELUX",
    seoDescription:
      "Calibrate a construction drawing, trace linear and area quantities, count items, and export an editable takeoff schedule.",
    to: "/blueprint-takeoff",
    navVisible: true,
  },

  // ---------------------------------------------------------------- structure
  {
    slug: "mathematical-plan-elevation",
    title: "Mathematical Plan Elevation",
    category: "structure",
    icon: Ruler,
    does: "Explore a building elevation from entered dimensions or from a plan it reads and you confirm, with roof geometry and a quantity schedule.",
    enters:
      "Building dimensions, roof pitch, or an uploaded plan to read, plus optional assumed site inputs.",
    gets: "A parametric elevation, preliminary quantities, and costs only for supplier rates you enter.",
    heading: "Mathematical Plan Elevation Engine",
    lede: "Upload the plan or type four measurements. You confirm what the drawing states, the engine does the arithmetic, and the height, roof area, blockwork and concrete follow immediately.",
    eyebrow: "Plan reading with confirmed values · deterministic calculation",
    seoTitle: "Plan Elevation and Material Takeoff Calculator | FRELUX",
    seoDescription:
      "Upload a floor plan or type four measurements to get building height, roof area, blockwork, concrete volumes and a phased material schedule. You confirm every extracted value; the engine does the arithmetic and hands the areas to the painting, screeding, tiling, POP and build-to-roof estimators.",
    to: "/mathematical-plan-elevation",
    benefit: "Reads your plan, then calculates it with its own maths",
    navVisible: true,
  },
  {
    slug: "build-to-roof",
    title: "Build-to-Roof Estimator",
    category: "structure",
    icon: Landmark,
    does: "Calculate every major material from foundation through roof in one run: blocks, concrete, steel, roofing and more.",
    enters: "Building size, number of floors and finishing level.",
    gets: "A complete material schedule and cost for the whole structure.",
    eyebrow: "Foundation to roof",
    lede: "Foundation, block walls, structural frame and roof in one estimate, with engineer-ready material schedules and a verified price book behind every rate.",
    seoTitle:
      "Build-to-Roof Estimator, Construction Planning & Budgeting | FRELUX",
    seoDescription:
      "Planning and budgeting estimate for building from foundation to roof. Configure dimensions, materials, and prices. Actual requirements and costs may vary based on location, current material prices, building design, site conditions, and professional specifications.",
    to: "/build-to-roof-estimator",
    benefit: "Foundation to roof",
    featured: true,
    navVisible: true,
  },
  {
    slug: "concrete",
    title: "Concrete & Structural",
    category: "structure",
    icon: Hammer,
    does: "Calculate concrete volumes, mix ratios, and quantities for slabs, beams, columns and lintels.",
    enters: "Element dimensions (slab, beam, column) and concrete grade.",
    gets: "Cement bags, sand, granite and required reinforcement.",
    heading: "Structural Engineering Calculator",
    lede: "Size a beam, column or slab from its span and load, see the formula behind every number, and check the section you land on. Preliminary sizing only: a licensed structural engineer must verify anything that gets built.",
    eyebrow: "Engineering Tool",
    seoTitle: "Structural Calculator | FRELUX",
    seoDescription:
      "Preliminary beam, column, and slab sizing estimates with formula transparency. Not a certified structural design or code-compliance check.",
    to: "/structural-calculator",
    navVisible: true,
  },
  {
    slug: "concrete-slab-takeoff",
    title: "Concrete Slab Takeoff",
    category: "structure",
    icon: Hammer,
    does: "Estimate measured slab concrete volume and material quantities from a specified mix and optional engineer-provided rebar schedule.",
    enters:
      "Slab dimensions, specified mix ratio, additional allowance and optional bar schedule.",
    gets: "Wet concrete volume, whole cement-bag procurement count, sand, coarse aggregate and scheduled rebar weight. Includes a step by step animated build sequence for the element.",
    to: "/concrete-takeoff-calculator",
    benefit: "Free quantity takeoff",
    seoTitle:
      "Concrete Slab Quantity Calculator: Cement, Sand and Aggregate | FRELUX",
    seoDescription:
      "Estimate measured slab concrete volume, cement bags, sand, coarse aggregate and scheduled rebar weight from your own dimensions and mix, with a step by step animated build sequence for slabs, beams, columns and footings.",
    navVisible: true,
  },
  {
    slug: "earthworks-cut-fill",
    title: "Earthworks Cut & Fill",
    category: "structure",
    icon: Ruler,
    does: "Calculate cut, fill and haul quantities from surveyed or designed cross-sections.",
    enters:
      "Station chainages, cut/fill areas and project-specific bulking/shrinkage factors.",
    gets: "Average-end-area cut, compacted fill, loose haul and a qualified reuse balance.",
    heading: "Earthworks: Cut & Fill",
    lede: "Enter cross-section areas from a survey or design and site-specific material factors. FRELUX calculates interval volumes with the average end-area method, without guessing soil behavior.",
    eyebrow: "Measured survey takeoff",
    seoTitle: "Earthworks Cut & Fill Estimator | FRELUX",
    seoDescription:
      "Calculate surveyed cut and fill quantities from cross-section areas, chainages and project-specific bulking and shrinkage factors.",
    to: "/earthworks-cut-fill",
    navVisible: true,
  },
  {
    slug: "roof-framing",
    title: "Roof Framing & Board Feet",
    category: "structure",
    icon: Umbrella,
    does: "Lay out timber quantities for regular rectangular gable or equal-pitch hip roofs, with a step by step animated framing and bracing sequence.",
    enters:
      "Measured building dimensions, pitch, rafter spacing and timber sections.",
    gets: "Common, jack, hip and ridge member counts, lengths, linear metres and board feet. Includes a step by step animated framing and bracing sequence.",
    heading: "Roof Framing & Board Feet",
    lede: "Plan member quantities from a measured rectangular roof, requested rafter spacing, and your selected timber sections. Geometry and board feet stay visible, while complex valleys remain tied to your verified drawing or schedule.",
    eyebrow: "Roof structure takeoff",
    seoTitle: "Roof Framing & Board-Foot Calculator | FRELUX",
    seoDescription:
      "Calculate common, jack, hip and ridge member layouts, lengths, linear metres and board feet for a measured gable or hip roof, with a step by step animated roof build sequence.",
    to: "/roof-framing-calculator",
    navVisible: true,
  },
  {
    slug: "foundation-designer",
    title: "Foundation Designer",
    category: "structure",
    icon: Ruler,
    does: "Size and cost a foundation: strip, pad or raft for your building.",
    enters: "Building dimensions, floors and soil condition.",
    gets: "Foundation dimensions, excavation, concrete and cost.",
    heading: "Foundation Design Calculator",
    lede: "Preliminary strip, pad, and raft sizing estimates using assumed or user-entered soil bearing capacity. Not a certified geotechnical or structural design or code-compliance check.",
    eyebrow: "Engineering Tool",
    seoTitle: "Foundation Design Calculator | FRELUX",
    seoDescription:
      "Preliminary strip, pad, and raft foundation sizing estimates. Not a certified geotechnical or structural design, and not a jurisdictional code-compliance check.",
    to: "/foundation-calculator",
    navVisible: true,
  },
  {
    slug: "retaining-wall",
    title: "Retaining Wall Calculator",
    category: "structure",
    icon: BrickWall,
    does: "Size a retaining wall footing, stem, reinforcement and drainage.",
    enters: "Wall length and height, soil type and stem construction.",
    gets: "Footing concrete, blocks, rebar and weep holes with the rule behind each quantity.",
    heading: "Retaining Wall Material Calculator",
    lede: "Size the footing, stem, reinforcement and drainage for a retaining wall, then cost the materials at your own prices.",
    seoTitle: "Retaining Wall Material & Cost Calculator | FRELUX",
    seoDescription:
      "Work out footing concrete, blocks, reinforcement and weep holes for a retaining wall from wall length, height and soil type. Soil type widens the recommended footing, and every quantity shows the rule behind it.",
    to: "/retaining-wall-calculator",
    navVisible: true,
  },
  {
    slug: "soffit-gutter",
    title: "Soffit, Fascia & Gutter",
    category: "structure",
    icon: Droplets,
    does: "Turn the eaves perimeter into fascia, gutter and soffit quantities.",
    enters:
      "Roof perimeter or building footprint, eaves overhang and soffit material.",
    gets: "Fascia and gutter runs, soffit area, downpipes and brackets.",
    heading: "Soffit, Fascia & Gutter Estimator",
    lede: "Turn the eaves perimeter into fascia, gutter, soffit area, downpipes and brackets, ready to price.",
    seoTitle: "Soffit, Fascia and Rainwater Gutter Cost Estimator | FRELUX",
    seoDescription:
      "Estimate fascia board, rainwater gutter, soffit panels, downpipes and brackets from the roof perimeter and eaves overhang, with a 5% cutting allowance and downpipes every 12 m.",
    to: "/rainwater-gutter-soffit-cost-estimator",
    navVisible: true,
  },
  {
    slug: "water-tower-staging",
    title: "Overhead Water Tank Staging",
    category: "structure",
    icon: Droplets,
    does: "Calculate dead load, wind overturning safety, pad footing sizes and a preliminary steel or concrete bill of quantities for overhead water towers, with a step by step animated build sequence.",
    enters:
      "Tank capacity, staging elevation height, tower material, and leg spread.",
    gets: "Dead load in kN, wind overturning factor, pad footing size, leg section and utilisation, steel or concrete quantities, and a step by step animated build sequence.",
    heading: "Borehole & Overhead Water Tank Staging Estimator",
    lede: "Structural physics dead load estimation, wind safety cross-bracing, and material Bill of Materials for elevated water towers.",
    eyebrow: "Structural & Plumbing Engineering",
    seoTitle: "Overhead Water Tank Staging & Tower Estimator | FRELUX",
    seoDescription:
      "Dead load, wind overturning factor, pad footing sizes and leg sections for elevated steel or concrete water tank towers, with a material bill of quantities and a step by step animated build sequence of the eight site steps.",
    to: "/water-tower-staging-estimator",
    navVisible: true,
  },
  {
    slug: "diaspora-budget-tracker",
    title: "Diaspora Budget & Inflation Tracker",
    category: "project",
    icon: Globe2,
    does: "Track overseas construction funds against local currency inflation, parallel exchange rates, and on-site material deviations.",
    enters:
      "Foreign sponsor budget, parallel and official exchange rates, annual inflation %, timeline, and milestone costs.",
    gets: "Exchange rate gap spread, compound inflation multiplier, forward projected target budget, and variance health.",
    heading: "Diaspora Construction Budget & Inflation Tracker",
    lede: "Protect cross-border remittances against local currency volatility, black market exchange spreads, and compounding material inflation.",
    eyebrow: "Diaspora Escrow Finance",
    seoTitle: "Diaspora Construction Budget & Inflation Tracker | FRELUX",
    seoDescription:
      "Track overseas construction funds against local currency inflation, parallel exchange rates, and on-site material cost deviations.",
    to: "/diaspora-budget-tracker",
    navVisible: true,
  },
  {
    slug: "conduit-wiring",
    title: "Conduit & Wiring Loops",
    category: "services",
    icon: Cable,
    does: "Convert floor area and point counts into conduit, cable and accessory quantities.",
    enters: "Floor area, lighting points and socket points.",
    gets: "Conduit lengths, 1.5 mm and 2.5 mm cable coils, boxes, switches and sockets.",
    heading: "Electrical Conduit & Wiring Estimator",
    lede: "Convert floor area or Manhattan wall-routed device layouts into conduit lengths, cable coils, boxes, switches and sockets.",
    seoTitle: "Electrical Conduit and Wiring Material Estimator | FRELUX",
    seoDescription:
      "Estimate PVC conduit, 1.5 mm and 2.5 mm cable coils, junction boxes, switch plates and sockets from floor area and your lighting and socket point counts.",
    to: "/electrical-conduit-wiring-estimator",
    navVisible: true,
  },
  {
    slug: "steel-beam-weight",
    title: "Steel I-Beam Weight",
    category: "structure",
    icon: Ruler,
    does: "Convert span and profile into kilograms, tonnes and cost.",
    enters:
      "Profile, span length, number of beams and your merchant rate per tonne.",
    gets: "Total mass in kg and tonnes with a cost at your own rate.",
    heading: "Structural Steel I-Beam Weight & Cost Calculator",
    lede: "Convert span and profile into kilograms, then tonnes, then a cost at your own merchant rate.",
    seoTitle: "Structural Steel I-Beam Weight and Cost Calculator | FRELUX",
    seoDescription:
      "Calculate the mass of IPE and universal beam sections from span length and nominal weight per metre, and cost them at your steel merchant's rate per tonne.",
    to: "/structural-steel-i-beam-calculator",
    navVisible: true,
  },
  {
    slug: "foundation-estimate",
    title: "Foundation Cost Estimate",
    category: "structure",
    icon: Landmark,
    does: "Estimate the full cost of completing your foundation stage.",
    enters: "Plot size and foundation type.",
    gets: "Line-by-line foundation cost breakdown with current prices.",
    heading: "Foundation Estimator",
    lede: "Enter your measured concrete volume, wall area, hardcore and formwork. The engine splits concrete into cement, sand and granite with the visible mix ratio and every constant shown, sizes blocks from the blocks-per-m² rule, and prices from the shared material database. Estimation only: not foundation design.",
    seoTitle:
      "Foundation Estimator: Concrete Mix, Blocks, Hardcore & Formwork | FRELUX",
    seoDescription:
      "Deterministic foundation material estimation: enter your measured concrete volume, wall area, hardcore and formwork and get cement, sand, granite, blocks and formwork quantities with the mix ratio, dry factor and every step shown. Estimation only: not foundation design.",
    to: "/foundation",
    navVisible: true,
  },
  {
    slug: "reinforcement",
    title: "Reinforcement / Steel",
    category: "structure",
    icon: BarChart3,
    does: "Calculate rebar quantities, weights and binding wire for structural elements.",
    enters: "Element type and dimensions, bar spacing.",
    gets: "Lengths and tonnage of steel needed, with cost. Includes a step by step animated cage build sequence.",
    to: "/reinforcement",
    navVisible: true,
  },

  {
    slug: "tall-building-structure",
    title: "Tall Building Structure",
    category: "structure",
    icon: Building2,
    does: "Screen a high rise from entered geometry: the lateral system the height calls for, ASCE 7 wind base shear and drift, seismic base shear, raft and pile foundation sizing, quantities and a build programme.",
    enters:
      "Floors above ground, typical and ground floor heights, plan length and width, concrete fck, the soil type, the mapped accelerations SDS and SD1, and the occupancy category.",
    gets: "The lateral system for the height, wind and seismic base shear with drift, raft thickness and the pile schedule, the concrete and reinforcement quantities, and a programme, with the method and every assumption shown. It is a deterministic screening check, not a structural design.",
    heading: "Skyscraper Structure and Foundation Calculator",
    lede: "Size the lateral system, foundation and programme of a high rise from the geometry you enter. Wind and seismic demand are computed with published relationships, then checked against drift, stability and pile capacity limits. This is a screening calculation, not a structural design.",
    eyebrow: "Deterministic engineering · codes cited · no AI estimates",
    seoTitle: "Skyscraper Structure and Foundation Calculator | FRELUX",
    seoDescription:
      "Screen a high rise from entered geometry: lateral system by height, ASCE 7 wind base shear and drift, seismic base shear, raft and pile foundation sizing, quantities and a build programme. Deterministic engineering arithmetic, not a structural design.",
    to: "/tall-building-structure",
    benefit: "Wind , Seismic , Piles",
    navVisible: true,
  },

  // ---------------------------------------------------------------- services
  {
    slug: "electrical",
    title: "Electrical Wiring",
    category: "services",
    icon: Zap,
    does: "Calculate wiring, conduits, sockets, switches and lighting points for a building.",
    enters: "Number of rooms and points per room.",
    gets: "Full electrical material list and cost.",
    heading: "Electrical Wiring Estimator",
    lede: "Enter your point counts and estimated average cable runs. The engine sizes each cable category separately, counts circuits and accessories from your inputs, and shows every step of the calculation. Estimation only: not professional electrical design.",
    seoTitle:
      "Electrical Wiring Estimator: Cables, Conduit, Breakers & Boards | FRELUX",
    seoDescription:
      "Deterministic electrical material estimation: enter your lighting points, socket points and average cable runs and get separate cable, conduit, junction box, breaker and accessory quantities with a full calculation breakdown. Estimation only: not electrical design.",
    to: "/electrical",
    navVisible: true,
  },
  {
    slug: "plumbing",
    title: "Plumbing",
    category: "services",
    icon: ShowerHead,
    does: "Calculate pipes, fittings and sanitary ware for a complete plumbing installation.",
    enters: "Number of bathrooms, kitchens and water points.",
    gets: "Complete plumbing material list and cost.",
    heading: "Plumbing Estimator",
    lede: "Enter your fixture counts and the total pipe run you measured for each category. The engine sizes each pipe category separately, applies the visible waste and fitting allowances, and shows every step. Estimation only: not professional plumbing design.",
    seoTitle:
      "Plumbing Estimator: Pipes, Fittings, Valves & Connection Kits | FRELUX",
    seoDescription:
      "Deterministic plumbing material estimation: enter fixture counts and your measured pipe runs and get separate pipe, fitting, valve and connection-kit quantities with a full calculation breakdown. Estimation only: not plumbing design.",
    to: "/plumbing",
    navVisible: true,
  },
  {
    slug: "solar",
    title: "Solar PV Estimator",
    category: "services",
    icon: Sun,
    does: "Size a solar system and calculate panels, batteries and inverter cost.",
    enters: "Your appliances, daily usage hours and location.",
    gets: "Panel count, battery bank, inverter size and total cost.",
    heading: "Solar/PV Roofing Estimator",
    lede: "A complete solar installation estimate from sourced data: fit panels to your roof or size the array for your daily energy target, then get every material quantity: rails, clamps, connectors, DC/AC cabling, breakers, surge protection, earthing, batteries: with configured prices. Nothing is guessed, and unpriced components are reported honestly.",
    seoTitle: "Solar/PV Roofing Estimator: Full Material Takeoff | FRELUX",
    seoDescription:
      "Plan a complete solar installation: panels that fit your roof or sized for your energy target, daily energy yield, inverter and strings, and every material quantity: rails, clamps, connectors, cabling, breakers, surge protection, earthing, batteries: with sourced prices. Nothing is guessed.",
    to: "/solar-pv-estimator",
    benefit: "Panels · Batteries · Cost",
    featured: true,
    navVisible: true,
  },
  {
    slug: "generator",
    title: "Backup Power / Generator",
    category: "services",
    icon: Plug,
    does: "Find the right generator size and running cost for your home or site.",
    enters: "Appliances you need to power and usage hours.",
    gets: "Recommended generator size, fuel consumption and cost.",
    heading: "Generator & Power Backup Estimator",
    lede: "Choose your generator bracket from your own load assessment and give the measured cable run. The engine lists generator units, ATS, battery and cable with waste visible, and prices from the shared material database. It never sizes the generator: estimation only, not an installation design.",
    seoTitle:
      "Backup Power Estimator: Generator, ATS, Battery & Cable | FRELUX",
    seoDescription:
      "Deterministic backup power material estimation: choose your generator bracket from your own load assessment, give the measured cable run, and get generator, ATS, battery and cable quantities with waste shown. The engine never sizes the generator: estimation only, not an installation design.",
    to: "/generator",
    navVisible: true,
  },
  {
    slug: "heat-comfort",
    title: "Heat & Comfort",
    category: "services",
    icon: Thermometer,
    does: "Analyse how hot your building will get and what improves comfort.",
    enters: "Roof, wall and orientation details.",
    gets: "Comfort score and practical cooling recommendations.",
    heading: "Heat Comfort: Finish Choice & Indoor Heat",
    lede: "Brighter finishes reflect more solar energy and keep a space cooler. Compare two finishes on a roof or wall and see the honest difference in absorbed heat: computed only from sourced reflectance factors, never a guess.",
    seoTitle: "Heat Comfort: Finish Choice & Indoor Heat | FRELUX",
    seoDescription:
      "Compare how two finishes affect indoor heat comfort using configured solar reflectance data. Every number comes from a sourced factor: never a guess.",
    to: "/heat-comfort",
    navVisible: true,
  },
  {
    slug: "material-price-index",
    title: "Live Material Price Index",
    category: "services",
    icon: LineChart,
    does: "Shows verified and reported construction material prices across Nigerian cities, with sample size, source and last verification date for every figure.",
    enters: "A city, a material category, and a search term.",
    gets: "Median, range and price basis per material, city-by-city comparison, recorded price history, and movement where the evidence supports one.",
    heading: "Live Material Price Index",
    lede: "Construction material prices across Nigerian cities, with the evidence behind every number: sample size, source, price basis and last verification date.",
    seoTitle: "Live Material Price Index | FRELUX",
    seoDescription:
      "Verified and reported construction material prices across Nigerian cities: cement, reinforcement bars, aggregates, blocks, roofing, tiles, paint and more, with sample sizes and last verification dates shown.",
    to: "/material-price-index",
    navVisible: true,
  },
  {
    slug: "code-reference",
    title: "International Code Reference",
    category: "services",
    icon: BookOpenCheck,
    does: "See which building code, edition and technical standards govern a project in any supported country.",
    enters:
      "Country, location, building type, structural system and code edition.",
    gets: "The applicable code family and edition, references for concrete, reinforcement, loads, wind, snow, foundations, durability and materials, plus every unsupported or locally-verifiable point stated plainly.",
    heading: "International Building Code Reference",
    lede: "Configure your project and see which building code, edition and technical standards govern it, with every unsupported or locally-verifiable point stated plainly. This engine names documents; it never substitutes one country's design values for another's.",
    eyebrow: "Regulatory reference",
    seoTitle:
      "International Building Code Reference: Standards by Country | FRELUX",
    seoDescription:
      "Select your project country, building type and structural system to see the building code, edition and standards that govern concrete, reinforcement, loads, wind, snow, foundations, durability and materials, with unsupported regulations identified, never filled from another country.",
    to: "/code-reference",
    navVisible: false,
  },
  {
    slug: "material-advisor",
    title: "Climate Material Advisor",
    category: "services",
    icon: Globe2,
    does: "Match construction materials to your site's real climate: rain, humidity, UV, salt air and frost.",
    enters: "Project location (search, map pick or coordinates).",
    gets: "Material guidance for paints, waterproofing, roofing, tiles, concrete exposure, steel, insulation and drainage — with the reasoning and standards shown.",
    heading: "Climate-Responsive Material Advisor",
    lede: "Choose your project location. FRELUX reads measured climate normals for that coordinate — rainfall, humidity, UV, frost, salt air — and explains which material properties belong on that site, and why.",
    eyebrow: "Climate intelligence",
    seoTitle:
      "Climate-Responsive Material Advisor: Materials for Your Site's Climate | FRELUX",
    seoDescription:
      "Pick your project location and get construction material guidance for its real climate: rainfall, humidity, UV, coastal exposure and frost. Exterior paints, waterproofing, roofing, tiles, concrete exposure classes, steel protection, insulation and drainage.",
    to: "/material-advisor",
    navVisible: true,
    featured: true,
  },

  // ---------------------------------------------------------------- components
  {
    slug: "doors-windows",
    title: "Doors & Windows",
    category: "components",
    icon: DoorOpen,
    does: "Calculate quantities and cost for doors, windows and their frames.",
    enters: "Count and sizes of doors and windows per type.",
    gets: "Frame, leaf and fitting quantities with total cost.",
    heading: "Doors & Windows Estimator",
    lede: "Enter your door and window counts per type. The engine lists leaves, frames, hinges, locksets and window units, labelling every derived count, and prices from the shared material database. Estimation only: confirm unit sizes on site.",
    seoTitle:
      "Doors & Windows Estimator: Leaves, Frames, Hinges, Locksets & Units | FRELUX",
    seoDescription:
      "Deterministic doors and windows material estimation: enter your counts per type and get door leaves, frames, hinges, locksets and window units with every derived count labelled. Estimation only: confirm unit sizes on site.",
    to: "/doors-windows",
    navVisible: true,
  },

  // ---------------------------------------------------------------- project
  {
    slug: "boq",
    title: "BOQ Generator",
    category: "project",
    icon: ListChecks,
    does: "Turn your material list into a formal Bill of Quantities.",
    enters: "Your project scope or an existing estimate.",
    gets: "A professional BOQ document ready to share or export.",
    heading: "BOQ / Quote Generator",
    lede: "Assemble your saved FRELUX estimates into one professional, client-ready Bill of Quantities. VAT and contingency come from database-configured rates: every line stays traceable to its source.",
    seoTitle: "BOQ / Quote Generator: FRELUX",
    seoDescription:
      "Turn saved FRELUX estimates into a professional, client-ready Bill of Quantities with database-configured VAT and contingency rates.",
    to: "/boq-generator",
    navVisible: true,
  },
  {
    slug: "labour",
    title: "Labour Cost",
    category: "project",
    icon: Users,
    does: "Calculate labour costs for every trade on your project.",
    enters: "Project scope and region.",
    gets: "Crew sizes, days and total labour cost per trade.",
    to: "/labour-estimator",
    heading: "Labour & Crew Estimator",
    lede: "Worker-days and crew duration for a quantity of work, from verified productivity rates with verifiable sources. The site-efficiency loss is shown as a separate line: never folded into the base rate: and calendar days are always whole days.",
    seoTitle: "Labour & Crew Estimator: FRELUX",
    seoDescription:
      "Estimate worker-days and crew duration for any finishing task from verified, verifiable productivity rates.",
    navVisible: true,
  },
  {
    slug: "margin",
    title: "Margin Calculator",
    category: "project",
    icon: Percent,
    does: "Price a job correctly: add margin, VAT and profit to any cost figure.",
    enters: "Your cost figure and target margin.",
    gets: "Correct selling price and the profit you will make.",
    heading: "Profit Margin Calculator",
    lede: "Build a complete bid cost from direct costs, labor hours and weekly overhead, or enter one base cost. Apply a configured profit preset and distinguish markup on cost from margin on price. VAT is added only from a configured rate, never guessed.",
    seoTitle: "Profit Margin Calculator: FRELUX",
    seoDescription:
      "Price any base cost deterministically from verified margin presets, with the markup-on-cost vs margin-on-price distinction made explicit.",
    to: "/margin-calculator",
    navVisible: true,
  },
  {
    slug: "quote-check",
    title: "Quote Check",
    category: "project",
    icon: ClipboardCheck,
    does: "Check a contractor or supplier quote line by line against the market price book.",
    enters:
      "Each quoted item, the quantity, the unit and the rate you were given.",
    gets: "The lines that sit above market, by how much, and the lines that cannot be judged for lack of a reference price.",
    heading: "Quote Check",
    lede: "Compare a contractor or supplier quote against the FRELUX price book. Every line is judged on the market rate for its own unit, and lines with no reference price are marked instead of guessed.",
    eyebrow: "Project and cost",
    seoTitle: "Contractor Quote Check Against Market Prices | FRELUX",
    seoDescription:
      "Check a contractor quote against the market price book line by line. See which lines sit above market and which have no reference price.",
    to: "/quote-check",
    navVisible: true,
  },
  {
    slug: "cash-flow",
    title: "Cash-Flow Timeline",
    category: "project",
    icon: Wallet,
    does: "Plan when money comes in and goes out across construction stages.",
    enters: "Project cost, stage schedule and payment terms.",
    gets: "A monthly cash-flow timeline so you never run dry mid-project.",
    heading: "Cash-Flow Timeline",
    lede: "Phased payment schedule for an estimate total, from verified milestone templates. Milestone percentages must sum to exactly 100%: FRELUX refuses anything else rather than silently adjusting your payment plan.",
    seoTitle: "Cash-Flow Timeline: FRELUX",
    seoDescription:
      "Generate a deterministic phased payment schedule for any estimate total from verified milestone templates.",
    to: "/cash-flow-timeline",
    navVisible: true,
  },
  {
    slug: "regional-index",
    title: "Regional Cost Index",
    category: "project",
    icon: Globe,
    does: "See how construction costs differ across Nigerian states using available regional index data.",
    enters: "Your state and project type.",
    gets: "Local price index to adjust any estimate to your region.",
    heading: "Regional Cost Index",
    lede: "State-by-state labour and material cost factors, verified from verifiable sources. Apply them to any base cost to see location-accurate totals. When a state has no configured index the engine falls back to the national baseline and tells you: it never guesses a multiplier.",
    seoTitle: "Regional Cost Index: FRELUX",
    seoDescription:
      "Location-adjusted costing using Nigerian state and regional labour and material cost factors. Coverage is specific to available index data.",
    to: "/regional-cost-index",
    navVisible: true,
  },
  {
    slug: "timeline",
    title: "Project Timeline",
    category: "project",
    icon: CalendarDays,
    does: "Build a realistic construction schedule from foundation to finishing.",
    enters: "Project scope and start date.",
    gets: "Stage-by-stage timeline with durations and milestones.",
    heading: "Construction Timeline Estimator",
    lede: "How long will your project take? Stage-by-stage estimates based on practical construction benchmarks.",
    eyebrow: "Planning Tool",
    seoTitle: "Construction Timeline Estimator | FRELUX",
    seoDescription:
      "Estimate how long your construction project will take. Stage-by-stage breakdown based on practical construction benchmarks.",
    to: "/project-timeline",
    navVisible: true,
  },
  {
    slug: "sequence",
    title: "Construction Sequence",
    category: "project",
    icon: ListChecks,
    does: "See the correct order of construction activities for your project type.",
    enters: "Project type and scope.",
    gets: "A step-by-step build sequence guide.",
    heading: "Construction Sequence & DAG Execution",
    lede: "Directed Acyclic Graph (DAG) task network, Critical Path Method (CPM), and multi-trade parallel execution waves conforming to ISO 21502 and PMI PMBOK® standards.",
    eyebrow: "Orchestration & Planning",
    seoTitle: "Construction Sequence & DAG Parallel Execution | FRELUX",
    seoDescription:
      "Interactive DAG network graph, Critical Path Method (CPM), and parallel execution waves conforming to ISO 21502 and PMI PMBOK 7th Ed. Optimize build duration, trade concurrency, and critical path.",
    to: "/construction-sequence",
    navVisible: true,
  },
  {
    slug: "maintenance",
    title: "Maintenance Planner",
    category: "project",
    icon: Wrench,
    does: "Plan and cost long-term building maintenance before problems start.",
    enters: "Building components and their ages.",
    gets: "A maintenance schedule with expected annual cost.",
    heading: "Maintenance Planner",
    lede: "Plan the full life of your finish from database-verified data: inspections, re-coat cycles and full redecoration, with cost projections at years 3, 5 and 10.",
    seoTitle: "Maintenance Planner: FRELUX",
    seoDescription:
      "Deterministic maintenance schedules from database-verified data: when your finish needs re-coating and full redecoration, with cost projections at years 3, 5 and 10.",
    to: "/maintenance-planner",
    navVisible: true,
  },
  {
    slug: "global-site-safety-estimator",
    title: "Global Site Safety & PPE Estimator",
    category: "pro",
    icon: ShieldCheck,
    does: "Plan site PPE, warning signs and safety-control quantities with explicit, editable assumptions.",
    enters:
      "Site perimeter, crew size, identified hazards and planning quantities.",
    gets: "A transparent inventory with OSHA, UK HSE/CDM and ISO 7010 references, plus a CSV export.",
    heading: "Global Site Safety & PPE Estimator",
    lede: "Build a transparent planning inventory for PPE, warning signs and site controls. Choose a framework reference, then set the assumptions that fit your worksite.",
    eyebrow: "Site Planning & Safety",
    seoTitle: "Global Construction Site Safety & PPE Estimator | FRELUX",
    seoDescription:
      "Plan construction-site PPE, warning signs, excavation barriers, first-aid kit and fire-extinguisher quantities with editable assumptions and OSHA, UK HSE/CDM or ISO 7010 references. Not a compliance certification.",
    to: "/global-site-safety-estimator",
    navVisible: true,
  },
  {
    slug: "warranty",
    title: "Warranty Certificate",
    category: "project",
    icon: ShieldCheck,
    does: "Issue professional warranty certificates for completed work.",
    enters: "Project details, scope and warranty period.",
    gets: "A verifiable warranty certificate for your client.",
    heading: "Warranty Certificate & Dispute Verification",
    lede: "Issue a hash-verified warranty certificate for a saved estimate. The exact configuration behind your quote is frozen and replayable: if a claim or dispute ever arises, both sides verify against the same frozen record, never a reconstruction.",
    seoTitle: "Warranty Certificate & Dispute Verification | FRELUX",
    seoDescription:
      "Issue a hash-verified warranty certificate for your saved estimate. Claims and disputes replay the exact frozen configuration: mismatches are flagged, never guessed.",
    to: "/warranty-certificate",
    navVisible: true,
  },
  {
    slug: "contractor-credit",
    title: "Contractor Credit",
    category: "project",
    icon: BadgeCheck,
    does: "Check and build your contractor credit profile with FRELUX.",
    enters: "Your project history and trade references.",
    gets: "A credit rating you can share with clients and suppliers.",
    heading: "Contractor Credit Score",
    lede: "Before you commit money to a contractor, check the record: on-time delivery, estimate accuracy, verified job volume and disputes: scored deterministically from FRELUX-verified job history. Unverified history is refused, never scored zero.",
    seoTitle: "Contractor Credit Score: Verified Job History | FRELUX",
    seoDescription:
      "Check a contractor's trust signal before you commit: a deterministic 0–100 score from verified job history: on-time delivery, estimate accuracy, verified volume, dispute penalty. Unverified history is refused, never scored zero.",
    to: "/contractor-credit",
    navVisible: true,
  },

  {
    slug: "carbon-footprint",
    title: "Embodied Carbon Estimator",
    category: "project",
    icon: Leaf,
    does: "Estimate the embodied carbon of your build from verifiable emission factors.",
    enters: "Your material quantities from a saved estimate.",
    gets: "kgCO2e per material line and a total, with unmeasured lines flagged: never guessed.",
    heading: "Embodied Carbon Estimator",
    lede: "kgCO2e per line from verified, verifiable emission factors (EPDs, ICE database). Lines without a configured factor are excluded with a warning: FRELUX never guesses an emission.",
    seoTitle: "Embodied Carbon Estimator: FRELUX",
    seoDescription:
      "Estimate the embodied carbon (kgCO2e) of your construction and finishing works from verified, verified emission factors.",
    to: "/carbon-footprint",
    navVisible: true,
  },
  {
    slug: "circular-reuse",
    title: "Demolition Recovery",
    category: "project",
    icon: Recycle,
    does: "Plan a demolition or strip-out: how much material can be recovered, reused or recycled.",
    enters: "The materials being removed and their condition.",
    gets: "Recoverable, reusable and recyclable quantities from sourced recovery factors.",
    heading: "Circular & Reuse: Demolition Recovery",
    lede: "Circular-economy mandates are coming to construction. Plan a demolition or strip-out honestly: how much material is recoverable, reusable, recyclable, and what lands in a dump: computed only from sourced recovery factors, never a guess.",
    seoTitle: "Circular & Reuse: Demolition Recovery Quantities | FRELUX",
    seoDescription:
      "Plan material recovery from a demolition or strip-out: recovered, reused, recycled and landfilled quantities, landfill-diversion rate against a circular-economy target, and reclaimed-material value. Every number comes from a sourced factor: never a guess.",
    to: "/circular-reuse",
    navVisible: true,
  },

  // ---------------------------------------------------------------- ai
  {
    slug: "photo-estimator",
    title: "AI Photo Estimator",
    category: "ai",
    icon: Camera,
    does: "Upload a photo of any building and get an instant AI-assisted cost estimate. Premium feature.",
    enters: "A photo of the building or project.",
    gets: "An estimate of quantities and costs, reviewed against FRELUX rules.",
    heading: "Building Photo Estimator",
    eyebrow: "Photo takeoff",
    lede: "Upload site photos, extract the measurements, then let the deterministic engine price the work.",
    seoTitle: "AI Photo Estimator, AI-Assisted Preliminary Estimation | FRELUX",
    seoDescription:
      "Upload a photo of any building for AI-assisted preliminary construction estimation. AI analyzes visible features to suggest dimensions and materials. Results are preliminary, verify with actual drawings and a qualified professional.",
    to: "/image-estimator",
    benefit: "AI-powered · Premium",
    featured: true,
    navVisible: true,
  },
  {
    slug: "smart-calculator",
    title: "Smart Calculator",
    category: "ai",
    icon: Brain,
    does: "Describe a construction project in plain words and get an estimate, with the reading done on your device and an optional model breakdown.",
    enters:
      "A sentence like: 3-bedroom bungalow in Abuja, tiling and painting.",
    gets: "Material quantities, line items and cost from the FRELUX engines.",
    eyebrow: "Describe a project",
    lede: "Say what you are building in plain words. The reading happens on your device: it names the work type, the measurements and the right calculator, and every quantity comes from the FRELUX engines. A model breakdown is available above the results and is not needed to get a figure.",
    seoTitle:
      "Smart Calculator: Construction Estimator in Plain Language | FRELUX",
    seoDescription:
      "Describe a construction project in plain language and get a cost estimate with material quantities and line items, calculated by the FRELUX engines. Reading runs on your device. Free to use.",
    to: "/smart-calculator",
    benefit: "AI-powered · Free",
    featured: true,
    navVisible: true,
  },
  {
    slug: "conversational",
    title: "Conversational Estimator",
    category: "project",
    icon: MessageCircle,
    does: "Build an estimate step by step by chatting, like WhatsApp.",
    enters: "Your project details, one message at a time.",
    gets: "A full estimate assembled from your answers.",
    heading: "WhatsApp Estimator",
    lede: "Paste the chat, or the voice-note transcript, in English. You get the same honest FRELUX estimate, plus every fact the engine picked up and where it found it.",
    seoTitle: "WhatsApp Estimator: Chat Your Estimate in English | FRELUX",
    seoDescription:
      "Paste a WhatsApp chat or voice-note transcript and get the same honest FRELUX paint estimate instantly. Nothing is guessed: the engine shows exactly what it heard and asks when something is missing.",
    to: "/conversational-estimator",
    navVisible: true,
  },
  {
    slug: "count-vision",
    title: "Counter-Vision",
    category: "ai",
    icon: ScanLine,
    does: "Count materials in a photo: cement bags, blocks, tiles and more.",
    enters: "A clear photo of the stacked materials.",
    gets: "The counted quantity with confidence and a permanent log.",
    heading: "Counter-Vision",
    lede: "Photograph your stacked materials and the engine counts what is visible. It tells you honestly when it cannot count: it never guesses a number.",
    seoTitle:
      "Photo Counter: Count Cement Bags, Tiles & Blocks From a Photo | FRELUX",
    seoDescription:
      "Photograph a stack of cement bags, tiles, blocks or paint buckets and Counter-Vision counts what is visible. Honest verdicts only: if the photo can't be counted reliably, it says so: it never guesses.",
    to: "/count-vision",
    navVisible: true,
  },
  {
    slug: "color-assistant",
    title: "Smart Color Assistant",
    category: "ai",
    icon: Palette,
    does: "Get colour scheme advice for your rooms and surfaces.",
    enters: "Your room type and colour mood.",
    gets: "Recommended FRELUX colour combinations.",
    lede: "Describe your space or share a photo and get personalized color ideas tailored to your room.",
    seoTitle: "Smart Color Assistant: Get Personalized Paint Color Ideas",
    seoDescription:
      "Describe your room or upload a photo and get AI color recommendations tailored to your space, lighting, and furniture. Practical, specific paint color suggestions.",
    to: "/ai-color-assistant",
    navVisible: false,
  },
  {
    slug: "color-preview",
    title: "AI Color Preview",
    category: "ai",
    icon: Eye,
    does: "See your chosen colours applied to a room before you buy.",
    enters: "A room photo and your chosen colours.",
    gets: "A realistic preview of the finished room.",
    // The menu calls this a preview; the page is a before and after tool, and
    // its own heading says so.
    heading: "AI Before & After Preview",
    seoTitle: "Color Preview Tool",
    lede: "Upload a photo of your room and see how different paint colors would transform it.",
    to: "/color-preview",
    navVisible: false,
  },
  {
    slug: "surface-assessment",
    title: "Surface Assessment",
    category: "finishes",
    icon: ClipboardCheck,
    does: "Assess a surface condition before painting or screeding so you buy the right prep materials.",
    enters: "The surface condition, with an optional room name and notes.",
    gets: "Preparation steps for that condition, each with a priority, saved with the project.",
    heading: "Surface Condition Assessment",
    seoTitle: "Surface Condition Assessment: Wall Preparation Guide",
    seoDescription:
      "Assess your wall condition before painting. Get recommendations for surface preparation based on new, painted, rough, dirty, damp, or cracked surfaces.",
    to: "/surface-assessment",
    navVisible: true,
  },
  {
    slug: "estimate-refresh",
    title: "Estimate Refresh",
    category: "project",
    icon: RefreshCw,
    does: "Bring an old estimate up to today's prices.",
    enters: "A saved FRELUX estimate.",
    gets: "The same estimate recalculated with current prices.",
    heading: "Estimate Refresh: Current Cost Today",
    lede: "Inflation-proof estimating: your saved estimates snapshot the prices they were quoted at. Pick one and see what it would cost today: line by line, with every missing price flagged, never guessed.",
    seoTitle: "Estimate Refresh: Current Cost Today | FRELUX",
    seoDescription:
      "Refresh a saved estimate against today's prices. Old quotes stay honest: see exactly what changed and what has no current price, never a guess.",
    to: "/estimate-refresh",
    navVisible: true,
  },

  // ---------------------------------------------------------------- pro
  {
    slug: "defect-diagnosis",
    title: "Defect Diagnosis",
    category: "pro",
    icon: Stethoscope,
    does: "Pick the symptom you are seeing and get its root causes with fixes and quantities.",
    enters: "The symptom and the affected area.",
    gets: "Ranked root causes, recommended fixes and exact fix quantities.",
    heading: "Defect Diagnosis",
    lede: "Pick the symptom you're seeing and get its root causes with fixes: ranked by our configured likelihood order, never an algorithm's guess. Causes with a configured consumption rate also show the exact fix quantity for your affected area.",
    seoTitle: "Defect Diagnosis: FRELUX",
    seoDescription:
      "Map a paint or finish defect to its root cause and get the fix, with quantities: from a deterministic, verified knowledge base.",
    to: "/defect-diagnosis",
    navVisible: true,
  },

  {
    slug: "bim-ifc",
    title: "BIM / IFC Import",
    category: "pro",
    icon: Box,
    does: "Import architectural models and extract quantities automatically.",
    enters: "An IFC model file from your architect.",
    gets: "Room areas, wall lengths and material take-offs.",
    // The menu abbreviates; the page and the search listing say it in full.
    heading: "BIM/IFC Import",
    lede: "Upload an architect's .ifc (BIM) export and get an instant material takeoff: walls, slabs, roofs, doors and windows with the areas and volumes the file itself declares. Parsed entirely in your browser: the file never leaves your device, no AI is involved, and if the export contains no quantities you get honest element counts with a warning, never invented areas.",
    seoTitle: "BIM/IFC Import: Instant Takeoff from Architect Files | FRELUX",
    seoDescription:
      "Upload an architect's .ifc (BIM) export and instantly get a material takeoff: walls, slabs, doors, windows and their declared quantities. Parsed entirely in your browser: nothing is uploaded, nothing is guessed.",
    to: "/bim-ifc-import",
    navVisible: true,
  },
  {
    slug: "field-sync",
    title: "Field Sync",
    category: "pro",
    icon: CloudOff,
    does: "Capture measurements and site data on site, with or without network.",
    enters: "Measurements, photos and notes captured on site.",
    gets: "Site records that sync to your FRELUX projects when back online.",
    heading: "Field Sync",
    lede: "Record site work with no network. Your captures queue on this device and sync when connectivity returns: honestly, one by one.",
    seoTitle: "Field Sync: Capture Site Work Offline | FRELUX",
    seoDescription:
      "Record measurements, materials and progress notes on site with no network. They queue on your device and sync when you're back online: nothing is lost, nothing is invented.",
    to: "/field-sync",
    navVisible: true,
  },
  {
    slug: "material-prices",
    title: "Material Prices",
    category: "pro",
    icon: FileText,
    does: "Browse current FRELUX material prices for your region.",
    enters: "A material name or category.",
    gets: "Up-to-date prices you can use in your own budgets.",
    heading: "Material Price Tracker",
    lede: "Monitor material costs, update prices, and track changes over time.",
    seoTitle: "Material Price Tracker",
    seoDescription:
      "Track and update material prices. See price history and spot cost changes.",
    to: "/material-prices",
    navVisible: true,
  },
];

/** Tools ordered for the navbar dropdown: only navVisible tools, grouped by category. */
export function navToolsByCategory() {
  return TOOL_CATEGORIES.map((cat) => ({
    category: cat,
    tools: CONSTRUCTION_TOOLS.filter(
      (t) => t.category === cat.id && t.navVisible,
    ),
  })).filter((g) => g.tools.length > 0);
}

export function findTool(slug: string) {
  return CONSTRUCTION_TOOLS.find((t) => t.slug === slug);
}

/**
 * Catalogue entry for a route. The tool shell resolves a page's own entry this
 * way so a page carries no copy of its title, description or address, and the
 * catalogue stays the one list of calculators.
 */
export function findToolByRoute(route: string): Tool | undefined {
  const clean = route.replace(/\/+$/, "") || "/";
  return CONSTRUCTION_TOOLS.find((t) => t.to === clean);
}

/** True when the tool is offered in this market (blank/unknown: offered). */
export function toolOfferedInMarket(
  tool: Pick<Tool, "markets">,
  marketCode: string | null | undefined,
): boolean {
  const markets = tool.markets;
  if (!markets || markets.length === 0) return true;
  const code = (marketCode ?? "").trim().toUpperCase();
  if (!code) return true;
  return markets.some((market) => market.toUpperCase() === code);
}

/** The catalogue a visitor in this market should be shown. */
export function toolsOfferedInMarket<T extends Pick<Tool, "markets">>(
  tools: T[],
  marketCode: string | null | undefined,
): T[] {
  return tools.filter((tool) => toolOfferedInMarket(tool, marketCode));
}
