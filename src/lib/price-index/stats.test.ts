import { describe, expect, it } from "vitest";
import {
  MIN_SAMPLES,
  computeCityVariation,
  computeIndexLevel,
  computeMovement,
  computeStats,
  formatPercent,
  removeOutliers,
  withinDays,
  type Sample,
} from "./stats";

const s = (value: number, daysAgo = 0, status: Sample["verification_status"] = "reported"): Sample => ({
  value,
  observed_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  verification_status: status,
});

describe("removeOutliers", () => {
  it("leaves small samples untouched, because the rule cannot judge them", () => {
    const { kept, removed } = removeOutliers([50000, 52000, 900000]);
    expect(kept).toHaveLength(3);
    expect(removed).toHaveLength(0);
  });

  it("drops a wild submission once there is enough evidence", () => {
    const { kept, removed } = removeOutliers([50000, 51000, 50500, 52000, 51500, 900000]);
    expect(removed).toEqual([900000]);
    expect(kept).toHaveLength(5);
  });

  it("keeps a genuine wide spread, which is market variation not an outlier", () => {
    const { removed } = removeOutliers([42000, 46000, 50000, 56000, 61000]);
    expect(removed).toHaveLength(0);
  });
});

describe("computeStats", () => {
  it("refuses to publish a market figure from a single submission", () => {
    const stats = computeStats([s(52000)]);
    expect(stats.status).toBe("insufficient");
    if (stats.status === "insufficient") {
      expect(stats.count).toBe(1);
      expect(stats.required).toBe(MIN_SAMPLES);
      expect(stats.reason).toMatch(/of the 3 prices needed/);
    }
  });

  it("computes median, mean and extremes from a qualifying sample", () => {
    const stats = computeStats([s(50000), s(52000), s(51000)]);
    expect(stats.status).toBe("ok");
    if (stats.status !== "ok") return;
    expect(stats.median).toBe(51000);
    expect(stats.mean).toBe(51000);
    expect(stats.min).toBe(50000);
    expect(stats.max).toBe(52000);
    expect(stats.counted).toBe(3);
  });

  it("marks confidence honestly when nothing is verified", () => {
    const stats = computeStats([s(1000, 0, "reported"), s(1010, 0, "reported"), s(990, 0, "reported")]);
    if (stats.status !== "ok") throw new Error("expected ok");
    expect(stats.confidence).toBe("reported");
  });

  it("marks confidence verified only when verification dominates", () => {
    const stats = computeStats([
      s(1000, 0, "verified"),
      s(1010, 0, "verified"),
      s(990, 0, "reported"),
    ]);
    if (stats.status !== "ok") throw new Error("expected ok");
    expect(stats.confidence).toBe("verified");
  });

  it("ignores flagged and non-positive submissions entirely", () => {
    const stats = computeStats([s(1000), s(0), s(-5), s(1000, 0, "flagged")]);
    expect(stats.status).toBe("insufficient");
    if (stats.status === "insufficient") expect(stats.count).toBe(1);
  });

  it("reports how many observations the outlier rule removed", () => {
    const stats = computeStats([s(50000), s(50500), s(51000), s(51500), s(52000), s(900000)]);
    if (stats.status !== "ok") throw new Error("expected ok");
    expect(stats.excluded_outliers).toBe(1);
    expect(stats.max).toBeLessThan(100000);
  });
});

describe("computeMovement", () => {
  it("is unavailable when either end is thin", () => {
    const result = computeMovement([s(50000, 40)], [s(52000), s(52000), s(52000)]);
    expect(result.status).toBe("unavailable");
  });

  it("computes a median-to-median change", () => {
    const result = computeMovement(
      [s(50000, 40), s(50000, 40), s(50000, 40)],
      [s(55000), s(55000), s(55000)],
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.change).toBeCloseTo(0.1, 4);
    expect(result.from).toBe(50000);
    expect(result.to).toBe(55000);
  });

  it("never divides by a zero earlier median", () => {
    const result = computeMovement([s(0), s(0), s(0)], [s(100), s(100), s(100)]);
    expect(result.status).toBe("unavailable");
  });
});

describe("computeCityVariation", () => {
  it("publishes priced cities and names the unpriced ones", () => {
    const { priced, unpriced } = computeCityVariation([
      { city_slug: "lagos", city_name: "Lagos", samples: [s(50000), s(51000), s(52000)] },
      { city_slug: "kano", city_name: "Kano", samples: [s(45000), s(45000), s(46000)] },
      { city_slug: "jos", city_name: "Jos", samples: [s(49000)] },
    ]);
    expect(priced.map((row) => row.city_slug)).toEqual(["kano", "lagos"]);
    expect(unpriced).toEqual(["Jos"]);
  });

  it("states each city's position against the national median", () => {
    const { priced } = computeCityVariation([
      { city_slug: "lagos", city_name: "Lagos", samples: [s(60000), s(60000), s(60000)] },
      { city_slug: "kano", city_name: "Kano", samples: [s(40000), s(40000), s(40000)] },
    ]);
    const lagos = priced.find((row) => row.city_slug === "lagos")!;
    const kano = priced.find((row) => row.city_slug === "kano")!;
    expect(lagos.versus_national).toBeCloseTo(0.2, 4);
    expect(kano.versus_national).toBeCloseTo(-0.2, 4);
  });
});

describe("computeIndexLevel", () => {
  it("withholds a headline number when too few materials qualify", () => {
    const result = computeIndexLevel([
      { slug: "a", samples: [s(1), s(2), s(3)] },
      { slug: "b", samples: [s(1)] },
    ]);
    expect(result.status).toBe("insufficient");
  });

  it("takes the median of qualifying material medians", () => {
    const result = computeIndexLevel(
      [
        { slug: "a", samples: [s(100), s(100), s(100)] },
        { slug: "b", samples: [s(200), s(200), s(200)] },
        { slug: "c", samples: [s(300), s(300), s(300)] },
      ],
      3,
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.level).toBe(200);
    expect(result.materials).toBe(3);
  });
});

describe("withinDays", () => {
  it("keeps only observations inside the window", () => {
    const kept = withinDays([s(1, 2), s(2, 10), s(3, 60)], 30);
    expect(kept).toHaveLength(2);
  });
});

describe("formatPercent", () => {
  it("signs the number", () => {
    expect(formatPercent(0.041)).toBe("+4.1%");
    expect(formatPercent(-0.025)).toBe("-2.5%");
  });
});
