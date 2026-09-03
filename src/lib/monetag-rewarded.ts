/**
 * Monetag integration bridge.
 *
 * Monetag serves FRELUX via a website multi-tag zone (tag.min.js) plus an
 * optional SDK script for zones created through the Monetag dashboard
 * ("SDK" / rewarded zones). Both are client-side only — zone IDs and SDK
 * URLs are public values exposed to every visitor, not secrets.
 *
 * Two display modes, resolved at runtime:
 *
 * 1. SDK mode — if the SDK script is configured (provider credential
 *    `sdk_url`, or the script was already loaded), it exposes a global
 *    `show_<zone>()` function returning a Promise that resolves when the
 *    rewarded ad is watched and closed. This is the preferred path: it
 *    gives a true completion callback.
 *
 * 2. Tag mode — the standard website tag (tag.min.js). The zone serves
 *    whatever formats it is configured for (interstitial, popunder,
 *    in-page push). There is no completion callback; the caller gates the
 *    reward with its own watch timer. The tag must be triggered from a
 *    direct user gesture (the "Watch Ad" tap) because mobile browsers
 *    block window-opening ad formats outside a tap.
 */

import type { DbAdProvider } from "@/types/database";

/**
 * Default Monetag website zone for FRELUX.
 * Public client-side value — zone IDs are not secrets (they are exposed
 * in the page HTML to every visitor). Overridden by the provider's
 * `zone_id` credential when set in Admin → Ads.
 */
export const MONETAG_DEFAULT_ZONE_ID = "275352";

/**
 * Monetag multi-tag CDN. `data-domain` pins the tag's config/module
 * requests to this domain so the site CSP can reliably allow it
 * (mirrors the tag already embedded in index.html).
 */
const MONETAG_TAG_URL = "https://quge5.com/88/tag.min.js";
const MONETAG_TAG_DOMAIN = "quge5.com";

export interface MonetagShowResult {
  /** How the ad was served. */
  mode: "sdk" | "tag";
  /** SDK mode: whether Monetag reported a monetized ("valued") event. */
  valued: boolean | null;
  /** SDK mode: Monetag's estimated revenue for the impression, if reported. */
  estimatedPrice: number | null;
}

/** Resolve the Monetag zone ID: provider credential → provider setting → default. */
export function getMonetagZone(provider?: DbAdProvider | null): string | null {
  const creds = (provider?.credentials ?? {}) as Record<string, unknown>;
  const settings = (provider?.settings ?? {}) as Record<string, unknown>;
  const raw =
    creds.zone_id ??
    settings.zone_id ??
    settings.sub_id ??
    MONETAG_DEFAULT_ZONE_ID;
  const zone =
    typeof raw === "string" || typeof raw === "number"
      ? String(raw).trim()
      : "";
  return zone || null;
}

/** Resolve the optional Monetag SDK script URL (from the provider dashboard). */
export function getMonetagSdkUrl(
  provider?: DbAdProvider | null,
): string | null {
  const creds = (provider?.credentials ?? {}) as Record<string, unknown>;
  const raw = creds.sdk_url;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const url = raw.trim();
  return url.startsWith("https://") ? url : null;
}

