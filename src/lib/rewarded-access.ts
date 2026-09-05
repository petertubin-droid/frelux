import { useState, useEffect, useCallback, useRef } from "react";
import { fetchRewardedToolConfig, checkRewardedUnlock } from "@/lib/queries";
import { supabase, getFunctionErrorMessage } from "@/lib/supabase";
import { logAdEvent } from "@/lib/ad-config";
import type {
  DbRewardedToolConfig,
  DbAdProvider,
  DbRewardedFeatureConfig,
} from "@/types/database";
import { generateOfferwallUrl, supportsOfferwall } from "@/lib/offerwall";
import {
  getMonetagZone,
  getMonetagSdkUrl,
  showMonetagRewardedAd,
} from "@/lib/monetag-rewarded";
import { showAdsenseRewardedAd } from "@/lib/adsense-rewarded";

/**
 * Rewarded ad bridges — one entry per provider with a working client-side
 * rewarded implementation. A bridge shows the real ad and reports how it
 * completed; the unlock is then granted server-side with a client
 * attestation token (att_<slug>_<mode>_<timestamp>) that the edge
 * function validates against the active providers in the database.
 *
 * To support a new provider (of the 35 in ad_providers, or a future one):
 * 1. Implement its rewarded flow (see src/lib/monetag-rewarded.ts).
 * 2. Register it here. No edge-function or database change is needed.
 * Providers without a bridge honestly fail — the unlock is never
 * granted without a real ad being shown.
 */
export interface RewardedAdBridgeResult {
  mode: string;
  valued: boolean | null;
  estimatedPrice: number | null;
}

type RewardedAdBridge = (
  provider: DbAdProvider,
  opts: { ymid: string; toolKey: string },
) => Promise<RewardedAdBridgeResult>;

export const REWARDED_AD_BRIDGES: Record<string, RewardedAdBridge> = {
  // Monetag — website tag / SDK bridge (src/lib/monetag-rewarded.ts)
  monetag: async (provider, opts) => {
    const zone = getMonetagZone(provider);
    if (!zone)
      throw new Error("The ad zone is not configured. Please try again later.");
    return showMonetagRewardedAd({
      zone,
      ymid: opts.ymid,
      requestVar: opts.toolKey,
      sdkUrl: getMonetagSdkUrl(provider),
      minWatchTimeMs: 5000,
    });
  },
  // Google AdSense — H5 Games Ads adBreak bridge (src/lib/adsense-rewarded.ts)
  google_adsense: async (provider, opts) => {
    const settings = (provider.settings ?? {}) as Record<string, unknown>;
    const creds = (provider.credentials ?? {}) as Record<string, unknown>;
    if (settings.rewarded_ads !== true) {
      throw new Error(
        "AdSense rewarded ads are disabled. Enable Rewarded Ads in Admin → Ads → Google AdSense.",
      );
    }
    const publisherId =
      typeof creds.publisher_id === "string" ? creds.publisher_id : "";
    return showAdsenseRewardedAd({
      publisherId,
      requestVar: opts.toolKey,
    }).then((res) => ({
      mode: "adsense_h5_rewarded",
      valued: res.viewed,
      estimatedPrice: null,
    }));
  },
};

export interface RewardedAccessState {
  toolKey: string;
  config: DbRewardedToolConfig | null;
  featureConfig: DbRewardedFeatureConfig | null;
  primaryProvider: DbAdProvider | null;
  fallbackProvider: DbAdProvider | null;
  isUnlocked: boolean;
  expiresAt: string | null;
  loading: boolean;
  error: string | null;
  showAdModal: boolean;
  adLoading: boolean;
  adProviderUsed: string | null;
  offerwallUrl: string | null;
  offerwallProviderName: string | null;
  clientHash: string;
  dailyUnlockCount: number;
  isCooldownActive: boolean;
}

export interface RewardedAccessActions {
  requestUnlock: () => void;
  cancelUnlock: () => void;
  watchAd: () => Promise<void>;
  closeOfferwall: () => void;
  refresh: () => Promise<void>;
}

export type RewardedAccess = RewardedAccessState & RewardedAccessActions;

