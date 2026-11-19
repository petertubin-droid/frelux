import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isAdmin: false })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

const emptyChain: Record<string, unknown> = {};
for (const method of [
  "select",
  "eq",
  "order",
  "limit",
  "in",
  "is",
  "not",
  "match",
]) {
  emptyChain[method] = vi.fn(() => emptyChain);
}
emptyChain.then = (resolve: (value: unknown) => unknown) =>
  resolve({ data: [], error: null });
emptyChain.maybeSingle = vi.fn(() =>
  Promise.resolve({ data: null, error: null }),
);
emptyChain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => emptyChain),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe() {} } },
      })),
    },
  },
}));
vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(() => Promise.resolve({ from: vi.fn(() => emptyChain) })),
  isSupabaseConfigured: false,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IcfWallEstimator page", () => {
  it("renders its heading and core controls for a visitor", async () => {
    const { default: Page } = await import("@/pages/IcfWallEstimator");
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    const normalise = (value: string) => value.replace(/\s+/g, " ").trim();
    await screen.findAllByRole("heading");
    const bodyText = normalise(document.body.textContent || "");
    expect(bodyText).toContain("ICF Wall Estimator");
    expect(bodyText).toContain("Wall Geometry & Core Specification");
    expect(bodyText).toContain("Reinforcing Steel Grid Specification");
    expect(bodyText).toContain("Concrete Core Volume");
    expect(bodyText).toContain("Total ICF Blocks");
    expect(bodyText).toContain("Itemized Bill of Quantities (BOQ)");
    expect(bodyText).toContain("Structural Code Citations");
  });
});
