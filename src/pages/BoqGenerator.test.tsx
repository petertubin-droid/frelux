/**
 * BOQ Generator page tests (Future Engine 2)
 *
 * The deterministic math is covered by boq-engine.test.ts. These
 * tests pin the page wiring: importing a saved estimate, generating
 * the hand-verified quote, and saving it with a full snapshot.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BoqGenerator from "./BoqGenerator";

const mockEstimate = {
  id: "e1",
  estimate_ref: "PNT-ABC123",
  user_id: "u1",
  client_hash: null,
  calculator_type: "paint",
  project_description: "Living room repaint",
  inputs: {},
  calculation_method: "room_based",
  calc_version_id: null,
  calculated_quantities: {},
  total_material_cost: 100000,
  currency: "NGN",
  labour_status: "not_included",
  warnings: [],
  recommendations: [],
  notes: null,
  status: "completed",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1" }, loading: false })),
}));

vi.mock("@/lib/estimation/queries", async () => {
  const actual = await vi.importActual("@/lib/estimation/queries");
  return {
    ...actual,
    fetchEstimates: vi.fn(),
    fetchCalcRules: vi.fn(),
    saveBoqQuote: vi.fn(),
    updateBoqQuote: vi.fn(),
    saveBoqRevision: vi.fn(),
    fetchBoqRevisions: vi.fn(),
  };
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));

import {
  fetchEstimates,
  fetchCalcRules,
  saveBoqQuote,
} from "@/lib/estimation/queries";
const mockedFetchEstimates = vi.mocked(fetchEstimates);
const mockedFetchRules = vi.mocked(fetchCalcRules);
const mockedSave = vi.mocked(saveBoqQuote);

function renderPage() {
  return render(
    <MemoryRouter>
      <BoqGenerator />
    </MemoryRouter>,
  );
}

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchEstimates.mockResolvedValue({
    data: [mockEstimate],
    error: null,
  } as never);
  mockedFetchRules.mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "vat_rate",
        calculator_type: "boq",
        rule_value: { rate: 7.5 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r2",
        rule_key: "contingency_rate",
        calculator_type: "boq",
        rule_value: { rate: 5 },
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
  mockedSave.mockResolvedValue({ data: null, error: null });
});

describe("BoqGenerator", () => {
  it("imports a saved estimate as a traceable line item", async () => {
    renderPage();
    const importBtn = await screen.findByRole("button", {
      name: /PNT-ABC123/i,
    });
    fireEvent.click(importBtn);

    expect(screen.getByDisplayValue("Living room repaint")).toBeInTheDocument();
    expect(screen.getByDisplayValue("PNT-ABC123")).toBeInTheDocument();
    expect(screen.getByDisplayValue("100000")).toBeInTheDocument();
  });

  it("generates the hand-verified quote end-to-end", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /PNT-ABC123/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add manual line/i }));

    fireEvent.change(screen.getByLabelText(/Quote title \*/i), {
      target: { value: "Repaint job" },
    });
    fireEvent.change(screen.getByLabelText(/Client name \*/i), {
      target: { value: "Mrs Ada Obi" },
    });

    // Manual line: 1 × 150,000
    const descInputs = await screen.findAllByLabelText(/Description/i);
    fireEvent.change(descInputs[1], { target: { value: "POP ceiling" } });
    const costInputs = screen.getAllByLabelText(/Unit cost/i);
    fireEvent.change(costInputs[1], { target: { value: "150000" } });

    fireEvent.click(screen.getByRole("button", { name: /Generate Quote/i }));

    // Subtotal 250,000 · contingency 12,500 · VAT 19,687.5 · grand 282,187.5
    await waitFor(() => {
      // Grand total renders twice by design: the premium totals tile
      // and the quote table row. Both must show the same verified amount.
      expect(screen.getAllByText("₦282,187.5")).toHaveLength(2);
    });
    expect(screen.getByText(/Contingency \(5%\)/)).toBeInTheDocument();
    expect(screen.getByText(/VAT \(7.5%\)/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Export PDF/i }),
    ).toBeInTheDocument();
  });

  it("keeps Generate disabled until title, client and items are present", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /PNT-ABC123/i }));

    // No title / client yet → disabled even with an imported line
    expect(
      screen.getByRole("button", { name: /Generate Quote/i }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Quote title \*/i), {
      target: { value: "Repaint job" },
    });
    expect(
      screen.getByRole("button", { name: /Generate Quote/i }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Client name \*/i), {
      target: { value: "Mrs Ada Obi" },
    });
    expect(
      screen.getByRole("button", { name: /Generate Quote/i }),
    ).toBeEnabled();
  });

  it("saves the quote with items, totals and rates snapshot", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /PNT-ABC123/i }));
    fireEvent.change(screen.getByLabelText(/Quote title \*/i), {
      target: { value: "Repaint job" },
    });
    fireEvent.change(screen.getByLabelText(/Client name \*/i), {
      target: { value: "Mrs Ada Obi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate Quote/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Export PDF/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Quote/i }));
    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    const payload = mockedSave.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.quote_ref).toMatch(/^BOQ-/);
    expect(payload.status).toBe("draft");
    expect(payload.totals).toMatchObject({
      subtotal: 100000,
      contingency_amount: 5000,
      vat_amount: 7875,
      grand_total: 112875,
    });
    expect(payload.rates_snapshot).toMatchObject({ vat_source: "calc_rules" });
  });
});

