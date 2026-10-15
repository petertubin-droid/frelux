import { describe, expect, it } from "vitest";
import {
  checkRoofMember,
  type RoofMemberCheckInput,
} from "./roof-member-design";

const valid: RoofMemberCheckInput = {
  spanM: 4,
  spacingM: 0.6,
  designAreaLoadKNM2: 2,
  sectionModulusMM3: 300_000,
  secondMomentMM4: 30_000_000,
  shearAreaMM2: 200,
  elasticModulusGPa: 10,
  bendingResistanceMPa: 10,
  shearResistanceMPa: 15,
  maxDeflectionRatio: 200,
};

describe("code-agnostic preliminary roof member check", () => {
  it("calculates reactions, actions, stress and elastic deflection for a single span", () => {
    const { data, errors } = checkRoofMember(valid);
    expect(errors).toEqual([]);
    expect(data?.lineLoadKNM).toBeCloseTo(1.2);
    expect(data?.supportReactionKN).toBeCloseTo(2.4);
    expect(data?.maxMomentKNM).toBeCloseTo(2.4);
    expect(data?.maxShearKN).toBeCloseTo(2.4);
    expect(data?.bendingStressMPa).toBeCloseTo(8);
    expect(data?.shearStressMPa).toBeCloseTo(12);
    expect(data?.deflectionMM).toBeCloseTo(13.333333, 5);
    expect(data?.deflectionLimitMM).toBeCloseTo(20);
    expect(data?.passesEnteredChecks).toBe(true);
  });

  it("reports a failed entered check without implying code non-compliance", () => {
    const { data } = checkRoofMember({ ...valid, bendingResistanceMPa: 7 });
    expect(data?.bendingUtilization).toBeGreaterThan(1);
    expect(data?.passesEnteredChecks).toBe(false);
    expect(data?.exclusions.join(" ")).toMatch(
      /not a construction-ready design/,
    );
  });

  it("refuses missing, non-finite, or non-positive design inputs", () => {
    const result = checkRoofMember({
      ...valid,
      spanM: 0,
      shearAreaMM2: Number.NaN,
    });
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Clear span must be greater than zero.");
    expect(result.errors).toContain(
      "Effective shear area must be greater than zero.",
    );
  });
});
