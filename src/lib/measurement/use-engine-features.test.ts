import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => { vi.clearAllMocks(); });

describe("use-engine-features", () => {
  it("module exports something", async () => {
    const mod = await import("@/lib/measurement/use-engine-features");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
