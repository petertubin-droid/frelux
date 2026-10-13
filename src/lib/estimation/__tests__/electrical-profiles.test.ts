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

  it("resolves GH profile with Energy Commission L.I. 2008 and conduit wiring", () => {
    const gh = getElectricalProfile("GH");
    expect(gh.marketCode).toBe("GH");
    expect(gh.runDistanceUnit).toBe("m");
    expect(gh.measurementSystem).toBe("metric");
    expect(gh.standardsRef).toContain("L.I. 2008");
    expect(gh.lightingConductorSize).toContain("1.5 mm²");
    expect(gh.socketConductorSize).toContain("2.5 mm²");
    expect(gh.conduitRequired).toBe(true);
  });

  it("resolves KE profile with EPRA / KS IEC 60364 standards and heavy-gauge conduit", () => {
    const ke = getElectricalProfile("KE");
    expect(ke.marketCode).toBe("KE");
    expect(ke.runDistanceUnit).toBe("m");
    expect(ke.measurementSystem).toBe("metric");
    expect(ke.standardsRef).toContain("KS IEC 60364");
    expect(ke.lightingConductorSize).toContain("1.5 mm²");
    expect(ke.socketConductorSize).toContain("2.5 mm²");
    expect(ke.conduitRequired).toBe(true);
  });

  it("resolves ZA profile with SANS 10142-1 standards and Surfix wiring", () => {
    const za = getElectricalProfile("ZA");
    expect(za.marketCode).toBe("ZA");
    expect(za.runDistanceUnit).toBe("m");
    expect(za.measurementSystem).toBe("metric");
    expect(za.standardsRef).toContain("SANS 10142-1");
    expect(za.primaryWiringMethod).toContain("Surfix");
    expect(za.lightingConductorSize).toContain("1.5 mm²");
    expect(za.socketConductorSize).toContain("2.5 mm²");
    expect(za.conduitRequired).toBe(false);
  });

  it("resolves FR profile with NF C 15-100, H07V-U in ICTA conduit, and Consuel attestation requirement", () => {
    const fr = getElectricalProfile("FR");
    expect(fr.marketCode).toBe("FR");
    expect(fr.runDistanceUnit).toBe("m");
    expect(fr.measurementSystem).toBe("metric");
    expect(fr.standardsRef).toContain("NF C 15-100");
    expect(fr.primaryWiringMethod).toContain("ICTA");
    expect(fr.lightingConductorSize).toContain("1.5 mm²");
    expect(fr.socketConductorSize).toContain("2.5 mm²");
    expect(fr.conduitRequired).toBe(true);
  });

  it("resolves BR profile with ABNT NBR 5410, flexible 750V cable in corrugated conduit, and NBR 14136", () => {
    const br = getElectricalProfile("BR");
    expect(br.marketCode).toBe("BR");
    expect(br.runDistanceUnit).toBe("m");
    expect(br.measurementSystem).toBe("metric");
    expect(br.standardsRef).toContain("NBR 5410");
    expect(br.primaryWiringMethod).toContain("Cabo flexível");
    expect(br.lightingConductorSize).toContain("1.5 mm²");
    expect(br.socketConductorSize).toContain("2.5 mm²");
    expect(br.conduitRequired).toBe(true);
  });

  it("resolves SA profile with SBC 401 standards and derated 2.5mm²/4.0mm² conductors", () => {
    const sa = getElectricalProfile("SA");
    expect(sa.marketCode).toBe("SA");
    expect(sa.runDistanceUnit).toBe("m");
    expect(sa.measurementSystem).toBe("metric");
    expect(sa.standardsRef).toContain("SBC 401");
    expect(sa.lightingConductorSize).toContain("2.5 mm²");
    expect(sa.socketConductorSize).toContain("4.0 mm²");
    expect(sa.conduitRequired).toBe(true);
  });

  it("resolves AE profile with DEWA/BS 7671 standards, LSZH single-core, and 4.0mm² socket circuits", () => {
    const ae = getElectricalProfile("AE");
    expect(ae.marketCode).toBe("AE");
    expect(ae.runDistanceUnit).toBe("m");
    expect(ae.measurementSystem).toBe("metric");
    expect(ae.standardsRef).toContain("DEWA");
    expect(ae.primaryWiringMethod).toContain("LSZH");
    expect(ae.lightingConductorSize).toContain("2.5 mm²");
    expect(ae.socketConductorSize).toContain("4.0 mm²");
    expect(ae.conduitRequired).toBe(true);
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
