/**
 * Earthworks conformance (audit 5/34).
 *
 * The calculator converts bank, loose and compacted volumes, so the audit
 * checks the three conversions independently and then probes the edges that
 * quietly corrupt a takeoff: negative areas, a single station, duplicate
 * chainage, and the known bias of the average end-area method.
 */

import { describe, expect, it } from "vitest";

import { calculateEarthwork } from "./advanced-takeoff-engine";

const stations = [
  { chainageM: 0, cutAreaM2: 2, fillAreaM2: 1 },
  { chainageM: 10, cutAreaM2: 4, fillAreaM2: 3 },
];

describe("earthworks volume conversions", () => {
  it("converts bank to loose with bulking and compacted to bank with shrinkage", () => {
    const r = calculateEarthwork({
      stations,
      bulkingPercent: 25,
      shrinkagePercent: 20,
      cutSuitableForFill: true,
    });
    // Average end-area: (2+4)/2 x 10 = 30 bank; (1+3)/2 x 10 = 20 compacted.
    expect(r.data?.cutBankM3).toBe(30);
    expect(r.data?.fillCompactedM3).toBe(20);
    // 30 bank swells 25% -> 37.5 loose hauled.
    expect(r.data?.cutLooseM3).toBeCloseTo(37.5, 6);
    // 20 compacted needs 20/(1-0.20) = 25 bank of source material.
    expect(r.data?.fillBankEquivalentM3).toBeCloseTo(25, 6);
    // 30 bank available, 25 needed: 5 bank surplus.
    expect(r.data?.netBankSurplusM3).toBeCloseTo(5, 6);
  });

  it("scales linearly with the section areas", () => {
    const doubled = calculateEarthwork({
      stations: stations.map((s) => ({
        ...s,
        cutAreaM2: s.cutAreaM2 * 2,
        fillAreaM2: s.fillAreaM2 * 2,
      })),
      bulkingPercent: 10,
      shrinkagePercent: 10,
      cutSuitableForFill: true,
    });
    expect(doubled.data?.cutBankM3).toBe(60);
    expect(doubled.data?.fillCompactedM3).toBe(40);
  });

  it("states the average end-area bias instead of hiding it", () => {
    // A wedge tapering to zero: average end-area gives (0+10)/2 x 10 = 50 m3,
    // the prismoidal answer is 10 x 10 / 3 = 33.3 m3. Average end-area
    // overstates by up to a third, so the method must be stated, not implied.
    const wedge = calculateEarthwork({
      stations: [
        { chainageM: 0, cutAreaM2: 0, fillAreaM2: 0 },
        { chainageM: 10, cutAreaM2: 10, fillAreaM2: 0 },
      ],
      bulkingPercent: 0,
      shrinkagePercent: 0,
      cutSuitableForFill: false,
    });
    expect(wedge.data?.cutBankM3).toBe(50);
    expect(wedge.data?.assumptions.join(" ")).toMatch(/average end-area/i);
  });
});

describe("earthworks input guards", () => {
  it("refuses a negative section area", () => {
    const r = calculateEarthwork({
      stations: [
        { chainageM: 0, cutAreaM2: -5, fillAreaM2: 0 },
        { chainageM: 10, cutAreaM2: 4, fillAreaM2: 0 },
      ],
      bulkingPercent: 10,
      shrinkagePercent: 5,
      cutSuitableForFill: false,
    });
    expect(r.ok).toBe(false);
  });

  it("refuses a single station, which cannot define a volume", () => {
    const r = calculateEarthwork({
      stations: [{ chainageM: 0, cutAreaM2: 2, fillAreaM2: 1 }],
      bulkingPercent: 10,
      shrinkagePercent: 5,
      cutSuitableForFill: false,
    });
    expect(r.ok).toBe(false);
  });

  it("refuses bulking above 300% and shrinkage at 100%", () => {
    const base = { stations, cutSuitableForFill: false };
    expect(
      calculateEarthwork({ ...base, bulkingPercent: 301, shrinkagePercent: 5 })
        .ok,
    ).toBe(false);
    expect(
      calculateEarthwork({ ...base, bulkingPercent: 10, shrinkagePercent: 100 })
        .ok,
    ).toBe(false);
  });

  it("refuses duplicate chainage rather than silently merging two sections", () => {
    // Two cross sections at the same station is a data error, not a zero-length
    // interval: merging them would average two different measurements.
    const r = calculateEarthwork({
      stations: [
        { chainageM: 0, cutAreaM2: 2, fillAreaM2: 0 },
        { chainageM: 0, cutAreaM2: 2, fillAreaM2: 0 },
        { chainageM: 10, cutAreaM2: 2, fillAreaM2: 0 },
      ],
      bulkingPercent: 0,
      shrinkagePercent: 0,
      cutSuitableForFill: false,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/strictly increasing/i);
  });
});
