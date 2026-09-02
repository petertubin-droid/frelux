import { describe, it, expect } from "vitest";

describe("international index", () => {
  it("exports international functions", async () => {
    const mod = await import("@/lib/international/index");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
