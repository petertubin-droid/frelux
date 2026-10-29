import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/international/market-context", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/international/market-context")>();
  return {
    ...actual,
    useMarket: () => ({ market: { marketCode: marketState.code } }),
  };
});
vi.mock("@/lib/subscription-pricing", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/subscription-pricing")>();
  return {
    ...actual,
    loadLocalSubscriptionPrices: vi.fn(async () => localRowsState),
  };
});

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

const marketState = { code: "US" };
const localRowsState: {
  market_code: string;
  plan: string;
  billing_cycle: string;
  currency: string;
  price_minor: number;
}[] = [];

const NG_ROWS = [
  {
    market_code: "NG",
    plan: "pro",
    billing_cycle: "monthly",
    currency: "NGN",
    price_minor: 500000,
  },
  {
    market_code: "NG",
    plan: "pro",
    billing_cycle: "yearly",
    currency: "NGN",
    price_minor: 5000000,
  },
  {
    market_code: "NG",
    plan: "premium",
    billing_cycle: "monthly",
    currency: "NGN",
    price_minor: 1500000,
  },
  {
    market_code: "NG",
    plan: "premium",
    billing_cycle: "yearly",
    currency: "NGN",
    price_minor: 15000000,
  },
  {
    market_code: "NG",
    plan: "enterprise",
    billing_cycle: "monthly",
    currency: "NGN",
    price_minor: 5000000,
  },
  {
    market_code: "NG",
    plan: "enterprise",
    billing_cycle: "yearly",
    currency: "NGN",
    price_minor: 50000000,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  marketState.code = "US";
  localRowsState.length = 0;
});

async function renderPage() {
  const Comp = (await import("@/pages/Pricing")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Pricing", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

describe("Pricing, USD plans and billing toggle", () => {
  it("shows monthly dollar prices by default", async () => {
    const { getByTestId } = await renderPage();
    expect(getByTestId("plan-price-free").textContent).toBe("$0");
    expect(getByTestId("plan-price-pro").textContent).toBe("$4.99");
    expect(getByTestId("plan-price-premium").textContent).toBe("$9.99");
    expect(getByTestId("plan-price-enterprise").textContent).toBe("$49.99");
  });

  it("switches every card to annual prices when Yearly is selected", async () => {
    const { getByTestId, getByRole, container } = await renderPage();
    fireEvent.click(getByRole("tab", { name: /yearly/i }));
    expect(getByTestId("plan-price-pro").textContent).toBe("$49.99");
    expect(getByTestId("plan-price-premium").textContent).toBe("$99.99");
    expect(getByTestId("plan-price-enterprise").textContent).toBe("$499.99");
    expect(getByTestId("plan-price-free").textContent).toBe("$0");
    // The toggle is a real state change, not a label swap on one card.
    expect(container.textContent).toContain("/yr");
  });

  it("marks Premium as Most Popular and no other plan", async () => {
    const { getAllByText, container } = await renderPage();
    expect(getAllByText("Most Popular")).toHaveLength(1);
    const badge = getAllByText("Most Popular")[0];
    const card = badge.closest("div.relative");
    expect(card?.textContent).toContain("Premium");
  });

  it("shows dollar prices to a dollar market, with no naira on the cards", async () => {
    const { container } = await renderPage();
    const cards = container.textContent ?? "";
    expect(cards).toContain("$4.99");
    expect(cards).not.toContain("₦");
  });

  it("keeps the Nigerian naira list, with no dollar anchor on the cards", async () => {
    marketState.code = "NG";
    localRowsState.push(...NG_ROWS);
    const { getByTestId, queryByTestId, container } = await renderPage();
    await vi.waitFor(() => {
      expect(getByTestId("plan-price-pro").textContent).toContain("5,000");
    });
    expect(getByTestId("plan-price-pro").getAttribute("data-currency")).toBe(
      "NGN",
    );
    expect(container.textContent).toContain("15,000");
    expect(container.textContent).toContain("50,000");
    // Nigeria's list is the naira price, not a dollar conversion.
    expect(queryByTestId("plan-usd-pro")).toBeNull();
  });
});
