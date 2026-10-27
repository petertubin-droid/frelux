import { describe, expect, it } from "vitest";
import {
  designConcreteCapacity,
  jurisdictionToDesignCode,
  type DesignConcreteCode,
} from "../design-code-concrete";
import {
  asceKz,
  asceVelocityPressure,
  enPeakVelocityPressure,
  GCPI_ENCLOSED,
  roofUplift,
  windwardWallPressure,
  WIND_ZONE_DEFAULTS,
} from "../wind-load";
import {
  aciLevelForSdc,
  ec8CriticalRegions,
  seismicDetailingAci,
  sdcFromInputs,
} from "../seismic-detailing";

describe("design-code-concrete: ACI 318-19", () => {
  it("computes phi.Mn for a 300x550 beam with 1200 mm2, fc'=27.6, fy=420", () => {
    // Hand check: a = 1200*420/(0.85*27.6*300) = 504000/7038 = 71.61 mm
    // Mn = 504000*(500-35.81)/1e6 = 233.6 kN.m; phi.Mn = 210.3 kN.m
    const r = designConcreteCapacity({
      code: "ACI_318",
      b: 300,
      d: 500,
      As: 1200,
      fck: 27.6,
      fy: 420,
    });
    expect(r.blockDepthMm).toBeCloseTo(71.61, 1);
    expect(r.flexuralCapacityKNm).toBeCloseTo(210.3, 0);
    expect(r.capacityFactor).toBe(0.9);
    // Vc = 0.17*sqrt(27.6)*300*500/1000 = 134.2 kN; phi.Vc = 100.7 kN
    expect(r.shearCapacityKN).toBeCloseTo(100.7, 0);
    expect(r.formulaTransparency.length).toBeGreaterThan(0);
  });

  it("flags over-reinforced sections against the phi=0.90 assumption", () => {
    const r = designConcreteCapacity({
      code: "ACI_318",
      b: 200,
      d: 400,
      As: 2500, // huge steel: a = 2500*420/(0.85*27.6*200) = 223 mm > 200
      fck: 27.6,
      fy: 420,
    });
    expect(r.warnings.some((w) => w.includes("over-reinforced"))).toBe(true);
  });
});

describe("design-code-concrete: Eurocode 2", () => {
  it("computes MRd with gamma_c=1.5, gamma_s=1.15", () => {
    // fcd=16.67, fyd=434.78, x=1200*434.78/(0.8*16.67*300)=130.4 mm,
    // z=500-52.2=447.8 mm, MRd=521.7kN*447.8mm=233.6 kN.m
    const r = designConcreteCapacity({
      code: "EUROCODE_2",
      b: 300,
      d: 500,
      As: 1200,
      fck: 25,
      fy: 500,
    });
    expect(r.flexuralCapacityKNm).toBeCloseTo(233.6, 0);
    expect(r.neutralAxisMm).toBeCloseTo(130.4, 0);
    expect(r.formulaTransparency[0]).toContain("1.5");
  });

  it("warns when x/d exceeds the EC2 ductility guidance", () => {
    const r = designConcreteCapacity({
      code: "EUROCODE_2",
      b: 200,
      d: 400,
      As: 2200,
      fck: 25,
      fy: 500,
    });
    // x = 2200*434.78/(0.8*16.67*200) = 718 mm >> d
    expect(r.warnings.some((w) => w.includes("0.45"))).toBe(true);
  });
});

describe("design-code-concrete: IS 456:2000", () => {
  it("computes Mu with the limit-state 0.87/0.36 expressions", () => {
    // xu = 0.87*415*1200/(0.36*25*300) = 433260/2700 = 160.5 mm
    // Mu = 433260*(500-67.4)/1e6 = 187.4 kN.m
    const r = designConcreteCapacity({
      code: "IS_456",
      b: 300,
      d: 500,
      As: 1200,
      fck: 25,
      fy: 415,
    });
    expect(r.neutralAxisMm).toBeCloseTo(160.5, 0);
    expect(r.flexuralCapacityKNm).toBeCloseTo(187.4, 0);
    expect(r.formulaTransparency[2]).toContain("0.48");
  });

  it("flags over-reinforcing beyond xu,max/d for Fe415", () => {
    const r = designConcreteCapacity({
      code: "IS_456",
      b: 200,
      d: 400,
      As: 2000,
      fck: 25,
      fy: 415,
    });
    // xu = 0.87*415*2000/(0.36*25*200) = 741000/1800 = 411.7 mm > 0.48*400
    expect(r.warnings.some((w) => w.includes("over-reinforced"))).toBe(true);
  });
});

