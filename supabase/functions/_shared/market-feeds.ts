import { canonicalisePair } from "./supplier-aliases.ts";
// =========================================================
// market-feeds — structured price source adapters
//
// The 32-market scanner accepts more than HTML product pages: supplier APIs,
// JSON feeds, CSV price lists, RSS feeds and administrator quotations. This
// module holds the parsing for those formats plus the two guards that decide
// whether a URL may be read at all (robots.txt) and which Frelux material a
// feed row describes.
//
// Deliberately pure: no Deno globals, no network. The caller fetches, this
// decides. That keeps every rule unit-testable without a live site.
// =========================================================

export type SourceFormat =
  "product" | "search" | "json" | "api" | "csv" | "rss" | "quote";

export const STRUCTURED_FORMATS: SourceFormat[] = ["json", "api", "csv", "rss"];

export interface FeedMapping {
  /** Dotted path to the array of items, e.g. "data.products" or "results". */
  items?: string;
  /** Key or column holding the price (default "price"). */
  price?: string;
  name?: string;
  currency?: string;
  unit?: string;
  brand?: string;
  specification?: string;
  supplier?: string;
  location?: string;
  /** CSV field separator, default ",". */
  delimiter?: string;
  /** Currency to assume when the feed omits one. */
  currency_default?: string;
}

export interface FeedRow {
  price: number;
  currency: string | null;
  name: string | null;
  unit: string | null;
  brand: string | null;
  specification: string | null;
  supplier: string | null;
  location: string | null;
}

export interface MaterialRef {
  slug: string;
  name: string;
  category: string | null;
}

export interface MatchedRow extends FeedRow {
  material: MaterialRef;
  score: number;
}

/** "₦8,500.00" / "8 500,00" / "1.234,56" / "AED 12.50" → 8500, 8500, 1234.56, 12.5 */
export function toNumber(raw: unknown): number | null {
  if (typeof raw === "number")
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (raw === null || raw === undefined) return null;
  let text = String(raw)
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) {
    // Whichever separator comes last is the decimal one.
    text =
      text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    // "8,500" is thousands; "8,50" is a decimal comma.
    const [, tail = ""] = text.split(",");
    text = tail.length === 3 ? text.replace(/,/g, "") : text.replace(",", ".");
  }
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function pick(obj: Record<string, unknown>, key?: string): unknown {
  if (!key) return undefined;
  if (key in obj) return obj[key];
  let cursor: unknown = obj;
  for (const part of key.split(".")) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 200) : null;
}

function atPath(root: unknown, path?: string): unknown {
  if (!path) return root;
  let cursor: unknown = root;
  for (const part of path.split(".")) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function rowFrom(
  raw: Record<string, unknown>,
  mapping: FeedMapping,
): FeedRow | null {
  const price = cataloguePrice(raw, mapping.price ?? "price");
  if (price === null) return null;
  return {
    price,
    currency:
      catalogueCurrency(raw, mapping.currency ?? "currency") ??
      mapping.currency_default ??
      null,
    name: str(pick(raw, mapping.name ?? "name")),
    unit: str(pick(raw, mapping.unit ?? "unit")),
    brand: str(pick(raw, mapping.brand ?? "brand")),
    specification: str(pick(raw, mapping.specification ?? "specification")),
    supplier: str(pick(raw, mapping.supplier ?? "supplier")),
    location: str(pick(raw, mapping.location ?? "location")),
  };
}

/**
 * Supplier catalogues nest prices one level down: Shopify keeps them in
 * variants, WooCommerce in a prices object with minor units. Both are expanded
 * into flat rows so a shop catalogue reads like any other price feed.
 */
function expandCatalogueItems(items: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const item of items) {
    const row = item as Record<string, unknown>;
    const variants = Array.isArray(row?.variants)
      ? (row.variants as Record<string, unknown>[])
      : null;
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        out.push({
          ...variant,
          name: [row.title ?? row.name, variant.title]
            .filter(Boolean)
            .join(" - "),
          brand: variant.brand ?? row.vendor,
          specification: variant.specification ?? variant.title,
          currency: variant.currency ?? row.currency,
        });
      }
    } else {
      out.push(row);
    }
  }
  return out;
}

