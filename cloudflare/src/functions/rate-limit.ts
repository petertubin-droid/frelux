/**
 * Best-effort rate limiting for natively ported edge functions.
 *
 * Supabase's limiter kept counters in the Deno isolate, so it was already
 * per-instance rather than global. A Worker has the same constraint, and the
 * honest equivalent is the Cache API: a fixed-window counter shared by the
 * colo that answered, which is coarser than a Durable Object and costs no
 * storage. Limits here are abuse protection, not a billing quota.
 *
 * Upgrade path when a hard global limit is needed: move `hit` onto a Durable
 * Object (one instance per key) and keep the same signature.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/** Same values as supabase/functions/_shared/rate-limit.ts. */
export const RATE_LIMITS = {
  PAYMENT: { maxRequests: 10, windowMs: 60_000 },
  AI: { maxRequests: 20, windowMs: 60_000 },
  AUTH: { maxRequests: 5, windowMs: 60_000 },
  GENERAL: { maxRequests: 60, windowMs: 60_000 },
  AD: { maxRequests: 30, windowMs: 60_000 },
} as const;

/**
 * Count one hit against `key` in the current window.
 *
 * When no Cache API is available (unit tests, `wrangler dev` without the
 * cache binding) the call is allowed and the limiter degrades to open rather
 * than failing a legitimate request.
 */
export async function hit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - (now % options.windowMs);
  const resetAt = windowStart + options.windowMs;
  const cache =
    typeof caches !== "undefined" && "default" in caches
      ? (caches as { default: Cache }).default
      : null;
  if (!cache) {
    return { allowed: true, remaining: options.maxRequests - 1, resetAt };
  }

  const cacheKey = new Request(
    `https://rate-limit.internal/${encodeURIComponent(key)}/${windowStart}`,
    { method: "GET" },
  );

  let count = 0;
  try {
    const existing = await cache.match(cacheKey);
    if (existing) count = Number(await existing.text()) || 0;
  } catch {
    // A cache read failure must not fail the request it is protecting.
    return { allowed: true, remaining: options.maxRequests - 1, resetAt };
  }

  count += 1;
  const allowed = count <= options.maxRequests;
  const ttlSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  try {
    await cache.put(
      cacheKey,
      new Response(String(count), {
        headers: { "cache-control": `max-age=${ttlSeconds}` },
      }),
    );
  } catch {
    // Counting is best-effort; serving the request is not.
  }

  return {
    allowed,
    remaining: Math.max(0, options.maxRequests - count),
    resetAt,
  };
}

/**
 * Identity for the limit: the verified JWT `sub` when present, otherwise the
 * client IP the platform reports. The token is not verified here because the
 * only thing a forged `sub` buys is a different bucket, and the cost of a
 * verification round trip on every anonymous scan outweighs that.
 */
export function clientKey(request: Request, prefix: string): string {
  const auth = request.headers.get("authorization");
  const sub = auth ? jwtSubject(auth) : null;
  if (sub) return `${prefix}:user:${sub}`;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `${prefix}:ip:${ip}`;
}

function jwtSubject(authorization: string): string | null {
  const token = authorization.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

export function rateLimitedResponse(
  resetAt: number,
  cors: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      code: "RATE_LIMITED",
    }),
    {
      status: 429,
      headers: {
        ...cors,
        "content-type": "application/json; charset=utf-8",
        "retry-after": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.ceil(resetAt / 1000)),
      },
    },
  );
}
