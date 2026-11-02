import { describe, it, expect } from "vitest";
import {
  evaluateQuorum,
  filterExpenseOutliers,
  slugifyMaterial,
  DEFAULT_QUORUM_THRESHOLD,
  SAMPLE_CROWDSOURCE_BENCHMARKS,
} from "./crowdsourcing-engine";
import type { CrowdsourcedExpenseSubmission } from "@/types/hybrid-pricing";

describe("System B: Closed-Loop Crowdsourcing Engine", () => {
  it("slugifies material name cleanly", () => {
    expect(slugifyMaterial("Portland Cement 50kg (Ordinary)")).toBe(
      "portland-cement-50kg-ordinary",
    );
  });

  it("filters statistical outliers via IQR", () => {
    // Normal prices: 920, 940, 950, 960, 980. Outlier: 3500 and 150
    const raw = [150, 920, 940, 950, 960, 980, 3500];
    const { validPrices, outliers } = filterExpenseOutliers(raw, 950);

    expect(outliers).toContain(3500);
    expect(validPrices).toContain(950);
  });

  it("overwrites system estimate when 15 Nairobi contractors log 950 KSh cement", () => {
    // Generate 15 contractor submissions in Nairobi at 950 KES
    const submissions: CrowdsourcedExpenseSubmission[] = Array.from(
      { length: 15 },
      (_, i) => ({
        id: `sub-${i}`,
        market_code: "KE",
        city: "Nairobi",
        material_category: "cement",
        material_name: "Portland Cement 50kg",
        material_slug: "cement-bag-50kg",
        unit_price: 940 + (i % 3) * 10, // 940, 950, 960 -> average 950
        currency: "KES",
        unit: "50kg bag",
        purchased_at: "2026-10-14",
        is_outlier: false,
        opt_in_verified: true,
        created_at: "2026-10-14T00:00:00Z",
      }),
    );

    const result = evaluateQuorum(submissions, DEFAULT_QUORUM_THRESHOLD);

    expect(result.sampleSize).toBe(15);
    expect(result.status).toBe("promoted");
    expect(result.isPromoted).toBe(true);
    expect(result.median).toBe(950);
    expect(result.trimmedMean).toBe(950);
  });

  it("does not promote benchmark if quorum count is insufficient", () => {
    const submissions: CrowdsourcedExpenseSubmission[] = Array.from(
      { length: 4 }, // Only 4 contractors logged
      (_, i) => ({
        id: `sub-${i}`,
        market_code: "KE",
        city: "Nairobi",
        material_category: "cement",
        material_name: "Portland Cement 50kg",
        material_slug: "cement-bag-50kg",
        unit_price: 950,
        currency: "KES",
        unit: "50kg bag",
        purchased_at: "2026-10-14",
        is_outlier: false,
        opt_in_verified: true,
        created_at: "2026-10-14T00:00:00Z",
      }),
    );

    const result = evaluateQuorum(submissions, 10);
    expect(result.status).toBe("insufficient_data");
    expect(result.isPromoted).toBe(false);
  });

  it("provides sample Nairobi cement benchmark of 950 KES", () => {
    const nairobiCement = SAMPLE_CROWDSOURCE_BENCHMARKS.find(
      (b) => b.market_code === "KE" && b.material_slug === "cement-bag-50kg",
    );
    expect(nairobiCement).toBeDefined();
    expect(nairobiCement?.trimmed_mean_price).toBe(950);
    expect(nairobiCement?.sample_size).toBe(16);
    expect(nairobiCement?.is_promoted).toBe(true);
  });
});
