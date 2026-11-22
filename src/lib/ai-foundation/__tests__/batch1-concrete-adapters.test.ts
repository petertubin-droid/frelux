import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculateIcfWall } from "@/lib/estimation/icf-engine";
import { calculateConcreteTakeoff } from "@/lib/estimation/advanced-takeoff-engine";

const ids = () => listEngines().map((e) => e.id);

describe("batch 1 adapters", () => {
  it("are registered", () => {
    for (const id of ["icf_wall", "concrete_takeoff"]) {
      expect(ids(), `missing ${id}`).toContain(id);
    }
  });

  it("icf_wall matches the engine", async () => {
    const direct = calculateIcfWall({
      wallLengthM: 20,
      wallHeightM: 2.7,
      coreThicknessMm: 150,
      foamType: "eps",
    } as never);
    const result = await executeEngine("icf_wall", {});
    expect(result.ok).toBe(direct.ok);
    const blocks = result.quantities.find(
      (q) => q.label === "ICF blocks (total)",
    );
    expect(blocks?.quantity).toBe(direct.blocks.totalBlocksCount);
    const concrete = result.quantities.find(
      (q) => q.label === "Concrete in core",
    );
    expect(concrete?.quantity).toBeCloseTo(direct.concrete.totalVolumeM3, 6);
  });

  it("concrete_takeoff matches the engine", async () => {
    const direct = calculateConcreteTakeoff({
      elementType: "slab",
      lengthM: 5,
      widthM: 4,
      depthM: 0.15,
      cementParts: 1,
      sandParts: 2,
      aggregateParts: 4,
      wastePercent: 5,
      cementBagMassKg: 50,
    } as never);
    expect(direct.ok).toBe(true);
    const result = await executeEngine("concrete_takeoff", {});
    expect(result.ok).toBe(true);
    const volume = result.quantities.find((q) => q.label === "Concrete volume");
    expect(volume?.quantity).toBeCloseTo(direct.data!.concreteVolumeM3, 6);
    const bags = result.quantities.find(
      (q) => q.label === "Cement bags to buy",
    );
    expect(bags?.quantity).toBe(direct.data!.cementBagsToBuy);
  });
});
