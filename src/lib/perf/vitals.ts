/**
 * Field Web Vitals.
 *
 * A lab run says what a fast laptop in a data centre sees. This reports what a
 * mid-range Android on a congested network sees, which is the only number that
 * describes most visitors. Sampling keeps the volume proportionate: one in four
 * sessions reports, chosen once and remembered for the session.
 */
export type VitalMetric = "LCP" | "CLS" | "INP" | "TTFB" | "FCP";
export type VitalRating = "good" | "needs-improvement" | "poor";

const THRESHOLDS: Record<VitalMetric, [number, number]> = {
  LCP: [2500, 4000],
  FCP: [1800, 3000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
};

export function rateMetric(metric: VitalMetric, value: number): VitalRating {
  const [good, poor] = THRESHOLDS[metric];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export function deviceClass(width: number): "phone" | "tablet" | "desktop" {
  if (width < 768) return "phone";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** Deterministic from the session id, so a session reports or it does not. */
export function shouldSample(sessionId: string, rate = 0.25): boolean {
  // FNV-1a with a final avalanche: a plain polynomial hash clusters on
  // sequential ids (it sampled 43% of them at a 25% rate), which would bias the
  // sample toward whichever sessions happen to be numbered alike.
  let hash = 2166136261;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash ^= sessionId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return ((hash >>> 0) % 10000) / 10000 < rate;
}

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem("frelux_vitals_sid");
    if (existing) return existing;
    const made = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("frelux_vitals_sid", made);
    return made;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function endpoint(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && key ? `${url}/functions/v1/vitals-report|${key}` : null;
}

/**
 * Installs the observers. Returns a teardown so tests and hot reload do not
 * stack listeners.
 */
export function installVitalsReporter(): () => void {
  if (
    typeof window === "undefined" ||
    typeof PerformanceObserver === "undefined"
  ) {
    return () => {};
  }
  if (!shouldSample(sessionId())) return () => {};

  const cleanups: Array<() => void> = [];
  const pending = new Map<VitalMetric, number>();

  const record = (metric: VitalMetric, value: number) => {
    pending.set(metric, Math.round(value * 1000) / 1000);
  };

  const observe = (
    type: string,
    handler: (entries: PerformanceEntryList) => void,
  ) => {
    try {
      const observer = new PerformanceObserver((list) =>
        handler(list.getEntries()),
      );
      observer.observe({ type, buffered: true } as PerformanceObserverInit);
      cleanups.push(() => observer.disconnect());
    } catch {
      // The browser does not support this entry type; the metric stays absent.
    }
  };

  observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) record("LCP", last.startTime);
  });
  observe("paint", (entries) => {
    const fcp = entries.find(
      (entry) => entry.name === "first-contentful-paint",
    );
    if (fcp) record("FCP", fcp.startTime);
  });
  observe("layout-shift", (entries) => {
    let total = pending.get("CLS") ?? 0;
    for (const entry of entries) {
      const shift = entry as PerformanceEntry & {
        value?: number;
        hadRecentInput?: boolean;
      };
      if (!shift.hadRecentInput) total += shift.value ?? 0;
    }
    record("CLS", total);
  });
  observe("event", (entries) => {
    for (const entry of entries) {
      const duration = entry.duration;
      const current = pending.get("INP") ?? 0;
      if (duration > current) record("INP", duration);
    }
  });

  const navigation = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  if (navigation) record("TTFB", navigation.responseStart);

  const flush = () => {
    const target = endpoint();
    if (!target) return;
    const [base, key] = target.split("|");
    const device = deviceClass(window.innerWidth);
    const connection =
      (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection?.effectiveType ?? null;

    for (const [metric, value] of pending) {
      void fetch(base, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", apikey: key },
        body: JSON.stringify({
          metric,
          value,
          rating: rateMetric(metric, value),
          path: window.location.pathname.slice(0, 200),
          device,
          connection,
          buildVersion: import.meta.env.VITE_BUILD_SHA as string | undefined,
        }),
      }).catch(() => {
        // A dropped measurement is not worth a retry or an error surface.
      });
    }
    pending.clear();
  };

  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);
  cleanups.push(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", flush);
  });

  return () => {
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
  };
}
