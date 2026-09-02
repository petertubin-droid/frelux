import { describe, it, expect } from "vitest";

describe("market-intelligence types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/market-intelligence");
    expect(mod).toBeDefined();
  });
});
