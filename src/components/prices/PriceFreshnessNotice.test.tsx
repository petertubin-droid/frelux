import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PriceFreshnessNotice from "./PriceFreshnessNotice";
import { summariseFreshness } from "@/lib/prices/freshness";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

describe("PriceFreshnessNotice", () => {
  it("states the age of fresh prices without nagging", () => {
    render(<PriceFreshnessNotice rows={[{ updated_at: daysAgo(3) }]} />);
    expect(screen.getByRole("note")).toHaveTextContent(
      /last updated 3 days ago/i,
    );
    expect(
      screen.queryByText(/confirm with a local supplier/i),
    ).not.toBeInTheDocument();
  });

  it("asks for verification when the prices are stale", () => {
    render(<PriceFreshnessNotice rows={[{ updated_at: daysAgo(140) }]} />);
    expect(screen.getByRole("note")).toHaveTextContent(
      /confirm with a local supplier/i,
    );
  });

  it("admits when the rows carry no date", () => {
    render(<PriceFreshnessNotice rows={[{ updated_at: null }]} />);
    expect(screen.getByRole("note")).toHaveTextContent(/no update date/i);
    expect(screen.getByRole("note")).toHaveTextContent(
      /confirm current prices/i,
    );
  });

  it("accepts a prepared summary instead of rows", () => {
    render(
      <PriceFreshnessNotice
        summary={summariseFreshness(
          [{ updated_at: daysAgo(2), last_updated_via: "crowdsourced" }],
          new Date(),
        )}
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(/community reports/i);
  });

  it("renders nothing when there is nothing to say", () => {
    const { container } = render(<PriceFreshnessNotice />);
    expect(container).toBeEmptyDOMElement();
  });
});
