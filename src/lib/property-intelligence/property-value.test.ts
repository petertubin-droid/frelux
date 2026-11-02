// =========================================================
// PROPERTY VALUE, COMPARABLE-BASED INDICATIVE ESTIMATE TESTS (§11, §12, §19)
// =========================================================

import { describe, it, expect } from "vitest";
import {
  estimateIndicativeValue,
  classifyMarketFreshness,
  VALUE_LABEL,
} from "./property-value";
import type { PropertyListing } from "./market-data";

const NOW = "2026-09-07T12:00:00Z";

function listing(
  id: string,
  price: number,
  buildingSize: number,
  observedDaysAgo = 5,
  extra: Partial<PropertyListing> = {},
): PropertyListing {
  const observedAt = new Date(
    new Date(NOW).getTime() - observedDaysAgo * 24 * 60 * 60 * 1000,
  ).toISOString();
  return {
    id,
    propertyType: "duplex",
    country: "NG",
    region: "Lagos",
    currency: "NGN",
    observedAt,
    askingPrice: { amount: price, currency: "NGN" },
    buildingSize: { value: buildingSize, unit: "m²" },
    confidence: 0.9,
    source: "test-source",
    provenance: { sourceType: "provider", verificationStatus: "unverified" },
    ...extra,
  };
}

const subject = {
  propertyType: "duplex",
  country: "NG",
  region: "Lagos",
  currency: "NGN",
  buildingSize: { value: 200, unit: "m²" },
};

describe("classifyMarketFreshness (§19 five-level)", () => {
  it("labels current / recent / stale / outdated / unavailable", () => {
    const at = (days: number) =>
      new Date(
        new Date(NOW).getTime() - days * 24 * 60 * 60 * 1000,
      ).toISOString();
    expect(classifyMarketFreshness(at(3), NOW)).toBe("current");
    expect(classifyMarketFreshness(at(45), NOW)).toBe("recent");
    expect(classifyMarketFreshness(at(120), NOW)).toBe("stale");
    expect(classifyMarketFreshness(at(400), NOW)).toBe("outdated");
    expect(classifyMarketFreshness(undefined, NOW)).toBe("unavailable");
  });
});

describe("estimateIndicativeValue", () => {
  it("produces NO estimate when comparables are insufficient (§12)", () => {
    const result = estimateIndicativeValue(
      subject,
      [listing("a", 100_000_000, 200)],
      {
        propertyType: subject.propertyType,
        country: subject.country,
        currency: subject.currency,
      },
      NOW,
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.range).toBeUndefined();
    expect(result.conclusion).toContain("does not fabricate");
    expect(result.confidence.band).toBe("low");
  });

  it("CONTROLLED REFERENCE: median price-per-m² × subject size (§23)", () => {
    // Asking 90M/150m² = 600k/m², 100M/200m² = 500k/m², 110M/220m² = 500k/m²
    const comps = [
      listing("a", 90_000_000, 150),
      listing("b", 100_000_000, 200),
      listing("c", 110_000_000, 220),
    ];
    const result = estimateIndicativeValue(
      subject,
      comps,
      {
        propertyType: subject.propertyType,
        country: subject.country,
        currency: subject.currency,
      },
      NOW,
    );
    expect(result.status).toBe("estimated");
    // unit prices: 600000, 500000, 500000 → median 500000
    // subject 200 m² → median 100,000,000
    expect(result.range?.median).toBe(100_000_000);
    // sorted unit prices: 500000,500000,600000 → p25 = idx round(0.25*2)=1? round(0.5)=1 → 500000; p75 = round(1.5)=2 → 600000
    // low = 500000×200 = 100,000,000; high = 600000×200 = 120,000,000
    expect(result.range?.low).toBe(100_000_000);
    expect(result.range?.high).toBe(120_000_000);
    expect(result.range?.currency).toBe("NGN");
    expect(result.basis?.kind).toBe("asking_price");
    expect(result.basis?.dimension).toBe("building");
    expect(result.conclusion).toContain(VALUE_LABEL);
    expect(result.conclusion).toContain("not a professional valuation");
  });

  it("uses verified transactions when enough exist and NEVER mixes with asking prices", () => {
    const verified = (
      id: string,
      price: number,
      size: number,
    ): PropertyListing => ({
      ...listing(id, price, size),
      transactionPrice: {
        amount: price,
        currency: "NGN",
        provenanceVerified: true,
      },
      provenance: { sourceType: "provider", verificationStatus: "verified" },
    });
    // 3 verified transactions + 2 asking listings. The estimate must use ONLY the transactions.
    const comps = [
      verified("t1", 95_000_000, 190), // 500000/m²
      verified("t2", 105_000_000, 210), // 500000/m²
      verified("t3", 115_000_000, 230), // 500000/m²
      listing("a1", 30_000_000, 200), // asking, wildly different, must not contribute
      listing("a2", 40_000_000, 200),
    ];
    const result = estimateIndicativeValue(
      subject,
      comps,
      {
        propertyType: subject.propertyType,
        country: subject.country,
        currency: subject.currency,
      },
      NOW,
    );
    expect(result.basis?.kind).toBe("verified_transaction");
    expect(result.basis?.count).toBe(3);
    expect(result.range?.median).toBe(100_000_000); // 500000/m² × 200
    expect(
      result.evidence.every((e) => e.note.startsWith("Verified transaction")),
    ).toBe(true);
  });

  it("labels stale evidence stale and downgrades confidence (§19)", () => {
    const old = [
      listing("a", 90_000_000, 150, 100),
      listing("b", 100_000_000, 200, 100),
      listing("c", 110_000_000, 220, 100),
    ];
    const result = estimateIndicativeValue(
      subject,
      old,
      {
        propertyType: subject.propertyType,
        country: subject.country,
        currency: subject.currency,
      },
      NOW,
    );
    expect(result.dataFreshness).toBe("stale");
    expect(result.confidence.band).toBe("medium");
    expect(result.assumptions.join(" ")).toContain("freshness");
  });

  it("falls back to whole-property comparison with a disclosed weaker basis when comparables carry no size data", () => {
    // Mixed-unit comparables are EXCLUDED by the screen (no silent
    // conversion), with one excluded, only 2 remain and no estimate
    // is produced at all.
    const mixedUnits = [
      listing("a", 90_000_000, 150),
      listing("b", 100_000_000, 200),
      {
        ...listing("c", 110_000_000, 220),
        buildingSize: { value: 220, unit: "sq ft" },
      },
    ];
    const mixed = estimateIndicativeValue(
      subject,
      mixedUnits,
      {
        propertyType: subject.propertyType,
        country: subject.country,
        currency: subject.currency,
      },
      NOW,
    );
    expect(mixed.status).toBe("insufficient_data");

    // Comparables without size data → whole-property basis, disclosed.
    const noSize = [
      { ...listing("a", 90_000_000, 150), buildingSize: undefined },
      { ...listing("b", 100_000_000, 200), buildingSize: undefined },
      { ...listing("c", 110_000_000, 220), buildingSize: undefined },
    ];
    const result = estimateIndicativeValue(
      subject,
      noSize,
      {
        propertyType: subject.propertyType,
        country: subject.country,
        currency: subject.currency,
      },
      NOW,
    );
    expect(result.basis?.dimension).toBe("whole_property");
    // median of 90M/100M/110M = 100M
    expect(result.range?.median).toBe(100_000_000);
    expect(result.assumptions.join(" ")).toContain("weaker basis");
  });
});
