/**
 * Borehole pumping conformance (services audit 4).
 *
 * The friction function already has a worked-example suite. What was never
 * verified is how those losses assemble into a total dynamic head, and what
 * the pump and motor figures do with it. Expectations are computed by hand
 * from the hydraulics, not read back from the engine.
 */
import { describe, expect, it } from "vitest";
import {
  calculateBoreholeWaterSystem,
  calculateHazenWilliamsFrictionHead,
} from "./borehole-water-system-engine";

const base = {
  drillingDepthMeters: 80,
  staticWaterLevelMeters: 20,
  expectedYieldM3PerHour: 2,
  householdOccupants: 6,
  surfaceElevationMeters: 6,
  horizontalRunMeters: 20,
} as never;

describe("total dynamic head", () => {
  it("is the sum of lift, riser, surface, fittings and residual", () => {
    const p = calculateBoreholeWaterSystem(base).pumping;
    const rebuilt =
      p.staticLiftMeters +
      p.riserFrictionLossMeters +
      p.surfaceFrictionLossMeters +
      p.fittingsLossMeters +
      p.residualPressureHeadMeters;
    expect(rebuilt).toBeCloseTo(p.totalDynamicHeadMeters, 1);
  });

  it("carries the 0.5 bar residual as 5.1 m of head", () => {
    const p = calculateBoreholeWaterSystem(base).pumping;
    expect(p.residualPressureHeadMeters).toBeCloseTo(5.1, 1);
  });

  it("prices riser friction from the pump setting, not the drill depth", () => {
    const p = calculateBoreholeWaterSystem(base).pumping;
    const fromSetting = calculateHazenWilliamsFrictionHead(
      p.pumpSettingDepthMeters,
      p.designFlowRateM3PerHour,
      p.riserPipeDiameterMm === 40 ? 35 : 27,
      140,
    );
    expect(p.riserFrictionLossMeters).toBeCloseTo(fromSetting, 2);
  });

  it("converts head to feet at 3.28084", () => {
    const p = calculateBoreholeWaterSystem(base).pumping;
    expect(p.totalDynamicHeadFeet).toBeCloseTo(
      p.totalDynamicHeadMeters * 3.28084,
      1,
    );
  });
});

describe("pump power", () => {
  it("matches rho g Q H over 1000", () => {
    const p = calculateBoreholeWaterSystem(base).pumping;
    const q = p.designFlowRateM3PerHour / 3600;
    const expected = (1000 * 9.80665 * q * p.totalDynamicHeadMeters) / 1000;
    expect(p.hydraulicPowerKw).toBeCloseTo(expected, 2);
  });

  it("divides by pump and motor efficiency, then converts to HP", () => {
    const p = calculateBoreholeWaterSystem(base).pumping;
    const electrical = p.hydraulicPowerKw / (0.62 * 0.82);
    expect(p.motorElectricalPowerKw).toBeCloseTo(electrical, 1);
    expect(p.motorHorsepowerHp).toBeCloseTo(electrical * 1.34102, 1);
  });

  it("never recommends a motor below the calculated duty", () => {
    const p = calculateBoreholeWaterSystem(base).pumping;
    expect(p.recommendedMotorHp).toBeGreaterThanOrEqual(
      p.motorHorsepowerHp * 0.999,
    );
  });
});

describe("drawdown and pump setting", () => {
  it("never reports a negative drawdown", () => {
    const shallow = calculateBoreholeWaterSystem({
      ...(base as object),
      drillingDepthMeters: 25,
      staticWaterLevelMeters: 18,
    } as never).pumping;
    expect(shallow.drawdownMeters).toBeGreaterThanOrEqual(0);
  });

  it("keeps the pumping water level at or below the static level", () => {
    const p = calculateBoreholeWaterSystem(base).pumping;
    expect(p.dynamicWaterLevelMeters).toBeGreaterThanOrEqual(
      p.staticWaterLevelMeters,
    );
  });

  it("warns rather than silently setting the pump above the water", () => {
    const p = calculateBoreholeWaterSystem({
      ...(base as object),
      drillingDepthMeters: 30,
      staticWaterLevelMeters: 22,
    } as never).pumping;
    expect(p.warnings.length).toBeGreaterThan(0);
  });
});
