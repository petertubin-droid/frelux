/**
 * The "which product should I buy" list every estimator shows.
 *
 * FRELUX already answers "what will this cost" from its own verified price
 * book. This answers the neighbouring question a customer actually asks at the
 * shelf: of the products that are genuinely durable and genuinely sold here,
 * which ones should I be choosing between.
 *
 * Two sources feed it, in this order:
 *
 * 1. The market's own catalogue (`estimation_materials` + the price gateway).
 *    When a market's book is priced by product, those rows are the products
 *    people can actually buy there, and the price shown is the price the
 *    gateway resolved, with its provenance.
 * 2. The curated catalogue in `src/config/verified-products.ts`, which covers
 *    markets whose book is priced by role (Nigeria is one). Every figure there
 *    names the page it came from and the day it was read.
 *
 * Nothing is ever invented to fill a gap: a product with no published price is
 * returned with a null price and a note, and the caller renders that gap.
 */

import {
  fetchEstimationMaterials,
  fetchPricedMaterialIds,
} from "@/lib/estimation/queries";
import {
  fetchMarketRoleMappings,
  type MaterialRole,
} from "@/lib/estimation/market-materials";
import {
  resolveMaterialPrice,
  resolvePrice,
} from "@/lib/pricing/price-gateway";
import {
  verifiedProductsFor,
  type VerifiedProductCategory,
} from "@/config/verified-products";

export interface RecommendationPrice {
  low: number;
  /** Highest published price, when the source publishes a range. */
  high: number | null;
  currency: string;
}

export interface ProductRecommendation {
  id: string;
  /** Manufacturer, when the source names one. */
  brand: string | null;
  name: string;
  summary: string | null;
  /** Pack and finish line, e.g. "20 L · matt". Null when unknown. */
  detail: string | null;
  price: RecommendationPrice | null;
  /** Why there is no price, or what the price rests on. */
  priceNote: string | null;
  coveragePerLitre: number | null;
  coats: number | null;
  source: {
    label: string;
    url: string | null;
    retrieved: string | null;
  };
  origin: "market-book" | "curated";
}

/** Materials are pulled per category; this caps how many we price per render. */
const CANDIDATE_LIMIT = 18;

/**
 * Where a category has no product-level rows in a market's book, the market's
 * role mappings still carry a verified price for the material class. These are
 * the roles each category will fall back to, most representative first.
 */
const ROLE_FALLBACK: Partial<Record<VerifiedProductCategory, MaterialRole[]>> =
  {
    paint: ["interior-paint-premium", "interior-paint", "exterior-paint"],
    cement: ["concrete-mix"],
    primer: ["primer"],
    waterproofing: [
      "waterproofer",
      "cementitious-coating",
      "bituminous-membrane",
    ],
    plaster: ["bonding-plaster", "skim-plaster", "gypsum-plaster"],
    filler: ["fine-filler", "joint-filler"],
    aggregate: ["concrete-mix", "sand"],
  };

const cache = new Map<string, ProductRecommendation[]>();

export function clearRecommendationCache(): void {
  cache.clear();
}

function packFromName(name: string): string | null {
  const match = name.match(
    /(\d+(?:[.,]\d+)?)\s*(l|lt|ltr|litre|litres|kg|ml)\b/i,
  );
  if (!match) return null;
  const size = match[1].replace(",", ".");
  const unit = match[2].toLowerCase();
  const normalised =
    unit === "l" || unit.startsWith("lt") || unit.startsWith("lit")
      ? "L"
      : unit === "ml"
        ? "ml"
        : "kg";
  return `${size} ${normalised}`;
}

function curatedToRecommendation(p: {
  id: string;
  brand: string;
  line: string;
  summary: string;
  finish: string | null;
  packs: readonly {
    size: number;
    unit: string;
    priceLow: number;
    priceHigh: number;
  }[];
  currency: string;
  coveragePerLitre: number | null;
  coats: number | null;
  sourceUrl: string;
  sourceName: string;
  retrieved: string;
  caveat?: string;
}): ProductRecommendation {
  const pack = p.packs[0];
  return {
    id: p.id,
    brand: p.brand,
    name: p.line,
    summary: p.summary,
    detail:
      [pack ? `${pack.size} ${pack.unit}` : null, p.finish]
        .filter(Boolean)
        .join(" \u00b7 ") || null,
    price: pack
      ? {
          low: pack.priceLow,
          high: pack.priceHigh > pack.priceLow ? pack.priceHigh : null,
          currency: p.currency,
        }
      : null,
    priceNote: p.caveat ?? null,
    coveragePerLitre: p.coveragePerLitre,
    coats: p.coats,
    source: {
      label: p.sourceName,
      url: p.sourceUrl,
      retrieved: p.retrieved,
    },
    origin: "curated",
  };
}

