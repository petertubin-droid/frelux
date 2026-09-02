import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => { vi.clearAllMocks(); });

describe("market-context", () => {
  it("module exports something", async () => {
    const mod = await import("@/lib/international/market-context");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
