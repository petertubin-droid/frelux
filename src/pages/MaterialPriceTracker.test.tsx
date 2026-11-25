import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

const pageMocks = vi.hoisted(() => ({
  seoCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/seo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/seo")>();
  return {
    ...actual,
    useSeo: (config: Record<string, unknown> | null) => {
      if (config) pageMocks.seoCalls.push(config);
      return actual.useSeo(config as never);
    },
  };
});

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  pageMocks.seoCalls.length = 0;
});

async function renderPage() {
  const Comp = (await import("@/pages/MaterialPriceTracker")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("MaterialPriceTracker", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("is indexable and does not set noIndex robots directives", async () => {
    pageMocks.seoCalls.length = 0;
    await renderPage();

    const call = pageMocks.seoCalls.find(
      (c) => c.canonicalPath === "/material-prices",
    );
    expect(call).toBeTruthy();
    expect(call?.noIndex).toBeFalsy();
  });
});
