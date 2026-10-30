/**
 * Material Price Index page tests.
 *
 * The statistics and the resolver have their own unit tests. These pin the
 * page wiring: a figure appears only when the sample gate is met, the basis is
 * labelled honestly, and submissions go through the edge function rather than
 * writing a price directly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const queries = vi.hoisted(() => ({
  fetchCities: vi.fn(),
  fetchListings: vi.fn(),
  fetchMaterialHistory: vi.fn(),
}));

vi.mock("@/lib/price-index/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/price-index/queries")>(
    "@/lib/price-index/queries",
  );
  return { ...actual, ...queries };
});

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke } },
}));

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/components/ui/PageHeader", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import MaterialPriceIndex from "./MaterialPriceIndex";

const city = (slug: string, name: string) => ({
  slug,
  country_code: "NG",
  name,
  state: null,
  is_active: true,
  sort_order: 0,
});

let seq = 0;
const listing = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return {
    price_id: `p-${seq}`,
    material_id: "m-cement",
    name: "Dangote 3X cement, 50 kg bag",
    slug: "ng-cement-dangote-3x-50kg",
    category: "cement",
    sale_unit: "50 kg bag",
    price: 50000,
    currency: "NGN",
    price_kind: "retail",
    market: "NG",
    city_slug: "lagos",
    supplier_name: "Iyana Ipaja depot",
    source_url: null,
    price_source: "supplier price list",
    effective_date: "2026-10-28",
    verified_at: null,
    verification_status: "reported",
    supporting_submissions: 1,
    ...over,
  };
};

function renderPage() {
  return render(
    <MemoryRouter>
      <MaterialPriceIndex />
    </MemoryRouter>,
  );
}

describe("MaterialPriceIndex page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.fetchCities.mockResolvedValue({
      cities: [city("lagos", "Lagos"), city("kano", "Kano")],
      error: null,
    });
    queries.fetchMaterialHistory.mockResolvedValue({ points: [], error: null });
  });

  it("publishes a median once three independent prices agree", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [
        listing({ price: 50000 }),
        listing({ price: 51000 }),
        listing({ price: 52000 }),
      ],
      error: null,
    });

    renderPage();

    const rows = await screen.findAllByText(/Dangote 3X cement/);
    expect(rows.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/51,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 prices/).length).toBeGreaterThan(0);
  });

  it("withholds a figure when only one price exists", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [listing({ price: 50000 })],
      error: null,
    });

    renderPage();

    expect(
      await screen.findByText(/No qualifying price for this selection/),
    ).toBeInTheDocument();
    expect(screen.queryByText("₦50,000")).not.toBeInTheDocument();
  });

  it("labels a national figure as a national median", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [
        listing({ city_slug: "lagos", price: 50000 }),
        listing({ city_slug: "kano", price: 52000 }),
        listing({ city_slug: "lagos", price: 51000 }),
      ],
      error: null,
    });

    renderPage();
    await screen.findAllByText(/Dangote 3X cement/);

    expect(screen.getAllByText("National median").length).toBeGreaterThan(0);
  });

  it("shows the source and verification state beside a figure", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [listing(), listing(), listing()],
      error: null,
    });

    renderPage();

    expect(await screen.findByText("Iyana Ipaja depot")).toBeInTheDocument();
    expect(screen.getByText(/Reported, unverified/)).toBeInTheDocument();
  });

  it("sends submissions through the edge function, never straight to a price", async () => {
    queries.fetchListings.mockResolvedValue({ listings: [], error: null });
    invoke.mockResolvedValue({ data: { ok: true }, error: null });

    renderPage();
    await screen.findByText(/No qualifying price for this selection/);

    fireEvent.change(
      screen.getByPlaceholderText("Dangote 3X cement, 50 kg bag"),
      { target: { value: "BUA cement, 50 kg bag" } },
    );
    fireEvent.change(screen.getByPlaceholderText("52000"), {
      target: { value: "51000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit price/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        "price-index-submit",
        expect.objectContaining({
          body: expect.objectContaining({
            market: "NG",
            item_name: "BUA cement, 50 kg bag",
            price: 51000,
          }),
        }),
      );
    });
  });

  it("refuses to submit without a price", async () => {
    queries.fetchListings.mockResolvedValue({ listings: [], error: null });

    renderPage();
    await screen.findByText(/No qualifying price for this selection/);

    fireEvent.change(
      screen.getByPlaceholderText("Dangote 3X cement, 50 kg bag"),
      { target: { value: "BUA cement" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Submit price/i }));

    expect(
      await screen.findByText(/Enter the material and a price above zero/),
    ).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("surfaces a load failure instead of showing zeros", async () => {
    queries.fetchListings.mockResolvedValue({
      listings: [],
      error: "permission denied",
    });

    renderPage();

    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
  });
});
