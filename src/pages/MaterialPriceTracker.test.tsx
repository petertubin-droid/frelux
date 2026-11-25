import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

const seoCalls: Array<Record<string, unknown>> = [];
vi.mock("@/lib/seo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/seo")>();
  return {
    ...actual,
    useSeo: (config: Record<string, unknown> | null) => {
      if (config) seoCalls.push(config);
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
  seoCalls.length = 0;
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

  it("is indexable by search engines and does not enforce noIndex", async () => {
    await renderPage();
    const trackerCall = seoCalls.find(
      (c) => c.canonicalPath === "/material-prices",
    );
    expect(trackerCall).toBeTruthy();
    expect(trackerCall?.noIndex).toBeFalsy();
  });
});
