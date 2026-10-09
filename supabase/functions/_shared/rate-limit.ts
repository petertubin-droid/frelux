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
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) return null;
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id ?? null;
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

export const RATE_LIMITS = {
  PAYMENT: { maxRequests: 10, windowMs: 60_000 },
  AI: { maxRequests: 20, windowMs: 60_000 },
  AUTH: { maxRequests: 5, windowMs: 60_000 },
  GENERAL: { maxRequests: 60, windowMs: 60_000 },
  AD: { maxRequests: 30, windowMs: 60_000 },
} as const;
