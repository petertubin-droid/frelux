import { describe, expect, it } from "vitest";
import {
  calculateConcreteTakeoff,
  calculateEarthwork,
  calculateRoofFraming,
} from "./advanced-takeoff-engine";

describe("measured concrete slab takeoff", () => {
  it("calculates slab volume, mix quantities and whole cement bags", () => {
    const result = calculateConcreteTakeoff({
      elementType: "slab",
      lengthM: 5,
      widthM: 4,
      depthM: 0.15,
      cementParts: 1,
      sandParts: 2,
      aggregateParts: 4,
      wastePercent: 0,
      cementBagMassKg: 50,
    });
    expect(result.ok).toBe(true);
    expect(result.data?.concreteVolumeM3).toBeCloseTo(3);
    expect(result.data?.cementBagsRaw).toBeCloseTo((3 * 1.54) / 7 / 0.0347);
    expect(result.data?.cementBagsToBuy).toBe(20);
    expect(result.data?.sandM3).toBeCloseTo((3 * 1.54 * 2) / 7);
    expect(result.data?.aggregateM3).toBeCloseTo((3 * 1.54 * 4) / 7);
  });
  it("weights only a supplied bar schedule and refuses incomplete dimensions or ratios", () => {
    const valid = calculateConcreteTakeoff({
      elementType: "slab",
      lengthM: 5,
      widthM: 4,
      depthM: 0.15,
      cementParts: 1,
      sandParts: 2,
      aggregateParts: 4,
      wastePercent: 0,
      cementBagMassKg: 50,
      rebarGroups: [
        { label: "Bottom bars X", diameterMm: 12, count: 10, lengthM: 4 },
      ],
    });
    expect(valid.data?.rebarWeightKg).toBeCloseTo((10 * 4 * 12 ** 2) / 162);
    expect(
      calculateConcreteTakeoff({
        lengthM: 0,
        widthM: 4,
        depthM: 0.15,
        cementParts: 1,
        sandParts: 2,
        aggregateParts: 4,
        wastePercent: 0,
        cementBagMassKg: 50,
      }).ok,
    ).toBe(false);
    expect(
      calculateConcreteTakeoff({
        elementType: "slab",
        lengthM: 5,
        widthM: 4,
        depthM: 0.15,
        cementParts: 1,
        sandParts: 0,
        aggregateParts: 4,
        wastePercent: 0,
        cementBagMassKg: 50,
      }).ok,
    ).toBe(false);
  });
});

describe("surveyed average-end-area earthworks", () => {
  it("computes separate cut/fill, loose haul, bank-equivalent fill and compatible reuse", () => {
    const result = calculateEarthwork({
      stations: [
        { chainageM: 0, cutAreaM2: 2, fillAreaM2: 1 },
        { chainageM: 10, cutAreaM2: 4, fillAreaM2: 3 },
      ],
      bulkingPercent: 20,
      shrinkagePercent: 10,
      cutSuitableForFill: true,
    });
    expect(result.ok).toBe(true);
    expect(result.data?.cutBankM3).toBe(30);
    expect(result.data?.fillCompactedM3).toBe(20);
    expect(result.data?.cutLooseM3).toBe(36);
    expect(result.data?.fillBankEquivalentM3).toBeCloseTo(20 / 0.9);
    expect(result.data?.netBankSurplusM3).toBeCloseTo(30 - 20 / 0.9);
    expect(result.data?.importBankM3).toBe(0);
  });
  it("does not claim reuse balance without suitability confirmation and rejects unsorted stations", () => {
    const base = {
      stations: [
        { chainageM: 10, cutAreaM2: 1, fillAreaM2: 0 },
        { chainageM: 0, cutAreaM2: 1, fillAreaM2: 0 },
      ],
      bulkingPercent: 10,
      shrinkagePercent: 5,
      cutSuitableForFill: false,
    };
    expect(calculateEarthwork(base).ok).toBe(false);
    const valid = calculateEarthwork({
      ...base,
      stations: [...base.stations].reverse(),
    });
    expect(valid.data?.netBankSurplusM3).toBeNull();
    expect(valid.data?.importBankM3).toBeNull();
  });
});

