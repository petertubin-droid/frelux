import { getSupabase } from "@/lib/supabase-lazy";
import type { DbAdProvider, DbAdPlacement } from "@/types/database";

// Module-level cache for ad config
let providersCache: DbAdProvider[] | null = null;
let placementsCache: DbAdPlacement[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000; // 1 minute
const FAILED_FETCH_RETRY_MS = 5_000; // retry a failed config fetch quickly

interface AdConfigResult {
  providers: DbAdProvider[];
  placements: DbAdPlacement[];
}

/**
 * The sitewide provider policy (owner directive 2026-11-11).
 *
 * Placement rows decide where an ad goes and how dense it may be. Which network
 * may fill it is one decision, made once, in Admin -> Ads -> Provider control.
 * Keeping it here means a new owner switch does not require editing forty
 * placement rows, and the resolver cannot drift from what the admin shows.
 */
export type AdProviderMode = "auto" | "adsense_only" | "single" | "off";

export interface AdProviderPolicy {
  mode: AdProviderMode;
  /** Provider slug honoured when mode === "single". */
  slug: string | null;
}

/** Waterfall behaviour until a site row says otherwise. */
const DEFAULT_AD_POLICY: AdProviderPolicy = { mode: "auto", slug: null };
let policyCache: AdProviderPolicy = DEFAULT_AD_POLICY;

/** Read the sitewide policy, tolerating a missing table or a failed read. */
async function readAdPolicy(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
): Promise<{
  ad_provider_mode?: string | null;
  ad_provider_slug?: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("ad_provider_mode, ad_provider_slug")
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return (data as { ad_provider_mode?: string | null } | null) ?? null;
  } catch {
    return null;
  }
}

/** Current sitewide policy. Set by fetchAdConfig. */
export function getAdProviderPolicy(): AdProviderPolicy {
  return policyCache;
}

/**
 * Fetch all active ad providers and placements, cached for 1 minute.
 */
export async function fetchAdConfig(force = false): Promise<AdConfigResult> {
  const now = Date.now();
  if (!force && providersCache && placementsCache && now < cacheExpiry) {
    return { providers: providersCache, placements: placementsCache };
  }

  const supabase = await getSupabase();
  const [provRes, placeRes, policyRes] = await Promise.all([
    supabase
      .from("ad_providers_public")
      .select("*")
      .eq("is_active", true)
      .order("priority"),
    supabase.from("ad_placements").select("*").eq("is_active", true),
    readAdPolicy(supabase),
  ]);

  // Failure handling (stale-while-error): a failed read must NEVER be
  // cached as an empty snapshot - that would blank every ad slot on the
  // site for the whole TTL window on a single transient network error.
  // Serve the last known-good config if we have one; otherwise cache
  // the empty result for only a short retry interval.
  if (provRes.error || placeRes.error) {
    if (providersCache && placementsCache) {
      return { providers: providersCache, placements: placementsCache };
    }
    providersCache = [];
    placementsCache = [];
    cacheExpiry = now + FAILED_FETCH_RETRY_MS;
    return { providers: [], placements: [] };
  }

  // A failed policy read must not silently widen or narrow the chain: keep the
  // last known policy and fall back to the waterfall on first load.
  const policyRow = policyRes as {
    ad_provider_mode?: string | null;
    ad_provider_slug?: string | null;
  } | null;
  if (policyRow) {
    const mode = policyRow.ad_provider_mode;
    policyCache = {
      mode:
        mode === "adsense_only" || mode === "single" || mode === "off"
          ? mode
          : "auto",
      slug: policyRow.ad_provider_slug?.trim() || null,
    };
  }

  providersCache = (provRes.data as DbAdProvider[]) ?? [];
  const dbPlacements = (placeRes.data as DbAdPlacement[]) ?? [];
  // Ensure any audited placements from DB are marked is_active: true
  const activatedDbPlacements = dbPlacements.map((pl) => {
    if (
      CODE_DEFINED_ACTIVE_PLACEMENT_KEYS.includes(
        pl.placement_key as (typeof CODE_DEFINED_ACTIVE_PLACEMENT_KEYS)[number],
      )
    ) {
      return { ...pl, is_active: true };
    }
    return pl;
  });
  // Code-defined placements fill gaps only: any DB row with the same key wins.
  const dbKeys = new Set(activatedDbPlacements.map((pl) => pl.placement_key));
  placementsCache = [
    ...activatedDbPlacements,
    ...ADSENSE_ONLY_PLACEMENT_KEYS.filter((k) => !dbKeys.has(k)).map((k) =>
      adsenseOnlyPlacement(k),
    ),
    ...CODE_DEFINED_ACTIVE_PLACEMENT_KEYS.filter((k) => !dbKeys.has(k)).map(
      (k) => defaultActivePlacement(k),
    ),
  ];
  cacheExpiry = now + CACHE_TTL;

  return { providers: providersCache, placements: placementsCache };
}

