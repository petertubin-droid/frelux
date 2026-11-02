import { describe, it, expect } from "vitest";

describe("crawl-engine", () => {
  it("exports executeCrawl function", async () => {
    const mod = await import("@/lib/market-intelligence/crawler/crawl-engine");
    expect(typeof mod.executeCrawl).toBe("function");
  });
});
