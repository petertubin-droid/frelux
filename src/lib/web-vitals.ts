import { useEffect } from 'react';
import { track } from '@/lib/analytics';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

interface LCPEntry extends PerformanceEntry {
  startTime: number;
}

interface FCPEntry extends PerformanceEntry {
  startTime: number;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  startTime: number;
}

// Rating thresholds from Google's web vitals standards
function getRating(name: string, value: number): WebVitalMetric['rating'] {
  switch (name) {
    case 'CLS':
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    case 'LCP':
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'needs-improvement';
      return 'poor';
    case 'FID':
    case 'INP':
      if (value <= 100) return 'good';
      if (value <= 300) return 'needs-improvement';
      return 'poor';
    case 'FCP':
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';
    case 'TTFB':
      if (value <= 800) return 'good';
      if (value <= 1800) return 'needs-improvement';
      return 'poor';
    default:
      return 'good';
  }
}

let clsValue = 0;
let lcpValue = 0;
let fidValue = 0;
let fcpValue = 0;
let ttfbValue = 0;

function reportVital(name: string, value: number): void {
  const rating = getRating(name, value);
  track('ai_request_failed', {
    type: 'web_vital',
    name,
    value: Math.round(value * 100) / 100,
    rating,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });

  if (import.meta.env.DEV) {
    console.debug(`[WebVitals] ${name}: ${value.toFixed(2)} (${rating})`);
  }
}

/**
 * Observes and reports Core Web Vitals (CLS, LCP, FID, FCP, TTFB).
 *
 * Global error listeners are now handled by the FRELUX error monitor
 * (initErrorMonitor in errorMonitor.ts) — this hook focuses solely
 * on performance metrics.
 *
 * Call this hook once at the app root.
 */
export function useWebVitals(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('PerformanceObserver' in window)) return;

    // ─────────────────────────────────────────
    // Performance observers
    // ─────────────────────────────────────────

    // CLS (Cumulative Layout Shift)
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    });
    try { clsObserver.observe({ type: 'layout-shift', buffered: true }); } catch { /* not supported */ }

    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as LCPEntry[];
      if (entries.length > 0) {
        lcpValue = entries[entries.length - 1].startTime;
      }
    });
    try { lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true }); } catch { /* not supported */ }

    // FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        if (fidValue === 0 && fidEntry.processingStart) {
          fidValue = fidEntry.processingStart - fidEntry.startTime;
          reportVital('FID', fidValue);
        }
      }
    });
    try { fidObserver.observe({ type: 'first-input', buffered: true }); } catch { /* not supported */ }

    // FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as FCPEntry[]) {
        fcpValue = entry.startTime;
        reportVital('FCP', fcpValue);
      }
    });
    try { fcpObserver.observe({ type: 'paint', buffered: true }); } catch { /* not supported */ }

    // TTFB (Time to First Byte)
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      ttfbValue = nav.responseStart - nav.requestStart;
      if (ttfbValue > 0) reportVital('TTFB', ttfbValue);
    }

    // Report CLS and LCP on page visibility change / unload
    const reportAndCleanup = () => {
      if (clsValue > 0) reportVital('CLS', clsValue);
      if (lcpValue > 0) reportVital('LCP', lcpValue);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportAndCleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      reportAndCleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clsObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      fcpObserver.disconnect();
    };
  }, []);
}
