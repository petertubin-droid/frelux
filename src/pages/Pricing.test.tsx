import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
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

beforeEach(() => {
  vi.clearAllMocks();
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

  it("never shows naira amounts on the pricing cards", async () => {
    const { container } = await renderPage();
    const cards = container.textContent ?? "";
    expect(cards).toContain("$4.99");
    // The settlement note is naira-by-name only; no naira symbol prices.
    expect(cards).not.toContain("₦");
  });
});
