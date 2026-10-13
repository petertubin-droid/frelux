/**
 * Market-scoped climate profiles for the timeline estimator.
 *
 * The NG default ('dry' | 'rainy') is preserved exactly. Other markets get
 * the season options that match their real climate pattern. Productivity
 * multipliers are PLANNING HEURISTICS (disclosed to users as such), in the
 * same family as the existing rainy=1.2 NG heuristic — not verified
 * research data.
 */

export type ClimateSeason = "dry" | "rainy" | "winter" | "summer" | "monsoon";

export interface ClimateProfile {
  marketCode: string;
  /** Climate pattern name for UI disclosure. */
  climatePattern: string;
  /** Seasons selectable for this market. */
  seasons: ClimateSeason[];
  /** Default selected season. */
  defaultSeason: ClimateSeason;
  /** Season productivity multipliers (planning heuristics). */
  multipliers: Record<ClimateSeason, number>;
  /** Heuristic disclosure shown to users. */
  heuristicNote: string;
  /** Stage notes per season. */
  stageNotes: Partial<Record<ClimateSeason, { foundation_concrete: string; roofing: string }>>;
  verified: boolean;
}

const NG_STAGE_NOTES = {
  rainy: {
    foundation_concrete: "Rainy season may delay concrete curing. Allow extra days.",
    roofing: "Roofing work is significantly harder during rainy season.",
  },
} as const;

const PROFILE = (
  marketCode: string,
  climatePattern: string,
  seasons: ClimateSeason[],
  defaultSeason: ClimateSeason,
  multipliers: Partial<Record<ClimateSeason, number>>,
  stageNotes: ClimateProfile["stageNotes"],
): ClimateProfile => ({
  marketCode,
  climatePattern,
  seasons,
  defaultSeason,
  multipliers: {
    dry: 1.0,
    rainy: 1.2,
    winter: 1.25,
    summer: 1.05,
    monsoon: 1.3,
    ...multipliers,
  },
  heuristicNote:
    "Season multipliers are planning heuristics, not measured productivity data — confirm schedule with your contractor.",
  stageNotes,
  verified: true,
});

const WINTER_NOTES = {
  winter: {
    foundation_concrete: "Winter frost slows concrete curing and excavation. Allow extra days and use cold-weather concreting protection.",
    roofing: "Roofing is significantly harder in winter conditions (short days, wind, snow/ice risk).",
  },
} as const;

const MONSOON_NOTES = {
  monsoon: {
    foundation_concrete: "Monsoon rains may flood excavations and delay concrete pours. Allow extra days.",
    roofing: "Roofing work is significantly harder during the monsoon.",
  },
} as const;

const PROFILES: Record<string, ClimateProfile> = {
  NG: PROFILE("NG", "Tropical wet-and-dry", ["dry", "rainy"], "dry", {}, { ...NG_STAGE_NOTES }),
  GH: PROFILE("GH", "Tropical wet-and-dry", ["dry", "rainy"], "dry", {}, { ...NG_STAGE_NOTES }),
  KE: PROFILE("KE", "Tropical highland / wet-dry", ["dry", "rainy"], "dry", {}, { ...NG_STAGE_NOTES }),
  IN: PROFILE("IN", "Monsoon-influenced", ["dry", "summer", "monsoon"], "dry", {}, { ...MONSOON_NOTES }),
  ID: PROFILE("ID", "Tropical monsoon", ["dry", "monsoon"], "dry", {}, { ...MONSOON_NOTES }),
  GB: PROFILE("GB", "Temperate maritime with cold winters", ["summer", "winter"], "summer", {}, { ...WINTER_NOTES }),
  IE: PROFILE("IE", "Temperate maritime", ["summer", "winter"], "summer", {}, { ...WINTER_NOTES }),
  DE: PROFILE("DE", "Continental with cold winters", ["summer", "winter"], "summer", {}, { ...WINTER_NOTES }),
  FR: PROFILE("FR", "Temperate / Mediterranean mix", ["summer", "winter"], "summer", {}, { ...WINTER_NOTES }),
  IT: PROFILE("IT", "Mediterranean with alpine winters", ["summer", "winter"], "summer", {}, { ...WINTER_NOTES }),
  ES: PROFILE("ES", "Mediterranean", ["summer", "winter"], "summer", { summer: 1.1 }, { ...WINTER_NOTES }),
  CA: PROFILE("CA", "Continental with severe winters", ["summer", "winter"], "summer", { winter: 1.35 }, { ...WINTER_NOTES }),
  US: PROFILE("US", "Varies by region (hot South, cold North)", ["dry", "rainy", "summer", "winter"], "dry", {}, { ...WINTER_NOTES }),
  JP: PROFILE("JP", "Four distinct seasons", ["summer", "winter"], "summer", {}, { ...WINTER_NOTES }),
  KR: PROFILE("KR", "Continental with cold winters", ["summer", "winter"], "summer", {}, { ...WINTER_NOTES }),
  CN: PROFILE("CN", "Varies by region", ["dry", "summer", "winter"], "dry", {}, { ...WINTER_NOTES }),
  ZA: PROFILE("ZA", "Temperate with summer rainfall", ["dry", "summer", "rainy"], "dry", {}, { ...NG_STAGE_NOTES }),
  BR: PROFILE("BR", "Tropical / temperate mix with rainy summers", ["dry", "rainy"], "dry", {}, { ...NG_STAGE_NOTES }),
  MX: PROFILE("MX", "Dry/rainy season split", ["dry", "rainy"], "dry", {}, { ...NG_STAGE_NOTES }),
  AU: PROFILE("AU", "Temperate with hot summers", ["summer", "winter"], "summer", { summer: 1.1 }, { ...WINTER_NOTES }),
};

export function resolveClimateProfile(marketCode: string): ClimateProfile {
  return (
    PROFILES[marketCode] ??
    ({
      marketCode,
      climatePattern: "Market climate pattern not yet profiled",
      seasons: ["dry", "rainy"],
      defaultSeason: "dry",
      multipliers: { dry: 1.0, rainy: 1.2, winter: 1.25, summer: 1.05, monsoon: 1.3 },
      heuristicNote:
        "Season multipliers are planning heuristics, not measured productivity data — confirm schedule with your contractor.",
      stageNotes: { ...NG_STAGE_NOTES },
      verified: false,
    } satisfies ClimateProfile)
  );
}
