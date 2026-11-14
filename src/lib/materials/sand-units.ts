import type { RowOverride, SummaryRow } from "@/lib/estimation/takeoff-rows";

/**
 * Sand, in the units a site actually buys it.
 *
 * Every Frelux engine works in cubic metres because that is what the trade
 * volumes produce, but nobody in Lagos orders "six point six nine cubic metres
 * of sharp sand". They order a trip: a ten-tonne tipper holds about 6.25 m³ and
 * a twenty-tonne tipper about 12.5 m³ at the dry loose bulk density of
 * 1,600 kg/m³ that mortar and render quantities assume. This module keeps the
 * volume as the number of record and adds the weight and the trip plan beside
 * it, per market, so a Nigerian takeoff reads like the conversation at the
 * depot instead of a textbook.
 */

/**
 * Dry loose bulk density of sharp/river sand. 1,600 kg/m³ sits in the middle of
 * the 1,440-1,680 range quoted for sand at natural moisture, and it is the
 * figure the mortar and render takeoffs already assume, so the weight shown
 * never contradicts the volume that produced it.
 */
export const SAND_DENSITY_KG_M3 = 1600;

export interface SandTripSize {
  id: string;
  /** Payload the tipper is sold at, in metric tonnes. */
  tonnes: number;
  /** How it is asked for on site. */
  label: string;
}

export interface SandMarketConfig {
  marketCode: string;
  densityKgM3: number;
  /**
   * Purchase units the market actually sells. Empty where sand is sold by
   * weight or in bulk bags, in which case the volume and weight are shown
   * alone rather than inventing a trip that does not exist there.
   */
  trips: SandTripSize[];
  /** What one delivery is called locally. */
  tripNoun: string;
}

const NIGERIAN_TRIPS: SandTripSize[] = [
  { id: "ng-5t", tonnes: 5, label: "5-tonne trip" },
  { id: "ng-10t", tonnes: 10, label: "10-tonne trip" },
  { id: "ng-20t", tonnes: 20, label: "20-tonne trip" },
];

/**
 * Only Nigeria's trip sizes are modelled, because those are the ones we have
 * confirmed at the depot: 5, 10 and 20 tonne tippers. Other markets fall back
 * to volume and weight, which is honest, and their trip sizes can be added to
 * this table once they are researched rather than guessed.
 */
const TRIP_MARKETS: Record<string, { trips: SandTripSize[]; noun: string }> = {
  NG: { trips: NIGERIAN_TRIPS, noun: "trip" },
};

export function sandConfigFor(marketCode?: string | null): SandMarketConfig {
  const code = (marketCode ?? "").trim().toUpperCase() || "NG";
  const local = TRIP_MARKETS[code];
  return {
    marketCode: code,
    densityKgM3: SAND_DENSITY_KG_M3,
    trips: local?.trips ?? [],
    tripNoun: local?.noun ?? "delivery",
  };
}

function round(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}

export function sandTonnes(
  volumeM3: number,
  marketCode?: string | null,
): number {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return 0;
  return round((volumeM3 * sandConfigFor(marketCode).densityKgM3) / 1000, 2);
}

export function tripCubicMetres(
  tonnes: number,
  marketCode?: string | null,
): number {
  return round((tonnes * 1000) / sandConfigFor(marketCode).densityKgM3, 2);
}

export interface SandTripLine extends SandTripSize {
  count: number;
  /** Volume the whole trips carry. */
  cubicMetres: number;
}

export interface SandPurchasePlan {
  trips: SandTripLine[];
  /** Volume covered by whole trips. */
  tripVolumeM3: number;
  /**
   * What is left after the trips, too small for another trip, so it is topped
   * up in bags or head pans at the depot.
   */
  topUpM3: number;
  /** Volume actually bought: trips plus top-up. */
  totalM3: number;
  /** Spare sand left over, near zero because the top-up is sized to fit. */
  surplusM3: number;
  tonnes: number;
}

/**
 * The smallest sensible order for a volume: fill with whole trips from the
 * largest size down, then top up the remainder rather than paying for a trip
 * the job does not need. Returns null where the market has no trip sizes.
 */
