/**
 * Defect Diagnosis page tests (Future Engine 9)
 *
 * The deterministic logic is covered by defect-diagnosis-engine.test.ts.
 * These pin the page wiring and the route-registration
 * regression net (extended to every engine, including nav).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DefectDiagnosis from "./DefectDiagnosis";

const mockDefects = vi.hoisted(() => [
  {
    id: "d-1",
    symptom_key: "efflorescence",
    symptom_label: "White salty deposits on walls",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

const mockCauses = vi.hoisted(() => [
  {
    id: "c-1",
    defect_id: "d-1",
    cause_key: "salt_migration",
    cause_label: "Salt migration through masonry",
    root_cause:
      "Water carries dissolved salts through the wall; salts crystallise on the surface as water evaporates.",
    severity: "high",
    fix_summary:
      "Fix the moisture source, then apply a stabilising primer before redecoration.",
    fix_material: "Stabilising primer",
    fix_consumption_per_sqm: 0.25,
    fix_unit: "litre",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchDefects: vi.fn().mockResolvedValue({ data: mockDefects, error: null }),
  fetchDefectCauses: vi
    .fn()
    .mockResolvedValue({ data: mockCauses, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "rounding_decimals",
        calculator_type: "defects",
        rule_value: { value: 2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
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

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <DefectDiagnosis />
    </MemoryRouter>,
  );
}

describe("DefectDiagnosis page", () => {
  it("lists configured symptoms in the selector", async () => {
    renderPage();
    expect(
      await screen.findByRole("option", {
        name: /White salty deposits on walls/,
      }),
    ).toBeInTheDocument();
  });

  it("renders the hand-verified diagnosis with fix quantity end-to-end", async () => {
    renderPage();
    fireEvent.change(await screen.findByRole("combobox"), {
      target: { value: "efflorescence" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 120"), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Diagnose/i }));

    // 120 sqm × 0.25 litre/sqm = 30 litres
    await waitFor(() => {
      expect(
        screen.getAllByText(/Salt migration through masonry/).length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText(/30 litre/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/for 120 sqm/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/high severity/i)).toBeInTheDocument();
  });

  it("gives a qualitative note when no area is entered", async () => {
    renderPage();
    fireEvent.change(await screen.findByRole("combobox"), {
      target: { value: "efflorescence" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Diagnose/i }));
    await waitFor(() => {
      expect(
        screen.getByText(
          /Enter an affected area to compute the exact fix quantity/,
        ),
      ).toBeInTheDocument();
    });
  });

  it("disables Diagnose until a symptom is selected", async () => {
    renderPage();
    await screen.findByRole("combobox");
    expect(screen.getByRole("button", { name: /Diagnose/i })).toBeDisabled();
  });

  it("shows the empty state when no symptoms are configured", async () => {
    const { fetchDefects } = await import("@/lib/estimation/queries");
    vi.mocked(fetchDefects).mockResolvedValueOnce({ data: [], error: null });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/No defect symptoms configured yet/i),
      ).toBeInTheDocument();
    });
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
    ]) {
      expect(nav, `AdminLayout must link to ${entry}`).toContain(entry);
    }
  });
});
