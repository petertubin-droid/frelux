import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TaxAndFxCard from "./TaxAndFxCard";
import type { TaxResolution } from "@/lib/tax/tax-calculator";
import type { FxConversion } from "@/lib/fx/fx-converter";
import type { WithholdingResolution } from "@/lib/tax/withholding";

const okTax: TaxResolution = {
  status: "ok",
  taxName: "Value Added Tax (VAT)",
  ratePct: 20,
  additionalLeviesPct: 0,
  effectivePct: 20,
  basis: "Standard rate on most goods and services",
  citation: {
    title: "VAT rates",
    url: "https://www.gov.uk/vat-rates",
    publisher: "HM Revenue & Customs",
  },
  effectiveDate: "2024-01-01",
  message: "VAT at 20% for GB.",
};

const leviesTax: TaxResolution = {
  ...okTax,
  taxName: "Value Added Tax (VAT) + NHIL + GETFund",
  ratePct: 15,
  additionalLeviesPct: 5,
  effectivePct: 20,
  citation: {
    title: "Ghana VAT",
    url: "https://gra.gov.gh/",
    publisher: "Ghana Revenue Authority",
  },
};

const variesTax: TaxResolution = {
  status: "varies",
  taxName: "Sales and Use Tax (state/local)",
  basis: "No federal sales tax; rates vary by state.",
  citation: {
    title: "State Sales Tax Rates",
    url: "https://www.taxadmin.org/",
    publisher: "Federation of Tax Administrators",
  },
  effectiveDate: "2026-01-01",
  message:
    "Sales and Use Tax (state/local) for US has no single national rate. No rate is applied rather than guessing.",
};

const directFx: FxConversion = {
  status: "ok",
  from: "NGN",
  to: "USD",
  amount: 100000,
  result: 75.11,
  compositeRate: 0.000751,
  legs: [
    {
      base: "USD",
      quote: "NGN",
      rate: 1331.826337,
      provider: "open.er-api.com",
      sourceUrl: "https://open.er-api.com/v6/latest/USD",
      fetchedAt: "2026-10-15T00:02:31Z",
    },
  ],
  message:
    "Direct recorded rate: USD->NGN @ 1331.826337 (open.er-api.com, 2026-10-15T00:02:31Z).",
};

const refusedFx: FxConversion = {
  status: "unavailable",
  from: "NGN",
  to: "USD",
  amount: 100000,
  result: null,
  compositeRate: null,
  legs: [],
  message:
    "No recorded NGN->USD rate and no complete recorded bridge exist. No rate is estimated.",
};

const pendingW: WithholdingResolution = {
  status: "pending_only",
  marketCode: "NG",
  actionableRules: [],
  pendingRules: [
    {
      id: "w1",
      market_code: "NG",
      rule_kind: "withholding",
      rule_name: "Construction contract WHT (companies)",
      rate_pct: 2,
      applies_to: "contractor_payments",
      basis: "WHT on construction payments",
      citation_title: "t",
      citation_url: "https://example.com",
      citation_publisher: "Denton Acas Law",
      effective_date: "2024-07-01",
      legal_review_status: "pending",
      reviewed_at: null,
      is_active: true,
    },
  ],
  message: "1 rule exists but is pending legal review: never computed.",
};

const noneW: WithholdingResolution = {
  status: "none",
  marketCode: "ZZ",
  actionableRules: [],
  pendingRules: [],
  message: "No settlement/withholding rule is on file. None is invented.",
};

const taxMock = vi.hoisted(() => ({ resolve: vi.fn() }));
const fxMock = vi.hoisted(() => ({ convert: vi.fn() }));
const whMock = vi.hoisted(() => ({ resolve: vi.fn() }));

vi.mock("@/lib/tax/tax-calculator", () => ({
  resolveConsumptionTax: (...a: unknown[]) => taxMock.resolve(...a),
}));
vi.mock("@/lib/fx/fx-converter", () => ({
  convertAmount: (...a: unknown[]) => fxMock.convert(...a),
}));
vi.mock("@/lib/tax/withholding", () => ({
  resolveWithholding: (...a: unknown[]) => whMock.resolve(...a),
}));