/** Reads a price from a catalogue object, honouring WooCommerce minor units. */
function cataloguePrice(
  raw: Record<string, unknown>,
  key: string,
): number | null {
  const direct = toNumber(pick(raw, key));
  if (direct !== null) return direct;
  const prices = raw.prices as Record<string, unknown> | undefined;
  if (prices && typeof prices === "object") {
    const minor = Number(prices.currency_minor_unit ?? 2);
    const value = toNumber(prices.price);
    if (value !== null) return minor > 0 ? value / Math.pow(10, minor) : value;
  }
  return null;
}

/** Reads the currency a catalogue states next to the price, if any. */
function catalogueCurrency(
  raw: Record<string, unknown>,
  key: string,
): string | null {
  const direct = str(pick(raw, key));
  if (direct) return direct;
  const prices = raw.prices as Record<string, unknown> | undefined;
  const nested = prices ? str(prices.currency_code) : null;
  return nested ?? null;
}

/** Accepts the common JSON shapes: an array, {items:[...]}, {data:{...}} via mapping.items. */
export function parseJsonFeed(
  text: string,
  mapping: FeedMapping = {},
): FeedRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  let items = atPath(parsed, mapping.items);
  if (items === undefined || items === null) {
    // Fall back to the first array found in the payload.
    const queue: unknown[] = [parsed];
    while (queue.length) {
      const node = queue.shift();
      if (Array.isArray(node)) {
        items = node;
        break;
      }
      if (node && typeof node === "object") {
        queue.push(...Object.values(node as Record<string, unknown>));
      }
    }
  }
  let itemList: unknown[] = [];
  if (Array.isArray(items)) {
    itemList = items;
  } else if (items && typeof items === "object") {
    // A single-product payload is a valid feed of one.
    itemList = [items];
  } else {
    return [];
  }
  const rows: FeedRow[] = [];
  // Shopify and WooCommerce keep the price one level down; expand first so a
  // shop catalogue reads exactly like a flat price feed.
  for (const item of expandCatalogueItems(itemList)) {
    if (!item || typeof item !== "object") continue;
    const row = rowFrom(item as Record<string, unknown>, mapping);
    if (row && row.price > 0) rows.push(row);
    if (rows.length >= 500) break;
  }
  return rows;
}

/** Splits on the delimiter, honouring quoted fields with doubled quotes. */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

export function parseCsvFeed(
  text: string,
  mapping: FeedMapping = {},
): FeedRow[] {
  const delimiter = mapping.delimiter ?? ",";
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0], delimiter).map((h) => h.toLowerCase());
  const index = (key?: string, fallback?: string) => {
    const wanted = (key ?? fallback ?? "").toLowerCase();
    return header.indexOf(wanted);
  };
  const idx = {
    price: index(mapping.price, "price"),
    currency: index(mapping.currency, "currency"),
    name: index(mapping.name, "name"),
    unit: index(mapping.unit, "unit"),
    brand: index(mapping.brand, "brand"),
    specification: index(mapping.specification, "specification"),
    supplier: index(mapping.supplier, "supplier"),
    location: index(mapping.location, "location"),
  };
  if (idx.price < 0) return [];
  const rows: FeedRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);
    const price = toNumber(cells[idx.price]);
    if (price === null) continue;
    const cell = (at: number) => (at >= 0 ? str(cells[at]) : null);
    rows.push({
      price,
      currency: cell(idx.currency) ?? mapping.currency_default ?? null,
      name: cell(idx.name),
      unit: cell(idx.unit),
      brand: cell(idx.brand),
      specification: cell(idx.specification),
      supplier: cell(idx.supplier),
      location: cell(idx.location),
    });
    if (rows.length >= 500) break;
  }
  return rows;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** RSS/Atom: one row per item, the title is the product name and the price is
 *  read from an explicit price element or the first currency amount in the
 *  title/description. Rows without a price are skipped, never guessed. */
