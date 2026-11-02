import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("AiProjectPanel", () => {
  it("module exports something", async () => {
    const mod = await import("@/components/ai/AiProjectPanel");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
