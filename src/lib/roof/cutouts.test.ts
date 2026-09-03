import { describe, it, expect } from "vitest";
import {
  CUTOUT_TYPES,
  createCutout,
  addCutout,
  deleteCutout,
  updateCutout,
  totalCutoutArea,
  netAreaAfterCutouts,
  validateCutout,
} from "@/lib/roof/cutouts";

describe("CUTOUT_TYPES", () => {
  it("has 5 cutout types", () => {
    expect(CUTOUT_TYPES).toHaveLength(5);
  });
  it("includes skylight, courtyard, equipment, opening, other", () => {
    const types = CUTOUT_TYPES.map((c) => c.type);
    expect(types).toContain("skylight");
    expect(types).toContain("courtyard");
    expect(types).toContain("equipment");
    expect(types).toContain("opening");
    expect(types).toContain("other");
  });
  it("every type has a label and icon", () => {
    CUTOUT_TYPES.forEach((c) => {
      expect(c.label).toBeTruthy();
      expect(c.icon).toBeTruthy();
    });
  });
});

describe("createCutout", () => {
  it("creates a cutout with name, area, and type", () => {
    const c = createCutout("Skylight A", 2.5, "skylight");
    expect(c.name).toBe("Skylight A");
    expect(c.areaM2).toBe(2.5);
    expect(c.type).toBe("skylight");
    expect(c.id).toBeTruthy();
  });
  it("defaults to 'other' type", () => {
    const c = createCutout("Hole", 1);
    expect(c.type).toBe("other");
  });
  it("clamps negative area to 0", () => {
    const c = createCutout("Invalid", -5);
    expect(c.areaM2).toBe(0);
  });
});

describe("addCutout", () => {
  it("adds a cutout to the list", () => {
    const cutouts = [createCutout("A", 1)];
    const updated = addCutout(cutouts, "B", 2);
    expect(updated).toHaveLength(2);
    expect(updated[1].name).toBe("B");
  });
  it("does not mutate the original array", () => {
    const original = [createCutout("A", 1)];
    addCutout(original, "B", 2);
    expect(original).toHaveLength(1);
  });
});

describe("deleteCutout", () => {
  it("removes a cutout by id", () => {
    const c1 = createCutout("A", 1);
    const c2 = createCutout("B", 2);
    const updated = deleteCutout([c1, c2], c1.id);
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(c2.id);
  });
});

describe("updateCutout", () => {
  it("updates a cutout's area", () => {
    const c1 = createCutout("A", 1);
    const updated = updateCutout([c1], c1.id, { areaM2: 5 });
    expect(updated[0].areaM2).toBe(5);
  });
  it("updates a cutout's name", () => {
    const c1 = createCutout("A", 1);
    const updated = updateCutout([c1], c1.id, { name: "Renamed" });
    expect(updated[0].name).toBe("Renamed");
  });
  it("clamps negative area updates to 0", () => {
    const c1 = createCutout("A", 1);
    const updated = updateCutout([c1], c1.id, { areaM2: -3 });
    expect(updated[0].areaM2).toBe(0);
  });
});

describe("totalCutoutArea", () => {
  it("sums all cutout areas", () => {
    const cutouts = [
      createCutout("A", 2.5),
      createCutout("B", 3.5),
      createCutout("C", 1),
    ];
    expect(totalCutoutArea(cutouts)).toBeCloseTo(7, 5);
  });
  it("returns 0 for empty list", () => {
    expect(totalCutoutArea([])).toBe(0);
  });
});

describe("netAreaAfterCutouts", () => {
  it("calculates gross minus cutouts", () => {
    const cutouts = [createCutout("A", 3)];
    expect(netAreaAfterCutouts(100, cutouts)).toBe(97);
  });
  it("never returns negative", () => {
    const cutouts = [createCutout("A", 200)];
    expect(netAreaAfterCutouts(100, cutouts)).toBe(0);
  });
  it("returns gross when no cutouts", () => {
    expect(netAreaAfterCutouts(50, [])).toBe(50);
  });
});

describe("validateCutout", () => {
  it("returns no errors for valid cutout", () => {
    const c = createCutout("Valid", 5, "skylight");
    expect(validateCutout(c)).toEqual([]);
  });
  it("returns error for empty name", () => {
    const c = createCutout("", 5);
    expect(validateCutout(c)).toContain("Name is required");
  });
  it("returns error for zero area", () => {
    const c = createCutout("Test", 0);
    expect(validateCutout(c)).toContain("Area must be greater than 0");
  });
  it("returns error for invalid type", () => {
    const c = { ...createCutout("Test", 5), type: "invalid" } as unknown;
    expect(validateCutout(c)).toContain("Invalid cutout type");
  });
});
