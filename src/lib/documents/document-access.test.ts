import { describe, it, expect, vi, beforeEach } from "vitest";

const rows: Array<Record<string, unknown>> = [];
const invoke = vi.fn();

vi.mock("@/lib/supabase-lazy", () => ({
  isSupabaseConfigured: true,
  getFunctionErrorMessage: async (e: unknown) =>
    e instanceof Error ? e.message : "Request failed",
  getSupabase: async () => ({
    from: () => ({
      select: () => ({
        gt: async () => ({ data: rows, error: null }),
      }),
    }),
    functions: { invoke },
  }),
}));

const {
  calculatePrintFeeInCurrency,
  hydratePrintPasses,
  isDocumentPrintUnlocked,
  purchasePrintPass,
  canExportDocuments,
  canPrintDocument,
} = await import("./document-access");

const future = new Date(Date.now() + 3600_000).toISOString();
const past = new Date(Date.now() - 3600_000).toISOString();

beforeEach(async () => {
  rows.length = 0;
  invoke.mockReset();
  // The cache is module state; clear it so one test cannot unlock another.
  await hydratePrintPasses();
});

describe("print fee", () => {
  it("rounds naira to a payable figure", () => {
    const fee = calculatePrintFeeInCurrency("NGN");
    expect(fee.currency).toBe("NGN");
    expect(fee.amount % 10).toBe(0);
    expect(fee.amount).toBeGreaterThan(0);
  });
});

describe("entitlement is read from the database", () => {
  it("unlocks a document with an unexpired server pass", async () => {
    rows.push({
      document_id: "quote-1",
      expires_at: future,
      currency: "NGN",
      amount_minor: 147000,
      gateway: "paystack",
      provider_reference: "ref-1",
      created_at: new Date().toISOString(),
    });
    await hydratePrintPasses();
    expect(isDocumentPrintUnlocked("quote-1")).toBe(true);
    expect(isDocumentPrintUnlocked("quote-2")).toBe(false);
  });

  it("ignores an expired pass", async () => {
    rows.push({
      document_id: "quote-1",
      expires_at: past,
      currency: "NGN",
      amount_minor: 147000,
      gateway: "paystack",
      provider_reference: "ref-1",
      created_at: past,
    });
    await hydratePrintPasses();
    expect(isDocumentPrintUnlocked("quote-1")).toBe(false);
  });

  it("starts locked, with no local storage fallback", async () => {
    await hydratePrintPasses();
    expect(isDocumentPrintUnlocked("anything")).toBe(false);
    expect(
      window.localStorage.getItem("frelux_document_print_passes"),
    ).toBeNull();
  });
});

describe("purchase is server verified", () => {
  it("hydrates the pass after the server issues one", async () => {
    invoke.mockResolvedValue({
      data: { pass: { document_id: "quote-9" } },
      error: null,
    });
    rows.push({
      document_id: "quote-9",
      expires_at: future,
      currency: "NGN",
      amount_minor: 147000,
      gateway: "paystack",
      provider_reference: "ref-9",
      created_at: new Date().toISOString(),
    });
    const result = await purchasePrintPass({
      documentId: "quote-9",
      gateway: "paystack",
      reference: "ref-9",
    });
    expect(invoke).toHaveBeenCalledWith("document-print-pass", {
      body: { documentId: "quote-9", gateway: "paystack", reference: "ref-9" },
    });
    expect(result.ok).toBe(true);
    expect(isDocumentPrintUnlocked("quote-9")).toBe(true);
  });

  it("reports a rejected payment and unlocks nothing", async () => {
    invoke.mockResolvedValue({
      data: { error: "Payment does not match this document" },
      error: null,
    });
    const result = await purchasePrintPass({
      documentId: "quote-9",
      gateway: "paystack",
      reference: "ref-9",
    });
    expect(result).toEqual({
      ok: false,
      error: "Payment does not match this document",
    });
    expect(isDocumentPrintUnlocked("quote-9")).toBe(false);
  });
});

describe("gate rules", () => {
  it("lets subscribers and admins export", () => {
    expect(canExportDocuments(null)).toBe(false);
    expect(canExportDocuments({ isPaid: true })).toBe(true);
    expect(canExportDocuments({ isAdmin: true })).toBe(true);
  });

  it("requires a pass for a non-subscriber to print", () => {
    expect(canPrintDocument({ isPaid: false }, "doc-x")).toBe(false);
    expect(canPrintDocument({ isPaid: true }, "doc-x")).toBe(true);
  });
});
