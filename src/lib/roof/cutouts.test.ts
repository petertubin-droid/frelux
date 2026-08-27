import { describe, it, expect } from "vitest";
import {
  createCutout,
  addCutout,
  updateCutout,
  deleteCutout,
  totalCutoutArea,
  netAreaAfterCutouts,
  validateCutout,
  CUTOUT_TYPES,
  type CutoutType,
} from "./cutouts";
import type { RoofCutout } from "./area-pipeline";

describe("roof/cutouts", () => {
  describe("CUTOUT_TYPES", () => {
    it("has 5 cutout types", () => {
      expect(CUTOUT_TYPES.length).toBe(5);
    });

    it("includes skylight, courtyard, equipment, opening, other", () => {
      const types = CUTOUT_TYPES.map((c) => c.type);
      expect(types).toContain("skylight");
      expect(types).toContain("courtyard");
      expect(types).toContain("equipment");
      expect(types).toContain("opening");
      expect(types).toContain("other");
    });
  });

  describe("createCutout", () => {
    it("creates a cutout with id, name, area, and type", () => {
      const c = createCutout("Skylight 1", 2.5, "skylight");
      expect(c.id).toContain("cutout_");
      expect(c.name).toBe("Skylight 1");
      expect(c.areaM2).toBe(2.5);
      expect(c.type).toBe("skylight");
    });

    it("defaults type to other", () => {
      const c = createCutout("Test", 5);
      expect(c.type).toBe("other");
    });

    it("clamps negative area to 0", () => {
      const c = createCutout("Test", -5);
      expect(c.areaM2).toBe(0);
    });

    it("generates unique ids", () => {
      const c1 = createCutout("A", 1);
      const c2 = createCutout("B", 2);
      expect(c1.id).not.toBe(c2.id);
    });
  });

  describe("addCutout", () => {
    it("returns new array with cutout appended", () => {
      const result = addCutout([], "New", 3, "skylight");
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("New");
    });

    it("does not mutate original array", () => {
      const original: RoofCutout[] = [];
      const result = addCutout(original, "New", 3);
      expect(original.length).toBe(0);
      expect(result.length).toBe(1);
    });
  });

  describe("updateCutout", () => {
    it("updates matching cutout by id", () => {
      const cutouts = [createCutout("A", 5), createCutout("B", 3)];
      const updated = updateCutout(cutouts, cutouts[0].id, { name: "Updated" });
      expect(updated[0].name).toBe("Updated");
      expect(updated[1].name).toBe("B");
    });

    it("clamps area to non-negative", () => {
      const c = createCutout("A", 5);
      const updated = updateCutout([c], c.id, { areaM2: -10 });
      expect(updated[0].areaM2).toBe(0);
    });
  });

  describe("deleteCutout", () => {
    it("removes cutout by id", () => {
      const c1 = createCutout("A", 5);
      const c2 = createCutout("B", 3);
      const result = deleteCutout([c1, c2], c1.id);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("B");
    });
  });

  describe("totalCutoutArea", () => {
    it("sums all cutout areas", () => {
      const cutouts = [
        createCutout("A", 5),
        createCutout("B", 3),
        createCutout("C", 2),
      ];
      expect(totalCutoutArea(cutouts)).toBe(10);
    });

    it("returns 0 for empty array", () => {
      expect(totalCutoutArea([])).toBe(0);
    });
  });

  describe("netAreaAfterCutouts", () => {
    it("subtracts cutout area from gross", () => {
      const cutouts = [createCutout("A", 5)];
      expect(netAreaAfterCutouts(100, cutouts)).toBe(95);
    });

    it("never returns negative", () => {
      const cutouts = [createCutout("A", 200)];
      expect(netAreaAfterCutouts(100, cutouts)).toBe(0);
    });
  });

  describe("validateCutout", () => {
    it("returns empty array for valid cutout", () => {
      const c = createCutout("Valid", 5, "skylight");
      expect(validateCutout(c)).toEqual([]);
    });

    it("returns error for empty name", () => {
      const c = createCutout("", 5, "other");
      const errors = validateCutout(c);
      expect(errors).toContain("Name is required");
    });

    it("returns error for zero area", () => {
      const c = createCutout("Test", 0, "other");
      const errors = validateCutout(c);
      expect(errors).toContain("Area must be greater than 0");
    });

    it("returns error for invalid type", () => {
      const c = {
        id: "x",
        name: "Test",
        areaM2: 5,
        type: "invalid" as CutoutType,
      };
      const errors = validateCutout(c);
      expect(errors).toContain("Invalid cutout type");
    });
  });
});
