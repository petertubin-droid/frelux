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
