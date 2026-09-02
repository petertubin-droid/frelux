import { describe, it, expect } from "vitest";

describe("marketplace types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/marketplace");
    expect(mod).toBeDefined();
  });
});
