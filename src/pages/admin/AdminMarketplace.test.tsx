import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMarketplace from "./AdminMarketplace";

const {
  mockListings,
  mockProducts,
  mockOrders,
  adminToggleListingFeaturedMock,
  adminRemoveListingMock,
  adminFetchAllListingsMock,
  adminFetchAllOrdersMock,
} = vi.hoisted(() => {
  const mockListings = [
    {
      id: "list-1",
      title: "Duplex Interior Painting Project",
      project_type: "painting",
      status: "open",
      location_state: "Lagos",
      bid_count: 5,
      view_count: 42,
      is_featured: false,
      created_at: new Date().toISOString(),
    },
  ];

  const mockProducts = [
    {
      id: "prod-1",
      title: "Commercial Airless Paint Sprayer",
      price: 250000,
      currency: "NGN",
      status: "active",
      brand: "Graco",
      images: ["https://example.com/sprayer.jpg"],
      created_at: new Date().toISOString(),
      category: { id: "cat-1", name: "Equipment" },
      seller: { full_name: "Pro Tools Lagos", avatar_url: null },
    },
  ];

  const mockOrders = [
    {
      id: "ord-1",
      status: "completed",
      agreed_price: 250000,
      currency: "NGN",
      payment_status: "paid",
      listing: { title: "Order for Duplex Painting" },
      pro_profile: { display_name: "John the Painter" },
      created_at: new Date().toISOString(),
    },
  ];

  return {
    mockListings,
    mockProducts,
    mockOrders,
    adminToggleListingFeaturedMock: vi.fn().mockResolvedValue(true),
    adminRemoveListingMock: vi.fn().mockResolvedValue(true),
    adminFetchAllListingsMock: vi.fn().mockResolvedValue({
      listings: mockListings,
      total: 1,
    }),
    adminFetchAllOrdersMock: vi.fn().mockResolvedValue({
      orders: mockOrders,
      total: 1,
    }),
  };
});

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn().mockReturnValue({
    toast: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/lib/marketplace", () => ({
  adminFetchAllListings: adminFetchAllListingsMock,
  adminFetchAllOrders: adminFetchAllOrdersMock,
  adminFetchDisputes: vi.fn().mockResolvedValue({ disputes: [], total: 0 }),
  adminToggleListingFeatured: adminToggleListingFeaturedMock,
  adminRemoveListing: adminRemoveListingMock,
  adminResolveDispute: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "marketplace_products") {
        return {
          select: vi.fn(
            (_cols: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.count) {
                const countPromise = Promise.resolve({ count: 1, error: null });
                return Object.assign(countPromise, {
                  eq: vi.fn().mockReturnThis(),
                  or: vi.fn().mockReturnThis(),
                });
              }
              return {
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockProducts,
                    error: null,
                  }),
                }),
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
              };
            },
          ),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.prompt = vi.fn().mockReturnValue("Violates platform terms");
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMarketplace />
    </MemoryRouter>,
  );
}

describe("AdminMarketplace", () => {
  it("renders page header and navigation tabs", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Marketplace Management/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Listings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Products" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Orders" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Disputes" }),
    ).toBeInTheDocument();
  });

  it("displays marketplace listings", async () => {
    renderPage();

    expect(
      await screen.findByText("Duplex Interior Painting Project"),
    ).toBeInTheDocument();
    expect(screen.getByText("Lagos")).toBeInTheDocument();
  });

  it("toggles listing featured status", async () => {
    renderPage();

    await screen.findByText("Duplex Interior Painting Project");
    const featureBtn = screen.getByRole("button", { name: "Feature" });
    fireEvent.click(featureBtn);

    await waitFor(() => {
      expect(adminToggleListingFeaturedMock).toHaveBeenCalledWith(
        "list-1",
        true,
      );
    });
  });

  it("removes a listing with reason prompt", async () => {
    renderPage();

    await screen.findByText("Duplex Interior Painting Project");
    const removeBtn = screen.getByLabelText(
      "Delete Duplex Interior Painting Project",
    );
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalledWith("Reason for removal?");
      expect(adminRemoveListingMock).toHaveBeenCalledWith(
        "list-1",
        "Violates platform terms",
      );
    });
  });

  it("switches to Products tab and displays products", async () => {
    renderPage();

    await screen.findByText("Duplex Interior Painting Project");
    const prodTab = screen.getByRole("button", { name: "Products" });
    fireEvent.click(prodTab);

    expect(
      await screen.findByText("Commercial Airless Paint Sprayer"),
    ).toBeInTheDocument();
  });

  it("switches to Orders tab and displays orders", async () => {
    renderPage();

    await screen.findByText("Duplex Interior Painting Project");
    const ordersTab = screen.getByRole("button", { name: "Orders" });
    fireEvent.click(ordersTab);

    expect(
      await screen.findByText("Order for Duplex Painting"),
    ).toBeInTheDocument();
    expect(screen.getByText("Pro: John the Painter")).toBeInTheDocument();
  });
});
