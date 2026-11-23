import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminGallery from "./AdminGallery";
import * as projectIntel from "@/lib/project-intelligence";
import type { DbGalleryEntry } from "@/types/database";

const mockEntries: DbGalleryEntry[] = [
  {
    id: "entry-1",
    user_id: "user-1",
    title: "Luxury Duplex Interior Screeding",
    description:
      "Multi-coat screed finish with water-resistant primer in Ikoyi.",
    project_category: "screeding",
    paint_type_used: "emulsion",
    paint_quality_used: "premium",
    colour_used: "Off-white",
    completion_date: "2026-11-01",
    is_public: true,
    status: "pending",
    is_featured: false,
    admin_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-11-15T09:00:00Z",
    updated_at: "2026-11-15T09:00:00Z",
  },
  {
    id: "entry-2",
    user_id: "user-2",
    title: "Commercial Warehouse Exterior",
    description: "Weather-resistant exterior paint across 3 blocks.",
    project_category: "painting",
    paint_type_used: "weather_shield",
    paint_quality_used: "standard",
    colour_used: "Slate Grey",
    completion_date: "2026-10-20",
    is_public: true,
    status: "approved",
    is_featured: false,
    admin_notes: null,
    reviewed_by: "admin-1",
    reviewed_at: "2026-10-22T10:00:00Z",
    created_at: "2026-10-21T08:00:00Z",
    updated_at: "2026-10-22T10:00:00Z",
  },
  {
    id: "entry-3",
    user_id: "user-3",
    title: "Penthouse Marble Tile Flooring",
    description: "Porcelain tile installation with 2mm leveling spacers.",
    project_category: "tiling",
    paint_type_used: null,
    paint_quality_used: null,
    colour_used: null,
    completion_date: "2026-10-10",
    is_public: true,
    status: "featured",
    is_featured: true,
    admin_notes: null,
    reviewed_by: "admin-1",
    reviewed_at: "2026-10-12T11:00:00Z",
    created_at: "2026-10-11T08:00:00Z",
    updated_at: "2026-10-12T11:00:00Z",
  },
];

vi.mock("@/lib/project-intelligence", () => ({
  fetchGalleryEntries: vi.fn(),
  countGalleryEntries: vi.fn(),
  fetchGalleryImages: vi.fn(),
  moderateGalleryEntry: vi.fn(),
  toggleGalleryFeature: vi.fn(),
  deleteGalleryEntry: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  vi.mocked(projectIntel.fetchGalleryEntries).mockResolvedValue(mockEntries);
  vi.mocked(projectIntel.countGalleryEntries).mockResolvedValue(
    mockEntries.length,
  );
  vi.mocked(projectIntel.fetchGalleryImages).mockResolvedValue([
    {
      id: "img-1",
      entry_id: "entry-1",
      image_url: "https://example.com/duplex.jpg",
      sort_order: 0,
      created_at: "2026-11-15T09:00:00Z",
    },
  ]);
  vi.mocked(projectIntel.moderateGalleryEntry).mockResolvedValue();
  vi.mocked(projectIntel.toggleGalleryFeature).mockResolvedValue();
  vi.mocked(projectIntel.deleteGalleryEntry).mockResolvedValue();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminGallery />
    </MemoryRouter>,
  );
}

describe("AdminGallery", () => {
  it("lists gallery entries with title, category, status badge, and thumbnails", async () => {
    renderPage();

    expect(
      await screen.findByText("Luxury Duplex Interior Screeding"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Commercial Warehouse Exterior"),
    ).toBeInTheDocument();
    expect(screen.getByText(/screeding/)).toBeInTheDocument();
    expect(screen.getAllByText("pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("approved").length).toBeGreaterThan(0);
  });

  it("filters gallery entries by status tab", async () => {
    renderPage();

    await screen.findByText("Luxury Duplex Interior Screeding");
    const approvedTab = screen.getByRole("button", { name: "approved" });
    fireEvent.click(approvedTab);

    await waitFor(() => {
      expect(projectIntel.fetchGalleryEntries).toHaveBeenCalledWith(
        expect.objectContaining({ status: "approved" }),
      );
    });
  });

  it("approves a pending gallery entry", async () => {
    renderPage();

    await screen.findByText("Luxury Duplex Interior Screeding");
    const approveBtn = screen.getByRole("button", {
      name: "Approve entry: Luxury Duplex Interior Screeding",
    });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(projectIntel.moderateGalleryEntry).toHaveBeenCalledWith(
        "entry-1",
        "approved",
      );
    });
  });

  it("rejects a gallery entry", async () => {
    renderPage();

    await screen.findByText("Luxury Duplex Interior Screeding");
    const rejectBtn = screen.getByRole("button", {
      name: "Reject entry: Luxury Duplex Interior Screeding",
    });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(projectIntel.moderateGalleryEntry).toHaveBeenCalledWith(
        "entry-1",
        "rejected",
      );
    });
  });

  it("features an approved gallery entry", async () => {
    renderPage();

    await screen.findByText("Commercial Warehouse Exterior");
    const featureBtn = screen.getByRole("button", {
      name: "Feature entry: Commercial Warehouse Exterior",
    });
    fireEvent.click(featureBtn);

    await waitFor(() => {
      expect(projectIntel.toggleGalleryFeature).toHaveBeenCalledWith(
        "entry-2",
        true,
      );
    });
  });

  it("unfeatures a featured gallery entry", async () => {
    renderPage();

    await screen.findByText("Penthouse Marble Tile Flooring");
    const unfeatureBtn = screen.getByRole("button", {
      name: "Unfeature entry: Penthouse Marble Tile Flooring",
    });
    fireEvent.click(unfeatureBtn);

    await waitFor(() => {
      expect(projectIntel.toggleGalleryFeature).toHaveBeenCalledWith(
        "entry-3",
        false,
      );
    });
  });

  it("deletes a gallery entry after confirmation", async () => {
    renderPage();

    await screen.findByText("Luxury Duplex Interior Screeding");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete entry: Luxury Duplex Interior Screeding",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete this gallery entry permanently?",
    );
    await waitFor(() => {
      expect(projectIntel.deleteGalleryEntry).toHaveBeenCalledWith("entry-1");
    });
  });

  it("cancels deletion when confirm dialog is rejected", async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    renderPage();

    await screen.findByText("Luxury Duplex Interior Screeding");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete entry: Luxury Duplex Interior Screeding",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(projectIntel.deleteGalleryEntry).not.toHaveBeenCalled();
  });

  it("displays empty state when no gallery entries match filter", async () => {
    vi.mocked(projectIntel.fetchGalleryEntries).mockResolvedValue([]);
    vi.mocked(projectIntel.countGalleryEntries).mockResolvedValue(0);

    renderPage();

    expect(await screen.findByText("No entries found.")).toBeInTheDocument();
  });

  it("displays error alert when fetch fails", async () => {
    vi.mocked(projectIntel.fetchGalleryEntries).mockRejectedValue(
      new Error("Network connection lost"),
    );

    renderPage();

    expect(
      await screen.findByText("Network connection lost"),
    ).toBeInTheDocument();
  });
});
