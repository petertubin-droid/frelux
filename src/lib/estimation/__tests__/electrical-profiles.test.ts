import { describe, it, expect } from "vitest";
import {
  getElectricalProfile,
  ELECTRICAL_PROFILES,
} from "../electrical-profiles";

describe("Electrical Market Profiles", () => {
  it("resolves US profile with NEC standards, NM-B cable, AWG conductors, and imperial feet", () => {
    const us = getElectricalProfile("US");
    expect(us.marketCode).toBe("US");
    expect(us.runDistanceUnit).toBe("ft");
    expect(us.measurementSystem).toBe("imperial");
    expect(us.standardsRef).toContain("NFPA 70");
    expect(us.primaryWiringMethod).toContain("NM-B");
    expect(us.lightingConductorSize).toContain("14 AWG");
    expect(us.conduitRequired).toBe(false);
  });

  it("resolves GB profile with BS 7671, Twin & Earth, mm² conductors and metric meters", () => {
    const gb = getElectricalProfile("GB");
    expect(gb.marketCode).toBe("GB");
    expect(gb.runDistanceUnit).toBe("m");
    expect(gb.measurementSystem).toBe("metric");
    expect(gb.standardsRef).toContain("BS 7671");
    expect(gb.primaryWiringMethod).toContain("6242Y");
    expect(gb.socketConductorSize).toContain("2.5 mm²");
  });

  it("resolves all 20 markets to valid non-null electrical profiles", () => {
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
      const p = getElectricalProfile(code);
      expect(p).toBeDefined();
      expect(p.nominalVoltage).toBeTruthy();
      expect(p.lightingConductorSize).toBeTruthy();
      expect(p.socketConductorSize).toBeTruthy();
      expect(p.runDistanceUnit).toMatch(/^(m|ft)$/);
    }
  });
});
