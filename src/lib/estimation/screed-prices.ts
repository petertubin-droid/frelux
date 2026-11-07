/**
 * Market-aware price resolution for screeding system configs.
 *
 * The admin price book (verified market/city prices, Admin Scan provenance) is
 * the source of truth. A screeding config row may carry its own per-unit price
 * as a legacy seed value; that literal is only used when the book has nothing
 * for the market, never ahead of it.
 *
 * Roles: putty/joint filler -> "joint-filler", screeding paint ->
 * "interior-paint", cement -> "concrete-mix". A role with no verified price
 * resolves to the config fallback, or null, and the estimate flags the line as
 * unpriced rather than guessing.
 *
 * When a foreign market falls back to the NG reference config, the NG
 * quantities describe the NG technique, so its NGN prices would be meaningless
 * in the visitor's currency: the prices are cleared and the estimate honestly
 * reports "price not configured" for that market.
 */
import { resolveCityAwarePriceByRole } from "@/lib/price-index/calculator-prices";
import type { MaterialRole } from "@/lib/estimation/market-materials";
import type { ScreedingSystemConfig } from "@/types";

export async function resolveScreedPrices<T extends ScreedingSystemConfig>(
  cfg: T,
  rowMarket: string | undefined,
  userMarket: string,
  citySlug?: string | null,
): Promise<T> {
  if (!rowMarket || rowMarket === userMarket) {
    const resolve = async (
      role: MaterialRole,
      fallback: number | null,
    ): Promise<number | null> => {
      // City figure where the evidence supports one, otherwise the market
      // price. The resolver never substitutes across cities or currencies.
      let bookPrice: number | null = null;
      try {
        const res = await resolveCityAwarePriceByRole(
          role,
          userMarket,
          citySlug,
        );
        bookPrice = res?.price?.price ?? null;
      } catch {
        // A price-book read failure must never break the estimate: fall back
        // to the configured value below.
        bookPrice = null;
      }
      if (bookPrice != null && bookPrice > 0) return bookPrice;
      // Admin has no figure for this role: keep the row's own value rather
      // than reporting a configured material as unpriced.
      return fallback != null && fallback > 0 ? fallback : null;
    };
    return {
      ...cfg,
      puttyPricePerUnit: await resolve("joint-filler", cfg.puttyPricePerUnit),
      paintPricePerUnit: await resolve("interior-paint", cfg.paintPricePerUnit),
      cementPricePerUnit: await resolve("concrete-mix", cfg.cementPricePerUnit),
    };
  }
  return {
    ...cfg,
    puttyPricePerUnit: null,
    paintPricePerUnit: null,
    cementPricePerUnit: null,
  };
}
