/**
 * Money arithmetic shared by every invoice entry point.
 *
 * The wizard and the direct form both show a tax figure and a total, and the
 * stored row must equal what the user was shown. One implementation keeps the
 * rounding rule in a single place instead of three copies that can drift.
 */

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

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
