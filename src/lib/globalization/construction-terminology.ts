/**
 * Market-specific labels for construction operations.
 *
 * Keep these presentation labels separate from operation IDs, routes and
 * persisted calculation types. Only add a market-specific name when the
 * same work is described by the term; otherwise callers use a neutral label.
 */
export type ConstructionOperation =
  | "board_material"
  | "wall_finishing"
  | "reinforcement"
  | "temporary_concrete_support";

export type TerminologyMarket = "US" | "GB" | "NG";

export const CONSTRUCTION_TERMINOLOGY: Readonly<
  Record<ConstructionOperation, Readonly<Record<TerminologyMarket, string>>>
> = {
  board_material: {
    US: "Drywall",
    GB: "Plasterboard",
    NG: "Gypsum Board / Ceiling Sheet",
  },
  // The US calculator measures full wall area. “Mudding” alone can imply
  // joint-only taping, so the label makes the full-surface skim-coat scope clear.
  wall_finishing: {
    US: "Wall Mudding / Skim Coating",
    GB: "Wall Skimming",
    NG: "Wall Screeding",
  },
  reinforcement: {
    US: "Rebar",
    GB: "Reinforcement Bar",
    NG: "Iron Rods",
  },
  temporary_concrete_support: {
    US: "Formwork",
    GB: "Shuttering",
    NG: "Wood Boarding / Carpentry Box",
  },
};

/** Display copy for high-visibility tool listings. Stable slugs and URLs remain unchanged. */
export interface MarketToolCopy {
  title: string;
  does: string;
  enters: string;
  gets: string;
}

const MARKET_TOOL_COPY: Readonly<
  Partial<Record<string, Partial<Record<TerminologyMarket, MarketToolCopy>>>>
> = {
  screeding: {
    US: {
      title: "Wall Mudding / Skim Coat",
      does: "Estimate full-wall skim-coat materials and costs. This is an area-based skim-coat estimate, not joint-only drywall taping.",
      enters: "Wall area and finish thickness, or room dimensions.",
      gets: "Estimated skim-coat materials and costs, using the configured market data available.",
    },
    GB: {
      title: "Wall Skimming",
      does: "Estimate wall-skimming material quantities and costs for smooth wall finishes.",
      enters: "Wall area and finish thickness, or room dimensions.",
      gets: "Estimated skimming materials and costs, using the configured market data available.",
    },
    NG: {
      title: "Wall Screeding",
      does: "Calculate screeding material quantities and cost for smooth wall finishes.",
      enters: "Wall area and thickness, or room dimensions.",
      gets: "Bags of screeding, putty and finishing materials with total cost.",
    },
  },
  reinforcement: {
    US: {
      title: "Rebar Calculator",
      does: "Calculate reinforcement quantities, weights and binding wire for structural elements.",
      enters: "Element type and dimensions, bar spacing.",
      gets: "Rebar lengths and tonnage, with cost where market prices are configured.",
    },
    GB: {
      title: "Reinforcement Bar Calculator",
      does: "Calculate reinforcement quantities, weights and binding wire for structural elements.",
      enters: "Element type and dimensions, bar spacing.",
      gets: "Reinforcement bar lengths and tonnage, with cost where market prices are configured.",
    },
    NG: {
      title: "Iron Rod Calculator",
      does: "Calculate iron rod quantities, weights and binding wire for structural elements.",
      enters: "Element type and dimensions, bar spacing.",
      gets: "Iron rod lengths and tonnage, with cost where market prices are configured.",
    },
  },
};

const NEUTRAL_TOOL_COPY: Readonly<Record<string, Partial<MarketToolCopy>>> = {
  screeding: {
    title: "Wall Finishing",
    does: "Estimate material quantities and costs for smooth wall finishes.",
    enters: "Wall area and finish thickness, or room dimensions.",
    gets: "Estimated wall-finishing materials and costs, where market data is configured.",
  },
  reinforcement: {
    title: "Reinforcement / Steel",
    does: "Calculate reinforcement quantities, weights and binding wire for structural elements.",
    enters: "Element type and dimensions, bar spacing.",
    gets: "Reinforcement lengths and tonnage, with cost where market prices are configured.",
  },
};

export function getConstructionTerm(
  operation: ConstructionOperation,
  marketCode: string,
  fallback?: string,
): string {
  const term =
    CONSTRUCTION_TERMINOLOGY[operation][
      marketCode.toUpperCase() as TerminologyMarket
    ];
  if (term) return term;
  if (fallback) return fallback;
  return operation.replace(/_/g, " ");
}

export function getMarketToolCopy<T extends MarketToolCopy>(
  slug: string,
  marketCode: string,
  base: T,
): T {
  const code = marketCode.toUpperCase() as TerminologyMarket;
  const local = MARKET_TOOL_COPY[slug]?.[code];
  const neutral = NEUTRAL_TOOL_COPY[slug];
  return { ...base, ...(local ?? neutral ?? {}) };
}

/** Resolve labels in shared navigation by their stable path, not display text. */
export function getMarketNavigationLabel(
  path: string,
  marketCode: string,
  fallback: string,
): string {
  const operation =
    path === "/screeding-calculator"
      ? "screeding"
      : path === "/reinforcement"
        ? "reinforcement"
        : null;
  if (!operation) return fallback;

  const localized = getMarketToolCopy(operation, marketCode, {
    title: fallback,
    does: "",
    enters: "",
    gets: "",
  }).title;
  // Keep the navigation item's role (calculator vs cost estimator) while
  // replacing only its market-dependent trade name.
  const suffix = fallback.match(/( Cost Estimator| Calculator)$/)?.[0] ?? "";
  const baseTerm = suffix ? fallback.slice(0, -suffix.length) : fallback;
  const isAlreadyComplete = localized
    .toLowerCase()
    .endsWith(suffix.toLowerCase());
  if (!suffix || isAlreadyComplete) return localized;
  if (baseTerm === "Screeding Cost Estimator")
    return `${localized} Cost Estimator`;
  return `${localized}${suffix}`;
}