export function parseRssFeed(
  text: string,
  mapping: FeedMapping = {},
): FeedRow[] {
  const items =
    text.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  const rows: FeedRow[] = [];
  for (const item of items) {
    const grab = (tag: string) => {
      const m = item.match(
        new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
      );
      return m ? decodeXml(m[1].replace(/<[^>]+>/g, " ")) : null;
    };
    const title = grab("title");
    const explicit = grab(mapping.price ?? "price") ?? grab("g:price");
    let price = toNumber(explicit);
    if (price === null) {
      const haystack = [title, grab("description")]
        .filter(Boolean)
        .join(" ")
        .replace(/<[^>]+>/g, " ");
      const amount = haystack.match(
        /(?:[$£€₹¥₦]|NGN|NG₦|GHS|KES|ZAR|AED|SAR|BRL|JPY|EUR|USD|GBP|MXN|CNY|IDR|KRW|INR|CAD|AUD|CHF|SEK|NOK|DKK|PLN|TRY|TZS|ETB|XOF)\s?([\d][\d.,]{0,14})/i,
      );
      price = amount ? toNumber(amount[1]) : null;
    }
    if (price === null) continue;
    const currencyElement = grab("currency") ?? grab("g:currency");
    const currencyMatch = (currencyElement ?? explicit ?? title ?? "").match(
      /\b(USD|EUR|GBP|NGN|GHS|KES|ZAR|AED|SAR|BRL|JPY|INR|CAD|AUD|CHF|SEK|NOK|DKK|PLN|TRY|TZS|ETB|XOF|MXN|CNY|IDR|KRW|SGD|MYR|THB|NZD|PHP|PKR)\b/,
    );
    rows.push({
      price,
      currency: currencyMatch
        ? currencyMatch[1]
        : currencyElement
          ? currencyElement.toUpperCase().slice(0, 3)
          : (mapping.currency_default ?? null),
      name: title,
      unit: null,
      brand: null,
      specification: null,
      supplier: grab(mapping.supplier ?? "author") ?? null,
      location: grab(mapping.location ?? "location") ?? null,
    });
    if (rows.length >= 500) break;
  }
  return rows;
}

export function parseFeed(
  format: SourceFormat,
  text: string,
  mapping: FeedMapping = {},
): FeedRow[] {
  switch (format) {
    case "json":
    case "api":
      return parseJsonFeed(text, mapping);
    case "csv":
      return parseCsvFeed(text, mapping);
    case "rss":
      return parseRssFeed(text, mapping);
    default:
      return [];
  }
}

