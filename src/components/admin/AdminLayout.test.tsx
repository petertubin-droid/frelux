import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("AdminLayout", () => {
  it("module exports something", async () => {
    const mod = await import("@/components/admin/AdminLayout");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
