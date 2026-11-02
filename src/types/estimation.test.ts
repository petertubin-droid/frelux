import { describe, it, expect } from "vitest";

describe("estimation types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/estimation");
    expect(mod).toBeDefined();
  });
});
