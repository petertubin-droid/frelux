import { describe, it, expect } from "vitest";

describe("crawler types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/crawler");
    expect(mod).toBeDefined();
  });
});
