/**
 * Guards for the last-resort price fallback.
 *
 * When a page carries neither JSON-LD offers nor og:price meta, the scanner
 * used to take the first currency amount in the markup. On a catalogue page
 * that amount is site chrome, not the product: three Screwfix category URLs
 * filed exactly GBP 99 for a 1L primer, a 150m tape and a 5L sealer, all three
 * from the same "spend over" style banner. A single-amount page can still lie
 * when the amount is a delivery threshold, so both conditions are checked
 * before the value is allowed to become a candidate.
 */

export const CURRENCY_AMOUNT_PATTERN =
  /(?:[$£€₹¥₩R$]|NGN|GHS|KES|ZAR|AED|SAR|BRL|JPY|EUR|USD|GBP|MXN|CNY|IDR|KRW|INR|CAD|AUD)\s?([\d][\d.,]{1,12})/gi;

/** Every plausible currency amount in the page, in document order. */
export function currencyAmounts(
  html: string,
): Array<{ value: number; index: number }> {
  const out: Array<{ value: number; index: number }> = [];
  for (const match of html.matchAll(CURRENCY_AMOUNT_PATTERN)) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value >= 0.5) {
      out.push({ value, index: match.index ?? 0 });
    }
  }
  return out;
}

/** A page showing several different amounts is a listing, not one product. */
export function isListingPage(html: string, limit = 2): boolean {
  const distinct = new Set(currencyAmounts(html).map((a) => a.value));
  return distinct.size > limit;
}

// A threshold phrase sits directly before its amount ("free delivery on orders
// over £99"). Scanning after the amount as well would refuse an ordinary
// product page, because a real page often mentions a delivery fee just after
// the price ("In stock. Delivery £4.99.").
const CHROME_BEFORE =
  /(?:spend|spending|orders?|basket|minimum|free (?:delivery|shipping)|delivery (?:on|over|from)|over|above|from)\s*(?:of\s*)?(?:£|\$|€|GBP|USD|EUR)?\s*$/i;

/** A threshold or promo banner qualifies its amount with shipping language. */
export function isChromeAmount(
  html: string,
  index: number,
  radius = 60,
): boolean {
  const before = html
    .slice(Math.max(0, index - radius), index)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trimEnd();
  if (CHROME_BEFORE.test(before)) return true;
  // "£99 minimum spend" and "£99 per month" read the same way: the amount is a
  // condition, not a price.
  const after = html
    .slice(index, Math.min(html.length, index + 30))
    .replace(/<[^>]*>/g, " ");
  return (
    /(minimum|per month|p\/month|trade account)/i.test(after) &&
    /(spend|delivery|orders?|finance|month)/i.test(after)
  );
}

/**
 * True when the page's first currency amount can stand as this source's price:
 * one product on the page, and no promotional language beside the amount.
 */
export function firstAmountIsUsablePrice(html: string): boolean {
  const amounts = currencyAmounts(html);
  if (amounts.length === 0) return false;
  if (new Set(amounts.map((a) => a.value)).size > 2) return false;
  return !isChromeAmount(html, amounts[0].index);
}
