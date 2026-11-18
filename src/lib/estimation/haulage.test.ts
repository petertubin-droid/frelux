import { describe, expect, it } from "vitest";
import {
  computeHaulage,
  haulageToTransportationChoice,
  TERRAIN_FACTORS,
} from "@/lib/estimation/haulage";

describe("computeHaulage", () => {
  it("multiplies distance, trips, rate, terrain and access exactly", () => {
    const result = computeHaulage({
      distanceKm: 40,
      trips: 3,
      costPerKm: 850,
      terrain: "rural_paved",
      regionalFactor: 1.2,
      offloadingPerTrip: 15000,
      currency: "ngn",
    });

    // 40 x 3 x 850 x 1.25 x 1.2 = 153,000
    expect(result.haulage).toBe(153000);
    expect(result.offloading).toBe(45000);
    expect(result.total).toBe(198000);
    expect(result.complete).toBe(true);
    expect(result.currency).toBe("NGN");
  });

  it("refuses to invent a freight rate", () => {
    const result = computeHaulage({ distanceKm: 30, trips: 2 });
    expect(result.complete).toBe(false);
    expect(result.total).toBe(0);
    expect(result.reason).toMatch(/does not invent a market haulage rate/);
    // The distance it was given is still reported, so nothing is hidden.
    expect(result.distanceKm).toBe(30);
    expect(result.trips).toBe(2);
  });

  it("refuses to derive haulage without a distance", () => {
    const result = computeHaulage({ distanceKm: 0, costPerKm: 900 });
    expect(result.complete).toBe(false);
    expect(result.reason).toMatch(/distance/i);
  });

  it("applies no uplift when terrain and access are not stated", () => {
    const result = computeHaulage({
      distanceKm: 10,
      costPerKm: 100,
    });
    expect(result.terrainFactor).toBe(1);
    expect(result.regionalFactor).toBe(1);
    expect(result.total).toBe(1000);
  });

  it("treats a bad access multiplier as no uplift rather than a discount", () => {
    const negative = computeHaulage({
      distanceKm: 10,
      costPerKm: 100,
      regionalFactor: -2,
    });
    expect(negative.regionalFactor).toBe(1);
    expect(negative.total).toBe(1000);
  });

  it("rounds to the currency's cent", () => {
    const result = computeHaulage({
      distanceKm: 7,
      costPerKm: 33.333,
      terrain: "unpaved_laterite",
    });
    // 7 x 1 x 33.333 x 1.6 = 373.3296
    expect(result.haulage).toBe(373.33);
    expect(result.total).toBe(373.33);
  });

  it("states every assumption and shows the formula it used", () => {
    const result = computeHaulage({
      distanceKm: 12,
      trips: 2,
      costPerKm: 500,
      terrain: "unpaved_laterite",
      offloadingPerTrip: 2000,
    });
    expect(result.lines[0].formula).toContain("12 km x 2 trip(s) x 500/km");
    expect(result.lines[0].formula).toContain(
      `x ${TERRAIN_FACTORS.unpaved_laterite} terrain`,
    );
    expect(result.assumptions.join(" ")).toMatch(/Unpaved laterite/);
    expect(result.assumptions.join(" ")).toMatch(/Loading and offloading/);
  });

  it("says loading is excluded rather than implying it is free", () => {
    const result = computeHaulage({ distanceKm: 5, costPerKm: 100 });
    expect(result.assumptions.join(" ")).toMatch(
      /excluded because no cost per trip was stated/,
    );
  });

  it("is deterministic for identical inputs", () => {
    const input = {
      distanceKm: 88.5,
      trips: 4,
      costPerKm: 615.25,
      terrain: "rough_swampy" as const,
      regionalFactor: 1.35,
      offloadingPerTrip: 12500,
    };
    expect(computeHaulage(input)).toEqual(computeHaulage(input));
  });

  it("feeds the quotation's transportation line only when a total exists", () => {
    expect(
      haulageToTransportationChoice(
        computeHaulage({ distanceKm: 20, costPerKm: 400 }),
      ),
    ).toEqual({ enabled: true, amount: 8000 });

    expect(
      haulageToTransportationChoice(computeHaulage({ distanceKm: 20 })),
    ).toEqual({ enabled: false, amount: 0 });
  });
});
