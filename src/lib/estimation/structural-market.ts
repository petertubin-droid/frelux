import { supabase } from "@/lib/supabase";
import {
  classifyEvidence,
  type EvidenceClass,
  type EvidenceFields,
} from "@/lib/price-index/resolver";
import {
  shouldUseBundledBook,
  bundledCategoryMaterials,
} from "@/lib/international/bundled-book";
import { fetchInheritanceChain } from "@/lib/estimation/market-materials";

// =========================================================
// Single-material resolutions shared by other structural pages
// (build-to-roof prefill, etc.). Same honesty rules: pack must
// be explicit, volume must be a real volume, else null.
// =========================================================

/** A row read from estimation_prices, with the provenance columns it carries. */
export interface StructuralPriceRow extends EvidenceFields {
  price: number;
  scan_confidence?: string | null;
}

/**
 * What the engine must say about this row's evidence, or null when the row is
 * a verified supplier quotation and needs no caveat. A seeded baseline or an
 * FX band must never be presented as a verified anchor.
 */
export function evidenceCaveat(row: StructuralPriceRow): string | null {
  const evidence: EvidenceClass = classifyEvidence(row);
  if (evidence === "baseline") {
    return "Seeded baseline with no live source: a placeholder, not a market price.";
  }
  if (evidence === "macro_reference") {
    return "Reference band from a macro or FX adjustment, not a supplier quotation.";
  }
  if (evidence === "supplier_reported") {
    return "Reported price, not independently verified.";
  }
  return null;
}

/** Provenance row for one market-resolved structural price. */
export interface StructuralPriceProvenance {
  engineKey: string;
  resolved: boolean;
  bookMarket: string;
  materialName: string;
  price: number;
  explanation: string;
  /** How much the figure deserves to be trusted, judged from its own row. */
  evidence: EvidenceClass;
}

/** The Nigerian engine prices cement on a 50 kg bag basis. */
const NG_CEMENT_BAG_KG = 50;

/** A material + its active price in one market. */
interface CategoryPriceResolution {
  material: { id: string; name: string };
  price: StructuralPriceRow;
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
  // Offline path: resolve from the bundled static book (real
  // production prices with provenance) when the project is not
  // connected. Never a guess — a market with no bundled book row
  // resolves to null exactly as the DB path does.
  if (shouldUseBundledBook()) {
    const rows = await bundledCategoryMaterials(category, marketCode);
    return rows.map((r) => ({
      material: r.material,
      price: r.price,
    }));
  }
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
      .select(
        "price, scan_confidence, price_source, supplier_name, verification_status",
      )
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
        price: price as StructuralPriceRow,
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
  return /\b(m3|m\u00b3|cubic|tonne|ton\b|trip|tipper|lorry|bulk)\b/i.test(
    name,
  );
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
      .select(
        "price, scan_confidence, price_source, supplier_name, verification_status",
      )
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
    const p = price as StructuralPriceRow;
    result.overrides[engineKey] = p.price;
    result.provenance.push({
      engineKey,
      resolved: true,
      bookMarket: marketCode,
      materialName: (material as { name: string }).name,
      price: p.price,
      explanation: withCaveat(
        p.scan_confidence === "manual"
          ? `Priced per 12 m stock length from the ${marketCode} book (verified per-tonne anchor, kg/m conversion).`
          : `Indicative per-12 m price from the ${marketCode} book (band midpoint, adjustable) - verify with a local supplier.`,
        p,
      ),
      evidence: classifyEvidence(p),
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
    const found = await resolveSlugAcrossChain(
      (market) => `${market.toLowerCase()}${slugInfix}${suffix}`,
      marketCode,
    );
    if (!found) {
      result.unresolved.push(engineKey);
      continue;
    }
    const p = found.price;
    const basis = marketBasisLabel(found.sourcedMarket, marketCode);
    const per = slugInfix === "-pipe-" ? "metre" : "piece";
    result.overrides[engineKey] = p.price;
    result.provenance.push({
      engineKey,
      resolved: true,
      bookMarket: found.sourcedMarket,
      materialName: found.material.name,
      price: p.price,
      evidence: classifyEvidence(p),
      explanation:
        p.scan_confidence === "manual"
          ? `Per-${per} price from the ${basis} book (verified supplier listing; material substitutes the NG default and is named honestly).`
          : `Indicative per-${per} price from the ${basis} book (adjustable) - verify with a local supplier.`,
    });
  }
}

/**
 * Walk the market's inheritance chain for a slug-priced engine key.
 *
 * These resolvers used to read the requested market only, so a market whose
 * prices are inherited reported the item as unresolved while the painting and
 * screeding calculators priced the same market from its parent. That is two
 * answers to one question. The chain is the same one the role resolvers use:
 * the market itself, then each ancestor, then whatever the profile names.
 *
 * The sourced market is returned with the row, so the caller can say the price
 * came from a parent market rather than presenting it as local.
 */
async function resolveSlugAcrossChain(
  buildSlug: (market: string) => string,
  marketCode: string,
): Promise<{
  material: { id: string; name: string };
  price: StructuralPriceRow;
  sourcedMarket: string;
} | null> {
  const chain = await fetchInheritanceChain(marketCode);
  for (const candidate of chain) {
    const { data: material } = await supabase
      .from("estimation_materials")
      .select("id, name")
      .eq("slug", buildSlug(candidate))
      .eq("is_active", true)
      .maybeSingle();
    if (!material) continue;
    const materialRow = material as { id: string; name: string };
    const { data: price } = await supabase
      .from("estimation_prices")
      .select(
        "price, scan_confidence, price_source, supplier_name, verification_status",
      )
      .eq("price_type", "material")
      .eq("ref_id", materialRow.id)
      .eq("market", candidate)
      .eq("is_active", true)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!price) continue;
    return {
      material: materialRow,
      price: price as StructuralPriceRow,
      sourcedMarket: candidate,
    };
  }
  return null;
}

