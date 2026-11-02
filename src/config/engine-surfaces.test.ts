import { describe, expect, it } from "vitest";
import { listEngines } from "@/lib/ai-foundation/engines-registry";
import {
  ENGINE_SURFACES,
  surfaceFor,
  surfacesByStatus,
} from "./engine-surfaces";

describe("engine surface manifest", () => {
  it("declares a surface for every registered engine", () => {
    const missing = listEngines()
      .map((engine) => engine.id)
      .filter((id) => !surfaceFor(id));
    expect(missing).toEqual([]);
  });

  it("does not declare engines that are no longer registered", () => {
    const registered = new Set(listEngines().map((engine) => engine.id));
    const stale = ENGINE_SURFACES.filter(
      (surface) => !registered.has(surface.engineId),
    ).map((surface) => surface.engineId);
    expect(stale).toEqual([]);
  });

  it("gives every engine a sentence explaining its state", () => {
    for (const surface of ENGINE_SURFACES) {
      expect(surface.note.length).toBeGreaterThan(20);
      expect(surface.label.length).toBeGreaterThan(2);
    }
  });

  it("links a route for every engine that claims a page", () => {
    for (const surface of ENGINE_SURFACES) {
      if (surface.status === "live" || surface.status === "duplicated") {
        expect(surface.route, surface.engineId).toMatch(/^\//);
      }
      if (surface.status === "none") {
        expect(surface.route).toBeNull();
      }
    }
  });

  it("counts every engine exactly once", () => {
    const counts = surfacesByStatus();
    expect(
      counts.live.length + counts.duplicated.length + counts.none.length,
    ).toBe(ENGINE_SURFACES.length);
    const ids = ENGINE_SURFACES.map((s) => s.engineId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps engine notes free of em dashes", () => {
    for (const surface of ENGINE_SURFACES) {
      expect(surface.note).not.toMatch(/[—–]/);
    }
  });
});
