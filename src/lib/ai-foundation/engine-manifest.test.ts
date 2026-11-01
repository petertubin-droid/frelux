import { describe, it, expect } from "vitest";
import { listEngines } from "./engines-registry";
import { ENGINE_CAPABILITIES } from "@/lib/international/capability-registry";
import { UNRESOLVED_ENGINE_IDS } from "./engine-canonical";
import { buildEngineManifest, summariseManifest } from "./engine-manifest";

const manifest = buildEngineManifest();

describe("canonical engine manifest", () => {
  it("never carries a duplicate id", () => {
    const ids = manifest.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("accounts for every AI registry engine", () => {
    const aiIds = new Set(manifest.flatMap((m) => m.sources.aiEngineIds));
    for (const engine of listEngines()) {
      expect(aiIds.has(engine.id)).toBe(true);
    }
  });

  it("accounts for every capability registry entry", () => {
    const capabilityIds = new Set(
      manifest.map((m) => m.sources.capabilityId).filter(Boolean),
    );
    for (const capability of ENGINE_CAPABILITIES) {
      expect(capabilityIds.has(capability.id)).toBe(true);
    }
  });

  it("records unresolved ids instead of guessing them", () => {
    for (const id of UNRESOLVED_ENGINE_IDS) {
      const entry = manifest.find((m) => m.sources.aiEngineIds.includes(id));
      expect(entry).toBeDefined();
      expect(entry?.sources.capabilityId).toBeNull();
      expect(entry?.gaps.join(" ")).toMatch(/unresolved/);
    }
  });

  it("leaves undeclared fields null and says so in gaps", () => {
    for (const entry of manifest) {
      if (entry.version === null) {
        expect(entry.gaps).toContain("version not declared");
      }
      if (entry.deterministic === null) {
        expect(entry.gaps.length).toBeGreaterThan(0);
      }
    }
  });

  it("takes markets and determinism from the capability when linked", () => {
    const linked = manifest.filter((m) => m.sources.capabilityId);
    expect(linked.length).toBeGreaterThan(0);
    for (const entry of linked) {
      const capability = ENGINE_CAPABILITIES.find(
        (c) => c.id === entry.sources.capabilityId,
      );
      expect(entry.deterministic).toBe(capability?.deterministic);
      expect(entry.markets?.verified).toEqual(capability?.verifiedMarkets);
    }
  });

  it("is deterministic across builds", () => {
    expect(buildEngineManifest()).toEqual(manifest);
  });

  it("summarises the three-way disagreement honestly", () => {
    const summary = summariseManifest(manifest);
    expect(summary.total).toBe(manifest.length);
    expect(
      summary.describedByAllThree +
        summary.aiOnly +
        summary.capabilityOnly +
        summary.inventoryOnly,
    ).toBeLessThanOrEqual(summary.total);
    expect(summary.unresolvedIds).toEqual(UNRESOLVED_ENGINE_IDS);
  });
});
