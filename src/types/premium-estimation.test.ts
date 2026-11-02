import { describe, it, expect } from "vitest";

describe("premium-estimation types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/premium-estimation");
    expect(mod).toBeDefined();
  });
});