const STOP_WORDS = new Set([
  "and",
  "for",
  "the",
  "with",
  "per",
  "pcs",
  "pack",
  "piece",
  "grade",
  "new",
  "best",
  "buy",
  "online",
  "price",
  "sale",
  "of",
  "to",
  "in",
  "a",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9. ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** How well a feed row name describes a material: 0 (no) to 1 (the name). */
export function matchScore(rowName: string, materialName: string): number {
  const a = tokens(rowName);
  const b = tokens(materialName);
  if (!a.length || !b.length) return 0;
  const aSet = new Set(a);
  // A size, thickness or grade token ("50kg", "20mm", "1.5") distinguishes two
  // products that otherwise share a name: if the material has one and the row
  // does not, the row is a different product and must not be priced as this one.
  const distinctive = b.filter((t) => /\d/.test(t));
  if (distinctive.some((t) => !aSet.has(t))) return 0;
  const shared = b.filter((t) => aSet.has(t)).length;
  if (shared === 0) return 0;
  const coverage = shared / b.length; // material covered by the row
  const precision = shared / a.length; // row is not mostly other stuff
  return Math.round((coverage * 0.7 + precision * 0.3) * 100) / 100;
}

/** Picks the material a row describes, or nothing. Never a best-guess match:
 *  a row that cannot clear the threshold is dropped rather than mis-priced.
 *
 *  When the market is given, both names are first rewritten through that
 *  market's supplier aliases (AU "Villaboard" → fibre cement sheet, CA
 *  "Sheetrock" → plasterboard). Without it a regional catalogue matches
 *  nothing, which is how the AU and CA feeds sat mapped at zero. */
export function matchMaterials(
  rows: FeedRow[],
  materials: MaterialRef[],
  threshold = 0.6,
  market?: string,
): MatchedRow[] {
  const out: MatchedRow[] = [];
  for (const row of rows) {
    if (!row.name) continue;
    let best: { material: MaterialRef; score: number } | null = null;
    for (const material of materials) {
      const score = market
        ? aliasMatchScore(row.name, material.name, market)
        : matchScore(row.name, material.name);
      if (!best || score > best.score) best = { material, score };
    }
    if (best && best.score >= threshold) {
      out.push({ ...row, material: best.material, score: best.score });
    }
  }
  return out;
}

/** Catalogue names carry a market suffix ("N-grade rebar 20mm x 12m (AU)")
 *  that no supplier row repeats, so it is removed before scoring. */
export function stripMarketSuffix(name: string): string {
  return (name ?? "").replace(/\s*\([A-Z]{2}\)\s*$/, "").trim();
}

/** Score two names in one market's vocabulary; 0 when either is not a
 *  material, so a tool can never score against a product name. */
export function aliasMatchScore(
  rowName: string,
  materialName: string,
  market: string,
): number {
  const pair = canonicalisePair(
    stripMarketSuffix(rowName),
    stripMarketSuffix(materialName),
    market,
  );
  if (!pair) return 0;
  return matchScore(pair.row, pair.material);
}

export interface RobotsRules {
  disallow: string[];
  allow: string[];
  crawlDelaySeconds: number | null;
}

/** Parses the groups that apply to us: `User-agent: *` plus any group naming
 *  our token. Other groups are irrelevant to this fetch. */
export function parseRobots(
  text: string,
  userAgentToken = "frelux",
): RobotsRules {
  const rules: RobotsRules = {
    disallow: [],
    allow: [],
    crawlDelaySeconds: null,
  };
  if (!text) return rules;
  let applies = false;
  let sawSpecific = false;
  const groups: Array<{ agents: string[]; rules: RobotsRules }> = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [keyRaw, ...rest] = line.split(":");
    const key = keyRaw.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (
        !current ||
        current.rules.disallow.length ||
        current.rules.allow.length
      ) {
        current = {
          agents: [],
          rules: { disallow: [], allow: [], crawlDelaySeconds: null },
        };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && (key === "disallow" || key === "allow")) {
      if (value) current.rules[key].push(value);
    } else if (current && key === "crawl-delay") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) current.rules.crawlDelaySeconds = parsed;
    }
  }

  const wants = userAgentToken.toLowerCase();
  for (const group of groups) {
    const specific = group.agents.some((a) => a !== "*" && wants.includes(a));
    if (specific && !sawSpecific) {
      sawSpecific = true;
      applies = true;
      rules.disallow = [...group.rules.disallow];
      rules.allow = [...group.rules.allow];
      rules.crawlDelaySeconds = group.rules.crawlDelaySeconds;
    }
  }
  if (!sawSpecific) {
    for (const group of groups) {
      if (group.agents.includes("*")) {
        rules.disallow.push(...group.rules.disallow);
        rules.allow.push(...group.rules.allow);
        rules.crawlDelaySeconds ??= group.rules.crawlDelaySeconds;
      }
    }
  }
  return rules;
}

function pathMatches(pattern: string, path: string): boolean {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\/$/, "/?");
  try {
    return new RegExp(`^${escaped}`).test(path);
  } catch {
    return false;
  }
}

/** Longest matching rule wins, as the robots.txt spec requires. */
export function robotsAllows(
  rules: RobotsRules,
  path: string,
  allowedByDefault = true,
): boolean {
  const best = (
    list: string[],
    verdict: boolean,
  ): { length: number; verdict: boolean } | null => {
    let winner: { length: number; verdict: boolean } | null = null;
    for (const pattern of list) {
      if (pattern && pathMatches(pattern, path)) {
        if (!winner || pattern.length > winner.length) {
          winner = { length: pattern.length, verdict };
        }
      }
    }
    return winner;
  };
  const allow = best(rules.allow, true);
  const disallow = best(rules.disallow, false);
  if (!allow && !disallow) return allowedByDefault;
  if (!allow) return disallow?.verdict ?? allowedByDefault;
  if (!disallow) return allow.verdict;
  return allow.length >= disallow.length ? allow.verdict : disallow.verdict;
}
