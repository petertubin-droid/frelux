/**
 * Market-aware construction vocabulary for public display surfaces.
 *
 * This is presentation-only: routes, calculator IDs, analytics, saved project
 * types and calculation logic remain stable. Specific local terms are limited
 * to terms already curated in the market profiles or construction dictionary.
 * Every other market uses clear neutral English instead of a guessed synonym.
 */
export type ConstructionOperation =
  | "board_material"
  | "wall_finishing"
  | "reinforcement"
  | "temporary_concrete_support";

export const TERMINOLOGY_MARKETS = [
  "NG",
  "US",
  "GB",
  "CA",
  "AU",
  "DE",
  "IN",
  "GH",
  "KE",
  "ZA",
  "JP",
  "FR",
  "BR",
  "SA",
  "AE",
  "CN",
  "ID",
  "MX",
  "KR",
  "IT",
  "ET",
  "EG",
  "TZ",
  "CI",
  "ES",
  "NL",
  "PL",
  "SE",
  "CH",
  "SG",
  "TR",
  "NZ",
] as const;
export type TerminologyMarket = (typeof TERMINOLOGY_MARKETS)[number];

const NEUTRAL_TERMS: Readonly<Record<ConstructionOperation, string>> = {
  board_material: "Gypsum Board",
  wall_finishing: "Wall Finishing",
  reinforcement: "Reinforcement Steel",
  temporary_concrete_support: "Formwork",
};

/**
 * Local variants are included only where FRELUX already has terminology in
 * market profiles or its curated construction dictionary. Product names such
 * as a bag size are not treated as trade names. Missing entries intentionally
 * resolve to the neutral label above.
 */
const MARKET_TERMS: Readonly<
  Partial<
    Record<ConstructionOperation, Partial<Record<TerminologyMarket, string>>>
  >
> = {
  board_material: {
    NG: "Gypsum Board / Ceiling Sheet",
    US: "Drywall",
    GB: "Plasterboard",
    CA: "Drywall",
    AU: "Plasterboard",
    DE: "Gipskartonplatte",
    ZA: "Rhinoboard / Gypsum Board",
    ID: "Papan Gipsum",
    MX: "Panel de yeso",
    KR: "Gypsum Board (석고보드)",
    IT: "Cartongesso",
    ES: "Placa de yeso laminado",
    NL: "Gipsplaat",
    PL: "Płyta gipsowo-kartonowa",
    SE: "Gipsskiva",
    CH: "Gipsplatte",
    TR: "Alçıpan",
    NZ: "GIB / Plasterboard",
  },
  wall_finishing: {
    NG: "Wall Screeding",
    US: "Wall Mudding / Skim Coating",
    GB: "Wall Skimming",
    // The remaining markets retain this calculator's neutral wall-area scope.
    // Their configured material names do not by themselves prove equivalent
    // trade scopes (e.g. floor screed vs wall plaster, or jointing vs skim coat).
  },
  reinforcement: {
    NG: "Iron Rods",
    US: "Rebar",
    GB: "Reinforcement Bar",
    CA: "Rebar",
    AU: "Reinforcing Bar",
    JP: "Reinforcing Bar (鉄筋)",
    FR: "Reinforcing Steel (Armature)",
    BR: "Reinforcing Bar (Vergalhão)",
    SA: "Reinforcing Steel (حديد التسليح)",
    AE: "Reinforcing Steel (حديد التسليح)",
  },
  temporary_concrete_support: {
    NG: "Wood Boarding / Carpentry Box",
    US: "Formwork",
    GB: "Shuttering",
    DE: "Formwork (Schalung)",
    JP: "Formwork (型枠)",
    FR: "Formwork (Coffrage)",
    BR: "Formwork (Fôrma)",
    SA: "Formwork (شدات)",
    AE: "Formwork (شدات)",
  },
};

export interface MarketToolCopy {
  title: string;
  does: string;
  enters: string;
  gets: string;
}

const GENERIC_FINISHING_COPY: MarketToolCopy = {
  title: "Wall Finishing",
  does: "Estimate material quantities and costs for smooth wall finishes.",
  enters: "Wall area and finish thickness, or room dimensions.",
  gets: "Estimated wall-finishing materials and costs, where market data is configured.",
};

const FINISHING_COPY: Readonly<
  Partial<Record<TerminologyMarket, MarketToolCopy>>
> = {
  NG: {
    title: "Wall Screeding",
    does: "Calculate screeding material quantities and cost for smooth wall finishes.",
    enters: "Wall area and finish thickness, or room dimensions.",
    gets: "Configured screeding, putty and finishing material quantities and costs.",
  },
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
    gets: "Estimated skimming materials and costs, using configured market data where available.",
  },
};

const GENERIC_REINFORCEMENT_COPY: MarketToolCopy = {
  title: "Reinforcement / Steel",
  does: "Calculate reinforcement quantities, weights and binding wire for structural elements.",
  enters: "Element type and dimensions, bar spacing or the bar schedule.",
  gets: "Reinforcement lengths and tonnage, with cost where market prices are configured.",
};

function isTerminologyMarket(code: string): code is TerminologyMarket {
  return (TERMINOLOGY_MARKETS as readonly string[]).includes(code);
}

export function getConstructionTerm(
  operation: ConstructionOperation,
  marketCode: string,
  fallback?: string,
): string {
  const code = marketCode.toUpperCase();
  const local = isTerminologyMarket(code)
    ? MARKET_TERMS[operation]?.[code]
    : undefined;
  return local ?? fallback ?? NEUTRAL_TERMS[operation];
}

export function getMarketToolCopy<T extends MarketToolCopy>(
  slug: string,
  marketCode: string,
  base: T,
): T {
  const code = marketCode.toUpperCase();
  const isMarket = isTerminologyMarket(code);
  let localized: Partial<MarketToolCopy> | undefined;

  if (slug === "screeding") {
    localized = isMarket
      ? (FINISHING_COPY[code] ?? {
          ...GENERIC_FINISHING_COPY,
          title: getConstructionTerm("wall_finishing", code),
        })
      : GENERIC_FINISHING_COPY;
  } else if (slug === "reinforcement") {
    localized = isMarket
      ? {
          ...GENERIC_REINFORCEMENT_COPY,
          title: `${getConstructionTerm("reinforcement", code)} Estimator`,
        }
      : GENERIC_REINFORCEMENT_COPY;
  }

  return localized ? { ...base, ...localized } : base;
}

/** Resolve labels in shared navigation by stable route, never display text. */
export function getMarketNavigationLabel(
  path: string,
  marketCode: string,
  fallback: string,
): string {
  const slug =
    path === "/screeding-calculator"
      ? "screeding"
      : path === "/reinforcement"
        ? "reinforcement"
        : null;
  if (!slug) return fallback;

  const copy = getMarketToolCopy(slug, marketCode, {
    title: fallback,
    does: "",
    enters: "",
    gets: "",
  });
  const suffix =
    fallback.match(/( Cost Estimator| Estimator| Calculator)$/)?.[0] ?? "";
  if (!suffix || copy.title.toLowerCase().endsWith(suffix.toLowerCase())) {
    return copy.title;
  }
  if (fallback === "Screeding Cost Estimator") {
    return `${copy.title} Cost Estimator`;
  }
  return `${copy.title}${suffix}`;
}
