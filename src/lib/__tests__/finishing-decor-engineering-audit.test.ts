import { describe, expect, it } from "vitest";
import { calculateTile } from "../pop-tile-calc";
import type { TileCalcInput } from "@/types";
import {
  calculateWindowBlinds,
  computeBlindHardwareMetrics,
} from "../estimation/window-blinds-engine";
import {
  calculateWallpaperEstimate,
  type WallpaperEstimateInput,
} from "../calculators/wallpaper-calculator";
import { calculatePlasteringTakeoff } from "../estimation/plastering-standalone-engine";

describe("Finishing & Decor Calculators Engineering Precision Audit", () => {
  describe("Tile Grout Calculation (ISO 13007 single-waste precision)", () => {
    it("computes grout quantity without compounding waste margins", () => {
      const tileInput: TileCalcInput = {
        surfaceType: "floor",
        length: 5,
        width: 2,
        height: 0,
        unit: "meters",
        quantity: 1,
        wasteMargin: 10, // 10% waste -> adjustedArea = 11 m2
        tileWidthMm: 600,
        tileHeightMm: 600,
        tileThicknessMm: 10,
        jointWidthMm: 3,
        groutSpecificGravity: 1.8,
        tilesPerBox: 4,
        tilePricePerBox: 10000,
        method: "adhesive",
        adhesiveCoverageRate: 5,
        adhesiveNotchMm: 6,
        adhesivePricePerBag: 3500,
        cementCoverageRate: 0,
        cementPackageSize: 50,
        cementPricePerBag: 0,
        sandCoverageRate: 0,
        sandPackageSize: 1,
        sandPricePerBag: 0,
        groutCoverageRate: 0,
        groutPricePerKg: 1200,
        spacerCoverageRate: 10,
        spacerPackageSize: 100,
        spacerPricePerPack: 800,
        labourRatePerSqm: 0,
      };

      const result = calculateTile(tileInput, [], "NGN", "₦");
      expect(result.surfaceArea).toBe(10);
      expect(result.wasteAmount).toBeCloseTo(1.0);

      // Theoretical base rate: ((0.6 + 0.6) / 0.36) * 10 * 3 * 1.8 / 1000 = 0.18 kg/m2
      // For 11 m2 adjusted area: 11 * 0.18 = 1.98 kg -> ceil(1.98) = 2 kg
      expect(result.groutNeeded).toBe(2);
    });
  });

  describe("Window Blinds Tube Deflection & Hardware Rules", () => {
    it("prescribes 28mm barrel and 2 brackets for small/standard windows", () => {
      const hardware = computeBlindHardwareMetrics("roller", 1.2, 1.5);

      expect(hardware.recommendedTubeDiameterMm).toBe(28);
      expect(hardware.bracketCount).toBe(2);
      expect(hardware.tubeDeflectionRisk).toBe("safe");
    });

    it("prescribes 38mm barrel and intermediate bracket for wide windows (1.5m - 2.2m)", () => {
      const hardware = computeBlindHardwareMetrics("roller", 1.8, 2.1);

      expect(hardware.recommendedTubeDiameterMm).toBe(38);
      expect(hardware.bracketCount).toBe(3);
      expect(hardware.tubeDeflectionRisk).toBe("advisory");
    });

    it("prescribes 45mm commercial barrel and 4 brackets for extra-wide spans (> 2.2m)", () => {
      const hardware = computeBlindHardwareMetrics("roller", 2.6, 2.4);

      expect(hardware.recommendedTubeDiameterMm).toBe(45);
      expect(hardware.bracketCount).toBe(4);
      expect(hardware.tubeDeflectionRisk).toBe("deflection_risk");
    });

    it("calculates venetian slats accurately based on slat pitch", () => {
      const venetianHw = computeBlindHardwareMetrics("wooden", 1.5, 1.6);
      // 1.6m drop with 50mm wood slats (44mm pitch): ceil(1600 / 44) = 37 slats
      expect(venetianHw.slatOrVaneCount).toBe(37);
    });

    it("embeds hardware metrics in calculateWindowBlinds engine", () => {
      const result = calculateWindowBlinds({
        market: "NG",
        unit: "m",
        typeKey: "roller",
        width: 1.8,
        height: 2.0,
        quantity: 1,
      });

      expect(result.hardwareMetrics).toBeDefined();
      expect(result.hardwareMetrics?.recommendedTubeDiameterMm).toBe(38);
      expect(result.hardwareMetrics?.bracketCount).toBe(3);
    });
  });

  describe("Wallpaper Sizing & Adhesive Dilution Metrics", () => {
    it("computes wall sizing packs and paste water requirements", () => {
      const input: WallpaperEstimateInput = {
        walls: [
          { id: "1", label: "Master Bed", widthM: 4.5, heightM: 2.8, doors: 1, windows: 1 },
        ],
        rollWidthM: 0.53,
        rollLengthM: 10,
        stockFormat: "roll",
        unitsPerPackage: 1,
        openingDoorWidthM: 0.9,
        openingDoorHeightM: 2.1,
        openingWindowWidthM: 1.2,
        openingWindowHeightM: 1.2,
        pattern: "random",
        patternRepeatM: 0,
        trimAllowanceM: 0.2,
        wasteRate: 0.1,
        extraRoll: false,
        rollPrice: 15000,
        labourPerRoll: 5000,
        adhesivePerRolls: 4,
        adhesivePackPrice: 3500,
        adhesiveRequired: true,
      };

      const result = calculateWallpaperEstimate(input);
      expect(result.adhesiveMetrics).toBeDefined();
      expect(result.adhesiveMetrics?.pasteWaterLiters).toBe(result.adhesivePacks * 5.0);
      expect(result.adhesiveMetrics?.wallSizingPacks).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Plastering Sand Wheelbarrows & SBR Slurry Bonding", () => {
    it("provides wheelbarrow conversions and bonding agent liters for artisans", () => {
      const plasterResult = calculatePlasteringTakeoff({
        marketCode: "NG",
        surfaceAreaM2: 50,
        thicknessMm: 15,
        mixRatio: "1:4",
        applicationType: "internal_plaster",
      });

      expect(plasterResult.sandWheelbarrows).toBeDefined();
      expect(plasterResult.sandWheelbarrows).toBeGreaterThan(0);
      // For 50 m2: bonding agent @ 0.15 L/m2 = 7.5 Liters
      expect(plasterResult.bondingAgentLiters).toBe(7.5);
    });
  });
});
