import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({ getCreditWallet: vi.fn().mockResolvedValue(null), getActivityStreak: vi.fn().mockResolvedValue(null), recordActivity: vi.fn().mockResolvedValue(true), REWARD_EVENTS: {} }));
vi.mock("@/lib/queries", () => ({ logAnalyticsEvent: vi.fn().mockResolvedValue(null), fetchTileSizes: vi.fn().mockResolvedValue({ data: [], error: null }), fetchTileMaterials: vi.fn().mockResolvedValue({ data: [], error: null }), fetchSiteSettings: vi.fn().mockResolvedValue({ data: null, error: null }), saveUserProject: vi.fn().mockResolvedValue({ data: null, error: null }) }));
vi.mock("@/lib/labour", () => ({ fetchLabourSettings: vi.fn().mockResolvedValue(null), calculateLabourCost: vi.fn().mockReturnValue(0), useLabourConfig: vi.fn(() => ({ config: { includeLabour: false, pricingMethod: "fixed", fixedAmount: 0, perSqmRate: 0, perRoomRate: 0, roomCount: 1, dailyRate: 0, dayCount: 1, customAmount: 0, categoryId: null }, setConfig: vi.fn() })), DEFAULT_LABOUR_CONFIG: { includeLabour: false, pricingMethod: "fixed", fixedAmount: 0, perSqmRate: 0, perRoomRate: 0, roomCount: 1, dailyRate: 0, dayCount: 1, customAmount: 0, categoryId: null }, PRICING_METHOD_LABELS: { fixed: "Fixed", perSqm: "Per sqm", perRoom: "Per room", daily: "Daily", custom: "Custom" } }));

beforeEach(() => { vi.clearAllMocks(); });

async function renderPage() {
  const Comp = (await import("@/pages/TileCostEstimator")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("TileCostEstimator", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});
