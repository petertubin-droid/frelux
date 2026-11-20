// =========================================================
// RELEASE NOTICES
//
// A notice is a row with a publish time and an expiry. Anything that changes
// what a user has already saved (an input shape, a default, a formula) should
// publish one, and the banner then shows itself for 24 hours without a deploy,
// because the app reads the table at runtime rather than at build time.
//
// This module holds the selection rules so they can be tested without a browser
// and without the database.
// =========================================================

export interface ReleaseNotice {
  id: string;
  title: string;
  body: string;
  category: string | null;
  published_at: string;
  expires_at: string;
}

export const RELEASE_NOTICE_WINDOW_HOURS = 24;

export const DISMISS_KEY_PREFIX = "frelux_release_notice_dismissed_";

/**
 * Which notices should be on screen right now.
 *
 * Published but not yet expired, newest first, and never one the reader has
 * dismissed. Expiry is checked here as well as in the query, so a page left open
 * overnight does not keep showing a notice that has finished.
 */
export function visibleNotices(
  rows: ReleaseNotice[] | null | undefined,
  now: Date,
  isDismissed: (id: string) => boolean,
  limit = 1,
): ReleaseNotice[] {
  const t = now.getTime();
  return (rows ?? [])
    .filter((n) => {
      const published = Date.parse(n.published_at);
      const expires = Date.parse(n.expires_at);
      if (!Number.isFinite(published) || !Number.isFinite(expires))
        return false;
      if (published > t) return false;
      if (expires <= t) return false;
      return !isDismissed(n.id);
    })
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
    .slice(0, Math.max(0, limit));
}

/** Expiry for a notice published now, in ISO form. */
export function noticeExpiry(
  publishedAt: Date,
  hours = RELEASE_NOTICE_WINDOW_HOURS,
): string {
  return new Date(publishedAt.getTime() + hours * 3600_000).toISOString();
}
