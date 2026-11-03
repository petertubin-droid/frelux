/**
 * Why an ad SDK did or did not load on this page.
 *
 * Ad injection runs behind several independent gates (route, entitlement,
 * consent, connection, provider config). When one closes, the page looks the
 * same as a page where ads simply are not configured, and the owner has no way
 * to tell which. This records the first gate that stopped injection on the
 * document element, so it can be read from devtools or from the admin network
 * page without writing anything into the visitor's console.
 */

export type AdGateReason =
  | "not-run"
  | "admin-route"
  | "entitlement-loading"
  | "paid"
  | "no-consent"
  | "slow-network"
  | "no-provider"
  | "display-disabled"
  | "no-publisher"
  | "page-level-off"
  | "injected";

export const AD_GATE_LABELS: Record<AdGateReason, string> = {
  "not-run": "Ad injection has not run yet on this page",
  "admin-route": "Admin routes never load ad SDKs",
  "entitlement-loading": "Waiting for the sign-in state to resolve",
  paid: "The signed-in viewer is a paid subscriber",
  "no-consent": "The visitor has not answered the cookie banner",
  "slow-network": "Slow connection or Save-Data, SDKs skipped",
  "no-provider": "No active ad provider matched the config",
  "display-disabled": "Display ads are switched off for the AdSense provider",
  "no-publisher": "The AdSense publisher id is missing",
  "page-level-off": "Auto, anchor, vignette and interstitial are all off",
  injected: "AdSense library injected and page-level ads pushed",
};

const ATTRIBUTE = "data-ad-gate";
const STORAGE_KEY = "frelux_ad_gate_last";

export interface AdGateRecord {
  reason: AdGateReason;
  path: string;
  at: number;
}

/** The last gate recorded by a public page in this tab, for the admin readout. */
export function readLastAdGate(): AdGateRecord | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdGateRecord;
    return parsed && typeof parsed.reason === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** The reason as it stands on this page. */
export function readAdGate(): AdGateReason {
  if (typeof document === "undefined") return "not-run";
  const value = document.documentElement.getAttribute(ATTRIBUTE);
  return (value as AdGateReason | null) ?? "not-run";
}

/** Record the reason on the document so it survives without a console. */
export function markAdGate(reason: AdGateReason): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(ATTRIBUTE, reason);
  try {
    const record: AdGateRecord = {
      reason,
      path: typeof window === "undefined" ? "" : window.location.pathname,
      at: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable: the document attribute still carries the reason
  }
}

export interface AdGateInput {
  pathname: string;
  isPaid: boolean;
  authLoading: boolean;
  hasConsentChoice: boolean;
  slowNetwork: boolean;
}

/**
 * The first gate that stops ad SDKs before any config is read, or null when
 * the page is cleared to continue to the provider check.
 */
export function firstBlockingGate(input: AdGateInput): AdGateReason | null {
  if (input.pathname.startsWith("/admin")) return "admin-route";
  if (input.authLoading) return "entitlement-loading";
  if (input.isPaid) return "paid";
  if (!input.hasConsentChoice) return "no-consent";
  if (input.slowNetwork) return "slow-network";
  return null;
}
