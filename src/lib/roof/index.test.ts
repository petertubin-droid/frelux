import { describe, it, expect } from "vitest";

describe("roof index", () => {
  it("exports roof functions", async () => {
    const mod = await import("@/lib/roof/index");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
