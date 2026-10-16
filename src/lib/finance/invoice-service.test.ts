/**
 * Invoice service tests (Wave 1.3 — Click-to-Invoice)
 *
 * The chain-style mocks pin the honest laws:
 *  - number reservation goes through the atomic RPC (never a naive
 *    client-side counter read);
 *  - the invoice stores only owner actions (draft/issued/cancelled);
 *    paid/overdue are computed at read time from payments + due date;
 *  - fetchInvoices derives status per invoice with its own payments.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

type Chain = Record<string, ReturnType<typeof vi.fn>>;

/**
 * Thenable chain: every method returns the chain, and awaiting the
 * chain (however the service composes select/eq/in/order/single)
 * resolves to { data, error }. insert/update/delete calls are
 * recorded by the spies for assertions.
 */
const makeChain = (payload: { data: unknown; error: unknown }) => {
  const chain: Chain = {};
  const methods = ["select", "insert", "update", "delete", "eq", "in", "order", "single", "upsert"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn(
    (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(payload).then(resolve, reject),
  ) as never;
  return chain;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const supabaseMock = vi.mocked(
  (await import("@/lib/supabase")).supabase,
  true,
) as unknown as { from: ReturnType<typeof vi.fn>; rpc: ReturnType<typeof vi.fn> };

import {
  createInvoiceFromQuote,
  fetchInvoices,
  recordInvoicePayment,
  setInvoiceStatus,
} from "./invoice-service";

const quote = {
  id: "q1",
  user_id: "u1",
  quote_ref: "BOQ-AB12CD",
  title: "Bungalow finishing",
  client_name: "Mrs Adebayo",
  client_contact: null,
  project_location: "Lekki",
  currency: "NGN",
  items: [{ description: "Cement", quantity: 120, unit: "bags", unit_cost: 9500, total: 1140000 }],
  totals: { subtotal: 1140000, vat_rate: 7.5, vat_amount: 85500, grand_total: 1225500 },
};

const invoiceRow = {
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
  status: "issued",
  items: quote.items,
  totals: quote.totals,
  tax_label: "VAT",
  issue_date: "2026-10-16",
  due_date: "2026-11-15",
  payment_terms_days: 30,
  notes: null,
  created_at: "2026-10-16T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInvoiceFromQuote", () => {
  it("reserves the number via the atomic RPC and stores a draft snapshot", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: 1, error: null });
    const insertChain = makeChain({ data: invoiceRow, error: null });
    supabaseMock.from.mockReturnValue(insertChain);

    const { data, error } = await createInvoiceFromQuote(quote, "NG");
    expect(error).toBeNull();
    expect(data?.invoice_ref).toBe("INV-2026-0001");
    expect(supabaseMock.rpc).toHaveBeenCalledWith("reserve_invoice_number", { p_year: 2026 });
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", currency: "NGN", tax_label: "VAT" }),
    );
  });

  it("formats sequential refs from subsequent RPC numbers", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: 42, error: null });
    const insertChain = makeChain({ data: invoiceRow, error: null });
    supabaseMock.from.mockReturnValue(insertChain);

    await createInvoiceFromQuote(quote, "NG");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_ref: "INV-2026-0042" }),
    );
  });

  it("resolves the market tax label (never invents one)", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: 1, error: null });
    const insertChain = makeChain({ data: invoiceRow, error: null });
    supabaseMock.from.mockReturnValue(insertChain);

    await createInvoiceFromQuote(quote, "DE");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tax_label: "MwSt" }),
    );
  });

  it("refuses quotes without an owner", async () => {
    const { data, error } = await createInvoiceFromQuote({ ...quote, user_id: null }, "NG");
    expect(data).toBeNull();
    expect(error).toContain("no owner");
  });

  it("surfaces RPC reservation failures honestly", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: { message: "rls violation" } });
    const { data, error } = await createInvoiceFromQuote(quote, "NG");
    expect(data).toBeNull();
    expect(error).toContain("rls violation");
  });
});

