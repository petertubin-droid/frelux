import type { LucideIcon } from "lucide-react";
import {
  Building2,
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
    engineId: "foundation",
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
    status: "divergent",
    route: "/screeding-calculator",
    label: "Screeding system engine (different model)",
    icon: Layers,
    evidence: {
      module: "@/lib/calc",
      fn: "calculateScreedingSystem",
      page: "src/pages/ScreedingCalculator.tsx",
      calledBy:
        "no page calls it; ScreedingCalculator uses the per-kilogram material model instead",
    },
    note: "The engine works in bags per system config. ScreedingCalculator works per kilogram from the material table, where coverage is m2 per kg. Both are correct in their own convention.",
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
    status: "none",
    route: null,
    label: "Tyrolene system",
    icon: Layers,
    note: "Registered and tested, with no page that runs it.",
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
    status: "none",
    route: null,
    label: "Project Timeline (separate logic)",
    icon: CalendarDays,
    note: "A timeline page exists, but its maths is its own and the engine is never executed.",
  },
  {
    engineId: "sequence_planner",
    status: "none",
    route: null,
    label: "Work sequence planner",
    icon: ListChecks,
    note: "Registered and tested, with no page that runs it.",
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