function materialToRecommendation(
  material: { id: string; name: string; notes: string | null },
  resolved: {
    unitPrice: number | null;
    currency: string | null;
    provenance: { priceSource: string | null; effectiveDate: string | null };
  },
): ProductRecommendation | null {
  if (resolved.unitPrice === null || !resolved.currency) return null;
  return {
    id: material.id,
    brand: null,
    name: material.name,
    summary: material.notes,
    detail: packFromName(material.name),
    price: {
      low: resolved.unitPrice,
      high: null,
      currency: resolved.currency,
    },
    priceNote: resolved.provenance.priceSource
      ? `Price recorded from ${resolved.provenance.priceSource}`
      : null,
    coveragePerLitre: null,
    coats: null,
    source: {
      label: "FRELUX verified price book",
      url: null,
      retrieved: resolved.provenance.effectiveDate,
    },
    origin: "market-book",
  };
}

function roleToRecommendation(
  mapping: {
    role: string;
    material_slug: string;
    display_name: string;
    unit_label: string;
    notes: string | null;
  },
  resolved: {
    unitPrice: number | null;
    currency: string | null;
    message?: string;
    provenance: { effectiveDate: string | null; priceSource: string | null };
  },
): ProductRecommendation | null {
  if (resolved.unitPrice === null || !resolved.currency) return null;
  return {
    id: `role:${mapping.role}:${mapping.material_slug}`,
    brand: null,
    name: mapping.display_name,
    summary: mapping.notes,
    detail: mapping.unit_label || null,
    price: {
      low: resolved.unitPrice,
      high: null,
      currency: resolved.currency,
    },
    // The gateway's own sentence says how far the figure can be trusted, so it
    // is passed through rather than replaced with a stronger claim.
    priceNote: resolved.message ?? null,
    coveragePerLitre: null,
    coats: null,
    source: {
      label: "FRELUX verified price book",
      url: null,
      retrieved: resolved.provenance.effectiveDate,
    },
    origin: "market-book",
  };
}

/**
 * Recommended products for one category in one market.
 *
 * Never throws: a failed read returns whatever the curated catalogue can prove
 * plus an error string for the caller to show quietly.
 */
export async function loadProductRecommendations(options: {
  category: VerifiedProductCategory;
  market: string;
  limit?: number;
}): Promise<{ items: ProductRecommendation[]; error: string | null }> {
  const market = (options.market || "").toUpperCase();
  const category = options.category;
  const limit = options.limit ?? 6;
  const key = `${market}:${category}:${limit}`;

  const cached = cache.get(key);
  if (cached) return { items: cached, error: null };

  const curated = verifiedProductsFor(category, market).map(
    curatedToRecommendation,
  );
  let error: string | null = null;
  const fromBook: ProductRecommendation[] = [];

  try {
    const { data: materials, error: materialsError } =
      await fetchEstimationMaterials(true);
    if (materialsError) throw materialsError;

    const inCategory = (materials ?? []).filter((m) => m.category === category);
    const priced = await fetchPricedMaterialIds(
      market,
      inCategory.map((m) => m.id),
    );
    const candidates = inCategory
      .filter((m) => priced.has(m.id))
      .slice(0, CANDIDATE_LIMIT);

    const resolved = await Promise.all(
      candidates.map(async (m) => ({
        material: m,
        price: await resolveMaterialPrice({ market, refId: m.id }),
      })),
    );

    for (const entry of resolved) {
      const recommendation = materialToRecommendation(
        entry.material,
        entry.price,
      );
      if (recommendation) fromBook.push(recommendation);
    }
  } catch {
    error =
      "The product catalogue could not be read just now. Your estimate is unaffected.";
  }

  const roles = ROLE_FALLBACK[category] ?? [];
  const fromRoles: ProductRecommendation[] = [];
  if (fromBook.length + curated.length < limit && roles.length > 0) {
    try {
      const mappings = await fetchMarketRoleMappings(market);
      const wanted = roles
        .map((role) => mappings.find((m) => m.role === role))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .slice(0, Math.max(0, limit - fromBook.length - curated.length));

      const resolved = await Promise.all(
        wanted.map(async (mapping) => ({
          mapping,
          price: await resolvePrice({
            market,
            role: mapping.role as MaterialRole,
          }),
        })),
      );

      for (const entry of resolved) {
        const recommendation = roleToRecommendation(entry.mapping, entry.price);
        if (recommendation) fromRoles.push(recommendation);
      }
    } catch {
      error =
        error ??
        "The product catalogue could not be read just now. Your estimate is unaffected.";
    }
  }

  const seen = new Set(
    [...curated, ...fromRoles].map((c) => c.name.toLowerCase()),
  );
  const merged = [
    ...fromBook.filter((p) => !seen.has(p.name.toLowerCase())),
    ...fromRoles.filter(
      (p) =>
        !fromBook.some((b) => b.name.toLowerCase() === p.name.toLowerCase()),
    ),
    ...curated,
  ].slice(0, limit);

  cache.set(key, merged);
  return { items: merged, error };
}
