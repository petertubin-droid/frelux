/**
 * Ad network format catalog & site-wide script injection helpers.
 *
 * Adsterra and Monetag both offer more than the classic banner:
 *   Adsterra — Banner (atOptions + invoke.js, per-slot iframe — see AdSlot),
 *              Native Banner (native.js, renders in-place), Interstitial,
 *              Popunder, Social Bar (all site-wide script tags).
 *   Monetag  — Display/auto zones via tag.min.js (data-zone), Rewarded
 *              (src/lib/monetag-rewarded.ts), plus Interstitial / Popunder /
 *              Vignette auto zones.
 *
 * Every field is dormant until the admin fills it — empty credentials never
 * inject anything. Keys are strictly validated (32-char hex for Adsterra,
 * numeric zone IDs for Monetag) and script URLs must sit on an allowlisted
 * Adsterra serve domain, so a pasted value can never smuggle arbitrary
 * script origins into the page.
 */
import type { DbAdProvider } from "@/types/database";

/** Whether a provider's VISUAL display ads are enabled (mirrors AdSlot's rule). */
export function displayAdsEnabled(provider: DbAdProvider): boolean {
  return provider.settings?.display_ads_enabled !== false;
}

/** Hostnames Adsterra serves ad scripts from. */
export const ADSTERRA_SERVE_HOSTS = [
  "highperformanceformat.com",
  "profitabledisplaynetwork.com",
  "profitablecpmrate.com",
  "adsterrapremium.com",
];

/** Default Adsterra serve host when none is configured/valid. */
export const ADSTERRA_DEFAULT_SERVE_HOST = "www.highperformanceformat.com";

/**
 * Normalize a configured Adsterra serve domain to a bare, allowlisted
 * hostname. Accepts "www.highperformanceformat.com", bare or full-URL
 * forms, and strips scheme/path. Anything that is not a known Adsterra
 * serve host (typos, unrelated domains) falls back to the default so a
 * bad admin value can never break every banner on the site.
 */
export function normalizeAdsterraServeDomain(raw: unknown): string {
  if (typeof raw !== "string") return ADSTERRA_DEFAULT_SERVE_HOST;
  let host = raw.trim().toLowerCase();
  if (host.includes("//")) {
    try {
      host = new URL(raw.trim()).hostname;
    } catch {
      return ADSTERRA_DEFAULT_SERVE_HOST;
    }
  }
  host = host.replace(/\/.*$/, "").replace(/:\d+$/, "");
  const ok = ADSTERRA_SERVE_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
  return ok ? host : ADSTERRA_DEFAULT_SERVE_HOST;
}

function isAllowedAdsterraHost(hostname: string, serveDomain: string): boolean {
  const host = hostname.toLowerCase();
  if (host === serveDomain.toLowerCase()) return true;
  return ADSTERRA_SERVE_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

/**
 * Accepts either a bare Adsterra zone key (32-char hex) or the full script
 * URL from the dashboard snippet. Returns the absolute https script URL, or
 * null when the value doesn't look like either shape.
 */
export function resolveAdsterraScriptUrl(
  raw: unknown,
  opts: { serveDomain: string; defaultScript: string },
): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  // Bare key → construct the URL on the serve domain
  if (/^[a-f0-9]{20,40}$/i.test(value)) {
    return `https://${opts.serveDomain}/${value}/${opts.defaultScript}`;
  }

  // Full URL → validate protocol, host and a clean /key/script.js path
  const candidate = value.startsWith("//") ? `https:${value}` : value;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;
    if (!isAllowedAdsterraHost(url.hostname, opts.serveDomain)) return null;
    // Path must be /<key>/<script>.js (no query, no fragment)
    if (!/^\/[a-z0-9-]{4,64}\/[a-z0-9-]+\.js$/i.test(url.pathname)) return null;
    if (url.search || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Adsterra per-slot + site-wide format catalog (config-driven, additive). */
export const ADSTERRA_FORMATS = [
  {
    credentialKey: "native_banner_key",
    format: "native_banner",
    defaultScript: "native.js",
    siteWide: false,
  },
  {
    credentialKey: "interstitial_key",
    format: "interstitial",
    defaultScript: "invoke.js",
    siteWide: true,
  },
  {
    credentialKey: "popunder_key",
    format: "popunder",
    defaultScript: "invoke.js",
    siteWide: true,
  },
  {
    credentialKey: "social_bar_key",
    format: "social_bar",
    defaultScript: "invoke.js",
    siteWide: true,
  },
] as const;

/**
 * Resolved site-wide Adsterra scripts (Interstitial / Popunder / Social Bar).
 * Each entry is injected exactly once per page session by Layout.
 */
export function getAdsterraSiteWideScripts(
  provider: DbAdProvider,
  serveDomain: string,
): Array<{ format: string; src: string }> {
  if (!displayAdsEnabled(provider)) return [];
  const creds = (provider.credentials ?? {}) as Record<string, unknown>;
  const out: Array<{ format: string; src: string }> = [];
  for (const f of ADSTERRA_FORMATS) {
    if (!f.siteWide) continue;
    const src = resolveAdsterraScriptUrl(creds[f.credentialKey], {
      serveDomain,
      defaultScript: f.defaultScript,
    });
    if (src) out.push({ format: f.format, src });
  }
  return out;
}

/**
 * Monetag auto-zone format catalog. These are website zones (Popunder,
 * Interstitial, Vignette) that run automatically via the SDK tag — injected
 * with data-sdk-ignore so they don't create a global show_ function.
 */
export const MONETAG_AUTO_ZONES = [
  { credentialKey: "interstitial_zone_id", format: "interstitial" },
  { credentialKey: "popunder_zone_id", format: "popunder" },
  { credentialKey: "vignette_zone_id", format: "vignette" },
] as const;

function validMonetagZoneId(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const zone = String(raw).trim();
  return /^\d{4,10}$/.test(zone) ? zone : null;
}

/**
 * Resolved Monetag auto zones from credentials. Each becomes its own
 * tag.min.js script tag with a unique data-zone.
 */
export function getMonetagAutoZoneScripts(
  provider: DbAdProvider,
): Array<{ format: string; zone: string; src: string }> {
  if (!displayAdsEnabled(provider)) return [];
  const creds = (provider.credentials ?? {}) as Record<string, unknown>;
  const out: Array<{ format: string; zone: string; src: string }> = [];
  for (const f of MONETAG_AUTO_ZONES) {
    const zone = validMonetagZoneId(creds[f.credentialKey]);
    if (zone) {
      out.push({
        format: f.format,
        zone,
        src: "https://quge5.com/88/tag.min.js",
      });
    }
  }
  return out;
}

/**
 * Native Banner key resolution for AdSlot: a slot renders the native unit
 * when its resolved key matches the native_banner_key credential.
 */
export function getAdsterraNativeBannerKey(
  provider: DbAdProvider,
): string | null {
  const creds = (provider.credentials ?? {}) as Record<string, unknown>;
  const raw = creds.native_banner_key;
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return /^[a-f0-9]{20,40}$/i.test(value) ? value : null;
}
