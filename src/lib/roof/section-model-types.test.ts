import { describe, it, expect } from "vitest";
import type { RoofSectionSpec, MultiRoofSpec, RoofSectionCalculation } from "@/lib/roof/section-model-types";

describe("roof section model types", () => {
  it("RoofSectionSpec has required fields", () => {
    const spec: RoofSectionSpec = {
      id: "section-1",
      name: "Main roof",
      length: 10,
      width: 8,
      pitch: 35,
    } as RoofSectionSpec;
    expect(spec.id).toBe("section-1");
    expect(spec.length).toBe(10);
  });

  it("MultiRoofSpec contains multiple sections", () => {
    const spec: MultiRoofSpec = {
      sections: [
        { id: "s1", name: "Front", length: 10, width: 8, pitch: 35 } as RoofSectionSpec,
        { id: "s2", name: "Back", length: 12, width: 8, pitch: 30 } as RoofSectionSpec,
      ],
    } as MultiRoofSpec;
    expect(spec.sections).toHaveLength(2);
  });
});
