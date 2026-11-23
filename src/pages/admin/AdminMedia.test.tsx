import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMedia from "./AdminMedia";
import * as queries from "@/lib/queries";
import type { DbMediaFolder, DbMediaItem } from "@/types/database";

const mockFolders: DbMediaFolder[] = [
  {
    id: "folder-1",
    name: "Site Banners",
    slug: "site-banners",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "folder-2",
    name: "Project Photos",
    slug: "project-photos",
    created_at: "2026-01-01T00:00:00Z",
  },
];

const mockItems: DbMediaItem[] = [
  {
    id: "media-1",
    folder_id: "folder-1",
    file_name: "hero-heroic-screed.webp",
    storage_path: "site-banners/hero-heroic-screed.webp",
    public_url: "https://example.com/hero.webp",
    mime_type: "image/webp",
    size_bytes: 204800, // 200 KB
    width: 1920,
    height: 1080,
    alt_text: "Hero screeding overview banner",
    uploaded_by: "admin-1",
    created_at: "2026-11-01T12:00:00Z",
  },
  {
    id: "media-2",
    folder_id: "folder-2",
    file_name: "ceiling-finish-macro.jpg",
    storage_path: "project-photos/ceiling-finish-macro.jpg",
    public_url: "https://example.com/ceiling.jpg",
    mime_type: "image/jpeg",
    size_bytes: 1048576, // 1 MB
    width: 2048,
    height: 1536,
    alt_text: null,
    uploaded_by: "admin-1",
    created_at: "2026-11-02T14:00:00Z",
  },
];

vi.mock("@/lib/queries", () => ({
  fetchMediaFolders: vi.fn(),
  fetchMediaItems: vi.fn(),
  uploadMediaImage: vi.fn(),
  deleteMediaItem: vi.fn(),
  updateMediaItemAlt: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  vi.mocked(queries.fetchMediaFolders).mockResolvedValue({
    data: mockFolders,
    error: null,
  } as any);
  vi.mocked(queries.fetchMediaItems).mockResolvedValue({
    data: mockItems,
    error: null,
    count: mockItems.length,
  } as any);
  vi.mocked(queries.uploadMediaImage).mockResolvedValue({ error: null } as any);
  vi.mocked(queries.deleteMediaItem).mockResolvedValue({ error: null } as any);
  vi.mocked(queries.updateMediaItemAlt).mockResolvedValue({
    error: null,
  } as any);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMedia />
    </MemoryRouter>,
  );
}

describe("AdminMedia", () => {
  it("lists media items with thumbnail, file name, and folders", async () => {
    renderPage();

    expect(
      await screen.findByText("hero-heroic-screed.webp"),
    ).toBeInTheDocument();
    expect(screen.getByText("ceiling-finish-macro.jpg")).toBeInTheDocument();
    expect(screen.getByText("Site Banners")).toBeInTheDocument();
    expect(screen.getByText("Project Photos")).toBeInTheDocument();
    expect(
      screen.getByText("Hero screeding overview banner"),
    ).toBeInTheDocument();
  });

  it("filters items by folder sidebar selection", async () => {
    renderPage();

    await screen.findByText("hero-heroic-screed.webp");
    const folderBtn = screen.getByRole("button", { name: /Project Photos/i });
    fireEvent.click(folderBtn);

    await waitFor(() => {
      expect(queries.fetchMediaItems).toHaveBeenCalledWith(
        "folder-2",
        undefined,
        expect.any(Object),
      );
    });
  });

  it("searches media items by query", async () => {
    renderPage();

    await screen.findByText("hero-heroic-screed.webp");
    const searchInput = screen.getByPlaceholderText(/Search by file name/i);
    fireEvent.change(searchInput, { target: { value: "macro" } });

    await waitFor(() => {
      expect(queries.fetchMediaItems).toHaveBeenCalledWith(
        undefined,
        "macro",
        expect.any(Object),
      );
    });
  });

  it("edits and saves alt text with contextual save button", async () => {
    renderPage();

    await screen.findByText("hero-heroic-screed.webp");
    const editAltBtn = screen.getByRole("button", {
      name: "Edit hero-heroic-screed.webp",
    });
    fireEvent.click(editAltBtn);

    const altInput = screen.getByPlaceholderText("Alt text…");
    fireEvent.change(altInput, {
      target: { value: "Updated alt text description" },
    });

    const saveBtn = screen.getByRole("button", {
      name: "Save alt text for hero-heroic-screed.webp",
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(queries.updateMediaItemAlt).toHaveBeenCalledWith(
        "media-1",
        "Updated alt text description",
      );
    });
  });

  it("uploads a new image file", async () => {
    renderPage();

    await screen.findByText("hero-heroic-screed.webp");
    const file = new File(["dummy image data"], "new-upload.png", {
      type: "image/png",
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(queries.uploadMediaImage).toHaveBeenCalledWith(
        file,
        "user-uploads",
      );
    });
  });

  it("deletes media item upon confirmation", async () => {
    renderPage();

    await screen.findByText("hero-heroic-screed.webp");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete hero-heroic-screed.webp",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "hero-heroic-screed.webp"?',
    );
    await waitFor(() => {
      expect(queries.deleteMediaItem).toHaveBeenCalledWith(mockItems[0]);
    });
  });

  it("cancels deletion when confirm dialog is dismissed", async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    renderPage();

    await screen.findByText("hero-heroic-screed.webp");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete hero-heroic-screed.webp",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(queries.deleteMediaItem).not.toHaveBeenCalled();
  });

  it("renders empty state when no media items exist", async () => {
    vi.mocked(queries.fetchMediaItems).mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    } as any);

    renderPage();

    expect(await screen.findByText("No images found")).toBeInTheDocument();
  });

  it("displays error banner when fetch fails", async () => {
    vi.mocked(queries.fetchMediaItems).mockResolvedValue({
      data: [],
      error: "Storage cluster unreachable",
      count: 0,
    } as any);

    renderPage();

    expect(
      await screen.findByText("Storage cluster unreachable"),
    ).toBeInTheDocument();
  });
});
