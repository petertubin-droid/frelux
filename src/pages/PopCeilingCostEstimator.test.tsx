import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/queries", () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(null),
  fetchPopMaterials: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchSiteSettings: vi.fn().mockResolvedValue({ data: null, error: null }),
  saveUserProject: vi.fn().mockResolvedValue({ data: null, error: null }),
}));
vi.mock("@/lib/labour", () => ({
  fetchLabourCategories: vi.fn().mockResolvedValue([]),
  createInitialLabourConfig: vi.fn(() => ({
    includeLabour: false,
    pricingMethod: "fixed",
    fixedAmount: 0,
    perSqmRate: 0,
    perRoomRate: 0,
    roomCount: 1,
    dailyRate: 0,
    dayCount: 1,
    customAmount: 0,
    categoryId: null,
  })),
  fetchLabourSettings: vi.fn().mockResolvedValue(null),
  calculateLabourCost: vi.fn().mockReturnValue(0),
  useLabourConfig: vi.fn(() => ({
    config: {
      includeLabour: false,
      pricingMethod: "fixed",
      fixedAmount: 0,
      perSqmRate: 0,
      perRoomRate: 0,
      roomCount: 1,
      dailyRate: 0,
      dayCount: 1,
      customAmount: 0,
      categoryId: null,
    },
    setConfig: vi.fn(),
  })),
  DEFAULT_LABOUR_CONFIG: {
    includeLabour: false,
    pricingMethod: "fixed",
    fixedAmount: 0,
    perSqmRate: 0,
    perRoomRate: 0,
    roomCount: 1,
    dailyRate: 0,
    dayCount: 1,
    customAmount: 0,
    categoryId: null,
  },
  PRICING_METHOD_LABELS: {
    fixed: "Fixed",
    perSqm: "Per sqm",
    perRoom: "Per room",
    daily: "Daily",
    custom: "Custom",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/PopCeilingCostEstimator")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("PopCeilingCostEstimator", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("asks for the crew, because the platform board follows it", async () => {
    await renderPage();
    // The calculator body renders after the material set resolves, so wait for
    // the field rather than assuming it is there on first paint.
    const workers = await screen.findByLabelText("Workers on site");
    // A solo fitter is a real job, so the field starts at one and cannot go
    // below it: half a board is the floor, not zero.
    expect(workers).toHaveValue(1);

    fireEvent.change(workers, { target: { value: "0" } });
    await waitFor(() => expect(workers).toHaveValue(1));

    fireEvent.change(workers, { target: { value: "3" } });
    await waitFor(() => expect(workers).toHaveValue(3));
  });

  it("asks for the days on site, because hire is billed by the day", async () => {
    await renderPage();
    const days = await screen.findByLabelText("Days on site");
    // One day is the shortest real job, so it starts there and cannot fall to
    // zero: a hire that costs nothing is not a hire.
    expect(days).toHaveValue(1);

    fireEvent.change(days, { target: { value: "0" } });
    await waitFor(() => expect(days).toHaveValue(1));

    fireEvent.change(days, { target: { value: "5" } });
    await waitFor(() => expect(days).toHaveValue(5));
  });
});
