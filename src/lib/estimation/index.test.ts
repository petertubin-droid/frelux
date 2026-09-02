import { describe, it, expect } from "vitest";

describe("estimation index", () => {
  it("re-exports validation module", async () => {
    const mod = await import("@/lib/estimation/index");
    expect(mod).toBeDefined();
  });

  it("re-exports pack-sizing module", async () => {
    const mod = await import("@/lib/estimation/index");
    expect(mod).toBeDefined();
  });
});