describe("rectangular roof framing takeoff", () => {
  const sections = {
    common: { widthIn: 2, depthIn: 6 },
    jack: { widthIn: 2, depthIn: 6 },
    hip: { widthIn: 3, depthIn: 8 },
    ridge: { widthIn: 2, depthIn: 8 },
  };
  it("returns gable rafter count and board feet from explicit sections", () => {
    const result = calculateRoofFraming({
      lengthM: 10,
      widthM: 8,
      pitchRisePer12: 6,
      overhangM: 0,
      spacingM: 0.6,
      roofType: "gable",
      sections,
    });
    expect(result.ok).toBe(true);
    expect(
      result.data?.groups.find((group) => group.label === "Common rafters")
        ?.count,
    ).toBe(36);
    expect(result.data?.ridgeLengthM).toBe(10);
    expect(result.data?.totalBoardFeet).toBeGreaterThan(0);
    expect(result.data?.valleyStatus).toMatch(/not auto-calculated/);
  });
  it("reports hip/jack geometry and includes user-scheduled valley members in board feet", () => {
    const result = calculateRoofFraming({
      lengthM: 12,
      widthM: 8,
      pitchRisePer12: 6,
      overhangM: 0.3,
      spacingM: 0.6,
      roofType: "hip",
      sections,
      additionalMembers: [
        {
          label: "Valley member, engineer schedule",
          count: 2,
          lengthM: 5,
          widthIn: 3,
          depthIn: 10,
        },
      ],
    });
    expect(result.ok).toBe(true);
    expect(
      result.data?.groups.some((group) =>
        group.label.startsWith("Jack rafters"),
      ),
    ).toBe(true);
    expect(
      result.data?.groups.some((group) =>
        group.label.startsWith("Common rafters"),
      ),
    ).toBe(true);
    expect(
      result.data?.groups.find((group) => group.label === "Hip rafters")?.count,
    ).toBe(4);
    expect(
      result.data?.groups.find((group) =>
        group.label.startsWith("Valley member"),
      )?.boardFeet,
    ).toBeCloseTo((2 * 5 * 3.280839895 * 3 * 10) / 12);
  });
  it("lays out square hip rafters once per equal eave row without duplicate jack groups", () => {
    const result = calculateRoofFraming({
      lengthM: 8,
      widthM: 8,
      pitchRisePer12: 6,
      overhangM: 0,
      spacingM: 2,
      roofType: "hip",
      sections,
    });
    expect(result.ok).toBe(true);
    const rafters = result.data!.groups.filter((group) =>
      group.label.startsWith("Jack rafters"),
    );
    expect(rafters.reduce((sum, group) => sum + group.count, 0)).toBe(12);
    expect(rafters.every((group) => group.count % 4 === 0)).toBe(true);
    expect(
      rafters.reduce((sum, group) => sum + group.boardFeet, 0),
    ).toBeGreaterThan(0);
    expect(result.data!.ridgeLengthM).toBe(0);
  });
  it("rejects missing member sections and invalid roof inputs", () => {
    expect(
      calculateRoofFraming({
        lengthM: 10,
        widthM: 8,
        pitchRisePer12: 0,
        overhangM: 0,
        spacingM: 0.6,
        roofType: "gable",
        sections,
      }).ok,
    ).toBe(false);
  });
});

describe("project direct costs and weekly overhead", () => {
  it("sums explicit materials, direct costs, labor hours, rate and weeks of overhead", async () => {
    const { calculateProjectCost } = await import("./advanced-takeoff-engine");
    const result = calculateProjectCost({
      materials: 50000,
      otherDirectCosts: 5000,
      laborHours: 120,
      laborRatePerHour: 25,
      weeklyOverhead: 600,
      durationWeeks: 8,
    });
    expect(result.data).toEqual({
      materials: 50000,
      otherDirectCosts: 5000,
      laborCost: 3000,
      overheadCost: 4800,
      directAndOverheadCost: 62800,
    });
  });
  it("rejects negative cost inputs", async () => {
    const { calculateProjectCost } = await import("./advanced-takeoff-engine");
    expect(
      calculateProjectCost({
        materials: -1,
        otherDirectCosts: 0,
        laborHours: 0,
        laborRatePerHour: 0,
        weeklyOverhead: 0,
        durationWeeks: 0,
      }).ok,
    ).toBe(false);
  });
});
