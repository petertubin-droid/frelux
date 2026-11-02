import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

describe("crawler-client", () => {
  it("exports triggerCrawl function", async () => {
    const mod = await import("@/lib/market-intelligence/crawler/crawler-client");
    expect(typeof mod.triggerCrawl).toBe("function");
  });

  it("exports enableFreluxCrawler function", async () => {
    const mod = await import("@/lib/market-intelligence/crawler/crawler-client");
    expect(typeof mod.enableFreluxCrawler).toBe("function");
  });

  it("exports disableFreluxCrawler function", async () => {
    const mod = await import("@/lib/market-intelligence/crawler/crawler-client");
    expect(typeof mod.disableFreluxCrawler).toBe("function");
  });
});
