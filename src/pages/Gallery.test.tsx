import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/project-intelligence", () => ({
  fetchPublicGallery: vi.fn().mockResolvedValue([
    {
      id: "entry-1",
      user_id: "user-1",
      title: "Warm living room",
      description: "A refreshed living room",
      project_category: "painting",
      paint_type_used: null,
      paint_quality_used: null,
      colour_used: null,
      location: null,
      completion_date: null,
      is_public: true,
      status: "approved",
      is_featured: false,
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ]),
  fetchGalleryImages: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/Gallery")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Gallery", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("uses theme-aware surfaces for gallery hover controls", async () => {
    const { container } = await renderPage();
    await waitFor(() =>
      expect(screen.getByText("Warm living room")).toBeTruthy(),
    );
    const control = Array.from(container.querySelectorAll("button")).find(
      (button) => button.className.includes("bg-card/95"),
    );
    expect(control?.className).toContain("dark:bg-card/95");
    expect(control?.className).not.toContain("bg-white");
  });
});