const STORAGE_PREFIX = "frelux_rewarded_";
const COOLDOWN_PREFIX = "frelux_cooldown_";
const DAILY_COUNT_PREFIX = "frelux_daily_";

export function getClientHash(): string {
  const key = "frelux_client_hash";
  let hash = localStorage.getItem(key);
  if (!hash) {
    hash =
      "ch_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, hash);
  }
  return hash;
}

function getLocalExpiry(toolKey: string): string | null {
  const stored = localStorage.getItem(STORAGE_PREFIX + toolKey);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as { expiresAt: string };
    return parsed.expiresAt;
  } catch {
    return null;
  }
}

function setLocalExpiry(toolKey: string, expiresAt: string): void {
  localStorage.setItem(STORAGE_PREFIX + toolKey, JSON.stringify({ expiresAt }));
}

function clearLocalExpiry(toolKey: string): void {
  localStorage.removeItem(STORAGE_PREFIX + toolKey);
}

function _endOfDayISO(): string {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return end.toISOString();
}

// ─────────────────────────────────────────────────────────
// Client-side daily count and cooldown — UX hints only.
// Real enforcement is server-side in the grant-rewarded-unlock
// edge function. These provide immediate feedback without
// a round-trip, but can be bypassed (that's OK — the server
// is the source of truth).
// ─────────────────────────────────────────────────────────

function getCooldownExpiry(toolKey: string): number | null {
  const stored = localStorage.getItem(COOLDOWN_PREFIX + toolKey);
  if (!stored) return null;
  const expiry = parseInt(stored, 10);
  if (Date.now() > expiry) {
    localStorage.removeItem(COOLDOWN_PREFIX + toolKey);
    return null;
  }
  return expiry;
}

function setCooldownExpiry(toolKey: string, minutes: number): void {
  const expiry = Date.now() + minutes * 60_000;
  localStorage.setItem(COOLDOWN_PREFIX + toolKey, String(expiry));
}

function getDailyUnlockCount(toolKey: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const stored = localStorage.getItem(DAILY_COUNT_PREFIX + toolKey);
  if (!stored) return 0;
  try {
    const parsed = JSON.parse(stored) as { date: string; count: number };
    if (parsed.date !== today) return 0;
    return parsed.count;
  } catch {
    return 0;
  }
}

function incrementDailyUnlockCount(toolKey: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailyUnlockCount(toolKey);
  const next = current + 1;
  localStorage.setItem(
    DAILY_COUNT_PREFIX + toolKey,
    JSON.stringify({ date: today, count: next }),
  );
  return next;
}

