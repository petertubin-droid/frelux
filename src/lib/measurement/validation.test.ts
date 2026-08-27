import { describe, it, expect } from "vitest";
import {
  createValidationResult,
  validateMeasurementEntry,
  validateTileConfig,
  validateMeasurementProject,
  isValidDimension,
  isValidQuantity,
} from "./validation";
import type { MeasurementEntry, MeasurementProject } from "./types";

describe("validation", () => {
  describe("createValidationResult", () => {
    it("creates a default valid result structure", () => {
      const res = createValidationResult();
      expect(res).toEqual({ valid: true, errors: [], warnings: [] });
    });
  });

  describe("validateMeasurementEntry", () => {
    const validEntry: MeasurementEntry = {
      id: "e1",
      length: 10,
      width: 8,
      height: 3,
      unit: "meters",
      quantity: 1,
    };

    it("validates a correct entry", () => {
      const res = validateMeasurementEntry(validEntry, "painting");
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("rejects missing or disallowed units", () => {
      const noUnitEntry: MeasurementEntry = {
        ...validEntry,
        unit: undefined as unknown as never,
      };
      const res1 = validateMeasurementEntry(noUnitEntry, "painting");
      expect(res1.valid).toBe(false);
      expect(res1.errors.some((e) => e.includes("unit is required"))).toBe(
        true,
      );

      const inchesInPainting: MeasurementEntry = {
        ...validEntry,
        unit: "inches",
      };
      const res2 = validateMeasurementEntry(inchesInPainting, "painting");
      expect(res2.valid).toBe(false);
      expect(
        res2.errors.some((e) =>
          e.includes("Inches are only available in the Block calculator"),
        ),
      ).toBe(true);
    });

    it("allows inches in block calculator context", () => {
      const inchesInBlock: MeasurementEntry = { ...validEntry, unit: "inches" };
      const res = validateMeasurementEntry(inchesInBlock, "block");
      expect(res.valid).toBe(true);
    });

    it("rejects invalid dimensions (zero, negative, NaN, Infinity)", () => {
      const zeroLength: MeasurementEntry = { ...validEntry, length: 0 };
      expect(validateMeasurementEntry(zeroLength, "painting").valid).toBe(
        false,
      );

      const negWidth: MeasurementEntry = { ...validEntry, width: -5 };
      expect(validateMeasurementEntry(negWidth, "painting").valid).toBe(false);

      const nanHeight: MeasurementEntry = { ...validEntry, height: NaN };
      expect(validateMeasurementEntry(nanHeight, "painting").valid).toBe(false);
    });

    it("validates quantity bounds", () => {
      const zeroQty: MeasurementEntry = { ...validEntry, quantity: 0 };
      expect(validateMeasurementEntry(zeroQty, "painting").valid).toBe(false);

      const negQty: MeasurementEntry = { ...validEntry, quantity: -2 };
      expect(validateMeasurementEntry(negQty, "painting").valid).toBe(false);
    });

    it("validates waste margin range", () => {
      const negWaste: MeasurementEntry = {
        ...validEntry,
        wasteMarginPercent: -10,
      };
      expect(validateMeasurementEntry(negWaste, "painting").valid).toBe(false);

      const hugeWaste: MeasurementEntry = {
        ...validEntry,
        wasteMarginPercent: 150,
      };
      expect(validateMeasurementEntry(hugeWaste, "painting").valid).toBe(false);

      const validWaste: MeasurementEntry = {
        ...validEntry,
        wasteMarginPercent: 15,
      };
      expect(validateMeasurementEntry(validWaste, "painting").valid).toBe(true);
    });

    it("validates fence partition entry requirements", () => {
      const fenceNoHeight: MeasurementEntry = {
        id: "e-fence",
        length: 5,
        unit: "meters",
        quantity: 1,
        partitionCount: 3,
        height: 0,
      };
      const res = validateMeasurementEntry(fenceNoHeight, "painting");
      expect(res.valid).toBe(false);
      expect(
        res.errors.some((e) =>
          e.includes("Fence partition height is required"),
        ),
      ).toBe(true);
    });

    it("validates door and window counts", () => {
      const negDoors: MeasurementEntry = { ...validEntry, doors: -1 };
      expect(validateMeasurementEntry(negDoors, "painting").valid).toBe(false);

      const negWindows: MeasurementEntry = { ...validEntry, windows: -2 };
      expect(validateMeasurementEntry(negWindows, "painting").valid).toBe(
        false,
      );
    });
  });

  describe("validateTileConfig", () => {
    it("validates valid tile configs for tiles_per_carton and carton_coverage", () => {
      const validTilesPerCarton = {
        tileLength: 600,
        tileWidth: 600,
        tileUnit: "mm" as const,
        packagingMethod: "tiles_per_carton" as const,
        tilesPerCarton: 4,
      };
      expect(validateTileConfig(validTilesPerCarton).valid).toBe(true);

      const validCoverage = {
        tileLength: 60,
        tileWidth: 60,
        tileUnit: "cm" as const,
        packagingMethod: "carton_coverage" as const,
        cartonCoverageM2: 1.44,
      };
      expect(validateTileConfig(validCoverage).valid).toBe(true);
    });

    it("rejects invalid tile dimensions or packaging parameters", () => {
      const invalidDims = {
        tileLength: 0,
        tileWidth: 600,
        tileUnit: "mm" as const,
        packagingMethod: "tiles_per_carton" as const,
        tilesPerCarton: 4,
      };
      expect(validateTileConfig(invalidDims).valid).toBe(false);

      const missingTilesPerCarton = {
        tileLength: 600,
        tileWidth: 600,
        tileUnit: "mm" as const,
        packagingMethod: "tiles_per_carton" as const,
        tilesPerCarton: 0,
      };
      expect(validateTileConfig(missingTilesPerCarton).valid).toBe(false);

      const missingCoverage = {
        tileLength: 600,
        tileWidth: 600,
        tileUnit: "mm" as const,
        packagingMethod: "carton_coverage" as const,
        cartonCoverageM2: 0,
      };
      expect(validateTileConfig(missingCoverage).valid).toBe(false);
    });
  });

  describe("validateMeasurementProject", () => {
    it("validates a complete project", () => {
      const project: MeasurementProject = {
        id: "proj-1",
        calculatorContext: "painting",
        projectMode: "single_room",
        preferredUnit: "meters",
        sections: [
          {
            id: "sec-1",
            label: "Ground Floor",
            groups: [
              {
                id: "grp-1",
                label: "Living Room",
                entry: {
                  id: "e-1",
                  length: 6,
                  width: 5,
                  height: 3,
                  unit: "meters",
                  quantity: 1,
                },
              },
            ],
          },
        ],
      };

      const res = validateMeasurementProject(project);
      expect(res.valid).toBe(true);
    });

    it("rejects project with no sections or empty section groups", () => {
      const emptyProject: MeasurementProject = {
        id: "proj-2",
        calculatorContext: "painting",
        projectMode: "single_room",
        preferredUnit: "meters",
        sections: [],
      };
      expect(validateMeasurementProject(emptyProject).valid).toBe(false);

      const emptySectionProject: MeasurementProject = {
        id: "proj-3",
        calculatorContext: "painting",
        projectMode: "single_room",
        preferredUnit: "meters",
        sections: [
          {
            id: "s1",
            label: "Sec 1",
            groups: [],
          },
        ],
      };
      expect(validateMeasurementProject(emptySectionProject).valid).toBe(false);
    });
  });

  describe("quick validation helpers", () => {
    it("isValidDimension", () => {
      expect(isValidDimension(10)).toBe(true);
      expect(isValidDimension(0)).toBe(false);
      expect(isValidDimension(-1)).toBe(false);
      expect(isValidDimension(undefined)).toBe(false);
      expect(isValidDimension(NaN)).toBe(false);
      expect(isValidDimension(Infinity)).toBe(false);
    });

    it("isValidQuantity", () => {
      expect(isValidQuantity(1)).toBe(true);
      expect(isValidQuantity(10)).toBe(true);
      expect(isValidQuantity(0)).toBe(false);
      expect(isValidQuantity(-1)).toBe(false);
      expect(isValidQuantity(undefined)).toBe(false);
    });
  });
});
