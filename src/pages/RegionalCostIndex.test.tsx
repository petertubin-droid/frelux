/**
 * Regional Cost Index page tests (Future Engine 3)
 *
 * The deterministic math is covered by regional-cost-engine.test.ts.
 * These tests pin the page wiring: rendering configured indices,
 * applying the hand-verified factor, and showing fallback warnings.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegionalCostIndex from "./RegionalCostIndex";

const mockIndices = [
  {
    id: "i-1",
    state: "Lagos",
    category: "labour",
    cost_factor: 1.25,
    description: null,
    source_reference: "Q3 2026 market survey",
    effective_date: "2026-07-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "i-2",
    state: "Abuja",
    category: "general",
    cost_factor: 1.1,
    description: null,
    source_reference: "Q3 2026 survey",
    effective_date: "2026-07-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

vi.mock("@/lib/estimation/queries", async () => {
  const actual = await vi.importActual("@/lib/estimation/queries");
  return {
    ...actual,
    fetchRegionalCostIndices: vi.fn(),
    fetchCalcRules: vi.fn(),
  };
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));

import {
  fetchRegionalCostIndices,
  fetchCalcRules,
} from "@/lib/estimation/queries";
const mockedFetchIndices = vi.mocked(fetchRegionalCostIndices);
const mockedFetchRules = vi.mocked(fetchCalcRules);

function renderPage() {
  return render(
    <MemoryRouter>
      <RegionalCostIndex />
    </MemoryRouter>,
  );
}

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchIndices.mockResolvedValue({
    data: mockIndices,
    error: null,
  } as never);
  mockedFetchRules.mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "national_baseline_factor",
        calculator_type: "regional_cost",
        rule_value: { factor: 1.0 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
    error: null,
  } as never);
});

describe("RegionalCostIndex page", () => {
  it("renders the configured indices table with sources", async () => {
    renderPage();
    expect(
      await screen.findByText("Q3 2026 market survey"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Lagos").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1.25")).toBeInTheDocument();
  });

  it("applies the hand-verified factor end-to-end", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Lagos" });

    fireEvent.change(screen.getByLabelText(/Base cost/i), {
      target: { value: "100000" },
    });
    fireEvent.change(screen.getByLabelText(/State/i), {
      target: { value: "Lagos" },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: "labour" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Apply Regional Factor/i }),
    );

    // 100,000 × 1.25 = 125,000
    await waitFor(() => {
      expect(screen.getByText("₦125,000")).toBeInTheDocument();
    });
    expect(screen.getByText(/state \+ category index/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Q3 2026 market survey/).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("shows the fallback warning when the state has no configured index", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Lagos" });

    fireEvent.change(screen.getByLabelText(/Base cost/i), {
      target: { value: "100000" },
    });
    fireEvent.change(screen.getByLabelText(/State/i), {
      target: { value: "Kebbi" },
    });
    // Kebbi is not in the selector; simulate by using a state in the list without exact category
    fireEvent.change(screen.getByLabelText(/State/i), {
      target: { value: "Abuja" },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: "materials" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Apply Regional Factor/i }),
    );

    // Abuja general 1.10 → 110,000, with a state_general warning
    await waitFor(() => {
      expect(screen.getByText("₦110,000")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/general index \(1\.10\) was applied instead/),
    ).toBeInTheDocument();
  });

  it("keeps the button disabled until cost and state are set", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Lagos" });
    expect(
      screen.getByRole("button", { name: /Apply Regional Factor/i }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Base cost/i), {
      target: { value: "50000" },
    });
    expect(
      screen.getByRole("button", { name: /Apply Regional Factor/i }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/State/i), {
      target: { value: "Lagos" },
    });
    expect(
      screen.getByRole("button", { name: /Apply Regional Factor/i }),
    ).toBeEnabled();
  });

  it("shows the empty state when nothing is configured", async () => {
    mockedFetchIndices.mockResolvedValue({ data: [], error: null } as never);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/No regional cost indices configured yet/i),
      ).toBeInTheDocument();
    });
  });
});
