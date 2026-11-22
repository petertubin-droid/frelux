import type { LucideIcon } from "lucide-react";
import {
  Blinds,
  Building2,
  ClipboardCheck,
  Calculator,
  CalendarDays,
  Coins,
  Droplets,
  Grid3x3,
  Home,
  Landmark,
  Layers,
  ListChecks,
  Paintbrush,
  Percent,
  Ruler,
  Zap,
  LayoutList,
  Boxes,
} from "lucide-react";

/**
 * Where each registered engine is reachable in the product.
 *
 * This is authored, not inferred. Tracing imports produced answers that were
 * wrong in both directions: shared registries made every admin page look like a
 * surface, and engines executed only by tests looked reachable. So each entry
 * is a reviewed statement, and a test fails when a registered engine has no
 * entry here. Adding an engine now forces the question "where does a person
 * actually use this".
 */
export type EngineSurfaceStatus =
  /** A page runs this engine's function for the user. */
  | "live"
  /**
   * The engine wraps a function, and a page calls that same function directly
   * instead of going through executeEngine. One implementation, two entry
   * points, so the numbers cannot disagree.
   */
  | "shared"
  /**
   * The trade is served by a different data model, not a second copy of the
   * same arithmetic. Rewiring would change outputs, so it needs its own
   * decision rather than a quiet swap.
   */
  | "divergent"
  /** No user-facing entry point exists. */
  | "none";

export interface EngineSurface {
  engineId: string;
  status: EngineSurfaceStatus;
  /** Route the user can open, when one exists. */
  route: string | null;
  /** How the surface is labelled in the product. */
  label: string;
  icon: LucideIcon;
  /** Function and module that carry the arithmetic, for the traced states. */
  evidence?: { module: string; fn: string; page: string; calledBy: string };
  /** Plain sentence: what runs, or what is missing. */
  note: string;
}

