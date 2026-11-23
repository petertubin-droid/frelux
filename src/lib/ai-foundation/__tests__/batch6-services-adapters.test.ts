import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculateDrainageTakeoff } from "@/lib/estimation/drainage-standalone-engine";
import { calculateSepticSizing } from "@/lib/estimation/septic-sizing-engine";
import { calculateUpcIpcDrainage } from "@/lib/estimation/plumbing-standards-engine";
import { calculateNecPreliminaryCable } from "@/lib/estimation/nec-electrical-engine";

/**
 * Batch 6: building services.
 *
 * Each test runs the adapter through executeEngine and the engine function
 * directly with the same inputs, then compares by label. An adapter that drifts
 * from the calculator that shares its maths is worse than no adapter.
 */

const quantity = (
  result: Awaited<ReturnType<typeof executeEngine>>,
  label: string,
) => result.quantities.find((q) => q.label === label)?.quantity;

describe("batch 6 building services adapters", () => {
  it("are registered", () => {
    const ids = listEngines().map((e) => e.id);
    expect(ids).toContain("drainage");
    expect(ids).toContain("septic_sizing");
    expect(ids).toContain("plumbing_drainage");
    expect(ids).toContain("nec_cable");
  });

  it("drainage matches the takeoff the page runs", async () => {
    const direct = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 20, pipeDiameterMm: 110, fallMmPerM: 16.7 }],
      inspectionChambers: 3,
      manholeCount: 0,
    } as never);

    const result = await executeEngine("drainage", {});
    expect(result.ok).toBe(true);
    expect(quantity(result, "Total pipe")).toBeCloseTo(
      direct.totalPipeLengthM,
      6,
    );
    expect(quantity(result, "Pipe stock pieces")).toBe(direct.pipeStockPieces);
    expect(quantity(result, "Inspection chambers")).toBe(
      direct.inspectionChambers,
    );
    expect(quantity(result, "Bedding")).toBeCloseTo(direct.beddingVolumeM3, 6);
    expect(quantity(result, "Excavation")).toBeCloseTo(
      direct.excavationVolumeM3,
      6,
    );
  });

  it("drainage follows a measured run the caller supplies", async () => {
    const result = await executeEngine("drainage", {
      runs: [{ lengthM: 50, pipeDiameterMm: 160, fallMmPerM: 10 }],
    });
    expect(quantity(result, "Total pipe")).toBeCloseTo(50, 6);
  });

  it("septic sizing matches the sizing engine", async () => {
    const direct = calculateSepticSizing({
      marketCode: "NG",
      occupants: 6,
      designFlowLitresPerPersonPerDay: 150,
      retentionDays: 2,
    } as never);

    const result = await executeEngine("septic_sizing", {});
    expect(result.ok).toBe(true);
    expect(quantity(result, "Daily design flow")).toBeCloseTo(
      direct.dailyDesignFlowLitres,
      6,
    );
    expect(quantity(result, "Tank working volume")).toBeCloseTo(
      direct.tankWorkingVolumeM3,
      6,
    );
    expect(quantity(result, "Tank total volume")).toBeCloseTo(
      direct.tankTotalVolumeM3,
      6,
    );
  });

  it("septic sizing reports no soakaway line without a soil rate", async () => {
    const result = await executeEngine("septic_sizing", {});
    // A zero here would read as "no soakaway needed", which is a different
    // claim from "the soil loading rate was not supplied".
    expect(
      result.quantities.find((q) => q.label === "Soakaway absorption area"),
    ).toBeUndefined();
  });

  it("plumbing drainage matches the IPC/UPC table engine", async () => {
    const direct = calculateUpcIpcDrainage({
      water_closets: 2,
      lavatories: 2,
      showers: 1,
      bathtubs: 0,
      kitchen_sinks: 1,
      dishwashers: 0,
      clothes_washers: 0,
      floor_drains: 0,
    } as never);

    const result = await executeEngine("plumbing_drainage", {});
    expect(result.ok).toBe(true);
    expect(quantity(result, "Total fixture units")).toBeCloseTo(
      direct.total_dfu,
      6,
    );
    expect(quantity(result, "Drain capacity")).toBeCloseTo(
      direct.max_capacity_dfu,
      6,
    );
    expect(quantity(result, "Minimum slope")).toBeCloseTo(
      direct.minimum_slope_percent,
      6,
    );
  });

  it("nec cable matches the preliminary sizing engine", async () => {
    const direct = calculateNecPreliminaryCable({
      load_watts: 8000,
      run_ft: 100,
      system: "240V_single",
      power_factor: 1,
    } as never);

    const result = await executeEngine("nec_cable", {});
    expect(result.ok).toBe(true);
    expect(quantity(result, "Design current")).toBeCloseTo(
      direct.design_current_a,
      6,
    );
    expect(quantity(result, "Run length")).toBeCloseTo(direct.run_m, 6);
    expect(quantity(result, "Voltage drop")).toBeCloseTo(
      direct.voltage_drop.drop_percent ?? 0,
      6,
    );
  });

  it("nec cable takes a three-phase system the caller names", async () => {
    const result = await executeEngine("nec_cable", {
      system: "480V_three",
      load_watts: 30000,
    });
    const direct = calculateNecPreliminaryCable({
      load_watts: 30000,
      run_ft: 100,
      system: "480V_three",
      power_factor: 1,
    } as never);
    expect(quantity(result, "Design current")).toBeCloseTo(
      direct.design_current_a,
      6,
    );
  });
});
