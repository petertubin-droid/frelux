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

/** Public site key, baked in at build time. */
export const TURNSTILE_SITE_KEY = (
  (import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY as string | undefined) ??
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ??
  ""
).trim();

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
 * Ask the backend to verify a widget token for one action.
 * Fails closed: a network error is a rejection, never a pass.
 */
export async function verifyTurnstileToken(
  token: string | null,
  action: string,
): Promise<TurnstileCheck> {
  if (!turnstileConfigured) return { ok: true, reason: "not-configured" };
  if (!token) return { ok: false, reason: "missing-token" };
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