export function planSandPurchase(
  volumeM3: number,
  marketCode?: string | null,
): SandPurchasePlan | null {
  const config = sandConfigFor(marketCode);
  if (!config.trips.length) return null;
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return null;

  const sizes = [...config.trips].sort((a, b) => b.tonnes - a.tonnes);
  const smallestM3 = tripCubicMetres(
    Math.min(...sizes.map((s) => s.tonnes)),
    config.marketCode,
  );

  let remaining = volumeM3;
  const trips: SandTripLine[] = [];
  for (const size of sizes) {
    const capacity = tripCubicMetres(size.tonnes, config.marketCode);
    if (capacity <= 0) continue;
    // The largest size only takes whole trips while a smaller one could still
    // be the better fit; stop before we overshoot by more than the smallest
    // trip, which the top-up covers more cheaply.
    const count = Math.floor(remaining / capacity + 1e-9);
    if (count > 0) {
      trips.push({ ...size, count, cubicMetres: round(count * capacity, 2) });
      remaining = round(remaining - count * capacity, 4);
    }
  }

  const tripVolumeM3 = round(
    trips.reduce((sum, t) => sum + t.cubicMetres, 0),
    2,
  );
  const topUpM3 = remaining > 0.01 && remaining < smallestM3 ? remaining : 0;
  const totalM3 = round(tripVolumeM3 + topUpM3, 2);
  return {
    trips,
    tripVolumeM3,
    topUpM3: round(topUpM3, 2),
    totalM3,
    surplusM3: round(totalM3 - volumeM3, 2),
    tonnes: sandTonnes(volumeM3, config.marketCode),
  };
}

function formatNumber(value: number, dp: number): string {
  return value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: dp,
  });
}

/** "6.69 m³ · 10.7 t" */
export function sandVolumeLabel(
  volumeM3: number,
  marketCode?: string | null,
): string {
  const tonnes = sandTonnes(volumeM3, marketCode);
  return `${formatNumber(volumeM3, 2)} m³ · ${formatNumber(tonnes, 2)} t`;
}

/**
 * "1 × 10-tonne trip + 0.44 m³ top-up". Null where the market has no trips, so
 * the caller can fall back to the volume label alone.
 */
export function sandPurchaseLabel(
  volumeM3: number,
  marketCode?: string | null,
): string | null {
  const plan = planSandPurchase(volumeM3, marketCode);
  if (!plan) return null;
  const parts = plan.trips.map(
    (t) => `${t.count} × ${t.label} (${formatNumber(t.cubicMetres, 2)} m³)`,
  );
  if (plan.topUpM3 > 0) {
    const topUpTonnes = sandTonnes(plan.topUpM3, marketCode);
    parts.push(
      `${formatNumber(plan.topUpM3, 2)} m³ top-up (${formatNumber(topUpTonnes, 2)} t)`,
    );
  }
  if (!parts.length) return null;
  return parts.join(" + ");
}

const SAND_VOLUME_KEYS = ["sandVolumeM3", "sand_volume_m3", "sandM3"];
const SAND_WEIGHT_KEYS = ["sandWeightTonnes", "sand_weight_tonnes"];

/**
 * Row overrides for buildSummaryRows, so every takeoff that returns a sand
 * volume shows the measured m³, the weight it means, and the trips a buyer
 * would actually order. The engines stay unit-agnostic; this is display only.
 */
export function sandRowOverrides(
  marketCode?: string | null,
): Record<string, RowOverride> {
  const overrides: Record<string, RowOverride> = {};
  for (const key of SAND_VOLUME_KEYS) {
    overrides[key] = (value) => {
      const volume = Number(value);
      if (!Number.isFinite(volume) || volume <= 0) return null;
      const volumeRow: SummaryRow = {
        label: "Sand volume",
        value: sandVolumeLabel(volume, marketCode),
      };
      const purchase = sandPurchaseLabel(volume, marketCode);
      return purchase
        ? [volumeRow, { label: "Buy sand", value: purchase }]
        : [volumeRow];
    };
  }
  // The weight is already inside the volume row above.
  for (const key of SAND_WEIGHT_KEYS) overrides[key] = () => [];
  return overrides;
}
