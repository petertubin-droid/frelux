import { describe, it, expect } from "vitest";
import {
  BS8666_TABLE2,
  BAR_MASS_KG_M,
  bsShapeLength,
  bsMinimizedLinkLength,
  aciHookGeometry,
  aciTensionDevelopment,
  aciCompressionDevelopment,
  aciTensionLap,
  aciCompressionLap,
  ec2AnchorageLength,
  ec2LapLength,
  generateBvbsFile,
  bbsItemMassKg,
  type BbsItem,
} from "../bbs-schedule";

describe("BS 8666:2020 Table 2 constants", () => {
  it("gives d12 bars r=24mm scheduling radius and M=48mm mandrel", () => {
    expect(BS8666_TABLE2[12].r).toBe(24);
    expect(BS8666_TABLE2[12].M).toBe(48);
    expect(BS8666_TABLE2[20].r).toBe(70);
    expect(BS8666_TABLE2[20].M).toBe(140);
  });

  it("carries the standard bar mass table", () => {
    expect(BAR_MASS_KG_M[16]).toBeCloseTo(1.579, 3);
    expect(BAR_MASS_KG_M[25]).toBeCloseTo(3.854, 3);
  });
});

describe("BS 8666:2020 Table 3 shape code lengths (hand-verified)", () => {
  it("shape 00 cuts straight: L = A", () => {
    expect(bsShapeLength("00", { A: 6000, d: 16 }).L).toBe(6000);
  });

  it("shape 11: A + B - 0.5r - d", () => {
    // d12 => r=24: 1000 + 300 - 12 - 12 = 1276
    expect(bsShapeLength("11", { A: 1000, B: 300, d: 12 }).L).toBe(1276);
  });

  it("shape 21: A + B + C - r - 2d", () => {
    // d16 => r=32: 1000 + 400 + 200 - 32 - 32 = 1536
    expect(bsShapeLength("21", { A: 1000, B: 400, C: 200, d: 16 }).L).toBe(
      1536,
    );
  });

  it("shape 33 U-bar: 2A + 1.7B + 2C - 4d", () => {
    // d12: 600 + 340 + 180 - 48 = 1072
    expect(bsShapeLength("33", { A: 300, B: 200, C: 90, d: 12 }).L).toBe(1072);
  });

  it("shape 41 link: A+B+C+D+(E) - 2r - 4d", () => {
    // d10 => r=20: 650+300+400+300 - 40 - 40 = 1570
    expect(
      bsShapeLength("41", { A: 650, B: 300, C: 400, D: 300, d: 10 }).L,
    ).toBe(1570);
  });

  it("shape 51: 2[A+B+C] - 2.5r - 5d and the minimized variant", () => {
    // d12 => r=24: 2(600) - 60 - 60 = 1080
    expect(bsShapeLength("51", { A: 300, B: 200, C: 100, d: 12 }).L).toBe(1080);
    // minimized: 600 + 400 + max(192, 160) = 1192
    expect(bsMinimizedLinkLength("51", { A: 300, B: 200, d: 12 }).L).toBe(1192);
  });

  it("shape 63 closed link: 2A + 3B + 2C - 3r - 6d and minimized variants", () => {
    // d12 => r=24: 400 + 900 + 200 - 72 - 72 = 1356
    expect(bsShapeLength("63", { A: 200, B: 300, C: 100, d: 12 }).L).toBe(1356);
    // minimized d12 (<=16): 400 + 900 + max(168, 140) = 1468
    expect(bsMinimizedLinkLength("63", { A: 200, B: 300, d: 12 }).L).toBe(1468);
    // minimized d20 (>=20): 400 + 900 + 13x20 = 1560
    expect(bsMinimizedLinkLength("63", { A: 200, B: 300, d: 20 }).L).toBe(1560);
  });

  it("shape 67 is scheduled to A per the 2020 standard (not the helix)", () => {
    const r = bsShapeLength("67", { A: 5000, d: 20 });
    expect(r.L).toBe(5000);
    expect(r.formula).toContain("Clause 10");
  });

  it("shape 77 helix: C*pi*(A-d), and the steep-pitch variant when B > A/5", () => {
    // d12, A=1000, C=5 turns: 5 * pi * 988 = 15519.4...
    const flat = bsShapeLength("77", { A: 1000, C: 5, d: 12 });
    expect(flat.L).toBeCloseTo(5 * Math.PI * 988, 1);
    // B=250 > A/5=200: 5 * sqrt((pi*988)^2 + 250^2)
    const steep = bsShapeLength("77", { A: 1000, B: 250, C: 5, d: 12 });
    expect(steep.L).toBeCloseTo(
      5 * Math.sqrt(Math.pow(Math.PI * 988, 2) + 250 * 250),
      1,
    );
  });

  it("throws on invalid inputs", () => {
    expect(() => bsShapeLength("00", { A: 0, d: 12 })).toThrow();
    expect(() => bsShapeLength("77", { A: 1000, C: 0, d: 12 })).toThrow();
  });
});

