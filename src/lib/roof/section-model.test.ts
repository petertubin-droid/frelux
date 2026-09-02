import { describe, it, expect } from "vitest";
import {
  pitchAdjustedArea,
  getSectionPlanArea,
  getSectionMissing,
  createRoofSectionSpec,
  createDefaultMultiRoofSpec,
  addRoofSection,
  removeRoofSection,
  updateRoofSection,
  renameRoofSection,
  confirmMultiRoofSpec,
  calculateMultiRoof,
} from "@/lib/roof/section-model";
import type {
  RoofSectionSpec,
  MultiRoofSpec,
} from "@/lib/roof/section-model-types";

describe("pitchAdjustedArea", () => {
  it("returns 0 for invalid plan area", () => {
    expect(pitchAdjustedArea(0, 30, "gable")).toBe(0);
    expect(pitchAdjustedArea(-10, 30, "gable")).toBe(0);
  });
  it("returns plan area for flat roofs", () => {
    expect(pitchAdjustedArea(100, 30, "flat")).toBe(100);
  });
  it("returns plan area when pitch is null", () => {
    expect(pitchAdjustedArea(100, null, "gable")).toBe(100);
  });
  it("returns plan area when pitch is 0", () => {
    expect(pitchAdjustedArea(100, 0, "gable")).toBe(100);
  });
  it("applies pitch adjustment for pitched roofs", () => {
    const result = pitchAdjustedArea(100, 45, "gable");
    // 100 / cos(45°) = 100 / 0.7071 ≈ 141.42
    expect(result).toBeCloseTo(141.42, 1);
  });
  it("returns plan area for near-vertical (90°)", () => {
    expect(pitchAdjustedArea(100, 90, "gable")).toBe(100);
  });
  it("applies 30° pitch correctly", () => {
    const result = pitchAdjustedArea(100, 30, "hip");
    // 100 / cos(30°) = 100 / 0.866 ≈ 115.47
    expect(result).toBeCloseTo(115.47, 1);
  });
});

describe("getSectionPlanArea", () => {
  it("returns manual area when no geometry", () => {
    const section = { ...createRoofSectionSpec(), planAreaM2: 50 };
    expect(getSectionPlanArea(section)).toBe(50);
  });
  it("returns 0 when no geometry and no manual area", () => {
    const section = { ...createRoofSectionSpec(), planAreaM2: null };
    expect(getSectionPlanArea(section)).toBe(0);
  });
});

describe("getSectionMissing", () => {
  it("returns area missing when plan area is 0", () => {
    const section = { ...createRoofSectionSpec(), planAreaM2: null };
    const missing = getSectionMissing(section);
    expect(missing.some((m) => m.includes("area"))).toBe(true);
  });
  it("returns pitch missing for non-flat without pitch", () => {
    const section = {
      ...createRoofSectionSpec(),
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: "gable" as const,
    };
    const missing = getSectionMissing(section);
    expect(missing).toContain("pitch");
  });
  it("returns empty for complete flat roof section", () => {
    const section = {
      ...createRoofSectionSpec(),
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: "flat" as const,
    };
    expect(getSectionMissing(section)).toEqual([]);
  });
  it("returns empty for complete pitched section", () => {
    const section = {
      ...createRoofSectionSpec(),
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: "gable" as const,
    };
    expect(getSectionMissing(section)).toEqual([]);
  });
});

describe("createRoofSectionSpec", () => {
  it("creates a section with default name", () => {
    const s = createRoofSectionSpec();
    expect(s.name).toBe("New Section");
    expect(s.id).toBeTruthy();
    expect(s.confirmed).toBe(false);
    expect(s.geometry).toBeNull();
  });
  it("creates a section with custom name", () => {
    const s = createRoofSectionSpec("Garage");
    expect(s.name).toBe("Garage");
  });
});

describe("createDefaultMultiRoofSpec", () => {
  it("creates spec with one section", () => {
    const spec = createDefaultMultiRoofSpec();
    expect(spec.sections).toHaveLength(1);
    expect(spec.useMultiSection).toBe(false);
    expect(spec.confirmed).toBe(false);
  });
});

describe("multi-roof section management", () => {
  it("addRoofSection adds a section", () => {
    const spec = createDefaultMultiRoofSpec();
    const updated = addRoofSection(spec, "Porch");
    expect(updated.sections).toHaveLength(2);
    expect(updated.sections[1].name).toBe("Porch");
  });
  it("removeRoofSection removes by id", () => {
    const spec = createDefaultMultiRoofSpec();
    const id = spec.sections[0].id;
    const updated = removeRoofSection(spec, id);
    expect(updated.sections).toHaveLength(0);
  });
  it("updateRoofSection updates fields", () => {
    const spec = createDefaultMultiRoofSpec();
    const id = spec.sections[0].id;
    const updated = updateRoofSection(spec, id, { pitchDegrees: 35 });
    expect(updated.sections[0].pitchDegrees).toBe(35);
  });
  it("updateRoofSection un-confirms section", () => {
    const spec = createDefaultMultiRoofSpec();
    const id = spec.sections[0].id;
    const updated = updateRoofSection(spec, id, { pitchDegrees: 35 });
    expect(updated.sections[0].confirmed).toBe(false);
    expect(updated.confirmed).toBe(false);
  });
  it("renameRoofSection updates name", () => {
    const spec = createDefaultMultiRoofSpec();
    const id = spec.sections[0].id;
    const updated = renameRoofSection(spec, id, "Main");
    expect(updated.sections[0].name).toBe("Main");
  });
  it("confirmMultiRoofSpec confirms all sections", () => {
    const spec = createDefaultMultiRoofSpec();
    const confirmed = confirmMultiRoofSpec(spec);
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.sections[0].confirmed).toBe(true);
  });
});

describe("calculateMultiRoof", () => {
  it("returns zero totals for incomplete sections", () => {
    const spec = createDefaultMultiRoofSpec();
    const result = calculateMultiRoof(spec);
    expect(result.completeSectionCount).toBe(0);
    expect(result.totalSurfaceAreaM2).toBe(0);
  });
  it("aggregates totals for complete sections", () => {
    const spec: MultiRoofSpec = {
      sections: [
        {
          ...createRoofSectionSpec("Main"),
          planAreaM2: 100,
          pitchDegrees: 30,
          roofType: "gable" as const,
          roofingMaterial: "long_span_aluminium" as const,
          overhangM: 0.6,
          wastePercent: 5,
          confirmed: true,
        },
      ],
      useMultiSection: true,
      confirmed: true,
    };
    const result = calculateMultiRoof(spec);
    expect(result.completeSectionCount).toBe(1);
    expect(result.totalPlanAreaM2).toBe(100);
    expect(result.totalSurfaceAreaM2).toBeCloseTo(115.47, 1);
    expect(result.sections[0].complete).toBe(true);
    expect(result.sections[0].sheetCount).toBeGreaterThan(0);
  });
});
