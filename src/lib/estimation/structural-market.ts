
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
