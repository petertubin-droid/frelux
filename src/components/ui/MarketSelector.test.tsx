import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketSelector } from "@/components/ui/MarketSelector";

// ── Mock the international module with a controllable market list ──
const mockSetMarket = vi.fn();
const mockUseMarket = vi.fn();

vi.mock("@/lib/international", () => ({
  useMarket: (...args: unknown[]) => mockUseMarket(...args),
}));

function setAvailableMarkets(markets: Array<Record<string, unknown>>) {
  mockUseMarket.mockReturnValue({
    market: {
      marketCode: "NG",
      countryName: "Nigeria",
      currencyCode: "NGN",
      currencySymbol: "₦",
      status: "active",
    },
    marketCode: "NG",
    availableMarkets: markets,
    setMarket: mockSetMarket,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: only Nigeria visible (single-market behavior)
  setAvailableMarkets([
    {
      country_code: "NG",
      country_name: "Nigeria",
      currency_code: "NGN",
      currency_symbol: "₦",
      status: "active",
    },
  ]);
});

describe("MarketSelector", () => {
  it("renders nothing when only one market is visible (preserves existing UI)", () => {
    const { container } = render(<MarketSelector />);
    expect(container.innerHTML).toBe("");
  });

  it("renders when two or more markets are visible", () => {
    setAvailableMarkets([
      {
        country_code: "NG",
        country_name: "Nigeria",
        currency_code: "NGN",
        currency_symbol: "₦",
        status: "active",
      },
      {
        country_code: "GH",
        country_name: "Ghana",
        currency_code: "GHS",
        currency_symbol: "₵",
        status: "active",
      },
    ]);
    const { container } = render(<MarketSelector />);
    expect(container.innerHTML).not.toBe("");
  });

  it("lists markets when opened (inline variant)", () => {
    setAvailableMarkets([
      {
        country_code: "NG",
        country_name: "Nigeria",
        currency_code: "NGN",
        currency_symbol: "₦",
        status: "active",
      },
      {
        country_code: "GH",
        country_name: "Ghana",
        currency_code: "GHS",
        currency_symbol: "₵",
        status: "active",
      },
    ]);
    render(<MarketSelector inline />);
    fireEvent.click(screen.getByLabelText("Change market"));
    expect(screen.getByText("Nigeria")).toBeTruthy();
    expect(screen.getByText("Ghana")).toBeTruthy();
  });

  it("calls setMarket with the selected market code", () => {
    setAvailableMarkets([
      {
        country_code: "NG",
        country_name: "Nigeria",
        currency_code: "NGN",
        currency_symbol: "₦",
        status: "active",
      },
      {
        country_code: "GH",
        country_name: "Ghana",
        currency_code: "GHS",
        currency_symbol: "₵",
        status: "active",
      },
    ]);
    render(<MarketSelector inline />);
    fireEvent.click(screen.getByLabelText("Change market"));
    const ghanaBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Ghana"));
    expect(ghanaBtn).toBeTruthy();
    fireEvent.click(ghanaBtn!);
    expect(mockSetMarket).toHaveBeenCalledWith("GH");
  });

  it("disables coming-soon markets and does not call setMarket", () => {
    setAvailableMarkets([
      {
        country_code: "NG",
        country_name: "Nigeria",
        currency_code: "NGN",
        currency_symbol: "₦",
        status: "active",
      },
      {
        country_code: "KE",
        country_name: "Kenya",
        currency_code: "KES",
        currency_symbol: "KSh",
        status: "coming_soon",
      },
    ]);
    render(<MarketSelector inline />);
    fireEvent.click(screen.getByLabelText("Change market"));
    const kenyaBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Kenya"));
    expect(kenyaBtn).toBeTruthy();
    expect(kenyaBtn!.hasAttribute("disabled")).toBe(true);
    fireEvent.click(kenyaBtn!);
    expect(mockSetMarket).not.toHaveBeenCalled();
  });

  it("renders compact dropdown variant without crashing", () => {
    setAvailableMarkets([
      {
        country_code: "NG",
        country_name: "Nigeria",
        currency_code: "NGN",
        currency_symbol: "₦",
        status: "active",
      },
      {
        country_code: "GH",
        country_name: "Ghana",
        currency_code: "GHS",
        currency_symbol: "₵",
        status: "active",
      },
    ]);
    const { container } = render(<MarketSelector compact />);
    expect(container.innerHTML).not.toBe("");
  });
});
