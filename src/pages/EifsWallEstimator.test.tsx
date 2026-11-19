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

describe("EifsWallEstimator page", () => {
  it("renders its heading and core controls for a visitor", async () => {
    const { default: Page } = await import("@/pages/EifsWallEstimator");
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    const normalise = (value: string) => value.replace(/\s+/g, " ").trim();
    await screen.findAllByRole("heading");
    const bodyText = normalise(document.body.textContent || "");
    expect(bodyText).toContain("EIFS / ETICS Wall Estimator & Takeoff");
    expect(bodyText).toContain("Wall Geometry & Substrate Backing");
    expect(bodyText).toContain("Insulation & Synthetic Finish Coating");
    expect(bodyText).toContain("Continuous ci R-Value");
    expect(bodyText).toContain("Insulation Boards");
    expect(bodyText).toContain("Itemized Bill of Quantities (BOQ)");
    expect(bodyText).toContain("Structural & Energy Code Citations");
  });
});
