import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminQuotationSettings from "./AdminQuotationSettings";
import * as contractor from "@/lib/contractor";
import type { DbQuotationSettings } from "@/types/database";

// The fixture mirrors DbQuotationSettings exactly. It previously carried
// payment_terms, bank_details and notes, which the table does not have, so the
// suite typechecked against nothing and left the real columns untested.
const mockSettings: DbQuotationSettings = {
  id: "quote-settings-1",
  company_name: "FRELUX ConTech Ltd",
  company_phone: "+234 800 123 4567",
  company_email: "billing@freluxtools.com",
  company_logo_url: "https://example.com/logo.png",
  company_address: "12 Marina Boulevard, Lagos Island",
  default_terms_conditions: "All quotes valid subject to site inspection.",
  default_payment_terms:
    "50% upfront deposit, 30% stage completion, 20% handover.",
  default_validity_days: 30,
  default_markup_percentage: 15,
  default_profit_percentage: 20,
  default_tax_percentage: 7.5,
  currency: "NGN",
  currency_symbol: "\u20a6",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

vi.mock("@/lib/contractor", () => ({
  fetchQuotationSettings: vi.fn(),
  updateQuotationSettings: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(contractor.fetchQuotationSettings).mockResolvedValue(mockSettings);
  // updateQuotationSettings returns void, not the saved row.
  vi.mocked(contractor.updateQuotationSettings).mockResolvedValue(undefined);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminQuotationSettings />
    </MemoryRouter>,
  );
}

describe("AdminQuotationSettings", () => {
  it("loads and displays quotation settings for branding and pricing", async () => {
    renderPage();

    expect(
      await screen.findByDisplayValue("FRELUX ConTech Ltd"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("+234 800 123 4567")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("billing@freluxtools.com"),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("12 Marina Boulevard, Lagos Island"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("15")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
  });

  it("updates quotation settings fields and triggers update API on Save", async () => {
    renderPage();

    await screen.findByDisplayValue("FRELUX ConTech Ltd");
    const nameInput = screen.getByDisplayValue("FRELUX ConTech Ltd");
    fireEvent.change(nameInput, {
      target: { value: "FRELUX Global Engineering" },
    });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(contractor.updateQuotationSettings).toHaveBeenCalledWith(
        "quote-settings-1",
        expect.objectContaining({
          company_name: "FRELUX Global Engineering",
          default_payment_terms:
            "50% upfront deposit, 30% stage completion, 20% handover.",
          default_markup_percentage: 15,
        }),
      );
    });
  });

  it("displays success banner after successful save", async () => {
    renderPage();

    await screen.findByDisplayValue("FRELUX ConTech Ltd");
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    expect(
      await screen.findByText("Settings saved successfully."),
    ).toBeInTheDocument();
  });

  it("displays error message if saving quotation settings fails", async () => {
    vi.mocked(contractor.updateQuotationSettings).mockRejectedValue(
      new Error("RLS violation updating quotation settings"),
    );

    renderPage();

    await screen.findByDisplayValue("FRELUX ConTech Ltd");
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    expect(
      await screen.findByText("RLS violation updating quotation settings"),
    ).toBeInTheDocument();
  });

  it("displays error state when initial settings fetch fails", async () => {
    vi.mocked(contractor.fetchQuotationSettings).mockRejectedValue(
      new Error("Database connection lost"),
    );

    renderPage();

    expect(
      await screen.findByText("Database connection lost"),
    ).toBeInTheDocument();
    expect(screen.getByText("Couldn't load settings")).toBeInTheDocument();
  });

  it("displays empty state when no quotation settings row exists", async () => {
    vi.mocked(contractor.fetchQuotationSettings).mockResolvedValue(null as any);

    renderPage();

    expect(await screen.findByText("No settings found")).toBeInTheDocument();
  });
});
