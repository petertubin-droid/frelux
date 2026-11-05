import { describe, expect, it } from "vitest";
import {
  calculateArchitecturalMath,
  calculateLiftTraffic,
  OCCUPANCY_PROFILES,
  type ArchitecturalInput,
} from "./architectural-planning";

const BASE: ArchitecturalInput = {
  floors: 40,
  floorHeight: 3.6,
  heightM: 144,
  planLength: 42,
  planWidth: 32,
  coreArea: 161.3,
  coreLength: 14.55,
  coreWidth: 11.09,
  slabThickness: 0.25,
  columnCount: 30,
  columnSizeMm: 1400,
  occupancy: "office",
  daylightDepthM: 7,
  servicesZoneM: 0.45,
  liftCarCapacity: 21,
};

describe("architectural mathematics", () => {
  it("computes the daylight band from the plan and the daylight depth", () => {
    const result = calculateArchitecturalMath(BASE);
    // 42 x 32 plate minus the 28 x 18 inner rectangle left by a 7 m setback.
    expect(result.daylitAreaM2).toBeCloseTo(42 * 32 - 28 * 18, 0);
    expect(result.daylitPct).toBeCloseTo((840 / 1344) * 100, 1);
  });

  it("computes net lettable area from the plate, core and structure", () => {
    const result = calculateArchitecturalMath(BASE);
    const plate = 42 * 32;
    const structure = 30 * Math.pow(1.4, 2);
    expect(result.netLettableAreaM2).toBeCloseTo(
      (plate - 161.3 - structure) * 40,
      0,
    );
    expect(result.efficiencyPct).toBeGreaterThan(70);
    expect(result.efficiencyPct).toBeLessThan(92);
  });

  it("computes facade to floor ratio from the perimeter and the storey", () => {
    const result = calculateArchitecturalMath(BASE);
    expect(result.facadeToFloorRatio).toBeCloseTo(
      (2 * (42 + 32) * 40 * 3.6) / (42 * 32 * 40),
      2,
    );
  });

  it("derives clear height from floor to floor, slab and services", () => {
    const result = calculateArchitecturalMath(BASE);
    expect(result.clearHeightM).toBeCloseTo(3.6 - 0.25 - 0.45, 2);
    expect(result.clearHeightOk).toBe(true);
  });

  it("requires two exits above 49 occupants and 5 mm per occupant on stairs", () => {
    const busy = calculateArchitecturalMath({
      ...BASE,
      occupancy: "education",
    });
    expect(busy.exitsRequired).toBe(2);
    expect(busy.egressWidthRequiredMm).toBe(
      Math.max(1120, Math.ceil(busy.occupantsPerFloor * 5)),
    );
    const quiet = calculateArchitecturalMath({
      ...BASE,
      floors: 10,
      planLength: 20,
      planWidth: 16,
      coreArea: 40,
      occupancy: "residential",
    });
    expect(quiet.egressWidthRequiredMm).toBe(1120);
  });

  it("uses the occupancy profile for area per person", () => {
    const office = calculateArchitecturalMath(BASE);
    const residential = calculateArchitecturalMath({
      ...BASE,
      occupancy: "residential",
    });
    expect(office.totalOccupants).toBeGreaterThan(residential.totalOccupants);
    expect(residential.occupantsPerFloor).toBeCloseTo(
      office.occupantsPerFloor *
        (OCCUPANCY_PROFILES.office.areaPerPerson /
          OCCUPANCY_PROFILES.residential.areaPerPerson),
      1,
    );
  });
});

describe("lift traffic", () => {
  it("matches a hand calculation of round trip time and cars", () => {
    const result = calculateLiftTraffic({
      floors: 20,
      heightM: 72,
      population: 1000,
      carCapacity: 21,
      arrivalRate: 0.12,
      targetInterval: 30,
      carSpeedMs: 2.4,
      coreAreaM2: 200,
    });
    const stops = 20 * (1 - Math.pow(1 - 1 / 20, 21));
    const rtt = (2 * 72) / 2.4 + (stops + 1) * 7 + 2 * 21 * 1.2;
    expect(result.probableStops).toBeCloseTo(stops, 1);
    expect(result.roundTripTimeS).toBeCloseTo(rtt, 1);
    const handling = (300 * 21) / rtt;
    expect(result.carsRequired).toBe(Math.ceil(120 / handling));
    expect(result.intervalS).toBeCloseTo(rtt / result.carsRequired, 1);
    expect(result.intervalOk).toBe(result.intervalS <= 30);
  });

  it("needs a larger core when more cars are required", () => {
    const small = calculateLiftTraffic({
      floors: 10,
      heightM: 36,
      population: 500,
      carCapacity: 21,
      arrivalRate: 0.1,
      targetInterval: 30,
      coreAreaM2: 100,
    });
    const large = calculateLiftTraffic({
      floors: 10,
      heightM: 36,
      population: 2500,
      carCapacity: 21,
      arrivalRate: 0.1,
      targetInterval: 30,
      coreAreaM2: 40,
    });
    expect(large.carsRequired).toBeGreaterThan(small.carsRequired);
    expect(large.coreAreaNeededM2).toBeGreaterThan(small.coreAreaNeededM2);
    expect(large.fitsInCore).toBe(false);
  });

  it("raises handling capacity as cars are added", () => {
    const result = calculateLiftTraffic({
      floors: 30,
      heightM: 110,
      population: 3000,
      carCapacity: 24,
      arrivalRate: 0.15,
      targetInterval: 30,
      coreAreaM2: 300,
    });
    expect(result.handlingCapacityPct).toBeGreaterThanOrEqual(15);
    expect(result.coreAreaNeededM2).toBeGreaterThan(0);
  });
});
