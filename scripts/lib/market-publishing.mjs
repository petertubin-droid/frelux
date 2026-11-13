// Which markets may claim a page of their own.
//
// A market page earns its place in the index when the numbers behind it are
// real: the market needs a full local price book, and the page itself needs at
// least one verified local price for the scope it describes. Anything less is a
// near-duplicate of the canonical page wearing a country name, which is the
// thin-content pattern that search engines discount and ad review penalises.
//
// Kept in one place so the prerenderer and the sitemap can never disagree.

/** A book thinner than this cannot price a full job honestly. */
export const FULL_BOOK_MIN_ROWS = 30;

/** Rows per market in estimation_prices, for the book-depth rule. */
export async function loadMarketBookDepth(fetchAll) {
  const rows = await fetchAll(
    "estimation_prices",
    "select=market&is_active=eq.true&limit=20000",
  );
  const depth = new Map();
  for (const row of rows) {
    if (!row.market) continue;
    const key = String(row.market).toUpperCase();
    depth.set(key, (depth.get(key) ?? 0) + 1);
  }
  return depth;
}

/**
 * True when a market has enough local pricing to publish pages about it.
 *
 * An empty map means the price table could not be read at all (no credentials,
 * or the database was unreachable). That is not evidence of a thin market, so
 * it must not be treated as one: a failed read would otherwise deindex every
 * market page on the site.
 */
export function hasFullBook(depth, marketCode) {
  if (!depth || depth.size === 0) return true;
  return (depth.get(String(marketCode).toUpperCase()) ?? 0) >= FULL_BOOK_MIN_ROWS;
}

/**
 * Whether one market × template page earns an index entry.
 *
 * The earlier rule asked whether the *market* had a full price book, which is a
 * property of the market rather than of the page: it withheld 310 pages that
 * carried real local prices, and would have admitted a page with none the day a
 * market crossed thirty rows. The evidence now sits on the page itself - a
 * verified local price for a material this template actually consumes - so a
 * page is indexed when its own content is local, and withheld when it is only
 * the canonical template wearing a country name.
 */
export function isTemplatePageIndexable({ hasLocalPrices }) {
  return Boolean(hasLocalPrices);
}

/**
 * A hub is a list of its children. It is worth indexing only when enough of
 * those children are indexed, otherwise it is an index of withheld pages.
 */
export const HUB_MIN_INDEXABLE_CHILDREN = 3;

export function isHubIndexable(indexableChildCount) {
  return Number(indexableChildCount) >= HUB_MIN_INDEXABLE_CHILDREN;
}