describe("design-code-concrete: AS 3600:2018", () => {
  it("computes phi.Muo with the gamma stress block and phi=0.8", () => {
    // fc=32: gamma = 1.25 - 0.85*32/200 = 1.114 -> clamped to 0.85
    // a = 1200*500/(0.85*0.85*32*300) = 600000/6936 = 86.55 mm
    // Muo = 600000*(500-43.3)/1e6 = 274.0 kN.m; phi.Muo = 219.2
    const r = designConcreteCapacity({
      code: "AS_3600",
      b: 300,
      d: 500,
      D: 550,
      As: 1200,
      fck: 32,
      fy: 500,
    });
    expect(r.blockDepthMm).toBeCloseTo(86.6, 0);
    expect(r.flexuralCapacityKNm).toBeCloseTo(219.2, 0);
    expect(r.capacityFactor).toBe(0.8);
  });

  it("reports shear as intentionally unimplemented (no fabricated beta1)", () => {
    const r = designConcreteCapacity({
      code: "AS_3600",
      b: 300,
      d: 500,
      As: 1200,
      fck: 32,
      fy: 500,
    });
    expect(r.shearCapacityKN).toBeNull();
    expect(r.formulaTransparency.some((f) => f.includes("8.2.7"))).toBe(true);
  });

  it("runs the Cl 9.1.1(b) minimum-steel check when D is supplied", () => {
    const small = designConcreteCapacity({
      code: "AS_3600",
      b: 300,
      d: 500,
      D: 550,
      As: 180, // tiny steel
      fck: 32,
      fy: 500,
    });
    // Mcr = 0.6*sqrt(32)*300*550^2/6/1e6 = 3.397*300*302500/6/1e6 = 51.3 kN.m
    // 1.2*Mcr = 61.6 >> phi.Muo -> warning expected
    expect(small.warnings.some((w) => w.includes("9.1.1(b)"))).toBe(true);
    const ok = designConcreteCapacity({
      code: "AS_3600",
      b: 300,
      d: 500,
      D: 550,
      As: 1200,
      fck: 32,
      fy: 500,
    });
    expect(ok.warnings.some((w) => w.includes("9.1.1(b)"))).toBe(false);
  });

  it("rejects invalid sections on every code", () => {
    for (const code of [
      "ACI_318",
      "EUROCODE_2",
      "IS_456",
      "AS_3600",
    ] as DesignConcreteCode[]) {
      expect(() =>
        designConcreteCapacity({
          code,
          b: -1,
          d: 500,
          As: 1200,
          fck: 25,
          fy: 500,
        }),
      ).toThrow();
    }
  });
});

describe("design-code-concrete: BS 8110-1:1997", () => {
  it("computes Mu with the 0.45fcu/0.9xu block and 0.87fy", () => {
    // fcu=25: xu = 0.87*410*1200/(0.405*25*300) = 427440/3037.5 = 140.8 mm
    // z = 500 - 63.4 = 436.6 mm; Mu = 427440*436.6/1e6 = 186.6 kN.m
    const r = designConcreteCapacity({
      code: "BS_8110",
      b: 300,
      d: 500,
      As: 1200,
      fck: 25, // BS branch treats the input as cube fcu
      fy: 410,
    });
    expect(r.neutralAxisMm).toBeCloseTo(140.8, 0);
    expect(r.flexuralCapacityKNm).toBeCloseTo(186.6, 0);
    expect(r.capacityFactor).toBe(0.87);
    // vc = (0.79/1.25)*(1.0)^(1/3)*(400/400)^(1/4)*(25/25)^(1/3)
    // pct = 100*1200/(300*500) = 0.8 -> 0.632*0.928... = 0.586 MPa
    // Vc = 0.586*300*500/1000 = 87.9 kN
    expect(r.shearCapacityKN).toBeCloseTo(87.9, 0);
    expect(r.formulaTransparency[2]).toContain("Table 3.8");
  });

  it("flags xu/d beyond the BS 8110 singly reinforced limit", () => {
    const r = designConcreteCapacity({
      code: "BS_8110",
      b: 200,
      d: 400,
      As: 2600,
      fck: 25,
      fy: 410,
    });
    // xu = 0.87*410*2600/(0.405*25*200) = 926k/2025 = 457 mm > 0.5*400
    expect(r.warnings.some((w) => w.includes("0.5"))).toBe(true);
  });

  it("maps jurisdiction selector values onto engine codes", () => {
    expect(jurisdictionToDesignCode("ACI_318")).toBe("ACI_318");
    expect(jurisdictionToDesignCode("EUROCODE_2")).toBe("EUROCODE_2");
    expect(jurisdictionToDesignCode("IS_456")).toBe("IS_456");
    expect(jurisdictionToDesignCode("AS_3600")).toBe("AS_3600");
    expect(jurisdictionToDesignCode("BS_8110")).toBe("BS_8110");
    expect(jurisdictionToDesignCode("anything-else")).toBe("BS_8110");
  });
});