/** How a resolver should name the market a price came from. */
function marketBasisLabel(
  sourcedMarket: string,
  requestedMarket: string,
): string {
  return sourcedMarket === requestedMarket
    ? requestedMarket
    : `${sourcedMarket}, inherited by ${requestedMarket}`;
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

function withCaveat(explanation: string, row: StructuralPriceRow): string {
  const caveat = evidenceCaveat(row);
  return caveat ? `${explanation} ${caveat}` : explanation;
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
    explanation: withCaveat(explanation, resolution.price),
    evidence: classifyEvidence(resolution.price),
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
    "hardcore-per-m3":
      /\b(hardcore|subbase|sub-base|mot|type 1|crusher run)\b/i,
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

// =========================================================
// DOORS & WINDOWS MARKET RESOLUTION (Tier 2, Engine 7)
//
// Resolves market-specific unit prices for doors, frames,
// hinges, locksets, and windows from estimation_prices.
// Anything unpriced in the target market book is reported
// unresolved - never silently substituted from NG reference.
// =========================================================

export const DOORS_WINDOWS_ENGINE_KEYS = [
  "door-flush",
  "door-panel",
  "door-security",
  "door-frame",
  "door-hinge",
  "door-lockset",
  "window-aluminium",
  "window-louver",
] as const;

export type DoorsWindowsEngineKey = (typeof DOORS_WINDOWS_ENGINE_KEYS)[number];

export interface DoorsWindowsMarketResolution {
  overrides: Record<string, number>;
  provenance: StructuralPriceProvenance[];
  unresolved: string[];
}

export async function resolveMarketDoorsWindows(
  marketCode: string,
): Promise<DoorsWindowsMarketResolution> {
  const result: DoorsWindowsMarketResolution = {
    overrides: {},
    provenance: [],
    unresolved: [],
  };
  if (!marketCode || marketCode === "NG") return result;

  for (const engineKey of DOORS_WINDOWS_ENGINE_KEYS) {
    // 1. The market's own slug, then each ancestor's, so an inherited market
    // resolves the same price the rest of the platform shows instead of
    // reading as unpriced.
    const found = await resolveSlugAcrossChain(
      (market) => `${market.toLowerCase()}-${engineKey}`,
      marketCode,
    );

    // 2. A shared engine slug only applies inside the requested market: it is
    // the NG-basis row, and borrowing it for a market that names no ancestor
    // would be the silent fallback this resolver exists to avoid.
    let shared: { materialId: string; materialName: string } | null = null;
    if (!found) {
      const { data: sharedMaterial } = await supabase
        .from("estimation_materials")
        .select("id, name")
        .eq("slug", engineKey)
        .eq("is_active", true)
        .maybeSingle();
      if (sharedMaterial) {
        shared = {
          materialId: (sharedMaterial as { id: string }).id,
          materialName: (sharedMaterial as { name: string }).name,
        };
      }
    }

    if (!found && !shared) {
      result.unresolved.push(engineKey);
      continue;
    }

    let p: StructuralPriceRow;
    let materialName: string;
    let basis: string;
    if (found) {
      p = found.price;
      materialName = found.material.name;
      basis = marketBasisLabel(found.sourcedMarket, marketCode);
    } else {
      const { data: price } = await supabase
        .from("estimation_prices")
        .select("price, scan_confidence, price_source")
        .eq("price_type", "material")
        .eq("ref_id", shared!.materialId)
        .eq("market", marketCode)
        .eq("is_active", true)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!price) {
        result.unresolved.push(engineKey);
        continue;
      }
      p = price as StructuralPriceRow;
      materialName = shared!.materialName;
      basis = marketCode;
    }

    result.overrides[engineKey] = p.price;
    result.provenance.push({
      engineKey,
      resolved: true,
      bookMarket:
        basis === marketCode ? marketCode : basis.split(", inherited")[0],
      materialName,
      price: p.price,
      evidence: classifyEvidence(p),
      explanation:
        p.scan_confidence === "manual"
          ? `Unit price from the ${basis} book (${p.price_source || "verified supplier listing"}).`
          : `Indicative price from the ${basis} book (adjustable) - verify with a local supplier.`,
    });
  }

  return result;
}
