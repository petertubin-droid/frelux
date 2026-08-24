/**
 * Sentry initialization — error monitoring for production.
 *
 * Activates only if VITE_SENTRY_DSN is set. In development, Sentry
 * is disabled to avoid polluting your Sentry project with dev errors.
 *
 * Setup:
 * 1. Create a project at https://sentry.io (free tier: 5K events/month)
 * 2. Copy the DSN from Project Settings → Client Keys
 * 3. Add to .env: VITE_SENTRY_DSN=https://xxx@sentry.io/123
 * 4. Add the same to Netlify environment variables
 * 5. Set VITE_SENTRY_ENVIRONMENT=production in Netlify (optional)
 */

import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry(): void {
  if (!dsn) {
    // No DSN configured — Sentry stays inactive (zero overhead)
    return;
  }

  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) ?? (import.meta.env.PROD ? 'production' : 'development'),
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
    // Performance monitoring — sample 10% of sessions
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session replay — sample 1% of sessions, 100% on error
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Ignore benign errors that aren't actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'Non-Error promise rejection captured',
    ],
    // Don't send errors from browser extensions
    denyUrls: [
      /browser-extension/i,
      /chrome-extension/i,
      /moz-extension/i,
      /safari-extension/i,
    ],
  });
}

/** Capture an exception manually (for non-React errors) */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) return;
  Sentry.captureException(error, { extra: context });
}

/** Set the current user context for error attribution */
export function setUserContext(user: { id: string; email?: string; username?: string } | null): void {
  if (!dsn) return;
  Sentry.setUser(user);
}

/** Clear user context on logout */
export function clearUserContext(): void {
  if (!dsn) return;
  Sentry.setUser(null);
}

/** Check if Sentry is active */
export function isSentryActive(): boolean {
  return !!dsn;
}