export function useRewardedAccess(toolKey: string): RewardedAccess {
  const [config, setConfig] = useState<DbRewardedToolConfig | null>(null);
  const [featureConfig, setFeatureConfig] =
    useState<DbRewardedFeatureConfig | null>(null);
  const [primaryProvider, setPrimaryProvider] = useState<DbAdProvider | null>(
    null,
  );
  const [fallbackProvider, setFallbackProvider] = useState<DbAdProvider | null>(
    null,
  );
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [adProviderUsed, setAdProviderUsed] = useState<string | null>(null);
  const [offerwallUrl, setOfferwallUrl] = useState<string | null>(null);
  const [offerwallProviderName, setOfferwallProviderName] = useState<
    string | null
  >(null);
  const [dailyUnlockCount, setDailyUnlockCount] = useState(0);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const clientHashRef = useRef<string>("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clientHashRef.current = getClientHash();
  }, []);

  const refresh = useCallback(async () => {
    if (!clientHashRef.current) clientHashRef.current = getClientHash();
    setLoading(true);
    setError(null);

    const [cfgRes, unlockRes, featRes] = await Promise.all([
      fetchRewardedToolConfig(toolKey),
      checkRewardedUnlock(toolKey, clientHashRef.current),
      supabase
        .from("rewarded_feature_config")
        .select("*")
        .eq("feature_key", toolKey)
        .maybeSingle(),
    ]);

    setConfig(cfgRes.data);
    setFeatureConfig(featRes.data as DbRewardedFeatureConfig | null);

    if (cfgRes.error) setError(cfgRes.error);

    if (unlockRes.error) {
      setError(unlockRes.error);
    } else if (unlockRes.unlocked && unlockRes.expiresAt) {
      setIsUnlocked(true);
      setExpiresAt(unlockRes.expiresAt);
      setLocalExpiry(toolKey, unlockRes.expiresAt);
    } else {
      const localExpiry = getLocalExpiry(toolKey);
      if (localExpiry && new Date(localExpiry) > new Date()) {
        setIsUnlocked(true);
        setExpiresAt(localExpiry);
      } else {
        setIsUnlocked(false);
        setExpiresAt(null);
        clearLocalExpiry(toolKey);
      }
    }

    // Fetch provider details — use the public view (ad_providers_public) not the raw table.
    // The raw ad_providers table is admin-only after Phase 2b RLS hardening.
    const cfg = cfgRes.data;
    const feat = featRes.data as DbRewardedFeatureConfig | null;
    const primaryId = feat?.primary_provider_id ?? cfg?.primary_provider_id;
    const fallbackId = feat?.fallback_provider_id ?? cfg?.fallback_provider_id;

    if (primaryId || fallbackId) {
      const ids = [primaryId, fallbackId].filter(Boolean) as string[];
      // Fix for issue #3: use ad_providers_public instead of ad_providers
      const { data: provData } = await supabase
        .from("ad_providers_public")
        .select("*")
        .in("id", ids);
      const providers = (provData as DbAdProvider[]) ?? [];
      setPrimaryProvider(
        primaryId ? (providers.find((p) => p.id === primaryId) ?? null) : null,
      );
      setFallbackProvider(
        fallbackId
          ? (providers.find((p) => p.id === fallbackId) ?? null)
          : null,
      );
    }

    // Update client-side hints (server is the real enforcer)
    setDailyUnlockCount(getDailyUnlockCount(toolKey));
    setIsCooldownActive(getCooldownExpiry(toolKey) !== null);

    setLoading(false);
  }, [toolKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-expire
  useEffect(() => {
    if (!expiresAt) return;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      setIsUnlocked(false);
      setExpiresAt(null);
      clearLocalExpiry(toolKey);
      return;
    }
    const timer = setTimeout(() => {
      setIsUnlocked(false);
      setExpiresAt(null);
      clearLocalExpiry(toolKey);
    }, ms);
    return () => clearTimeout(timer);
  }, [expiresAt, toolKey]);

  // Cooldown ticker
  useEffect(() => {
    if (!isCooldownActive) return;
    const interval = setInterval(() => {
      if (getCooldownExpiry(toolKey) === null) {
        setIsCooldownActive(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isCooldownActive, toolKey]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  const requestUnlock = useCallback(() => {
    if (isUnlocked) return;
    // Client-side hint checks (server enforces for real)
    const feat = featureConfig;
    const cfg = config;
    const dailyLimit = feat?.daily_usage_limit ?? cfg?.daily_usage_limit ?? 0;
    if (dailyLimit > 0 && getDailyUnlockCount(toolKey) >= dailyLimit) {
      setError(
        `Daily limit reached (${dailyLimit} unlocks per day). Please try again tomorrow.`,
      );
      return;
    }
    const cooldown = getCooldownExpiry(toolKey);
    if (cooldown) {
      const remaining = Math.ceil((cooldown - Date.now()) / 60_000);
      setError(
        `Please wait ${remaining} minute${remaining > 1 ? "s" : ""} before trying again.`,
      );
      return;
    }
    setShowAdModal(true);
  }, [isUnlocked, featureConfig, config, toolKey]);

  const cancelUnlock = useCallback(() => {
    setShowAdModal(false);
    setAdLoading(false);
    setOfferwallUrl(null);
    setOfferwallProviderName(null);
  }, []);

  const closeOfferwall = useCallback(() => {
    setOfferwallUrl(null);
    setOfferwallProviderName(null);
    setAdLoading(false);
  }, []);

  const watchAd = useCallback(async () => {
    if (!config || !config.is_enabled) {
      setError("This feature is currently disabled.");
      return;
    }
    // Guard against double-clicks / rapid repeated calls
    if (adLoading) return;
    setAdLoading(true);
    setError(null);

    const clientHash = clientHashRef.current;
    const providerName =
      primaryProvider?.name ?? config.ad_provider ?? "adsense";
    const providerId = primaryProvider?.id ?? null;
    const adUnitId =
      primaryProvider?.credentials?.ad_unit_id ?? config.ad_unit_id ?? null;

    // Log impression to the unified analytics table only (issue #7 fix: no duplicate logging)
    await logAdEvent({
      event_type: "impression",
      provider_id: providerId,
      tool_key: toolKey,
      client_hash: clientHash,
      metadata: { ad_unit_id: adUnitId, provider_slug: primaryProvider?.slug },
    });

    // ──────────────────────────────────────────────────────
    // Web rewarded ad providers (AdGate, OfferToro, AdGem, etc.)
    // use an offerwall iframe model. We generate the offerwall URL
    // and show it in the modal. The provider sends a server-to-server
    // postback when the user completes offers. The client polls for
    // unlock status while the offerwall is open.
    // ──────────────────────────────────────────────────────
    const activeProvider = primaryProvider ?? fallbackProvider;
    if (activeProvider && supportsOfferwall(activeProvider)) {
      const offerwall = generateOfferwallUrl(
        activeProvider,
        clientHash,
        toolKey,
      );
      if (offerwall) {
        setOfferwallUrl(offerwall.url);
        setOfferwallProviderName(offerwall.providerName);
        setAdProviderUsed(offerwall.providerName);

        // Start polling for unlock status — the provider's postback
        // will trigger the edge function to grant the unlock
        pollIntervalRef.current = setInterval(async () => {
          const unlockRes = await checkRewardedUnlock(toolKey, clientHash);
          if (unlockRes.unlocked && unlockRes.expiresAt) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            const expiry = unlockRes.expiresAt;
            const revenueEstimate = featureConfig?.revenue_per_unlock ?? 0;

            await logAdEvent({
              event_type: "reward",
              provider_id: providerId,
              tool_key: toolKey,
              client_hash: clientHash,
              revenue_estimated: revenueEstimate,
              metadata: {
                ad_unit_id: adUnitId,
                expires_at: expiry,
                offerwall: true,
              },
            });

            setLocalExpiry(toolKey, expiry);
            setIsUnlocked(true);
            setExpiresAt(expiry);
            setShowAdModal(false);
            setAdLoading(false);
            setOfferwallUrl(null);
            setOfferwallProviderName(null);

            const newCount = incrementDailyUnlockCount(toolKey);
            setDailyUnlockCount(newCount);
            const cooldownMinutes =
              featureConfig?.cooldown_minutes ?? config.cooldown_minutes ?? 0;
            if (cooldownMinutes > 0) {
              setCooldownExpiry(toolKey, cooldownMinutes);
              setIsCooldownActive(true);
            }
          }
        }, 5000); // Poll every 5 seconds

        // Stop polling after 10 minutes max
        pollTimeoutRef.current = setTimeout(
          () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          },
          10 * 60 * 1000,
        );
        return;
      }
    }

    // ──────────────────────────────────────────────────────
    // Server-side grant: call the edge function to verify the ad
    // and grant the unlock. No client-side unlock insertion.
    // Shared by every non-offerwall provider path below.
    // ──────────────────────────────────────────────────────
    const grantUnlock = async (
      provider: string,
      adToken: string | null,
      extraMetadata?: Record<string, unknown>,
    ): Promise<void> => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "grant-rewarded-unlock",
          {
            body: {
              toolKey,
              clientHash,
              adProvider: provider,
              adToken,
            },
          },
        );

        if (fnError || !data?.success) {
          // supabase.functions.invoke() throws a FunctionsHttpError with a
          // generic "non-2xx status code" message on failure — the real
          // reason (e.g. "No rewarded ad provider is configured", daily
          // limit, cooldown, disabled feature) is in the response body and
          // must be read via getFunctionErrorMessage(). Falling back to
          // fnError.message directly hid the real error from users.
          const errorMsg = fnError
            ? await getFunctionErrorMessage(fnError)
            : (data?.error ?? "Failed to unlock. Please try again.");

          // Log error event
          await logAdEvent({
            event_type: "error",
            provider_id: providerId,
            tool_key: toolKey,
            client_hash: clientHash,
            metadata: { error: data?.code ?? "edge_function_error" },
          });

          setError(errorMsg);
          setAdLoading(false);
          return;
        }

        // Unlock granted successfully
        const expiry = data.expiresAt as string;
        const revenueEstimate = featureConfig?.revenue_per_unlock ?? 0;

        // Log reward event to unified analytics only (issue #7 fix)
        await logAdEvent({
          event_type: "reward",
          provider_id: providerId,
          tool_key: toolKey,
          client_hash: clientHash,
          revenue_estimated: revenueEstimate,
          metadata: {
            ad_unit_id: adUnitId,
            expires_at: expiry,
            ...(extraMetadata ?? {}),
          },
        });

        setLocalExpiry(toolKey, expiry);
        setIsUnlocked(true);
        setExpiresAt(expiry);
        setShowAdModal(false);
        setAdLoading(false);
        setAdProviderUsed(provider);

        // Update client-side hints
        const newCount = incrementDailyUnlockCount(toolKey);
        setDailyUnlockCount(newCount);
        const cooldownMinutes =
          featureConfig?.cooldown_minutes ?? config.cooldown_minutes ?? 0;
        if (cooldownMinutes > 0) {
          setCooldownExpiry(toolKey, cooldownMinutes);
          setIsCooldownActive(true);
        }
      } catch (e) {
        // Surface the real error when available instead of always showing
        // the same generic network message — network failures, thrown
        // exceptions, and edge cases all land here.
        const message =
          e instanceof Error && e.message
            ? e.message
            : "Unable to reach the unlock service. Please try again.";
        setError(message);
        setAdLoading(false);
      }
    };

    // ──────────────────────────────────────────────────────
    // Provider bridge: show the rewarded ad from this user gesture,
    // then grant the unlock server-side with a client attestation.
    // Must run inside the tap handler — mobile browsers only allow
    // window-opening ad formats from a direct user gesture (which is
    // why Monetag ads never fired for mobile visitors while the tag
    // ran passively in <head>). See REWARDED_AD_BRIDGES above.
    // ──────────────────────────────────────────────────────
    const bridge = activeProvider
      ? REWARDED_AD_BRIDGES[activeProvider.slug]
      : undefined;
    if (activeProvider && bridge) {
      try {
        const adResult = await bridge(activeProvider, {
          ymid: clientHash,
          toolKey,
        });
        await grantUnlock(
          activeProvider.name,
          `att_${activeProvider.slug}_${adResult.mode}_${Date.now()}`,
          {
            ad_mode: adResult.mode,
            ...(adResult.estimatedPrice != null
              ? { estimated_price: adResult.estimatedPrice }
              : {}),
          },
        );
      } catch (e) {
        const message =
          e instanceof Error && e.message
            ? e.message
            : "The ad could not be loaded. Please try again.";
        setError(message);
        setAdLoading(false);
      }
      return;
    }

    // ──────────────────────────────────────────────────────
    // Other providers: grant via the edge function. adToken is
    // provided by the provider SDK when one is integrated.
    // ──────────────────────────────────────────────────────
    await grantUnlock(providerName, null);
  }, [
    config,
    featureConfig,
    primaryProvider,
    toolKey,
    adLoading,
    fallbackProvider,
  ]);

  return {
    toolKey,
    config,
    featureConfig,
    primaryProvider,
    fallbackProvider,
    isUnlocked,
    expiresAt,
    loading,
    error,
    showAdModal,
    adLoading,
    adProviderUsed,
    offerwallUrl,
    offerwallProviderName,
    clientHash: clientHashRef.current,
    dailyUnlockCount,
    isCooldownActive,
    requestUnlock,
    cancelUnlock,
    closeOfferwall,
    watchAd,
    refresh,
  };
}

export function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const d = new Date(expiresAt);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `Unlocked until 11:59 PM today`;
  }
  return `Unlocked until ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
