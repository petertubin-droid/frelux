import { describe, it, expect } from "vitest";

describe("page-fetcher", () => {
  it("exports fetchPage function", async () => {
    const mod = await import("@/lib/market-intelligence/crawler/page-fetcher");
    expect(typeof mod.fetchPage).toBe("function");
  });
});
