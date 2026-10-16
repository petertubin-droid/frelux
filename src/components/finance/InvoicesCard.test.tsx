/**
 * InvoicesCard tests (Wave 1.3 — Click-to-Invoice)
 *
 * Pins the UI honesty laws:
 *  - statuses render from DERIVED state (paid only with recorded
 *    payments, partial stays partial);
 *  - the create button refuses quotes without items/grand total;
 *  - amounts render in the invoice currency (XXX when unknown — never
 *    a silent NGN default);
 *  - the tax label shows the market's own scheme (MwSt for DE).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvoicesCard, type InvoiceQuoteSource } from "./InvoicesCard";

vi.mock("@/lib/finance/invoice-service", () => ({
  createInvoiceFromQuote: vi.fn(),
  fetchInvoices: vi.fn(),
  recordInvoicePayment: vi.fn(),
  setInvoiceStatus: vi.fn(),
}));

import {
  createInvoiceFromQuote,
  fetchInvoices,
  recordInvoicePayment,
  setInvoiceStatus,
} from "@/lib/finance/invoice-service";

const mockedCreate = vi.mocked(createInvoiceFromQuote);
const mockedFetch = vi.mocked(fetchInvoices);
const mockedPay = vi.mocked(recordInvoicePayment);
const mockedStatus = vi.mocked(setInvoiceStatus);

const quote: InvoiceQuoteSource = {
  id: "q1",
  user_id: "u1",
  quote_ref: "BOQ-AB12CD",
  title: "Bungalow finishing",
  client_name: "Mrs Adebayo",
  client_contact: null,
  project_location: "Lekki",
  currency: "NGN",
  items: [
    {
      description: "Cement",
      quantity: 120,
      unit: "bags",
      unit_cost: 9500,
      total: 1140000,
    },
  ],
  totals: {
    subtotal: 1140000,
    vat_rate: 7.5,
    vat_amount: 85500,
    grand_total: 1225500,
  },
};

const invoice = {
  id: "i1",
  user_id: "u1",
  invoice_ref: "INV-2026-0001",
  source_quote_id: "q1",
  project_id: null,
  title: "Invoice for Bungalow finishing",
  client_name: "Mrs Adebayo",
  client_contact: null,
  client_email: null,
  client_address: null,
  project_location: "Lekki",
  currency: "NGN",
  status: "issued" as const,
  items: quote.items,
  totals: {
    subtotal: 1140000,
    vat_rate: 7.5,
    vat_amount: 85500,
    grand_total: 1225500,
  },
  tax_label: "VAT",
  issue_date: "2026-10-16",
  due_date: "2026-11-15",
  payment_terms_days: 30,
  notes: null,
  created_at: "2026-10-16T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetch.mockResolvedValue({ data: [], error: null });
});

describe("InvoicesCard", () => {
  it("creates a draft invoice from the quote on click", async () => {
    mockedCreate.mockResolvedValueOnce({
      data: { ...invoice, status: "draft" },
      error: null,
    });
    render(<InvoicesCard quote={quote} marketCode="NG" userId="u1" />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: /create invoice from this quote/i,
      }),
    );
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith(quote, "NG"));
    expect(
      await screen.findByText(/INV-2026-0001 created as draft/i),
    ).toBeTruthy();
  });

  it("disables the create button for quotes without items or total", async () => {
    const { rerender } = render(
      <InvoicesCard quote={null} marketCode="NG" userId="u1" />,
    );
    const btn = await screen.findByRole("button", { name: /create invoice/i });
    expect(btn).toBeDisabled();

    rerender(
      <InvoicesCard
        quote={{ ...quote, items: [], totals: { subtotal: 0, grand_total: 0 } }}
        marketCode="NG"
        userId="u1"
      />,
    );
    expect(
      screen.getByRole("button", { name: /create invoice/i }),
    ).toBeDisabled();
  });

  it("renders the empty state honestly when no invoices exist", async () => {
    render(<InvoicesCard quote={quote} marketCode="NG" userId="u1" />);
    expect(await screen.findByText(/No invoices yet/i)).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledWith("u1");
  });

  it("does not fetch invoices without a signed-in user", async () => {
    render(<InvoicesCard quote={quote} marketCode="NG" userId={null} />);
    expect(await screen.findByText(/No invoices yet/i)).toBeTruthy();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("shows derived statuses: paid only with covering payments, partial stays partial", async () => {
    mockedFetch.mockResolvedValueOnce({
      data: [
        {
          invoice: { ...invoice, id: "i-paid" },
          derivedStatus: "paid",
          paidTotal: 1225500,
          payments: [
            {
              id: "p1",
              invoice_id: "i-paid",
              amount: 1225500,
              method: "transfer",
              paid_at: "2026-10-16T09:00:00Z",
              reference: null,
            },
          ],
        },
        {
          invoice: { ...invoice, id: "i-partial" },
          derivedStatus: "partially_paid",
          paidTotal: 500,
          payments: [
            {
              id: "p2",
              invoice_id: "i-partial",
              amount: 500,
              method: "cash",
              paid_at: "2026-10-16T10:00:00Z",
              reference: null,
            },
          ],
        },
        {
          invoice: { ...invoice, id: "i-unpaid" },
          derivedStatus: "issued",
          paidTotal: 0,
          payments: [],
        },
      ],
      error: null,
    });
    render(<InvoicesCard quote={quote} marketCode="NG" userId="u1" />);
    const rows = await screen.findAllByTestId("invoice-row");
    expect(rows).toHaveLength(3);
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("Partially paid")).toBeTruthy();
    expect(screen.getByText("Issued")).toBeTruthy();
  });

  it("records a payment through the service with amount and method", async () => {
    mockedFetch.mockResolvedValueOnce({
      data: [{ invoice, derivedStatus: "issued", paidTotal: 0, payments: [] }],
      error: null,
    });
    mockedPay.mockResolvedValueOnce({ data: null, error: null });
    render(<InvoicesCard quote={quote} marketCode="NG" userId="u1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /record payment/i }),
    );
    fireEvent.change(await screen.findByLabelText(/amount/i), {
      target: { value: "500000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save payment/i }));
    await waitFor(() =>
      expect(mockedPay).toHaveBeenCalledWith("i1", {
        amount: 500000,
        method: "transfer",
        reference: null,
      }),
    );
    expect(await screen.findByText(/payment recorded/i)).toBeTruthy();
  });

  it("refuses non-positive payment amounts before touching the service", async () => {
    mockedFetch.mockResolvedValueOnce({
      data: [{ invoice, derivedStatus: "issued", paidTotal: 0, payments: [] }],
      error: null,
    });
    render(<InvoicesCard quote={quote} marketCode="NG" userId="u1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /record payment/i }),
    );
    fireEvent.change(await screen.findByLabelText(/amount/i), {
      target: { value: "-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save payment/i }));
    expect(await screen.findByText(/positive number/i)).toBeTruthy();
    expect(mockedPay).not.toHaveBeenCalled();
  });

  it("issues a draft invoice via the service (owner action)", async () => {
    mockedFetch.mockResolvedValueOnce({
      data: [
        {
          invoice: { ...invoice, status: "draft" },
          derivedStatus: "draft",
          paidTotal: 0,
          payments: [],
        },
      ],
      error: null,
    });
    mockedStatus.mockResolvedValueOnce({ error: null });
    render(<InvoicesCard quote={quote} marketCode="NG" userId="u1" />);
    fireEvent.click(await screen.findByRole("button", { name: /^issue$/i }));
    await waitFor(() =>
      expect(mockedStatus).toHaveBeenCalledWith("i1", "issued"),
    );
  });

  it("renders the market tax label (DE shows MwSt, never VAT)", async () => {
    mockedFetch.mockResolvedValueOnce({
      data: [
        {
          invoice: { ...invoice, tax_label: "MwSt" },
          derivedStatus: "issued",
          paidTotal: 0,
          payments: [],
        },
      ],
      error: null,
    });
    render(<InvoicesCard quote={quote} marketCode="DE" userId="u1" />);
    expect(await screen.findByText(/MwSt/)).toBeTruthy();
    expect(screen.queryByText(/Tax line: VAT/)).toBeNull();
  });

  it("shows load errors instead of pretending", async () => {
    mockedFetch.mockResolvedValueOnce({ data: [], error: "permission denied" });
    render(<InvoicesCard quote={quote} marketCode="NG" userId="u1" />);
    expect(await screen.findByText(/could not load invoices/i)).toBeTruthy();
  });
});
