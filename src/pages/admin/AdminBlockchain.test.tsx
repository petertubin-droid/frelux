/**
 * Admin Blockchain conformance (admin coverage pass, 2026-11-23).
 *
 * This page is the settlement monitor for FRELUX PAY, so the things worth
 * testing are the money totals it derives and the verifier it dispatches to.
 * The dispatch test exists because the page shipped calling the BTCPay
 * verifier for every row while printing a NOWPayments badge on some of them.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  invoices,
  docs,
  logs,
  toastSuccess,
  toastError,
  toastInfo,
  verifyBtc,
  verifyNow,
  verifyDoc,
} = vi.hoisted(() => ({
  invoices: [
    {
      id: "1",
      invoice_id: "inv-btc-1",
      user_id: "u1",
      purpose: "subscription",
      amount_fiat: 20,
      currency_fiat: "USD",
      amount_btc: 0.0005,
      amount_sats: 50_000,
      status: "Confirmed",
      provider: "btcpay",
      created_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "2",
      invoice_id: "inv-now-2",
      user_id: "u2",
      purpose: "subscription",
      amount_fiat: 20,
      currency_fiat: "USD",
      amount_btc: 0.00025,
      amount_sats: 25_000,
      status: "Confirmed",
      provider: "nowpayments",
      created_at: "2026-11-21T10:00:00Z",
    },
    {
      id: "3",
      invoice_id: "inv-pending-3",
      user_id: "u3",
      purpose: "subscription",
      amount_fiat: 20,
      currency_fiat: "USD",
      amount_btc: 0.001,
      amount_sats: 100_000,
      status: "Pending",
      provider: "btcpay",
      created_at: "2026-11-22T10:00:00Z",
    },
  ],
  docs: [
    {
      id: "d1",
      status: "Blockchain Verified",
      created_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "d2",
      status: "Pending",
      created_at: "2026-11-21T10:00:00Z",
    },
  ],
  logs: [
    {
      id: "l1",
      result: "document tampered",
      checked_at: "2026-11-20T10:00:00Z",
    },
    { id: "l2", result: "match", checked_at: "2026-11-21T10:00:00Z" },
  ],
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  verifyBtc: vi.fn(),
  verifyNow: vi.fn(),
  verifyDoc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: () =>
            Promise.resolve({
              data:
                table === "crypto_payment_invoices"
                  ? invoices
                  : table === "blockchain_document_records"
                    ? docs
                    : logs,
              error: null,
            }),
        }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError, info: toastInfo },
}));

vi.mock("@/lib/payments/btcpay", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, verifyBtcPayInvoice: verifyBtc };
});

vi.mock("@/lib/payments/nowpayments", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, verifyNowPaymentsInvoice: verifyNow };
});

vi.mock("@/lib/blockchain/opentimestamps", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, verifyDocumentOnBlockchain: verifyDoc };
});

import AdminBlockchain from "@/pages/admin/AdminBlockchain";

beforeEach(() => {
  vi.clearAllMocks();
  verifyBtc.mockResolvedValue({ status: "Settled" });
  verifyNow.mockResolvedValue({ status: "finished" });
});

describe("AdminBlockchain settlement totals", () => {
  it("counts every invoice but only sums the confirmed ones", async () => {
    render(<AdminBlockchain />);
    await waitFor(() => expect(screen.getByText("inv-btc-1")).toBeTruthy());

    // Three invoices exist; two are Confirmed, and the pending 0.001 BTC must
    // not be counted as settled volume.
    const confirmed = screen.getByText("Confirmed / Settled").parentElement;
    expect(confirmed?.textContent).toContain("2");

    const total = screen.getByText("Total Invoices").parentElement;
    expect(total?.textContent).toContain("3");
  });

  it("filters the invoice table by search term", async () => {
    render(<AdminBlockchain />);
    await waitFor(() => expect(screen.getByText("inv-btc-1")).toBeTruthy());

    const search = screen.getByPlaceholderText(
      /Search by invoice ID, address, or status/i,
    );
    await userEvent.type(search, "now-2");

    await waitFor(() => {
      expect(screen.queryByText("inv-btc-1")).toBeNull();
      expect(screen.getByText("inv-now-2")).toBeTruthy();
    });
  });
});

describe("AdminBlockchain verification dispatch", () => {
  it("sends a NOWPayments invoice to the NOWPayments verifier", async () => {
    render(<AdminBlockchain />);
    await waitFor(() => expect(screen.getByText("inv-now-2")).toBeTruthy());

    const row = screen.getByText("inv-now-2").closest("tr") as HTMLElement;
    await userEvent.click(row.querySelector("button") as HTMLElement);

    await waitFor(() => expect(verifyNow).toHaveBeenCalledWith("inv-now-2"));
    expect(verifyBtc).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("finished"),
    );
  });

  it("sends a BTCPay invoice to the BTCPay verifier", async () => {
    render(<AdminBlockchain />);
    await waitFor(() => expect(screen.getByText("inv-btc-1")).toBeTruthy());

    const row = screen.getByText("inv-btc-1").closest("tr") as HTMLElement;
    await userEvent.click(row.querySelector("button") as HTMLElement);

    await waitFor(() => expect(verifyBtc).toHaveBeenCalledWith("inv-btc-1"));
    expect(verifyNow).not.toHaveBeenCalled();
  });

  it("reports a verification failure instead of silently swallowing it", async () => {
    verifyNow.mockRejectedValueOnce(new Error("gateway down"));
    render(<AdminBlockchain />);
    await waitFor(() => expect(screen.getByText("inv-now-2")).toBeTruthy());

    const row = screen.getByText("inv-now-2").closest("tr") as HTMLElement;
    await userEvent.click(row.querySelector("button") as HTMLElement);

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringContaining("gateway down"),
      ),
    );
  });
});
