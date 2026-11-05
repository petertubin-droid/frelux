import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOIL_BEARING_KPA,
  MAX_PIER_SLENDERNESS,
  calculateTankStand,
} from "./tank-stand";

const base = {
  market: "NG",
  capacityLitres: 5000,
  standHeightM: 6,
  structure: "blockwork" as const,
};

describe("tank stand engine", () => {
  it("counts a litre of water as a kilogram", () => {
    const { result, errors } = calculateTankStand(base);
    expect(errors).toEqual([]);
    expect(result!.loads.waterKg).toBe(5000);
    expect(result!.loads.tankTareKg).toBe(75);
    expect(result!.loads.totalKg).toBeGreaterThan(5000);
  });

  it("builds the stand in whole courses of the local block", () => {
    const { result } = calculateTankStand(base);
    expect(result!.blockwork!.courseHeightM).toBeCloseTo(0.235, 3);
    expect(result!.blockwork!.courses).toBe(Math.ceil(6 / 0.235));
    expect(result!.standHeightM).toBeCloseTo(
      result!.blockwork!.courses * 0.235,
      2,
    );
  });

  it("counts one block per course per pier", () => {
    const { result } = calculateTankStand(base);
    expect(result!.blockwork!.blocksPerLeg).toBe(result!.blockwork!.courses);
    expect(result!.blockwork!.blocksTotal).toBe(
      result!.blockwork!.courses * result!.legs,
    );
  });

  it("returns mortar, cement and sand for the piers", () => {
    const { result } = calculateTankStand(base);
    const b = result!.blockwork!;
    expect(b.mortarWetM3).toBeGreaterThan(0);
    expect(b.mortarDryM3).toBeCloseTo(b.mortarWetM3 * 1.33, 2);
    expect(b.cementBags).toBeGreaterThan(0);
    expect(b.sandM3).toBeGreaterThan(b.cementM3);
    expect(b.bagKg).toBe(50);
  });

  it("sizes footing pads to stay within the allowable bearing", () => {
    const { result } = calculateTankStand(base);
    expect(result!.bearing.soilBearingKpa).toBe(DEFAULT_SOIL_BEARING_KPA);
    expect(result!.bearing.utilisationPercent).toBeLessThanOrEqual(100);
    expect(result!.concrete!.padSideM).toBeGreaterThan(0);
    const sideTimes20 = result!.concrete!.padSideM * 20;
    expect(Math.abs(sideTimes20 - Math.round(sideTimes20))).toBeLessThan(1e-9);
    expect(result!.concrete!.footingConcreteM3).toBeGreaterThan(0);
  });

  it("warns when a stand is too slender for unreinforced piers", () => {
    const tall = calculateTankStand({ ...base, standHeightM: 9 });
    const slender = tall.result!.checks.find((c) => c.id === "slenderness")!;
    expect(slender.status).toBe("warn");
    expect(9 / 0.225).toBeGreaterThan(MAX_PIER_SLENDERNESS);

    const low = calculateTankStand({ ...base, standHeightM: 2.4 });
    expect(low.result!.checks.find((c) => c.id === "slenderness")!.status).toBe(
      "ok",
    );
  });

  it("fails the bearing check when the pads cannot be built wide enough", () => {
    const poor = calculateTankStand({ ...base, soilBearingKpa: 20 });
    const bearing = poor.result!.checks.find((c) => c.id === "bearing")!;
    expect(["warn", "fail"]).toContain(bearing.status);
  });

  it("says plainly when the bearing figure is only an assumption", () => {
    const assumed = calculateTankStand(base).result!;
    expect(assumed.bearing.soilBearingTested).toBe(false);
    expect(assumed.checks.find((c) => c.id === "bearing")!.detail).toMatch(
      /soil test/i,
    );

    const tested = calculateTankStand({
      ...base,
      soilBearingTested: true,
    }).result!;
    expect(tested.bearing.soilBearingTested).toBe(true);
  });

  it("adds a larger tank load than a smaller one", () => {
    const small = calculateTankStand({ ...base, capacityLitres: 1000 }).result!;
    const big = calculateTankStand({ ...base, capacityLitres: 10000 }).result!;
    expect(big.loads.totalKg).toBeGreaterThan(small.loads.totalKg);
    expect(big.concrete!.padSideM).toBeGreaterThanOrEqual(
      small.concrete!.padSideM,
    );
  });

  it("quotes a steel stand in sections, plates and bolts", () => {
    const steel = calculateTankStand({
      ...base,
      structure: "steel",
    }).result!;
    expect(steel.blockwork).toBeNull();
    expect(steel.steel!.legLengthM).toBeCloseTo(4 * steel.standHeightM, 1);
    expect(steel.steel!.anchorBoltCount).toBe(16);
    expect(steel.loads.standSelfWeightKg).toBeGreaterThan(0);
  });

  it("quotes reinforced concrete columns without blockwork", () => {
    const rc = calculateTankStand({
      ...base,
      structure: "reinforced_concrete",
    }).result!;
    expect(rc.blockwork).toBeNull();
    expect(rc.loads.standSelfWeightKg).toBeGreaterThan(0);
  });

  it("returns professional errors instead of guessing the stand", () => {
    const noCapacity = calculateTankStand({ ...base, capacityLitres: 0 });
    expect(noCapacity.result).toBeNull();
    expect(noCapacity.errors.length).toBe(1);

    const twoPiers = calculateTankStand({ ...base, legs: 2 });
    expect(twoPiers.result).toBeNull();
    expect(twoPiers.errors[0]).toMatch(/three piers/i);
  });

  it("is deterministic and carries no prices", () => {
    const a = calculateTankStand(base).result!;
    const b = calculateTankStand(base).result!;
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toMatch(/ngn|₦|usd|\$/i);
    expect(a.assumptions.join(" ")).toMatch(/Prices, tax and labour/i);
  });
});
