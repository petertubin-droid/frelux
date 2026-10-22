import { describe, it, expect } from "vitest";
import {
  calculatePlasteringTakeoff,
  CEMENT_BAG_WEIGHT_BY_MARKET,
} from "../plastering-standalone-engine";

describe("Plastering & Rendering Standalone Engine", () => {
  it("covers all 32 Frelux markets with cement packaging weights", () => {
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
      expect(CEMENT_BAG_WEIGHT_BY_MARKET[code]).toBeDefined();
      expect(CEMENT_BAG_WEIGHT_BY_MARKET[code]).toBeGreaterThan(0);
    }
  });

  it("calculates accurate internal plaster takeoff for 100 m2 wall", () => {
    const res = calculatePlasteringTakeoff({
      marketCode: "NG",
      surfaceAreaM2: 100,
      applicationType: "internal_plaster",
      thicknessMm: 12,
      mixRatio: "1:4",
      wastePercent: 5,
    });

    expect(res.marketCode).toBe("NG");
    expect(res.totalAreaM2).toBe(100);
    expect(res.cementBagWeightKg).toBe(50);
    // 100m2 at 12mm = 1.2 m3 wet -> with roughness 5% = 1.26 m3 wet -> with dry 1.33 & 5% waste = ~1.76 m3 dry
    // 1:4 mix -> 1/5 cement = ~0.35 m3 cement = ~506 kg cement -> ~11 bags of 50kg
    expect(res.cementBagsRequired).toBeGreaterThanOrEqual(10);
    expect(res.cementBagsRequired).toBeLessThanOrEqual(12);
    expect(res.sandWeightTonnes).toBeGreaterThan(1.8);
    expect(res.waterLiters).toBeGreaterThan(200);
  });

  it("calculates accurate external render takeoff with UK 25kg bags", () => {
    const res = calculatePlasteringTakeoff({
      marketCode: "GB",
      surfaceAreaM2: 50,
      applicationType: "external_render",
      thicknessMm: 20,
      mixRatio: "1:4",
      wastePercent: 5,
    });

    expect(res.marketCode).toBe("GB");
    expect(res.cementBagWeightKg).toBe(25);
    expect(res.cementBagsRequired).toBeGreaterThan(15); // UK 25 kg bags are counted as whole purchase units
    expect(res.estimatedLaborHours.plastererHours).toBeGreaterThan(15);
  });

  it("computes surface area from wall dimensions if direct area is omitted", () => {
    const res = calculatePlasteringTakeoff({
      marketCode: "US",
      wallLengthM: 10,
      wallHeightM: 3,
      wallCount: 2, // 2 walls of 10m x 3m = 60 m2
      thicknessMm: 15,
    });

    expect(res.totalAreaM2).toBe(60);
    expect(res.cementBagWeightKg).toBe(42.6);
    expect(res.packagingEvidence.status).toBe("planning_assumption");
    expect(res.packagingEvidence.guidance).toContain(
      "not a verified country-wide standard",
    );
  });

  it("explicitly flags unknown-market placeholder packaging", () => {
    const res = calculatePlasteringTakeoff({
      marketCode: "ZZ",
      surfaceAreaM2: 10,
    });
    expect(res.cementBagWeightKg).toBe(50);
    expect(res.packagingEvidence.status).toBe("not_available");
    expect(res.packagingEvidence.label).toContain("Unverified placeholder");
    expect(res.marketNotes).toContain("legacy 50 kg placeholder");
  });
});