export const ENGINE_SURFACES: EngineSurface[] = [
  {
    engineId: "window_blinds",
    status: "live",
    route: "/window-blind-calculator",
    label: "Window Blind Estimator",
    icon: Blinds,
    evidence: {
      module: "src/lib/estimation/window-blinds-engine.ts",
      fn: "calculateBlindProject",
      page: "src/pages/WindowBlindsEstimator.tsx",
      calledBy: "WindowBlindsEstimator",
    },
    note: "Per window and per job blind prices from measured openings, with the market minimum, waste and grade applied.",
  },
  {
    engineId: "build_to_roof",
    status: "live",
    route: "/build-to-roof-estimator",
    label: "Build-to-Roof Estimator",
    icon: Building2,
    note: "Whole-building quantities and cost from the authoritative engine.",
  },
  {
    engineId: "electrical",
    status: "live",
    route: "/electrical",
    label: "Electrical Estimator",
    icon: Zap,
    note: "Circuits, conduit and points priced through the electrical engine.",
  },
  {
    engineId: "plumbing",
    status: "live",
    route: "/plumbing",
    label: "Plumbing Estimator",
    icon: Droplets,
    note: "Pipe runs, fittings and sanitary ware priced through the plumbing engine.",
  },
  {
    engineId: "foundation_below_dpc",
    status: "live",
    route: "/foundation",
    label: "Foundation Estimator",
    icon: Landmark,
    note: "Footing and foundation takeoff from the foundation engine.",
  },
  {
    engineId: "reinforcement",
    status: "live",
    route: "/reinforcement",
    label: "Reinforcement Calculator",
    icon: Ruler,
    note: "Steel bar schedules and weights from the reinforcement engine.",
  },
  {
    engineId: "doors_windows",
    status: "live",
    route: "/doors-windows",
    label: "Doors and Windows",
    icon: Home,
    note: "Opening schedules and component quantities.",
  },
  {
    engineId: "foundation_calculator",
    status: "live",
    route: "/foundation-calculator",
    label: "Foundation Calculator",
    icon: Landmark,
    note: "Footing and foundation quantities from the foundation engine.",
  },
  {
    engineId: "structural_calculator",
    status: "live",
    route: "/structural-calculator",
    label: "Structural Calculator",
    icon: Ruler,
    note: "Member sizing and structural quantities.",
  },
  {
    engineId: "pop_ceiling",
    status: "live",
    route: "/pop-ceiling-calculator",
    label: "POP Ceiling Calculator",
    icon: Layers,
    note: "Ceiling area, board and framing priced for the selected market.",
  },
  {
    engineId: "tile_estimate",
    status: "live",
    route: "/tile-calculator",
    label: "Tile Calculator",
    icon: Grid3x3,
    note: "Tile and adhesive quantities, with wastage.",
  },
  {
    engineId: "regional_cost",
    status: "live",
    route: "/regional-cost-index",
    label: "Regional Cost Index",
    icon: Coins,
    note: "Cost differences between markets and regions.",
  },
  {
    engineId: "paint",
    status: "shared",
    route: "/paint-calculator",
    label: "Paint Calculator (litres and buckets)",
    icon: Paintbrush,
    evidence: {
      module: "@/lib/estimation/paint-engine",
      fn: "calculateTheoreticalLitres",
      page: "src/pages/PaintCalculator.tsx",
      calledBy:
        "the paint calculator imports paint-engine; the bucket conversion comes from painting-engine's litresToBuckets, which PaintingEstimator reaches through calculatePaintingProject",
    },
    note: "Theoretical litres for an area and coat count, plus the whole buckets a buyer pays for.",
  },
  {
    engineId: "drywall",
    status: "shared",
    route: "/drywall-calculator",
    label: "Drywall Calculator",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/drywall-standalone-engine",
      fn: "calculateDrywallTakeoff",
      page: "src/pages/StandaloneTakeoffPage.tsx",
      calledBy: "the drywall tab calls the same function",
    },
    note: "Boards, studs, track, screws, tape and compound for a partition.",
  },
  {
    engineId: "plaster_render",
    status: "shared",
    route: "/plaster-render-calculator",
    label: "Plaster & Render Calculator",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/plaster-render-engine",
      fn: "calculatePlasterRender",
      page: "src/pages/PlasterRenderCalculator.tsx",
      calledBy: "the page calls the same function with its own form values",
    },
    note: "Gypsum, exterior render and Tyrolene layers with bags, mesh and beads, priced per market pack.",
  },
  {
    engineId: "insulation",
    status: "shared",
    route: "/insulation-calculator",
    label: "Insulation Calculator",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/insulation-standalone-engine",
      fn: "calculateInsulationTakeoff",
      page: "src/pages/StandaloneTakeoffPage.tsx",
      calledBy: "the insulation tab calls the same function",
    },
    note: "Area, installed volume and packs for a wall, floor or ceiling.",
  },
  {
    engineId: "retaining_wall",
    status: "live",
    route: "/retaining-wall-calculator",
    label: "Retaining Wall Estimator",
    icon: Building2,
    evidence: {
      module: "@/lib/estimation/retaining-wall-engine",
      fn: "calculateRetainingWall",
      page: "src/pages/RetainingWallEstimator.tsx",
      calledBy:
        "the estimator calls the same function with the same default rules",
    },
    note: "Concrete, blockwork and backfill for a retaining wall, with the footing width the engine recommends for the soil.",
  },
  {
    engineId: "temporary_works",
    status: "shared",
    route: "/temporary-works-calculator",
    label: "Temporary Works Calculator",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/temporary-works-standalone-engine",
      fn: "calculateTemporaryWorksTakeoff",
      page: "src/pages/StandaloneTakeoffPage.tsx",
      calledBy: "the temporary works tab calls the same function",
    },
    note: "Formwork sheets after reuse and the scaffold member counts for a run.",
  },
  {
    engineId: "waterproofing",
    status: "live",
    route: "/waterproofing",
    label: "Waterproofing Estimator",
    icon: Droplets,
    evidence: {
      module: "@/lib/estimation/waterproofing-engine",
      fn: "calculateWaterproofing",
      page: "src/pages/WaterproofingEstimator.tsx",
      calledBy:
        "the estimator calls the same function with the same default rules",
    },
    note: "DPC, DPM and wet-area coatings with corner tape, from the engine's own rules.",
  },
  {
    engineId: "soffit_gutter",
    status: "live",
    route: "/rainwater-gutter-soffit-cost-estimator",
    label: "Rainwater Gutter and Soffit Estimator",
    icon: Home,
    evidence: {
      module: "@/lib/estimation/soffit-gutter-engine",
      fn: "calculateSoffitGutter",
      page: "src/pages/SoffitGutterEstimator.tsx",
      calledBy:
        "the estimator calls the same function with the same default rules",
    },
    note: "Gutter run, fascia and downpipes from a footprint or a measured perimeter.",
  },
  {
    engineId: "masonry",
    status: "shared",
    route: "/masonry-calculator",
    label: "Standalone Takeoff (masonry)",
    icon: Boxes,
    evidence: {
      module: "@/lib/estimation/masonry-standalone-engine",
      fn: "calculateMasonryTakeoff",
      page: "src/pages/StandaloneTakeoffPage.tsx",
      calledBy: "the masonry tab calls the same function this adapter wraps",
    },
    note: "Blocks, mortar, cement and sand for a wall, using the market's own unit profile.",
  },
  {
    engineId: "concrete_volume",
    status: "none",
    route: null,
    label: "Concrete Volume (auditable contract)",
    icon: Layers,
    note: "No user-facing entry point yet. This is the globalization module's auditable concrete volume calculation, available to the calculations API and to Engine Studio for verification.",
  },
  {
    engineId: "icf_wall",
    status: "live",
    route: "/icf-wall-estimator",
    label: "ICF Wall Calculator",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/icf-engine",
      fn: "calculateIcfWall",
      page: "src/pages/IcfWallEstimator.tsx",
      calledBy: "the ICF calculator calls the same function",
    },
    note: "Blocks, core concrete and vertical reinforcement for an insulated concrete form wall.",
  },
  {
    engineId: "concrete_takeoff",
    status: "live",
    route: "/concrete-takeoff-calculator",
    label: "Concrete Takeoff Calculator",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/advanced-takeoff-engine",
      fn: "calculateConcreteTakeoff",
      page: "src/pages/ConcreteTakeoffPage.tsx",
      calledBy: "the takeoff calculator calls the same function",
    },
    note: "Volume, cement bags, sand and aggregate for one concrete element.",
  },
  {
    engineId: "steel_beam",
    status: "live",
    route: "/structural-steel-i-beam-calculator",
    label: "Structural Steel I-Beam Calculator",
    icon: Ruler,
    evidence: {
      module: "@/lib/estimation/steel-beam-engine",
      fn: "calculateSteelBeam",
      page: "src/pages/StructuralSteelCalculator.tsx",
      calledBy:
        "the steel calculator calls the same function this adapter wraps",
    },
    note: "Section mass and tonnage per beam run, from the published profiles.",
  },
  {
    engineId: "foundation",
    status: "live",
    route: "/foundation-calculator",
    label: "Foundation Calculator",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/foundation-engine",
      fn: "calculateFoundation",
      page: "src/pages/FoundationCalculator.tsx",
      calledBy:
        "the foundation page calls the same function this adapter wraps",
    },
    note: "Concrete, blockwork, hardcore and formwork below DPC, using the engine's own rules.",
  },
  {
    engineId: "plastering_wall",
    status: "live",
    route: "/plastering-calculator",
    label: "Plastering Calculator",
    icon: Paintbrush,
    evidence: {
      module: "@/lib/estimation/plastering-standalone-engine",
      fn: "calculatePlasteringTakeoff",
      page: 'src/pages/StandaloneTakeoffPage.tsx (initialEngine="plastering")',
      calledBy:
        "StandaloneTakeoffPage calls the same function the adapter wraps",
    },
    note: "Cement bags, sand volume and water for a rendered wall, straight from the plastering engine.",
  },
  {
    engineId: "painting_wall_area",
    status: "shared",
    route: "/paint-calculator",
    label: "Paint Calculator (shared wall-area code)",
    icon: Paintbrush,
    evidence: {
      module: "@/lib/estimation/paint-engine",
      fn: "calculateWallArea",
      page: "src/pages/PaintCalculator.tsx",
      calledBy: "calculateRoom in the same module, which PaintCalculator calls",
    },
    note: "PaintCalculator calls calculateRoom, which uses the same calculateWallArea this engine wraps. One formula, two entry points.",
  },
  {
    engineId: "painting_project",
    status: "shared",
    route: "/paint-calculator",
    label: "Paint Calculator (shared project code)",
    icon: Paintbrush,
    evidence: {
      module: "@/lib/calc",
      fn: "calculatePaint",
      page: "src/pages/PaintCalculator.tsx",
      calledBy: "called directly by PaintCalculator",
    },
    note: "PaintCalculator calls the same calculatePaint this engine wraps, so project planning and the engine cannot disagree.",
  },
  {
    engineId: "screeding_system",
    status: "shared",
    route: "/screeding-calculator?mode=cost",
    label: "Screeding Cost Estimator (shared system code)",
    icon: Layers,
    evidence: {
      module: "@/lib/calc",
      fn: "calculateScreedingSystem",
      page: "src/pages/ScreedingCostEstimator.tsx",
      calledBy:
        "called directly by ScreedingCostEstimator on the cost estimate tab",
    },
    note: "ScreedingCostEstimator calls calculateScreedingSystem directly to compute system coats, bags, and material cost based on market config.",
  },
  {
    engineId: "takeoff",
    status: "live",
    route: "/contractor/projects/:id",
    label: "Takeoff studio (project tab)",
    icon: LayoutList,
    evidence: {
      module: "@/lib/takeoff/engine",
      fn: "runTakeoff",
      page: "src/components/contractor/TakeoffTab.tsx",
      calledBy:
        "TakeoffTab inside ProjectDashboard, and the API engine 'takeoff'",
    },
    note: "Measures rooms, walls, openings and floors, then derives the bill. The same function answers the studio and the commercial API, so the two cannot disagree.",
  },
  {
    engineId: "tyrolene_partition_area",
    status: "shared",
    route: "/tyrolene-estimator",
    label: "Tyrolene Estimator (shared area code)",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/tyrolene-engine",
      fn: "calculatePartitionArea",
      page: "src/pages/TyroleneEstimator.tsx",
      calledBy:
        "calculateTyroleneProject in the same module, which TyroleneEstimator calls",
    },
    note: "TyroleneEstimator calls calculateTyroleneProject, which uses this same calculatePartitionArea. One formula, two entry points.",
  },
  {
    engineId: "tyrolene_system",
    status: "shared",
    route: "/tyrolene-estimator",
    label: "Tyrolene Estimator (material quantities)",
    icon: Layers,
    evidence: {
      module: "@/lib/estimation/tyrolene-engine",
      fn: "calculateTyroleneProject",
      page: "src/pages/TyroleneEstimator.tsx",
      calledBy:
        "calculateTyroleneProject in tyrolene-engine, called by TyroleneEstimator",
    },
    note: "TyroleneEstimator runs calculateTyroleneProject for quantities and pricing, which this engine wraps for the registry.",
  },
  {
    engineId: "roof_geometry",
    status: "shared",
    route: "/build-to-roof-estimator",
    label: "Build to Roof Estimator (shared roof geometry)",
    icon: Home,
    evidence: {
      module: "@/lib/estimation/build-to-roof-engine",
      fn: "calculateRoofArea",
      page: "src/pages/BuildToRoofEstimator.tsx",
      calledBy:
        "calculateBuildToRoof in the same module, which BuildToRoofEstimator calls",
    },
    note: "BuildToRoofEstimator calls calculateBuildToRoof, which uses this same calculateRoofArea. The roof framing page covers member design instead.",
  },
  {
    engineId: "margin_calculator",
    status: "shared",
    route: "/margin-calculator",
    label: "Margin Calculator (shared margin code)",
    icon: Percent,
    evidence: {
      module: "@/lib/estimation/margin-engine",
      fn: "calculateMargin",
      page: "src/pages/MarginCalculator.tsx",
      calledBy: "called directly by MarginCalculator",
    },
    note: "MarginCalculator calls the same calculateMargin this engine wraps, so the two cannot drift.",
  },
  {
    engineId: "timeline_estimator",
    status: "shared",
    route: "/project-timeline",
    label: "Project Timeline (climate-aware schedule)",
    icon: CalendarDays,
    evidence: {
      module: "@/lib/engineering/timeline-estimator",
      fn: "estimateTimeline",
      page: "src/pages/ProjectTimeline.tsx",
      calledBy: "called directly by ProjectTimeline",
    },
    note: "ProjectTimeline calls estimateTimeline, which this AI adapter wraps for the canonical engine registry.",
  },
  {
    engineId: "quote_check",
    status: "live",
    route: "/quote-check",
    label: "Quote Check",
    icon: ClipboardCheck,
    note: "QuoteCheckPage runs checkQuote on every keystroke. Reference rates come from the market price book, and a line with no rate is never given a verdict.",
  },
  {
    engineId: "sequence_planner",
    status: "shared",
    route: "/construction-sequence",
    label: "Construction Sequence Planner",
    icon: ListChecks,
    evidence: {
      module: "@/lib/engineering/sequence-planner",
      fn: "generateSequencePlan",
      page: "src/pages/ConstructionSequence.tsx",
      calledBy: "called directly by ConstructionSequence",
    },
    note: "ConstructionSequence runs generateSequencePlan with active market code, which this AI adapter wraps for the engine registry.",
  },
];

export function surfaceFor(engineId: string): EngineSurface | null {
  return ENGINE_SURFACES.find((s) => s.engineId === engineId) ?? null;
}

export function surfacesByStatus(): Record<
  EngineSurfaceStatus,
  EngineSurface[]
> {
  return {
    live: ENGINE_SURFACES.filter((s) => s.status === "live"),
    shared: ENGINE_SURFACES.filter((s) => s.status === "shared"),
    divergent: ENGINE_SURFACES.filter((s) => s.status === "divergent"),
    none: ENGINE_SURFACES.filter((s) => s.status === "none"),
  };
}

export const SURFACE_STATUS_LABELS: Record<EngineSurfaceStatus, string> = {
  live: "Wired to a page",
  shared: "Same function, page calls it directly",
  divergent: "Different model, same trade",
  none: "No UI",
};

export const CalculatorFallbackIcon = Calculator;
