// =========================================================
// ENGINE REGISTRY IDENTITY
//
// An engine id names THE authoritative implementation of a
// calculation. Two engines cannot share one id, and a failed
// registration must never disturb the engine that already owns it.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  DuplicateEngineIdError,
  getEngineDescriptor,
  listEngines,
  registerEngine,
  type EngineDescriptor,
} from "./engines-registry";

function stub(id: string, title: string): EngineDescriptor {
  return {
    id,
    domain: "building",
    title,
    authoritative: true,
    creditedAs: `Calculated by ${title}`,
    run: async () => ({
      ok: true,
      engine: id,
      calculatedAt: new Date(0).toISOString(),
      quantities: [],
      costs: null,
      raw: null,
    }),
  };
}

describe("engine registry identity", () => {
  it("registers the existing engines, each id once", () => {
    const engines = listEngines();
    expect(engines.length).toBeGreaterThanOrEqual(17);
    expect(new Set(engines.map((e) => e.id)).size).toBe(engines.length);
  });

  it("refuses a second engine claiming a taken id", () => {
    const owner = listEngines()[0];
    expect(() => registerEngine(stub(owner.id, "Impostor Engine"))).toThrow(
      DuplicateEngineIdError,
    );
  });

  it("names the id and both titles in the refusal", () => {
    const owner = listEngines()[0];
    try {
      registerEngine(stub(owner.id, "Impostor Engine"));
      throw new Error("registration should have been refused");
    } catch (e) {
      expect(e).toBeInstanceOf(DuplicateEngineIdError);
      const err = e as DuplicateEngineIdError;
      expect(err.message).toContain(owner.id);
      expect(err.message).toContain(owner.title);
      expect(err.message).toContain("Impostor Engine");
    }
  });

  it("leaves the original engine untouched after a refused claim", () => {
    const owner = listEngines()[0];
    expect(() => registerEngine(stub(owner.id, "Impostor Engine"))).toThrow();
    const stillThere = getEngineDescriptor(owner.id);
    expect(stillThere?.title).toBe(owner.title);
    expect(stillThere?.title).not.toBe("Impostor Engine");
  });

  it("tolerates the same engine registering again with a fresh object", () => {
    // Real modules rebuild their descriptor on every call, so identity
    // comparison alone would break normal startup.
    const owner = listEngines()[0];
    const before = listEngines().length;
    const rebuilt = stub(owner.id, owner.title);
    expect(() => registerEngine(rebuilt)).not.toThrow();
    expect(listEngines().length).toBe(before);
    expect(getEngineDescriptor(owner.id)?.title).toBe(owner.title);
  });

  it("still refuses a different engine wearing a taken id and title's domain", () => {
    const owner = listEngines()[0];
    const impostor = {
      ...stub(owner.id, "Impostor Engine"),
      domain: "hacking",
    };
    expect(() => registerEngine(impostor)).toThrow(DuplicateEngineIdError);
  });

  it("accepts a genuinely new id", () => {
    const fresh = stub("test_only_new_engine", "Test Only Engine");
    registerEngine(fresh);
    expect(getEngineDescriptor("test_only_new_engine")?.title).toBe(
      "Test Only Engine",
    );
  });
});
