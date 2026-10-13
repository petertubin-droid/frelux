
import { supabase } from "@/lib/supabase";

// =========================================================
// Single-material resolutions shared by other structural pages
// (build-to-roof prefill, etc.). Same honesty rules: pack must
// be explicit, volume must be a real volume, else null.
// =========================================================

/** Provenance row for one market-resolved structural price. */
export interface StructuralPriceProvenance {
  engineKey: string;
  resolved: boolean;
  bookMarket: string;
  materialName: string;
  price: number;
  explanation: string;
}

/** The Nigerian engine prices cement on a 50 kg bag basis. */
const NG_CEMENT_BAG_KG = 50;

/** A material + its active price in one market. */
interface CategoryPriceResolution {
  material: { id: string; name: string };
  price: { price: number; scan_confidence?: string | null };
}

/**
 * Find an active material in a category that has an active price
 * in the given market. Materials are a shared catalog, prices are
 * market-scoped, so candidates are checked until one is priced.
 * Returns null when the market book has no such price - callers
 * keep their disclosed NG default instead of guessing.
 */
async function fetchPricedMaterialsInCategory(
  category: string,
  marketCode: string,
): Promise<CategoryPriceResolution[]> {
  if (!marketCode || marketCode === "NG") return [];
  const { data: materials } = await supabase
    .from("estimation_materials")
    .select("id, name")
    .eq("category", category)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(20);
  const priced: CategoryPriceResolution[] = [];
  for (const material of (materials ?? []) as { id: string; name: string }[]) {
    const { data: price } = await supabase
      .from("estimation_prices")
      .select("price, scan_confidence")
      .eq("price_type", "material")
      .eq("ref_id", material.id)
      .eq("market", marketCode)
      .eq("is_active", true)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (price) {
      priced.push({
        material,
        price: price as { price: number; scan_confidence?: string | null },
      });
    }
  }
  return priced;
}

async function fetchCategoryPriceForMarket(
  category: string,
  marketCode: string,
): Promise<CategoryPriceResolution | null> {
  const priced = await fetchPricedMaterialsInCategory(category, marketCode);
  return priced[0] ?? null;
}

/** "CEM II 42.5N 25kg sack" -> 25; "50kg bag" -> 50; else null. */
function parsePackKg(name: string): number | null {
  const match = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(name);
  if (!match) return null;
  const kg = Number(match[1].replace(",", "."));
  return Number.isFinite(kg) && kg > 0 ? kg : null;
}

/** True when the material name reads as a bulk volume sale (per m3, tonne, trip). */
function packIsBulkVolume(name: string): boolean {
  return /\b(m3|m\u00b3|cubic|tonne|ton\b|trip|tipper|lorry|bulk)\b/i.test(name);
}

export interface MarketCementResolution {
  materialName: string;
  bookPrice: number;
  packKg: number;
  /** price converted onto the engine's 50 kg bag basis */
  price50kgBasis: number;
  bookMarket: string;
}

/** Resolve the market's cement onto the 50 kg basis, or null. */
export async function resolveMarketCement(
  marketCode: string,
): Promise<MarketCementResolution | null> {
  if (!marketCode || marketCode === "NG") return null;
  const cement = await fetchCategoryPriceForMarket("cement", marketCode);
  if (!cement) return null;
  const packKg = parsePackKg(cement.material.name);
  if (!packKg) return null;
  return {
    materialName: cement.material.name,
    bookPrice: cement.price.price,
    packKg,
    price50kgBasis: (cement.price.price * NG_CEMENT_BAG_KG) / packKg,
    bookMarket: marketCode,
  };
}

/** Resolve the market's sand as a real bulk m3 price, or null. */
export async function resolveMarketSandM3(
  marketCode: string,
): Promise<number | null> {
  if (!marketCode || marketCode === "NG") return null;
  const sand = await fetchCategoryPriceForMarket("aggregate", marketCode);
  if (!sand || !packIsBulkVolume(sand.material.name)) return null;
  return sand.price.price;
}

// =========================================================
// MARKET REBAR RESOLUTION (reinforcement estimator)
//
// Rebar is priced per 12 m stock length in the engine. Market
// price books store per-length prices converted from verified
// per-tonne anchors (12 m x kg/m x price/kg). This resolver maps
// the market's "{mkt}-rebar-{d}mm" materials back onto the
// engine keys "rebar-{d}mm-per-length". Missing diameters stay
// unpriced and are reported - never the NG price silently.
// =========================================================

const REBAR_DIAMETERS = [12, 16, 20, 25] as const;

export interface RebarMarketResolution {
  /** engine key -> market per-12m-length price */
  overrides: Record<string, number>;
  provenance: StructuralPriceProvenance[];
  unresolved: string[];
}