/**
 * Get the fallback chain of providers for a placement key.
 * Returns providers in priority order. If placement has explicit provider_ids,
 * those are used in order; otherwise all active providers of matching type are used.
 */
export function getProvidersForPlacement(
  placementKey: string,
  providers: DbAdProvider[],
  placements: DbAdPlacement[],
  policy: AdProviderPolicy = policyCache,
): DbAdProvider[] {
  const placement = placements.find((p) => p.placement_key === placementKey);
  if (!placement) return [];

  // The central control outranks a placement's own pin (the same precedent as
  // applyPrimaryNetwork): choosing one network sitewide must not leave slots
  // empty because a row still names an older provider.
  const chain =
    policy.mode === "auto"
      ? buildPlacementChain(placement, providers)
      : applyPrimaryNetwork(providers, providers);
  return applyProviderPolicy(chain, placement, policy);
}

/**
 * The per-placement chain: the placement's own provider list when it has one,
 * otherwise every active provider in priority order.
 */
function buildPlacementChain(
  placement: DbAdPlacement,
  providers: DbAdProvider[],
): DbAdProvider[] {
  if (placement.provider_ids.length > 0) {
    const ordered: DbAdProvider[] = [];
    for (const pid of placement.provider_ids) {
      const prov = providers.find((p) => p.id === pid);
      if (prov) ordered.push(prov);
    }
    return applyPrimaryNetwork(ordered, providers);
  }

  // No explicit provider list, use all active providers sorted by priority
  return applyPrimaryNetwork(providers, providers);
}

/**
 * Apply the sitewide policy to one placement's chain.
 *
 * Rewarded placements are exempt: an offerwall is a rewarded flow with its own
 * providers and its own consent, and serving AdSense into it would be a policy
 * violation rather than a preference.
 */
function applyProviderPolicy(
  chain: DbAdProvider[],
  placement: DbAdPlacement,
  policy: AdProviderPolicy,
): DbAdProvider[] {
  if (placement.placement_type === "rewarded") return chain;
  const { mode, slug } = policy;
  if (mode === "off") return [];
  if (mode === "adsense_only") {
    return chain.filter((p) => p.slug === "google_adsense");
  }
  if (mode === "single") {
    // A named provider that is not active, or not present in this chain, means
    // no ad rather than a quiet fallback to a network the owner did not choose.
    if (!slug) return [];
    return chain.filter((p) => p.slug === slug);
  }
  return chain;
}

/**
 * AdSense is the primary network (owner directive 2026-10-29): once Google
 * approves the account, AdSense must be able to replace every other provider
 * on every placement immediately - no redeploy, no per-placement edits.
 *
 * The switch lives on the provider row itself (`settings.primary`), so the
 * owner flips one boolean in Admin -> Ads when approval lands. Until then the
 * flag is absent and the existing waterfall is untouched: an unapproved
 * AdSense account must never sit at the head of the chain and starve the
 * placements that currently earn.
 */
export function getAdsensePrimary(
  providers: DbAdProvider[],
): DbAdProvider | null {
  const adsense = providers.find((p) => p.slug === "google_adsense");
  if (!adsense) return null;
  const settings = (adsense.settings ?? {}) as Record<string, unknown>;
  const creds = (adsense.credentials ?? {}) as Record<string, unknown>;
  const flagged =
    settings.primary === true ||
    settings.adsense_primary === true ||
    settings.primary_network === true;
  const configured = Boolean(creds.publisher_id || creds.client_id);
  return flagged && configured ? adsense : null;
}

