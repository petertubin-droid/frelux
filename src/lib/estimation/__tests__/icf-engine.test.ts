import { describe, it, expect } from "vitest";
import {
  calculateIcfWall,
  ICF_FILL_FACTORS,
  type IcfWallInput,
} from "../icf-engine";

describe("ICF Engineering & Takeoff Engine", () => {
  const baseInput: IcfWallInput = {
    wallLengthM: 40,
    wallHeightM: 3.0,
    coreThicknessMm: 150,
    foamType: "standard_eps",
    corners90Count: 4,
    corners45Count: 0,
    tWallsCount: 0,
    verticalRebarSize: "12M",
    verticalRebarSpacingMm: 400,
    horizontalRebarCourses: "every_course",
    wasteFactorPercent: 4,
    isBasement: false,
    marketCode: "US",
    laborCrewSize: 4,
  };

  it("calculates gross geometry, block count and corner allocation correctly", () => {
    const res = calculateIcfWall(baseInput);

    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.geometry.grossAreaM2).toBe(120);
    expect(res.geometry.netWallAreaM2).toBe(120);
    expect(res.geometry.wallHeightCourses).toBe(8); // 3.0m / 0.4m = 7.5 -> 8 courses

    // 4 corners x 8 courses = 32 corner blocks
    expect(res.blocks.corner90BlocksCount).toBe(32);
    expect(res.blocks.totalBlocksCount).toBeGreaterThan(
      res.blocks.corner90BlocksCount,
    );
    // Straight blocks + corner blocks equals total blocks
    expect(
      res.blocks.straightBlocksCount + res.blocks.corner90BlocksCount,
    ).toBe(res.blocks.totalBlocksCount);
  });

  it("deducts openings accurately and calculates rough bucking and lintels", () => {
    const inputWithOpenings: IcfWallInput = {
      ...baseInput,
      openings: [
        {
          id: "win-1",
          label: "Living Room Window",
          widthM: 1.8,
          heightM: 1.2,
          count: 2,
        },
        {
          id: "door-1",
          label: "Entry Door",
          widthM: 1.0,
          heightM: 2.1,
          count: 1,
        },
      ],
    };

    const res = calculateIcfWall(inputWithOpenings);

    const expectedOpeningsArea = 1.8 * 1.2 * 2 + 1.0 * 2.1 * 1; // 4.32 + 2.10 = 6.42 m²
    expect(res.geometry.openingsAreaM2).toBeCloseTo(expectedOpeningsArea, 2);
    expect(res.geometry.netWallAreaM2).toBeCloseTo(120 - 6.42, 2);

    // Rough buck perimeter: 2*(1.8+1.2)*2 + 2*(1.0+2.1)*1 = 12 + 6.2 = 18.2m
    expect(res.openings.totalBuckPerimeterM).toBe(18.2);
    expect(res.openings.totalOpeningsCount).toBe(3);
    expect(res.openings.polyurethaneFoamCans).toBeGreaterThan(0);

    // Both openings span >= 0.8m, so lintel header rebar is generated
    expect(res.reinforcement.lintelsTensileLengthM).toBeGreaterThan(0);
    expect(res.reinforcement.lintelsStirrupsCount).toBeGreaterThan(0);
  });

  it("scales concrete core volume with core thickness and web displacement", () => {
    const res150 = calculateIcfWall({ ...baseInput, coreThicknessMm: 150 });
    const res200 = calculateIcfWall({ ...baseInput, coreThicknessMm: 200 });
    const res300 = calculateIcfWall({ ...baseInput, coreThicknessMm: 300 });

    // Core volumes should scale proportionally with thickness
    expect(res200.concrete.netVolumeM3).toBeGreaterThan(
      res150.concrete.netVolumeM3,
    );
    expect(res300.concrete.netVolumeM3).toBeGreaterThan(
      res200.concrete.netVolumeM3,
    );

    // 120m² * 0.15m * 0.985 = ~17.73 m³ net
    expect(res150.concrete.netVolumeM3).toBeCloseTo(17.73, 1);
    expect(res150.concrete.totalVolumeM3).toBeGreaterThan(
      res150.concrete.netVolumeM3,
    );
    expect(res150.concrete.readyMixTrucks6M3).toBe(
      Math.ceil(res150.concrete.totalVolumeM3 / 6),
    );
    expect(res150.concrete.maxPourLiftRateMPerHour).toBe(1.2);
  });

  it("calculates rebar grid, starter dowels and total steel tonnage", () => {
    const res = calculateIcfWall(baseInput);

    expect(res.reinforcement.dowelsCount).toBeGreaterThan(100);
    expect(res.reinforcement.verticalBarsCount).toBe(
      res.reinforcement.dowelsCount,
    );
    expect(res.reinforcement.horizontalCoursesCount).toBe(8);
    expect(res.reinforcement.totalSteelWeightKg).toBeGreaterThan(0);
    expect(res.reinforcement.totalSteelWeightTonnes).toBeCloseTo(
      res.reinforcement.totalSteelWeightKg / 1000,
      3,
    );
    expect(res.reinforcement.tieWireRolls).toBeGreaterThan(0);
  });

  it("outputs correct thermal, acoustic and fire ratings for standard EPS and Neopor", () => {
    const eps = calculateIcfWall({
      ...baseInput,
      foamType: "standard_eps",
      coreThicknessMm: 150,
    });
    const neopor = calculateIcfWall({
      ...baseInput,
      foamType: "graphite_neopor",
      coreThicknessMm: 200,
    });

    // The R-value is calculated from the 64 mm foam each face, the core and the
    // lining, so a 150 mm standard EPS wall lands near R-20.6, not a fixed R-22.
    expect(eps.envelope.continuousRValueImperial).toBeGreaterThan(19);
    expect(eps.envelope.continuousRValueImperial).toBeLessThan(22);
    expect(eps.envelope.acousticStcRating).toBe(50);
    expect(eps.envelope.fireResistanceHours).toBe(2.0);

    expect(neopor.envelope.continuousRValueImperial).toBeGreaterThan(
      eps.envelope.continuousRValueImperial,
    );
    expect(neopor.envelope.thermalTransmittanceUValue).toBeLessThan(
      eps.envelope.thermalTransmittanceUValue,
    );
    expect(neopor.envelope.acousticStcRating).toBe(53);
    // Same lining, so the same published fire resistance, whatever the core.
    expect(neopor.envelope.fireResistanceHours).toBe(2.0);
    expect(neopor.envelope.fireBasis).toMatch(/tested|listing/i);
  });

  it("adds membrane and dimple drainage board when isBasement is true", () => {
    const aboveGrade = calculateIcfWall({ ...baseInput, isBasement: false });
    const belowGrade = calculateIcfWall({ ...baseInput, isBasement: true });

    expect(aboveGrade.waterproofing).toBeUndefined();
    expect(belowGrade.waterproofing).toBeDefined();
    expect(belowGrade.waterproofing?.peelAndStickMembraneM2).toBeGreaterThan(
      120,
    );
    expect(belowGrade.waterproofing?.dimpleDrainageBoardM2).toBeGreaterThan(
      120,
    );
    expect(belowGrade.waterproofing?.terminationBarM).toBeGreaterThan(40);
  });

  it("calculates labor man-hours and shows meaningful savings over traditional blockwork", () => {
    const res = calculateIcfWall(baseInput);

    expect(res.labor.totalManHours).toBeGreaterThan(0);
    expect(res.labor.traditionalBlockworkManHoursComparison).toBeGreaterThan(
      res.labor.totalManHours,
    );
    expect(res.labor.laborSavingsPercentage).toBeGreaterThanOrEqual(40);
    expect(res.labor.estimatedCrewDays).toBeGreaterThan(0);
  });

  it("generates structured BOQ lines and code compliance citations", () => {
    const res = calculateIcfWall(baseInput);

    expect(res.boq.length).toBeGreaterThan(5);
    expect(res.boq.some((item) => item.code === "ICF-BLK-STR")).toBe(true);
    expect(res.boq.some((item) => item.code === "CONC-ICF-PUMP")).toBe(true);
    expect(res.boq.some((item) => item.code === "BRC-JACK-TURN")).toBe(true);

    expect(res.codeCitations.length).toBeGreaterThanOrEqual(4);
    expect(res.codeCitations.some((c) => c.code.includes("IRC"))).toBe(true);
    expect(res.codeCitations.some((c) => c.code.includes("Eurocode"))).toBe(
      true,
    );
    expect(res.codeCitations.some((c) => c.code.includes("AS 3600"))).toBe(
      true,
    );
  });

  it("validates zero or invalid input dimensions", () => {
    const badLength = calculateIcfWall({ ...baseInput, wallLengthM: 0 });
    expect(badLength.ok).toBe(false);
    expect(badLength.errors).toContain(
      "Wall length must be greater than zero.",
    );

    const badOpenings = calculateIcfWall({
      ...baseInput,
      wallLengthM: 10,
      wallHeightM: 2.5, // 25 m² gross
      openings: [
        {
          id: "giant-wall",
          label: "Glass Wall",
          widthM: 6,
          heightM: 5,
          count: 1,
        },
      ], // 30 m²
    });
    expect(badOpenings.ok).toBe(false);
    expect(badOpenings.errors[0]).toContain(
      "cannot exceed or equal gross wall area",
    );
  });

  describe("form family and concrete volume", () => {
    it("fills a flat cavity and leaves most of a waffle or screen cavity void", () => {
      const flat = calculateIcfWall({ ...baseInput, formSystem: "flat" });
      const waffle = calculateIcfWall({ ...baseInput, formSystem: "waffle" });
      const screen = calculateIcfWall({ ...baseInput, formSystem: "screen" });

      expect(flat.concrete.fillFactor).toBe(ICF_FILL_FACTORS.flat);
      expect(waffle.concrete.fillFactor).toBe(ICF_FILL_FACTORS.waffle);
      expect(screen.concrete.fillFactor).toBe(ICF_FILL_FACTORS.screen);

      expect(waffle.concrete.netVolumeM3).toBeLessThan(
        flat.concrete.netVolumeM3,
      );
      expect(screen.concrete.netVolumeM3).toBeLessThan(
        waffle.concrete.netVolumeM3,
      );

      // 120 m² of 150 mm flat wall is about 17.7 m³ of concrete.
      expect(flat.concrete.netVolumeM3).toBeCloseTo(
        120 * 0.15 * ICF_FILL_FACTORS.flat,
        1,
      );
      // A waffle grid at 60% of the same cavity.
      expect(waffle.concrete.netVolumeM3).toBeCloseTo(120 * 0.15 * 0.6, 1);
    });

    it("keeps the pump allowance separate from the cutting waste", () => {
      const res = calculateIcfWall({
        ...baseInput,
        wasteFactorPercent: 10,
        concreteWastePercent: 5,
      });
      expect(res.concrete.pumpPrimeLossM3).toBeCloseTo(
        res.concrete.netVolumeM3 * 0.05,
        1,
      );
      expect(res.concrete.totalVolumeM3).toBeCloseTo(
        res.concrete.netVolumeM3 + res.concrete.pumpPrimeLossM3,
        2,
      );
    });
  });

  describe("mix design follows the grade", () => {
    it("uses the cement content of the grade entered", () => {
      const weak = calculateIcfWall({ ...baseInput, concreteGrade: "C20_25" });
      const strong = calculateIcfWall({
        ...baseInput,
        concreteGrade: "C30_37",
      });

      expect(weak.concrete.mixDesign.cementKgPerM3).toBe(320);
      expect(strong.concrete.mixDesign.cementKgPerM3).toBe(400);
      expect(strong.concrete.siteMixCementBags).toBeGreaterThan(
        weak.concrete.siteMixCementBags,
      );
      expect(strong.concrete.mixDesign.waterCementRatio).toBeLessThan(
        weak.concrete.mixDesign.waterCementRatio,
      );
      // Water is derived from the cement content and the ratio, not a fixed 175 l.
      expect(strong.concrete.siteMixWaterLitres).toBeGreaterThan(0);
    });
  });

  describe("envelope is calculated, not asserted", () => {
    it("raises the R-value with thicker foam and with graphite foam", () => {
      const thin = calculateIcfWall({
        ...baseInput,
        foamThicknessPerSideMm: 50,
      });
      const thick = calculateIcfWall({
        ...baseInput,
        foamThicknessPerSideMm: 100,
      });
      const graphite = calculateIcfWall({
        ...baseInput,
        foamThicknessPerSideMm: 50,
        foamType: "graphite_neopor",
      });

      expect(thick.envelope.continuousRValueImperial).toBeGreaterThan(
        thin.envelope.continuousRValueImperial,
      );
      expect(graphite.envelope.continuousRValueImperial).toBeGreaterThan(
        thin.envelope.continuousRValueImperial,
      );
      // U-value is the reciprocal of the assembly resistance PLUS the ISO 6946
      // surface films (0.13 inside + 0.04 outside). Quoting 1/R alone would
      // overstate heat loss, and EIFS applies the same films.
      const FILMS_RSI = 0.17;
      expect(thin.envelope.thermalTransmittanceUValue).toBeCloseTo(
        1 / (thin.envelope.metricRsiValue + FILMS_RSI),
        2,
      );
      // The assembly R-value must NOT include the films, so 1/U is larger.
      expect(1 / thin.envelope.thermalTransmittanceUValue).toBeGreaterThan(
        thin.envelope.metricRsiValue,
      );
      expect(thin.envelope.rValueBasis).toContain("50 mm");
    });

    it("takes fire resistance from the interior lining and says so when unlined", () => {
      const unlined = calculateIcfWall({
        ...baseInput,
        interiorLining: "none",
      });
      const standard = calculateIcfWall({
        ...baseInput,
        interiorLining: "gypsum_12_5",
      });
      const heavy = calculateIcfWall({
        ...baseInput,
        interiorLining: "double_gypsum_12_5",
      });

      expect(unlined.envelope.fireResistanceHours).toBe(0);
      expect(unlined.warnings.join(" ")).toMatch(/thermal barrier/i);
      expect(standard.envelope.fireResistanceHours).toBe(2);
      expect(heavy.envelope.fireResistanceHours).toBe(4);
      expect(heavy.envelope.fireBasis).toMatch(/tested|listing/i);
    });
  });

  describe("reinforcement completeness", () => {
    it("adds two bars each side of every opening and counts bars per web", () => {
      const single = calculateIcfWall({ ...baseInput, verticalBarsPerWeb: 1 });
      const double = calculateIcfWall({ ...baseInput, verticalBarsPerWeb: 2 });
      expect(double.reinforcement.verticalBarsCount).toBe(
        single.reinforcement.verticalBarsCount * 2,
      );

      const withOpening = calculateIcfWall({
        ...baseInput,
        openings: [
          { id: "door", label: "Door", widthM: 1.0, heightM: 2.1, count: 2 },
        ],
      });
      // 2 sides x 2 bars x 2 openings
      expect(withOpening.reinforcement.openingTrimBarsCount).toBe(8);
      expect(withOpening.reinforcement.openingTrimWeightKg).toBeGreaterThan(0);
      expect(withOpening.reinforcement.totalSteelWeightKg).toBeGreaterThan(
        calculateIcfWall(baseInput).reinforcement.totalSteelWeightKg,
      );
    });

    it("doubles the horizontal run when two bars are placed per course", () => {
      const one = calculateIcfWall({
        ...baseInput,
        horizontalBarsPerCourse: 1,
      });
      const two = calculateIcfWall({
        ...baseInput,
        horizontalBarsPerCourse: 2,
      });
      expect(two.reinforcement.horizontalTotalLengthM).toBeCloseTo(
        one.reinforcement.horizontalTotalLengthM * 2,
        0,
      );
    });
  });

  describe("placement and global readiness", () => {
    it("braces at 1.8 m centres and warns above a single-pour height", () => {
      const tall = calculateIcfWall({ ...baseInput, wallHeightM: 6 });
      expect(tall.bracing.recommendedJackSpacingM).toBe(1.8);
      expect(tall.geometry.pourLifts).toBe(5);
      expect(tall.warnings.join(" ")).toMatch(/lifts/i);
    });

    it("leads the code citations with the market's own framework", () => {
      const gb = calculateIcfWall({ ...baseInput, marketCode: "GB" });
      expect(gb.codeCitations[0].code).toMatch(/Eurocode/);

      const us = calculateIcfWall({ ...baseInput, marketCode: "US" });
      expect(us.codeCitations[0].code).toMatch(/IRC|ACI/);

      const unknown = calculateIcfWall({ ...baseInput, marketCode: "ZZ" });
      expect(unknown.codeCitations[0].summary).toMatch(
        /No ICF-specific framework/i,
      );
      // The reference set is still shown, so nothing is hidden from a designer.
      expect(
        unknown.codeCitations.some((c) => c.code.includes("Eurocode")),
      ).toBe(true);
    });

    it("warns that foam below grade is a termite pathway", () => {
      const basement = calculateIcfWall({ ...baseInput, isBasement: true });
      expect(basement.warnings.join(" ")).toMatch(/termite/i);
    });
  });
});
