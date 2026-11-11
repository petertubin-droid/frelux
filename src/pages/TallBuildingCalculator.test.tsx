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

describe("TallBuildingCalculator", () => {
  it("renders its heading for a signed-out visitor", async () => {
    const { default: Page } = await import("@/pages/TallBuildingCalculator");
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    // Headings split their words across spans, so match the page text with
    // whitespace collapsed rather than a single text node.
    const normalise = (value: string) => value.replace(/\s+/g, " ").trim();
    await screen.findAllByRole("heading");
    expect(normalise(document.body.textContent || "")).toContain(
      "Skyscraper Structure",
    );
  });

  it("offers the 20 illustrative tower presets and does not warn on default inputs", async () => {
    const { default: Page } = await import("@/pages/TallBuildingCalculator");
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    await screen.findAllByRole("heading");

    const presets = screen
      .getAllByRole("button")
      .filter((button) =>
        /illustrative|skyscraper|high-rise|storey|megatall/i.test(
          button.textContent || "",
        ),
      );
    expect(presets.length).toBeGreaterThanOrEqual(20);

    expect(screen.queryByText(/Some inputs were normalized/i)).toBeNull();
  });
});
