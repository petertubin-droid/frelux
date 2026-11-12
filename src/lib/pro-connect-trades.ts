/**
 * Trade options for the Pro Connect directory.
 *
 * Two problems this exists to solve, both visible on the live page:
 *
 * 1. The category table carries rows whose display names mean the same trade
 *    ("Welders & Metal Fabricators" twice, "Paving & Interlocking Specialists"
 *    beside "Paving & Interlocking Installers"). Rendering one chip per row
 *    produced a wall of near-duplicates that reads as a bug. Chips are built from
 *    trades instead of rows, so a pair of rows becomes one chip that filters to
 *    both.
 * 2. Searching for a trade has to find that trade. "painters" is a trade name,
 *    not text in anyone's bio, so free-text search alone finds nothing. Matching
 *    here turns a search term into trade ids the directory can filter on.
 */

export interface TradeCategoryLike {
  id: string;
  name: string;
  slug?: string;
}

export interface TradeOption {
  /** Stable key: the normalised trade name. */
  key: string;
  /** Display name, taken from the first row that carried this trade. */
  name: string;
  /** Every category row that means this trade. */
  ids: string[];
  /** Those rows' slugs, so a chip stays a real, crawlable link. */
  slugs: string[];
}

// Agent endings ("-er", "-ers") are deliberately not stripped: "painter" and
// "paint" already match by prefix, and stripping them turns "tilers" into "til".
const SUFFIXES = [
  "ians",
  "ian",
  "ists",
  "ist",
  "ings",
  "ing",
  "es",
  "s",
];

/** Lowercase a free-text token and strip the plural or agent ending. */
export function stemTradeToken(token: string): string {
  let word = String(token ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (word.length <= 3) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      word = word.slice(0, word.length - suffix.length);
      break;
    }
  }
  return word;
}

/** Normalised trade name used to decide that two rows are the same trade. */
export function normalizeTradeName(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(stemTradeToken)
    .sort()
    .join(" ");
}

/**
 * Query words that name a trade the trade's own wording does not contain.
 *
 * Each entry is a claim that someone typing the left side wants a trade whose
 * normalised name contains the right side. Kept to the cases where the trade name
 * genuinely differs from what people type; anything already in the name (paint,
 * tile, plumb, weld, hvac) needs no entry because token matching finds it.
 */
const QUERY_TRADE_PHRASES: Record<string, string> = {
  qs: "quantity surveyor",
  quantity: "quantity surveyor",
  "cost consultant": "quantity surveyor",
  cctv: "security",
  inverter: "solar",
  gen: "solar",
  borehole: "borehole",
  well: "borehole",
  water: "borehole",
  pop: "pop",
  ceiling: "pop",
  plaster: "plaster",
};

/** True when a search token plausibly names this trade token. */
function tokenMatches(queryToken: string, tradeToken: string): boolean {
  if (!queryToken || !tradeToken) return false;
  if (queryToken === tradeToken) return true;
  // Prefix matching covers tile/tiling and electric/electrician without a
  // dictionary: a three-character overlap is the shortest useful signal.
  if (queryToken.length >= 3 && tradeToken.startsWith(queryToken)) return true;
  if (tradeToken.length >= 3 && queryToken.startsWith(tradeToken)) return true;
  return false;
}

/**
 * One option per trade, in the order the rows arrived, with every row that means
 * that trade folded in.
 */
export function buildTradeOptions(
  categories: TradeCategoryLike[],
): TradeOption[] {
  const byKey = new Map<string, TradeOption>();
  for (const category of categories) {
    const key = normalizeTradeName(category.name);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.ids.includes(category.id)) existing.ids.push(category.id);
      if (category.slug && !existing.slugs.includes(category.slug))
        existing.slugs.push(category.slug);
      continue;
    }
    byKey.set(key, {
      key,
      name: category.name,
      ids: [category.id],
      slugs: category.slug ? [category.slug] : [],
    });
  }
  return [...byKey.values()];
}

/**
 * Trades named by a search term, best first.
 *
 * An empty term matches nothing: the caller shows its short default list instead,
 * so the full wall of trades never appears unless it is asked for.
 */
export function matchTrades(
  trades: TradeOption[],
  query: string,
): TradeOption[] {
  const raw = String(query ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return [];

  const tokens = raw
    .split(" ")
    .map(stemTradeToken)
    .filter((t) => t.length >= 2);

  const scored = trades.map((trade) => {
    const name = normalizeTradeName(trade.name);
    const keywords = name.split(" ").filter(Boolean);
    let score = 0;
    for (const token of tokens) {
      const phrase = QUERY_TRADE_PHRASES[token];
      if (phrase && name.includes(phrase)) score += 2;
      if (keywords.some((keyword) => tokenMatches(token, keyword))) score += 1;
    }
    return { trade, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.trade);
}

/** Every category row behind the given trades, for a directory filter. */
export function tradeIdsFor(trades: TradeOption[]): string[] {
  return [...new Set(trades.flatMap((trade) => trade.ids))];
}

/** How many trades to show before the "all trades" disclosure. */
export const VISIBLE_TRADE_COUNT = 8;
