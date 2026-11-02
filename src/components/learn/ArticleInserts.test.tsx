import { describe, it, expect } from "vitest";

describe("ArticleInserts", () => {
  it("imports and exports a usable API", async () => {
    const mod = await import("@/components/learn/ArticleInserts");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });
});
