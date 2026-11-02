import { describe, it, expect } from "vitest";
import {
  getConstructionTypology,
  CONSTRUCTION_TYPOLOGIES,
} from "../construction-typologies";

describe("Construction Typologies Architecture", () => {
  it("resolves US light-frame timber construction with 2x6 studs and IRC standards", () => {
    const us = getConstructionTypology("US");
    expect(us.marketCodes).toContain("US");
    expect(us.regionalCategory).toBe("north_american_timber_frame");
    expect(us.primaryStructuralSystem).toContain("Platform frame");
    expect(us.applicableStandards).toContain("IRC 2024");
    expect(us.disclaimer).toContain("frost depth");
  });

  it("resolves Nigerian sandcrete blockwork and concrete frame with COREN disclosure", () => {
    const ng = getConstructionTypology("NG");
    expect(ng.marketCodes).toContain("NG");
    expect(ng.regionalCategory).toBe("west_african_masonry");
    expect(ng.wallTypology).toContain("sandcrete");
    expect(ng.disclaimer).toContain("COREN");
  });

  it("resolves UK cavity wall construction with facing brick and blockwork", () => {
    const gb = getConstructionTypology("GB");
    expect(gb.marketCodes).toContain("GB");
    expect(gb.regionalCategory).toBe("british_cavity_wall");
    expect(gb.wallTypology).toContain("facing brick");
  });

  it("resolves all 20 markets to valid non-null typologies with required structural disclosures", () => {
    const markets = [
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
    ];
    for (const code of markets) {
      const t = getConstructionTypology(code);
      expect(t).toBeDefined();
      expect(t.name).toBeTruthy();
      expect(t.primaryStructuralSystem).toBeTruthy();
      expect(t.wallTypology).toBeTruthy();
      expect(t.foundationTypology).toBeTruthy();
      expect(t.disclaimer).toContain("takeoff");
    }
  });
});
