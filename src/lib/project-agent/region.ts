// =========================================================
// FRELUX PROJECT AGENT — REGIONAL RESOLUTION (Phase 6, Stage 11)
//
// Global & regional validation. Every market-facing string the
// agent produces (money, units, terminology) must honour the
// project's RECORDED market — never silently substitute
// Nigerian data for another region.
//
// Contract:
//   - No market recorded -> the platform default (Nigeria),
//     stated openly as a default, not as a fact about the
//     project.
//   - A supported market (profile exists) -> that market's
//     currency symbol / locale / unit system.
//   - An UNSUPPORTED market -> an explicit unavailable state.
//     Formatting falls back to a bare, unlabeled number with an
//     honest marker — never another region's symbol.
// =========================================================

import {
  createDefaultRegistry,
  type MarketProfile,
} from "@/lib/measurement/market-profile";

export type MarketResolution =
  | {
      /** The project's market is confirmed and profiled. */
      status: "supported";
      profile: MarketProfile;
      /** True when the resolution used the platform default. */
      isDefault: boolean;
    }
  | {
      /** The project's market is recorded but NOT supported —
       *  no profile exists. Explicitly unavailable. */
      status: "unsupported";
      marketCode: string;
    };

const REGISTRY = createDefaultRegistry();

/**
 * Resolve a project's market. `marketCode` comes from the
 * RECORDED snapshot (region.marketCode ?? countryCode).
 */
export function resolveMarket(
  marketCode: string | null | undefined,
): MarketResolution {
  const code = (marketCode ?? "").trim().toUpperCase();
  if (!code) {
    return {
      status: "supported",
      profile: REGISTRY.profiles.get(REGISTRY.defaultMarketCode)!,
      isDefault: true,
    };
  }
  const profile = REGISTRY.profiles.get(code);
  if (profile) {
    return { status: "supported", profile, isDefault: false };
  }
  return { status: "unsupported", marketCode: code };
}

/**
 * Format a money amount for the project's market.
 * Unsupported market -> bare number + honest marker; NEVER a
 * substituted symbol (e.g. never "₦" for a US project).
 */
export function formatMoney(
  amount: number,
  marketCode: string | null | undefined,
): string {
  const market = resolveMarket(marketCode);
  if (market.status === "unsupported") {
    return `${amount.toLocaleString()} (currency unavailable: market "${market.marketCode}" is not supported)`;
  }
  const n =
    Number.isFinite(amount) && Number.isInteger(amount)
      ? amount.toLocaleString(market.profile.locale)
      : amount.toLocaleString(market.profile.locale, {
          maximumFractionDigits: 2,
        });
  return `${market.profile.currencySymbol}${n}`;
}

/** Signed money — "+₦1,000" / "-₦800", never "₦-800". */
export function formatSignedMoney(
  delta: number,
  marketCode: string | null | undefined,
): string {
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${formatMoney(Math.abs(delta), marketCode)}`;
}

/**
 * A one-line market note for agent output — states plainly when
 * the default market was assumed, or when the market is
 * unsupported. Empty string when the market is confirmed.
 */
export function marketNote(
  marketCode: string | null | undefined,
): string {
  const market = resolveMarket(marketCode);
  if (market.status === "unsupported") {
    return `Market "${market.marketCode}" is not supported by FRELUX — regional pricing and conventions are unavailable for this project, and no other region's data has been substituted.`;
  }
  if (market.isDefault) {
    return `No market recorded for this project — FRELUX platform defaults (Nigeria: ₦, metric) are being used.`;
  }
  return "";
}
