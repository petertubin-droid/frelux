import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ConvertedTotal from "./ConvertedTotal";

const liveTable = {
  source: "database" as const,
  fetchedAt: "2026-10-30T17:20:14Z",
  quotes: [
    {
      base: "USD",
      quote: "NGN",
      rate: 1346.223823,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
  ],
};

const bundled = {
  source: "bundled" as const,
  fetchedAt: "2026-10-30T17:20:14Z",
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
      screen.getByText(/1 USD = 1,346.22 NGN as of 30 Oct 2026 17:20 UTC/),
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
