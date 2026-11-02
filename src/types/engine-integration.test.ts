import { describe, it, expect } from "vitest";

describe("engine-integration types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/engine-integration");
    expect(mod).toBeDefined();
  });
});
