import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CostEstimator from "@/pages/CostEstimator";

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

const mockPaintTypes = vi.hoisted(() => [
  {
    id: "pt-emulsion",
    name: "Emulsion Premium",
    description: "Interior matte finish",
    coverage_rate: 10,
    coverage_unit: "sqm/L",
    container_sizes: [20, 10, 4],
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "pt-gloss",
    name: "High Gloss",
    description: "Trim and wood",
    coverage_rate: 12,
    coverage_unit: "sqm/L",
    container_sizes: [4, 1],
    is_active: true,
    sort_order: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
]);

vi.mock("@/lib/queries", () => ({
  fetchPaintProducts: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchMaterialPrices: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchSiteSettings: vi.fn().mockResolvedValue({
    data: {
      default_currency: "USD",
      default_currency_symbol: "$",
      manual_paint_bucket_sizes: [20, 4],
    },
    error: null,
  }),
  fetchActiveProjects: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchPaintTypes: vi
    .fn()
    .mockResolvedValue({ data: mockPaintTypes, error: null }),
  logAnalyticsEvent: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CostEstimator", () => {
  it("module exports something", async () => {
    const mod = await import("@/pages/CostEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("loads and displays paint types from database configuration", async () => {
    render(
      <MemoryRouter>
        <CostEstimator />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Emulsion Premium/)).toBeInTheDocument();
      expect(screen.getByText(/High Gloss/)).toBeInTheDocument();
    });
  });

  it("updates bucket size options when switching paint types", async () => {
    render(
      <MemoryRouter>
        <CostEstimator />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Emulsion Premium/)).toBeInTheDocument();
    });

    const paintTypeSelect = screen.getByLabelText(/Paint type/i);
    fireEvent.change(paintTypeSelect, { target: { value: "pt-gloss" } });

    // pt-gloss has container sizes [4, 1]
    const bucketSelect = screen.getByLabelText(/Paint bucket size/i);
    expect(bucketSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1 L" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "4 L" })).toBeInTheDocument();
  });
});
