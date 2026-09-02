import { describe, it, expect } from "vitest";

describe("index types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/index");
    expect(mod).toBeDefined();
  });
});
