/**
 * FRELUX Ad Manager: campaign selection, delivery and measurement.
 *
 * Campaigns are first-party rows in `ad_campaigns`. This module decides which
 * one belongs in a given slot (market, tool, category, device, schedule,
 * priority), records honest impressions and clicks, and derives the numbers the
 * analytics dashboard shows.
 *
 * Rules that matter:
 *  - a slot with nothing live renders nothing at all, never an empty frame;
 *  - a paused, expired or not-yet-started campaign serves no ads and counts no
 *    events;
 *  - an impression is counted once per campaign per slot per session per day;
 *  - a click is a click. A conversion is only ever recorded by a flow that
 *    knows something actually happened, with a value attached.
 */

import { supabase } from "@/lib/supabase";

export type CampaignType = "internal" | "sponsored" | "house";
export type CampaignStatus =
  "draft" | "active" | "paused" | "ended" | "archived";
export type CampaignFormat = "banner" | "native" | "compact";
export type DeviceKind = "desktop" | "tablet" | "mobile";
export type CampaignEventType = "impression" | "click" | "conversion";

export interface Campaign {
  id: string | null;
  name: string;
  slug: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  format: CampaignFormat;
  headline: string;
  description: string | null;
  cta_label: string;
  destination_url: string;
  is_external: boolean;
  image_url: string | null;
  image_alt: string | null;
  advertiser_name: string | null;
  advertiser_logo_url: string | null;
  is_sponsored: boolean;
  target_markets: string[];
  placements: string[];
  target_tools: string[];
  target_categories: string[];
  target_devices: DeviceKind[];
  priority: number;
  weight: number;
  starts_at: string | null;
  ends_at: string | null;
  max_impressions: number | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Where a campaign may appear. Values are stable: stored rows depend on them. */
export const PLACEMENTS = {
  calculatorResults: "calculator_results",
  calculatorContext: "calculator_context",
  article30: "article_30",
  article65: "article_65",
  articleEnd: "article_end",
  articleSidebar: "article_sidebar",
} as const;

export type Placement = (typeof PLACEMENTS)[keyof typeof PLACEMENTS];

export const PLACEMENT_LABELS: Record<string, string> = {
  calculator_results: "Calculator: below results",
  calculator_context: "Calculator: contextual suggestion",
  article_30: "Article: after ~30% of the body",
  article_65: "Article: after ~65% of the body",
  article_end: "Article: end of body",
  article_sidebar: "Article: desktop sidebar",
};

export const FORMAT_LABELS: Record<CampaignFormat, string> = {
  banner: "Image banner",
  native: "Native promotional card",
  compact: "Compact contextual link",
};

/** Every calculator that carries an ad slot, and the campaign tool key it sends. */
export const CALCULATOR_TOOL_KEYS = {
  paint: "paint",
  tile: "tile",
  cement: "cement",
  roofing: "roofing",
  foundation: "foundation",
  electrical: "electrical",
  solar: "solar",
  cost: "cost",
} as const;

export type CalculatorToolKey =
  (typeof CALCULATOR_TOOL_KEYS)[keyof typeof CALCULATOR_TOOL_KEYS];

export interface SlotContext {
  placement: string;
  toolKey?: string | null;
  category?: string | null;
  marketCode?: string | null;
  device?: DeviceKind;
}

export function deviceFromWidth(width: number): DeviceKind {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** True when the campaign is inside its scheduled window right now. */
export function isLive(campaign: Campaign, now = new Date()): boolean {
  if (campaign.status !== "active") return false;
  if (
    campaign.starts_at &&
    new Date(campaign.starts_at).getTime() > now.getTime()
  )
    return false;
  if (campaign.ends_at && new Date(campaign.ends_at).getTime() <= now.getTime())
    return false;
  return true;
}

function listMatches(
  targets: string[] | null | undefined,
  value: string | null | undefined,
): boolean {
  if (!targets || targets.length === 0) return true;
  if (targets.includes("ALL")) return true;
  if (!value) return false;
  const wanted = value.toLowerCase();
  return targets.some((target) => target.toLowerCase() === wanted);
}

/**
 * Does this campaign belong in this slot? A campaign with no tool or category
 * targeting is general and may appear anywhere in its placements.
 */
export function matchesContext(
  campaign: Campaign,
  context: SlotContext,
): boolean {
  if (!campaign.placements.includes(context.placement)) return false;

  if (!listMatches(campaign.target_markets, context.marketCode ?? "ALL")) {
    // A market code like NG must also match a region group entry such as WEST_AFRICA.
    if (!campaign.target_markets.some((m) => m.startsWith("REGION:")))
      return false;
  }

  if (
    campaign.target_devices.length &&
    context.device &&
    !campaign.target_devices.includes(context.device)
  ) {
    return false;
  }

  if (!listMatches(campaign.target_tools, context.toolKey ?? null))
    return false;
  if (!listMatches(campaign.target_categories, context.category ?? null))
    return false;
  return true;
}

/** A stable number per session, used to rotate equal-priority campaigns. */
function seedBucket(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100_000;
  }
  return hash;
}

/**
 * The campaigns eligible for a slot, best first.
 *
 * Priority decides first. Within one priority band the list rotates by session,
 * so two campaigns of equal weight share the inventory instead of the alphabet
 * choosing a permanent winner.
 */
export function selectCampaigns(
  campaigns: Campaign[],
  context: SlotContext,
  options?: { seed?: string; limit?: number; now?: Date },
): Campaign[] {
  const now = options?.now ?? new Date();
  const bucket = seedBucket(options?.seed ?? "anon");

  const eligible = campaigns
    .filter(
      (campaign) => isLive(campaign, now) && matchesContext(campaign, context),
    )
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.weight - a.weight ||
        a.slug.localeCompare(b.slug),
    );

