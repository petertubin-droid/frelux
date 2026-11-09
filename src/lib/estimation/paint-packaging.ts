/**
 * FRELUX paint packaging by market
 *
 * The paint engines buy paint in whole containers. Until now every market
 * bought a 20 litre bucket, because `pack_size_bucket_litres` is a single
 * global rule and the engine's last-resort fallback is 20. That is a real
 * product in Nigeria and most metric markets, and it is not a product anyone
 * sells in the United States, where wall paint comes in quarts, gallons and
 * five gallon drums.
 *
 * Packaging is a fact about what is on the shelf, not a price, so it is
 * declared here rather than fetched: the price book still supplies the money,
 * and a product row with its own `standard_pack_size` always wins over this
 * ladder.
 *
 * Only markets whose shelf packaging has been checked are listed. The United
 * Kingdom uses imperial measures for many things but sells decorative paint in
 * litres, so it stays on the metric ladder, and any market added later needs
 * the same check rather than an assumption from its measurement system.
 */

export const LITRES_PER_US_GALLON = 3.785411784;
export const US_QUART_LITRES = LITRES_PER_US_GALLON / 4; // 0.946352946
export const US_FIVE_GALLON_LITRES = LITRES_PER_US_GALLON * 5; // 18.92705892

export interface PaintPack {
  /** Container volume in litres, the engine's unit. */
  litres: number;
  /** What the container is called on the shelf. */
  label: string;
  /** Short noun for prose ("bucket", "can", "drum"). */
  noun: string;
}

/** One litre to twenty litre containers, the metric shelf. */
export const METRIC_PAINT_PACKS: PaintPack[] = [
  { litres: 1, label: "1 L", noun: "can" },
  { litres: 4, label: "4 L", noun: "can" },
  { litres: 20, label: "20 L", noun: "bucket" },
];

/** Quarts, gallons and five gallon drums, the US shelf. */
export const US_PAINT_PACKS: PaintPack[] = [
  { litres: US_QUART_LITRES, label: "1 qt", noun: "can" },
  { litres: LITRES_PER_US_GALLON, label: "1 gal", noun: "can" },
  { litres: US_FIVE_GALLON_LITRES, label: "5 gal", noun: "drum" },
];

/** Markets whose decorative paint is sold by the US gallon. */
const US_GALLON_MARKETS = new Set(["US", "PR"]);

export function marketSellsPaintByGallon(marketCode?: string | null): boolean {
  return (
    Boolean(marketCode) &&
    US_GALLON_MARKETS.has(String(marketCode).toUpperCase())
  );
}

/** The container ladder for a market, largest last. Display and matching only. */
export function resolvePaintPacks(marketCode?: string | null): PaintPack[] {
  return marketSellsPaintByGallon(marketCode)
    ? US_PAINT_PACKS
    : METRIC_PAINT_PACKS;
}

/**
 * The market's standard purchase container, in litres. This is what the
 * engine buys in when neither the product nor a rule names a pack size.
 *
 * It is the container the shelf actually sells, which is not the largest one.
 * A Nigerian decorator buys a 20 litre bucket, and a US one buys a gallon can:
 * the five gallon pail exists, but it is contractor and ceiling stock. Since
 * the price row is quoted per container, assuming the pail while the row says
 * "per gallon" charged one can's price for five cans of paint, which
 * understated every US estimate that fell through to this default.
 */
export function resolvePaintPackLitres(marketCode?: string | null): number {
  if (marketSellsPaintByGallon(marketCode)) return LITRES_PER_US_GALLON;
  return 20;
}

/**
 * Name a container volume the way the market names it. A stored price book
 * may name a 3.785 litre pack and a US visitor should read "1 gal". Anything
 * that is not within two percent of a known container falls back to litres,
 * so an unusual pack is described honestly rather than mislabelled.
 */
export function paintPackLabel(
  litres: number,
  marketCode?: string | null,
): string {
  if (!Number.isFinite(litres) || litres <= 0) return "";
  const packs = resolvePaintPacks(marketCode);
  for (const pack of packs) {
    if (Math.abs(pack.litres - litres) / pack.litres <= 0.02) return pack.label;
  }
  const rounded = Math.round(litres * 100) / 100;
  return `${rounded} L`;
}

/** Short noun for a container volume ("bucket", "can", "drum"). */
export function paintPackNoun(
  litres: number,
  marketCode?: string | null,
): string {
  const packs = resolvePaintPacks(marketCode);
  for (const pack of packs) {
    if (Math.abs(pack.litres - litres) / pack.litres <= 0.02) return pack.noun;
  }
  return "container";
}
