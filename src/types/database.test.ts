import { describe, it, expect } from "vitest";

describe("database types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/database");
    expect(mod).toBeDefined();
  });
});