export async function resolveMarketRebar(
  marketCode: string,
): Promise<RebarMarketResolution> {
  const result: RebarMarketResolution = {
    overrides: {},
    provenance: [],
    unresolved: [],
  };
  if (!marketCode || marketCode === "NG") return result;

  for (const d of REBAR_DIAMETERS) {
    const engineKey = `rebar-${d}mm-per-length`;
    const slug = `${marketCode.toLowerCase()}-rebar-${d}mm`;
    const { data: material } = await supabase
      .from("estimation_materials")
      .select("id, name")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!material) {
      result.unresolved.push(engineKey);
      continue;
    }
    const { data: price } = await supabase
      .from("estimation_prices")
      .select("price, scan_confidence")
      .eq("price_type", "material")
      .eq("ref_id", (material as { id: string }).id)
      .eq("market", marketCode)
      .eq("is_active", true)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!price) {
      result.unresolved.push(engineKey);
      continue;
    }
    const p = price as { price: number; scan_confidence?: string | null };
    result.overrides[engineKey] = p.price;
    result.provenance.push({
      engineKey,
      resolved: true,
      bookMarket: marketCode,
      materialName: (material as { name: string }).name,
      price: p.price,
      explanation:
        p.scan_confidence === "manual"
          ? `Priced per 12 m stock length from the ${marketCode} book (verified per-tonne anchor, kg/m conversion).`
          : `Indicative per-12 m price from the ${marketCode} book (band midpoint, admin-adjustable) - verify with a local supplier.`,
    });
  }
  return result;
}

// =========================================================
// MARKET PLUMBING PIPE RESOLUTION (plumbing estimator)
// Pipes price per METRE in the engine. Market books store the
// market's own dominant pipe material (US PEX, DE HT) with the
// substitution disclosed - never a silent NG PVC price.
// =========================================================

const PLUMBING_PIPE_KEYS = [
  "plumb-pipe-cold",
  "plumb-pipe-hot",
  "plumb-pipe-waste",
  "plumb-pipe-drainage",
] as const;

/**
 * Per-piece fitting prices the plumbing engine prices separately.
 * Book slugs: {mkt}-elbow / {mkt}-tee / {mkt}-reducer / {mkt}-union /
 * {mkt}-valve (category "pipe", unit per piece).
 */
const PLUMBING_FITTING_KEYS = [
  "plumb-elbow",
  "plumb-tee",
  "plumb-reducer",
  "plumb-union",
  "plumb-valve",
] as const;

export interface PlumbingMarketResolution {
  overrides: Record<string, number>;
  provenance: StructuralPriceProvenance[];
  unresolved: string[];
}

export async function resolveMarketPlumbing(
  marketCode: string,
): Promise<PlumbingMarketResolution> {
  const result: PlumbingMarketResolution = {
    overrides: {},
    provenance: [],
    unresolved: [],
  };
  if (!marketCode || marketCode === "NG") return result;

  await resolvePlumbingSlugGroup(
    marketCode,
    PLUMBING_PIPE_KEYS,
    "plumb-pipe-",
    "-pipe-",
    result,
  );
  await resolvePlumbingSlugGroup(
    marketCode,
    PLUMBING_FITTING_KEYS,
    "plumb-",
    "-",
    result,
  );
  return result;
}

/**
 * Walks one slug family (pipes: per-metre; fittings: per-piece), resolving
 * each engine key from the market book into `result`. Anything missing is
 * reported unresolved - the page prices it as NOT CONFIGURED, never NG.
 */
async function resolvePlumbingSlugGroup(
  marketCode: string,
  engineKeys: readonly string[],
  enginePrefix: string,
  slugInfix: string,
  result: PlumbingMarketResolution,
): Promise<void> {
  for (const engineKey of engineKeys) {
    const suffix = engineKey.replace(enginePrefix, "");
    const slug = `${marketCode.toLowerCase()}${slugInfix}${suffix}`;
    const { data: material } = await supabase
      .from("estimation_materials")
      .select("id, name")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!material) {
      result.unresolved.push(engineKey);
      continue;
    }
    const { data: price } = await supabase
      .from("estimation_prices")
      .select("price, scan_confidence")
      .eq("price_type", "material")
      .eq("ref_id", (material as { id: string }).id)
      .eq("market", marketCode)
      .eq("is_active", true)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!price) {
      result.unresolved.push(engineKey);
      continue;
    }
    const p = price as { price: number; scan_confidence?: string | null };
    result.overrides[engineKey] = p.price;
    result.provenance.push({
      engineKey,
      resolved: true,
      bookMarket: marketCode,
      materialName: (material as { name: string }).name,
      price: p.price,
      explanation:
        p.scan_confidence === "manual"
          ? `Per-${slugInfix === "-pipe-" ? "metre" : "piece"} price from the ${marketCode} book (verified supplier listing; material substitutes the NG default and is named honestly).`
          : `Indicative per-${slugInfix === "-pipe-" ? "metre" : "piece"} price from the ${marketCode} book (admin-adjustable) - verify with a local supplier.`,
    });
  }
}