describe("BoqGenerator — Wave 1.2 (revisions, tax naming, bank BOQ gate)", () => {
  it("labels the tax row with the selected market's scheme (DE -> MwSt)", async () => {
    renderPage();
    const importBtn = await screen.findByRole("button", {
      name: /PNT-ABC123/i,
    });
    fireEvent.click(importBtn);
    fireEvent.change(screen.getByLabelText(/Quote title \*/i), {
      target: { value: "Berlin flat" },
    });
    fireEvent.change(screen.getByLabelText(/Client name \*/i), {
      target: { value: "Herr Schmidt" },
    });
    // Switch the market select to Germany
    fireEvent.change(screen.getByLabelText(/Tax scheme/i), {
      target: { value: "DE" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate Quote/i }));
    // The tax row now uses MwSt naming, never "VAT"
    const row = await screen.findByText(/MwSt \(7\.5%\)/);
    expect(row).toBeInTheDocument();
  });

  it("gates the bank BOQ export for free users with an upgrade message", async () => {
    renderPage();
    const importBtn = await screen.findByRole("button", {
      name: /PNT-ABC123/i,
    });
    fireEvent.click(importBtn);
    fireEvent.change(screen.getByLabelText(/Quote title \*/i), {
      target: { value: "Loan BOQ" },
    });
    fireEvent.change(screen.getByLabelText(/Client name \*/i), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate Quote/i }));

    const bankBtn = await screen.findByRole("button", {
      name: /Export Bank BOQ/i,
    });
    // Free user (isPaid false in the default mock)
    fireEvent.click(bankBtn);
    expect(
      await screen.findByText(/Frelux Pro feature/i),
    ).toBeInTheDocument();
  });

  it("saves revision v1 and snapshots it to the revision history", async () => {
    const { saveBoqRevision, fetchBoqRevisions } = await import(
      "@/lib/estimation/queries"
    );
    const mockedSnapshot = vi.mocked(saveBoqRevision);
    const mockedFetchRevs = vi.mocked(fetchBoqRevisions);
    mockedFetchRevs.mockResolvedValue({ data: [], error: null } as never);
    mockedSnapshot.mockResolvedValue({ data: null, error: null } as never);
    const mockedSaveNow = vi.mocked(saveBoqQuote);
    mockedSaveNow.mockResolvedValue({
      data: { id: "q1", quote_ref: "BOQ-X1", revision: 1 },
      error: null,
    } as never);

    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /PNT-ABC123/i }),
    );
    fireEvent.change(screen.getByLabelText(/Quote title \*/i), {
      target: { value: "Versioned quote" },
    });
    fireEvent.change(screen.getByLabelText(/Client name \*/i), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate Quote/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /^Save Quote$/i }),
    );

    await waitFor(() => {
      expect(mockedSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ version: 1, quote_id: "q1" }),
      );
    });
    expect(
      await screen.findByText(/revision v1/i),
    ).toBeInTheDocument();
  });
});
