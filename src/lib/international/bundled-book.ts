// =========================================================
// BUNDLED STATIC PRICE BOOK — offline resolution layer
//
// When the Supabase project is not connected (owner decision,
// cfb16a36), the site resolves market prices from the bundled
// static book instead of failing silently. The bundled book is
// generated from the production catalog sync: real prices with
// their recorded retailers and confidences — some rows are
// web-verified retail prices, others are honestly marked
// "indicative, adjustable". Provenance always travels.
//
// This module adds NO prices of its own and changes no math:
// it only serves the same data the DB would serve, statically,
// so calculators keep working (and disclosing) offline.
// =========================================================

import { isSupabaseConfigured } from "@/lib/supabase";
import type { DbPopMaterial, DbTileMaterial } from "@/types/database";

/**
 * True when the static bundled book must serve (no DB connected).
 * If the connection flag cannot be read (partial test mocks omit the
 * export), the bundled book is the safe offline default: an unverified
 * connection must never let calculators silently skip price resolution.
 */
export function shouldUseBundledBook(): boolean {
  try {
    return !isSupabaseConfigured;
  } catch {
    return true;
  }
}

/** Marker appended to price notes so UIs can disclose the source. */
export const BUNDLED_SOURCE_MARKER = "[bundled static price book]";

interface BundledBook {
  getBundledPrice: (
    slug: string,
    market: string,
  ) => {
    p: number;
    c: string;
    v: string;
    s: string | null;
    f: string | null;
    slug: string;
  } | null;
  getBundledCategoryMaterials: (
    category: string,
    market: string,
  ) => {
    slug: string;
    name: string;
    pack: number | null;
    price: {
      p: number;
      c: string;
      v: string;
      s: string | null;
      f: string | null;
    };
  }[];
  getBundledRoleMapping: (
    market: string,
    role: string,
  ) => {
    slug: string;
    name: string;
    unit: string;
    notes: string | null;
  } | null;
  BUNDLED_POP_MATERIALS: readonly Record<string, unknown>[];
  BUNDLED_TILE_MATERIALS: readonly Record<string, unknown>[];
  BUNDLED_PRICED_MARKETS: readonly string[];
  BUNDLED_BOOK_VERSION: string;
}

let bookPromise: Promise<BundledBook> | null = null;

async function loadBook(): Promise<BundledBook> {
  bookPromise ??= import("./bundled-price-books") as Promise<BundledBook>;
  return bookPromise;
}

/**
 * Resolve a material's price for a market from the bundled book.
 * Returns DB-shaped rows so existing consumers are unchanged.
 * Returns only an exact-market price. The role resolver may explicitly
 * traverse its configured inheritance chain, but this low-level lookup
 * never substitutes a different market's currency or price.
 */
export async function bundledMaterialForSlug(
  slug: string,
  market: string,
): Promise<{
  id: string;
  name: string;
  slug: string;
  category: string;
  market: string;
  price: {
    price: number;
    currency: string;
    effective_date: string;
    price_source: string | null;
    scan_confidence: string | null;
    notes: string;
  };
} | null> {
  const book = await loadBook();
  const candidate = market;
  const hit = book.getBundledPrice(slug, candidate);
  if (hit) {
    const entry = book.getBundledPrice(hit.slug, candidate);
    const price = entry ? entry : null;
    if (!price) return null;
    return {
      id: hit.slug,
      name: hit.slug, // name filled by caller from role mapping display name
      slug: hit.slug,
      category: "bundled",
      market: candidate,
      price: {
        price: hit.p,
        currency: hit.c,
        effective_date: hit.v,
        price_source: hit.s,
        scan_confidence: hit.f,
        notes: `${hit.s ?? ""} ${BUNDLED_SOURCE_MARKER}`.trim(),
      },
    };
  }
  return null;
}

/**
 * All priced materials in a category for a market, bundled-book
 * shape mapped onto the structural resolver's category shape.
 */
export async function bundledCategoryMaterials(
  category: string,
  market: string,
): Promise<
  Array<{
    material: { id: string; name: string };
    price: { price: number; scan_confidence: string | null };
  }>
> {
  const book = await loadBook();
  const rows = book.getBundledCategoryMaterials(category, market);
  return rows.map((r) => ({
    material: { id: r.slug, name: r.name },
    price: { price: r.price.p, scan_confidence: r.price.f },
  }));
}

/** POP ceiling materials from the bundled book, market-first. */
export async function bundledPopMaterials(
  workflow: string | undefined,
  market: string | undefined,
): Promise<{
  data: DbPopMaterial[];
  error: null;
  fellBackToNg: boolean;
  marketConfigured: boolean;
}> {
  const book = await loadBook();
  const all = book.BUNDLED_POP_MATERIALS as unknown as DbPopMaterial[];
  const run = (mkt: string) =>
    all
      .filter((m) => m.market === mkt)
      .filter((m) => !workflow || m.workflow === workflow)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (market && market !== "NG") {
    const local = run(market);
    if (local.length > 0)
      return {
        data: local,
        error: null,
        fellBackToNg: false,
        marketConfigured: true,
      };
    // Owner-approved (2026-10-24): no automatic NG substitution offline
    // either. Unconfigured market = empty set; the caller must get
    // local input or explicitly request the NG reference set.
    return {
      data: [],
      error: null,
      fellBackToNg: false,
      marketConfigured: false,
    };
  }
  return {
    data: run("NG"),
    error: null,
    fellBackToNg: false,
    marketConfigured: true,
  };
}

/** Tile materials from the bundled book, market-first. */
export async function bundledTileMaterials(
  category: string | undefined,
  market: string | undefined,
): Promise<{
  data: DbTileMaterial[];
  error: null;
  fellBackToNg: boolean;
  marketConfigured: boolean;
}> {
  const book = await loadBook();
  const all = book.BUNDLED_TILE_MATERIALS as unknown as DbTileMaterial[];
  const run = (mkt: string) =>
    all
      .filter((m) => m.market === mkt)
      .filter((m) => !category || m.category === category)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (market && market !== "NG") {
    const local = run(market);
    if (local.length > 0)
      return {
        data: local,
        error: null,
        fellBackToNg: false,
        marketConfigured: true,
      };
    // Owner-approved (2026-10-24): no automatic NG substitution offline
    // either. Unconfigured market = empty set; the caller must get
    // local input or explicitly request the NG reference set.
    return {
      data: [],
      error: null,
      fellBackToNg: false,
      marketConfigured: false,
    };
  }
  return {
    data: run("NG"),
    error: null,
    fellBackToNg: false,
    marketConfigured: true,
  };
}

/** The bundled role mapping for a market (display name travels). */
export async function bundledRoleMapping(market: string, role: string) {
  const book = await loadBook();
  return book.getBundledRoleMapping(market, role);
}

/** Markets that have at least one bundled price (for status UIs). */
export async function bundledPricedMarkets(): Promise<readonly string[]> {
  const book = await loadBook();
  return book.BUNDLED_PRICED_MARKETS;
}