/**
 * Order a placement chain once a primary network exists: the primary leads
 * every placement, in every position, including placements that pinned an
 * explicit provider list. The remaining providers stay behind it as fill, so
 * a no-fill from the primary still earns instead of leaving an empty slot.
 */
export function applyPrimaryNetwork(
  chain: DbAdProvider[],
  providers: DbAdProvider[],
): DbAdProvider[] {
  const primary = getAdsensePrimary(providers);
  if (!primary) return chain;
  const rest = chain.filter((p) => p.id !== primary.id);
  return [primary, ...rest];
}

/**
 * Code-defined AdSense-dedicated placements (owner directive 2026-10-10).
 *
 * The site's primary monetization target is Google AdSense (currently
 * awaiting approval, with Monetag/Adsterra as temporary fillers). These
 * placements are rendered through <AdSlot providerSlug="google_adsense">,
 * which locks the slot to AdSense — Monetag/Adsterra can never claim them.
 *
 * They are merged into the fetched placement list when the database has no
 * row for their key, so the slots work immediately with zero admin
 * configuration. Once the matching migration inserts real rows, those DB
 * rows win (and gain admin toggles); the code defaults only fill gaps.
 */
export const ADSENSE_ONLY_PLACEMENT_KEYS = [
  "adsense_footer",
  "adsense_home",
  "adsense_paint_calculator",
  "adsense_colors",
  "adsense_learn",
  // Anchored under the bottom navigation. AdSense only: this position sits
  // against the site's own chrome, where a low-quality creative is most likely
  // to be mistaken for part of the page.
  "adsense_bottom",
] as const;

function adsenseOnlyPlacement(key: string): DbAdPlacement {
  return {
    id: `adsense-only-${key}`,
    placement_key: key,
    placement_name: `Google AdSense — ${key} (AdSense only)`,
    placement_type: "banner",
    page_target: "global",
    is_active: true,
    provider_ids: [], // locked by providerSlug at the AdSlot call site
    ad_unit_ids: {},
    sort_order: 0,
    display_rules: {
      mobile: true,
      desktop: true,
      refresh_seconds: 0,
      min_height: 100,
    },
    created_at: "",
    updated_at: "",
  };
}

export const CODE_DEFINED_ACTIVE_PLACEMENT_KEYS = [
  "ai_feature",
  "ai_assistant_native",
  "calculator_mid",
  "calculator_native",
  "calculator_hub_mid",
  "calculator_hub_native",
  "calculator_sidebar",
  "color_detail_mid",
  "color_detail_native",
  "desktop_sidebar_display",
  "estimator_mid",
  "estimator_native",
  "gallery_mid",
  "gallery_native",
  "home_top",
  "home_native",
  "image_estimator_native",
  "learn_sidebar",
  "learn_native",
  "learn_article_top",
  "learn_article_mid_2",
  "learn_in_article",
  "learn_category_mid",
  "learn_category_native",
  "market_top",
  "market_mid",
  "marketplace_sidebar",
  "marketplace_native",
  "mobile_interstitial_trigger",
  "tools_mid",
  "wall-finish-top",
] as const;

export function defaultActivePlacement(key: string): DbAdPlacement {
  const isNative = key.includes("native");
  return {
    id: `code-active-${key}`,
    placement_key: key,
    placement_name: `Active Placement — ${key}`,
    placement_type: isNative ? "native" : "banner",
    page_target: "global",
    is_active: true,
    provider_ids: [],
    ad_unit_ids: {},
    sort_order: 0,
    display_rules: {
      mobile: true,
      desktop: true,
      refresh_seconds: 0,
      min_height: isNative ? 120 : 100,
    },
    created_at: "",
    updated_at: "",
  };
}

/**
 * Get a specific placement by key.
 */
