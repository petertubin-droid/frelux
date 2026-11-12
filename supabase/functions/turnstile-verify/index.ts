// =========================================================
// POST /functions/v1/turnstile-verify { token, action }
//   -> { ok: true } | 403 { ok: false, error }
//
// Public on purpose (verify_jwt = false): the widget is solved
// before a visitor has a session. It answers one question only
// — "did Cloudflare just vouch for this token, for this action,
// on this hostname?" — so any handler that takes a bot-prone
// submission can gate on it before writing or sending.
//
// Secrets come from the function environment:
//   TURNSTILE_SECRET     the widget's secret key
//   TURNSTILE_HOSTNAMES  comma-separated allowlist of frontend
//                        hostnames (never include localhost in
//                        the production value)
// =========================================================

import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";
import { parseHostnames, verifyTurnstile } from "../_shared/turnstile.ts";

const envVar = (name: string): string | undefined =>
  (
    globalThis as {
      Deno?: { env: { get: (key: string) => string | undefined } };
    }
  ).Deno?.env.get(name);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serveWithCors(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  const limited = checkRateLimit(getRateLimitKey(req), RATE_LIMITS.GENERAL);
  if (!limited.allowed) return json({ ok: false, error: "rate_limited" }, 429);

  let payload: { token?: unknown; action?: unknown };
  try {
    payload = (await req.json()) as { token?: unknown; action?: unknown };
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const action =
    typeof payload.action === "string" ? payload.action.trim() : "";
  // Actions are fixed strings chosen by the app, never free text.
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(action))
    return json({ ok: false, error: "invalid_action" }, 400);

  const secret = envVar("TURNSTILE_SECRET");
  const hostnames = envVar("TURNSTILE_HOSTNAMES");

  // Not installed yet: the widget is live but the server cannot verify, so the
  // form behaves exactly as it did before Turnstile. Installing the secret
  // turns enforcement on; there is no way for a client to cause this state.
  if (!secret || parseHostnames(hostnames).size === 0) {
    return json({ ok: true, configured: false });
  }

  const verdict = await verifyTurnstile({
    token: typeof payload.token === "string" ? payload.token : null,
    action,
    secret,
    hostnames,
    remoteIp:
      req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for"),
  });

  if (!verdict.ok) return json({ ok: false, error: verdict.reason }, 403);
  return json({ ok: true });
});
