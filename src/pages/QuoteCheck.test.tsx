/**
 * Quote Check page tests.
 *
 * The comparison arithmetic is covered by quote-check-engine.test.ts. These
 * pin the page wiring: the price book is the only reference source, a line
 * without a reference is never judged, and the summary reflects the engine.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuoteCheck from "./QuoteCheck";

const mappings = vi.hoisted(() => [
  {
    market: "NG",
    role: "cement" as const,
    material_slug: "cement-50kg",
    display_name: "Cement 50kg",
    unit_label: "bag",
    notes: null,
  },
  {
    market: "NG",
    role: "sand" as const,
    material_slug: "sharp-sand",
    display_name: "Sharp sand",
    unit_label: "m3",
    notes: null,
  },
]);

vi.mock("@/lib/estimation/market-materials", () => ({
  fetchMarketRoleMappings: vi.fn().mockResolvedValue(mappings),
  resolveMaterialPriceByRole: vi.fn().mockImplementation((role: string) =>
    Promise.resolve(
      role === "cement"
        ? {
            role: "cement",
            resolved_market: "NG",
            material: { name: "Cement 50kg" },
            price: { price: 8500 },
            evidence: "supplier_verified",
          }
        : {
            role: "sand",
            resolved_market: "NG",
            material: { name: "Sharp sand" },
            price: { price: 20000 },
            evidence: "supplier_reported",
          },
    ),
  ),
  evidenceSentence: vi.fn(() => "Verified supplier price."),
}));

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({
    marketCode: "NG",
    market: { countryName: "Nigeria", currencyCode: "NGN" },
  }),
}));

describe("QuoteCheck page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <QuoteCheck />
      </MemoryRouter>,
    );

  it("starts with no verdict until a line is entered", () => {
    renderPage();
    expect(screen.getByText(/no verdict yet/i)).toBeInTheDocument();
  });

  it("loads the market price book items into the picker", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Cement 50kg")).toBeInTheDocument();
    });
    expect(screen.getByText("Sharp sand")).toBeInTheDocument();
  });

  it("judges a line against the resolved market rate", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Cement 50kg"));

    fireEvent.change(screen.getByLabelText(/Item from the price book/i), {
      target: { value: "cement" },
    });
    fireEvent.change(screen.getByLabelText(/Quantity/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/Quoted rate per unit/i), {
      target: { value: "11000" },
    });

    await waitFor(() => {
      expect(screen.getByText("Above market")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Market rate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Above market/i).length).toBeGreaterThan(0);
  });

  it("marks a custom line as unjudged instead of guessing a rate", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Quantity/i), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/Quoted rate per unit/i), {
      target: { value: "5000" },
    });

    await waitFor(() => {
      expect(screen.getByText("No reference")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/No price book rate for this item/i),
    ).toBeInTheDocument();
  });

  it("adds and removes quote lines", async () => {
    renderPage();
    expect(screen.getByText("Line 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add another line/i }));
    await waitFor(() => {
      expect(screen.getByText("Line 2")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Remove line 2/i }));
    await waitFor(() => {
      expect(screen.queryByText("Line 2")).not.toBeInTheDocument();
    });
  });
});
