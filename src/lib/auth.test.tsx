import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => { vi.clearAllMocks(); });

describe("auth", () => {
  it("module exports something", async () => {
    const mod = await import("@/lib/auth");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
