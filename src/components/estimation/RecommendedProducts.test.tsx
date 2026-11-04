import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const loadProductRecommendations = vi.fn();

vi.mock("@/lib/products/product-recommendations", () => ({
  loadProductRecommendations: (...args: unknown[]) =>
    loadProductRecommendations(...args),
}));

import RecommendedProducts from "./RecommendedProducts";

const berger = {
  id: "ng-berger-luxol-premium-matt-20l",
  brand: "Berger",
  name: "Luxol Premium Matt",
  summary: "Water based matt emulsion for interior walls and ceilings.",
  detail: "20 L · matt",
  price: { low: 119110, high: 131795, currency: "NGN" },
  priceNote: "The store prices this by colour.",
  coveragePerLitre: 16,
  coats: 2,
  source: {
    label: "Berger Paints Nigeria store, Decorative range",
    url: "https://bergerpaintsnig.com/shop/product-category/decorative/",
    retrieved: "2026-11-04",
  },
  origin: "curated" as const,
};

const dulux = {
  ...berger,
  id: "ng-dulux-trade-vinyl-matt",
  brand: "Dulux",
  name: "Dulux Trade Vinyl Matt",
  price: null,
  priceNote: "No published naira pack price.",
  source: {
    label: "Dulux Trade product page (AkzoNobel)",
    url: "https://www.duluxtradepaintexpert.co.uk/en/products/example",
    retrieved: "2026-11-04",
  },
};

describe("RecommendedProducts", () => {
  beforeEach(() => {
    loadProductRecommendations.mockReset();
  });

  it("lists the products with their price range, coverage and source", async () => {
    loadProductRecommendations.mockResolvedValue({
      items: [berger],
      error: null,
    });

    render(<RecommendedProducts category="paint" />);

    expect(await screen.findByText("Luxol Premium Matt")).toBeTruthy();
    expect(screen.getByText("Berger")).toBeTruthy();
    expect(screen.getByText(/119,110/)).toBeTruthy();
    expect(screen.getByText(/131,795/)).toBeTruthy();
    expect(screen.getByText(/16 m² per litre per coat/)).toBeTruthy();
    expect(screen.getByText(/2 coats/)).toBeTruthy();

    const link = screen.getByRole("link", { name: /source/i });
    expect(link.getAttribute("href")).toBe(berger.source.url);
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("read 2026-11-04")).toBeTruthy();
  });

  it("says a pack price is not published instead of showing a number", async () => {
    loadProductRecommendations.mockResolvedValue({
      items: [dulux],
      error: null,
    });

    render(<RecommendedProducts category="paint" />);

    expect(await screen.findByText("Dulux Trade Vinyl Matt")).toBeTruthy();
    expect(screen.getByText("Pack price not published")).toBeTruthy();
    expect(screen.getByText(/No published naira pack price/)).toBeTruthy();
  });

  it("explains that these are recommendations, not the quote's prices", async () => {
    loadProductRecommendations.mockResolvedValue({
      items: [berger],
      error: null,
    });

    render(<RecommendedProducts category="paint" />);

    expect(
      await screen.findByText(/deterministic engine from its own verified/),
    ).toBeTruthy();
  });

  it("renders nothing when the category has no verified products", async () => {
    loadProductRecommendations.mockResolvedValue({ items: [], error: null });

    const { container } = render(<RecommendedProducts category="cement" />);

    await waitFor(() => {
      expect(loadProductRecommendations).toHaveBeenCalled();
    });
    expect(container.querySelector("section")).toBeNull();
  });

  it("offers a retry when the catalogue cannot be read", async () => {
    loadProductRecommendations.mockResolvedValueOnce({
      items: [],
      error: "Catalogue unavailable.",
    });
    loadProductRecommendations.mockResolvedValueOnce({
      items: [berger],
      error: null,
    });

    render(<RecommendedProducts category="paint" />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Catalogue unavailable.");

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Luxol Premium Matt")).toBeTruthy();
    expect(loadProductRecommendations).toHaveBeenCalledTimes(2);
  });

  it("shows a busy state while the catalogue loads", async () => {
    loadProductRecommendations.mockImplementation(
      () => new Promise(() => undefined),
    );

    render(<RecommendedProducts category="paint" />);

    const region = screen.getByLabelText(/loading recommended paint products/i);
    expect(region.getAttribute("aria-busy")).toBe("true");
  });

  it("asks the loader for the estimator's category and market", async () => {
    loadProductRecommendations.mockResolvedValue({ items: [], error: null });

    render(<RecommendedProducts category="paint" limit={3} />);

    await waitFor(() => {
      expect(loadProductRecommendations).toHaveBeenCalledWith({
        category: "paint",
        market: "NG",
        limit: 3,
      });
    });
  });
});
