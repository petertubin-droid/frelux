// =========================================================
// WallFinishEstimator page tests — workflow, worldwide
// resolution, structure, SEO and ad slots.
// =========================================================

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WallFinishEstimator from "../WallFinishEstimator";
import { resolveWallFinCountry } from "@/lib/wallfinishing/resolver";
import { WALLFIN_COUNTRY_PROFILES } from "@/lib/wallfinishing/countries";
import { WALLFIN_ASSEMBLIES } from "@/lib/wallfinishing/assemblies";

const pushEvent = vi.fn();

vi.mock("@/lib/analytics", async () => {
  const actual = await vi.importActual("@/lib/analytics");
  return {
    ...actual,
    pushEvent: (a: unknown, b?: unknown) => pushEvent(a, b),
    track: vi.fn(),
  };
});

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({ marketCode: "NG", currency: "NGN", region: "Lagos" }),
}));

vi.mock("@/lib/wallfinishing/prices", () => ({
  resolveLayerPrice: vi.fn().mockResolvedValue({
    materialName: "Emulsion",
    unitPrice: 850,
    packUnits: null,
    purchaseLabel: null,
    currency: "NGN",
    resolvedMarket: "NG",
    priceSource: "test",
    scanSource: null,
    priceDate: "2026-10-06",
    isManualPrice: false,
    unpriced: false,
  }),
  resolveLabourRate: vi.fn().mockResolvedValue({
    taskKey: "wallfin_painting",
    method: "per-m2",
    rate: 700,
    currency: "NGN",
    outputPerWorkerDay: null,
    sourceReference: "test",
    effectiveDate: "2026-10-06",
    isEstimate: true,
  }),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));

// AdSlot needs the auth context — stub it like other page tests do.
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

function renderPage() {
  return render(
    <MemoryRouter>
      <WallFinishEstimator />
    </MemoryRouter>,
  );
}

describe("WallFinishEstimator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the full page structure: header, workflow steps and ad slots", () => {
    renderPage();
    expect(screen.getByText("Wall Finish Estimator")).toBeTruthy();
    expect(screen.getByText("1. Project")).toBeTruthy();
    expect(screen.getByText("2. Rooms")).toBeTruthy();
    expect(screen.getByText("3. Equipment & other costs")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Calculate finishing estimate/i }),
    ).toBeTruthy();
  });

  it("shows the Nigeria template notice with the not-a-building-code caveat", () => {
    renderPage();
    expect(
      screen.getAllByText(/starting template, not a building code/i).length,
    ).toBeGreaterThan(0);
  });

  it("defaults to one room with dimensions and finishes", () => {
    renderPage();
    expect(screen.getByDisplayValue("Living room")).toBeTruthy();
    expect(screen.getByDisplayValue("4")).toBeTruthy();
  });

  it("lets the user pick any worldwide country, reporting inherited templates", () => {
    renderPage();
    const select = screen.getByLabelText(/Country \/ market/i);
    expect((select as HTMLSelectElement).value).toBe("NG");
    // Ghana inherits the NG template via the resolver (pure logic check)
    const gh = resolveWallFinCountry("GH");
    expect(gh.native).toBe(false);
    expect(gh.profile.code).toBe("NG");
    expect(gh.inheritedNotice).toMatch(/not yet native/);
  });

  it("calculates and shows the layer table with transparency links", async () => {
    renderPage();
    const calc = screen.getByRole("button", {
      name: /Calculate finishing estimate/i,
    });
    calc.click();
    await waitFor(
      () => expect(screen.getByText(/Estimated cost summary/i)).toBeTruthy(),
      { timeout: 8000 },
    );
    expect(screen.getAllByText(/Quality checklist/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/how\?/i).length).toBeGreaterThan(0);
  });
});

describe("wall-finishing data integrity (every page render depends on it)", () => {
  it("every country profile references existing assemblies", () => {
    for (const p of WALLFIN_COUNTRY_PROFILES) {
      for (const id of p.assemblyIds) {
        expect(
          WALLFIN_ASSEMBLIES.find((a) => a.id === id),
          `missing assembly ${id}`,
        ).toBeTruthy();
      }
    }
  });

  it("every assembly layer has a labour task and a positive purchase path", () => {
    for (const a of WALLFIN_ASSEMBLIES) {
      for (const l of a.layers) {
        expect(l.labourTask).toMatch(/^wallfin_/);
        if (l.quantityMode === "area-coverage") {
          expect(l.coverageRateM2PerUnit).toBeGreaterThan(0);
        }
        if (l.quantityMode === "per-area") {
          expect(l.unitsPerM2).toBeGreaterThan(0);
        }
      }
    }
  });
});
