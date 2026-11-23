import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSeoLocation from "./AdminSeoLocation";

const {
  mockLocations,
  mockCategories,
  mockSeoPages,
  updateCoordsMock,
  updateCategorySeoMock,
  upsertSeoPageMock,
} = vi.hoisted(() => {
  const mockLocations = [
    {
      id: "loc-1",
      state: "Lagos",
      city: "Ikeja",
      slug: "ikeja-lagos",
      latitude: 6.595,
      longitude: 3.344,
      is_active: true,
    },
    {
      id: "loc-2",
      state: "Abuja",
      city: "Garki",
      slug: "garki-abuja",
      latitude: null,
      longitude: null,
      is_active: true,
    },
  ];

  const mockCategories = [
    {
      id: "cat-1",
      name: "Tiling & Screeding",
      slug: "tiling-screeding",
      seo_title: "Top Tiling Specialists in Nigeria",
      seo_description: "Hire certified tiling pros.",
      seo_indexable: true,
    },
  ];

  const mockSeoPages = [
    {
      id: "seo-1",
      page_type: "marketplace_category",
      category_slug: "screeding",
      seo_title: "Free Screeding Calculator",
      seo_description: "Calculate cement and sand for screeding.",
      canonical_path: "/screeding-calculator",
      is_indexable: true,
    },
  ];

  return {
    mockLocations,
    mockCategories,
    mockSeoPages,
    updateCoordsMock: vi.fn().mockResolvedValue({ success: true }),
    updateCategorySeoMock: vi.fn().mockResolvedValue({ success: true }),
    upsertSeoPageMock: vi.fn().mockResolvedValue({ success: true }),
  };
});

vi.mock("@/lib/pro-connect", () => ({
  fetchLocations: vi.fn().mockResolvedValue(mockLocations),
  fetchCategories: vi.fn().mockResolvedValue(mockCategories),
}));

vi.mock("@/lib/location-discovery", () => ({
  adminFetchSeoPageSettings: vi.fn().mockResolvedValue(mockSeoPages),
  adminUpsertSeoPageSettings: upsertSeoPageMock,
  adminDeleteSeoPageSettings: vi.fn().mockResolvedValue({ success: true }),
  adminUpdateLocationCoords: updateCoordsMock,
  adminUpdateCategorySeo: updateCategorySeoMock,
  adminUpdateListingSeo: vi.fn().mockResolvedValue({ success: true }),
  adminUpdateProProfileSeo: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSeoLocation />
    </MemoryRouter>,
  );
}

describe("AdminSeoLocation", () => {
  it("renders page header and navigation tabs", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /SEO & Location Management/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Locations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Categories" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "SEO Pages" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Indexability" }),
    ).toBeInTheDocument();
  });

  it("lists locations with coordinates and handles search filtering", async () => {
    renderPage();

    expect(await screen.findByText("Ikeja")).toBeInTheDocument();
    expect(screen.getByText("Garki")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search locations...");
    fireEvent.change(searchInput, { target: { value: "Ikeja" } });

    expect(screen.getByText("Ikeja")).toBeInTheDocument();
    expect(screen.queryByText("Garki")).not.toBeInTheDocument();
  });

  it("allows editing and saving location coordinates", async () => {
    renderPage();

    await screen.findByText("Ikeja");
    const editBtns = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editBtns[0]);

    const latInput = screen.getByPlaceholderText("e.g. 6.45");
    fireEvent.change(latInput, { target: { value: "6.600" } });

    const saveBtn = screen.getByRole("button", { name: /Loading/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateCoordsMock).toHaveBeenCalledWith("loc-1", 6.6, 3.344);
    });
  });

  it("switches to Categories tab and displays category SEO metadata", async () => {
    renderPage();

    const catTab = screen.getByRole("button", { name: "Categories" });
    fireEvent.click(catTab);

    expect(await screen.findByText("Tiling & Screeding")).toBeInTheDocument();
    expect(screen.getByText("/tiling-screeding")).toBeInTheDocument();
    expect(
      screen.getByText("Top Tiling Specialists in Nigeria"),
    ).toBeInTheDocument();
  });

  it("switches to SEO Pages tab and displays custom page rules", async () => {
    renderPage();

    const seoTab = screen.getByRole("button", { name: "SEO Pages" });
    fireEvent.click(seoTab);

    expect(
      await screen.findByText("Free Screeding Calculator"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/marketplace_category · screeding/i),
    ).toBeInTheDocument();
  });
});
