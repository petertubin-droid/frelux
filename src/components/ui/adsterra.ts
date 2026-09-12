// =========================================================
// FRELUX — Adsterra ad-network helpers
//
// Extracted from AdSlot.tsx so the component file only exports
// components (react-refresh / fast refresh). Pure helper
// functions + per-page density state; no React involved.
// =========================================================

import {
  ADSTERRA_SERVE_HOSTS,
  getAdsterraNativeBannerScript,
} from "@/lib/ad-network-formats";
import { adDebug } from "@/lib/ad-diagnostics";
import type { DbAdProvider } from "@/types/database";

/**
 * ── Adsterra banner integration ─────────────────────────────────────────
 * Adsterra banner zones serve via their official snippet:
 *   atOptions = { key, format: 'iframe', height, width, params }
 *   <script src="https://<serve-domain>/<key>/invoke.js">
 * Each zone key is size-specific (created in the Adsterra dashboard with a
 * fixed size), so width/height MUST match the zone or the banner renders
 * into blank space. Per-placement overrides come from the Admin "Ad Unit
 * ID" mapping (a size-specific key); the provider `key` credential is the
 * default fallback zone.
 *
 * Banner sizes supported by Adsterra: 160x300, 160x600, 300x250, 320x50,
 * 728x90, 468x60. Placement policy: banners go in standard content
 * positions (in-content, sidebar, top/bottom of page), clearly separated
 * from site content, with reasonable density, we cap at 3 Adsterra
 * banners per page so the page is never overloaded.
 */

/** Adsterra serve domain assigned to the account's banner zones. */
export function getAdsterraServeDomain(provider: DbAdProvider): string {
  const creds = (provider.credentials ?? {}) as Record<string, unknown>;
  const raw =
    typeof creds.serve_domain === "string" ? creds.serve_domain.trim() : "";
  // Admins sometimes paste several values comma-separated. Take the first
  // token that is a plain, valid hostname, never a URL, path or script
  // content (injection safety).
  for (const part of raw.split(",")) {
    const host = part.trim();
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return host.toLowerCase();
  }
  return "www.highperformanceformat.com";
}

/**
 * Serve host for the BANNER zone specifically. Adsterra emits different
 * serve domains per zone snippet (e.g. the banner zone on
 * www.highrevenueformat.com while the native zone lives on
 * plNNNN.profitableratecpmnetwork.com). When the admin pasted a full
 * banner snippet into the key credential, honor that snippet's host;
 * otherwise fall back to the global serve_domain credential. The host
 * must be in ADSTERRA_SERVE_HOSTS, a pasted value can never smuggle an
 * arbitrary origin into the page.
 */
export function getAdsterraBannerServeDomain(provider: DbAdProvider): string {
  const creds = (provider.credentials ?? {}) as Record<string, unknown>;
  const raw = typeof creds.key === "string" ? creds.key : "";
  const m = raw.match(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})\//i);
  if (m) {
    const host = m[1].toLowerCase();
    const suffix = (candidate: string) =>
      ADSTERRA_SERVE_HOSTS.some(
        (allowed) => candidate === allowed || candidate.endsWith("." + allowed),
      );
    if (suffix(host)) return host;
  }
  return getAdsterraServeDomain(provider);
}

/**
 * Normalize an Adsterra per-placement ad unit value. Admins sometimes paste
 * the full snippet from the Adsterra dashboard (<script …invoke.js>… plus a
 * container div) instead of the bare 32-hex zone key. Extract the key so
 * the slot renders; anything without a valid 32-hex token resolves to ""
 * (falsy, the placement falls through to the provider's global key).
 */
export function extractAdsterraZoneKey(
  value: string | undefined | null,
): string {
  if (!value) return "";
  const raw = value.trim();
  if (/^[a-f0-9]{32}$/i.test(raw)) return raw.toLowerCase();
  const m = raw.match(/([a-f0-9]{32})/i);
  return m ? m[1].toLowerCase() : "";
}

/** Default Adsterra banner size per placement family (config-driven override
 *  via provider.settings.banner_sizes[slotKey] = "WxH"). */
