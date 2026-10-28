import { describe, it, expect } from "vitest";
import {
  calculateBarCutLength,
  calculateDevelopmentLength,
  generateBarBendingSchedule,
  generateBVBSString,
  type BarScheduleItemInput,
} from "../estimation/reinforcement-engine";
import {
  computeDesignShearCapacity,
  type DesignShearCapacityInput,
} from "../engineering/structural-calculator";
import {
  buildQuotation,
  type QuotationSettings,
} from "../measurement/quotation-engine";
import type { CostEstimate } from "../measurement/cost-integration";

describe("Phase 1 Tier-1 Upgrades Verification", () => {
  describe("1. Bar Bending Schedule (BBS) & BVBS Export Engine (BS 8666 / ACI SP-66)", () => {
    it("calculates exact cut lengths for standard shape codes", () => {
      // Shape 00: Straight bar (A = 3500mm)
      expect(calculateBarCutLength("00", { A: 3500 }, 16)).toBe(3.5);

      // Shape 21: L-Bar (A = 2000mm, B = 500mm)
      expect(calculateBarCutLength("21", { A: 2000, B: 500 }, 16)).toBe(2.5);

      // Shape 41: Stirrup/Link (A = 400mm, B = 250mm, diameter 10mm => 2A + 2B + 20d = 800 + 500 + 200 = 1500mm)
      expect(calculateBarCutLength("41", { A: 400, B: 250 }, 10)).toBe(1.5);
    });

    it("calculates development length for Eurocode 2 and ACI 318", () => {
      const d = 16; // 16mm rebar
      // Eurocode 2 C25/30 concrete
      const lbdEc2 = calculateDevelopmentLength(d, 25, 500, true, "eurocode");
      expect(lbdEc2).toBeGreaterThan(400);

      // ACI 318 3000 psi concrete
      const ldAci = calculateDevelopmentLength(d, 3000, 500, true, "aci");
      expect(ldAci).toBeGreaterThan(400);
    });

    it("generates a complete schedule table, total tonnage, and BVBS CNC output", () => {
      const scheduleInputs: BarScheduleItemInput[] = [
        {
          barMark: "01",
          memberType: "beam",
          diameterMm: 16,
          shapeCode: "00",
          dimensions: { A: 6000 },
          numberOfMembers: 4,
          barsPerMember: 3, // 12 bars, 72m total
        },
        {
          barMark: "02",
          memberType: "beam",
          diameterMm: 8,
          shapeCode: "41", // links
          dimensions: { A: 400, B: 200 }, // 2*400 + 2*200 + 20*8 = 1360mm = 1.36m
          numberOfMembers: 4,
          barsPerMember: 30, // 120 links
        },
      ];

      const res = generateBarBendingSchedule(scheduleInputs, 12);
      expect(res.items.length).toBe(2);
      expect(res.totalTonnageKg).toBeGreaterThan(0);
      expect(res.summaryByDiameter[16].totalPiecesStock).toBe(6); // 72m / 12m = 6
      expect(res.summaryByDiameter[8].totalPiecesStock).toBeGreaterThan(0);
      expect(res.bvbsData).toContain("BF2D@");
      expect(res.bvbsData).toContain("H B01 n12 e16");
      expect(res.bvbsData).toContain("C@");
    });
  });

  describe("2. Multi-Code Shear Capacity Engine (Eurocode 2, ACI 318, IS 456)", () => {
    it("computes design shear capacity according to Eurocode 2", () => {
      const input: DesignShearCapacityInput = {
        standard: "eurocode_bs",
        bwMm: 230,
        dMm: 450,
        fckOrFcuMpa: 25,
        asMm2: 603, // 3T16
      };

      const res = computeDesignShearCapacity(input);
      expect(res.standard).toBe("eurocode_bs");
      expect(res.vcMpa).toBeGreaterThan(0.3);
      expect(res.vcCapacityKn).toBeGreaterThan(30);
      expect(res.minLinkSpacingMm).toBeLessThanOrEqual(300);
      expect(res.explanation).toContain("Eurocode 2");
    });

    it("computes design shear capacity according to ACI 318-19", () => {
      const input: DesignShearCapacityInput = {
        standard: "aci_astm",
        bwMm: 250,
        dMm: 500,
        fckOrFcuMpa: 28, // ~4000 psi
        asMm2: 942, // 3 #8 bars
      };

      const res = computeDesignShearCapacity(input);
      expect(res.standard).toBe("aci_astm");
      expect(res.vcMpa).toBeGreaterThan(0.5);
      expect(res.vcCapacityKn).toBeGreaterThan(60);
      expect(res.explanation).toContain("ACI 318-19");
    });
  });

  describe("3. Commercial CIS & Retainage Engine in Quotation Document", () => {
    it("calculates UK CIS subcontractor deduction and contract retainage", () => {
      const mockEstimate: CostEstimate = {
        materialsTotal: 50000,
        labourTotal: 30000,
        subtotal: 80000,
        contingencyPercent: 5,
        contingencyAmount: 4000,
        contractorMarginPercent: 10,
        contractorMarginAmount: 8400,
        grandTotal: 92400,
        breakdownByTrade: {},
        categoryBreakdown: {},
        lineItems: [],
        items: [],
      };

      const settings: Partial<QuotationSettings> = {
        currency: "GBP",
        cisRatePercent: 20, // UK CIS 20% on labour
        retainagePercent: 5, // 5% retainage on contract base
      };

      const quote = buildQuotation({
        costEstimate: mockEstimate,
        projectName: "Commercial Fitout Project",
        settings,
      });

      // Labour is 30,000 => 20% CIS = 6,000
      expect(quote.cisDeductionAmount).toBe(6000);
      // Retainage: 5% of base (50,000 + 30,000 + 4,000 = 84,000) = 4,200
      expect(quote.retainageAmount).toBe(4200);
      // Net payable to contractor must be Grand Total minus CIS deduction and Retainage
      expect(quote.netPayableToContractor).toBe(quote.grandTotal - 6000 - 4200);
    });
  });
});
