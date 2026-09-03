import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getCreditTransactions: vi.fn().mockResolvedValue([]),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), logAnalyticsEvent: vi.fn() }));
vi.mock("@/lib/queries", () => ({
  logAnalyticsEvent: vi.fn(),
  fetchScreedingSystemConfig: vi.fn(),
  fetchScreedingMixConfig: vi.fn(),
}));

vi.mock("@/lib/supabase", () => {
  const chainable: any = { data: null, error: null };
  const methods = ["select", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is", "not", "or", "and", "order", "range", "limit", "single", "maybeSingle", "insert", "update", "delete", "upsert", "count", "head"];
  for (const m of methods) chainable[m] = vi.fn(() => chainable);
  const supabase = {
    from: vi.fn(() => chainable),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
  return { supabase };
});

beforeEach(() => { vi.clearAllMocks(); });

// Test data — simulates what the DB would return
const mockPuttyDbConfig = {
  id: "putty-1",
  system_type: "putty" as const,
  display_name: "Putty",
  description: "Professional Putty screeding calculation.",
  coverage_area_m2: 12,
  coverage_unit: "m²",
  default_coats: 2,
  waste_percentage: 0,
  currency: "NGN",
  currency_symbol: "₦",
  putty_name: "Putty",
  putty_quantity: 2,
  putty_unit: "bucket",
  putty_price_per_unit: 12000,
  paint_name: null,
  paint_quantity: null,
  paint_unit: null,
  paint_price_per_unit: null,
  cement_name: null,
  cement_quantity: null,
  cement_unit: null,
  cement_price_per_unit: null,
  rounding_rule: "ceil" as const,
  is_active: true,
  sort_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockMixDbConfig = {
  id: "mix-1",
  system_type: "white_cement_paint" as const,
  display_name: "White Cement + Screeding Paint",
  description: "Combined White Cement and Screeding Paint calculation.",
  coverage_area_m2: 20,
  coverage_unit: "m²",
  default_coats: 2,
  waste_percentage: 20,
  currency: "NGN",
  currency_symbol: "₦",
  putty_name: null,
  putty_quantity: null,
  putty_unit: null,
  putty_price_per_unit: null,
  paint_name: "Screeding Paint",
  paint_quantity: 2,
  paint_unit: "bucket",
  paint_price_per_unit: 25000,
  cement_name: "White Cement",
  cement_quantity: 1,
  cement_unit: "bag",
  cement_price_per_unit: 7500,
  rounding_rule: "ceil" as const,
  is_active: true,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

async function renderEstimator() {
  const Comp = (await import("@/pages/ScreedingCostEstimator")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ScreedingCostEstimator — Material System Selection", () => {
  it("renders without crashing", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    const { container } = await renderEstimator();
    expect(container.innerHTML).not.toBe("");
  });

  it("displays Putty as an available material option", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText("Putty")).toBeTruthy();
    });
  });

  it("displays White Cement + Screeding Paint as an available material option", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText("White Cement + Screeding Paint")).toBeTruthy();
    });
  });

  it("shows Putty description", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText(/Professional Putty screeding/i)).toBeTruthy();
    });
  });

  it("shows White Cement + Screeding Paint description", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText(/Combined White Cement/i)).toBeTruthy();
    });
  });
});

describe("ScreedingCostEstimator — Putty Flow", () => {
  it("calculates Putty requirement when area is entered", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    const { container } = await renderEstimator();

    await waitFor(() => {
      expect(screen.getByText("Putty")).toBeTruthy();
    });

    // Enter area
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: "12" } });

    // Wait for result
    await waitFor(() => {
      expect(screen.getByText("Putty Requirement")).toBeTruthy();
    }, { timeout: 3000 });

    // Should show area
    expect(screen.getAllByText(/12.*m²/).length).toBeGreaterThan(0);
  });

  it("shows coats selector", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText("Coats")).toBeTruthy();
    });
  });

  it("shows cost using configured Admin price", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    const { container } = await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText("Putty")).toBeTruthy();
    });

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12" } });

    await waitFor(() => {
      // 4 buckets * 12000 = 48000
      expect(screen.getAllByText(/48,000|48000/).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});

describe("ScreedingCostEstimator — White Cement + Paint Flow", () => {
  it("calculates both Screeding Paint and White Cement separately", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    const { container } = await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText("White Cement + Screeding Paint")).toBeTruthy();
    });

    // Click on White Cement + Paint system
    const mixButton = screen.getByText("White Cement + Screeding Paint").closest("button");
    expect(mixButton).toBeTruthy();
    fireEvent.click(mixButton!);

    // Enter area
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "20" } });

    await waitFor(() => {
      expect(screen.getByText("Screeding Materials Requirement")).toBeTruthy();
    }, { timeout: 3000 });

    // Should show both Screeding Paint and White Cement sections
    expect(screen.getAllByText(/Screeding Paint/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/White Cement/i).length).toBeGreaterThan(0);
  });

  it("shows configured waste applied", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    const { container } = await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText("White Cement + Screeding Paint")).toBeTruthy();
    });

    const mixButton = screen.getByText("White Cement + Screeding Paint").closest("button");
    fireEvent.click(mixButton!);

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "20" } });

    await waitFor(() => {
      // Waste 20% should be visible
      expect(screen.getAllByText(/Waste.*20%/).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("shows total estimated material cost", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    const { container } = await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText("White Cement + Screeding Paint")).toBeTruthy();
    });

    const mixButton = screen.getByText("White Cement + Screeding Paint").closest("button");
    fireEvent.click(mixButton!);

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "20" } });

    await waitFor(() => {
      // paint: 5 * 25000 = 125000, cement: 3 * 7500 = 22500, total = 147500
      expect(screen.getAllByText(/147,500|147500/).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});

describe("ScreedingCostEstimator — Material System Isolation", () => {
  it("does not mix Putty materials with Cement/Paint", async () => {
    const { fetchScreedingSystemConfig } = await import("@/lib/queries");
    (fetchScreedingSystemConfig as any)
      .mockResolvedValueOnce({ data: mockPuttyDbConfig, error: null })
      .mockResolvedValueOnce({ data: mockMixDbConfig, error: null });

    const { container } = await renderEstimator();
    await waitFor(() => {
      expect(screen.getByText("Putty")).toBeTruthy();
    });

    // Enter area with Putty selected (default)
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12" } });

    await waitFor(() => {
      expect(screen.getByText("Putty Requirement")).toBeTruthy();
    }, { timeout: 3000 });

    // Should NOT show Screeding Paint or White Cement sections
    expect(screen.queryByText("SCREEDING PAINT")).toBeNull();
    expect(screen.queryByText("WHITE CEMENT")).toBeNull();
  });
});
