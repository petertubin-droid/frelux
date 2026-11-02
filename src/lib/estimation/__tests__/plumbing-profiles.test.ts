import { describe, it, expect } from "vitest";
import { getPlumbingProfile, PLUMBING_PROFILES } from "../plumbing-profiles";

describe("Plumbing Market Profiles", () => {
  it("resolves US profile with IPC/UPC standards, PEX/Copper, PVC DWV, and imperial feet", () => {
    const us = getPlumbingProfile("US");
    expect(us.marketCode).toBe("US");
    expect(us.runDistanceUnit).toBe("ft");
    expect(us.measurementSystem).toBe("imperial");
    expect(us.standardsRef).toContain("IPC");
    expect(us.waterSupplyMaterial).toContain("PEX");
    expect(us.drainageDwvMaterial).toContain("Schedule 40 PVC");
    expect(us.drainageSlopeRule).toContain("1/4 inch per foot");
  });

  it("resolves DE profile with DIN 1988, Verbundrohr, HT-Rohr, and metric meters", () => {
    const de = getPlumbingProfile("DE");
    expect(de.marketCode).toBe("DE");
    expect(de.runDistanceUnit).toBe("m");
    expect(de.measurementSystem).toBe("metric");
    expect(de.standardsRef).toContain("DIN 1988");
    expect(de.drainageDwvMaterial).toContain("HT-Rohr");
  });

  it("resolves SG profile with SS 675 / PUB regulations and metric sizing", () => {
    const sg = getPlumbingProfile("SG");
    expect(sg.marketCode).toBe("SG");
    expect(sg.runDistanceUnit).toBe("m");
    expect(sg.measurementSystem).toBe("metric");
    expect(sg.standardsRef).toContain("SS 675");
    expect(sg.waterSupplyMaterial).toContain("Copper");
    expect(sg.drainageDwvMaterial).toContain("uPVC");
  });

  it("resolves all 32 markets to valid non-null plumbing profiles", () => {
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
      "SG",
      "ET",
      "EG",
      "TZ",
      "CI",
      "ES",
      "NL",
      "PL",
      "SE",
      "CH",
      "TR",
      "NZ",
    ];
    for (const code of markets) {
      const p = getPlumbingProfile(code);
      expect(p).toBeDefined();
      expect(p.waterSupplyMaterial).toBeTruthy();
      expect(p.drainageDwvMaterial).toBeTruthy();
      expect(p.drainageSlopeRule).toBeTruthy();
      expect(p.runDistanceUnit).toMatch(/^(m|ft)$/);
    }
  });
});
