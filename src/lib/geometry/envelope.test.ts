import { describe, it, expect } from "vitest";
import {
  buildEnvelope,
  reconcileDimension,
  type ElevationMeasurement,
} from "./envelope";

function views(overrides: Partial<ElevationMeasurement>[] = []) {
  const base: ElevationMeasurement[] = [
    { view: "front", widthMm: 10000, eaveHeightMm: 3000 },
    { view: "back", widthMm: 10000, eaveHeightMm: 3000 },
    { view: "left", widthMm: 8000, eaveHeightMm: 3000, roofRiseMm: 2000 },
    { view: "right", widthMm: 8000, eaveHeightMm: 3000, roofRiseMm: 2000 },
  ];
  return base.map((v, i) => ({ ...v, ...(overrides[i] ?? {}) }));
}

function envelopeOf(overrides: Partial<ElevationMeasurement>[] = []) {
  const outcome = buildEnvelope(views(overrides));
  if (!outcome.ok) throw new Error(outcome.errors.join("; "));
  return outcome.envelope;
}

describe("reconcileDimension", () => {
  it("averages the two views and records the gap", () => {
    const check = reconcileDimension("width", 12040, 11920, 2);
    expect(check.reconciledMm).toBeCloseTo(11980, 6);
    expect(check.differenceMm).toBeCloseTo(120, 6);
    expect(check.differencePct).toBeCloseTo(1.002, 3);
    expect(check.withinTolerance).toBe(true);
  });

  it("flags a gap beyond the stated tolerance", () => {
    const check = reconcileDimension("depth", 8000, 7000, 2);
    expect(check.withinTolerance).toBe(false);
    expect(check.differencePct).toBeCloseTo(13.333, 3);
  });
});

describe("buildEnvelope", () => {
  it("computes footprint, perimeter and wall areas from four elevations", () => {
    const envelope = envelopeOf();
    expect(envelope.widthMm).toBeCloseTo(10000, 6);
    expect(envelope.depthMm).toBeCloseTo(8000, 6);
    expect(envelope.footprintAreaM2).toBeCloseTo(80, 6);
    expect(envelope.perimeterM).toBeCloseTo(36, 6);
    // Front 30 + back 30 + left 24 + right 24.
    expect(envelope.grossWallAreaM2).toBeCloseTo(108, 6);
    expect(envelope.netWallAreaM2).toBeCloseTo(108, 6);
  });

  it("turns a 2 m rise over a 4 m run into a 26.57 degree pitch", () => {
    const envelope = envelopeOf();
    expect(envelope.roofRiseMm).toBeCloseTo(2000, 6);
    expect(envelope.roofPitchDeg).toBeCloseTo(26.57, 2);
    // cos(26.565°) = 0.894427, so 80 m² becomes 89.443 m² of slope.
    expect(envelope.trueRoofAreaM2).toBeCloseTo(89.443, 3);
    expect(envelope.roofSlopeFactor).toBeCloseTo(1.118034, 5);
  });

  it("subtracts openings per elevation and in total", () => {
    const envelope = envelopeOf([
      {
        view: "front",
        widthMm: 10000,
        eaveHeightMm: 3000,
        openings: [
          { kind: "door", widthMm: 900, heightMm: 2100 },
          { kind: "window", widthMm: 1200, heightMm: 1200, count: 2 },
        ],
      },
    ]);
    expect(envelope.openingAreaM2).toBeCloseTo(4.77, 3);
    const front = envelope.views.find((v) => v.view === "front")!;
    expect(front.openingAreaM2).toBeCloseTo(4.77, 3);
    expect(front.netWallAreaM2).toBeCloseTo(25.23, 3);
    expect(front.openingCount).toBe(3);
    expect(envelope.netWallAreaM2).toBeCloseTo(103.23, 3);
  });

  it("averages a perspective mismatch and says so in the audit", () => {
    const envelope = envelopeOf([
      { view: "front", widthMm: 12040, eaveHeightMm: 3000 },
      { view: "back", widthMm: 11920, eaveHeightMm: 3000 },
    ]);
    expect(envelope.widthMm).toBeCloseTo(11980, 6);
    expect(envelope.warnings.some((w) => /differ by/i.test(w))).toBe(false);
    expect(envelope.audit.some((a) => /reconciled to 11980/.test(a))).toBe(
      true,
    );
  });

  it("warns when the two views disagree beyond the tolerance", () => {
    const envelope = envelopeOf([
      { view: "front", widthMm: 12000, eaveHeightMm: 3000 },
      { view: "back", widthMm: 9000, eaveHeightMm: 3000 },
    ]);
    expect(envelope.checks[0].withinTolerance).toBe(false);
    expect(
      envelope.warnings.some((w) => /beyond the 2% photo tolerance/i.test(w)),
    ).toBe(true);
  });

  it("reports a flat roof, with a warning, when no rise was measured", () => {
    // Overrides are index-aligned with the four views, so the rise is cleared
    // on the left and right elevations only.
    const envelope = envelopeOf([
      {},
      {},
      { roofRiseMm: null },
      { roofRiseMm: null },
    ]);
    expect(envelope.roofRiseMm).toBeNull();
    expect(envelope.roofPitchDeg).toBe(0);
    expect(envelope.trueRoofAreaM2).toBeCloseTo(80, 6);
    expect(envelope.warnings.some((w) => /flat/i.test(w))).toBe(true);
  });

  it("warns when openings exceed the wall they are cut into", () => {
    const envelope = envelopeOf([
      {
        view: "front",
        widthMm: 1000,
        eaveHeightMm: 1000,
        openings: [{ kind: "door", widthMm: 2000, heightMm: 2000 }],
      },
    ]);
    const front = envelope.views.find((v) => v.view === "front")!;
    expect(front.netWallAreaM2).toBe(0);
    expect(envelope.warnings.some((w) => /exceed the wall/i.test(w))).toBe(
      true,
    );
  });

  it("refuses an incomplete set of views", () => {
    const outcome = buildEnvelope(views().slice(0, 3));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.errors.join(" ")).toMatch(/Right is not measured/);
    }
  });

  it("refuses non-positive dimensions and names the view", () => {
    const outcome = buildEnvelope(
      views([{ view: "front", widthMm: 0, eaveHeightMm: 3000 }]),
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.errors.join(" ")).toMatch(/Front width must be positive/);
    }
  });

  it("refuses the same view measured twice", () => {
    const duplicated = [...views(), views()[0]];
    const outcome = buildEnvelope(duplicated);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.errors.join(" ")).toMatch(/Front is measured twice/);
    }
  });

  it("keeps an audit trail for every derived number", () => {
    const envelope = envelopeOf();
    expect(envelope.audit.length).toBeGreaterThanOrEqual(8);
    expect(envelope.audit.some((a) => /pitch of 26.57/.test(a))).toBe(true);
    expect(envelope.audit.some((a) => /perimeter 36/.test(a))).toBe(true);
  });
});
