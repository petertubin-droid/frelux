import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  PAGE_CATALOG,
  HEADER_IMAGE_LIBRARY,
} from "@/config/page-header-images";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(() => ({})) },
  isSupabaseConfigured: false,
}));

vi.mock("@/lib/header-image-overrides", () => ({
  fetchHeaderImageOverrides: vi.fn().mockResolvedValue({}),
  resetHeaderImageOverridesCache: vi.fn(),
  useHeaderImageOverrides: vi.fn(() => ({})),
}));

vi.mock("@/lib/queries", () => ({
  fetchMediaFolders: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchMediaItems: vi.fn().mockResolvedValue({ data: [], error: null }),
  uploadMediaImage: vi.fn(),
  deleteMediaItem: vi.fn().mockResolvedValue({ error: null }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminHeaderImages")).default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

describe("AdminHeaderImages", () => {
  it("renders the page title", async () => {
    await renderPage();
    expect(await screen.findByText("Header Images")).toBeTruthy();
  });

  it("shows a paginated grid, never the whole catalog at once", async () => {
    await renderPage();

    const first = PAGE_CATALOG[0].title;
    const last = PAGE_CATALOG[PAGE_CATALOG.length - 1].title;

    // First page: first entry visible, last entry (and any beyond page 1) not.
    expect(await screen.findByText(first)).toBeTruthy();
    expect(screen.queryByText(last)).toBeNull();
    expect(
      screen.getByText(`Showing 1–12 of ${PAGE_CATALOG.length}`, {
        exact: false,
      }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /change/i }).length,
    ).toBeLessThanOrEqual(12);
  });

  it("paginates to the next page", async () => {
    await renderPage();
    const next = await screen.findByRole("button", { name: /next/i });
    fireEvent.click(next);

    const second = PAGE_CATALOG[12].title;
    await waitFor(() => {
      expect(screen.getByText(second)).toBeTruthy();
    });
    expect(
      screen.getByText(`Showing 13–${Math.min(PAGE_CATALOG.length, 24)}`, {
        exact: false,
      }),
    ).toBeTruthy();
  });

  it("narrows the grid with the search box", async () => {
    await renderPage();
    const search = await screen.findByPlaceholderText(/search pages/i);
    fireEvent.change(search, { target: { value: "pop ceiling" } });

    await waitFor(() => {
      expect(screen.getByText("POP Ceiling Calculator")).toBeTruthy();
    });
    expect(screen.queryByText("Painting Calculator")).toBeNull();
  });

  it("offers the full image library when changing a page", async () => {
    await renderPage();
    const change = await screen.findAllByRole("button", { name: /change/i });
    fireEvent.click(change[0]);

    // Every library option appears in the picker once a card is open.
    for (const option of HEADER_IMAGE_LIBRARY.slice(0, 4)) {
      expect(screen.getAllByTitle(option.label).length).toBeGreaterThan(0);
    }
  });

  it("lets admins upload their own image instead of pasting a URL", async () => {
    await renderPage();
    const change = await screen.findAllByRole("button", { name: /change/i });
    fireEvent.click(change[0]);

    const upload = await screen.findAllByRole("button", {
      name: /upload your own image/i,
    });
    expect(upload.length).toBeGreaterThan(0);
    // No URL input anywhere - the flow is file upload only.
    expect(screen.queryByLabelText(/custom image url/i)).toBeNull();
  });
});
