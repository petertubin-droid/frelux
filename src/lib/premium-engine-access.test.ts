import { describe, expect, it } from "vitest";
import { engineAccessFor } from "@/lib/premium-engine-access";
import {
  PREMIUM_ENGINES,
  isPremiumEngineRoute,
  premiumEngineFor,
} from "@/config/premium-engines";

const free = { isPaid: false, isAdmin: false };

describe("premium engine registry", () => {
  it("gates only structural and heavy engines", () => {
    for (const engine of PREMIUM_ENGINES) {
      expect(["structural", "heavy"]).toContain(engine.tier);
    }
  });

  it("keeps every preview small enough to be a preview", () => {
    for (const engine of PREMIUM_ENGINES) {
      expect(engine.previewLines).toBeGreaterThan(0);
      expect(engine.previewLines).toBeLessThanOrEqual(3);
      expect(engine.unlocks.length).toBeGreaterThan(1);
    }
  });

  it("has no duplicate routes", () => {
    const routes = PREMIUM_ENGINES.map((e) => e.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("matches routes with a trailing slash and a query string", () => {
    expect(isPremiumEngineRoute("/steel-beam-calculator/")).toBe(true);
    expect(isPremiumEngineRoute("/concrete-takeoff-calculator?x=1")).toBe(true);
    expect(isPremiumEngineRoute("/paint-calculator")).toBe(false);
    expect(premiumEngineFor("/paint-calculator")).toBeNull();
  });

  it("leaves ordinary finishing tools open", () => {
    const access = engineAccessFor("/paint-calculator", free);
    expect(access.engine).toBeNull();
    expect(access.limited).toBe(false);
    expect(access.canExport).toBe(true);
  });
});

describe("engineAccessFor", () => {
  it("shows a free visitor the preview and no export", () => {
    const access = engineAccessFor("/steel-beam-calculator", free);
    expect(access.engine?.name).toBe("Steel beam sizing");
    expect(access.limited).toBe(true);
    expect(access.visibleLines).toBe(2);
    expect(access.canExport).toBe(false);
  });

  it("counts the rows withheld from a real result", () => {
    const access = engineAccessFor("/concrete-takeoff-calculator", free);
    expect(access.hiddenLines(9)).toBe(6);
    expect(access.hiddenLines(2)).toBe(0);
  });

  it("gives a signed out visitor the same preview, never more", () => {
    const signedOut = engineAccessFor("/reinforcement", { isPaid: false });
    expect(signedOut.limited).toBe(true);
    expect(signedOut.visibleLines).toBe(2);
  });

  it("never hides work while the account state is still unknown", () => {
    expect(engineAccessFor("/reinforcement", null).limited).toBe(false);
    expect(engineAccessFor("/reinforcement", {}).limited).toBe(false);
  });

  it("lifts every limit for a paid plan", () => {
    const access = engineAccessFor("/earthworks-cut-fill", {
      isPaid: true,
      isAdmin: false,
    });
    expect(access.limited).toBe(false);
    expect(access.canExport).toBe(true);
    expect(access.visibleLines).toBe(Number.POSITIVE_INFINITY);
  });

  it("lifts every limit for an admin checking the tool", () => {
    const access = engineAccessFor("/retaining-wall-calculator", {
      isPaid: false,
      isAdmin: true,
    });
    expect(access.limited).toBe(false);
    expect(access.canExport).toBe(true);
  });
});
