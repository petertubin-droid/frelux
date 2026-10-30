/**
 * FRELUX LIVE MATERIAL PRICE INDEX, statistics core.
 *
 * Every number the index publishes comes from these functions. They are pure,
 * deterministic and deliberately conservative:
 *
 *   - A market statistic is only published when it rests on at least
 *     MIN_SAMPLES independent observations. Below that the answer is
 *     `insufficient`, never a single supplier's price dressed up as a market.
 *   - Outliers are removed with a median/MAD rule, and only once there are
 *     enough observations for the rule to mean anything.
 *   - Movements require comparable evidence at both ends of the period.
 *
 * Nothing here estimates, interpolates or fills a gap. A missing number stays
 * missing and the UI says why.
 */

export const MIN_SAMPLES = 3;
export const MIN_SAMPLES_FOR_OUTLIER_RULE = 5;
export const MIN_SAMPLES_FOR_MOVEMENT = 3;

export type Sample = {
  /** Price in NGN. */
  value: number;
  /** ISO date the price was observed. */
  observed_at: string;
  verification_status?: "verified" | "reported" | "unverified" | "flagged" | null;
};

export type IndexStats =
  | {
      status: "ok";
      count: number;
      counted: number;
      excluded_outliers: number;
      median: number;
      mean: number;
      min: number;
      max: number;
      /** Relative spread, (max - min) / median, as a fraction. */
      spread: number;
      confidence: "verified" | "mixed" | "reported";
    }
  | {
      status: "insufficient";
      count: number;
      required: number;
      reason: string;
    };

export type Movement =
  | {
      status: "ok";
      /** Fraction, e.g. 0.041 for +4.1%. */
      change: number;
      from: number;
      to: number;
      samples: number;
    }
  | { status: "unavailable"; reason: string };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] === undefined
    ? sorted[base]
    : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

/** Median absolute deviation, scaled to be comparable with a standard deviation. */
function scaledMad(values: number[]): { mad: number; centre: number } {
  const centre = median(values);
  const deviations = values.map((value) => Math.abs(value - centre));
  return { mad: 1.4826 * median(deviations), centre };
}

/**
 * Drop observations that sit implausibly far from the pack.
 *
 * Uses a median/MAD rule (robust to a single wild submission, which a plain
 * mean/SD rule is not) with an IQR backstop. Applied only above
 * MIN_SAMPLES_FOR_OUTLIER_RULE observations: with four prices the rule cannot
 * tell an outlier from a genuine market spread.
 */
export function removeOutliers(values: number[]): {
  kept: number[];
  removed: number[];
} {
  if (values.length < MIN_SAMPLES_FOR_OUTLIER_RULE) {
    return { kept: values, removed: [] };
  }

  const { mad, centre } = scaledMad(values);
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;

  const kept = values.filter((value) => {
    const withinMad = 3.5 * mad === 0 ? true : Math.abs(value - centre) <= 3.5 * mad;
    const withinIqr = iqr === 0 ? true : value >= q1 - 1.5 * iqr && value <= q3 + 1.5 * iqr;
    // Keep anything plausible under either rule; only drop what both reject.
    return withinMad || withinIqr;
  });

  return {
    kept,
    removed: values.filter((value) => !kept.includes(value)),
  };
}

/**
 * Market statistics for one material in one place.
 * `samples` must already be filtered to the period and location under test.
 */
