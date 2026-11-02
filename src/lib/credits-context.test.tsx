import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => { vi.clearAllMocks(); });

describe("credits-context", () => {
  it("module exports something", async () => {
    const mod = await import("@/lib/credits-context");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
