import { describe, it, expect } from "vitest";

describe("ai types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/ai");
    expect(mod).toBeDefined();
  });
});
