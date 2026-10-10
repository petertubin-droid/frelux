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
 * Fetch all active ad providers and placements, cached for 1 minute.
 */
export async function fetchAdConfig(force = false): Promise<AdConfigResult> {
  const now = Date.now();
  if (!force && providersCache && placementsCache && now < cacheExpiry) {
    return { providers: providersCache, placements: placementsCache };
  }

  const supabase = await getSupabase();
  const [provRes, placeRes] = await Promise.all([
    supabase
      .from("ad_providers_public")
      .select("*")
      .eq("is_active", true)
      .order("priority"),
    supabase.from("ad_placements").select("*").eq("is_active", true),
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

  providersCache = (provRes.data as DbAdProvider[]) ?? [];
  const dbPlacements = (placeRes.data as DbAdPlacement[]) ?? [];
  // Code-defined AdSense-only placements fill gaps only: any DB row with
  // the same key (e.g. inserted by the admin or the migration) wins, so
  // the admin can toggle/configure them like any other placement.
  const dbKeys = new Set(dbPlacements.map((pl) => pl.placement_key));
  placementsCache = [
    ...dbPlacements,
    ...ADSENSE_ONLY_PLACEMENT_KEYS.filter((k) => !dbKeys.has(k)).map((k) =>
      adsenseOnlyPlacement(k),
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
): DbAdProvider[] {
  const placement = placements.find((p) => p.placement_key === placementKey);
  if (!placement) return [];

  if (placement.provider_ids.length > 0) {
    const ordered: DbAdProvider[] = [];
    for (const pid of placement.provider_ids) {
      const prov = providers.find((p) => p.id === pid);
      if (prov) ordered.push(prov);
    }
    return ordered;
  }

  // No explicit provider list, use all active providers sorted by priority
  return providers;
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

/**
 * Get a specific placement by key.
 */
export function getPlacement(
  placementKey: string,
  placements: DbAdPlacement[],
): DbAdPlacement | null {
  return placements.find((p) => p.placement_key === placementKey) ?? null;
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
    const { getRewardedAdCandidates } = await import("@/lib/rewarded-bridges");
    return getRewardedAdCandidates(providers).length > 0;
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