  const rotated: Campaign[] = [];
  let index = 0;
  while (index < eligible.length) {
    const band = eligible[index].priority;
    const group: Campaign[] = [];
    while (index < eligible.length && eligible[index].priority === band) {
      group.push(eligible[index]);
      index += 1;
    }
    const offset = group.length > 1 ? bucket % group.length : 0;
    rotated.push(...group.slice(offset), ...group.slice(0, offset));
  }

  return options?.limit ? rotated.slice(0, options.limit) : rotated;
}

/** One campaign per slot, or null so the slot renders nothing. */
export function pickCampaign(
  campaigns: Campaign[],
  context: SlotContext,
  options?: { seed?: string; now?: Date },
): Campaign | null {
  return (
    selectCampaigns(campaigns, context, { ...options, limit: 1 })[0] ?? null
  );
}

// ── Loading ─────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000;
const CACHE_KEY = "ad-campaigns";

interface CacheEntry {
  at: number;
  campaigns: Campaign[];
}

const cache = new Map<string, CacheEntry>();

export function invalidateCampaignCache(): void {
  cache.clear();
}

/**
 * The campaigns a slot may draw from. A read failure falls back to the built-in
 * catalogue so the site keeps showing a sane promotion rather than a hole, and
 * the fallback is clearly marked as untracked.
 */
export async function loadCampaigns(options?: {
  force?: boolean;
}): Promise<Campaign[]> {
  const cached = cache.get(CACHE_KEY);
  if (!options?.force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.campaigns;
  }

  const { data, error } = await supabase
    .from("ad_campaigns")
    .select(
      "id,name,slug,campaign_type,status,format,headline,description,cta_label,destination_url,is_external,image_url,image_alt,advertiser_name,advertiser_logo_url,is_sponsored,target_markets,placements,target_tools,target_categories,target_devices,priority,weight,starts_at,ends_at,max_impressions,notes,created_at,updated_at",
    )
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(120);

  if (error) {
    cache.set(CACHE_KEY, { at: Date.now(), campaigns: STATIC_CAMPAIGNS });
    return STATIC_CAMPAIGNS;
  }

  const campaigns = ((data ?? []) as unknown as Campaign[]).map((row) => ({
    ...row,
    target_markets: row.target_markets ?? ["ALL"],
    placements: row.placements ?? [],
    target_tools: row.target_tools ?? [],
    target_categories: row.target_categories ?? [],
    target_devices: (row.target_devices?.length
      ? row.target_devices
      : ["desktop", "tablet", "mobile"]) as DeviceKind[],
  }));

  cache.set(CACHE_KEY, { at: Date.now(), campaigns });
  return campaigns;
}

/**
 * Static catalogue used when the campaign table cannot be read. Same copy as
 * the seeded rows; `id: null` means no event is recorded, so a fallback can
 * never inflate a sponsor's numbers.
 */
export const STATIC_CAMPAIGNS: Campaign[] = [
  {
    id: null,
    name: "FRELUX Pro",
    slug: "internal-frelux-pro",
    campaign_type: "internal",
    status: "active",
    format: "native",
    headline: "Keep every estimate, export it as a PDF",
    description:
      "FRELUX Pro saves your estimates, exports client-ready PDFs and unlocks advanced estimation.",
    cta_label: "See what Pro includes",
    destination_url: "/pricing",
    is_external: false,
    image_url: null,
    image_alt: null,
    advertiser_name: "FRELUX",
    advertiser_logo_url: null,
    is_sponsored: false,
    target_markets: ["ALL"],
    placements: [PLACEMENTS.calculatorResults, PLACEMENTS.articleEnd],
    target_tools: [],
    target_categories: [],
    target_devices: ["desktop", "tablet", "mobile"],
    priority: 40,
    weight: 1,
    starts_at: null,
    ends_at: null,
    max_impressions: null,
    notes: "Static fallback used when campaigns cannot be read.",
  },
];

// ── Measurement ─────────────────────────────────────────────────────

const SESSION_KEY = "frelux_ad_session";

/** A per-tab session id, used only to stop double-counting impressions. */
export function adSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return "no-session";
  }
}

export interface EventInput {
  campaign: Campaign;
  eventType: CampaignEventType;
  placement: string;
  toolKey?: string | null;
  marketCode?: string | null;
  device?: DeviceKind;
  value?: number | null;
}

