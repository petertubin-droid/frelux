import { describe, it, expect } from "vitest";
import {
  calculateBoreholeWaterSystem,
  calculateHazenWilliamsFrictionHead,
  BoreholeSystemInputs,
} from "../borehole-water-system-engine";

describe("Borehole & Autonomous Water Supply System Engine", () => {
  const defaultInputs: BoreholeSystemInputs = {
    drillingDepthMeters: 60,
    staticWaterLevelMeters: 18,
    expectedYieldM3PerHour: 2.5,
    householdOccupants: 6,
    consumptionTier: "suburban_standard",
    tankElevationMeters: 6,
    surfaceElevationMeters: 6,
    horizontalRunMeters: 15,
    buriedDeliveryRunMeters: 25,
    powerSupply: "single_phase_220v",
    marketCode: "NG",
  };

  it("calculates a complete balanced system for typical residential borehole", () => {
    const result = calculateBoreholeWaterSystem(defaultInputs);

    // Verify well dimensions and casing
    expect(result.well.totalDepthMeters).toBe(60);
    expect(result.well.plainCasingMeters + result.well.screenMeters).toBe(60);
    expect(result.well.screenMeters).toBeGreaterThanOrEqual(6);
    expect(result.well.sanitaryGroutDepthMeters).toBeGreaterThanOrEqual(6);
    expect(result.well.sanitaryGroutCementBags50kg).toBeGreaterThan(0);
    expect(result.well.gravelPackBags25kg).toBeGreaterThan(0);
    expect(result.well.strataProfile.length).toBe(4);

    // Verify hydraulics
    expect(result.pumping.dynamicWaterLevelMeters).toBeGreaterThan(defaultInputs.staticWaterLevelMeters);
    expect(result.pumping.pumpSettingDepthMeters).toBeGreaterThan(result.pumping.dynamicWaterLevelMeters);
    expect(result.pumping.totalDynamicHeadMeters).toBeGreaterThan(result.pumping.pumpSettingDepthMeters);
    expect(result.pumping.recommendedMotorHp).toBeGreaterThanOrEqual(0.75);
    expect(result.pumping.checkValves.length).toBeGreaterThanOrEqual(1);
    expect(result.pumping.submersibleCableMm2).toBeGreaterThanOrEqual(1.5);
    expect(result.pumping.voltageDropPercent).toBeLessThanOrEqual(3.0);

    // Verify storage & peak rush buffer
    expect(result.storage.dailyTotalDemandLiters).toBe(6 * 150); // 900 L/d
    expect(result.storage.peakRushDemandLitersPerHour).toBeGreaterThan(result.storage.dailyTotalDemandLiters / 24);
    expect(result.storage.commercialTankSizeLiters).toBeGreaterThanOrEqual(1000);
    expect(result.storage.overflowPipeDiameterMm).toBeGreaterThan(result.pumping.riserPipeDiameterMm);

    // Verify hydrostatic gravity pressure
    expect(result.distribution.groundHydrostaticPressureBar).toBeCloseTo(0.59, 1);
    expect(result.distribution.groundHydrostaticPressurePsi).toBeCloseTo(8.6, 1);

    // Verify installation steps
    expect(result.installationSteps.length).toBe(7);
    expect(result.installationSteps[0].id).toBe("drilling-aquifer");
    expect(result.installationSteps[1].id).toBe("casing-screen-grout");
    expect(result.installationSteps[2].id).toBe("submersible-pump-valve");
    expect(result.installationSteps[3].id).toBe("water-quality-treatment");
    expect(result.installationSteps[4].id).toBe("tower-storage-buffering");
    expect(result.installationSteps[5].id).toBe("automation-level-sensors");
    expect(result.installationSteps[6].id).toBe("buried-trench-reticulation");

    // Verify BOQ completeness
    expect(result.billOfQuantities.length).toBeGreaterThan(15);
    const categories = new Set(result.billOfQuantities.map((item) => item.category));
    expect(categories.size).toBe(6);
  });

  it("handles Hazen-Williams friction calculation correctly", () => {
    // 50m pipe, 2.5 m3/h, 27mm ID, C=140
    const hf = calculateHazenWilliamsFrictionHead(50, 2.5, 27, 140);
    expect(hf).toBeGreaterThan(2);
    expect(hf).toBeLessThan(6);

    // Zero length or flow gives 0
    expect(calculateHazenWilliamsFrictionHead(0, 2.5, 27)).toBe(0);
    expect(calculateHazenWilliamsFrictionHead(50, 0, 27)).toBe(0);
  });

  it("triggers iron and manganese catalytic filtration when thresholds are exceeded", () => {
    const highIronInputs: BoreholeSystemInputs = {
      ...defaultInputs,
      waterQuality: {
        ironMgL: 1.2, // > 0.3
        manganeseMgL: 0.25, // > 0.1
        turbidityNtu: 8,
      },
    };

    const res = calculateBoreholeWaterSystem(highIronInputs);
    expect(res.treatment.ironAlert).toBe(true);
    expect(res.treatment.manganeseAlert).toBe(true);
    expect(res.treatment.isPotableWithoutTreatment).toBe(false);

    const ironStage = res.treatment.stages.find((s) => s.id === "stage-2-iron");
    expect(ironStage).toBeDefined();
    expect(ironStage?.recommended).toBe(true);
  });

  it("triggers water softening ion-exchange when hardness is high", () => {
    const hardWaterInputs: BoreholeSystemInputs = {
      ...defaultInputs,
      waterQuality: {
        hardnessMgL: 280, // Very hard water > 120
        ironMgL: 0.1,
        manganeseMgL: 0.02,
      },
    };

    const res = calculateBoreholeWaterSystem(hardWaterInputs);
    expect(res.treatment.hardnessAlert).toBe(true);
    const softenerStage = res.treatment.stages.find((s) => s.id === "stage-2-softener");
    expect(softenerStage).toBeDefined();
    expect(softenerStage?.recommended).toBe(true);
  });

  it("adds intermediate check valves for deep borehole pumping head", () => {
    const deepInputs: BoreholeSystemInputs = {
      ...defaultInputs,
      drillingDepthMeters: 140,
      staticWaterLevelMeters: 55,
      expectedYieldM3PerHour: 3.5,
    };

    const res = calculateBoreholeWaterSystem(deepInputs);
    expect(res.pumping.checkValves.length).toBeGreaterThanOrEqual(2);
    expect(res.pumping.checkValves[1].locationMetersFromPump).toBeGreaterThan(0);
  });

  it("validates input boundary ranges and throws clear errors", () => {
    expect(() =>
      calculateBoreholeWaterSystem({
        ...defaultInputs,
        drillingDepthMeters: 5, // < 10m
      }),
    ).toThrowError(/at least 10 meters/);

    expect(() =>
      calculateBoreholeWaterSystem({
        ...defaultInputs,
        staticWaterLevelMeters: 80, // > depth 60
      }),
    ).toThrowError(/Static water level/);

    expect(() =>
      calculateBoreholeWaterSystem({
        ...defaultInputs,
        householdOccupants: 0,
      }),
    ).toThrowError(/Household occupants/);
  });

  it("supports imperial units and US standards cleanly", () => {
    const usInputs: BoreholeSystemInputs = {
      ...defaultInputs,
      marketCode: "US",
      unitSystem: "imperial",
      powerSupply: "single_phase_110v",
    };

    const res = calculateBoreholeWaterSystem(usInputs);
    expect(res.inputs.unitSystem).toBe("imperial");
    expect(res.pumping.totalDynamicHeadFeet).toBeGreaterThan(100);
    expect(res.pumping.designFlowRateGpm).toBeGreaterThan(10);
    expect(res.storage.commercialTankSizeUsGal).toBeGreaterThan(250);
  });
});
