// =========================================================
// Shared CORS helpers for Supabase Edge Functions
//
// Origin Echo allowlist (see _shared/serve.ts — serveWithCors applies it
// at the response boundary of every function, overriding any
// stale header a handler set itself):
//
//   - ARCHIE_ALLOWED_ORIGINS env var (comma-separated) sets
//     the allowlist per deployment. The special value `*`
//     restores the legacy wildcard explicitly.
//   - Default (env unset): production webapp origins
//     (freluxtools.com, www.freluxtools.com, frelux.lovable.app, netlify),
//     Lovable preview/sandbox domains (*.lovable.app, *.lovableproject.com, lovable.dev),
//     and local dev origins (localhost / 127.0.0.1 on all ports).
//   - A request whose Origin header is allowed gets that exact origin echoed with Vary: Origin.
//   - A request with NO Origin header (server-to-server, curl, webhooks) gets no ACAO header.
//   - An UNLISTED origin gets no ACAO header: the browser blocks the cross-origin read.
// =========================================================

import { getSiteUrl } from "./site.ts";

export const PRODUCTION_ORIGINS: readonly string[] = [
  getSiteUrl(),
  "https://freluxtools.com",
  "https://www.freluxtools.com",
  "http://freluxtools.com",
  "http://www.freluxtools.com",
  "https://freluxtools.netlify.app",
  "https://frelux.lovable.app",
];

/** Local development origins (vite dev server common ports). */
export const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8080",
] as const;

/** Configured allowlist — deploy-driven via ARCHIE_ALLOWED_ORIGINS
 *  (comma-separated exact origins; `*` restores the wildcard). */
export function allowedOrigins(): string[] {
  const deno = (
    globalThis as {
      Deno?: { env?: { get?: (k: string) => string | undefined } };
    }
  ).Deno;
  const configured = deno?.env?.get?.("ARCHIE_ALLOWED_ORIGINS");
  if (!configured) return [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];
  return configured
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Check if an origin is permitted by policy, allowlist, or pattern matching. */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const configured = allowedOrigins();
  if (configured.includes("*") || configured.includes(origin)) return true;
  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  if ((DEV_ORIGINS as readonly string[]).includes(origin)) return true;

  // Netlify previews
  if (/^https:\/\/[a-z0-9-]+--freluxtools\.netlify\.app$/i.test(origin)) return true;

  // Lovable preview, staging, projects, and editor surfaces
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i.test(origin)) return true;
  if (/^https:\/\/(.*\.)?lovable\.dev$/i.test(origin)) return true;

  // Local development on any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;

  return false;
}

const DEFAULT_INVOKE_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-client-version, x-client-hash, x-supabase-api-version, x-frelux-signature, x-paystack-signature, verif-hash, x-flutterwave-signature, accept, cache-control, pragma";

/** Per-request CORS headers. `req` is REQUIRED by design: the
 *  origin decision is per-request, never cached across
 *  requests on an isolate. */
export function resolveCorsHeaders(req: Request): Record<string, string> {
  const requestedHeaders = req.headers.get("access-control-request-headers");
  const allowHeaders = requestedHeaders?.trim()
    ? `${DEFAULT_INVOKE_HEADERS}, ${requestedHeaders.trim()}`
    : DEFAULT_INVOKE_HEADERS;

  const base: Record<string, string> = {
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Allow-Methods":
      "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
    "Access-Control-Max-Age": "86400",
  };
  const origins = allowedOrigins();
  if (origins.includes("*")) {
    return { "Access-Control-Allow-Origin": "*", ...base };
  }
  const origin = req.headers.get("origin");
  if (!origin) return base;
  if (isOriginAllowed(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      ...base,
    };
  }
  return { Vary: "Origin", ...base };
}

/** Back-compat header set for the legacy helpers below —
 *  deliberately WITHOUT Access-Control-Allow-Origin: the
 *  serveWithCors boundary is the single authority for ACAO. */
export const corsHeaders = {
  "Access-Control-Allow-Headers": DEFAULT_INVOKE_HEADERS,
  "Access-Control-Allow-Methods":
    "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
} as const;

/** OPTIONS preflight — echoes the allowed origin (or omits
 *  ACAO for unlisted origins, which is the block). */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: resolveCorsHeaders(req) });
  }
  return null;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  message: string,
  status = 400,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse({ error: message }, status, extraHeaders);
}

export function rateLimitedResponse(resetAt: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