describe("TaxAndFxCard", () => {
  beforeEach(() => {
    taxMock.resolve.mockReset();
    fxMock.convert.mockReset();
    whMock.resolve.mockReset();
  });

  it("renders the verified rate with citation and basis", async () => {
    taxMock.resolve.mockResolvedValue(okTax);
    whMock.resolve.mockResolvedValue(noneW);
    fxMock.convert.mockResolvedValue(directFx);
    render(
      <TaxAndFxCard marketCode="GB" quoteCurrency="NGN" grandTotal={100000} />,
    );
    expect(
      await screen.findByText(/Value Added Tax \(VAT\)/),
    ).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(
      screen.getByText(/Standard rate on most goods/),
    ).toBeInTheDocument();
    expect(screen.getByText(/HM Revenue & Customs/)).toHaveAttribute(
      "href",
      "https://www.gov.uk/vat-rates",
    );
    expect(screen.queryByTestId("tax-unknown")).toBeNull();
  });

  it("discloses verified levies (GH 15 + 5)", async () => {
    taxMock.resolve.mockResolvedValue(leviesTax);
    whMock.resolve.mockResolvedValue(noneW);
    fxMock.convert.mockResolvedValue(directFx);
    render(
      <TaxAndFxCard marketCode="GH" quoteCurrency="NGN" grandTotal={1000} />,
    );
    expect(await screen.findByText(/base 15% \+ verified levies 5%/)).toBeInTheDocument();
  });

  it("shows the varies disclosure instead of a rate (US)", async () => {
    taxMock.resolve.mockResolvedValue(variesTax);
    whMock.resolve.mockResolvedValue(noneW);
    fxMock.convert.mockResolvedValue(directFx);
    render(
      <TaxAndFxCard marketCode="US" quoteCurrency="NGN" grandTotal={100} />,
    );
    expect(await screen.findByTestId("tax-varies")).toHaveTextContent(
      /no single national rate/,
    );
  });

  it("renders FX result with provenance", async () => {
    taxMock.resolve.mockResolvedValue(okTax);
    whMock.resolve.mockResolvedValue(noneW);
    fxMock.convert.mockResolvedValue(directFx);
    render(
      <TaxAndFxCard marketCode="GB" quoteCurrency="NGN" grandTotal={100000} />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("fx-result")).toHaveTextContent(/\$/),
    );
    expect(screen.getByTestId("fx-provenance")).toHaveTextContent(
      /open\.er-api\.com/,
    );
    expect(screen.queryByText("bridged")).toBeNull();
  });

  it("renders an FX refusal as a refusal, never an invented number", async () => {
    taxMock.resolve.mockResolvedValue(okTax);
    whMock.resolve.mockResolvedValue(noneW);
    fxMock.convert.mockResolvedValue(refusedFx);
    render(
      <TaxAndFxCard marketCode="GB" quoteCurrency="NGN" grandTotal={100000} />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("fx-provenance")).toHaveTextContent(
        /no rate is estimated/i,
      ),
    );
    expect(screen.getByTestId("fx-result")).toHaveTextContent("—");
  });

  it("badges pending withholding rules as informational only", async () => {
    taxMock.resolve.mockResolvedValue(okTax);
    whMock.resolve.mockResolvedValue(pendingW);
    fxMock.convert.mockResolvedValue(directFx);
    render(
      <TaxAndFxCard marketCode="NG" quoteCurrency="NGN" grandTotal={50} />,
    );
    const badge = await screen.findByTestId("wh-pending");
    expect(badge).toHaveTextContent(/pending legal review — informational/);
    expect(
      screen.getByText(/Construction contract WHT \(companies\)/),
    ).toBeInTheDocument();
    expect(screen.queryByText("approved")).toBeNull();
  });

  it("asks for a quote when there is nothing to convert", async () => {
    taxMock.resolve.mockResolvedValue(okTax);
    whMock.resolve.mockResolvedValue(noneW);
    render(
      <TaxAndFxCard marketCode="GB" quoteCurrency="NGN" grandTotal={null} />,
    );
    expect(
      await screen.findByText(/Generate a quote to convert its grand total/),
    ).toBeInTheDocument();
    expect(fxMock.convert).not.toHaveBeenCalled();
  });

  it("renders the none-withholding disclosure", async () => {
    taxMock.resolve.mockResolvedValue(okTax);
    whMock.resolve.mockResolvedValue(noneW);
    fxMock.convert.mockResolvedValue(directFx);
    render(
      <TaxAndFxCard marketCode="GB" quoteCurrency="NGN" grandTotal={10} />,
    );
    expect(await screen.findByText(/None is invented/)).toBeInTheDocument();
  });
});
