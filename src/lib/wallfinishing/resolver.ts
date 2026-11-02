// =========================================================
// FRELUX Wall Finishing - worldwide template resolver.
//
// FRELUX is not limited to any country: EVERY market in the
// country selector gets a wall-finishing starting template.
// 2026-10-16: every website market (all 32) now carries a native
// template; unlisted future markets map to the closest verified
// template through market_profiles.inherits_from, and the UI
// always reports which template is in use. Adding a native
// profile later is a data-only change.
// =========================================================

import type {
  WallFinCountryProfile,
  WallFinMarketCode,
} from "@/types/wallfinishing";
import { WALLFIN_COUNTRY_MAP, WALLFIN_FALLBACK_COUNTRY } from "./countries";

/**
 * Market → template-country mapping for markets without a native
 * wall-finishing profile. Follows the same ancestry logic as the
 * market price books (market_profiles.inherits_from).
 */
export const WALLFIN_TEMPLATE_BY_MARKET: Record<string, WallFinMarketCode> = {
  // 2026-10-16 globalization wave: all 32 website markets now have
  // NATIVE wall-finishing profiles, so no market needs a mapped
  // fallback template anymore. The mechanism stays: any future
  // market added without a native profile inherits the NG reference
  // through this map (or WALLFIN_FALLBACK_COUNTRY), always with a
  // notice - never a silent substitution.
};

export interface ResolvedWallFinCountry {
  profile: WallFinCountryProfile;
  /** the market the user selected */
  marketCode: string;
  /** true when the market has a native template */
  native: boolean;
  /** human-readable notice when a fallback template is applied */
  inheritedNotice: string | null;
}

/**
 * Resolve any market code to a wall-finishing country profile.
 * Native profiles win; mapped fallbacks are reported, never silent.
 */
export function resolveWallFinCountry(
  marketCode: string,
): ResolvedWallFinCountry {
  const native = WALLFIN_COUNTRY_MAP[marketCode];
  if (native) {
    return { profile: native, marketCode, native: true, inheritedNotice: null };
  }
  const templateCode =
    WALLFIN_TEMPLATE_BY_MARKET[marketCode] ?? WALLFIN_FALLBACK_COUNTRY;
  const profile =
    WALLFIN_COUNTRY_MAP[templateCode] ??
    WALLFIN_COUNTRY_MAP[WALLFIN_FALLBACK_COUNTRY];
  return {
    profile,
    marketCode,
    native: false,
    inheritedNotice:
      `Wall-finishing templates for ${marketCode} are not yet native: ` +
      `starting from the ${profile.name} (${profile.code}) template. ` +
      `Every layer, material, coverage and price stays fully editable.`,
  };
}
