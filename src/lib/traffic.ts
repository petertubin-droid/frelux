// First-party traffic telemetry.
//
// This is the data behind the admin traffic dashboard. It is deliberately
// small and dependency-free: one anonymised visitor id, one session id, the
// path, the external source, and a coarse device class. No IP addresses, no
// user identity, no cross-site trails.
//
// Google Analytics runs separately through gtag (see AnalyticsScripts). It is
// deliberately NOT re-reported from here: GA4 enhanced measurement already
// sends a page_view on history changes, so forwarding from this module would
// double count every route change.

import { getSupabase } from "@/lib/supabase-lazy";
import { hasConsent } from "@/lib/cookie-consent";

const VISITOR_KEY = "frelux.vid";
const SESSION_KEY = "frelux.sid";
const SESSION_SEEN_KEY = "frelux.sid.seen";
const REFERRER_KEY = "frelux.ref";
const SESSION_IDLE_MS = 30 * 60 * 1000;

// Measurement waits for analytics consent (lib/cookie-consent.ts). A visitor
// who declines is never counted, and no visitor id is created for them.
// Paths that must never be measured: internal tooling, auth hand-offs and
// account pages are staff or personal surfaces, not site traffic.
const EXCLUDED_PREFIXES = [
  "/admin",
  "/login",
  "/signup",
  "/auth",
  "/reset-password",
  "/verify-email",
  "/account",
  "/my-projects",
  "/contractor",
];

let lastTracked = { path: "", at: 0 };

function readStorage(store: Storage | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(store: Storage | undefined, key: string, value: string) {
  try {
    store?.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode, cookie rules). Tracking degrades
    // to per-page-view sessions rather than breaking the page.
  }
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function privacyBlocked(): boolean {
  if (typeof navigator === "undefined") return true;
  const dnt =
    navigator.doNotTrack ??
    (window as unknown as { doNotTrack?: string | null }).doNotTrack;
  return dnt === "1" || dnt === "yes";
}

/** Stable per-browser id. Returns null when storage is unavailable. */
export function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  const existing = readStorage(window.localStorage, VISITOR_KEY);
  if (existing) return existing;
  const id = newId();
  writeStorage(window.localStorage, VISITOR_KEY, id);
  return readStorage(window.localStorage, VISITOR_KEY) ? id : null;
}

/** Session id that rolls after 30 minutes of inactivity. */
export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  const seen = Number(
    readStorage(window.sessionStorage, SESSION_SEEN_KEY) ?? 0,
  );
  const existing = readStorage(window.sessionStorage, SESSION_KEY);
  if (existing && now - seen < SESSION_IDLE_MS) {
    writeStorage(window.sessionStorage, SESSION_SEEN_KEY, String(now));
    return existing;
  }
  const id = newId();
  writeStorage(window.sessionStorage, SESSION_KEY, id);
  writeStorage(window.sessionStorage, SESSION_SEEN_KEY, String(now));
  return id;
}

/** Host of the first external source in this tab, captured before any SPA
 * navigation overwrites document.referrer semantics. */
export function getEntrySource(): string {
  if (typeof window === "undefined") return "Direct";
  const stored = readStorage(window.sessionStorage, REFERRER_KEY);
  if (stored) return stored;

  let source = "Direct";
  try {
    const ref = document.referrer;
    if (ref) {
      const url = new URL(ref);
      if (url.origin !== window.location.origin) {
        source = url.hostname.replace(/^www\./, "");
      }
    }
  } catch {
    // malformed referrer: treat as direct
  }
  writeStorage(window.sessionStorage, REFERRER_KEY, source);
  return source;
}

export function deviceClass(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (/iPad|Tablet/i.test(navigator.userAgent)) return "tablet";
  if (/Mobi|Android/i.test(navigator.userAgent) || width < 768) return "mobile";
  return "desktop";
}

export function shouldTrackPath(path: string): boolean {
  if (!path) return false;
  return !EXCLUDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Records one page view. Fire and forget: callers never await it and a
 * failure (offline, blocked storage, missing table) is silent.
 */
export async function trackPageView(path: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (privacyBlocked()) return;
  if (!shouldTrackPath(path)) return;
  if (!hasConsent("analytics")) return;

  const now = Date.now();
  if (lastTracked.path === path && now - lastTracked.at < 1500) return;
  lastTracked = { path, at: now };

  try {
    const supabase = await getSupabase();
    await supabase.from("analytics_events").insert({
      event: "page_view",
      page_path: path,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      referrer: getEntrySource(),
      device: deviceClass(),
      params: {
        locale: document.documentElement.lang || null,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    });
  } catch {
    // Telemetry is best effort by design.
  }
}

export function resetTrafficDedupe() {
  lastTracked = { path: "", at: 0 };
}
