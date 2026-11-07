/**
 * Market-aware price resolution for screeding system configs.
 *
 * The admin price book (verified market/city prices, Admin Scan provenance) is
 * the source of truth. A screeding config row may carry its own per-unit price
 * as a legacy seed value; that literal is only used when the book has nothing
 * for the market, never ahead of it.
 *
 * Roles: putty/joint filler -> "joint-filler", screeding paint ->
 * "interior-paint", white cement -> "concrete-mix".
 *
 * A role is a slot in the price book, not a promise about what sits in it. The
 * NG book fills "concrete-mix" with ordinary grey Portland cement, which is a
 * different product from the white cement a screeding mix calls for, so the
 * resolved material is checked against the line's own material before its
 * price is used. When it is the wrong product the configured price stands and
 * the line stays as the config describes it. A role with no verified price
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
      accepts?: (materialName: string, materialSlug: string) => boolean,
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
        const name = res?.material?.name ?? "";
        const slug = res?.material?.slug ?? "";
        // An empty name means the caller supplied a bare price (tests, or a
        // future source without material identity); nothing to contradict.
        const compatible =
          !name && !slug ? true : (accepts?.(name, slug) ?? true);
        bookPrice = compatible ? (res?.price?.price ?? null) : null;
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
    // Independent lookups: issuing them together turns three serial round
    // trips into one wait.
    const [putty, paint, cement] = await Promise.all([
      resolve("joint-filler", cfg.puttyPricePerUnit),
      // Screeding paint is a paint: any paint product in the book is the right
      // kind of thing, even when it is a general interior emulsion.
      resolve("interior-paint", cfg.paintPricePerUnit, (name) =>
        /paint|emulsion|screed|matt|gloss/i.test(name),
      ),
      // White cement is NOT grey Portland cement, however the role is mapped.
      resolve(
        "concrete-mix",
        cfg.cementPricePerUnit,
        (name, slug) => /white/i.test(name) || /white/i.test(slug),
      ),
    ]);
    return {
      ...cfg,
      puttyPricePerUnit: putty,
      paintPricePerUnit: paint,
      cementPricePerUnit: cement,
    };
  }
  return {
    ...cfg,
    puttyPricePerUnit: null,
    paintPricePerUnit: null,
    cementPricePerUnit: null,
  };
}
