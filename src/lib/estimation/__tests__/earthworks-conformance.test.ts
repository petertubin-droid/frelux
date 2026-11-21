import { describe, expect, it } from "vitest";
import {
  calculateEarthwork,
  type EarthworkInput,
} from "@/lib/estimation/advanced-takeoff-engine";

/**
 * Audit 6 conformance suite: Earthworks Cut & Fill.
 *
 * Expected volumes are worked here from the average end-area method
 * (V = (A1 + A2)/2 x L), which is the method the page claims to use, plus the
 * two soil conversions as they are defined in earthworks practice:
 *   loose haul   = bank x (1 + bulking%)
 *   bank source  = compacted fill / (1 - shrinkage%)
 */

const run = (over: Partial<EarthworkInput> = {}) => {
  const result = calculateEarthwork({
    stations: [
      { chainageM: 0, cutAreaM2: 10, fillAreaM2: 0 },
      { chainageM: 100, cutAreaM2: 20, fillAreaM2: 0 },
    ],
    bulkingPercent: 25,
    shrinkagePercent: 10,
    cutSuitableForFill: true,
    ...over,
  });
  if (!result.ok || !result.data) throw new Error(result.errors.join("; "));
  return result.data;
};

describe("Earthworks Cut & Fill: average end-area volumes", () => {
  it("takes the mean area over the interval length", () => {
    const data = run();
    // (10 + 20)/2 x 100 m = 1500 m3 of cut.
    expect(data.intervals).toHaveLength(1);
    expect(data.intervals[0].cutM3).toBeCloseTo(1500, 6);
    expect(data.cutBankM3).toBeCloseTo(1500, 6);
  });

  it("adds intervals rather than averaging the whole run", () => {
    const data = run({
      stations: [
        { chainageM: 0, cutAreaM2: 10, fillAreaM2: 0 },
        { chainageM: 50, cutAreaM2: 20, fillAreaM2: 0 },
        { chainageM: 150, cutAreaM2: 0, fillAreaM2: 0 },
      ],
    });
    // (15 x 50) + (10 x 100) = 750 + 1000 = 1750 m3.
    expect(data.cutBankM3).toBeCloseTo(1750, 6);
  });

  it("bulks the cut into a loose haul volume only", () => {
    const data = run();
    expect(data.cutLooseM3).toBeCloseTo(1500 * 1.25, 6);
    // Bulking must not touch the bank figure.
    expect(data.cutBankM3).toBeCloseTo(1500, 6);
  });

  it("shrinks compacted fill back to a bank source volume only", () => {
    const data = run({
      stations: [
        { chainageM: 0, cutAreaM2: 0, fillAreaM2: 9 },
        { chainageM: 100, cutAreaM2: 0, fillAreaM2: 9 },
      ],
    });
    // 9 m2 mean area over 100 m = 900 m3 compacted; at 10 per cent shrinkage
    // that needs 1000 m3 of bank material.
    expect(data.fillCompactedM3).toBeCloseTo(900, 6);
    expect(data.fillBankEquivalentM3).toBeCloseTo(1000, 6);
  });

  it("splits the balance into a surplus or an import, never both", () => {
    const surplus = run();
    // 1500 cut against 0 fill: 1500 m3 surplus, no import.
    expect(surplus.netBankSurplusM3).toBeCloseTo(1500, 6);
    expect(surplus.importBankM3).toBe(0);

    const deficit = run({
      stations: [
        { chainageM: 0, cutAreaM2: 0, fillAreaM2: 9 },
        { chainageM: 100, cutAreaM2: 0, fillAreaM2: 9 },
      ],
    });
    expect(deficit.netBankSurplusM3).toBe(0);
    expect(deficit.importBankM3).toBeCloseTo(1000, 6);
  });

  it("claims no reuse balance when suitability was not confirmed", () => {
    const data = run({ cutSuitableForFill: false });
    expect(data.netBankSurplusM3).toBeNull();
    expect(data.importBankM3).toBeNull();
    // The measured volumes are still reported.
    expect(data.cutBankM3).toBeCloseTo(1500, 6);
  });
});

describe("Earthworks Cut & Fill: refuses impossible survey input", () => {
  it("needs at least two stations", () => {
    const result = calculateEarthwork({
      stations: [{ chainageM: 0, cutAreaM2: 10, fillAreaM2: 0 }],
      bulkingPercent: 25,
      shrinkagePercent: 10,
      cutSuitableForFill: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("at least two");
  });

  it("rejects duplicated or reversed chainages", () => {
    for (const stations of [
      [
        { chainageM: 0, cutAreaM2: 10, fillAreaM2: 0 },
        { chainageM: 0, cutAreaM2: 20, fillAreaM2: 0 },
      ],
      [
        { chainageM: 100, cutAreaM2: 10, fillAreaM2: 0 },
        { chainageM: 0, cutAreaM2: 20, fillAreaM2: 0 },
      ],
    ]) {
      const result = calculateEarthwork({
        stations,
        bulkingPercent: 25,
        shrinkagePercent: 10,
        cutSuitableForFill: true,
      });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects a shrinkage of 100 per cent, which has no finite source volume", () => {
    const result = calculateEarthwork({
      stations: [
        { chainageM: 0, cutAreaM2: 10, fillAreaM2: 0 },
        { chainageM: 100, cutAreaM2: 20, fillAreaM2: 0 },
      ],
      bulkingPercent: 25,
      shrinkagePercent: 100,
      cutSuitableForFill: true,
    });
    expect(result.ok).toBe(false);
  });
});
