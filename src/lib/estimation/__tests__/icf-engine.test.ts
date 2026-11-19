import { describe, it, expect } from "vitest";
import {
  calculateIcfWall,
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
    expect(res.blocks.totalBlocksCount).toBeGreaterThan(res.blocks.corner90BlocksCount);
    // Straight blocks + corner blocks equals total blocks
    expect(res.blocks.straightBlocksCount + res.blocks.corner90BlocksCount).toBe(res.blocks.totalBlocksCount);
  });

  it("deducts openings accurately and calculates rough bucking and lintels", () => {
    const inputWithOpenings: IcfWallInput = {
      ...baseInput,
      openings: [
        { id: "win-1", label: "Living Room Window", widthM: 1.8, heightM: 1.2, count: 2 },
        { id: "door-1", label: "Entry Door", widthM: 1.0, heightM: 2.1, count: 1 },
      ],
    };

    const res = calculateIcfWall(inputWithOpenings);

    const expectedOpeningsArea = (1.8 * 1.2 * 2) + (1.0 * 2.1 * 1); // 4.32 + 2.10 = 6.42 m²
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
    expect(res200.concrete.netVolumeM3).toBeGreaterThan(res150.concrete.netVolumeM3);
    expect(res300.concrete.netVolumeM3).toBeGreaterThan(res200.concrete.netVolumeM3);

    // 120m² * 0.15m * 0.985 = ~17.73 m³ net
    expect(res150.concrete.netVolumeM3).toBeCloseTo(17.73, 1);
    expect(res150.concrete.totalVolumeM3).toBeGreaterThan(res150.concrete.netVolumeM3);
    expect(res150.concrete.readyMixTrucks6M3).toBe(Math.ceil(res150.concrete.totalVolumeM3 / 6));
    expect(res150.concrete.maxPourLiftRateMPerHour).toBe(1.2);
  });

  it("calculates rebar grid, starter dowels and total steel tonnage", () => {
    const res = calculateIcfWall(baseInput);

    expect(res.reinforcement.dowelsCount).toBeGreaterThan(100);
    expect(res.reinforcement.verticalBarsCount).toBe(res.reinforcement.dowelsCount);
    expect(res.reinforcement.horizontalCoursesCount).toBe(8);
    expect(res.reinforcement.totalSteelWeightKg).toBeGreaterThan(0);
    expect(res.reinforcement.totalSteelWeightTonnes).toBeCloseTo(res.reinforcement.totalSteelWeightKg / 1000, 3);
    expect(res.reinforcement.tieWireRolls).toBeGreaterThan(0);
  });

  it("outputs correct thermal, acoustic and fire ratings for standard EPS and Neopor", () => {
    const eps = calculateIcfWall({ ...baseInput, foamType: "standard_eps", coreThicknessMm: 150 });
    const neopor = calculateIcfWall({ ...baseInput, foamType: "graphite_neopor", coreThicknessMm: 200 });

    expect(eps.envelope.continuousRValueImperial).toBe(22.0);
    expect(eps.envelope.acousticStcRating).toBe(53);
    expect(eps.envelope.fireResistanceHours).toBe(2.0);

    expect(neopor.envelope.continuousRValueImperial).toBe(28.5);
    expect(neopor.envelope.thermalTransmittanceUValue).toBeLessThan(eps.envelope.thermalTransmittanceUValue);
    expect(neopor.envelope.acousticStcRating).toBe(56);
    expect(neopor.envelope.fireResistanceHours).toBe(3.0);
  });

  it("adds membrane and dimple drainage board when isBasement is true", () => {
    const aboveGrade = calculateIcfWall({ ...baseInput, isBasement: false });
    const belowGrade = calculateIcfWall({ ...baseInput, isBasement: true });

    expect(aboveGrade.waterproofing).toBeUndefined();
    expect(belowGrade.waterproofing).toBeDefined();
    expect(belowGrade.waterproofing?.peelAndStickMembraneM2).toBeGreaterThan(120);
    expect(belowGrade.waterproofing?.dimpleDrainageBoardM2).toBeGreaterThan(120);
    expect(belowGrade.waterproofing?.terminationBarM).toBeGreaterThan(40);
  });

  it("calculates labor man-hours and shows meaningful savings over traditional blockwork", () => {
    const res = calculateIcfWall(baseInput);

    expect(res.labor.totalManHours).toBeGreaterThan(0);
    expect(res.labor.traditionalBlockworkManHoursComparison).toBeGreaterThan(res.labor.totalManHours);
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
    expect(res.codeCitations.some((c) => c.code.includes("Eurocode"))).toBe(true);
    expect(res.codeCitations.some((c) => c.code.includes("AS 3600"))).toBe(true);
  });

  it("validates zero or invalid input dimensions", () => {
    const badLength = calculateIcfWall({ ...baseInput, wallLengthM: 0 });
    expect(badLength.ok).toBe(false);
    expect(badLength.errors).toContain("Wall length must be greater than zero.");

    const badOpenings = calculateIcfWall({
      ...baseInput,
      wallLengthM: 10,
      wallHeightM: 2.5, // 25 m² gross
      openings: [{ id: "giant-wall", label: "Glass Wall", widthM: 6, heightM: 5, count: 1 }], // 30 m²
    });
    expect(badOpenings.ok).toBe(false);
    expect(badOpenings.errors[0]).toContain("cannot exceed or equal gross wall area");
  });
});
