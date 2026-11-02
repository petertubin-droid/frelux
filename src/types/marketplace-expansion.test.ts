import { describe, it, expect } from "vitest";

describe("marketplace-expansion types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/marketplace-expansion");
    expect(mod).toBeDefined();
  });
});
