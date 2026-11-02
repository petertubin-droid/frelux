import { describe, it, expect } from "vitest";

describe("pro-connect types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/pro-connect");
    expect(mod).toBeDefined();
  });
});
