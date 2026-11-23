// =========================================================
// Cloudflare port runtime: the shared contract for functions that RUN here.
//
// A ported function is a plain handler in this folder, registered by name in
// registry.ts. The Worker executes it locally; any name that is not registered
// keeps proxying to Supabase, so the migration is additive and a missing port
// degrades to the old path rather than to an outage.
//
// What a port must NOT do:
//  - invent a value when a binding is missing. Every port returns an explicit
//    503 "not configured" instead of a fabricated success.
//  - read Deno globals. Bindings arrive as the Worker `env` object.
// =========================================================

export interface EdgeEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALLOWED_ORIGINS?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_HOSTNAMES?: string;
  [key: string]: unknown;
}

export type EdgeContext = {
  waitUntil?: (promise: Promise<unknown>) => void;
};

export type EdgeHandler = (
  request: Request,
  env: EdgeEnv,
  ctx: EdgeContext,
  cors: Record<string, string>,
) => Promise<Response> | Response;

export function json(
  body: unknown,
  status = 200,
  cors: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

/** True when every named binding is present and non-empty. */
export function hasBindings(
  env: EdgeEnv,
  names: readonly string[],
): boolean {
  return names.every((name) => {
    const value = env[name];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/** The binding names a port requires; used by tests and the /health report. */
export function missingBindings(
  env: EdgeEnv,
  names: readonly string[],
): string[] {
  return names.filter((name) => {
    const value = env[name];
    return !(typeof value === "string" && value.trim().length > 0);
  });
}

/** Constant-time string compare for shared secrets. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** In-memory rate limiter, per isolate. Honest limit: not global. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number },
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= options.maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("cf-connecting-ip");
  if (forwarded) return forwarded;
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  const auth = request.headers.get("authorization");
  return auth ? `token:${auth.slice(-24)}` : "anonymous";
}
