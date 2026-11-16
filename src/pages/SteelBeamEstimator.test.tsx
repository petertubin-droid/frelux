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

describe("SteelBeamEstimator", () => {
  it("renders its heading for a signed-out visitor", async () => {
    const { default: Page } = await import("@/pages/SteelBeamEstimator");
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    // Headings split their words across spans, so match the page text with
    // whitespace collapsed rather than a single text node.
    const normalise = (value: string) => value.replace(/\s+/g, " ").trim();
    await screen.findAllByRole("heading");
    expect(normalise(document.body.textContent || "")).toContain("I-Beam");
  });

  it("shows one related row and one disclaimer, not the page's own plus the shell's", async () => {
    const { default: Page } = await import("@/pages/SteelBeamEstimator");
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    await screen.findAllByRole("heading");

    // The shell owns both. Counting by class and by link target, because the
    // disclaimer text differs between the page's copy and the catalogue's, so
    // matching words would miss a duplicate that differing wording hides.
    expect(document.querySelectorAll(".disclaimer-premium")).toHaveLength(1);

    const toReinforcement = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/reinforcement");
    expect(toReinforcement).toHaveLength(1);

    // The curated links still reach the page, through the shell's row.
    expect(screen.getByText("Reinforcement estimator")).toBeTruthy();
    expect(screen.getByText("Structural calculator")).toBeTruthy();
  });
});
