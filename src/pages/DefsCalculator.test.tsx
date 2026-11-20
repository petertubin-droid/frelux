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

const normalise = (value: string) => value.replace(/\s+/g, " ").trim();

async function renderPage() {
  const { default: Page } = await import("@/pages/DefsCalculator");
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
  await screen.findAllByRole("heading");
  return normalise(document.body.textContent || "");
}

describe("DefsCalculator page", () => {
  it("renders the DEFS heading, the system switcher and the substrate choice", async () => {
    const body = await renderPage();
    expect(body).toContain(
      "DEFS (Direct-Applied Exterior Finish System) Material & Cost Calculator",
    );
    expect(body).toContain("EIFS (with foam insulation)");
    expect(body).toContain("DEFS (direct-applied, no foam)");
    expect(body).toContain("Cement sheathing board");
    expect(body).toContain("Concrete block / masonry");
  });

  it("shows the measured quantities and the no-insulation disclosure", async () => {
    const body = await renderPage();
    expect(body).toContain("Net wall area");
    expect(body).toContain("Board screws");
    expect(body).toContain("Mesh (10% overlap)");
    expect(body).toContain("Base coat");
    expect(body).toContain("no continuous R-value");
  });

  it("answers the DEFS vs EIFS comparison in the About block", async () => {
    const body = await renderPage();
    expect(body).toContain("DEFS vs EIFS");
    expect(body).toContain("What is the difference between DEFS and EIFS?");
    expect(body).toContain(
      "Can DEFS be applied directly over concrete block or masonry?",
    );
  });
});
