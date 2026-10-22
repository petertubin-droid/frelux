import { describe, expect, it } from "vitest";
import { calculateSepticSizing } from "../septic-sizing-engine";

describe("Septic sizing worksheet", () => {
  it("calculates from explicit user-provided flow criteria without regional assumptions", () => {
    const result = calculateSepticSizing({
      marketCode: "KE",
      occupants: 6,
      designFlowLitresPerPersonPerDay: 120,
      retentionDays: 2,
      storageAllowanceDays: 1,
      freeboardPercent: 20,
      acceptedSoilLoadingRateLitresPerM2PerDay: 30,
      soakawayDepthM: 2,
    });
    expect(result.dailyDesignFlowLitres).toBe(720);
    expect(result.tankWorkingVolumeM3).toBe(2.16);
    expect(result.tankTotalVolumeM3).toBe(2.592);
    expect(result.soakawayRequiredAbsorptionAreaM2).toBe(24);
    expect(result.indicativeSoakawayDiameterM).toBeCloseTo(5.53, 2);
    expect(result.safetyNotice).toContain("not a septic system design");
  });
  it("does not infer soakaway size when soil loading rate is missing", () => {
    const result = calculateSepticSizing({
      marketCode: "XX",
      occupants: 4,
      designFlowLitresPerPersonPerDay: 100,
      retentionDays: 2,
    });
    expect(result.soakawayRequiredAbsorptionAreaM2).toBeNull();
    expect(result.indicativeSoakawayDiameterM).toBeNull();
    expect(result.assumptions[0]).toContain(
      "no national rule is silently assumed",
    );
  });
});
