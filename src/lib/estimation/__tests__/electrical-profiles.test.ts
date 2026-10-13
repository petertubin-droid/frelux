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

  it("resolves NG profile with NEMSA standards and single-core in recessed PVC conduit", () => {
    const ng = getElectricalProfile("NG");
    expect(ng.marketCode).toBe("NG");
    expect(ng.runDistanceUnit).toBe("m");
    expect(ng.measurementSystem).toBe("metric");
    expect(ng.standardsRef).toContain("NEMSA");
    expect(ng.primaryWiringMethod).toContain("recessed PVC conduit");
    expect(ng.lightingConductorSize).toContain("1.5 mm²");
    expect(ng.socketConductorSize).toContain("2.5 mm²");
    expect(ng.conduitRequired).toBe(true);
  });

  it("resolves CA profile with CEC/CSA C22.1 standards, NMD90 cable, and imperial feet", () => {
    const ca = getElectricalProfile("CA");
    expect(ca.marketCode).toBe("CA");
    expect(ca.runDistanceUnit).toBe("ft");
    expect(ca.measurementSystem).toBe("imperial");
    expect(ca.standardsRef).toContain("CSA C22.1");
    expect(ca.primaryWiringMethod).toContain("NMD90");
    expect(ca.lightingConductorSize).toContain("14 AWG");
    expect(ca.conduitRequired).toBe(false);
  });

  it("resolves AU profile with AS/NZS 3000 standards and flat TPS cable", () => {
    const au = getElectricalProfile("AU");
    expect(au.marketCode).toBe("AU");
    expect(au.runDistanceUnit).toBe("m");
    expect(au.measurementSystem).toBe("metric");
    expect(au.standardsRef).toContain("AS/NZS 3000");
    expect(au.primaryWiringMethod).toContain("TPS");
    expect(au.lightingConductorSize).toContain("1.5 mm²");
    expect(au.socketConductorSize).toContain("2.5 mm²");
    expect(au.conduitRequired).toBe(false);
  });

  it("resolves IN profile with IS 732 standards and FRLS single-core copper in conduit", () => {
    const inMkt = getElectricalProfile("IN");
    expect(inMkt.marketCode).toBe("IN");
    expect(inMkt.runDistanceUnit).toBe("m");
    expect(inMkt.measurementSystem).toBe("metric");
    expect(inMkt.standardsRef).toContain("IS 732");
    expect(inMkt.primaryWiringMethod).toContain("FRLS");
    expect(inMkt.lightingConductorSize).toContain("1.5 mm²");
    expect(inMkt.conduitRequired).toBe(true);
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
