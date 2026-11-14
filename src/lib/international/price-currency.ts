/**
 * Which currency a price row is in.
 *
 * The price index is global, so a figure is only comparable when its currency
 * is known. The row's own currency wins; failing that, the local currency of
 * the market the row names. A row that states neither has no currency at all -
 * it must be held back rather than assumed to be naira, because a dollar or
 * pound figure read as naira is wrong by orders of magnitude.
 */
import { COUNTRY_CURRENCY } from "./countries";

export function resolvePriceCurrency(
  currency: unknown,
  market: string | null | undefined,
): string | null {
  const stated =
    typeof currency === "string" ? currency.trim().toUpperCase() : "";
  if (/^[A-Z]{3}$/.test(stated)) return stated;
  const code = (market ?? "").trim().toUpperCase();
  if (!code) return null;
  return COUNTRY_CURRENCY[code] ?? null;
}
