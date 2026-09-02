import { describe, it, expect } from "vitest";

describe("international types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/international");
    expect(mod).toBeDefined();
  });
});
