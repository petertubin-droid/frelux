import { describe, it, expect } from "vitest";

describe("market-intelligence index", () => {
  it("exports market intelligence functions", async () => {
    const mod = await import("@/lib/market-intelligence/index");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
