import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/lib/queries", () => ({
  fetchPaintColors: vi.fn().mockResolvedValue([]),
  fetchColorCollections: vi.fn().mockResolvedValue([]),
  fetchColorFamilies: vi.fn().mockResolvedValue([]),
  fetchColorCategories: vi.fn().mockResolvedValue([]),
  fetchColorCombinations: vi.fn().mockResolvedValue([]),
  fetchBrands: vi.fn().mockResolvedValue([]),
  fetchFavoriteColorIds: vi.fn().mockResolvedValue([]),
  toggleFavoriteColor: vi.fn().mockResolvedValue({ data: null, error: null }),
  logAnalyticsEvent: vi.fn().mockResolvedValue(null),
}));

beforeEach(() => { vi.clearAllMocks(); });

async function renderPage() {
  const Comp = (await import("@/pages/Colors")).default;
  return render(<MemoryRouter><ToastProvider><Comp /></ToastProvider></MemoryRouter>);
}

describe("Colors", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});
