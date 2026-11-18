/**
 * Deterministic site-haulage calculation.
 *
 * A quotation's transportation line used to be a single number the user typed,
 * which cannot be defended in a tender: nobody can say where it came from. This
 * engine turns the same line into an auditable build-up:
 *
 *   haulage    = distance (km) x trips x freight rate per km x terrain x regional
 *   offloading = trips x offloading cost per trip
 *   total      = haulage + offloading
 *
 * Two rules keep it honest:
 *
 *  - the freight rate is never invented. Without a rate the engine returns no
 *    total and says why, because a made-up rate on a binding bid is worse than
 *    a blank field;
 *  - the terrain and regional factors are ACCESS multipliers the user states,
 *    defaulting to 1.00 (no uplift). There is no built-in table of state or LGA
 *    freight rates: those are negotiated locally and differ by season, so the
 *    engine exposes the factor and labels it rather than pretending to know it.
 */

export type TerrainClass =
  | "paved_highway"
  | "urban_paved"
  | "rural_paved"
  | "unpaved_laterite"
  | "rough_swampy";

/**
 * Access multipliers by terrain, applied to the paved-road freight rate.
 * These are a schedule of relative difficulty, not prices: the money comes
 * from the rate the user supplies.
 */
export const TERRAIN_FACTORS: Record<TerrainClass, number> = {
  paved_highway: 1,
  urban_paved: 1.1,
  rural_paved: 1.25,
  unpaved_laterite: 1.6,
  rough_swampy: 2.2,
};

export const TERRAIN_LABELS: Record<TerrainClass, string> = {
  paved_highway: "Paved highway / trunk road",
  urban_paved: "Urban paved streets",
  rural_paved: "Rural paved road",
  unpaved_laterite: "Unpaved laterite or earth road",
  rough_swampy: "Rough, swampy or waterlogged access",
};

export interface HaulageInput {
  /** One-way delivery distance in kilometres. */
  distanceKm: number;
  /** Number of loaded trips. Defaults to 1. */
  trips?: number;
  /**
   * Freight rate per kilometre, in the quotation's own currency. Required:
   * the engine refuses to guess a market rate.
   */
  costPerKm?: number | null;
  /** Terrain at the site end. Defaults to a paved highway. */
  terrain?: TerrainClass;
  /** Cost to load and offload one trip, in the quotation's currency. */
  offloadingPerTrip?: number | null;
  /**
   * Local access multiplier the user states (for example a difficult LGA
   * approach). 1.00 means no uplift and is the default.
   */
  regionalFactor?: number | null;
  /** Currency of the amounts, passed through untouched. */
  currency?: string | null;
}

export interface HaulageLine {
  label: string;
  formula: string;
  amount: number;
}

export interface HaulageResult {
  /** False when a required input is missing; `reason` then says which. */
  complete: boolean;
  reason?: string;
  distanceKm: number;
  trips: number;
  costPerKm: number | null;
  terrain: TerrainClass;
  terrainFactor: number;
  regionalFactor: number;
  haulage: number;
  offloading: number;
  total: number;
  /** Rounding-visible build-up, for a calculation sheet or rate build-up. */
  lines: HaulageLine[];
  /** Everything the figure depends on, stated in words. */
  assumptions: string[];
  /** The quotation's currency, or null when the caller did not state one. */
  currency: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A finite, non-negative number, or 0. */
function positive(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

/** A multiplier: finite and greater than zero, else 1 (no uplift). */
function factor(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

/**
 * Compute haulage from stated inputs. Deterministic: the same inputs always
 * produce the same figures, with every multiplier visible in `lines`.
 */
export function computeHaulage(input: HaulageInput): HaulageResult {
  const distanceKm = positive(input.distanceKm);
  const trips = Math.max(1, Math.round(positive(input.trips ?? 1)) || 1);
  const costPerKm =
    input.costPerKm === null || input.costPerKm === undefined
      ? null
      : positive(input.costPerKm);
  const terrain = input.terrain ?? "paved_highway";
  const terrainFactor = TERRAIN_FACTORS[terrain] ?? 1;
  const regionalFactor = factor(input.regionalFactor);
  const offloadingPerTrip = positive(input.offloadingPerTrip);
  const currency = input.currency ? String(input.currency).toUpperCase() : null;

  const base: HaulageResult = {
    complete: false,
    distanceKm,
    trips,
    costPerKm,
    terrain,
    terrainFactor,
    regionalFactor,
    haulage: 0,
    offloading: 0,
    total: 0,
    lines: [],
    assumptions: [],
    currency,
  };

  if (distanceKm <= 0) {
    return {
      ...base,
      reason:
        "No delivery distance was supplied, so no haulage figure can be derived.",
      assumptions: [
        "Haulage needs a one-way distance to site; none was stated.",
      ],
    };
  }

  if (!costPerKm) {
    return {
      ...base,
      reason:
        "No freight rate per kilometre was supplied. FRELUX does not invent a market haulage rate.",
      assumptions: [
        `Distance to site: ${distanceKm} km over ${trips} trip(s).`,
        "Freight rate per km was not stated, so the cost is left open rather than guessed.",
      ],
    };
  }

  const haulage = round2(
    distanceKm * trips * costPerKm * terrainFactor * regionalFactor,
  );
  const offloading = round2(trips * offloadingPerTrip);
  const total = round2(haulage + offloading);

  const lines: HaulageLine[] = [
    {
      label: "Haulage",
      formula: `${distanceKm} km x ${trips} trip(s) x ${costPerKm}/km x ${terrainFactor} terrain x ${regionalFactor} access = ${haulage}`,
      amount: haulage,
    },
  ];
  if (offloading > 0) {
    lines.push({
      label: "Loading and offloading",
      formula: `${trips} trip(s) x ${offloadingPerTrip} per trip = ${offloading}`,
      amount: offloading,
    });
  }

  const assumptions = [
    `One-way distance to site: ${distanceKm} km.`,
    `Trips: ${trips}.`,
    `Freight rate: ${costPerKm} per km, as supplied by the estimator.`,
    `Terrain: ${TERRAIN_LABELS[terrain]} (x${terrainFactor}).`,
    `Local access multiplier: x${regionalFactor}${regionalFactor === 1 ? " (no uplift stated)" : ""}.`,
  ];
  if (offloadingPerTrip > 0) {
    assumptions.push(
      `Loading and offloading: ${offloadingPerTrip} per trip, as supplied.`,
    );
  } else {
    assumptions.push(
      "Loading and offloading is excluded because no cost per trip was stated.",
    );
  }

  return {
    ...base,
    complete: true,
    haulage,
    offloading,
    total,
    lines,
    assumptions,
  };
}

/**
 * Bridge to the existing transportation line on quotations: a computed haulage
 * becomes the same amount every calculator already knows how to show.
 */
export function haulageToTransportationChoice(result: HaulageResult): {
  enabled: boolean;
  amount: number;
} {
  return { enabled: result.complete && result.total > 0, amount: result.total };
}
