import { describe, it, expect } from "vitest";
import {
  pitchAdjustedArea,
  getSectionPlanArea,
  getSectionMissing,
  createRoofSectionSpec,
  createDefaultMultiRoofSpec,
  addRoofSection,
  removeRoofSection,
  renameRoofSection,
  confirmMultiRoofSpec,
} from "./section-model";

describe("roof/section-model", () => {
  it("pitchAdjustedArea returns plan area for flat roof", () => {
    expect(pitchAdjustedArea(100, 30, "flat")).toBe(100);
  });

  it("pitchAdjustedArea returns plan area for zero or null pitch", () => {
    expect(pitchAdjustedArea(100, 0, "gable")).toBe(100);
    expect(pitchAdjustedArea(100, null, "gable")).toBe(100);
  });

  it("pitchAdjustedArea returns 0 for non-positive area", () => {
    expect(pitchAdjustedArea(0, 30, "gable")).toBe(0);
    expect(pitchAdjustedArea(-10, 30, "gable")).toBe(0);
  });

  it("pitchAdjustedArea increases area for pitched roof", () => {
    const result = pitchAdjustedArea(100, 30, "gable");
    expect(result).toBeGreaterThan(100);
  });

  it("createRoofSectionSpec creates with defaults", () => {
    const s = createRoofSectionSpec();
    expect(s.name).toBe("New Section");
    expect(s.roofType).toBe("gable");
    expect(s.pitchDegrees).toBeNull();
    expect(s.planAreaM2).toBeNull();
    expect(s.confirmed).toBe(false);
    expect(s.id).toBeTruthy();
  });

  it("createDefaultMultiRoofSpec has one section", () => {
    const spec = createDefaultMultiRoofSpec();
    expect(spec.sections.length).toBe(1);
    expect(spec.sections[0].name).toBe("Main Roof");
    expect(spec.confirmed).toBe(false);
  });

  it("getSectionPlanArea returns manual area when no geometry", () => {
    const s = createRoofSectionSpec();
    expect(getSectionPlanArea(s)).toBe(0);
    const s2 = { ...s, planAreaM2: 50 };
    expect(getSectionPlanArea(s2)).toBe(50);
  });

  it("getSectionMissing reports missing area and pitch", () => {
    const s = createRoofSectionSpec();
    const missing = getSectionMissing(s);
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(missing.some((m) => m.includes("area"))).toBe(true);
    expect(missing.some((m) => m.includes("pitch"))).toBe(true);
  });

  it("getSectionMissing reports nothing for flat roof with area", () => {
    const s = {
      ...createRoofSectionSpec(),
      planAreaM2: 50,
      roofType: "flat" as unknown as never,
    };
    expect(getSectionMissing(s)).toEqual([]);
  });

  it("addRoofSection adds new section", () => {
    const spec = createDefaultMultiRoofSpec();
    const updated = addRoofSection(spec, "Garage");
    expect(updated.sections.length).toBe(2);
    expect(updated.sections[1].name).toBe("Garage");
  });

  it("removeRoofSection removes by id", () => {
    const spec = createDefaultMultiRoofSpec();
    const id = spec.sections[0].id;
    const updated = removeRoofSection(spec, id);
    expect(updated.sections.length).toBe(0);
  });

  it("renameRoofSection updates name", () => {
    const spec = createDefaultMultiRoofSpec();
    const id = spec.sections[0].id;
    const updated = renameRoofSection(spec, id, "Big Roof");
    expect(updated.sections[0].name).toBe("Big Roof");
  });

  it("confirmMultiRoofSpec confirms all sections", () => {
    const spec = createDefaultMultiRoofSpec();
    const confirmed = confirmMultiRoofSpec(spec);
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.sections.every((s) => s.confirmed)).toBe(true);
  });
});
