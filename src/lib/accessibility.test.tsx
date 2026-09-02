import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => { vi.clearAllMocks(); });

describe("accessibility", () => {
  it("module exports something", async () => {
    const mod = await import("@/lib/accessibility");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
