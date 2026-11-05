import { describe, expect, it } from "vitest";
import {
  CODE_MAX_SLENDERNESS,
  DEFAULT_SOIL_BEARING_KPA,
  marketWindSpeedMs,
  MAX_PIER_SLENDERNESS,
  STEEL_LEG_SECTIONS,
  calculateTankStand,
  tankDimensions,
  tankStandBoqItems,
  windPressurePa,
} from "./tank-stand";

const base = {
  market: "NG",
  capacityLitres: 5000,
  standHeightM: 6,
  structure: "blockwork" as const,
};

describe("tank stand engine", () => {
  it("treats a litre of water as a kilogram and gives the tank a size", () => {
    const { result, errors } = calculateTankStand(base);
    expect(errors).toEqual([]);
    expect(result!.loads.waterKg).toBe(5000);
    expect(result!.loads.tankTareKg).toBe(75);
    expect(result!.tank.diameterM).toBeGreaterThan(1.5);
    expect(result!.tank.diameterM).toBeCloseTo(result!.tank.heightM, 2);
    expect(result!.tank.usGal).toBe(1321);
    expect(result!.tank.ukGal).toBe(1100);
  });

  it("sizes a tank from its volume not from a guess", () => {
    const five = tankDimensions(5000);
    const ten = tankDimensions(10000);
    expect(five.volumeM3).toBeCloseTo(5, 5);
    expect(ten.diameterM).toBeGreaterThan(five.diameterM);
    // A 5 m³ cylinder with equal height and diameter is about 1.86 m across.
    expect(five.diameterM).toBeCloseTo(Math.cbrt(20 / Math.PI), 3);
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

  it("counts one block per course per pier and mortar by joint volume", () => {
    const { result } = calculateTankStand(base);
    const b = result!.blockwork!;
    expect(b.pierWidthM).toBe(0.45);
    expect(b.pierThicknessM).toBe(0.225);
    expect(b.blocksTotal).toBe(b.courses * result!.legs);
    // Bed joint only: 450 x 225 mm of face at a 10 mm joint, plus a 10 percent allowance.
    const perCourseBed = 0.45 * 0.225 * 0.01;
    expect(b.bedJointM3PerCourse).toBeCloseTo(perCourseBed, 4);
    expect(b.mortarWetM3).toBeCloseTo(
      perCourseBed * b.courses * result!.legs * 1.1,
      2,
    );
    expect(b.mortarDryM3).toBeCloseTo(b.mortarWetM3 * 1.33, 2);
    expect(b.cementBags).toBeGreaterThan(0);
    expect(b.bagKg).toBe(50);
  });

  it("includes render, which the blockwork needs to weather", () => {
    const { result } = calculateTankStand(base);
    const b = result!.blockwork!;
    expect(b.renderAreaM2).toBeCloseTo(
      2 * (0.45 + 0.225) * result!.standHeightM * result!.legs,
      1,
    );
    expect(b.renderCementBags).toBeGreaterThan(0);
    expect(b.renderSandM3).toBeGreaterThan(0);
  });

  it("puts the tank on a ring beam and deck, not straight on the piers", () => {
    const { result } = calculateTankStand(base);
    const p = result!.platform;
    expect(p.planWidthM).toBeGreaterThan(result!.tank.diameterM);
    expect(p.ringBeamConcreteM3).toBeGreaterThan(0);
    expect(p.ringBeamRebarKg).toBeGreaterThan(0);
    expect(p.ringBeamFormworkM2).toBeGreaterThan(0);
    expect(p.deckSlabM3).toBeGreaterThan(0);
    expect(result!.loads.platformKg).toBeGreaterThan(0);
  });

  it("sizes footing pads with their own weight carried", () => {
    const { result } = calculateTankStand(base);
    expect(result!.bearing.soilBearingKpa).toBe(DEFAULT_SOIL_BEARING_KPA);
    expect(result!.bearing.utilisationPercent).toBeLessThanOrEqual(100);
    expect(result!.concrete!.padLoadKn).toBeGreaterThan(result!.loads.perLegKn);
    expect(result!.concrete!.padSideM).toBeGreaterThanOrEqual(0.6);
    const side = result!.concrete!.padSideM * 20;
    expect(Math.abs(side - Math.round(side))).toBeLessThan(1e-9);
  });

  it("checks the stress in the blockwork", () => {
    const { result } = calculateTankStand(base);
    const pier = result!.checks.find((c) => c.id === "pier-stress")!;
    expect(pier).toBeDefined();
    expect(result!.blockwork!.pierStressMpa).toBeGreaterThan(0);
    expect(pier.detail).toMatch(/N\/mm/);

    const huge = calculateTankStand({
      ...base,
      capacityLitres: 40000,
      legs: 3,
    });
    expect(
      ["warn", "fail"].includes(
        huge.result!.checks.find((c) => c.id === "pier-stress")!.status,
      ),
    ).toBe(true);
  });

  it("holds a freestanding pier to half the code slenderness limit", () => {
    const tall = calculateTankStand({ ...base, standHeightM: 4 });
    expect(
      tall.result!.checks.find((c) => c.id === "slenderness")!.status,
    ).toBe("warn");
    expect(4 / 0.225).toBeGreaterThan(MAX_PIER_SLENDERNESS);
    expect(4 / 0.225).toBeLessThan(CODE_MAX_SLENDERNESS);

    const tooTall = calculateTankStand({ ...base, standHeightM: 9 });
    expect(
      tooTall.result!.checks.find((c) => c.id === "slenderness")!.status,
    ).toBe("fail");
    expect(9 / 0.225).toBeGreaterThan(CODE_MAX_SLENDERNESS);

    const low = calculateTankStand({ ...base, standHeightM: 2.4 });
    expect(low.result!.checks.find((c) => c.id === "slenderness")!.status).toBe(
      "ok",
    );
  });

  it("takes a presumed bearing value from the ground type", () => {
    const sand = calculateTankStand({
      ...base,
      soilType: "dense_sand",
    }).result!;
    expect(sand.bearing.soilBearingKpa).toBe(200);
    expect(sand.checks.find((c) => c.id === "bearing")!.detail).toMatch(
      /dense sand/i,
    );

    const fill = calculateTankStand({
      ...base,
      soilType: "made_ground",
    }).result!;
    expect(fill.bearing.soilBearingKpa).toBe(50);
    expect(fill.concrete!.padSideM).toBeGreaterThan(sand.concrete!.padSideM);

    const tested = calculateTankStand({
      ...base,
      soilType: "soft_clay",
      soilBearingKpa: 300,
      soilBearingTested: true,
    }).result!;
    expect(tested.bearing.soilBearingKpa).toBe(300);
  });

  it("uses the wind speed of the market it is built in", () => {
    expect(marketWindSpeedMs("NG")).toBe(30);
    expect(marketWindSpeedMs("US")).toBeGreaterThan(marketWindSpeedMs("GB"));
    expect(marketWindSpeedMs("us")).toBe(45);
    expect(marketWindSpeedMs("ZZ")).toBe(30);

    const lagos = calculateTankStand({ ...base, marketCode: "NG" }).result!;
    const houston = calculateTankStand({ ...base, marketCode: "US" }).result!;
    expect(houston.stability.windSpeedMs).toBeGreaterThan(
      lagos.stability.windSpeedMs,
    );
    expect(houston.stability.overturningMomentKnm).toBeGreaterThan(
      lagos.stability.overturningMomentKnm,
    );
  });

  it("checks the gravity head the stand actually delivers", () => {
    const low = calculateTankStand({ ...base, standHeightM: 2 }).result!;
    expect(low.checks.find((c) => c.id === "gravity-head")!.status).not.toBe(
      "ok",
    );

    const normal = calculateTankStand({ ...base, standHeightM: 6 }).result!;
    const head = normal.checks.find((c) => c.id === "gravity-head")!;
    expect(head.status).toBe("ok");
    expect(head.detail).toMatch(/bar/);
  });

  it("quotes a way up to the tank and a rail to work behind", () => {
    const { result } = calculateTankStand(base);
    const ladder = result!.boq.find(
      (line) => line.item === "Stand access ladder",
    );
    const rail = result!.boq.find(
      (line) => line.item === "Platform guard rail",
    );
    expect(ladder!.quantity).toBeCloseTo(result!.standHeightM, 1);
    expect(rail!.quantity).toBeCloseTo(4 * result!.platform.planWidthM, 1);

    const kneeHigh = calculateTankStand({ ...base, standHeightM: 2 }).result!;
    expect(
      kneeHigh.boq.find((line) => line.item === "Stand access ladder"),
    ).toBeUndefined();
  });

  it("checks the stand against wind with the tank empty", () => {
    const { result } = calculateTankStand(base);
    expect(result!.stability.windPressurePa).toBe(
      Math.round(windPressurePa(30)),
    );
    expect(result!.stability.emptyStandKg).toBeLessThan(result!.loads.totalKg);
    expect(result!.stability.resistingMomentKnm).toBeGreaterThan(0);
    expect(result!.stability.factorOfSafety).toBeGreaterThan(0);
    expect(result!.checks.find((c) => c.id === "overturning")!.detail).toMatch(
      /factor of 1.5/,
    );
  });

  it("fails overturning for a tall slender stand in a windy site", () => {
    const exposed = calculateTankStand({
      ...base,
      capacityLitres: 20000,
      standHeightM: 10,
      legs: 3,
      windSpeedMs: 45,
    });
    const check = exposed.result!.checks.find((c) => c.id === "overturning")!;
    expect(check.status).not.toBe("ok");
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
      soilBearingKpa: 200,
    }).result!;
    expect(tested.bearing.soilBearingTested).toBe(true);
    expect(tested.bearing.utilisationPercent).toBeLessThan(
      assumed.bearing.utilisationPercent,
    );
  });

  it("quotes a steel stand with a section chosen from the leg load", () => {
    const steel = calculateTankStand({ ...base, structure: "steel" }).result!;
    expect(steel.blockwork).toBeNull();
    expect(steel.steel!.legSection.length).toBeGreaterThan(0);
    expect(steel.steel!.anchorBoltCount).toBe(16);
    expect(steel.steel!.steelMassKg).toBeGreaterThan(0);
    expect(steel.platform.deckSlabM3).toBe(0);
    expect(steel.platform.steelGrillageKg).toBeGreaterThan(0);

    const heavy = calculateTankStand({
      ...base,
      structure: "steel",
      capacityLitres: 30000,
      legs: 4,
    }).result!;
    const light = steel;
    expect(heavy.steel!.sectionMassKgPerM).toBeGreaterThanOrEqual(
      light.steel!.sectionMassKgPerM,
    );
    expect(STEEL_LEG_SECTIONS.length).toBeGreaterThan(3);
  });

  it("quotes reinforced concrete columns with rebar and formwork", () => {
    const rc = calculateTankStand({
      ...base,
      structure: "reinforced_concrete",
    }).result!;
    expect(rc.blockwork).toBeNull();
    expect(rc.concrete!.columnConcreteM3).toBeGreaterThan(0);
    expect(rc.concrete!.columnRebarKg).toBeGreaterThan(0);
    expect(rc.concrete!.columnFormworkM2).toBeGreaterThan(0);
  });

  it("carries no prices in the bill of quantities", () => {
    const { result } = calculateTankStand(base);
    const lines = result!.boq;
    expect(lines.length).toBeGreaterThan(6);
    for (const line of lines) {
      expect(line.quantity).toBeGreaterThan(0);
      expect(line.unit.length).toBeGreaterThan(0);
      expect(line.specification.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(lines)).not.toMatch(/ngn|₦|usd|\$|price:/i);
    const merged = tankStandBoqItems(result!);
    expect(
      merged.every(
        (item) => item.category === "Storage Tank & Tower Buffering",
      ),
    ).toBe(true);
  });

  it("returns professional errors instead of guessing the stand", () => {
    expect(
      calculateTankStand({ ...base, capacityLitres: 0 }).result,
    ).toBeNull();
    expect(calculateTankStand({ ...base, legs: 2 }).errors[0]).toMatch(
      /three piers/i,
    );
    expect(
      calculateTankStand({ ...base, structure: "steel", legs: 3 }).errors[0],
    ).toMatch(/even number of legs/i);
  });

  it("is deterministic and carries no prices", () => {
    const a = calculateTankStand(base).result!;
    const b = calculateTankStand(base).result!;
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toMatch(/ngn|₦|usd|\$/i);
    expect(a.assumptions.join(" ")).toMatch(/Prices, tax and labour/i);
  });
});