export function computeStats(samples: Sample[]): IndexStats {
  const usable = samples.filter(
    (sample) =>
      Number.isFinite(sample.value) &&
      sample.value > 0 &&
      sample.verification_status !== "flagged",
  );

  if (usable.length < MIN_SAMPLES) {
    return {
      status: "insufficient",
      count: usable.length,
      required: MIN_SAMPLES,
      reason:
        usable.length === 0
          ? "No collected price for this material in this market."
          : `${usable.length} of the ${MIN_SAMPLES} prices needed before a market figure is published.`,
    };
  }

  const { kept, removed } = removeOutliers(usable.map((s) => s.value));
  const values = kept;

  const md = median(values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const verified = values.length
    ? usable.filter((s) => s.verification_status === "verified").length
    : 0;
  const confidence: "verified" | "mixed" | "reported" =
    verified === 0 ? "reported" : verified >= values.length / 2 ? "verified" : "mixed";

  return {
    status: "ok",
    count: usable.length,
    counted: values.length,
    excluded_outliers: removed.length,
    median: round(md),
    mean: round(mean),
    min: round(min),
    max: round(max),
    spread: md > 0 ? round((max - min) / md, 4) : 0,
    confidence,
  };
}

/**
 * Movement between two periods. Both sides must clear the sample gate;
 * a thin week against a thin month is not a trend.
 */
export function computeMovement(
  earlier: Sample[],
  later: Sample[],
): Movement {
  const earlierUsable = earlier.filter(
    (s) => Number.isFinite(s.value) && s.value > 0 && s.verification_status !== "flagged",
  );
  const laterUsable = later.filter(
    (s) => Number.isFinite(s.value) && s.value > 0 && s.verification_status !== "flagged",
  );

  if (
    earlierUsable.length < MIN_SAMPLES_FOR_MOVEMENT ||
    laterUsable.length < MIN_SAMPLES_FOR_MOVEMENT
  ) {
    return {
      status: "unavailable",
      reason: `Needs at least ${MIN_SAMPLES_FOR_MOVEMENT} prices at both ends of the period.`,
    };
  }

  const from = median(removeOutliers(earlierUsable.map((s) => s.value)).kept);
  const to = median(removeOutliers(laterUsable.map((s) => s.value)).kept);
  if (from <= 0) {
    return { status: "unavailable", reason: "The earlier period has no usable median." };
  }

  return {
    status: "ok",
    change: round((to - from) / from, 4),
    from: round(from),
    to: round(to),
    samples: laterUsable.length,
  };
}

/** Split samples into a trailing window by observation date. */
export function withinDays(samples: Sample[], days: number, now = new Date()): Sample[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return samples.filter((sample) => {
    const time = new Date(sample.observed_at).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });
}

export type CityVariation = {
  city_slug: string;
  city_name: string;
  median: number;
  count: number;
  /** Fraction above/below the national median. */
  versus_national: number | null;
};

/**
 * Cross-city spread for one material. Cities below the sample gate are listed
 * as unpriced rather than being given a made-up figure.
 */
export function computeCityVariation(
  byCity: { city_slug: string; city_name: string; samples: Sample[] }[],
): { priced: CityVariation[]; unpriced: string[] } {
  const rows: CityVariation[] = [];
  const unpriced: string[] = [];

  for (const city of byCity) {
    const stats = computeStats(city.samples);
    if (stats.status !== "ok") {
      unpriced.push(city.city_name);
      continue;
    }
    rows.push({
      city_slug: city.city_slug,
      city_name: city.city_name,
      median: stats.median,
      count: stats.counted,
      versus_national: null,
    });
  }

  if (rows.length > 0) {
    const national = median(rows.map((row) => row.median));
    for (const row of rows) {
      row.versus_national = national > 0 ? round((row.median - national) / national, 4) : null;
    }
  }

  return { priced: rows.sort((a, b) => a.median - b.median), unpriced };
}

/**
 * A single "index level" for a basket: the median of each material's city
 * median, weighted equally. Published only when the basket clears its gate,
 * because a headline number built from two materials is theatre.
 */
export function computeIndexLevel(
  perMaterial: { slug: string; samples: Sample[] }[],
  minimumMaterials = 3,
): { status: "ok"; level: number; materials: number } | { status: "insufficient"; reason: string } {
  const medians: number[] = [];
  for (const material of perMaterial) {
    const stats = computeStats(material.samples);
    if (stats.status === "ok") medians.push(stats.median);
  }
  if (medians.length < minimumMaterials) {
    return {
      status: "insufficient",
      reason: `Only ${medians.length} material${medians.length === 1 ? "" : "s"} clear the sample gate; ${minimumMaterials} are needed for an index level.`,
    };
  }
  return { status: "ok", level: round(median(medians)), materials: medians.length };
}

export function round(value: number, dp = 2): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}

/** Percentage string for UI, e.g. "+4.1%". */
export function formatPercent(fraction: number, dp = 1): string {
  const sign = fraction > 0 ? "+" : "";
  return `${sign}${(fraction * 100).toFixed(dp)}%`;
}
