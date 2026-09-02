import { describe, it, expect } from "vitest";

describe("measurement index", () => {
  it("exports measurement functions", async () => {
    const mod = await import("@/lib/measurement/index");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
