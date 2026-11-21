import { describe, expect, it } from "vitest";
import {
  calculateRoofFraming,
  type RoofFramingInput,
} from "@/lib/estimation/advanced-takeoff-engine";

/**
 * Audit 8 conformance suite: Roof Framing & Board Feet.
 *
 * Geometry is worked here from the plan, not read back from the engine:
 *   eave length      = building length + 2 x overhang
 *   half span        = (building width + 2 x overhang) / 2
 *   rafter length    = half span / cos(pitch)
 *   rise             = half span x tan(pitch)
 *   gable ridge      = full eave length
 *   hip ridge        = long eave - short eave
 *   hip rafter       = half span x sqrt(2 + tan^2(pitch))
 *   board feet       = length (ft) x width (in) x depth (in) / 12
 */

const SECTION_2X6 = { widthIn: 1.5, depthIn: 5.5 };
const SECTIONS = {
  common: SECTION_2X6,
  jack: SECTION_2X6,
  hip: SECTION_2X6,
  ridge: SECTION_2X6,
};

const roof = (over: Partial<RoofFramingInput> = {}) => {
  const result = calculateRoofFraming({
    lengthM: 10,
    widthM: 8,
    pitchRisePer12: 6,
    overhangM: 0.5,
    spacingM: 0.6,
    roofType: "gable",
    sections: SECTIONS,
    ...over,
  });
  if (!result.ok || !result.data) throw new Error(result.errors.join("; "));
  return result.data;
};

const DEG = 180 / Math.PI;

describe("Roof Framing: gable geometry", () => {
  const pitch = Math.atan(6 / 12);
  const halfSpan = (8 + 2 * 0.5) / 2;

  it("puts the ridge at the extended building length and the rise at half span", () => {
    const data = roof();
    expect(data.ridgeLengthM).toBeCloseTo(11, 6);
    expect(data.roofRiseM).toBeCloseTo(halfSpan * Math.tan(pitch), 6);
    // 6:12 is 26.565 degrees.
    expect(Math.atan(6 / 12) * DEG).toBeCloseTo(26.565, 2);
  });

  it("measures each rafter along the slope, not in plan", () => {
    const data = roof();
    const common = data.groups.find((g) => g.label === "Common rafters")!;
    expect(common.lengthM).toBeCloseTo(halfSpan / Math.cos(pitch), 6);
    // Slope length is longer than the plan run of 4.5 m.
    expect(common.lengthM).toBeGreaterThan(halfSpan);
  });

  it("counts rafter positions at the requested spacing on both slopes", () => {
    const data = roof();
    const common = data.groups.find((g) => g.label === "Common rafters")!;
    // ceil(11 / 0.6) = 19 intervals, so 20 positions per slope, 40 in total.
    expect(common.count).toBe(40);
    expect(common.layout).toContain("0.579 m actual");
  });

  it("doubles the rise when the pitch doubles at 12:12", () => {
    const data = roof({ pitchRisePer12: 12 });
    // 45 degrees: rise equals the half span, rafter is half span x sqrt(2).
    expect(data.roofRiseM).toBeCloseTo(halfSpan, 6);
    const common = data.groups.find((g) => g.label === "Common rafters")!;
    expect(common.lengthM).toBeCloseTo(halfSpan * Math.SQRT2, 6);
  });
});

describe("Roof Framing: hip geometry", () => {
  const pitch = Math.atan(6 / 12);
  const halfSpan = (8 + 2 * 0.5) / 2;

  it("shortens the ridge by the short eave and adds four equal hips", () => {
    const data = roof({ roofType: "hip" });
    // 11 m long eave less 9 m short eave = 2 m ridge.
    expect(data.ridgeLengthM).toBeCloseTo(2, 6);
    const hips = data.groups.find((g) => g.label === "Hip rafters")!;
    expect(hips.count).toBe(4);
    expect(hips.lengthM).toBeCloseTo(
      halfSpan * Math.sqrt(2 + Math.tan(pitch) ** 2),
      6,
    );
  });

  it("drops the ridge entirely on a square hip", () => {
    const data = roof({ roofType: "hip", lengthM: 10, widthM: 10 });
    expect(data.ridgeLengthM).toBeCloseTo(0, 6);
    expect(data.groups.some((g) => g.label === "Ridge member")).toBe(false);
    // Every position becomes a jack because all four eaves are equal.
    expect(
      data.groups.filter((g) => g.label.startsWith("Jack rafters")).length,
    ).toBeGreaterThan(0);
  });

  it("counts no rafters shorter than the run to the ridge", () => {
    const data = roof({ roofType: "hip" });
    for (const group of data.groups) {
      if (group.label.startsWith("Jack rafters")) {
        expect(group.lengthM).toBeLessThanOrEqual(
          halfSpan / Math.cos(pitch) + 1e-9,
        );
        expect(group.lengthM).toBeGreaterThan(0);
      }
    }
  });
});

describe("Roof Framing: board feet", () => {
  it("uses length in feet times width times depth over twelve", () => {
    // One 10 ft 2x4: 10 x 1.5 x 3.5 / 12 = 4.375 board feet.
    const data = roof({
      additionalMembers: [
        {
          label: "Purlins",
          count: 1,
          lengthM: 3.048,
          widthIn: 1.5,
          depthIn: 3.5,
        },
      ],
    });
    const purlin = data.groups.find((g) => g.label === "Purlins")!;
    expect(purlin.boardFeet).toBeCloseTo(4.375, 2);
  });

  it("adds every group to the totals rather than reporting the last one", () => {
    const data = roof({
      additionalMembers: [
        {
          label: "Purlins",
          count: 4,
          lengthM: 3.048,
          widthIn: 1.5,
          depthIn: 3.5,
        },
      ],
    });
    const summed = data.groups.reduce((sum, g) => sum + g.boardFeet, 0);
    const linear = data.groups.reduce((sum, g) => sum + g.totalLengthM, 0);
    expect(data.totalBoardFeet).toBeCloseTo(summed, 6);
    expect(data.totalLinearM).toBeCloseTo(linear, 6);
    expect(data.groups.length).toBeGreaterThan(2);
  });
});

describe("Roof Framing: refuses what it cannot model", () => {
  const base = {
    lengthM: 10,
    widthM: 8,
    pitchRisePer12: 6,
    overhangM: 0.5,
    spacingM: 0.6,
    roofType: "gable" as const,
    sections: SECTIONS,
  };

  it("refuses a pitch at or beyond the 70 degree model limit", () => {
    // 40:12 is 73.3 degrees.
    const result = calculateRoofFraming({ ...base, pitchRisePer12: 40 });
    expect(result.ok).toBe(false);
  });

  it("refuses a zero or missing member section", () => {
    const result = calculateRoofFraming({
      ...base,
      sections: { ...SECTIONS, hip: { widthIn: 0, depthIn: 5.5 } },
    });
    expect(result.ok).toBe(false);
  });

  it("states that valleys are not calculated instead of guessing them", () => {
    const data = roof();
    expect(data.valleyStatus).toContain("not auto-calculated");
  });
});
