import { describe, it, expect } from "vitest";
import {
  calculateMasonryTakeoff,
  resolveMarketMasonryConfig,
  MASONRY_MARKET_REGISTRY,
} from "../masonry-standalone-engine";

describe("Masonry Standalone Engine", () => {
  it("covers all 32 Frelux markets in registry", () => {
    const requiredMarkets = [
      "NG",
      "US",
      "GB",
      "CA",
      "AU",
      "DE",
      "IN",
      "GH",
      "KE",
      "ZA",
      "JP",
      "FR",
      "BR",
      "SA",
      "AE",
      "CN",
      "ID",
      "MX",
      "KR",
      "IT",
      "ET",
      "EG",
      "TZ",
      "CI",
      "ES",
      "NL",
      "PL",
      "SE",
      "CH",
      "SG",
      "TR",
      "NZ",
    ];

    for (const code of requiredMarkets) {
      expect(MASONRY_MARKET_REGISTRY[code]).toBeDefined();
      expect(MASONRY_MARKET_REGISTRY[code].cementBagWeightKg).toBeGreaterThan(
        0,
      );
      expect(
        MASONRY_MARKET_REGISTRY[code].availableUnits.length,
      ).toBeGreaterThan(0);
    }
  });

  it("flags generic unknown-market packaging instead of claiming local verification", () => {
    const res = calculateMasonryTakeoff({
      marketCode: "ZZ",
      wallLengthM: 4,
      wallHeightM: 3,
    });
    expect(res.packagingEvidence.status).toBe("not_available");
    expect(res.packagingEvidence.label).toContain("Unverified placeholder");
    expect(res.marketNotes).toContain("Confirm actual packaging before use");
  });

  it("calculates accurate takeoff for Nigerian 9-inch sandcrete block wall", () => {
    const res = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      wastePercent: 5,
    });

    expect(res.marketCode).toBe("NG");
    expect(res.grossWallAreaM2).toBe(30);
    expect(res.unit.name).toContain("9-inch Hollow Sandcrete");
    expect(res.cementBagWeightKg).toBe(50);
    // 10m x 3m = 30m2. For 450x225 with 12mm joint: face area = 0.462 * 0.237 = 0.1095 m2 -> ~9.13 units/m2 -> ~274 net -> ~288 gross
    expect(res.unitsRequiredGross).toBeGreaterThan(270);
    expect(res.unitsRequiredGross).toBeLessThan(300);
    expect(res.cementBagsRequired).toBeGreaterThan(0);
    expect(res.sandWeightTonnes).toBeGreaterThan(0);
    expect(res.packagingEvidence.status).toBe("planning_assumption");
    expect(res.marketNotes).toContain("not a verified country-wide standard");
  });

  it("calculates accurate takeoff for US 8x8x16 CMU wall with opening deduction", () => {
    const res = calculateMasonryTakeoff({
      marketCode: "US",
      wallLengthM: 12,
      wallHeightM: 3,
      openings: [
        {
          id: "door",
          description: "Standard Door",
          widthM: 0.9,
          heightM: 2.1,
          quantity: 1,
        },
        {
          id: "window",
          description: "Window",
          widthM: 1.2,
          heightM: 1.2,
          quantity: 2,
        },
      ],
      wastePercent: 5,
    });

    expect(res.marketCode).toBe("US");
    expect(res.grossWallAreaM2).toBe(36);
    // Door: 0.9 * 2.1 = 1.89 m2. Windows: 2 * (1.2 * 1.2) = 2.88 m2. Total openings = 4.77 m2.
    expect(res.openingsAreaM2).toBe(4.77);
    expect(res.netWallAreaM2).toBe(31.23);
    expect(res.cementBagWeightKg).toBe(42.6); // 94 lb bag
    expect(res.unit.category).toBe("cmu");
    expect(res.unitsRequiredGross).toBeGreaterThan(350);
  });

  it("calculates accurate takeoff for UK facing brick wall with 25kg cement bags", () => {
    const res = calculateMasonryTakeoff({
      marketCode: "GB",
      wallLengthM: 6,
      wallHeightM: 2.5,
      selectedUnitId: "gb-facing-brick",
      wastePercent: 5,
    });

    expect(res.marketCode).toBe("GB");
    expect(res.cementBagWeightKg).toBe(25);
    expect(res.unit.category).toBe("brick");
    // Facing brick: 215x65mm + 10mm joint = 225x75mm = 0.016875 m2 -> ~59.25 bricks/m2.
    // 15 m2 * 59.25 = ~888 net -> with 5% waste = ~933 bricks.
    expect(res.unitsRequiredGross).toBeGreaterThan(900);
    expect(res.unitsRequiredGross).toBeLessThan(980);
    expect(res.estimatedLaborHours.masonHours).toBeGreaterThan(20);
  });

  it("respects custom masonry dimensions and mortar ratios", () => {
    const res = calculateMasonryTakeoff({
      marketCode: "DE",
      wallLengthM: 5,
      wallHeightM: 3,
      customUnit: {
        name: "Custom Heavy Block",
        lengthMm: 500,
        heightMm: 250,
        widthMm: 200,
        isHollow: false,
        standardJointMm: 10,
      },
      mortarMixRatio: "1:3",
      wastePercent: 10,
    });

    expect(res.unit.name).toBe("Custom Heavy Block");
    expect(res.mortarVolumeM3Gross).toBeGreaterThan(0);
    expect(res.cementBagsRequired).toBeGreaterThan(0);
  });

  it("provides reliable fallback for an unlisted country without throwing", () => {
    const res = calculateMasonryTakeoff({
      marketCode: "XX",
      wallLengthM: 10,
      wallHeightM: 2.5,
    });

    expect(res.marketCode).toBe("XX");
    expect(res.unitsRequiredGross).toBeGreaterThan(0);
    expect(res.cementBagsRequired).toBeGreaterThan(0);
  });
});
