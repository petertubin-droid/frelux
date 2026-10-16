/**
 * InvoicesCard (Wave 1.3 — Click-to-Invoice)
 *
 * One-click BOQ quotation → invoice, with the honesty laws surfaced in
 * the UI: paid/overdue/partially-paid are DERIVED from recorded
 * payments (never claimed without them), the tax line uses the
 * market's own naming, and amounts render in the invoice currency via
 * formatByCode (never a silent NGN default). Printing reuses the
 * branded quote-export pipeline.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DERIVED_STATUS_LABELS,
  PAYMENT_METHODS,
  type InvoiceSnapshotItem,
  type InvoiceSnapshotTotals,
  type PaymentMethod,
} from "@/lib/finance/invoice-engine";
import {
  createInvoiceFromQuote,
  fetchInvoices,
  recordInvoicePayment,
  setInvoiceStatus,
  type InvoiceWithState,
} from "@/lib/finance/invoice-service";
import { formatByCode } from "@/lib/international/currency-format";

export interface InvoiceQuoteSource {
  id: string;
  user_id: string | null;
  quote_ref: string;
  title: string;
  client_name: string;
  client_contact: string | null;
  project_location: string | null;
  currency: string;
  items: InvoiceSnapshotItem[];
  /**
   * The quote's totals are snapshotted VERBATIM into the invoice
   * (createInvoiceFromQuote), and the PDF renders subtotal + VAT lines
   * from them — so the honest type is the snapshot shape, not a narrow
   * grand_total-only pick.
   */
  totals: InvoiceSnapshotTotals;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-primary/10 text-primary",
  overdue: "bg-destructive/10 text-destructive",
  partially_paid: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function InvoicesCard({
  quote,
  marketCode,
  userId,
}: {
  quote: InvoiceQuoteSource | null;
  marketCode: string;
  userId: string | null;
}) {
  const [invoices, setInvoices] = useState<InvoiceWithState[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [payOpenFor, setPayOpenFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("transfer");
  const [payReference, setPayReference] = useState("");

  const refresh = useCallback(async () => {
    if (!userId) {
      setInvoices([]);
      return;
    }
    setLoading(true);
    const { data, error } = await fetchInvoices(userId);
    setLoading(false);
    if (error) {
      setMsg(`Could not load invoices: ${error}`);
      return;
    }
    setInvoices(data);
    // Success/failure messages stay until the next action — clearing
    // them here would erase "created as draft" the instant it shows.
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, userId]);

  const createFromQuote = async () => {
    if (!quote) return;
    setBusy(true);
    const { data, error } = await createInvoiceFromQuote(quote, marketCode);
    setBusy(false);
    if (error || !data) {
      setMsg(error ?? "Failed to create invoice");
      return;
    }
    setMsg(`Invoice ${data.invoice_ref} created as draft.`);
    setPayOpenFor(null);
    await refresh();
  };

  const recordPayment = async (invoiceId: string) => {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMsg("Payment amount must be a positive number.");
      return;
    }
    setBusy(true);
    const { error } = await recordInvoicePayment(invoiceId, {
      amount,
      method: payMethod,
      reference: payReference || null,
    });
    setBusy(false);
    if (error) {
      setMsg(`Payment not recorded: ${error}`);
      return;
    }
    setMsg("Payment recorded.");
    setPayAmount("");
    setPayReference("");
    setPayOpenFor(null);
    await refresh();
  };

  const changeStatus = async (
    invoiceId: string,
    status: "draft" | "issued" | "cancelled",
  ) => {
    setBusy(true);
    const { error } = await setInvoiceStatus(invoiceId, status);
    setBusy(false);
    if (error) {
      setMsg(`Status not updated: ${error}`);
      return;
    }
    await refresh();
  };

  const printInvoice = (inv: InvoiceWithState) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${inv.invoice.invoice_ref}</title><style>body{font-family:system-ui;padding:24px;color:#111}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left}h1,h2{margin:0 0 4px}.meta{color:#555}</style></head><body>` +
        `<h1>${inv.invoice.invoice_ref}</h1>` +
        `<p class="meta">${inv.invoice.title} · Issued ${inv.invoice.issue_date} · Due ${inv.invoice.due_date ?? "—"}</p>` +
        `<p class="meta">Client: ${inv.invoice.client_name}${inv.invoice.client_contact ? ` · ${inv.invoice.client_contact}` : ""}</p>` +
        `<table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit cost</th><th>Total</th></tr></thead><tbody>` +
        inv.invoice.items
          .map(
            (it) =>
              `<tr><td>${it.description}</td><td>${it.quantity}</td><td>${it.unit}</td><td>${formatByCode(it.unit_cost, inv.invoice.currency)}</td><td>${formatByCode(it.total, inv.invoice.currency)}</td></tr>`,
          )
          .join("") +
        `</tbody></table>` +
        `<p><strong>Subtotal:</strong> ${formatByCode(inv.invoice.totals.subtotal, inv.invoice.currency)}</p>` +
        (inv.invoice.totals.vat_amount != null &&
        inv.invoice.totals.vat_rate != null
          ? `<p><strong>${inv.invoice.tax_label ?? "Tax"} (${inv.invoice.totals.vat_rate}%):</strong> ${formatByCode(inv.invoice.totals.vat_amount, inv.invoice.currency)}</p>`
          : "") +
        `<p><strong>Grand total:</strong> ${formatByCode(inv.invoice.totals.grand_total, inv.invoice.currency)}</p>` +
        `<p><strong>Paid to date:</strong> ${formatByCode(inv.paidTotal, inv.invoice.currency)} · Status: ${DERIVED_STATUS_LABELS[inv.derivedStatus]}</p>` +
        `</body></html>`,
    );
    w.document.close();
  };

  const canInvoice = useMemo(
    () =>
      quote !== null &&
      quote.items.length > 0 &&
      typeof quote.totals?.grand_total === "number",
    [quote],
  );

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Invoices</h3>
          <p className="text-xs text-muted-foreground">
            One-click quotation → invoice. Paid / overdue statuses come from
            recorded payments only — never assumed.
          </p>
        </div>
        <button
          type="button"
          onClick={createFromQuote}
          disabled={!canInvoice || busy}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          Create invoice from this quote
        </button>
      </header>

      {msg && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {msg}
        </p>
      )}

      {loading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No invoices yet. Save a quotation and click “Create invoice from this
          quote”.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {invoices.map(({ invoice, derivedStatus, paidTotal, payments }) => (
            <article
              key={invoice.id}
              data-testid="invoice-row"
              className="rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {invoice.invoice_ref}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {invoice.title} · {invoice.client_name} · due{" "}
                    {invoice.due_date ?? "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    STATUS_STYLES[derivedStatus] ?? ""
                  }`}
                >
                  {DERIVED_STATUS_LABELS[derivedStatus]}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>
                  Grand total:{" "}
                  <strong>
                    {formatByCode(invoice.totals.grand_total, invoice.currency)}
                  </strong>
                </span>
                <span>
                  Paid:{" "}
                  <strong>{formatByCode(paidTotal, invoice.currency)}</strong> (
                  {payments.length} payment{payments.length === 1 ? "" : "s"})
                </span>
                {invoice.tax_label && (
                  <span>
                    Tax line: <strong>{invoice.tax_label}</strong>
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {invoice.status === "draft" && (
                  <button
                    type="button"
                    onClick={() => changeStatus(invoice.id, "issued")}
                    disabled={busy}
                    className="rounded border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted/50 disabled:opacity-50"
                  >
                    Issue
                  </button>
                )}
                {invoice.status === "issued" && (
                  <button
                    type="button"
                    onClick={() => changeStatus(invoice.id, "cancelled")}
                    disabled={busy}
                    className="rounded border border-border px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    Cancel invoice
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    printInvoice({
                      invoice,
                      derivedStatus,
                      paidTotal,
                      payments,
                    } as InvoiceWithState)
                  }
                  className="rounded border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted/50"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPayOpenFor(payOpenFor === invoice.id ? null : invoice.id)
                  }
                  className="rounded border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted/50"
                >
                  Record payment
                </button>
              </div>

              {payOpenFor === invoice.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-muted/40 p-2">
                  <label className="text-[11px] text-muted-foreground">
                    Amount
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="ml-1 w-28 rounded border border-border bg-card px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="text-[11px] text-muted-foreground">
                    Method
                    <select
                      value={payMethod}
                      onChange={(e) =>
                        setPayMethod(e.target.value as PaymentMethod)
                      }
                      className="ml-1 rounded border border-border bg-card px-2 py-1 text-xs"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] text-muted-foreground">
                    Reference
                    <input
                      type="text"
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                      placeholder="optional"
                      className="ml-1 w-32 rounded border border-border bg-card px-2 py-1 text-xs"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => recordPayment(invoice.id)}
                    disabled={busy}
                    className="rounded bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Save payment
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default InvoicesCard;
