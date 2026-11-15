/**
 * Money arithmetic shared by every invoice entry point.
 *
 * The wizard and the direct form both show a tax figure and a total, and the
 * stored row must equal what the user was shown. One implementation keeps the
 * rounding rule in a single place instead of three copies that can drift.
 */

/**
 * The cent rule lives in one place for the whole product: see
 * src/lib/money/round.ts. It is re-exported here so invoice code keeps its
 * existing import.
 */
export { roundMoney } from "@/lib/money/round";
import { roundMoney } from "@/lib/money/round";

export interface InvoiceTotals {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export function invoiceTotals(
  subtotal: number,
  taxRate: number,
): InvoiceTotals {
  const base = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  const rate = Number.isFinite(taxRate) && taxRate > 0 ? taxRate : 0;
  const taxAmount = roundMoney((base * rate) / 100);
  return {
    subtotal: roundMoney(base),
    taxRate: rate,
    taxAmount,
    total: roundMoney(base + taxAmount),
  };
}

export interface FigureCheck {
  ok: boolean;
  message: string | null;
}

const HALF_CENT = 0.005;

/**
 * An invoice row has to agree with the tax line the user was shown. The
 * database stores subtotal, tax and total as three independent numbers, so
 * nothing stops a caller from writing a total that is not the sum of the other
 * two; the printed document then contradicts its own arithmetic.
 */
export function checkInvoiceFigures(input: {
  subtotal: number;
  tax_amount: number;
  total: number;
}): FigureCheck {
  const figures: Array<[string, number]> = [
    ["Subtotal", input.subtotal],
    ["Tax", input.tax_amount],
    ["Total", input.total],
  ];
  for (const [name, value] of figures) {
    if (!Number.isFinite(value))
      return { ok: false, message: `${name} must be a number` };
    if (value < 0) return { ok: false, message: `${name} cannot be negative` };
  }
  const sum = roundMoney(input.subtotal + input.tax_amount);
  if (Math.abs(sum - input.total) > HALF_CENT) {
    return {
      ok: false,
      message: `Invoice total ${input.total.toFixed(2)} is not subtotal plus tax (${sum.toFixed(2)})`,
    };
  }
  return { ok: true, message: null };
}

/**
 * A payment may only settle an invoice of its own project and currency.
 * Without this check the payment would sit against an invoice that the other
 * project's ledger reads as settled, while this project holds the cash as
 * credit: the same money counted in two books.
 */
export function checkPaymentLink(input: {
  projectId: string;
  paymentCurrency: string;
  invoice: { project_id: string; currency: string } | null;
}): FigureCheck {
  if (!input.invoice) {
    return { ok: false, message: "That invoice does not exist" };
  }
  if (input.invoice.project_id !== input.projectId) {
    return {
      ok: false,
      message: "That invoice belongs to another project",
    };
  }
  const invoiceCurrency = (input.invoice.currency || "").toUpperCase();
  const paymentCurrency = (input.paymentCurrency || "").toUpperCase();
  if (invoiceCurrency && paymentCurrency && invoiceCurrency !== paymentCurrency) {
    return {
      ok: false,
      message: `Invoice is in ${invoiceCurrency} and the payment is in ${paymentCurrency}`,
    };
  }
  return { ok: true, message: null };
}
