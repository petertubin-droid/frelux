import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn(), useBreadcrumbJsonLd: vi.fn() }));
vi.mock("@/components/ui/Container", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: () => ({ code: "NGN", symbol: "₦" }),
}));

import PriceBook from "@/pages/PriceBook";
import { PriceBookProvider } from "@/lib/pricing/price-book-context";
import { PRICE_BOOK_STORAGE_KEY } from "@/lib/pricing/price-book";

const renderPage = () =>
  render(
    <MemoryRouter>
      <PriceBookProvider>
        <PriceBook />
      </PriceBookProvider>
    </MemoryRouter>,
  );

function addRate(values: { slug: string; rate: string; currency?: string }) {
  fireEvent.change(screen.getByLabelText("Material slug"), {
    target: { value: values.slug },
  });
  fireEvent.change(screen.getByLabelText("Rate per unit"), {
    target: { value: values.rate },
  });
  if (values.currency) {
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: values.currency },
    });
  }
  fireEvent.click(screen.getByRole("button", { name: /Save rate/i }));
}

describe("My price book page", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty and says calculators keep the market price", () => {
    renderPage();
    expect(
      screen.getByText(/Calculators keep using the market price book/i),
    ).toBeDefined();
  });

  it("saves a rate, applies it in its own currency and survives a reload", () => {
    const first = renderPage();
    addRate({ slug: "fascia-per-meter", rate: "4200" });

    const list = screen.getByRole("list");
    expect(within(list).getByText("fascia-per-meter")).toBeDefined();
    expect(within(list).getByText(/Applied in NGN calculators/i)).toBeDefined();
    expect(
      screen.getByText(/1 of 1 rates apply in NGN calculators/i),
    ).toBeDefined();

    const stored = JSON.parse(
      window.localStorage.getItem(PRICE_BOOK_STORAGE_KEY) ?? "{}",
    );
    expect(stored.entries).toHaveLength(1);
    expect(stored.entries[0].rate).toBe(4200);

    first.unmount();
    renderPage();
    // The page's own guidance names a sample slug, so read the saved row itself.
    expect(
      within(screen.getByRole("list")).getByText("fascia-per-meter"),
    ).toBeDefined();
  });

  it("keeps a rate quoted in another currency without applying or converting it", () => {
    renderPage();
    addRate({ slug: "gutter-per-meter", rate: "9.5", currency: "GBP" });

    expect(screen.getByText(/Kept, not applied: quoted in GBP/i)).toBeDefined();
    expect(
      screen.getByText(/None of these rates are quoted in NGN/i),
    ).toBeDefined();
  });

  it("refuses a negative rate in the form and stores nothing", () => {
    renderPage();
    addRate({ slug: "downpipe-per-piece", rate: "-5" });

    expect(screen.getByText("A rate cannot be negative.")).toBeDefined();
    expect(
      window.localStorage.getItem(PRICE_BOOK_STORAGE_KEY) ?? "",
    ).not.toContain("downpipe-per-piece");
  });

  it("removes a saved rate", () => {
    renderPage();
    addRate({ slug: "fascia-per-meter", rate: "4200" });
    fireEvent.click(
      screen.getByRole("button", { name: "Remove fascia-per-meter" }),
    );

    expect(screen.queryByRole("list")).toBeNull();
    expect(
      screen.getByText(/Calculators keep using the market price book/i),
    ).toBeDefined();
    expect(screen.getByText("fascia-per-meter removed.")).toBeDefined();
  });
});
