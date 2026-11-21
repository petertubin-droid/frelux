import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculatePlasteringTakeoff } from "@/lib/estimation/plastering-standalone-engine";

describe("plastering_wall adapter", () => {
  it("is registered", () => {
    expect(listEngines().map((e) => e.id)).toContain("plastering_wall");
  });

  it("returns the same cement and sand as the engine itself", async () => {
    const direct = calculatePlasteringTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      wallCount: 1,
      thicknessMm: 15,
      coats: 2,
      mixRatio: "1:4",
      wastePercent: 5,
    } as never);

    const result = await executeEngine("plastering_wall", {});

    expect(result.ok).toBe(true);
    const cement = result.quantities.find((q) => q.label === "Cement");
    const sand = result.quantities.find((q) => q.label === "Sand");
    expect(cement?.quantity).toBeCloseTo(direct.cementBagsRequired, 6);
    expect(sand?.quantity).toBeCloseTo(direct.sandVolumeM3, 6);
    expect(cement?.quantity).toBeGreaterThan(0);
  });
});
