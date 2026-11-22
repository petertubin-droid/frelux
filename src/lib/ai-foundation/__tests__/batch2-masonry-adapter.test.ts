import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculateMasonryTakeoff } from "@/lib/estimation/masonry-standalone-engine";
import { calculateConcreteVolume } from "@/lib/globalization/takeoff-engines";

describe("batch 2 adapters", () => {
  it("are registered", () => {
    const ids = listEngines().map((e) => e.id);
    expect(ids).toContain("masonry");
    expect(ids).toContain("concrete_volume");
  });

  it("masonry matches the engine", async () => {
    const direct = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      wallCount: 1,
      jointThicknessMm: 10,
      mortarMixRatio: "1:4",
      wastePercent: 5,
      lengthUnit: "m",
      leafCount: 1,
    } as never);

    const result = await executeEngine("masonry", {});
    expect(result.ok).toBe(true);

    const units = result.quantities.find((q) => q.label.startsWith("Units ("));
    expect(units?.quantity).toBe(direct.unitsRequiredGross);
    const cement = result.quantities.find((q) => q.label === "Cement");
    expect(cement?.quantity).toBe(direct.cementBagsRequired);
    const sand = result.quantities.find((q) => q.label === "Sand");
    expect(sand?.quantity).toBeCloseTo(direct.sandVolumeM3, 6);
  });

  it("concrete_volume matches the auditable contract", async () => {
    const direct = calculateConcreteVolume({
      lengthMm: 5000,
      widthMm: 4000,
      depthMm: 150,
      wastagePercent: 5,
    } as never);
    expect(direct.status).toBe("valid");

    const result = await executeEngine("concrete_volume", {});
    expect(result.ok).toBe(true);
    const required = result.quantities.find(
      (q) => q.label === "Required volume" && q.unit === "m³",
    );
    expect(required?.quantity).toBeCloseTo(direct.outputs!.requiredVolumeM3, 6);
  });

  it("concrete_volume refuses a bad dimension", async () => {
    const result = await executeEngine("concrete_volume", {
      lengthMm: 0,
      widthMm: 4000,
      depthMm: 150,
    });
    expect(result.ok).toBe(false);
    expect(result.quantities).toEqual([]);
  });
});