describe("wind-load: ASCE 7-22", () => {
  it("Kz follows the exposure C power law and the 9.14 m plateau", () => {
    // Exposure C at 10 m: Kz = 2.01*(10/274.32)^(2/9.5) = 1.00
    expect(asceKz("C", 10)).toBeCloseTo(1.0, 2);
    expect(asceKz("B", 5)).toBeCloseTo(0.7, 2);
    expect(asceKz("D", 30)).toBeGreaterThan(1.3);
  });

  it("computes qz = 0.613 Kz Kzt Kd Ke V² in SI", () => {
    const r = asceVelocityPressure({ v_ms: 40, exposure: "C", z: 10 });
    // 0.613*1.001*1*0.85*1*1600 = 833 N/m²
    expect(r.qz_Nm2).toBeCloseTo(833, -1);
    expect(r.kd).toBe(0.85);
    expect(r.formula).toContain("26.10-1");
  });

  it("uplift combines GCp with +GCpi = 0.18 and scales by area", () => {
    const r = roofUplift({ qh_Nm2: 833, zone: "corner", area_m2: 2 });
    // p = 833*(-2.8+0.18) = -2182 N/m²; force = -4364 N
    expect(r.netPressure_Nm2).toBeCloseTo(-2182, -1);
    expect(r.force_N).toBeCloseTo(-4364, -1);
    expect(GCPI_ENCLOSED).toBe(0.18);
  });

  it("windward wall pressure uses Cp=0.8 with +GCpi", () => {
    // p = qz*(0.8+0.18) = 0.98*qz
    expect(windwardWallPressure(833)).toBeCloseTo(816, -1);
  });
});

describe("wind-load: EN 1991-1-4", () => {
  it("computes qp(z) = (1+7 Iv)·0.5 rho vb²", () => {
    const r = enPeakVelocityPressure({ vb_ms: 25, z: 10 });
    // qb = 0.5*1.25*625 = 390.6 N/m²; Iv = 1/ln(10/0.05) = 1/ln(200) = 0.1887
    // ce = 1 + 7*0.1887 = 2.321; qp = 906.6 N/m²
    expect(r.qb_Nm2).toBeCloseTo(390.6, 0);
    expect(r.iv).toBeCloseTo(0.189, 2);
    expect(r.qp_Nm2).toBeCloseTo(907, -1);
    expect(r.formula).toContain("EN 1991-1-4");
  });

  it("honours zmin for low reference heights", () => {
    const low = enPeakVelocityPressure({ vb_ms: 25, z: 1 });
    // z < zmin=2 -> Iv at 2 m: 1/ln(2/0.05) = 1/3.689 = 0.271 -> ce = 2.897
    // qp = 2.897*390.6 = 1131.5 N/m²
    expect(low.qp_Nm2).toBeCloseTo(1132, -1);
  });

  it("labels indicative market defaults as engineer-confirmable", () => {
    const ng = WIND_ZONE_DEFAULTS.NG;
    expect(ng.label.toLowerCase()).toContain("indicative");
    for (const m of Object.values(WIND_ZONE_DEFAULTS)) {
      expect(m.label.toLowerCase()).toContain("indicative");
    }
  });
});

