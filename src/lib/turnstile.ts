// =========================================================
// Cloudflare Turnstile — frontend half.
//
// The widget is rendered explicitly (no auto-injection) so it
// only appears on the forms that need it, and its token is
// checked by the turnstile-verify edge function before a form
// is allowed to submit. When no site key is configured the
// whole thing is a no-op: local builds and preview
// deployments keep working, and the forms fall back to their
// existing behaviour.
// =========================================================

import { supabase } from "@/lib/supabase";

export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Public site key, baked in at build time.
 *
 * Production's Netlify variable is spelled VITE_CLOUDFL_TURNSTILE_SITE_KEY
 * (missing "LARE"), and a site key that nothing reads means no widget and no
 * check at all — the exact silent failure this module exists to prevent — so
 * every spelling in use is accepted instead of only the documented one.
 */
const siteKeyCandidates: unknown[] = [
  import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY,
  import.meta.env.VITE_TURNSTILE_SITE_KEY,
  import.meta.env.VITE_CLOUDFL_TURNSTILE_SITE_KEY,
];

export const TURNSTILE_SITE_KEY =
  siteKeyCandidates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    // First non-empty wins: a defined-but-empty var must not stop the search,
    // which is how an unset canonical name would otherwise hide a set alias.
    .find((value) => value.length > 0) ?? "";

export const turnstileConfigured = TURNSTILE_SITE_KEY.length > 0;

export type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loader: Promise<TurnstileApi> | null = null;

/** Load Cloudflare's script once per page, whatever asked first. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("turnstile needs a browser"));
  }
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loader) return loader;

  loader = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-frelux-turnstile]",
    );
    const script = existing ?? document.createElement("script");
    const done = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("turnstile did not initialise"));
    };
    const fail = () => {
      loader = null;
      reject(new Error("turnstile script blocked"));
    };
    if (existing) {
      // Another component started the load; wait for it to land.
      if (window.turnstile) resolve(window.turnstile);
      else {
        script.addEventListener("load", done, { once: true });
        script.addEventListener("error", fail, { once: true });
      }
      return;
    }
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.dataset.freluxTurnstile = "true";
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });

  return loader;
}

export type TurnstileCheck = { ok: boolean; reason?: string };

/**
 * The file Worker also runs siteverify, one hop from the visitor. Checking there
 * first keeps a form submission off the Supabase functions hot path; the function
 * stays as the fallback so a Worker outage cannot lock anyone out.
 */
/** How long the file Worker gets before the edge function takes over. */
const EDGE_VERIFY_TIMEOUT_MS = 4000;

const EDGE_VERIFY_URL = (
  (import.meta.env.VITE_R2_WORKER_URL as string | undefined) ?? ""
)
  .trim()
  .replace(/\/+$/, "");

/**
 * One attempt at the edge. Returns null when the edge should not be trusted to
 * answer (unreachable, or not configured there), which sends the caller to
 * Supabase. A token is single-use, so a reached-but-failed edge is reported
 * rather than retried against a second verifier.
 */
async function verifyAtEdge(
  token: string,
  action: string,
): Promise<TurnstileCheck | null> {
  if (!EDGE_VERIFY_URL) return null;
  // The Worker is a fallback-preferring faster path, not the only verifier.
  // Without a deadline a Worker that hangs (dead custom domain, cold DNS)
  // would stall the form for as long as the browser waits, so give it a
  // short budget and hand the token to the function instead.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EDGE_VERIFY_TIMEOUT_MS);
  try {
    const response = await fetch(`${EDGE_VERIFY_URL}/api/turnstile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, action }),
      signal: controller.signal,
    });
    if (response.status === 503) return null;
    if (response.status === 502) return { ok: false, reason: "network" };
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        reason?: string;
      } | null;
      return { ok: false, reason: payload?.reason ?? "rejected" };
    }
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
    } | null;
    if (payload?.ok) return { ok: true };
    return { ok: false, reason: "rejected" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask the backend to verify a widget token for one action.
 * Fails closed: a network error is a rejection, never a pass.
 */
export async function verifyTurnstileToken(
  token: string | null,
  action: string,
): Promise<TurnstileCheck> {
  if (!turnstileConfigured) return { ok: true, reason: "not-configured" };
  if (!token) return { ok: false, reason: "missing-token" };

  const edge = await verifyAtEdge(token, action);
  if (edge) return edge;

  try {
    const { data, error } = await supabase.functions.invoke(
      "turnstile-verify",
      { body: { token, action } },
    );
    if (error) return { ok: false, reason: "network" };
    const payload = data as { ok?: boolean; error?: string } | null;
    return payload?.ok
      ? { ok: true }
      : { ok: false, reason: payload?.error ?? "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Plain sentence a form can show when a check fails. */
export function turnstileErrorMessage(check: TurnstileCheck): string {
  if (check.reason === "network") {
    return "We could not reach the verification service. Check your connection and try again.";
  }
  return "Verification expired or failed. Please complete the check again.";
}
