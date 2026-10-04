import type { LucideIcon } from "lucide-react";
import {
  Paintbrush,
  Square,
  Layers,
  Grid3x3,
  Building2,
  Footprints,
  Umbrella,
  Landmark,
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
} from "lucide-react";

/**
 * FRELUX Construction Tools registry.
 *
 * The single authoritative catalogue of user-facing tools. The public
 * Construction Tools page, the navbar dropdown and the admin search all
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
    id: "project",
    label: "Project & Cost",
    blurb: "Budgets, BOQs, labour, timelines and long-term cost planning.",
  },
  {
    id: "ai",
    label: "AI Assistants",
    blurb: "Photo, chat and vision assistants that feed the same engines.",
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
  /** Visible on the navbar mega-menu (popular tools only). */
  navVisible?: boolean;
}

export const CONSTRUCTION_TOOLS: Tool[] = [
  // ---------------------------------------------------------------- finishes
  {
    slug: "paint",
    title: "Paint Calculator",
    category: "finishes",
    icon: Paintbrush,
    does: "Calculate the paint buckets, material cost and full project estimate for any room, house, exterior or fence.",
    enters:
      "Room or wall dimensions, doors and windows, paint type, coats and surface condition.",
    gets: "Exact buckets to buy (walls and ceiling separately), material cost and a shareable estimate.",
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
    to: "/paint-comparison",
    navVisible: false,
  },
  {
    slug: "screeding",
    title: "Wall Screeding",
    category: "finishes",
    icon: Square,
    does: "Calculate screeding material quantities and cost for smooth wall finishes.",
    enters: "Wall area and thickness, or room dimensions.",
    gets: "Bags of screeding, putty and finishing materials with total cost.",
    to: "/screeding-calculator",
    benefit: "Quantity & cost",
    navVisible: true,
  },
  {
    slug: "finish",
    title: "Finish Comparison",
    category: "finishes",
    icon: Building2,
    does: "Compare painting, Tyrolene and Grafitex finishes side by side for the same walls.",
    enters: "Wall area and the finishes you are considering.",
    gets: "Material quantities and total cost per finish, so you can choose confidently.",
    to: "/finish-estimator",
    benefit: "Tyrolene · Grafitex",
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
    to: "/pop-ceiling-calculator",
    benefit: "Materials & cost",
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
    to: "/tile-calculator",
    benefit: "Boxes · Adhesive · Cost",
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
    to: "/flooring",
    navVisible: false,
  },
  {
    slug: "waterproofing",
    title: "Waterproofing",
    category: "finishes",
    icon: Umbrella,
    does: "Calculate waterproofing membranes and coatings for roofs, bathrooms and tanks.",
    enters: "Area to waterproof and the waterproofing system.",
    gets: "Membrane rolls, coating litres and total cost.",
    to: "/waterproofing",
    navVisible: false,
  },

  // ---------------------------------------------------------------- structure
  {
    slug: "build-to-roof",
    title: "Build-to-Roof Estimator",
    category: "structure",
    icon: Landmark,
    does: "Calculate every major material from foundation through roof in one run: blocks, concrete, steel, roofing and more.",
    enters: "Building size, number of floors and finishing level.",
    gets: "A complete material schedule and cost for the whole structure.",
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
    to: "/structural-calculator",
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
    to: "/foundation-calculator",
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
    to: "/foundation",
    navVisible: false,
  },
  {
    slug: "reinforcement",
    title: "Reinforcement / Steel",
    category: "structure",
    icon: BarChart3,
    does: "Calculate rebar quantities, weights and binding wire for structural elements.",
    enters: "Element type and dimensions, bar spacing.",
    gets: "Lengths and tonnage of steel needed, with cost.",
    to: "/reinforcement",
    navVisible: false,
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
    to: "/solar-pv-estimator",
    benefit: "Panels · Batteries · Cost",
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
    to: "/generator",
    navVisible: false,
  },
  {
    slug: "heat-comfort",
    title: "Heat & Comfort",
    category: "services",
    icon: Thermometer,
    does: "Analyse how hot your building will get and what improves comfort.",
    enters: "Roof, wall and orientation details.",
    gets: "Comfort score and practical cooling recommendations.",
    to: "/heat-comfort",
    navVisible: false,
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
    to: "/margin-calculator",
    navVisible: false,
  },
  {
    slug: "cash-flow",
    title: "Cash-Flow Timeline",
    category: "project",
    icon: Wallet,
    does: "Plan when money comes in and goes out across construction stages.",
    enters: "Project cost, stage schedule and payment terms.",
    gets: "A monthly cash-flow timeline so you never run dry mid-project.",
    to: "/cash-flow-timeline",
    navVisible: false,
  },
  {
    slug: "regional-index",
    title: "Regional Cost Index",
    category: "project",
    icon: Globe,
    does: "See how construction costs differ across Nigerian states.",
    enters: "Your state and project type.",
    gets: "Local price index to adjust any estimate to your region.",
    to: "/regional-cost-index",
    navVisible: false,
  },
  {
    slug: "timeline",
    title: "Project Timeline",
    category: "project",
    icon: CalendarDays,
    does: "Build a realistic construction schedule from foundation to finishing.",
    enters: "Project scope and start date.",
    gets: "Stage-by-stage timeline with durations and milestones.",
    to: "/project-timeline",
    navVisible: false,
  },
  {
    slug: "sequence",
    title: "Construction Sequence",
    category: "project",
    icon: ListChecks,
    does: "See the correct order of construction activities for your project type.",
    enters: "Project type and scope.",
    gets: "A step-by-step build sequence guide.",
    to: "/construction-sequence",
    navVisible: false,
  },
  {
    slug: "maintenance",
    title: "Maintenance Planner",
    category: "project",
    icon: Wrench,
    does: "Plan and cost long-term building maintenance before problems start.",
    enters: "Building components and their ages.",
    gets: "A maintenance schedule with expected annual cost.",
    to: "/maintenance-planner",
    navVisible: false,
  },
  {
    slug: "warranty",
    title: "Warranty Certificate",
    category: "project",
    icon: ShieldCheck,
    does: "Issue professional warranty certificates for completed work.",
    enters: "Project details, scope and warranty period.",
    gets: "A verifiable warranty certificate for your client.",
    to: "/warranty-certificate",
    navVisible: false,
  },
  {
    slug: "contractor-credit",
    title: "Contractor Credit",
    category: "project",
    icon: BadgeCheck,
    does: "Check and build your contractor credit profile with FRELUX.",
    enters: "Your project history and trade references.",
    gets: "A credit rating you can share with clients and suppliers.",
    to: "/contractor-credit",
    navVisible: false,
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
    does: "Describe any construction project in plain language and get an AI-assisted estimate.",
    enters:
      "A sentence like: 3-bedroom bungalow in Abuja, tiling and painting.",
    gets: "Material quantities, line items and cost from the FRELUX engines.",
    to: "/smart-calculator",
    benefit: "AI-powered · Free",
    featured: true,
    navVisible: true,
  },
  {
    slug: "conversational",
    title: "Conversational Estimator",
    category: "ai",
    icon: MessageCircle,
    does: "Build an estimate step by step by chatting, like WhatsApp.",
    enters: "Your project details, one message at a time.",
    gets: "A full estimate assembled from your answers.",
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
    to: "/color-preview",
    navVisible: false,
  },
  {
    slug: "surface-assessment",
    title: "Surface Assessment",
    category: "ai",
    icon: ClipboardCheck,
    does: "Assess a surface condition before painting or screeding so you buy the right prep materials.",
    enters: "Photos and details of the surface.",
    gets: "Surface condition rating and preparation requirements.",
    to: "/surface-assessment",
    navVisible: false,
  },
  {
    slug: "estimate-refresh",
    title: "Estimate Refresh",
    category: "ai",
    icon: RefreshCw,
    does: "Bring an old estimate up to today's prices.",
    enters: "A saved FRELUX estimate.",
    gets: "The same estimate recalculated with current prices.",
    to: "/estimate-refresh",
    navVisible: false,
  },

  // ---------------------------------------------------------------- pro
  {
    slug: "bim-ifc",
    title: "BIM / IFC Import",
    category: "pro",
    icon: Box,
    does: "Import architectural models and extract quantities automatically.",
    enters: "An IFC model file from your architect.",
    gets: "Room areas, wall lengths and material take-offs.",
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
    to: "/material-prices",
    navVisible: false,
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
