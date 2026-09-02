import { describe, it, expect } from "vitest";

describe("marketplace-products types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/marketplace-products");
    expect(mod).toBeDefined();
  });
});
