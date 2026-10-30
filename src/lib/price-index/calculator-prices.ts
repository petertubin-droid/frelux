/**
 * City-aware price layer for the Nigerian index.
 *
 * The market resolver (`resolveMaterialPriceByRole`) answers "what does this
 * role cost in this market". This layer adds one honest refinement: when the
 * user has chosen a Nigerian city and that city has enough independent
 * observations for the resolved material, the city figure wins and the result
 * says so. Short of that, the market figure stands and is labelled as such.
 *
 * Rules:
 *  - Three independent observations minimum before a city figure is used.
 *  - A city figure only ever replaces the price of the SAME material. Roles are
 *    never re-mapped across cities, so a Lagos substitution cannot leak into a
 *    Kano estimate.
 *  - Nothing is extrapolated, and a failed read never changes a price.
 */
import {
  resolveMaterialPriceByRole,
  type MaterialRole,
  type ResolvedMaterialPrice,
} from "@/lib/estimation/market-materials";
import { fetchListings } from "@/lib/price-index/queries";
import { resolveMaterialPrice } from "@/lib/price-index/resolver";

export type PriceBasis = "city" | "market";

export interface CityAwarePrice extends ResolvedMaterialPrice {
  basis: PriceBasis;
  /** City whose observations produced the figure, when basis is "city". */
  city_slug: string | null;
  /** Independent observations behind a city figure. */
  city_samples: number | null;
  /** Present for city figures: what the number rests on, in words. */
  price_note: string | null;
  /** True when the figure is a city median from reported (unverified) prices. */
  indicative: boolean;
}

/**
 * Resolve a material role with optional city refinement.
 *
 * `citySlug` is explicit on purpose: a calculator with no visible city
 * selector must not quietly price work for a city the user cannot see.
 */
export async function resolveCityAwarePriceByRole(
  role: MaterialRole,
  market: string,
  citySlug?: string | null,
): Promise<CityAwarePrice | null> {
  const base = await resolveMaterialPriceByRole(role, market);
  if (!base) return null;

  const asMarket = (): CityAwarePrice => ({
    ...base,
    basis: "market",
    city_slug: null,
    city_samples: null,
    price_note: null,
    indicative: true,
  });

  if (market !== "NG" || !citySlug) return asMarket();

  try {
    const { listings } = await fetchListings({
      citySlug,
      materialIds: [base.material.id],
      limit: 100,
    });

    const resolved = resolveMaterialPrice({
      materialId: base.material.id,
      citySlug,
      listings,
    });

    if (resolved.status !== "ok" || resolved.basis !== "city") return asMarket();

    return {
      ...base,
      price: { ...base.price, price: resolved.price },
      basis: "city",
      city_slug: citySlug,
      city_samples: resolved.sample_size,
      price_note: [
        `${resolved.sample_size} independent price${resolved.sample_size === 1 ? "" : "s"} in ${citySlug.replace(/-/g, " ")}`,
        resolved.last_observed_at ? `last ${resolved.last_observed_at}` : null,
        resolved.indicative ? "reported, not independently verified" : "verified",
      ]
        .filter(Boolean)
        .join(", "),
      indicative: resolved.indicative,
    };
  } catch {
    // A read failure must not silently change a price. Keep the market figure.
    return asMarket();
  }
}

export function describePriceBasis(price: CityAwarePrice): string {
  if (price.basis === "city" && price.price_note) return price.price_note;
  return "Market reference price, not a city-specific figure.";
}
