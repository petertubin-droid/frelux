/**
 * Edge API surface for the FRELUX Worker.
 *
 * Three small, stateless endpoints that belong at the edge:
 *
 *   POST /api/turnstile    the canonical siteverify check, run one hop from the
 *                          visitor instead of from a Supabase function
 *   ANY  /api/fn/:name     a gateway in front of the Supabase functions, so the
 *                          browser has one origin and no project URL to guess
 *   POST /api/hook/:name   a signature-checked relay for provider webhooks
 *
 * The turnstile check is imported from the shared module the Supabase functions
 * use, not reimplemented: one widget, one verdict.
 */
import { verifyTurnstile } from "../../supabase/functions/_shared/turnstile";

/**
 * Public, slow-changing GET reads that are safe to answer from the edge cache.
 * A hit costs no Supabase invocation at all, which is the whole point: the
 * gateway alone still bills one call per request.
 *
 * Only names listed here are cached, only GET, and never when the caller sent
 * an Authorization header, so a per-user answer can never be shared.
 */
export const CACHEABLE_READS: Record<string, number> = {
  "price-index-api": 600,
  health: 60,
};

export interface ApiEnv {
  SUPABASE_URL?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_HOSTNAMES?: string;
  WEBHOOK_SECRET?: string;
}

export const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

/** Function names are slugs, so a caller can never steer the target anywhere. */
const SLUG = /^[a-z0-9][a-z0-9-]{1,60}$/;

/**
 * "name": "supabase-function-slug". A hook is inert until it is listed here and
 * WEBHOOK_SECRET is set, so nothing can be relayed by accident.
 */
export const HOOKS: Record<string, string> = {};

/** Only these travel to the function. Host, cookie and CF metadata stay here. */
const FORWARDED_HEADERS = [
  "authorization",
  "apikey",
  "content-type",
  "accept",
  "x-client-info",
  "x-frelux-signature",
];

const ALLOWED_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

const stripTrailing = (value: string) => value.replace(/\/+$/, "");

/* ------------------------------------------------------------------ turnstile */

export async function handleTurnstile(
  request: Request,
  env: ApiEnv,
  cors: Record<string, string>,
): Promise<Response> {
  if (!env.TURNSTILE_SECRET || !env.TURNSTILE_HOSTNAMES)
    return json({ ok: false, reason: "not-configured" }, 503, cors);

  let body: { token?: unknown; action?: unknown } | null = null;
  try {
    body = (await request.json()) as { token?: unknown; action?: unknown };
  } catch {
    return json({ ok: false, reason: "invalid-json" }, 400, cors);
  }

  const token = typeof body?.token === "string" ? body.token : "";
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  if (!action) return json({ ok: false, reason: "missing-action" }, 400, cors);

  const verdict = await verifyTurnstile({
    token,
    action,
    secret: env.TURNSTILE_SECRET,
    hostnames: env.TURNSTILE_HOSTNAMES,
    remoteIp: request.headers.get("cf-connecting-ip"),
  });

  if (!verdict.ok)
    return json(
      { ok: false, reason: verdict.reason },
      verdict.reason === "network" ? 502 : 403,
      cors,
    );

  return json({ ok: true, hostname: verdict.hostname }, 200, cors);
}

/* -------------------------------------------------------------------- gateway */

export async function handleGateway(
  request: Request,
  env: ApiEnv,
  url: URL,
  cors: Record<string, string>,
  ctx?: { waitUntil: (p: Promise<unknown>) => void },
): Promise<Response> {
  const name = decodeURIComponent(url.pathname.slice("/api/fn/".length));
  if (!SLUG.test(name)) return json({ error: "Unknown function" }, 404, cors);
  if (!ALLOWED_METHODS.has(request.method))
    return json({ error: "Method not allowed" }, 405, cors);
  if (!env.SUPABASE_URL)
    return json({ error: "Gateway not configured" }, 503, cors);

  const ttl = CACHEABLE_READS[name];
  const cache =
    ttl &&
    request.method === "GET" &&
    !request.headers.get("authorization") &&
    typeof caches !== "undefined" &&
    "default" in caches
      ? (caches as { default: Cache }).default
      : null;
  const cacheKey = cache
    ? new Request(`${url.origin}${url.pathname}${url.search}`, {
        method: "GET",
      })
    : null;

  if (cache && cacheKey) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      // A cached 200 is served as-is; the marker makes an edge hit visible in
      // devtools instead of looking like a fast origin.
      const headers = new Headers(hit.headers);
      headers.set("x-frelux-cache", "hit");
      return new Response(hit.body, { status: hit.status, headers });
    }
  }

  const headers = new Headers();
  for (const header of FORWARDED_HEADERS) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    // Buffer rather than stream: functions read the body once and the size is
    // already bounded by the platform.
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${stripTrailing(env.SUPABASE_URL)}/functions/v1/${name}${url.search}`,
      init,
    );
  } catch {
    return json({ error: "Upstream unreachable" }, 502, cors);
  }

  const responseHeaders: Record<string, string> = { ...cors };
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders["content-type"] = contentType;
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) responseHeaders["cache-control"] = cacheControl;

  if (cache && cacheKey && ttl) {
    responseHeaders["x-frelux-cache"] = "miss";
    if (upstream.ok && upstream.status === 200) {
      responseHeaders["cache-control"] =
        `public, max-age=${ttl}, s-maxage=${ttl}`;
      const copy = new Response(upstream.clone().body, {
        status: 200,
        headers: { ...responseHeaders },
      });
      const put = cache.put(cacheKey, copy).catch(() => undefined);
      if (ctx?.waitUntil) ctx.waitUntil(put);
      else await put;
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

/* ---------------------------------------------------------------------- hooks */

/** Hex HMAC-SHA256 of the raw body, compared without leaking the position. */
export async function signatureMatches(
  secret: string,
  body: ArrayBuffer,
  header: string,
): Promise<boolean> {
  const provided = header
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  let expected = "";
  for (const byte of digest) expected += byte.toString(16).padStart(2, "0");

  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1)
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

export async function handleHook(
  request: Request,
  env: ApiEnv,
  url: URL,
  cors: Record<string, string>,
): Promise<Response> {
  const name = decodeURIComponent(url.pathname.slice("/api/hook/".length));
  const target = HOOKS[name];
  if (!target || !SLUG.test(name))
    return json({ error: "Unknown hook" }, 404, cors);
  if (!env.WEBHOOK_SECRET || !env.SUPABASE_URL)
    return json({ error: "Hooks not configured" }, 503, cors);

  const raw = await request.arrayBuffer();
  const signature = request.headers.get("x-frelux-signature") ?? "";
  if (!(await signatureMatches(env.WEBHOOK_SECRET, raw, signature)))
    return json({ error: "Invalid signature" }, 401, cors);

  const headers = new Headers();
  for (const header of FORWARDED_HEADERS) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }
  headers.set("x-frelux-hook", name);

  let upstream: Response;
  try {
    upstream = await fetch(
      `${stripTrailing(env.SUPABASE_URL)}/functions/v1/${target}`,
      { method: "POST", headers, body: raw },
    );
  } catch {
    return json({ error: "Upstream unreachable" }, 502, cors);
  }

  // The provider only needs to know the event landed; the target's own answer
  // stays out of the response so its internals are not exposed to the sender.
  return json({ received: true, status: upstream.status }, 202, cors);
}
