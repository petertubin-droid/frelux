import type { DbAdProvider } from "@/types/database";
import {
  getMonetagZone,
  getMonetagSdkUrl,
  showMonetagRewardedAd,
} from "@/lib/monetag-rewarded";
import { showAdsenseRewardedAd } from "@/lib/adsense-rewarded";
import { supportsOfferwall } from "@/lib/offerwall";

/**
 * Browser SDK callbacks are not server proof. This stays false until a
 * provider-native verifier creates/correlates a server-issued ad session.
 * Adapters remain provider-neutral for integration, but no client callback
 * is treated as authorization to mint a reward.
 */
export const REWARDED_SERVER_VERIFICATION_CONFIGURED = false;
export interface RewardedAdBridgeResult {
  mode: string;
  valued: boolean | null;
  estimatedPrice: number | null;
}

export type RewardedAdBridge = (
  provider: DbAdProvider,
  opts: { ymid: string; toolKey: string },
) => Promise<RewardedAdBridgeResult>;

export const REWARDED_AD_BRIDGES: Record<string, RewardedAdBridge> = {
  // Monetag, website tag / SDK bridge (src/lib/monetag-rewarded.ts)
  monetag: async (provider, opts) => {
    const zone = getMonetagZone(provider);
    if (!zone)
      throw new Error("The ad zone is not configured. Please try again later.");
    const result = await showMonetagRewardedAd({
      zone,
      ymid: opts.ymid,
      requestVar: opts.toolKey,
      sdkUrl: getMonetagSdkUrl(provider),
      minWatchTimeMs: 5000,
    });
    if (result.valued !== true) {
      throw new Error(
        "The ad provider did not confirm a completed rewarded view. No reward was granted.",
      );
    }
    return result;
  },
  // Google AdSense, H5 Games Ads adBreak bridge (src/lib/adsense-rewarded.ts)
  google_adsense: async (provider, opts) => {
    const settings = (provider.settings ?? {}) as Record<string, unknown>;
    const creds = (provider.credentials ?? {}) as Record<string, unknown>;
    if (
      settings.rewarded_ads !== true ||
      settings.adsense_h5_approval_confirmed !== true
    ) {
      throw new Error(
        "AdSense H5 Games rewarded ads are pending Google approval and are not available yet.",
      );
    }
    const publisherId =
      typeof creds.publisher_id === "string" ? creds.publisher_id : "";
    const result = await showAdsenseRewardedAd({
      publisherId,
      requestVar: opts.toolKey,
    });
    if (!result.viewed) {
      throw new Error("The ad was not completed. No reward was granted.");
    }
    return {
      mode: "adsense_h5_rewarded",
      valued: true,
      estimatedPrice: null,
    };
  },
};

/**
 * All active providers that can actually serve a rewarded experience,
 * in priority order (lower `priority` first, matching fetchAdConfig's
 * ordering). A provider qualifies when it has a real client-side bridge
 * OR is an offerwall provider served via iframe + server postback.
 *
 * This is the multi-provider candidate chain: every consumer (credit
 * earning in Rewards, tool unlocks in rewarded-access) walks these in
 * order and falls through to the next candidate when one fails, so the
 * system never depends on a single provider (e.g. only Monetag).
 */
export function getRewardedAdCandidates(
  providers: DbAdProvider[],
): DbAdProvider[] {
  return providers
    .filter(
      (p) =>
        p.is_active && (!!REWARDED_AD_BRIDGES[p.slug] || supportsOfferwall(p)),
    )
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
}

/**
 * Providers with a real client-side bridge only (no offerwall), in
 * priority order. These are the ones a direct "Watch Ad" tap can
 * invoke from the user gesture.
 */
export function getBridgedAdCandidates(
  providers: DbAdProvider[],
): DbAdProvider[] {
  return providers
    .filter((p) => {
      if (!p.is_active || !REWARDED_AD_BRIDGES[p.slug]) return false;
      if (p.slug === "google_adsense") {
        const settings = (p.settings ?? {}) as Record<string, unknown>;
        return (
          settings.rewarded_ads === true &&
          settings.adsense_h5_approval_confirmed === true
        );
      }
      return true;
    })
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
}

/**
 * Ordered unlock chain for a specific tool: the configured primary and
 * fallback providers first (admin's explicit choice), then every other
 * active bridged provider by priority. Deduped by id.
 */
export function getUnlockProviderChain(
  providers: DbAdProvider[],
  primary: DbAdProvider | null,
  fallback: DbAdProvider | null,
): DbAdProvider[] {
  const chain: DbAdProvider[] = [];
  const seen = new Set<string>();
  for (const p of [primary, fallback, ...getBridgedAdCandidates(providers)]) {
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      chain.push(p);
    }
  }
  return chain;
}
