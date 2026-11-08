/**
 * Do the market registries agree with each other?
 *
 * Six separate tables describe each market: masonry units, cement bag weight,
 * timber sections, electrical practice, plumbing practice and the market
 * bundle itself. Each resolver has its own fallback, and the fallbacks are the
 * dangerous part: a market with no row quietly receives another market's
 * specification and the calculator shows a confident, wrong answer. That is
 * how Canadian walls came to be priced in Nigerian 9 inch blocks.
 *
 * This module reads the registries and reports what each market actually
 * resolves to, plus every place a fallback fired. It writes nothing and
 * touches no database, so it is safe to render in the admin at any time.
 */

import { MARKET_BUNDLES } from "@/lib/international/markets";
import { ELECTRICAL_PROFILES } from "@/lib/estimation/electrical-profiles";
import { PLUMBING_PROFILES } from "@/lib/estimation/plumbing-profiles";
import {
  CEMENT_BAG_KG,
  cementBagKg,
  masonryUnitsForMarket,
} from "@/config/masonry-units";
import { timberSectionsForMarket } from "@/config/timber-sections";

export interface MarketConsistencyRow {
  market: string;
  name: string;
  /** Masonry unit resolved for this market, null when none exists. */
  masonryUnit: string | null;
  /** True when the unit is another market's, substituted for a missing row. */
  masonrySubstitutedFrom: string | null;
  bagKg: number;
  /** True when the bag weight is the 50 kg default rather than a market row. */
  bagIsDefault: boolean;
  /** Deepest stocked timber section, null when the market has no table. */
  timberSection: string | null;
  timberCount: number;
  voltage: string;
  frequencyHz: number;
  supplyMaterial: string;
  hasElectricalProfile: boolean;
  hasPlumbingProfile: boolean;
  gaps: string[];
}

/** Codes the market registry knows about, sorted for a stable display order. */
export function consistencyMarketCodes(): string[] {
  return Object.keys(MARKET_BUNDLES).sort();
}

function rowFor(market: string): MarketConsistencyRow {
  const code = market.toUpperCase();
  const bundle = MARKET_BUNDLES[code] as { name?: string } | undefined;
  const gaps: string[] = [];

  const masonry = masonryUnitsForMarket(code)[0];
  const masonrySubstitutedFrom = masonry?.substitutedFromMarket ?? null;
  if (!masonry) gaps.push("No masonry unit resolves for this market.");
  if (masonrySubstitutedFrom) {
    gaps.push(
      `Masonry falls back to ${masonrySubstitutedFrom}'s unit, so quantities are not local practice.`,
    );
  }

  const hasBagRow = Object.keys(CEMENT_BAG_KG).some(
    (key) => key.toUpperCase() === code,
  );
  const bagKg = cementBagKg(code);
  if (!hasBagRow) {
    gaps.push(
      `Cement bag weight defaults to ${bagKg} kg; the market has no bag row.`,
    );
  }

  const timber = timberSectionsForMarket(code);
  if (timber.length === 0) {
    gaps.push("No timber section table, so framed roofs cannot size a member.");
  }

  const hasElectricalProfile = Boolean(ELECTRICAL_PROFILES[code]);
  if (!hasElectricalProfile) {
    gaps.push("Electrical practice falls back to the generic IEC profile.");
  }
  const hasPlumbingProfile = Boolean(PLUMBING_PROFILES[code]);
  if (!hasPlumbingProfile) {
    gaps.push("Plumbing practice falls back to the generic ISO profile.");
  }
  if (!bundle) gaps.push("No market bundle: the market is not registered.");

  const electrical = ELECTRICAL_PROFILES[code] as
    { nominalVoltage?: string; frequencyHz?: number } | undefined;
  const plumbing = PLUMBING_PROFILES[code] as
    { waterSupplyMaterial?: string } | undefined;

  return {
    market: code,
    name: bundle?.name ?? code,
    masonryUnit: masonry?.label ?? null,
    masonrySubstitutedFrom,
    bagKg,
    bagIsDefault: !hasBagRow,
    timberSection: timber[0]?.key ?? null,
    timberCount: timber.length,
    voltage: electrical?.nominalVoltage ?? "generic IEC",
    frequencyHz: electrical?.frequencyHz ?? 50,
    supplyMaterial: plumbing?.waterSupplyMaterial ?? "generic ISO",
    hasElectricalProfile,
    hasPlumbingProfile,
    gaps,
  };
}

export function marketConsistencyRows(
  markets: string[] = consistencyMarketCodes(),
): MarketConsistencyRow[] {
  return markets.map(rowFor);
}

export interface ConsistencySummary {
  total: number;
  complete: number;
  withGaps: number;
  /** Total number of distinct fallbacks currently firing across all markets. */
  fallbacks: number;
}

export function consistencySummary(
  rows: MarketConsistencyRow[],
): ConsistencySummary {
  const withGaps = rows.filter((row) => row.gaps.length > 0).length;
  return {
    total: rows.length,
    complete: rows.length - withGaps,
    withGaps,
    fallbacks: rows.reduce((sum, row) => sum + row.gaps.length, 0),
  };
}
