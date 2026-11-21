import { describe, expect, it } from "vitest";
import {
  calculateConcreteTakeoff,
  type ConcreteTakeoffInput,
} from "@/lib/estimation/advanced-takeoff-engine";

/**
 * Audit 5 conformance suite: Concrete Slab Takeoff.
 *
 * Expected quantities are the published site figures for a nominal mix, worked
 * here from the dry-volume method rather than read back from the engine:
 *   1 m3 wet, 1:2:4, 50 kg bags, dry factor 1.54, cement at 1440 kg/m3
 *   cement  1.54/7   = 0.2200 m3 = 316.8 kg = 6.34 bags -> 7 whole bags
 *   sand    1.54x2/7 = 0.4400 m3
 *   granite 1.54x4/7 = 0.8800 m3
 */

const takeoff = (over: Partial<ConcreteTakeoffInput> = {}) => {
  const result = calculateConcreteTakeoff({
    elementType: "slab",
    lengthM: 1,
    widthM: 1,
    depthM: 1,
    cementParts: 1,
    sandParts: 2,
    aggregateParts: 4,
    wastePercent: 0,
    cementBagMassKg: 50,
    ...over,
  });
  if (!result.ok || !result.data) throw new Error(result.errors.join("; "));
  return result.data;
};

describe("Concrete Slab Takeoff: nominal mix quantities", () => {
  it("gives 6.34 bags, 0.44 m3 sand and 0.88 m3 granite per m3 of 1:2:4", () => {
    const data = takeoff();
    expect(data.concreteVolumeM3).toBeCloseTo(1, 6);
    expect(data.cementBagsRaw).toBeCloseTo(6.34, 2);
    expect(data.cementBagsToBuy).toBe(7);
    expect(data.sandM3).toBeCloseTo(0.44, 2);
    expect(data.aggregateM3).toBeCloseTo(0.88, 2);
  });

  it("gives 8.06 bags for a 1:1.5:3 mix, procured as 9", () => {
    // 1.54/5.5 = 0.28 m3 = 403.2 kg = 8.064 bags of 50 kg.
    const data = takeoff({ sandParts: 1.5, aggregateParts: 3 });
    expect(data.cementBagsRaw).toBeCloseTo(8.06, 1);
    expect(data.cementBagsToBuy).toBe(9);
  });

  it("gives 4.43 bags for a 1:3:6 mix, procured as 5", () => {
    // 1.54/10 = 0.154 m3 = 221.8 kg = 4.435 bags.
    const data = takeoff({ sandParts: 3, aggregateParts: 6 });
    expect(data.cementBagsRaw).toBeCloseTo(4.44, 1);
    expect(data.cementBagsToBuy).toBe(5);
  });

  it("doubles the bag count when the market sells 25 kg bags", () => {
    const data = takeoff({ cementBagMassKg: 25 });
    expect(data.cementBagsRaw).toBeCloseTo(12.67, 1);
    expect(data.cementBagsToBuy).toBe(13);
  });

  it("applies the allowance to the volume before the dry factor", () => {
    // 10 m3 at 5 per cent is 10.5 m3 wet, then 16.17 m3 dry.
    const data = takeoff({ lengthM: 5, widthM: 2, depthM: 1, wastePercent: 5 });
    expect(data.volumeWithWasteM3).toBeCloseTo(10.5, 6);
    expect(data.cementBagsRaw).toBeCloseTo((10.5 * 1.54) / 7 / (50 / 1440), 4);
  });
});

describe("Concrete Slab Takeoff: scheduled rebar weight", () => {
  it("uses the BS 4449 nominal mass 0.006165 d squared", () => {
    const data = takeoff({
      rebarGroups: [
        { label: "T16 bottom", diameterMm: 16, count: 10, lengthM: 5 },
        { label: "T12 links", diameterMm: 12, count: 20, lengthM: 1.2 },
      ],
    });
    // 16 mm: 1.578 kg/m over 50 m; 12 mm: 0.888 kg/m over 24 m.
    expect(data.rebarGroups[0].weightKg).toBeCloseTo(50 * 0.006165 * 256, 3);
    expect(data.rebarGroups[1].weightKg).toBeCloseTo(24 * 0.006165 * 144, 3);
    expect(data.rebarWeightKg).toBeCloseTo(
      50 * 0.006165 * 256 + 24 * 0.006165 * 144,
      3,
    );
  });

  it("reports no rebar weight rather than zero when no schedule is entered", () => {
    expect(takeoff().rebarWeightKg).toBeNull();
  });

  it("drops rows with a zero count instead of counting them as bars", () => {
    const data = takeoff({
      rebarGroups: [
        { label: "T16", diameterMm: 16, count: 0, lengthM: 5 },
        { label: "T12", diameterMm: 12, count: 4, lengthM: 2 },
      ],
    });
    expect(data.rebarGroups).toHaveLength(1);
    expect(data.rebarWeightKg).toBeCloseTo(8 * 0.006165 * 144, 3);
  });
});

describe("Concrete Slab Takeoff: refuses to guess", () => {
  it("returns errors instead of a quantity when a dimension is missing", () => {
    for (const depthM of [0, -1, Number.NaN]) {
      const result = calculateConcreteTakeoff({
        elementType: "slab",
        lengthM: 4,
        widthM: 3,
        depthM,
        cementParts: 1,
        sandParts: 2,
        aggregateParts: 4,
        wastePercent: 0,
        cementBagMassKg: 50,
      });
      expect(result.ok).toBe(false);
      expect(result.data).toBeNull();
    }
  });

  it("rejects an allowance outside 0 to 100 per cent", () => {
    const result = calculateConcreteTakeoff({
      elementType: "slab",
      lengthM: 4,
      widthM: 3,
      depthM: 0.15,
      cementParts: 1,
      sandParts: 2,
      aggregateParts: 4,
      wastePercent: 150,
      cementBagMassKg: 50,
    });
    expect(result.ok).toBe(false);
  });
});