export function getPlacement(
  placementKey: string,
  placements: DbAdPlacement[],
): DbAdPlacement | null {
  const found = placements.find((p) => p.placement_key === placementKey);
  if (found) return found;
  if (
    CODE_DEFINED_ACTIVE_PLACEMENT_KEYS.includes(
      placementKey as (typeof CODE_DEFINED_ACTIVE_PLACEMENT_KEYS)[number],
    )
  ) {
    return defaultActivePlacement(placementKey);
  }
  if (
    ADSENSE_ONLY_PLACEMENT_KEYS.includes(
      placementKey as (typeof ADSENSE_ONLY_PLACEMENT_KEYS)[number],
    )
  ) {
    return adsenseOnlyPlacement(placementKey);
  }
  return null;
}

/**
 * Check if a placement should display on the current device.
 */
export function shouldDisplayPlacement(placement: DbAdPlacement): boolean {
  const isMobile = window.innerWidth < 768;
  const rules = placement.display_rules;
  if (isMobile && !rules.mobile) return false;
  if (!isMobile && !rules.desktop) return false;
  return true;
}

/**
 * Log an ad analytics event.
 */
export async function logAdEvent(event: {
  event_type: string;
  provider_id?: string | null;
  placement_key?: string | null;
  tool_key?: string | null;
  user_id?: string | null;
  client_hash?: string | null;
  revenue_estimated?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      event_type: event.event_type,
      provider_id: event.provider_id ?? null,
      placement_key: event.placement_key ?? null,
      tool_key: event.tool_key ?? null,
      user_id: event.user_id ?? null,
      client_hash: event.client_hash ?? null,
      revenue_estimated: event.revenue_estimated ?? 0,
      metadata: event.metadata ?? {},
    };
    const sb = await getSupabase();
    await sb.from("ad_analytics_events").insert(payload);
  } catch {
    // Silently fail, analytics logging should never break the user experience
  }
}

/**
 * Get the ad unit ID for a specific provider on a placement.
 */
export function getAdUnitId(
  placement: DbAdPlacement,
  providerId: string,
): string | null {
  return placement.ad_unit_ids[providerId] ?? null;
}

/**
 * Automatic fill (owner directive 2026-10-08): per-slot mapping must be
 * OPTIONAL. When a placement has no unit mapped for a provider, the
 * provider's default display unit (one AdSense unit pasted once, or any
 * network's default zone/unit credential) fills every display-capable
 * slot on the site. Per-placement mappings always win when present.
 */
export function getProviderDefaultDisplayUnit(
  provider: DbAdProvider,
): string | null {
  const creds = (provider.credentials ?? {}) as Record<string, unknown>;
  for (const key of [
    "default_display_unit_id",
    "default_zone_id",
    "default_ad_unit_id",
  ]) {
    const v = creds[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

/**
 * The effective unit a provider will use on a placement: the per-slot
 * mapping when present, else the provider's automatic default.
 */
export function getEffectiveAdUnitId(
  placement: DbAdPlacement,
  provider: DbAdProvider,
): string | null {
  return (
    getAdUnitId(placement, provider.id) ??
    getProviderDefaultDisplayUnit(provider)
  );
}

/**
 * Check if at least one active rewarded ad provider is configured.
 * Used to gate the "Watch Ad" UI, if no real provider exists, we show
 * "Coming soon" instead of letting users click a button that can't work.
 */
export async function hasRewardedAdProvider(): Promise<boolean> {
  try {
    const { providers } = await fetchAdConfig();
    // Multi-provider (owner directive 2026-09-15): an active provider
    // only counts when we can actually serve a rewarded experience -
    // a real client-side bridge OR an offerwall. Previously a provider
    // that was merely typed "rewarded"/"mixed" with no implementation
    // flipped this to true and users hit a dead "Watch Ad" button.
    const { getCreditRewardCandidates } =
      await import("@/lib/rewarded-bridges");
    return getCreditRewardCandidates(providers).length > 0;
  } catch {
    return false;
  }
}

/**
 * Clear the ad config cache. Call after admin changes.
 */
export function clearAdConfigCache(): void {
  providersCache = null;
  placementsCache = null;
  cacheExpiry = 0;
}
