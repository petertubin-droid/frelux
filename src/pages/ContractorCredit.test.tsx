/**
 * Contractor Credit page tests (Future Engine 13)
 *
 * The deterministic math is covered by contractor-credit-engine.test.ts.
 * These pin the page wiring (profile loading, scoring, rendering)
 * and extend the route-registration regression net.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ContractorCredit from "./ContractorCredit";

const mockProfiles = vi.hoisted(() => [
  {
    id: "p-1",
    contractor_name: "Adebayo Construction Ltd",
    registration_number: "RC-123456",
    verified_jobs: 60,
    on_time_jobs: 54,
    dispute_count: 1,
    avg_estimate_error_pct: 12,
    description: null,
    verification_reference:
      "Audited job file 2024–2026 + warranty certificate hashes",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "p-2",
    contractor_name: "NewHand Ventures",
    registration_number: null,
    verified_jobs: 0,
    on_time_jobs: 0,
    dispute_count: 0,
    avg_estimate_error_pct: 0,
    description: null,
    verification_reference: "Onboarding file — no audited jobs yet",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchContractorCreditProfiles: vi
    .fn()
    .mockResolvedValue({ data: mockProfiles, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "on_time_weight",
        calculator_type: "credit_score",
        rule_value: { value: 0.35 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r2",
        rule_key: "accuracy_weight",
        calculator_type: "credit_score",
        rule_value: { value: 0.35 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r3",
        rule_key: "volume_weight",
        calculator_type: "credit_score",
        rule_value: { value: 0.2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 2,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r4",
        rule_key: "verified_jobs_reference",
        calculator_type: "credit_score",
        rule_value: { value: 50 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 3,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r5",
        rule_key: "dispute_penalty_points",
        calculator_type: "credit_score",
        rule_value: { value: 10 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 4,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r6",
        rule_key: "strong_threshold",
        calculator_type: "credit_score",
        rule_value: { value: 70 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 5,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r7",
        rule_key: "excellent_threshold",
        calculator_type: "credit_score",
        rule_value: { value: 90 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 6,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r8",
        rule_key: "rounding_decimals",
        calculator_type: "credit_score",
        rule_value: { value: 1 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 7,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
    error: null,
  }),
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/lib/safeError", () => ({
  getSafeError: vi.fn((_e: unknown, fallback: string) => fallback),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ContractorCredit />
    </MemoryRouter>,
  );
}

describe("ContractorCredit page", () => {
  it("lists the verified contractors with their registrations", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("option", {
          name: /Adebayo Construction Ltd \(RC-123456\)/,
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("option", { name: "NewHand Ventures" }),
    ).toBeInTheDocument();
  });

  it("computes the hand-verified 72.3 Strong score end to end", async () => {
    renderPage();
    await screen.findByRole("option", { name: /Adebayo Construction Ltd/ });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "p-1" },
    });

    // base 82.3 − penalty 10 = 72.3, Strong
    await waitFor(() => {
      expect(screen.getByText("72.3")).toBeInTheDocument();
    });
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("−10")).toBeInTheDocument();
    // the verification source is shown, not hidden
    expect(screen.getByText(/Audited job file 2024–2026/)).toBeInTheDocument();
  });

  it("refuses a zero-verified contractor honestly — never scores them zero", async () => {
    renderPage();
    await screen.findByRole("option", { name: "NewHand Ventures" });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "p-2" },
    });
    await waitFor(() => {
      expect(
        screen.getByText(/no verified jobs on record/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/not a zero score/i)).toBeInTheDocument();
    // no score tile was rendered
    expect(screen.queryByText("out of 100")).not.toBeInTheDocument();
  });

  it("shows no score until a contractor is selected", async () => {
    renderPage();
    await screen.findByRole("option", { name: "NewHand Ventures" });
    expect(screen.queryByText("out of 100")).not.toBeInTheDocument();
  });
});

describe("engine route registration (regression)", () => {
  it("registers public routes for every engine page in App.tsx", async () => {
    const fs = await import("fs");
    const app = fs.readFileSync("src/App.tsx", "utf-8");
    for (const path of [
      '"/maintenance-planner"',
      '"/boq-generator"',
      '"/regional-cost-index"',
      '"/carbon-footprint"',
      '"/cash-flow-timeline"',
      '"/labour-estimator"',
      '"/margin-calculator"',
      '"/defect-diagnosis"',
      '"/estimate-refresh"',
      '"/warranty-certificate"',
      '"/heat-comfort"',
      '"/circular-reuse"',
      '"/contractor-credit"',
    ]) {
      expect(app, `App.tsx must register the route ${path}`).toContain(path);
    }
    for (const path of [
      '"maintenance-profiles"',
      '"regional-cost-indices"',
      '"carbon-factors"',
      '"cash-flow-templates"',
      '"labour-rates"',
      '"margin-presets"',
      '"defects"',
      '"thermal-factors"',
      '"reuse-factors"',
      '"credit-profiles"',
    ]) {
      expect(app, `App.tsx must register the admin route ${path}`).toContain(
        path,
      );
    }
  });

  it("registers admin NAV entries for every admin pane (catches silent wiring aborts)", async () => {
    const fs = await import("fs");
    const nav = fs.readFileSync(
      "src/components/admin/AdminLayout.tsx",
      "utf-8",
    );
    for (const entry of [
      '"/admin/maintenance-profiles"',
      '"/admin/regional-cost-indices"',
      '"/admin/carbon-factors"',
      '"/admin/cash-flow-templates"',
      '"/admin/labour-rates"',
      '"/admin/margin-presets"',
      '"/admin/defects"',
      '"/admin/thermal-factors"',
      '"/admin/reuse-factors"',
      '"/admin/credit-profiles"',
    ]) {
      expect(nav, `AdminLayout must link to ${entry}`).toContain(entry);
    }
  });
});
