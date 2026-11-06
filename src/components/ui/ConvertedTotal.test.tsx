import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ConvertedTotal from "./ConvertedTotal";

// Rates refuse to convert once they are 7 days old, so the fixture is
// dated relative to now instead of to the day it was written.
const RECENT = new Date(Date.now() - 60_000).toISOString();

const liveTable = {
  source: "database" as const,
  fetchedAt: RECENT,
  quotes: [
    {
      base: "USD",
      quote: "NGN",
      rate: 1346.223823,
      provider: "open.er-api.com",
      fetchedAt: RECENT,
    },
  ],
};

const bundled = {
  source: "bundled" as const,
  fetchedAt: RECENT,
  quotes: liveTable.quotes,
};

let state = {
  table: liveTable as typeof liveTable | typeof bundled | null,
  error: null as string | null,
};
vi.mock("@/lib/currency/use-currency", () => ({
  useRateTable: () => ({
    table: state.table,
    error: state.error,
    loading: false,
    refreshedAt: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/currency/active-currency", () => ({
  activeCurrencyCode: () => "USD",
  preferredDisplayCurrency: () => "NGN",
}));

describe("ConvertedTotal", () => {
  it("shows the converted figure with its rate and timestamp", () => {
    state = { table: liveTable, error: null };
    render(<ConvertedTotal amount={2500} />);
    expect(screen.getByText(/3,365,559.56/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /1 USD = 1,346\.22 NGN as of \d{1,2} \w{3} \d{4} \d{2}:\d{2} UTC/,
      ),
    ).toBeInTheDocument();
  });

  it("says the figure is not a local material price", () => {
    state = { table: liveTable, error: null };
    render(<ConvertedTotal amount={2500} />);
    expect(
      screen.getByText(/not the price of materials in NGN/),
    ).toBeInTheDocument();
  });

  it("warns when a saved rate was used", () => {
    state = { table: bundled, error: "network down" };
    render(<ConvertedTotal amount={2500} />);
    expect(screen.getByText(/Live rates were unavailable/)).toBeInTheDocument();
  });

  it("renders nothing without a rate table", () => {
    state = { table: null, error: null };
    const { container } = render(<ConvertedTotal amount={2500} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses no em dashes in its copy", () => {
    state = { table: liveTable, error: null };
    const { container } = render(<ConvertedTotal amount={2500} />);
    expect(container.textContent).not.toContain("—");
  });
});
