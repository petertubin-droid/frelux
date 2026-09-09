/**
 * FRELUX LOCATION INTELLIGENCE, Regional Resolution
 *
 * Location → regional context. This REUSES the existing FRELUX
 * international / market-profile architecture (market_profiles table
 * via the international queries layer) and the honest region-gating
 * semantics established in property-intelligence/location.ts:
 *
 * - A location only resolves when its country has an ACTIVE FRELUX
 *   regional profile.
 * - Unsupported countries resolve to status "unsupported" and the UI
 *   shows "Regional data unavailable", Nigerian/default/demo values
 *   are NEVER substituted for another region.
 * - Coordinates alone never imply a country.
 *
 * Regional context describes the region (currency, measurement
 * system, terminology). It does NOT create prices, labour rates,
 * quantities, or standards, those come only from the existing verified
 * market-data layers.
 */

import { getSupabase } from "@/lib/supabase-lazy";
import {
  FreluxLocation,
  normalizeCountryCode,
} from "./model";

// ============================================================
// Types
// ============================================================

export type RegionalDataStatus = "available" | "unavailable" | "needs_confirmation";

export interface RegionalContext {
  status: RegionalDataStatus;
  /** ISO country code that was matched, when determinable. */
  country_code: string | null;
  /** Human country name from the location record, when known. */
  country_name: string | null;
  /** Traceable reason for the resolution outcome, never a guess. */
  reason: string;

  // ---- Present only when status === "available": ----
  currency_code?: string;
  currency_symbol?: string;
  measurement_system?: string;
  default_length_unit?: string;
  default_area_unit?: string;
  local_terminology?: Record<string, string>;
  /** Profile version for traceability. */
  profile_version?: string;
}

export interface RegionalDataSourceRow {
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  default_measurement_system: string;
  default_length_unit: string;
  default_area_unit: string;
  local_terminology: Record<string, string> | null;
  profile_version: string;
  status: string;
}

/** Lookup function injected for tests; production reads market_profiles. */
export type RegionalProfileLookup = (code: string) => Promise<RegionalDataSourceRow | null>;

// ============================================================
// Production lookup, market_profiles via Supabase
// ============================================================

/**
 * Fetch a regional (market) profile by country code.
 * Only ACTIVE profiles count as available, "coming_soon" markets are
 * honestly reported as unavailable, matching isMarketSupported().
 */
export const fetchRegionalProfileFromDb: RegionalProfileLookup = async (code) => {
  try {
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("market_profiles")
      .select(
        "country_code, country_name, currency_code, currency_symbol, " +
          "default_measurement_system, default_length_unit, default_area_unit, " +
          "local_terminology, profile_version, status",
      )
      .eq("country_code", code)
      .maybeSingle();
    if (!data) return null;
    return data as unknown as RegionalDataSourceRow;
  } catch {
    return null;
  }
};

/** True when the row is an active, usable regional profile. */
function isUsableProfile(row: RegionalDataSourceRow | null): boolean {
  return !!row && row.status === "active";
}

// ============================================================
// Resolution
// ============================================================

/**
 * Resolve a canonical location into regional context.
 *
 * Trace: location.country_code (provider-verified or user-entered :
 * never inferred from coordinates) → market_profiles lookup →
 * regional context for Construction Intelligence, Property
 * Intelligence, estimators, and future marketplace/market layers.
 */
export async function resolveRegionalContext(
  location: FreluxLocation | null | undefined,
  lookup: RegionalProfileLookup = fetchRegionalProfileFromDb,
): Promise<RegionalContext> {
  if (!location) {
    return {
      status: "needs_confirmation",
      country_code: null,
      country_name: null,
      reason: "No location set. Regional context is available once a location is added.",
    };
  }

  const code = normalizeCountryCode(location.country_code);

  if (!code) {
    return {
      status: "needs_confirmation",
      country_code: null,
      country_name: location.country ?? null,
      reason: location.latitude !== null && location.longitude !== null
        ? "Coordinates were captured, but the country could not be verified. Reverse geocoding may be unavailable, enter or confirm the country to resolve regional data."
        : "The country for this location is unknown. Confirm the country to resolve regional data. FRELUX does not guess the region.",
    };
  }

  const profile = await lookup(code);

  if (!isUsableProfile(profile)) {
    return {
      status: "unavailable",
      country_code: code,
      country_name: location.country ?? profile?.country_name ?? null,
      reason: `Regional data unavailable for ${profile?.country_name ?? code}: FRELUX has no active regional profile for this country. Universal building analysis remains available; no other region's data was substituted.`,
    };
  }

  return {
    status: "available",
    country_code: code,
    country_name: profile!.country_name,
    currency_code: profile!.currency_code,
    currency_symbol: profile!.currency_symbol,
    measurement_system: profile!.default_measurement_system,
    default_length_unit: profile!.default_length_unit,
    default_area_unit: profile!.default_area_unit,
    local_terminology: profile!.local_terminology ?? {},
    profile_version: profile!.profile_version,
    reason: `Resolved to the active FRELUX regional profile for ${profile!.country_name} (v${profile!.profile_version}).`,
  };
}