export function resolveAdsterraSize(
  provider: DbAdProvider,
  slotKey: string,
): { width: number; height: number } {
  const settings = (provider.settings ?? {}) as Record<string, unknown>;
  const custom = (settings.banner_sizes ?? {}) as Record<string, unknown>;
  const raw = typeof custom[slotKey] === "string" ? custom[slotKey] : "";
  const m = raw.match(/^(\d{2,4})\s*[x×]\s*(\d{2,4})$/);
  if (m) return { width: Number(m[1]), height: Number(m[2]) };

  // Admin pasted a full banner snippet into the key credential? Use the
  // zone's real dimensions (e.g. 468x60) as the default for banner slots.
  // A zone requested at the wrong size never fills, so the snippet beats
  // the generic family defaults below. Per-slot banner_sizes overrides
  // still win when set.
  const creds = (provider.credentials ?? {}) as Record<string, unknown>;
  const keyRaw = typeof creds.key === "string" ? creds.key : "";
  const h = keyRaw.match(/['"]height['"]\s*:\s*(\d{2,4})/i);
  const w = keyRaw.match(/['"]width['"]\s*:\s*(\d{2,4})/i);
  if (h && w) return { width: Number(w[1]), height: Number(h[1]) };

  const isMobile = window.innerWidth < 768;
  if (slotKey.endsWith("_sidebar")) return { width: 300, height: 250 };
  if (slotKey.endsWith("_bottom")) {
    return isMobile ? { width: 320, height: 50 } : { width: 728, height: 90 };
  }
  // In-content and every other family: medium rectangle
  return { width: 300, height: 250 };
}

/** Page-session cap: at most 3 Adsterra banners per page (density policy). */
const ADSTERRA_MAX_PER_PAGE = 3;
let adsterraRenderedCount = 0;
let adsterraRenderedPath: string | null = null;

export function adsterraSlotAvailable(): boolean {
  if (adsterraRenderedPath !== window.location.pathname) {
    adsterraRenderedPath = window.location.pathname;
    adsterraRenderedCount = 0;
  }
  return adsterraRenderedCount < ADSTERRA_MAX_PER_PAGE;
}

/** Test-only: reset the per-page Adsterra banner counter. */
export function resetAdsterraPageStateForTests(): void {
  adsterraRenderedCount = 0;
  adsterraRenderedPath = null;
}

/**
 * Render an Adsterra banner into a container. The official snippet is
 * isolated inside a per-slot iframe (srcdoc) so `window.atOptions`, a
 * global that invoke.js reads, can never race between two banners, and
 * invoke.js's document.write lands in the iframe's document instead of
 * the host page. This is the same iframe Adsterra would produce anyway.
 */
export function renderAdsterraBanner(
  container: HTMLElement,
  provider: DbAdProvider,
  opts: { key: string; slotKey: string },
): void {
  const key = opts.key;
  if (!/^[a-f0-9]{20,40}$/i.test(key)) return; // zone keys are hex tokens
  const serveDomain = getAdsterraBannerServeDomain(provider);
  const { width, height } = resolveAdsterraSize(provider, opts.slotKey);
  const params =
    (provider.settings ?? {}) instanceof Object &&
    typeof (provider.settings as Record<string, unknown>).sub_id === "string"
      ? `{ 'sub_id': '${(provider.settings as Record<string, unknown>).sub_id}' }`
      : "{}";

  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    "<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>" +
    "</head><body>" +
    '<script type="text/javascript">' +
    `atOptions = { 'key' : '${key}', 'format' : 'iframe', 'height' : ${height}, 'width' : ${width}, 'params' : ${params} };` +
    "</script>" +
    `<script type="text/javascript" src="https://${serveDomain}/${key}/invoke.js"></` +
    "script></body></html>";

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Advertisement");
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("frameborder", "0");
  iframe.style.cssText = `border:0;display:block;margin:0 auto;max-width:100%;width:${width}px;height:${height}px;`;
  iframe.srcdoc = html;
  try {
    container.appendChild(iframe);
  } catch {
    // Some test environments (happy-dom) throw while wiring srcdoc iframes.
    // The element still lands in the DOM, treat as rendered and move on.
  }
  adsterraRenderedCount++;
  adDebug("adsterra", "banner:rendered", {
    slotKey: opts.slotKey,
    width,
    height,
    host: serveDomain,
  });
}

/**
 * Native Banner (Adsterra): injects native.js into the slot container :
 * the unit renders in place and adapts to the container's width. The key
 * is validated (hex) before any script is built, so an invalid value can
 * never inject. Counts toward the same per-page density cap as banners.
 */
export function renderAdsterraNativeBanner(
  container: HTMLElement,
  provider: DbAdProvider,
  opts: { key: string; slotKey: string },
): void {
  const key = opts.key;
  if (!/^[a-f0-9]{20,40}$/i.test(key)) return; // zone keys are hex tokens
  if (container.querySelector('script[data-adsterra-native="true"]')) return;
  const serveDomain = getAdsterraServeDomain(provider);

  // Adsterra ships two in-place native products. The classic Native Banner
  // snippet is invoke.js + <div id="container-<key>">; the newer one is a
  // native.js tag. Which one this zone is comes from the admin's pasted
  // snippet (see getAdsterraNativeBannerScript), render the matching tag
  // or the zone silently no-fills.
  if (getAdsterraNativeBannerScript(provider) === "invoke") {
    const s = document.createElement("script");
    s.async = true;
    s.setAttribute("data-cfasync", "false");
    s.setAttribute("data-adsterra-native", "true");
    s.setAttribute("data-ad-zone", key);
    s.src = `https://${serveDomain}/${key}/invoke.js`;
    const div = document.createElement("div");
    div.id = `container-${key}`;
    container.appendChild(s);
    container.appendChild(div);
    adDebug("adsterra", "native-banner:invoke-rendered", {
      slotKey: opts.slotKey,
      host: serveDomain,
    });
  } else {
    const s = document.createElement("script");
    s.async = true;
    s.setAttribute("data-cfasync", "false");
    s.setAttribute("data-adsterra-native", "true");
    s.setAttribute("data-ad-zone", key);
    s.src = `https://${serveDomain}/${key}/native.js`;
    container.appendChild(s);
    adDebug("adsterra", "native-banner:native-rendered", {
      slotKey: opts.slotKey,
      host: serveDomain,
    });
  }
  adsterraRenderedCount++;
}

/**
 * Injector registry, the effect calls through this indirection so tests
 * can stub the real srcdoc injection (happy-dom can't load ad iframes).
 */
export const adsterraInjector = {
  renderBanner: renderAdsterraBanner,
  renderNativeBanner: renderAdsterraNativeBanner,
};
