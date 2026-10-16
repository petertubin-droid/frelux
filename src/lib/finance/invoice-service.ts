/**
 * Invoice service (Wave 1.3 — Click-to-Invoice)
 *
 * Supabase-backed operations. All authorization is RLS (owner-scoped
 * policies on invoices / invoice_payments / invoice_counters); this
 * service never broadens access. Payment and status claims are always
 * derived from recorded rows at read time.
 */

import { supabase } from "@/lib/supabase";
import { boqTaxLabel } from "@/lib/estimation/boq-tax-label";
import {
  DEFAULT_PAYMENT_TERMS_DAYS,
  deriveInvoiceStatus,
  nextInvoiceRef,
  invoiceFromQuote,
  sumPayments,
  type DerivedInvoiceStatus,
  type InvoiceDraft,
  type InvoicePaymentRecord,
  type InvoiceRecord,
  type PaymentMethod,
} from "./invoice-engine";

export interface InvoiceWithState {
  invoice: InvoiceRecord;
  derivedStatus: DerivedInvoiceStatus;
  paidTotal: number;
  payments: InvoicePaymentRecord[];
}

/**
 * Reserve the next sequential number for the user+year ATOMICALLY.
 * The upsert increments in one statement, so concurrent creators
 * receive distinct numbers. A failed transaction can burn a number:
 * honest sequencing, no gapless fiction.
 */
/**
 * Reserve the next sequential number ATOMICALLY via the
 * reserve_invoice_number RPC (single-statement increment, so
 * concurrent creators get distinct numbers; auth.uid() pins the
 * counter to the caller). A failed transaction can burn a number:
 * honest sequencing, no gapless fiction.
 */
async function reserveNextNumber(year: number): Promise<number> {
  const { data, error } = await supabase.rpc("reserve_invoice_number", {
    p_year: year,
  });
  if (error) throw new Error(error.message);
  const reserved = Number(data);
  if (!Number.isInteger(reserved) || reserved < 1) {
    throw new Error(`Invalid reserved invoice number: ${data}`);
  }
  return reserved;
}

/**
 * One-click quotation → invoice. Snapshots the quote's items/totals
 * verbatim; the tax label resolves from the market's own scheme
 * (presentation only). The stored status starts at 'draft' — issuing
 * is an explicit owner action.
 */
export async function createInvoiceFromQuote(
  quote: {
    id: string;
    user_id: string | null;
    quote_ref: string;
    title: string;
    client_name: string;
    client_contact: string | null;
    project_location: string | null;
    currency: string;
    items: unknown;
    totals: unknown;
  },
  marketCode: string | null,
  opts?: {
    termsDays?: number;
    issueDate?: string;
    projectId?: string | null;
    taxLabel?: string | null;
    notes?: string | null;
  },
): Promise<{ data: InvoiceRecord | null; error: string | null }> {
  try {
    const userId = quote.user_id;
    if (!userId) return { data: null, error: "Quote has no owner; cannot invoice" };

    const year = Number((opts?.issueDate ?? new Date().toISOString().slice(0, 10)).slice(0, 4));
    const reserved = await reserveNextNumber(year);
    const invoiceRef = nextInvoiceRef(reserved - 1, year);
    const taxLabel = opts?.taxLabel ?? boqTaxLabel(marketCode).short;

    const draft: InvoiceDraft = invoiceFromQuote(
      {
        quote_ref: quote.quote_ref,
        title: quote.title,
        client_name: quote.client_name,
        client_contact: quote.client_contact,
        project_location: quote.project_location,
        currency: quote.currency,
        items: quote.items as never,
        totals: quote.totals as never,
      },
      {
        invoiceRef,
        taxLabel,
        termsDays: opts?.termsDays ?? DEFAULT_PAYMENT_TERMS_DAYS,
        issueDate: opts?.issueDate,
        notes: opts?.notes,
      },
    );

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        invoice_ref: draft.invoice_ref,
        source_quote_id: quote.id,
        project_id: opts?.projectId ?? null,
        title: draft.title,
        client_name: draft.client_name,
        client_contact: draft.client_contact,
        project_location: draft.project_location,
        currency: draft.currency,
        status: "draft",
        items: draft.items,
        totals: draft.totals,
        tax_label: draft.tax_label,
        issue_date: draft.issue_date,
        due_date: draft.due_date,
        payment_terms_days: draft.payment_terms_days,
        notes: draft.notes,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as InvoiceRecord, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create invoice";
    return { data: null, error: msg };
  }
}

/** Record a payment against an invoice (RLS: only the owner can). */
export async function recordInvoicePayment(
  invoiceId: string,
  payment: { amount: number; method: PaymentMethod; reference?: string | null; notes?: string | null; paidAt?: string },
): Promise<{ data: InvoicePaymentRecord | null; error: string | null }> {
  try {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      return { data: null, error: "Payment amount must be positive" };
    }
    const { data, error } = await supabase
      .from("invoice_payments")
      .insert({
        invoice_id: invoiceId,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference ?? null,
        notes: payment.notes ?? null,
        paid_at: payment.paidAt ?? new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as InvoicePaymentRecord, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record payment";
    return { data: null, error: msg };
  }
}

/** Owner action: issue / cancel / revert to draft. */
export async function setInvoiceStatus(
  invoiceId: string,
  status: "draft" | "issued" | "cancelled",
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", invoiceId);
  return { error: error?.message ?? null };
}

/** Delete a payment record (correction; audit trail is not claimed). */
export async function deleteInvoicePayment(
  paymentId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("invoice_payments")
    .delete()
    .eq("id", paymentId);
  return { error: error?.message ?? null };
}

/**
 * List the owner's invoices with the honest derived state:
 * paid/overdue/partially_paid come from recorded payments + due date,
 * computed here at read time — never stored, never assumed.
 */
export async function fetchInvoices(
  userId: string,
): Promise<{ data: InvoiceWithState[]; error: string | null }> {
  try {
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    if (!invoices || invoices.length === 0) return { data: [], error: null };

    const { data: payments, error: payError } = await supabase
      .from("invoice_payments")
      .select("*")
      .in("invoice_id", invoices.map((i) => i.id));
    if (payError) return { data: [], error: payError.message };

    const byInvoice = new Map<string, InvoicePaymentRecord[]>();
    for (const p of (payments ?? []) as InvoicePaymentRecord[]) {
      const list = byInvoice.get(p.invoice_id) ?? [];
      list.push(p);
      byInvoice.set(p.invoice_id, list);
    }

    const now = new Date();
    return {
      data: (invoices as InvoiceRecord[]).map((invoice) => {
        const paymentsList = byInvoice.get(invoice.id) ?? [];
        const paidTotal = sumPayments(paymentsList);
        return {
          invoice,
          paidTotal,
          payments: paymentsList,
          derivedStatus:
            invoice.status === "issued" && paidTotal >= invoice.totals.grand_total - 1e-9
              ? "paid"
              : deriveInvoiceStatus(invoice, paidTotal, now),
        };
      }),
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load invoices";
    return { data: [], error: msg };
  }
}
