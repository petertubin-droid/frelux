// =========================================================
// Trade forms and the markets that actually use them
//
// A price is a number attached to a way of buying something. Some ways of
// buying exist in one country and nowhere else. A five-tonne tipper of sharp
// sand is how Lagos buys sand; nobody in Leeds or Ohio orders a "trip" of
// sand, and quoting them one is not a local price, it is a Nigerian number
// wearing a foreign currency.
//
// The FX reference rows were seeded from the Nigerian book into every market,
// which is honest for materials (a bag of cement is a bag of cement) and wrong
// for delivery units (a tipper is not a unit of sand anywhere else). This
// module names those forms so the price query can refuse them outside Nigeria.
//
// The test for adding a slug here is strict: it must be a local way of buying
// that has no counterpart market, not merely a material we would rather price
// differently. A material stays out of this list even when its local name or
// pack size differs, because that is a catalogue row to add, not a form to
// refuse.
// =========================================================

/** Slugs that are Nigerian buying conventions and invalid in any other market. */
export const NG_ONLY_TRADE_FORMS: Readonly<Record<string, string>> = {
  "sand-per-trip":
    "A tipper load of sand. Sold by volume (m3) or by the tonne elsewhere, so the unit has no meaning outside Nigeria.",
  "granite-per-trip":
    "A tipper load of granite. US and UK buyers order aggregate by the tonne, yard or bulk bag, never by the trip.",
};

/** True when the slug is a Nigerian buying convention. */
export function isNgOnlyTradeForm(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return Object.prototype.hasOwnProperty.call(NG_ONLY_TRADE_FORMS, slug.trim());
}

/**
 * Whether a material's trade form can be priced in a market.
 *
 * An absent market means "not market specific" (admin views, all-market reads)
 * and never filters. The home market of the form is always allowed.
 */
export function isTradeFormValidInMarket(
  slug: string | null | undefined,
  market: string | null | undefined,
): boolean {
  if (!isNgOnlyTradeForm(slug)) return true;
  const code = (market ?? "").trim().toUpperCase();
  if (!code) return true;
  return code === "NG";
}

/** Reason a slug is refused in a market, for provenance and admin display. */
export function tradeFormRefusal(
  slug: string | null | undefined,
  market: string | null | undefined,
): string | null {
  if (isTradeFormValidInMarket(slug, market)) return null;
  const reason = NG_ONLY_TRADE_FORMS[(slug ?? "").trim()];
  return `Refused in ${(market ?? "").toUpperCase()}: ${reason}`;
}
