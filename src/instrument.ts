/**
 * Sentry instrumentation — imported FIRST in main.tsx, before any other code.
 *
 * Setup:
 * 1. Create a project at https://sentry.io (free tier: 5K events/month)
 * 2. Copy the DSN from Project Settings → Client Keys
 * 3. Add to .env: VITE_SENTRY_DSN=https://xxx@sentry.io/123
 * 4. Add the same to Netlify environment variables
 * 5. For source maps: add SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN to Netlify
 *
 * If VITE_SENTRY_DSN is not set, Sentry stays inactive (zero overhead).
 */

import * as Sentry from '@sentry/react';
import React from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined
      ?? (import.meta.env.PROD ? 'production' : 'development'),
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,

    integrations: [
      // React Router v7 tracing — names transactions after the matched route
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Session replay — records DOM + user interactions around errors
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Tracing — 10% in production, 100% in dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Propagate trace headers to Supabase and Paystack
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/.*\.supabase\.co/,
      /^https:\/\/api\.paystack\.co/,
    ],

    // Session replay — 1% of normal sessions, 100% of error sessions
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

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

// Re-export helpers so the rest of the app imports from one place
export { Sentry };

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) return;
  Sentry.captureException(error, { extra: context });
}

export function setUserContext(user: { id: string; email?: string; username?: string } | null): void {
  if (!dsn) return;
  Sentry.setUser(user);
}

export function clearUserContext(): void {
  if (!dsn) return;
  Sentry.setUser(null);
}

export function isSentryActive(): boolean {
  return !!dsn;
}