describe("ACI SP-66/CRSI hook geometry (ACI 318-19 Tables 25.3.1/25.3.2)", () => {
  it("90-degree primary hook: 6db bend, 12db extension", () => {
    // db=22.2 (No.22): bend 133.2, extension 266.4
    const h = aciHookGeometry(22.2, "primary90");
    expect(h.insideBendDiameter).toBeCloseTo(133.2, 1);
    expect(h.straightExtension).toBeCloseTo(266.4, 1);
  });

  it("180-degree primary hook: greater of 4db and 65mm extension", () => {
    expect(aciHookGeometry(12.7, "primary180").straightExtension).toBe(65); // 4db=50.8 < 65
    expect(aciHookGeometry(25.4, "primary180").straightExtension).toBeCloseTo(
      101.6,
      1,
    );
  });

  it("stirrup hooks: 4db bend for small bars, greater of 6db and 75mm extension", () => {
    // db=12.7 (No.13): bend 50.8, ext max(76.2, 75) = 76.2
    const h = aciHookGeometry(12.7, "stirrup135");
    expect(h.insideBendDiameter).toBeCloseTo(50.8, 1);
    expect(h.straightExtension).toBeCloseTo(76.2, 1);
    // db=10: ext max(60,75) = 75
    expect(aciHookGeometry(10, "stirrup135").straightExtension).toBe(75);
    // No.19-25 stirrups: 6db bend
    expect(aciHookGeometry(19.1, "stirrup90").insideBendDiameter).toBeCloseTo(
      114.6,
      1,
    );
    expect(aciHookGeometry(19.1, "stirrup90").straightExtension).toBeCloseTo(
      229.2,
      1,
    ); // 12db
  });

  it("135-degree seismic hook: engages longitudinal reinforcement, 25.3.4", () => {
    const h = aciHookGeometry(12, "seismic135");
    expect(h.straightExtension).toBe(75); // max(72, 75)
    expect(h.clause).toContain("25.3.4");
    expect(h.notes.some((n) => n.includes("engage longitudinal"))).toBe(true);
  });
});

describe("ACI 318M-19 development and lap lengths (hand-verified)", () => {
  // No.22 bar, db=22.2, fy=420, fc=28: sqrt=5.2915
  const base = { db: 22.2, fy: 420, fc: 28 };

  it("tension ld, good case, No.22+: fy/(1.7*sqrt(fc')) * db", () => {
    const r = aciTensionDevelopment({ ...base, spacingCase: "good" });
    const expected = (420 / (1.7 * 1 * Math.sqrt(28))) * 22.2; // 1036.7
    expect(r.ld).toBeCloseTo(expected, 0);
    expect(r.ld).toBeGreaterThanOrEqual(300);
  });

  it("tension ld, other case, small bars (No.19-: /1.4)", () => {
    const r = aciTensionDevelopment({
      db: 15.9,
      fy: 420,
      fc: 28,
      spacingCase: "other",
    });
    const expected = (420 / (1.4 * Math.sqrt(28))) * 15.9; // 901.3
    expect(r.ld).toBeCloseTo(expected, 0);
  });

  it("applies psi_t=1.3 top-bar and the psi_t*psi_e <= 1.7 cap", () => {
    const top = aciTensionDevelopment({
      ...base,
      spacingCase: "good",
      castingPosition: "top",
    });
    expect(top.factors.psiT).toBe(1.3);
    const epoxyTop = aciTensionDevelopment({
      ...base,
      spacingCase: "good",
      castingPosition: "top",
      epoxy: "lowCover",
    });
    // 1.3 * 1.5 = 1.95 capped at 1.7
    const manual = (420 * 1.7 * 1 * 22.2) / (1.7 * Math.sqrt(28));
    expect(epoxyTop.ld).toBeCloseTo(manual, 0);
  });

  it("compression ldc = max(0.24fy/(lambda sqrt fc')db, 0.043fy db, 200)", () => {
    const r = aciCompressionDevelopment({ ...base });
    const a = (0.24 * 420 * 22.2) / Math.sqrt(28); // 422.4
    const b = 0.043 * 420 * 22.2; // 400.9
    expect(r.ld).toBeCloseTo(Math.max(a, b, 200), 0);
  });

  it("tension lap Class B = 1.3 ld (>= 300mm)", () => {
    const ld = aciTensionDevelopment({ ...base, spacingCase: "good" }).ld;
    expect(aciTensionLap({ ...base, spacingCase: "good" }).ls).toBeCloseTo(
      1.3 * ld,
      0,
    );
    expect(
      aciTensionLap({ ...base, spliceClass: "A", spacingCase: "good" }).ls,
    ).toBeCloseTo(ld, 0);
  });

  it("compression lap: fy<=420 -> 0.071 fy db; fc<21 adds one-third", () => {
    // 0.071*420*22.2 = 661.9
    expect(aciCompressionLap({ db: 22.2, fy: 420, fc: 28 }).ls).toBeCloseTo(
      662,
      0,
    );
    const lowFc = aciCompressionLap({ db: 22.2, fy: 420, fc: 20 });
    expect(lowFc.ls).toBeCloseTo(662 * (4 / 3), 0);
    // No.43 bars are not lap-splicable in compression
    expect(() => aciCompressionLap({ db: 43, fy: 420, fc: 28 })).toThrow();
  });
});