/**
 * Record one event. Never throws: advertising measurement must not break a
 * calculator. A fallback campaign (no id) records nothing.
 */
export async function recordCampaignEvent(input: EventInput): Promise<boolean> {
  if (!input.campaign.id) return false;
  try {
    const { data, error } = await supabase.rpc("record_ad_event", {
      p_campaign_id: input.campaign.id,
      p_event_type: input.eventType,
      p_placement: input.placement,
      p_tool_key: input.toolKey ?? null,
      p_market_code: input.marketCode ?? null,
      p_device: input.device ?? null,
      p_session_id: adSessionId(),
      p_value: input.value ?? null,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

// ── Analytics ───────────────────────────────────────────────────────

export interface CampaignEventRow {
  id: string;
  campaign_id: string;
  event_type: CampaignEventType;
  placement: string | null;
  tool_key: string | null;
  market_code: string | null;
  device: string | null;
  value: number | null;
  created_at: string;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  /** Clicks per hundred impressions, one decimal. */
  ctr: number;
  /** Conversions per hundred clicks; null when nothing was clicked. */
  clickToConversion: number | null;
}

export function summariseEvents(events: CampaignEventRow[]): CampaignMetrics {
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let conversionValue = 0;
  for (const event of events) {
    if (event.event_type === "impression") impressions += 1;
    else if (event.event_type === "click") clicks += 1;
    else if (event.event_type === "conversion") {
      conversions += 1;
      conversionValue += Number(event.value ?? 0);
    }
  }
  return {
    impressions,
    clicks,
    conversions,
    conversionValue: Math.round(conversionValue * 100) / 100,
    ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    clickToConversion: clicks
      ? Math.round((conversions / clicks) * 1000) / 10
      : null,
  };
}

export interface Breakdown {
  key: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

/** Group impressions and clicks by one dimension, largest volume first. */
export function breakdownBy(
  events: CampaignEventRow[],
  dimension: "placement" | "tool_key" | "device" | "market_code",
): Breakdown[] {
  const groups = new Map<string, { impressions: number; clicks: number }>();
  for (const event of events) {
    const key = (event[dimension] as string | null) ?? "unknown";
    const entry = groups.get(key) ?? { impressions: 0, clicks: 0 };
    if (event.event_type === "impression") entry.impressions += 1;
    if (event.event_type === "click") entry.clicks += 1;
    groups.set(key, entry);
  }
  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      impressions: value.impressions,
      clicks: value.clicks,
      ctr: value.impressions
        ? Math.round((value.clicks / value.impressions) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

// ── Validation ──────────────────────────────────────────────────────

export interface CampaignDraft {
  name: string;
  slug: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  format: CampaignFormat;
  headline: string;
  description?: string | null;
  cta_label: string;
  destination_url: string;
  advertiser_name?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  is_sponsored: boolean;
  target_markets: string[];
  placements: string[];
  target_tools: string[];
  target_categories: string[];
  target_devices: DeviceKind[];
  priority: number;
  starts_at?: string | null;
  ends_at?: string | null;
}

/** Is this URL safe to send a visitor to? Internal paths or an https:// URL. */
export function safeDestination(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isExternalDestination(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Everything the manager refuses to save, in plain language. Validation runs in
 * the form and again before the insert, so a crafted request cannot skip it.
 */
export function validateCampaign(draft: CampaignDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Give the campaign a name.");
  if (!/^[a-z0-9-]+$/.test(draft.slug))
    errors.push(
      "The slug may only use lowercase letters, numbers and hyphens.",
    );
  if (!draft.headline.trim()) errors.push("A headline is required.");
  if (draft.headline.length > 90)
    errors.push(
      "Keep the headline under 90 characters so it reads on a phone.",
    );
  if (draft.description && draft.description.length > 220)
    errors.push("Keep the description under 220 characters.");
  if (!draft.cta_label.trim()) errors.push("The button needs a label.");
  if (!safeDestination(draft.destination_url)) {
    errors.push(
      "Use an internal path starting with / or a full https:// address.",
    );
  }
  if (!draft.placements.length) errors.push("Choose at least one placement.");
  if (
    draft.format === "banner" &&
    draft.image_url &&
    !draft.image_alt?.trim()
  ) {
    errors.push("An image banner needs alt text describing the image.");
  }
  if (
    draft.image_url &&
    !safeDestination(draft.image_url) &&
    !draft.image_url.startsWith("/")
  ) {
    errors.push(
      "The banner image must be an https:// URL or a path inside FRELUX.",
    );
  }
  if (draft.is_sponsored && !draft.advertiser_name?.trim()) {
    errors.push("A sponsored campaign must name the advertiser.");
  }
  if (
    draft.starts_at &&
    draft.ends_at &&
    new Date(draft.ends_at) <= new Date(draft.starts_at)
  ) {
    errors.push("The campaign cannot end before it starts.");
  }
  if (draft.priority < 0 || draft.priority > 100)
    errors.push("Priority runs from 0 to 100.");
  return errors;
}
