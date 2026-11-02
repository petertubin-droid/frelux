/**
 * MarketBundle - the one-file view of a FRELUX market.
 *
 * Each src/lib/international/markets/<code>.ts exports a single MarketBundle
 * holding that country's engineering profiles. The engine registries are
 * COMPOSED from these bundles, so adding a market means authoring one
 * bundle file - the CI completeness gate (market-registry-completeness)
 * fails the build until every slot carries real, standard-referenced data.
 *
 * Market identity (currency, units, terminology) stays in
 * BUILTIN_MARKET_PROFILES (market-context); prices stay in the database.
 * This bundle carries only static building-practice data.
 */
import type {
  ElectricalMarketProfile,
  PlumbingMarketProfile,
} from "@/lib/estimation/engine-profile-types";
import type { MarketMasonryConfig } from "@/lib/estimation/masonry-standalone-engine";
import type { DrywallMarketProfile } from "@/lib/estimation/drywall-standalone-engine";
import type { WallFinCountryProfile } from "@/types/wallfinishing";

export interface MarketBundle {
  /** ISO 3166-1 alpha-2 market code - must equal the bundle's record key. */
  code: string;
  electrical: ElectricalMarketProfile;
  plumbing: PlumbingMarketProfile;
  masonry: MarketMasonryConfig;
  drywall: DrywallMarketProfile;
  /** Plastering cement bag weight in kg for this market. */
  cementBagWeightKg: number;
  wallFinishing: WallFinCountryProfile;
}
