// =========================================================
// EXTERNAL DRAINAGE CONFORMANCE (audit #31)
//
// Expectations are arithmetic by hand plus the self-cleansing gradients of
// BS EN 752 / BS 8000 practice (1 in 60 at 75 mm, 1 in 80 at 110 mm, 1 in 150
// at 160 mm, 1 in 200 at 200 mm, 1 in 250 at 250 mm, 1 in 315 at 315 mm).
//
// The engine is a material takeoff, not a hydraulic design, and says so. These
// tests pin the takeoff arithmetic and the gradient cautions, and they pin the
// disclosure so the "not a design" statement cannot quietly disappear.
// =========================================================
import { describe, expect, it } from "vitest";
import { calculateDrainageTakeoff } from "../drainage-standalone-engine";

describe("external drainage: run arithmetic", () => {
  it("computes total fall from length and gradient", () => {
    // 20 m at 10 mm/m = 200 mm of fall
    const r = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 20, pipeDiameterMm: 110, fallMmPerM: 10 }],
    });
    expect(r.runs[0].fallTotalMm).toBe(200);
    expect(r.totalPipeLengthM).toBe(20);
  });

  it("orders whole pipe lengths from the stock length", () => {
    // 20 m of run from 6 m lengths = 4 pieces (3 full + 1 cut)
    const r = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 20, pipeDiameterMm: 110, fallMmPerM: 12.5 }],
    });
    expect(r.runs[0].pipePieces).toBe(4);
    expect(r.pipeStockPieces).toBe(4);
  });

  it("sums several runs", () => {
    const r = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [
        { lengthM: 12, pipeDiameterMm: 110, fallMmPerM: 12.5 },
        { lengthM: 8, pipeDiameterMm: 110, fallMmPerM: 12.5 },
        { lengthM: 6, pipeDiameterMm: 110, fallMmPerM: 12.5 },
      ],
    });
    expect(r.totalPipeLengthM).toBe(26);
    expect(r.pipeStockPieces).toBe(2 + 2 + 1);
  });
});

describe("external drainage: self-cleansing gradient", () => {
  const cautionsFor = (diameterMm: number, fallMmPerM: number) =>
    calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 10, pipeDiameterMm: diameterMm, fallMmPerM }],
    }).cautions.join(" ");

  it("cautions a 110 mm run flatter than 1 in 80", () => {
    // 12.5 mm/m is 1 in 80; 10 mm/m is flatter, so it must be flagged.
    expect(cautionsFor(110, 10)).toMatch(/gradient|fall/i);
  });

  it("accepts a 110 mm run at exactly 1 in 80", () => {
    expect(cautionsFor(110, 12.5)).not.toMatch(/flatter|too shallow/i);
  });

  it("cautions a 75 mm run flatter than 1 in 60", () => {
    expect(cautionsFor(75, 10)).toMatch(/gradient|fall/i);
  });

  it("applies a minimum to a 200 mm run instead of skipping it", () => {
    // Regression: a 200 mm run used to fall through the lookup and a sewer at
    // 1 mm/m drew no caution at all. Its minimum is 1 in 200 (5.0 mm/m).
    expect(cautionsFor(200, 1)).toMatch(/gradient|fall/i);
    expect(cautionsFor(200, 5)).not.toMatch(/flatter|too shallow/i);
  });

  it("applies the largest tabulated minimum above 315 mm", () => {
    expect(cautionsFor(400, 1)).toMatch(/gradient|fall/i);
  });
});

describe("external drainage: volumes and disclosure", () => {
  it("derives bedding and excavation volumes for a measured run", () => {
    const r = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 20, pipeDiameterMm: 110, fallMmPerM: 12.5 }],
    });
    expect(r.beddingVolumeM3).toBeGreaterThan(0);
    expect(r.excavationVolumeM3).toBeGreaterThan(r.beddingVolumeM3);
  });

  it("states plainly that it is not a hydraulic design", () => {
    const r = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 20, pipeDiameterMm: 110, fallMmPerM: 12.5 }],
    });
    expect(r.cautions.join(" ")).toMatch(
      /require project-specific hydraulic and local-code design/,
    );
  });

  it("does not invent a market", () => {
    const r = calculateDrainageTakeoff({ marketCode: "" });
    expect(r.marketCode).toBe("UNSPECIFIED");
  });
});
