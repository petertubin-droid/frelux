import { describe, expect, it } from "vitest";
import { listEngines } from "@/lib/ai-foundation/engines-registry";
import { registerAllEngines } from "@/lib/ai-foundation/register-all";

describe("registerAllEngines", () => {
  it("exposes the adapter families the console could not reach", () => {
    registerAllEngines();
    const ids = listEngines().map((e) => e.id);
    // Before activation the registry module alone registered ten engines, so
    // none of these were reachable from Engine Studio.
    for (const id of [
      "electrical",
      "plumbing",
      "regional_cost",
      "painting_project",
      "tile_estimate",
      "pop_ceiling",
      "screeding_system",
      "tyrolene_system",
      "structural_calculator",
      "foundation_calculator",
      "sequence_planner",
      "timeline_estimator",
    ]) {
      expect(ids, `missing engine: ${id}`).toContain(id);
    }
    expect(ids.length).toBeGreaterThanOrEqual(20);
  });

  it("is idempotent", () => {
    registerAllEngines();
    const once = listEngines().length;
    registerAllEngines();
    expect(listEngines().length).toBe(once);
  });
});
