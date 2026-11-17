// Verification of the drywall fixing count against published guidance.
//
// Published practice is about one screw per square foot of board, 10.8 per m2,
// which is 30 to 40 screws on a 1.2 x 2.4 m sheet. Studs at 400 mm with fixings
// at 300 mm down each stud give 2.5 x 3.33 = 8.3 fixings per m2 along the studs
// alone, and the staggered fixings between studs bring a sheet to the 30 to 40
// installers use. The profiles carried 32 per m2 for the imperial markets and 20
// for the metric ones, so a US project ordered about three times the screws its
// walls need: 92 on a sheet instead of 35.

import { describe, expect, it } from "vitest";
import {
  DRYWALL_MARKET_PROFILES,
  DRYWALL_SCREW_DENSITY_PER_M2,
  calculateDrywallTakeoff,
} from "@/lib/estimation/drywall-standalone-engine";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";

const takeoff = (marketCode: string) =>
  calculateDrywallTakeoff({ marketCode, wallAreaM2: 100, boardSides: 1 });

describe("drywall screws per square metre", () => {
  it("uses one figure everywhere, inside the published band", () => {
    expect(DRYWALL_SCREW_DENSITY_PER_M2).toBe(12);
    for (const [code, profile] of Object.entries(DRYWALL_MARKET_PROFILES)) {
      expect(profile.screwDensityPerM2, code).toBe(
        DRYWALL_SCREW_DENSITY_PER_M2,
      );
    }
  });

  it("puts 35 screws on a 1.2 x 2.4 m sheet", () => {
    const sheet = 1.2 * 2.4;
    expect(Math.round(sheet * DRYWALL_SCREW_DENSITY_PER_M2)).toBe(35);
    // The two figures it replaces, per sheet: 92 and 58.
    expect(Math.round(sheet * 32)).toBe(92);
    expect(Math.round(sheet * 20)).toBe(58);
  });

  it("counts the screws a 100 m2 wall needs in every market", () => {
    expect(ALL_MARKET_CODES.length).toBe(32);
    for (const code of ALL_MARKET_CODES) {
      const result = takeoff(code);
      const perM2 = result.drywallScrews / result.boardAreaM2;
      expect(perM2, code).toBeGreaterThanOrEqual(12);
      expect(perM2, code).toBeLessThan(12.05);
    }
  });

  it("keeps the same count when the stud spacing is named", () => {
    const narrow = calculateDrywallTakeoff({
      marketCode: "GB",
      wallAreaM2: 100,
      boardSides: 1,
      studSpacingMm: 400,
    });
    expect(narrow.drywallScrews).toBeGreaterThan(1_100);
    expect(narrow.drywallScrews).toBeLessThan(1_400);
  });
});
