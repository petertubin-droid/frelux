import { describe, it, expect } from "vitest";
import type {
  RoofSectionSpec,
  MultiRoofSpec,
} from "@/lib/roof/section-model-types";

function makeSectionSpec(
  overrides: Partial<RoofSectionSpec> = {},
): RoofSectionSpec {
  return {
    id: "section-1",
    name: "Main roof",
    geometry: null,
    planAreaM2: 10 * 8,
    pitchDegrees: 35,
    roofType: "gable",
    roofingMaterial: "long_span_aluminium",
    overhangM: 0.5,
    wastePercent: 10,
    confirmed: true,
    ...overrides,
  };
}

describe("roof section model types", () => {
  it("RoofSectionSpec has required fields", () => {
    const spec = makeSectionSpec();
    expect(spec.id).toBe("section-1");
    expect(spec.planAreaM2).toBe(80);
    expect(spec.pitchDegrees).toBe(35);
    expect(spec.roofType).toBe("gable");
    expect(spec.roofingMaterial).toBe("long_span_aluminium");
  });

  it("MultiRoofSpec contains multiple sections", () => {
    const spec: MultiRoofSpec = {
      sections: [
        makeSectionSpec({ id: "s1", name: "Front", planAreaM2: 80 }),
        makeSectionSpec({
          id: "s2",
          name: "Back",
          planAreaM2: 96,
          pitchDegrees: 30,
        }),
      ],
      useMultiSection: true,
      confirmed: false,
    };
    expect(spec.sections).toHaveLength(2);
    expect(spec.sections[0].name).toBe("Front");
    expect(spec.sections[1].pitchDegrees).toBe(30);
  });
});