describe("EN 1992-1-1 anchorage and laps by bond condition", () => {
  // fck=30: fctk,0.05 = 0.21*30^(2/3) = 2.026; fctd = 1.351; fbd good = 3.039
  it("computes lb,rqd = (db/4)(sigma_sd/fbd) for good bond", () => {
    const r = ec2AnchorageLength({ db: 16, fck: 30 });
    expect(r.fbd).toBeCloseTo((2.25 * (0.21 * Math.pow(30, 2 / 3))) / 1.5, 3);
    const sigmaSd = 500 / 1.15;
    expect(r.lbRqd).toBeCloseTo((16 / 4) * (sigmaSd / r.fbd), 0);
    expect(r.lbd).toBeGreaterThanOrEqual(160); // 10 db
  });

  it("poor bond reduces fbd by eta1 = 0.7 (longer anchorage)", () => {
    const good = ec2AnchorageLength({ db: 16, fck: 30, bondCondition: "good" });
    const poor = ec2AnchorageLength({ db: 16, fck: 30, bondCondition: "poor" });
    expect(poor.fbd).toBeCloseTo(0.7 * good.fbd, 3);
    expect(poor.lbRqd).toBeCloseTo(good.lbRqd / 0.7, 0);
  });

  it("compression anchorage applies lb,min = max(10db, 0.6 lb,rqd)", () => {
    const r = ec2AnchorageLength({ db: 16, fck: 30, member: "compression" });
    expect(r.lbd).toBeGreaterThanOrEqual(0.6 * r.lbRqd);
  });

  it("lap length applies alpha6 = sqrt(percent/25) capped at 1.5", () => {
    const quarter = ec2LapLength({ db: 16, fck: 30, percentLapped: 25 });
    expect(quarter.alpha6).toBeCloseTo(1.0, 3);
    const half = ec2LapLength({ db: 16, fck: 30, percentLapped: 50 });
    expect(half.alpha6).toBeCloseTo(Math.sqrt(2), 3);
    const all = ec2LapLength({ db: 16, fck: 30, percentLapped: 100 });
    expect(all.alpha6).toBeCloseTo(1.5, 3); // sqrt(4)=2 capped at 1.5
    expect(all.l0).toBeGreaterThanOrEqual(240); // 15db
  });
});

describe("BVBS export", () => {
  const items: BbsItem[] = [
    {
      pos: "1",
      count: 24,
      dia: 12,
      steelGrade: "B500B",
      lengthMm: 1276,
      shapeCode: "11",
      dims: { A: 1000, B: 300 },
    },
    {
      pos: "2",
      count: 40,
      dia: 10,
      steelGrade: "B500B",
      lengthMm: 1570,
      shapeCode: "41",
      dims: { A: 650, B: 300, C: 400, D: 300 },
    },
  ];

  it("emits BVBS record lines with @-separated fields and the ~E001 end", () => {
    const file = generateBvbsFile(items, {
      projectName: "Site A",
      sender: "FRELUX",
    });
    const lines = file.split("\r\n");
    expect(lines[0].startsWith("~U001@")).toBe(true);
    expect(lines.some((l) => l.startsWith("~A001@"))).toBe(true);
    expect(lines.some((l) => l.startsWith("~B001@"))).toBe(true);
    const cLines = lines.filter((l) => l.startsWith("~C001@"));
    expect(cLines.length).toBe(2);
    expect(cLines[0]).toContain('"24"'); // count
    expect(cLines[0]).toContain('"12"'); // dia
    expect(cLines[0]).toContain('"1276"'); // length
    expect(cLines[0]).toContain('"11"'); // shape code
    expect(lines[lines.length - 2].startsWith("~E001@")).toBe(true);
    expect(file.endsWith("\r\n")).toBe(true);
  });

  it("carries every schedule position with consistent lengths", () => {
    const file = generateBvbsFile(items, {
      projectName: "Site A",
      sender: "FRELUX",
    });
    const cLines = file.split("\r\n").filter((l) => l.startsWith("~C001@"));
    expect(cLines[1]).toContain('"1570"');
    expect(cLines[1]).toContain('"41"');
  });

  it("throws on an empty schedule", () => {
    expect(() =>
      generateBvbsFile([], { projectName: "x", sender: "y" }),
    ).toThrow();
  });

  it("computes schedule mass from the BS 8666 bar mass table", () => {
    // 24 bars of 1276mm d12: 24 * 1.276 * 0.888 = 27.19 kg
    expect(bbsItemMassKg(items[0])).toBeCloseTo(27.19, 1);
  });
});
