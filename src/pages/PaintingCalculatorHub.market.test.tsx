import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PaintingCalculatorHub from "@/pages/PaintingCalculatorHub";

const market = { marketCode: "NG" };

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => market,
  DEFAULT_MARKET_CODE: "NG",
  uiLocaleFor: () => "en-NG",
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key, language: "en" }),
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

vi.mock("@/components/tools/ToolShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/WorkWeatherBanner", () => ({
  WorkWeatherBanner: () => null,
}));

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

vi.mock("@/components/ui/CalculatorTabs", () => ({
  default: () => null,
}));

vi.mock("@/pages/PaintCalculator", () => ({ default: () => null }));
vi.mock("@/pages/CostEstimator", () => ({ default: () => null }));
vi.mock("@/pages/PaintingEstimator", () => ({ default: () => null }));

function renderHub() {
  return render(
    <MemoryRouter>
      <PaintingCalculatorHub />
    </MemoryRouter>,
  );
}

describe("PaintingCalculatorHub market copy", () => {
  it("names the shelf the market sells and flags an unchecked shelf", () => {
    market.marketCode = "NG";
    renderHub();
    expect(screen.getAllByText(/1 L, 4 L, 20 L/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/No retail listing has been checked for this market/i),
    ).toBeInTheDocument();
  });

  it("quotes gallon cans to a US visitor and promises no unchecked shelf", () => {
    market.marketCode = "US";
    const { unmount } = renderHub();
    expect(screen.getAllByText(/1 qt, 1 gal, 5 gal/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/No retail listing has been checked/i),
    ).not.toBeInTheDocument();
    unmount();
  });

  it("quotes litre tins to a UK visitor", () => {
    market.marketCode = "GB";
    renderHub();
    expect(screen.getAllByText(/1 L, 2.5 L, 5 L/).length).toBeGreaterThan(0);
    expect(screen.getByText(/tins you need/)).toBeInTheDocument();
  });

  it("does not claim a local price book where the copy cannot know of one", () => {
    market.marketCode = "NG";
    renderHub();
    expect(
      screen.queryByText(/tuned for real market conditions with local/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/engine defaults are used and the result says so/i),
    ).toBeInTheDocument();
  });
});
