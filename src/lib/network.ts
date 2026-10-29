/**
 * Network awareness for slow-connection users.
 *
 * FRELUX carries a lot of optional third-party weight (ad SDKs, the page
 * translator, analytics). On a 2G/3G or Save-Data connection that weight is
 * the difference between a page that renders and a page that times out, so
 * everything optional asks this module first.
 *
 * Defaults to permissive: if the browser exposes no Network Information API
 * (Safari, Firefox), the visitor is treated as having a good connection and
 * features load normally.
 */
type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

function connection(): NetworkInformation | null {
  if (typeof navigator === "undefined") return null;
  return (
    (navigator as Navigator & { connection?: NetworkInformation }).connection ??
    null
  );
}

/** True when the visitor asked to save data or is on a very slow link. */
export function isSlowNetwork(): boolean {
  const c = connection();
  if (!c) return false;
  if (c.saveData) return true;
  const type = c.effectiveType ?? "";
  if (type === "slow-2g" || type === "2g") return true;
  if (typeof c.downlink === "number" && c.downlink > 0 && c.downlink < 0.6) {
    return true;
  }
  return false;
}

/**
 * Third-party ad SDKs are the single heaviest optional asset. Skipped on slow
 * links and Save-Data; in-slot units simply stay empty, which the components
 * already handle honestly (no empty frame, no layout shift).
 */
export function shouldLoadAdSdks(): boolean {
  return !isSlowNetwork();
}

/** The page translator downloads a remote engine; defer or skip on slow links. */
export function shouldLoadTranslator(): boolean {
  return !isSlowNetwork();
}

/** Heavy decorative animation (neon frames, parallax) off on slow devices. */
export function shouldAnimate(): boolean {
  if (typeof window === "undefined") return true;
  if (isSlowNetwork()) return false;
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}
