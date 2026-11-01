import { describe, expect, it } from "vitest";
import { buildEngineManifest, summariseManifest } from "./engine-manifest";

const manifest = buildEngineManifest();

describe("engine manifest composition", () => {
  it("keeps the name of every engine that shares a capability", () => {
    const foundation = manifest.find((m) => m.id === "foundation");
    expect(foundation).toBeDefined();
    // Two AI engines resolve to this capability; both names survive.
    expect(foundation!.sources.aiEngineIds.length).toBeGreaterThan(1);
    expect(foundation!.aliasedNames?.length).toBe(
      foundation!.sources.aiEngineIds.length - 1,
    );
  });

  it("names every alias instead of overwriting it", () => {
    for (const engine of manifest) {
      if (!engine.aliasedNames) continue;
      expect(engine.aliasedNames).not.toContain(engine.name);
      expect(new Set(engine.aliasedNames).size).toBe(
        engine.aliasedNames.length,
      );
    }
  });

  it("reports no conflicting capability ids", () => {
    const conflicts = manifest.flatMap((engine) =>
      engine.gaps.filter((gap) => gap.startsWith("conflicting capability id")),
    );
    expect(conflicts).toEqual([]);
  });

  it("keeps the counts it advertises", () => {
    const summary = summariseManifest(manifest);
    expect(summary.total).toBe(manifest.length);
    expect(
      summary.describedByAllThree +
        summary.aiOnly +
        summary.capabilityOnly +
        summary.inventoryOnly,
    ).toBeGreaterThanOrEqual(summary.total);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(buildEngineManifest())).toBe(
      JSON.stringify(buildEngineManifest()),
    );
  });
});
