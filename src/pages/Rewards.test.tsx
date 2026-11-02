import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
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
vi.mock("@/lib/token-purchase", () => ({
  getTokenPurchaseConfig: vi.fn().mockResolvedValue(null),
  getTokenPurchasePrices: vi.fn().mockResolvedValue([]),
  resolveTokenCharge: vi.fn((kobo: number) => ({
    mode: "naira",
    currency: "NGN",
    priceMinor: kobo,
  })),
  initializeTokenPurchase: vi.fn().mockResolvedValue({ success: false }),
  verifyTokenPurchase: vi.fn().mockResolvedValue({ verified: false }),
  formatNaira: vi.fn((kobo: number) => `₦${kobo / 100}`),
  formatTokenPriceForDisplay: vi.fn((kobo: number) => `₦${kobo / 100}`),
  tokenPriceDisclosure: vi.fn(() => null),
}));
vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: vi.fn(() => ({
    code: "NGN",
    symbol: "₦",
    converting: false,
    rateConfigured: vi.fn(() => false),
    rateDescription: null,
    config: null,
    setCurrency: vi.fn(),
  })),
}));
vi.mock("@/lib/ad-config", () => ({
  hasRewardedAdProvider: vi.fn().mockResolvedValue(false),
  fetchAdConfig: vi.fn().mockResolvedValue({ providers: [], placements: [] }),
  REWARDED_AD_BRIDGES: {},
}));

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/Rewards")).default;
  const { CreditsProvider } = await import("@/lib/credits-context");
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CreditsProvider>
          <Comp />
        </CreditsProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Rewards", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});
