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
  /** A page runs this engine for the user. */
  | "live"
  /** A page covers the same question with its own code; the engine is not wired to it. */
  | "duplicated"
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
    status: "duplicated",
    route: "/paint-calculator",
    label: "Paint Calculator (own wall-area code)",
    icon: Paintbrush,
    note: "The paint calculator computes wall area itself, so the registry engine is never called from the UI.",
  },
  {
    engineId: "painting_project",
    status: "duplicated",
    route: "/paint-calculator",
    label: "Paint Calculator (own project code)",
    icon: Paintbrush,
    note: "Project-wide paint planning exists on the page, but through its own logic rather than this engine.",
  },
  {
    engineId: "screeding_system",
    status: "duplicated",
    route: "/screeding-calculator",
    label: "Screeding Calculator (own mix code)",
    icon: Layers,
    note: "Screeding bags and mix are worked out by the calculator itself.",
  },
  {
    engineId: "tyrolene_partition_area",
    status: "duplicated",
    route: "/tyrolene-estimator",
    label: "Tyrolene Estimator (own area code)",
    icon: Layers,
    note: "Partition area and material for tyrolene, computed outside the engine.",
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
    status: "duplicated",
    route: "/roof-framing-calculator",
    label: "Roof Framing Calculator (own geometry)",
    icon: Home,
    note: "Roof area and framing come from the page's own geometry code.",
  },
  {
    engineId: "margin_calculator",
    status: "duplicated",
    route: "/margin-calculator",
    label: "Margin Calculator (own margin code)",
    icon: Percent,
    note: "Margins are computed on the page without calling the engine.",
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
    duplicated: ENGINE_SURFACES.filter((s) => s.status === "duplicated"),
    none: ENGINE_SURFACES.filter((s) => s.status === "none"),
  };
}

export const SURFACE_STATUS_LABELS: Record<EngineSurfaceStatus, string> = {
  live: "Wired to a page",
  duplicated: "Page exists, engine not called",
  none: "No UI",
};

export const CalculatorFallbackIcon = Calculator;
