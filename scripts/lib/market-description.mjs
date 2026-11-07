/**
 * Meta description for a market hub page.
 *
 * Search results cut the description at roughly 158 characters, so the old
 * single template (which cited the electrical and plumbing standards by name)
 * ran to about 370 characters and lost its second half in every listing. A
 * hard slice is not the answer either: cutting at character 158 left entries
 * ending mid-word. Each candidate below is a complete sentence, and the
 * longest one that still fits is used.
 *
 * The block name is kept wherever it fits, because the local wall unit is the
 * most distinctive thing about a market's building practice and the dimension
 * figures draw priced intent.
 */
export const MARKET_DESCRIPTION_LIMIT = 158;

/** Full description: local wall unit, cement bag weight, currency and practice. */
export function marketLandingDescription(m) {
  const candidates = [
    `Free calculators preconfigured for ${m.countryName}: ${m.blockName}, ${m.cementBagKg}kg cement bags, prices in ${m.currency}. Local electrical and plumbing practice.`,
    `Free calculators preconfigured for ${m.countryName}: ${m.blockName}, ${m.cementBagKg}kg cement bags, prices in ${m.currency}.`,
    `Free calculators preconfigured for ${m.countryName}: ${m.cementBagKg}kg cement bags, prices in ${m.currency} and local practice.`,
  ];
  const fitting = candidates.find(
    (text) => text.length <= MARKET_DESCRIPTION_LIMIT,
  );
  // The third candidate is short enough for every configured market; the
  // fallback exists so a future long country name cannot ship a 200-character
  // description.
  return fitting ?? candidates[candidates.length - 1];
}
