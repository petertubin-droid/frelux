import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useMarketMock = vi.fn();
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => useMarketMock(),
}));

import MarketScopeNotice from "./MarketScopeNotice";

describe("MarketScopeNotice", () => {
  it("renders nothing for the Nigerian market", () => {
    useMarketMock.mockReturnValue({ marketCode: "NG" });
    const { container } = render(<MarketScopeNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("warns non-NG visitors that the estimator models Nigerian practice", () => {
    useMarketMock.mockReturnValue({ marketCode: "GB" });
    render(<MarketScopeNotice />);
    expect(screen.getByTestId("market-scope-notice")).toHaveTextContent(
      "Nigerian construction practice",
    );
  });
});
