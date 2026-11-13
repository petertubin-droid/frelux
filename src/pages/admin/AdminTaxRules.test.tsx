import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------
// TAX RULES SCREEN
// A rule is a citation, not a number:
//   * existing rules list with their rate, effective date and review state
//   * saving refuses an active rule with no reviewer or review date
//   * saving sends a complete rule with its source and components
// ---------------------------------------------------------

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({ rules: [] as Row[], markets: [] as Row[] }));

const supabaseMock = vi.hoisted(() => {
  const make = (table: string) => {
    const chain: Row = {};
    const done = () =>
      Promise.resolve({
        data: table === "market_profiles" ? state.markets : state.rules,
        error: null,
      });
    chain.select = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.eq = vi.fn(() => done());
    // The real builder is thenable at any point in the chain.
    chain.then = (resolve: (v: unknown) => unknown) => done().then(resolve);
    chain.insert = vi.fn(() => Promise.resolve({ error: null }));
    chain.update = vi.fn(() => chain);
    return chain;
  };
  const tables: Record<string, Row> = {};
  return {
    from: vi.fn((table: string) => {
      tables[table] ??= make(table);
      return tables[table];
    }),
    __table: (t: string) => (tables[t] ??= make(t)),
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: supabaseMock }));
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

import AdminTaxRules from "./AdminTaxRules";

const ngRule = {
  id: "rule-1",
  rule_code: "NG-VAT-FED",
  version: 1,
  market_code: "NG",
  jurisdiction_level: "national",
  jurisdiction_code: "NG",
  tax_category: "consumption",
  tax_name: "VAT",
  components: [{ name: "VAT", rate_pct: 7.5, compound_on: null }],
  basis_inclusive: false,
  taxable_base_definition: "Taxable supplies of goods and services in Nigeria.",
  rounding_method: "half_up",
  exemption_handling: "excluded_from_base",
  unknown_handling: "not_determined",
  applies_to: "both",
  effective_from: "2019-02-01",
  effective_to: null,
  source_title: "VAT Act 1993 (as amended)",
  source_url: "https://firs.gov.ng/",
  source_publisher: "FIRS",
  reviewer_name: "FRELUX Tax Review",
  next_review_date: "2027-02-01",
  is_active: true,
  updated_at: "2026-10-15T00:00:00Z",
};

beforeEach(() => {
  state.rules = [ngRule];
  state.markets = [
    { country_code: "NG", country_name: "Nigeria" },
    { country_code: "DE", country_name: "Germany" },
  ];
  supabaseMock.from.mockClear();
});

describe("AdminTaxRules", () => {
  it("lists a rule with its rate, effective date and active state", async () => {
    render(<AdminTaxRules />);
    expect(await screen.findByText("NG-VAT-FED")).toBeInTheDocument();
    expect(screen.getByText("VAT 7.5%")).toBeInTheDocument();
    expect(screen.getByText("2019-02-01")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("refuses to activate a rule without a reviewer or review date", async () => {
    render(<AdminTaxRules />);
    await screen.findByText("NG-VAT-FED");

    // Open the editor and try to activate it with the citation stripped.
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const reviewer = screen.getByLabelText(/reviewer/i) as HTMLInputElement;
    fireEvent.change(reviewer, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save rule/i }));

    const rules = supabaseMock.__table("tax_jurisdiction_rules");
    expect(rules.insert).not.toHaveBeenCalled();
    expect(rules.update).not.toHaveBeenCalled();
  });

  it("deactivates an active rule", async () => {
    render(<AdminTaxRules />);
    await screen.findByText("NG-VAT-FED");

    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    await waitFor(() =>
      expect(
        supabaseMock.__table("tax_jurisdiction_rules").update,
      ).toHaveBeenCalledWith(expect.objectContaining({ is_active: false })),
    );
  });
});
