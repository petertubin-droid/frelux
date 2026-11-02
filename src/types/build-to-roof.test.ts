import { describe, it, expect } from "vitest";

describe("build-to-roof types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/build-to-roof");
    expect(mod).toBeDefined();
  });
});
