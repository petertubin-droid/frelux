/**
 * The contractor's own price book (first slice: storage and resolution).
 *
 * Every calculator already accepts a price map from the market book. What it
 * cannot accept is a rate the contractor negotiated with a local supplier: those
 * exist only as per-calculator strings that vanish on reload.
 *
 * This module owns the durable side and nothing else:
 *
 *  - An entry stores the rate TOGETHER with the currency it was entered in.
 *    A rate entered in naira is never read as dollars, because the only honest
 *    options are "use it in the currency it names" or "do not use it".
 *  - A rate of zero is a real rate (a supplied item, a free issue); a negative
 *    or non-finite rate is not a rate at all and is refused at the door.
 *  - Reading stored data validates every entry, so a hand-edited or half-written
 *    storage value cannot quietly become a price.
 *
 * Resolution is deliberately a separate step from storage: a caller asks for the
 * rates that match one currency and is told which slugs were skipped and why.
 */

export const PRICE_BOOK_STORAGE_KEY = "frelux.price-book.v1";

export interface PriceBookEntry {
  /** Material slug as the estimation engines name it, e.g. "fascia-per-meter". */
  slug: string;
  /** Currency units per unit of measure. Zero is valid; negative is not. */
  rate: number;
  /** ISO 4217 code the rate was entered in, upper case. */
  currency: string;
  /** Optional human note for the measure, e.g. "per 50 kg bag". */
  unit?: string;
  note?: string;
  /** ISO timestamp of the last edit, kept so an older edit cannot win silently. */
  updatedAt: string;
}

export interface PriceBook {
  version: 1;
  entries: PriceBookEntry[];
}

export const EMPTY_PRICE_BOOK: PriceBook = { version: 1, entries: [] };

const CURRENCY = /^[A-Z]{3}$/;

function cleanSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return slug.length > 0 && slug.length <= 80 ? slug : null;
}

function cleanCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return CURRENCY.test(code) ? code : null;
}

/**
 * One entry from untrusted parts. Returns the reason instead of a half entry, so
 * the caller can say why a rate was not accepted rather than dropping it.
 */
export function makePriceBookEntry(
  parts: {
    slug: string;
    rate: number | string;
    currency: string;
    unit?: string;
    note?: string;
  },
  now: Date = new Date(),
): { entry: PriceBookEntry } | { reason: string } {
  const slug = cleanSlug(parts.slug);
  if (!slug) return { reason: "A material slug is required." };

  const currency = cleanCurrency(parts.currency);
  if (!currency) {
    return { reason: "Enter the currency the rate was quoted in, as a three letter code." };
  }

  const raw = typeof parts.rate === "string" ? parts.rate.trim() : parts.rate;
  const rate = typeof raw === "string" && raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(rate)) return { reason: "Enter the rate as a number." };
  if (rate < 0) return { reason: "A rate cannot be negative." };

  return {
    entry: {
      slug,
      rate: Math.round(rate * 100) / 100,
      currency,
      unit: parts.unit?.trim() || undefined,
      note: parts.note?.trim() || undefined,
      updatedAt: now.toISOString(),
    },
  };
}

/**
 * Reads a whole book from storage text. A malformed shape gives an empty book;
 * individual bad entries are dropped and the rest survive.
 */
export function parseStoredPriceBook(raw: string | null): PriceBook {
  if (!raw) return EMPTY_PRICE_BOOK;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_PRICE_BOOK;
  }
  if (!parsed || typeof parsed !== "object") return EMPTY_PRICE_BOOK;
  const list = (parsed as { entries?: unknown }).entries;
  if (!Array.isArray(list)) return EMPTY_PRICE_BOOK;

  const bySlug = new Map<string, PriceBookEntry>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const slug = cleanSlug(row.slug);
    const currency = cleanCurrency(row.currency);
    const rate = Number(row.rate);
    if (!slug || !currency || !Number.isFinite(rate) || rate < 0) continue;
    const updatedAt =
      typeof row.updatedAt === "string" && !Number.isNaN(Date.parse(row.updatedAt))
        ? row.updatedAt
        : new Date(0).toISOString();
    const entry: PriceBookEntry = {
      slug,
      rate: Math.round(rate * 100) / 100,
      currency,
      unit: typeof row.unit === "string" ? row.unit : undefined,
      note: typeof row.note === "string" ? row.note : undefined,
      updatedAt,
    };
    // One slug, one rate: a later edit replaces an earlier one instead of both
    // being kept and the winner depending on array order.
    const existing = bySlug.get(slug);
    if (!existing || Date.parse(entry.updatedAt) >= Date.parse(existing.updatedAt)) {
      bySlug.set(slug, entry);
    }
  }
  return { version: 1, entries: Array.from(bySlug.values()) };
}

