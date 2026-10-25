import { describe, it, expect } from "vitest";
import {
  calculateFoundation,
  type FoundationInput,
  type FoundationRules,
  DEFAULT_FOUNDATION_RULES,
} from "../foundation-engine";
import { getElectricalProfile } from "../electrical-profiles";
import { getPlumbingProfile } from "../plumbing-profiles";
import {
  calculateDrywallTakeoff,
  DRYWALL_MARKET_PROFILES,
} from "../drywall-standalone-engine";
import {
  calculateMasonryTakeoff,
  MASONRY_MARKET_REGISTRY,
} from "../masonry-standalone-engine";
import {
  calculatePlasteringTakeoff,
  CEMENT_BAG_WEIGHT_BY_MARKET,
} from "../plastering-standalone-engine";

const priorityMarkets = [
  "GB",
  "IN",
  "AU",
  "CA",
  "DE",
  "AE",
  "SA",
  "SG",
  "ZA",
  "BR",
] as const;

describe("Global Priority Markets Expansion Verification", () => {
  describe("Foundation Engine Multi-Market Bag Sizing", () => {
    const rules: FoundationRules = {
      ...DEFAULT_FOUNDATION_RULES,
      mix_ratio: { cement: 1, sand: 2, granite: 4 },
      concrete_waste_pct: 0,
    };
    const input: FoundationInput = {
      concrete_volume_m3: 10,
      block_wall_area_m2: 0,
      hardcore_volume_m3: 0,
      formwork_area_m2: 0,
      labour: { mode: "none" },
    };

    it("uses default 50 kg cement bags when no market or options are passed", () => {
      const res = calculateFoundation(input, rules, {});
      expect(res.ok).toBe(true);
      const cementLine = res.lines.find((l) => l.key === "cement");
      expect(cementLine).toBeDefined();
      expect(cementLine?.label).toBe("Cement (50 kg bags)");
      // 10 m³ * 1.54 * (1/7) / 0.0347 ≈ 63.4 → 64 bags
      expect(cementLine?.quantity).toBe(64);
    });

    it("correctly sizes 25 kg cement bags for United Kingdom (GB)", () => {
      const res = calculateFoundation(input, rules, {}, { marketCode: "GB" });
      expect(res.ok).toBe(true);
      const cementLine = res.lines.find((l) => l.key === "cement");
      expect(cementLine).toBeDefined();
      expect(cementLine?.label).toBe("Cement (25 kg bags)");
      // 25 kg bag volume is 25 / 1440 ≈ 0.01736 m³
      // 10 * 1.54 * (1/7) / (25/1440) ≈ 126.7 → 127 bags
      expect(cementLine?.quantity).toBe(127);
    });

    it("correctly sizes 20 kg cement bags for Australia (AU)", () => {
      const res = calculateFoundation(input, rules, {}, { marketCode: "AU" });
      expect(res.ok).toBe(true);
      const cementLine = res.lines.find((l) => l.key === "cement");
      expect(cementLine).toBeDefined();
      expect(cementLine?.label).toBe("Cement (20 kg bags)");
      // 20 kg bag volume is 20 / 1440 ≈ 0.01389 m³
      // 10 * 1.54 * (1/7) / (20/1440) ≈ 158.4 → 159 bags
      expect(cementLine?.quantity).toBe(159);
    });

    it("correctly sizes 40 kg cement bags for Canada (CA)", () => {
      const res = calculateFoundation(input, rules, {}, { marketCode: "CA" });
      expect(res.ok).toBe(true);
      const cementLine = res.lines.find((l) => l.key === "cement");
      expect(cementLine).toBeDefined();
      expect(cementLine?.label).toBe("Cement (40 kg bags)");
      // 40 kg bag volume is 40 / 1440 ≈ 0.02778 m³
      // 10 * 1.54 * (1/7) / (40/1440) ≈ 79.2 → 80 bags
      expect(cementLine?.quantity).toBe(80);
    });

    it("correctly sizes 25 kg cement bags for Germany (DE)", () => {
      const res = calculateFoundation(input, rules, {}, { marketCode: "DE" });
      expect(res.ok).toBe(true);
      const cementLine = res.lines.find((l) => l.key === "cement");
      expect(cementLine?.label).toBe("Cement (25 kg bags)");
      expect(cementLine?.quantity).toBe(127);
    });

    it("supports explicit bagWeightKg numeric override", () => {
      const res = calculateFoundation(input, rules, {}, { bagWeightKg: 30 });
      expect(res.ok).toBe(true);
      const cementLine = res.lines.find((l) => l.key === "cement");
      expect(cementLine?.label).toBe("Cement (30 kg bags)");
      // 10 * 1.54 * (1/7) / (30/1440) ≈ 105.6 → 106 bags
      expect(cementLine?.quantity).toBe(106);
    });
  });

  describe("Drywall Engine All Priority Markets Coverage", () => {
    it("has registered configurations for all 10 priority markets", () => {
      for (const m of priorityMarkets) {
        expect(DRYWALL_MARKET_PROFILES[m]).toBeDefined();
        const prof = DRYWALL_MARKET_PROFILES[m];
        expect(prof.boardWidthMm).toBeGreaterThan(0);
        expect(prof.boardLengthMm).toBeGreaterThan(0);
        expect(prof.studSpacingMm).toBeGreaterThan(0);
      }
    });

    it("calculates deterministic quantities for UK drywall (400 mm stud spacing)", () => {
      const res = calculateDrywallTakeoff({
        wallLengthM: 10,
        wallHeightM: 2.4,
        marketCode: "GB",
      });
      expect(res.marketCode).toBe("GB");
      expect(res.studSpacingMm).toBe(400);
      expect(res.boardSheets).toBeGreaterThan(0);
      expect(res.studCount).toBeGreaterThan(0);
    });

    it("calculates deterministic quantities for Germany drywall (625 mm DIN stud spacing)", () => {
      const res = calculateDrywallTakeoff({
        wallLengthM: 10,
        wallHeightM: 2.5,
        marketCode: "DE",
      });
      expect(res.marketCode).toBe("DE");
      expect(res.studSpacingMm).toBe(625);
      expect(res.boardSheets).toBeGreaterThan(0);
    });
  });

  describe("Masonry & Plastering Priority Markets Integration", () => {
    it("has verified packaging bag weight for all priority markets", () => {
      for (const m of priorityMarkets) {
        const weight = CEMENT_BAG_WEIGHT_BY_MARKET[m];
        expect(weight).toBeDefined();
        expect(weight).toBeGreaterThan(0);
      }
    });

    it("has masonry profiles configured for all 10 priority markets", () => {
      for (const m of priorityMarkets) {
        const profile = MASONRY_MARKET_REGISTRY[m];
        expect(profile).toBeDefined();
        expect(profile.defaultUnit.lengthMm).toBeGreaterThan(0);
        expect(profile.cementBagWeightKg).toBeGreaterThan(0);
      }
    });

    it("calculates plastering for India (IN) using 50 kg bags", () => {
      const res = calculatePlasteringTakeoff({
        surfaceAreaM2: 50,
        thicknessMm: 12,
        marketCode: "IN",
      });
      expect(res.cementBagWeightKg).toBe(50);
      expect(res.cementBagsRequired).toBeGreaterThan(0);
    });

    it("calculates plastering for Australia (AU) using 20 kg bags", () => {
      const res = calculatePlasteringTakeoff({
        surfaceAreaM2: 50,
        thicknessMm: 12,
        marketCode: "AU",
      });
      expect(res.cementBagWeightKg).toBe(20);
      expect(res.cementBagsRequired).toBeGreaterThan(0);
    });
  });

  describe("MEP (Electrical & Plumbing) Priority Markets Integration", () => {
    it("resolves electrical and plumbing profiles for all 10 priority markets", () => {
      for (const m of priorityMarkets) {
        const elec = getElectricalProfile(m);
        expect(elec.marketCode).toBe(m);
        expect(elec.standardsRef).toBeTruthy();
        expect(elec.nominalVoltage).toBeTruthy();

        const plumb = getPlumbingProfile(m);
        expect(plumb.marketCode).toBe(m);
        expect(plumb.standardsRef).toBeTruthy();
        expect(plumb.waterSupplyMaterial).toBeTruthy();
      }
    });

    it("verifies Singapore (SG) standards in electrical and plumbing", () => {
      const elec = getElectricalProfile("SG");
      expect(elec.standardsRef).toContain("SS 638");
      expect(elec.conduitRequired).toBe(true);

      const plumb = getPlumbingProfile("SG");
      expect(plumb.standardsRef).toContain("SS 675");
      expect(plumb.waterSupplyMaterial).toContain("Copper");
    });
  });
});