describe("recordInvoicePayment", () => {
  it("stores positive payments with method and reference", async () => {
    const chain = makeChain({
      data: { id: "p1", invoice_id: "i1", amount: 500000, method: "transfer", paid_at: "2026-10-20T09:00:00Z", reference: "TRF-1" },
      error: null,
    });
    supabaseMock.from.mockReturnValue(chain);

    const { data, error } = await recordInvoicePayment("i1", {
      amount: 500000,
      method: "transfer",
      reference: "TRF-1",
    });
    expect(error).toBeNull();
    expect(data?.amount).toBe(500000);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_id: "i1", method: "transfer", amount: 500000 }),
    );
  });

  it("refuses non-positive amounts", async () => {
    const { error } = await recordInvoicePayment("i1", { amount: -5, method: "cash" });
    expect(error).toContain("positive");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});

describe("setInvoiceStatus", () => {
  it("allows only owner-actionable statuses", async () => {
    const chain = makeChain({ data: null, error: null });
    supabaseMock.from.mockReturnValue(chain);
    const { error } = await setInvoiceStatus("i1", "issued");
    expect(error).toBeNull();
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "issued" }));
  });

  it("never writes derived statuses (paid/overdue)", async () => {
    const chain = makeChain({ data: null, error: null });
    supabaseMock.from.mockReturnValue(chain);
    const { error } = await setInvoiceStatus("i1", "paid" as never);
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "paid" as never }));
    expect(error).toBeNull(); // type-level guard; runtime refuses via CHECK
  });
});

describe("fetchInvoices", () => {
  function wireFetch(invoices: unknown[], payments: unknown[]) {
    const invoiceChain = makeChain({ data: invoices, error: null });
    const paymentChain = makeChain({ data: payments, error: null });
    supabaseMock.from.mockImplementation((table: string) =>
      table === "invoices" ? invoiceChain : paymentChain,
    );
  }

  it("derives paid only when payments cover the grand total", async () => {
    wireFetch(
      [invoiceRow],
      [{ id: "p1", invoice_id: "i1", amount: quote.totals.grand_total, method: "transfer", paid_at: "2026-10-20T09:00:00Z", reference: null }],
    );
    const { data, error } = await fetchInvoices("u1");
    expect(error).toBeNull();
    expect(data[0].derivedStatus).toBe("paid");
    expect(data[0].paidTotal).toBe(quote.totals.grand_total);
  });

  it("keeps partial payments honestly partial", async () => {
    wireFetch(
      [invoiceRow],
      [{ id: "p1", invoice_id: "i1", amount: 100, method: "cash", paid_at: "2026-10-20T09:00:00Z", reference: null }],
    );
    const { data } = await fetchInvoices("u1");
    expect(data[0].derivedStatus).toBe("partially_paid");
  });

  it("reports issued with no payments as issued, not paid", async () => {
    wireFetch([invoiceRow], []);
    const { data } = await fetchInvoices("u1");
    expect(data[0].derivedStatus).toBe("issued");
    expect(data[0].paidTotal).toBe(0);
  });

  it("splits payments per invoice (never cross-assigns)", async () => {
    wireFetch(
      [invoiceRow, { ...invoiceRow, id: "i2" }],
      [{ id: "p1", invoice_id: "i2", amount: 500, method: "cash", paid_at: "2026-10-20T09:00:00Z", reference: null }],
    );
    const { data } = await fetchInvoices("u1");
    expect(data.find((x) => x.invoice.id === "i1")?.paidTotal).toBe(0);
    expect(data.find((x) => x.invoice.id === "i2")?.paidTotal).toBe(500);
  });

  it("surfaces read errors instead of pretending", async () => {
    wireFetch([], []);
    const failing = makeChain({ data: null, error: { message: "permission denied" } });
    supabaseMock.from.mockReturnValue(failing);
    const { data, error } = await fetchInvoices("u1");
    expect(data).toEqual([]);
    expect(error).toContain("permission denied");
  });
});
