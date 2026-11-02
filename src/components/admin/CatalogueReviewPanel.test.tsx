import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// A staged catalogue is reviewed here, so the panel must show what each
// catalogue actually yields and why rows were set aside. The stub answers the
// same way the real views do.

const REVIEW_ROWS = [
  {
    id: "1",
    market: "GB",
    supplier: "Metals Direct",
    title: "Mastercrete Cement Handy Pack 12.5KG - 1 bags",
    price: 15.99,
    currency: "GBP",
    material_slug: null,
    match_status: "unmapped",
    observations: 0,
    last_seen: "2026-10-30T18:20:00Z",
  },
];

const SET_ASIDE_ROWS = [
  {
    match_status: "no_counterpart",
    rejection_reason: "the GB catalogue prices no cement",
  },
  {
    match_status: "no_counterpart",
    rejection_reason: "the GB catalogue prices no cement",
  },
  {
    match_status: "bulk_listing",
    rejection_reason:
      "multi-buy or bulk pack, so a per-unit price would have to be invented",
  },
  {
    match_status: "supplier_no_price",
    rejection_reason:
      "the supplier publishes a price of zero, so there is nothing to adopt",
  },
];

const COVERAGE_ROWS = [
  {
    market: "GB",
    staged: 153,
    mapped: 1,
    awaiting_review: 1,
    no_counterpart: 115,
    bulk_listing: 36,
    supplier_no_price: 0,
    supplies_prices: true,
    last_seen: "2026-10-30T18:20:00Z",
  },
  {
    market: "AU",
    staged: 80,
    mapped: 0,
    awaiting_review: 0,
    no_counterpart: 0,
    bulk_listing: 0,
    supplier_no_price: 80,
    supplies_prices: false,
    last_seen: "2026-10-30T18:20:00Z",
  },
];

vi.mock("@/lib/supabase", () => {
  const table = (name: string) => {
    let requested: string[] = [];
    const chain: Record<string, unknown> = {
      select: () => chain,
      order: () => chain,
      limit: () => chain,
      eq: () => chain,
      in: (_field: string, values: string[]) => {
        requested = values;
        return chain;
      },
      then: (resolve: (v: unknown) => void) => {
        if (name === "catalogue_coverage_by_market")
          return resolve({ data: COVERAGE_ROWS });
        if (name === "estimation_materials")
          return resolve({
            data: [
              {
                slug: "gb-building-sand-25kg",
                name: "Building Sand (25kg bag)",
              },
            ],
          });
        if (name === "catalogue_products")
          return resolve({
            data: requested.includes("unmapped") ? REVIEW_ROWS : SET_ASIDE_ROWS,
          });
        return resolve({ data: [] });
      },
    };
    return chain;
  };
  return {
    supabase: {
      from: (name: string) => table(name),
      rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
    },
  };
});

describe("CatalogueReviewPanel", () => {
  it("shows what each catalogue yields rather than only what is staged", async () => {
    const { default: Panel } = await import("./CatalogueReviewPanel");
    render(<Panel />);

    await waitFor(() => {
      expect(
        screen.getByText("What each catalogue yields"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/153 staged, 1 tied to a material/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/80 staged, none tied to a material/),
    ).toBeInTheDocument();
    expect(screen.getByText("no prices adopted")).toBeInTheDocument();
  });

  it("explains why rows were set aside", async () => {
    const { default: Panel } = await import("./CatalogueReviewPanel");
    render(<Panel />);

    await waitFor(() => {
      expect(
        screen.getByText(/2 · the GB catalogue prices no cement/),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        /multi-buy or bulk pack, so a per-unit price would have to be invented/,
      ),
    ).toBeInTheDocument();
  });

  it("keeps a genuine single product in the review list", async () => {
    const { default: Panel } = await import("./CatalogueReviewPanel");
    render(<Panel />);

    await waitFor(() => {
      expect(
        screen.getByText(/Mastercrete Cement Handy Pack 12.5KG/),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("1 waiting")).toBeInTheDocument();
  });

  it("never uses an em dash in the wording it adds", async () => {
    const { default: Panel } = await import("./CatalogueReviewPanel");
    const { container } = render(<Panel />);
    await waitFor(() => {
      expect(
        screen.getByText("What each catalogue yields"),
      ).toBeInTheDocument();
    });
    expect(container.textContent).not.toContain("—");
  });
});
