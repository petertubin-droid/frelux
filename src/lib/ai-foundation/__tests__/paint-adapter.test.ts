import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculateTheoreticalLitres } from "@/lib/estimation/paint-engine";
import { litresToBuckets } from "@/lib/estimation/painting-engine";

describe("paint adapter", () => {
  it("is registered", () => {
    expect(listEngines().map((e) => e.id)).toContain("paint");
  });

  it("matches both engine functions", async () => {
    const litres = calculateTheoreticalLitres(100, 2, 10);
    const exact = litresToBuckets(litres, 20);

    const result = await executeEngine("paint", {});
    expect(result.ok).toBe(true);

    const adaptedLitres = result.quantities.find(
      (q) => q.label === "Theoretical paint",
    );
    expect(adaptedLitres?.quantity).toBeCloseTo(litres, 6);

    const adaptedExact = result.quantities.find(
      (q) => q.label === "Buckets (exact)",
    );
    expect(adaptedExact?.quantity).toBeCloseTo(exact, 6);

    const toBuy = result.quantities.find((q) => q.label === "Buckets to buy");
    expect(toBuy?.quantity).toBe(Math.ceil(exact));
  });

  it("refuses zero coverage instead of returning NaN", async () => {
    const result = await executeEngine("paint", {
      areaM2: 100,
      coats: 2,
      coverageM2PerLiter: 0,
    });
    expect(result.ok).toBe(false);
    expect(Number.isFinite(result.quantities[0]?.quantity ?? NaN)).toBe(true);
  });
});