// =========================================================
// FOUNDATION MARKET PRICING (foundation estimator)
//
// The foundation engine prices by its shared slugs (cement bag,
// m3 aggregates, block, formwork). This resolver overlays the
// market book onto those slugs; anything the book does not
// cover is reported unresolved and prices as NOT CONFIGURED -
// never a silent NG price.
// =========================================================

export interface StructuralMarketPricing {
  /** foundation engine slug -> market price on the engine's basis */
  overrides: Record<string, number>;
  provenance: StructuralPriceProvenance[];
  unresolved: string[];
}

function provenanceRow(
  engineKey: string,
  marketCode: string,
  resolution: CategoryPriceResolution,
  explanation: string,
): StructuralPriceProvenance {
  return {
    engineKey,
    resolved: true,
    bookMarket: marketCode,
    materialName: resolution.material.name,
    price: resolution.price.price,
    explanation,
  };
}

export async function resolveStructuralMarketPricing(
  marketCode: string,
): Promise<StructuralMarketPricing> {
  const result: StructuralMarketPricing = {
    overrides: {},
    provenance: [],
    unresolved: [],
  };
  if (!marketCode || marketCode === "NG") return result;

  // Cement: engine prices a 50 kg bag; market packs convert onto that basis.
  const cement = await fetchCategoryPriceForMarket("cement", marketCode);
  const cementPackKg = cement ? parsePackKg(cement.material.name) : null;
  if (cement && cementPackKg) {
    result.overrides["cement-per-bag"] =
      (cement.price.price * NG_CEMENT_BAG_KG) / cementPackKg;
    result.provenance.push(
      provenanceRow(
        "cement-per-bag",
        marketCode,
        cement,
        `${cement.material.name} at ${cement.price.price} per ${cementPackKg} kg pack, converted to the 50 kg bag basis.`,
      ),
    );
  } else {
    result.unresolved.push("cement-per-bag");
  }

  // Bulk aggregates: priced per real m3 volume only.
  const aggregateBooks = await Promise.all([
    fetchPricedMaterialsInCategory("aggregate", marketCode),
    fetchPricedMaterialsInCategory("granite", marketCode),
  ]);
  const aggregates = [...aggregateBooks[0], ...aggregateBooks[1]];
  const bulkMatches: Record<string, RegExp> = {
    "sand-per-m3": /\b(sand|bausand|gravel)\b/i,
    "granite-per-m3": /\b(granite|chippings|crushed stone)\b/i,
    "hardcore-per-m3": /\b(hardcore|subbase|sub-base|mot|type 1|crusher run)\b/i,
  };
  for (const [engineKey, pattern] of Object.entries(bulkMatches)) {
    const hit = aggregates.find(
      (a) => pattern.test(a.material.name) && packIsBulkVolume(a.material.name),
    );
    if (hit) {
      result.overrides[engineKey] = hit.price.price;
      result.provenance.push(
        provenanceRow(
          engineKey,
          marketCode,
          hit,
          `Bulk m3 price for ${hit.material.name}.`,
        ),
      );
    } else {
      result.unresolved.push(engineKey);
    }
  }

  // Blocks and formwork: any priced material in their categories.
  const blockBooks = await Promise.all([
    fetchCategoryPriceForMarket("block", marketCode),
    fetchCategoryPriceForMarket("blocks", marketCode),
  ]);
  const block = blockBooks[0] ?? blockBooks[1];
  if (block) {
    result.overrides["block-per-piece"] = block.price.price;
    result.provenance.push(
      provenanceRow(
        "block-per-piece",
        marketCode,
        block,
        `Per-piece price for ${block.material.name}.`,
      ),
    );
  } else {
    result.unresolved.push("block-per-piece");
  }

  const formworkBooks = await Promise.all([
    fetchCategoryPriceForMarket("formwork", marketCode),
    fetchCategoryPriceForMarket("plywood", marketCode),
  ]);
  const formwork = formworkBooks[0] ?? formworkBooks[1];
  if (formwork) {
    result.overrides["formwork-per-m2"] = formwork.price.price;
    result.provenance.push(
      provenanceRow(
        "formwork-per-m2",
        marketCode,
        formwork,
        `Per-m2 price for ${formwork.material.name}.`,
      ),
    );
  } else {
    result.unresolved.push("formwork-per-m2");
  }

  return result;
}
