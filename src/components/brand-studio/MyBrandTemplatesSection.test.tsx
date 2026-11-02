import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("MyBrandTemplatesSection", () => {
  it("module exports something", async () => {
    const mod = await import("@/components/brand-studio/MyBrandTemplatesSection");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