describe("seismic-detailing: ACI 318-19 Ch 18", () => {
  it("maps SDC to detailing level", () => {
    expect(aciLevelForSdc("A")).toBe("ordinary");
    expect(aciLevelForSdc("B")).toBe("ordinary");
    expect(aciLevelForSdc("C")).toBe("intermediate");
    expect(aciLevelForSdc("D")).toBe("special");
    expect(aciLevelForSdc("F")).toBe("special");
  });

  it("derives SDC from S_DS and risk category", () => {
    expect(sdcFromInputs({ sds: 0.1 })).toBe("A");
    expect(sdcFromInputs({ sds: 0.2 })).toBe("B");
    expect(sdcFromInputs({ sds: 0.2, riskCategory: 4 })).toBe("C");
    expect(sdcFromInputs({ sds: 0.4 })).toBe("C");
    expect(sdcFromInputs({ sds: 0.55 })).toBe("D");
  });

  it("prescribes special moment frame detailing for SDC D", () => {
    const r = seismicDetailingAci(
      "D",
      { dbLong: 20, dbHoop: 10, h: 500, clearSpan: 5000 },
      { dbLong: 25, dbHoop: 10, hc: 400, clearHeight: 3000 },
    );
    // beam: min(500/4=125, 6*20=120, 152) = 120 mm over min(2h=1000, 5000/4=1250) = 1000
    expect(r.aciLevel).toBe("special");
    expect(r.beamCriticalRegionMm).toBe(120);
    expect(r.beamCriticalLengthMm).toBe(1000);
    // column: min(400/4=100, 6*25=150, 100) = 100 mm
    expect(r.columnCriticalRegionMm).toBe(100);
    expect(r.foundationTies.required).toBe(true);
    expect(r.foundationTies.clause).toContain("12.13.8.5");
  });

  it("prescribes intermediate detailing and SDC C footing ties", () => {
    const r = seismicDetailingAci(
      "C",
      { dbLong: 20, dbHoop: 10, h: 500, clearSpan: 5000 },
      { dbLong: 25, dbHoop: 10, hc: 400, clearHeight: 3000 },
    );
    // beam: min(125, 120, 152) = 120 mm over 2h = 1000
    expect(r.aciLevel).toBe("intermediate");
    expect(r.beamCriticalRegionMm).toBe(120);
    // column: min(8*25=200, 24*10=240, 200, 300) = 200 mm
    expect(r.columnCriticalRegionMm).toBe(200);
    expect(r.foundationTies.required).toBe(true);
    expect(r.foundationTies.clause).toContain("12.13.8.4");
  });

  it("leaves SDC A/B on ordinary tie rules without mandatory ties", () => {
    const r = seismicDetailingAci(
      "B",
      { dbLong: 20, dbHoop: 10, h: 500, clearSpan: 5000 },
      { dbLong: 25, dbHoop: 10, hc: 400, clearHeight: 3000 },
    );
    // ordinary: min(16*20=320, 48*10=480, 500) = 320
    expect(r.beamCriticalRegionMm).toBe(320);
    // column: min(16*25=400, 480, 400) = 400
    expect(r.columnCriticalRegionMm).toBe(400);
    expect(r.foundationTies.required).toBe(false);
  });
});

describe("seismic-detailing: EN 1998-1", () => {
  it("sizes DCM and DCH critical regions", () => {
    const dcm = ec8CriticalRegions("DCM", 500, 400, 6000);
    // beam: max(1500, 1.5*500=750) = 1500; column: max(1500, 400, 450) = 1500
    expect(dcm.beamCriticalRegionLengthMm).toBe(1500);
    expect(dcm.columnCriticalRegionLengthMm).toBe(1500);
    const dch = ec8CriticalRegions("DCH", 500, 400, 4000);
    // beam: max(1000, 1000) = 1000; column: max(1000, 400, 450) = 1000
    expect(dch.beamCriticalRegionLengthMm).toBe(1000);
    expect(dch.clause).toContain("5.5.3.2.1");
  });

  it("reports DCL honestly as strength-only territory", () => {
    const dcl = ec8CriticalRegions("DCL", 500, 400, 6000);
    expect(dcl.beamCriticalRegionLengthMm).toBeNull();
    expect(dcl.notes.join(" ")).toContain("DCL");
  });
});
