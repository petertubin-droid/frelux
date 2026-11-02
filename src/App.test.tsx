import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
  AuthProvider: ({ children }: { children?: ReactNode }) => children,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("App", () => {
  it("module is importable", async () => {
    const mod = await import("@/App");
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });
});
