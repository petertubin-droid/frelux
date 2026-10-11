
// =========================================================
// Single-material resolutions shared by other structural pages
// (build-to-roof prefill, etc.). Same honesty rules: pack must
// be explicit, volume must be a real volume, else null.
// =========================================================

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