function injectScript(
  src: string,
  attrs: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-monetag-src="${src}"]`,
    );
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.async = true;
    s.setAttribute("data-monetag-src", src);
    s.setAttribute("data-cfasync", "false");
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Monetag script failed to load"));
    document.head.appendChild(s);
  });
}

/** Load the Monetag website multi-tag for a zone (deduped). */
export function loadMonetagTag(zone: string): Promise<void> {
  return injectScript(MONETAG_TAG_URL, {
    "data-zone": zone,
    "data-domain": MONETAG_TAG_DOMAIN,
  });
}

/** Load the Monetag SDK script for a zone (deduped). Creates `show_<zone>()`. */
export function loadMonetagSdk(sdkUrl: string, zone: string): Promise<void> {
  return injectScript(sdkUrl, {
    "data-zone": zone,
    "data-sdk": `show_${zone}`,
  });
}

type MonetagShowFn = (
  opts?: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

function getSdkShowFn(zone: string): MonetagShowFn | null {
  const fn = (window as unknown as Record<string, unknown>)[`show_${zone}`];
  return typeof fn === "function" ? (fn as MonetagShowFn) : null;
}

/**
 * Show a Monetag rewarded ad.
 *
 * Must be called from a direct user gesture (e.g. the "Watch Ad" button's
 * click handler) — mobile browsers block window-opening ad formats outside
 * a tap, which is why this is invoked inside `watchAd()`.
 *
 * - If the SDK is available (loaded or loadable), shows the rewarded ad and
 *   resolves when the user finishes watching it.
 * - Otherwise loads the website tag (the zone serves its configured
 *   formats) and resolves once the tag has loaded. The caller's watch
 *   timer gates the reward in this mode.
 */
export async function showMonetagRewardedAd(opts: {
  zone: string;
  /** User/session identifier passed through to Monetag postbacks. */
  ymid?: string;
  /** Placement label for Monetag reporting. */
  requestVar?: string;
  sdkUrl?: string | null;
  /** Max seconds to wait for the SDK script to load before falling back to tag mode. */
  sdkTimeoutMs?: number;
  /** Minimum watch time in milliseconds before resolving in tag mode.
   * Ensures the user actually waits for the ad period before the reward is granted. */
  minWatchTimeMs?: number;
}): Promise<MonetagShowResult> {
  const { zone, ymid, requestVar, sdkUrl } = opts;
  const sdkTimeoutMs = opts.sdkTimeoutMs ?? 4000;
  const minWatchTimeMs = opts.minWatchTimeMs ?? 5000;

  // SDK mode: function already present (script loaded previously) or loadable
  const existingFn = getSdkShowFn(zone);
  if (existingFn) {
    const result = await existingFn({ type: "end", ymid, requestVar });
    return {
      mode: "sdk",
      valued: result?.reward_event_type === "valued",
      estimatedPrice:
        typeof result?.estimated_price === "number"
          ? (result.estimated_price as number)
          : null,
    };
  }

  if (sdkUrl) {
    try {
      await Promise.race([
        loadMonetagSdk(sdkUrl, zone),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SDK load timeout")), sdkTimeoutMs),
        ),
      ]);
      const fn = getSdkShowFn(zone);
      if (fn) {
        const result = await fn({ type: "end", ymid, requestVar });
        return {
          mode: "sdk",
          valued: result?.reward_event_type === "valued",
          estimatedPrice:
            typeof result?.estimated_price === "number"
              ? (result.estimated_price as number)
              : null,
        };
      }
    } catch {
      // SDK unavailable — fall through to the website tag below.
    }
  }

  // Tag mode: the zone serves its configured formats (interstitial,
  // popunder, in-page push). No completion callback exists for these.
  //
  // We do two things here:
  // 1. Ensure the tag is loaded (it may already be from Layout.tsx).
  // 2. Wait for minWatchTimeMs before resolving. This is critical —
  //    without the wait, the caller grants the reward instantly and
  //    the user never sees an ad. The wait gives the tag time to
  //    trigger its ad format (interstitial, in-page push) from this
  //    user gesture, and ensures the user actually spends the
  //    configured watch time before getting their reward.
  await loadMonetagTag(zone);

  // Try to trigger a Monetag interstitial/on-demand ad if the tag
  // exposes any callable functions. Monetag's tag.min.js may create
  // global functions depending on the zone's configured formats.
  // We check for common patterns without breaking if they don't exist.
  try {
    const w = window as unknown as Record<string, unknown>;
    // Monetag may expose show functions for interstitial/rewarded formats
    const possibleFns = [
      `show_${zone}`,
      `interstitial_${zone}`,
      `zfgformhttp_${zone}`,
    ];
    for (const fnName of possibleFns) {
      const fn = w[fnName];
      if (typeof fn === "function") {
        // Call the function — it may show an interstitial overlay
        const result = await (fn as (opts?: Record<string, unknown>) => Promise<Record<string, unknown>>)({
          type: "end",
          ymid,
          requestVar,
        });
        // If the function returned a result with reward info, use it
        if (result && typeof result === "object") {
          return {
            mode: "sdk",
            valued: result?.reward_event_type === "valued",
            estimatedPrice:
              typeof result?.estimated_price === "number"
                ? (result.estimated_price as number)
                : null,
          };
        }
        break;
      }
    }
  } catch {
    // No callable function available — continue with timer-based wait
  }

  // Wait for the minimum watch time before resolving.
  // This ensures the user actually watches for the configured period.
  await new Promise<void>((resolve) => setTimeout(resolve, minWatchTimeMs));

  return { mode: "tag", valued: null, estimatedPrice: null };
}
