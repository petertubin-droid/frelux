import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

beforeEach(() => { vi.clearAllMocks(); });

describe("FoundationCalculator", () => {
  it("module is importable", async () => {
    const mod = await import("@/pages/FoundationCalculator");
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });
});
