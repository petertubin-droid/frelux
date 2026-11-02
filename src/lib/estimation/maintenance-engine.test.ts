/**
 * Maintenance Schedule Engine tests (Future Engine 1)
 *
 * Every expected value below is hand-verified. The engine is
 * deterministic: DB-configured profile in → identical schedule out.
 */

import { describe, it, expect } from "vitest";
import {
  calculateMaintenanceSchedule,
  matchMaintenanceProfile,
  type MaintenanceScheduleInput,
} from "./maintenance-engine";
import type { MaintenanceProfile } from "@/types/estimation";

const profile = (
  over: Partial<MaintenanceProfile> = {},
): MaintenanceProfile => ({
  id: "p1",
  finish_category: "paint",
  surface_type: "exterior",
  service_life_min_years: 8,
  service_life_max_years: 12,
  maintenance_interval_min_years: 4,
  maintenance_interval_max_years: 6,
  inspection_interval_years: 1,
  maintenance_cost_factor: 0.35,
  replacement_cost_factor: 1.0,
  description: "Exterior emulsion, coastal",
  source_reference: "Manufacturer datasheet X-2026",
  is_active: true,
  sort_order: 0,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  ...over,
});

const input = (
  over: Partial<MaintenanceScheduleInput> = {},
): MaintenanceScheduleInput => ({
  category: "paint",
  surface_type: "exterior",
  initial_cost: 100000,
  currency: "NGN",
  install_date: "2026-01-15",
  horizon_years: 10,
  milestone_years: [3, 5, 10],
  profiles: [profile()],
  ...over,
});

describe("matchMaintenanceProfile", () => {
  it("matches exact category + surface", () => {
    expect(matchMaintenanceProfile([profile()], "paint", "exterior")?.id).toBe(
      "p1",
    );
  });

  it("falls back to category + 'any' surface, never to another category", () => {
    const any = profile({ id: "p2", surface_type: "any" });
    expect(matchMaintenanceProfile([any], "paint", "interior")?.id).toBe("p2");
    expect(matchMaintenanceProfile([any], "tile", "interior")).toBeNull();
  });

  it("prefers the exact match over the generic one", () => {
    const exact = profile({ id: "exact" });
    const generic = profile({ id: "generic", surface_type: "any" });
    expect(
      matchMaintenanceProfile([generic, exact], "paint", "exterior")?.id,
    ).toBe("exact");
  });

  it("ignores inactive profiles", () => {
    expect(
      matchMaintenanceProfile(
        [profile({ is_active: false })],
        "paint",
        "exterior",
      ),
    ).toBeNull();
  });
});

describe("calculateMaintenanceSchedule", () => {
  it("refuses to schedule without a matching profile (no guessed values)", () => {
    const r = calculateMaintenanceSchedule(input({ category: "tile" }));
    expect(r.ok).toBe(false);
    expect(r.events).toHaveLength(0);
    expect(r.warnings[0]).toMatch(
      /No active maintenance profile is configured for 'tile'/,
    );
  });

  it("rejects an invalid horizon", () => {
    const r = calculateMaintenanceSchedule(input({ horizon_years: 0 }));
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/Horizon must be a positive number/);
  });

  it("rejects a malformed install date", () => {
    const r = calculateMaintenanceSchedule(
      input({ install_date: "15-01-2026" }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/Installation date must be a valid ISO date/);
  });

  it("rejects a negative initial cost", () => {
    const r = calculateMaintenanceSchedule(input({ initial_cost: -5 }));
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/Initial cost cannot be negative/);
  });

  it("produces the hand-verified schedule for a paint/exterior profile", () => {
    // Profile: life 8–12y, interval 4–6y, inspections yearly, factor 0.35, repl 1.0
    // Horizon 10 from 2026-01-15, milestones [3,5,10], cost 100,000 NGN
    const r = calculateMaintenanceSchedule(input());
    expect(r.ok).toBe(true);
    expect(r.profileName).toBe("Exterior emulsion, coastal");

    const inspections = r.events.filter((e) => e.type === "inspection");
    expect(inspections).toHaveLength(10); // yearly, years 1..10
    expect(inspections[0]).toMatchObject({
      year_min: 1,
      year_max: 1,
      cost: null,
    });

    const cycles = r.events.filter((e) => e.type === "maintenance_cycle");
    // First cycle [4,6]; next on the max-cadence step: [10,12]
    expect(cycles.map((c) => [c.year_min, c.year_max])).toEqual([
      [4, 6],
      [10, 12],
    ]);
    expect(cycles[0].cost).toBe(35000); // 0.35 × 100,000

    const redeco = r.events.filter((e) => e.type === "full_redecoration");
    expect(redeco).toHaveLength(1);
    expect(redeco[0]).toMatchObject({
      year_min: 8,
      year_max: 12,
      cost: 100000,
    });

    // Dates: install 2026-01-15 + 4y = 2030-01-15; +6y = 2032-01-15
    expect(cycles[0].date_min).toBe("2030-01-15");
    expect(cycles[0].date_max).toBe("2032-01-15");
  });

  it("computes conservative earliest-occurrence cost milestones (hand-verified)", () => {
    // Year 3: nothing due yet → 0
    // Year 5: first cycle (from year 4) → 35,000
    // Year 10: cycles [4,6] + [10,12] + redecoration → 35,000+35,000+100,000
    const r = calculateMaintenanceSchedule(input());
    expect(r.milestones).toEqual([
      { year: 3, cumulative_cost: 0, events_included: 0 },
      { year: 5, cumulative_cost: 35000, events_included: 1 },
      { year: 10, cumulative_cost: 170000, events_included: 3 },
    ]);
  });

  it("produces a timing-only schedule without an initial cost (warning, no refusal)", () => {
    const r = calculateMaintenanceSchedule(input({ initial_cost: null }));
    expect(r.ok).toBe(true);
    expect(r.events.every((e) => e.cost === null)).toBe(true);
    expect(r.milestones.every((m) => m.cumulative_cost === null)).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/No initial cost provided/);
  });

  it("skips the redecoration event when service life exceeds the horizon", () => {
    const r = calculateMaintenanceSchedule(
      input({
        horizon_years: 5,
        milestone_years: [3, 5],
        profiles: [profile({ service_life_min_years: 8 })],
      }),
    );
    expect(r.events.filter((e) => e.type === "full_redecoration")).toHaveLength(
      0,
    );
    expect(
      r.steps.some(
        (s) =>
          s.label === "Full redecoration" &&
          /outside the 5-year horizon/.test(s.detail),
      ),
    ).toBe(true);
  });

  it("reports an incomplete profile (missing interval columns = cycles simply absent)", () => {
    const p = profile({
      maintenance_interval_min_years: null,
      maintenance_interval_max_years: null,
    });
    const r = calculateMaintenanceSchedule(input({ profiles: [p] }));
    expect(r.ok).toBe(true);
    expect(r.events.filter((e) => e.type === "maintenance_cycle")).toHaveLength(
      0,
    );
  });

  it("sorts events chronologically", () => {
    const r = calculateMaintenanceSchedule(input());
    const mins = r.events.map((e) => e.year_min);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });
});
