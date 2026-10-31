// =========================================================
// Rate Limiting Middleware for Supabase Edge Functions
// Simple in-memory rate limiting (per Deno isolate).
// =========================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: now + options.windowMs,
    };
  }

  if (entry.count >= options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export async function getVerifiedUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) return null;
    // Ask GoTrue directly. A client-side getUser() call depends on session
    // handling that an edge function does not have, which would report "not
    // signed in" for every caller, administrators included.
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user?.id ?? null;
  } catch (_e) {
    return null;
  }
}

/**
 * Rate limit key derived from a VERIFIED identity. Authenticated requests
 * are keyed on the verified Supabase user id; anonymous traffic falls back
 * to the client IP as set by the platform gateway. Caller-supplied identity
 * headers are never trusted.
 */
export async function getRateLimitKey(req: Request): Promise<string> {
  const userId = await getVerifiedUserId(req);
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

export function rateLimitHeaders(
  remaining: number,
  resetAt: number,
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}

/**
 * Put the caller's budget on the response itself.
 *
 * A caller that only learns its limit by being refused cannot back off before
 * it happens, and an integrator cannot see how much headroom a batch has. So
 * the counts go on successful responses too, not just the 429.
 *
 * Header mutation is deliberately attempted rather than assumed: a streamed or
 * otherwise immutable response cannot take new headers, and a missing header
 * must never turn a successful call into a failure.
 */
export function attachRateLimitHeaders(
  response: Response,
  state: { maxRequests: number; remaining: number; resetAt: number },
): Response {
  try {
    response.headers.set("X-RateLimit-Limit", String(state.maxRequests));
    response.headers.set("X-RateLimit-Remaining", String(state.remaining));
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(state.resetAt / 1000)),
    );
  } catch {
    // Immutable or streamed response: leave it exactly as it is.
  }
  return response;
}

export const RATE_LIMITS = {
  PAYMENT: { maxRequests: 10, windowMs: 60_000 },
  AI: { maxRequests: 20, windowMs: 60_000 },
  AUTH: { maxRequests: 5, windowMs: 60_000 },
  GENERAL: { maxRequests: 60, windowMs: 60_000 },
  AD: { maxRequests: 30, windowMs: 60_000 },
} as const;