export function serializePriceBook(book: PriceBook): string {
  return JSON.stringify({ version: 1, entries: book.entries });
}

/** Adds or replaces the entry for its slug, keeping the file ordered by slug. */
export function upsertPriceBookEntry(book: PriceBook, entry: PriceBookEntry): PriceBook {
  const entries = book.entries.filter((e) => e.slug !== entry.slug);
  entries.push(entry);
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  return { version: 1, entries };
}

export function removePriceBookEntry(book: PriceBook, slug: string): PriceBook {
  return { version: 1, entries: book.entries.filter((e) => e.slug !== slug) };
}

export interface PriceBookResolution {
  /** Rates usable right now, in the calculator's currency. */
  rates: Record<string, number>;
  /** Entries that exist but were not used, with the currency they are quoted in. */
  skipped: Array<{ slug: string; currency: string; rate: number }>;
}

/**
 * The rates that may be applied in one currency.
 *
 * No conversion happens here on purpose: converting a naira rate with a stale
 * rate would put a confident-looking number under a wrong label. The caller is
 * told the slug was skipped so it can say so.
 */
export function resolvePriceBook(book: PriceBook, currency: string): PriceBookResolution {
  const wanted = cleanCurrency(currency);
  const rates: Record<string, number> = {};
  const skipped: PriceBookResolution["skipped"] = [];
  for (const entry of book.entries) {
    if (wanted && entry.currency === wanted) rates[entry.slug] = entry.rate;
    else skipped.push({ slug: entry.slug, currency: entry.currency, rate: entry.rate });
  }
  return { rates, skipped };
}

/**
 * Lays the price book under a calculator's own map. An entry in the book wins
 * over the market book because it is the contractor's measured supplier rate; a
 * blank or absent calculator value changes nothing.
 */
export function applyPriceBook(
  base: Record<string, number | null>,
  rates: Record<string, number>,
): Record<string, number | null> {
  const merged: Record<string, number | null> = { ...base };
  for (const [slug, rate] of Object.entries(rates)) {
    if (Number.isFinite(rate) && rate >= 0) merged[slug] = rate;
  }
  return merged;
}

export interface PriceBookMerge {
  /** The converged book: one entry per slug, the later edit in each. */
  book: PriceBook;
  /** Entries this device has that the account does not, or that are newer. */
  toPush: PriceBookEntry[];
  /** How many slugs the account held that this device did not. */
  pulled: number;
  /** Slugs where both sides claimed the same instant but disagreed. */
  ties: string[];
}

function timeOf(entry: PriceBookEntry): number {
  const t = Date.parse(entry.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Converge a local book with an account book.
 *
 * The rule is per slug and needs no clock agreement between devices: the later
 * updatedAt wins. When both sides carry the same instant but different content,
 * the account copy wins, so repeated syncs cannot oscillate between two devices
 * and the server stays the tiebreaker. An entry present on one side only is
 * never deleted by a merge; a deletion is a separate, explicit act.
 */
export function mergePriceBooks(local: PriceBook, remote: PriceBook): PriceBookMerge {
  const byslug = new Map<string, PriceBookEntry>();
  const toPush: PriceBookEntry[] = [];
  const ties: string[] = [];

  const localBySlug = new Map(local.entries.map((e) => [e.slug, e]));
  const remoteBySlug = new Map(remote.entries.map((e) => [e.slug, e]));

  for (const remoteEntry of remote.entries) {
    const localEntry = localBySlug.get(remoteEntry.slug);
    if (!localEntry) {
      byslug.set(remoteEntry.slug, remoteEntry);
      continue;
    }
    const localTime = timeOf(localEntry);
    const remoteTime = timeOf(remoteEntry);
    if (localTime > remoteTime) {
      byslug.set(remoteEntry.slug, localEntry);
      toPush.push(localEntry);
    } else {
      byslug.set(remoteEntry.slug, remoteEntry);
      if (localTime === remoteTime && ratesDiffer(localEntry, remoteEntry)) {
        ties.push(remoteEntry.slug);
      }
    }
  }

  for (const localEntry of local.entries) {
    if (remoteBySlug.has(localEntry.slug)) continue;
    byslug.set(localEntry.slug, localEntry);
    toPush.push(localEntry);
  }

  const pulled = remote.entries.filter((e) => !localBySlug.has(e.slug)).length;

  return {
    book: {
      version: 1,
      entries: [...byslug.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
    },
    toPush,
    pulled,
    ties,
  };
}

function ratesDiffer(a: PriceBookEntry, b: PriceBookEntry): boolean {
  return (
    a.rate !== b.rate ||
    a.currency !== b.currency ||
    (a.unit ?? "") !== (b.unit ?? "") ||
    (a.note ?? "") !== (b.note ?? "")
  );
}
