/**
 * Foundation scenario guard rails.
 *
 * These tests exist because this module can produce a number that looks like a
 * design output. The contract: no bearing capacity, no scenario; provenance of
 * the number is always stated; unpriced lines stay unpriced; and sizing uses
 * the existing foundation calculator, not a second implementation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const priceQueries = vi.hoisted(() => ({ fetchListings: vi.fn() }));
vi.mock("@/lib/price-index/queries", () => priceQueries);

import {
  ScenarioInputError,
  computeQuantities,
  costScenario,
  emptyQuantities,
  runScenario,
} from "./foundation";

const baseAssumptions = {
  bearing_capacity_kpa: 150,
  bearing_source: "user_assumption" as const,
  depth_m: 1,
  wall_load_kn_m: 40,
  column_load_kn: 600,
  building_length_m: 20,
  building_width_m: 12,
};

const cementListing = (price: number, id: string) => ({
  price_id: id,
  material_id: "m-cement",
  name: "Cement",
  slug: "ng-cement-dangote-3x-50kg",
  category: "cement",
  sale_unit: "50 kg bag",
  price,
  currency: "NGN",
  price_kind: "retail" as const,
  market: "NG",
  city_slug: "lagos",
  supplier_name: "Depot",
  source_url: null,
  price_source: null,
  effective_date: "2026-10-28",
  verified_at: null,
  verification_status: "verified" as const,
  supporting_submissions: 1,
});

describe("computeQuantities", () => {
  it("refuses to run without a bearing capacity", () => {
    expect(() =>
      computeQuantities("strip", { ...baseAssumptions, bearing_capacity_kpa: 0 }),
    ).toThrow(ScenarioInputError);
  });

  it("names the provenance of the bearing capacity", () => {
    const assumed = computeQuantities("strip", baseAssumptions);
    expect(assumed.warnings.join(" ")).toMatch(/unverified assumption/i);

    const verified = computeQuantities("strip", {
      ...baseAssumptions,
      bearing_source: "report_verified",
    });
    expect(verified.warnings.join(" ")).toMatch(/verified by a reviewer/i);
  });

  it("sizes strip footing through the existing foundation calculator", () => {
    const result = computeQuantities("strip", baseAssumptions);
    expect(result.design.required_width_mm).toBeGreaterThan(0);
    expect(result.quantities.concrete_m3).toBeGreaterThan(0);
    expect(result.quantities.excavation_m3).toBeGreaterThan(0);
  });

  it("costs less concrete as the bearing capacity rises", () => {
    const weak = computeQuantities("strip", { ...baseAssumptions, bearing_capacity_kpa: 100 });
    const strong = computeQuantities("strip", { ...baseAssumptions, bearing_capacity_kpa: 300 });
    expect(strong.quantities.concrete_m3).toBeLessThan(weak.quantities.concrete_m3);
  });

  it("states the reinforcement intensity it assumed", () => {
    const result = computeQuantities("pad", baseAssumptions);
    expect(result.warnings.join(" ")).toMatch(/kg\/m³/);
  });

  it("requires pile count and depth rather than guessing them", () => {
    expect(() => computeQuantities("pile", baseAssumptions)).toThrow(ScenarioInputError);
    const result = computeQuantities("pile", {
      ...baseAssumptions,
      pile_count: 8,
      pile_depth_m: 12,
    });
    expect(result.quantities.pile_metres).toBe(96);
  });

  it("never adds dewatering unless the user allowed for it", () => {
    const result = computeQuantities("raft", baseAssumptions);
    expect(result.quantities.dewatering_allowance).toBe(0);
  });
});

describe("costScenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    priceQueries.fetchListings.mockResolvedValue({ listings: [], error: null });
  });

  it("leaves material lines unpriced when there is no market price", async () => {
    const cost = await costScenario({ quantities: { ...emptyQuantities(), concrete_m3: 10 } });
    expect(cost.subtotal).toBeNull();
    expect(cost.unpriced.length).toBeGreaterThan(0);
    expect(cost.lines.every((l) => l.amount === null)).toBe(true);
    expect(cost.lines[0].price_note).toMatch(/unpriced rather than estimated/i);
  });

  it("prices lines from the index when a qualifying median exists", async () => {
    priceQueries.fetchListings.mockResolvedValue({
      listings: [
        cementListing(50000, "1"),
        cementListing(51000, "2"),
        cementListing(52000, "3"),
      ],
      error: null,
    });

    const cost = await costScenario({
      quantities: { ...emptyQuantities(), concrete_m3: 10 },
      citySlug: "lagos",
    });
    const cement = cost.lines.find((l) => l.key === "cement");
    expect(cement?.unit_price).toBe(51000);
    expect(cement?.price_note).toMatch(/3 prices/);
  });

  it("keeps a single observation unpublished", async () => {
    priceQueries.fetchListings.mockResolvedValue({
      listings: [cementListing(50000, "1")],
      error: null,
    });
    const cost = await costScenario({
      quantities: { ...emptyQuantities(), concrete_m3: 10 },
      citySlug: "lagos",
    });
    expect(cost.lines.every((l) => l.unit_price === null)).toBe(true);
  });
});

describe("runScenario", () => {
  beforeEach(() => {
    priceQueries.fetchListings.mockResolvedValue({ listings: [], error: null });
  });

  it("returns quantities, warnings and an explicitly incomplete cost", async () => {
    const result = await runScenario({
      type: "strip",
      assumptions: baseAssumptions,
      citySlug: "lagos",
    });
    expect(result.quantities.concrete_m3).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.cost?.subtotal).toBeNull();
  });
});
