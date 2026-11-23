// =========================================================
// Ported: turnstile-verify
//
// Public on purpose: the widget is solved before a visitor has a session.
// It answers one question - did Cloudflare just vouch for this token, for this
// action, on an allowlisted hostname - and refuses rather than guessing when a
// binding is missing (empty hostname list fails closed).
// =========================================================

import {
  checkRateLimit,
  clientKey,
  hasBindings,
  json,
  type EdgeEnv,
  type EdgeHandler,
} from "./runtime";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

export const requiredBindings = ["TURNSTILE_SECRET", "TURNSTILE_HOSTNAMES"] as const;

export function parseHostnames(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const turnstileVerifyHandler: EdgeHandler = async (
  request,
  env,
  _ctx,
  cors,
) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, cors);
  }

  const limit = checkRateLimit(`turnstile:${clientKey(request)}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ ok: false, error: "RATE_LIMITED" }),
      {
        status: 429,
        headers: {
          ...cors,
          "content-type": "application/json",
          "retry-after": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  let payload: { token?: unknown; action?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400, cors);
  }

  const token = typeof payload.token === "string" ? payload.token : "";
  const action = typeof payload.action === "string" ? payload.action : "";
  if (!token) return json({ ok: false, error: "missing-token" }, 403, cors);
  if (token.length > MAX_TOKEN_LENGTH) {
    return json({ ok: false, error: "token-too-long" }, 403, cors);
  }
  if (!hasBindings(env, ["TURNSTILE_SECRET"])) {
    // Fails closed: an unconfigured secret must not wave traffic through.
    return json({ ok: false, error: "missing-secret" }, 503, cors);
  }
  const hostnames = parseHostnames(env.TURNSTILE_HOSTNAMES as string | undefined);
  if (hostnames.size === 0) {
    return json({ ok: false, error: "no-hostnames" }, 503, cors);
  }

  const form = new FormData();
  form.append("secret", String(env.TURNSTILE_SECRET));
  form.append("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) form.append("remoteip", ip);

  let verdict: {
    success?: boolean;
    action?: string;
    hostname?: string;
    "error-codes"?: string[];
  };
  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body: form });
    verdict = (await res.json()) as typeof verdict;
  } catch {
    return json({ ok: false, error: "network" }, 502, cors);
  }

  if (verdict.success !== true) {
    return json(
      { ok: false, error: "siteverify-failed", codes: verdict["error-codes"] ?? [] },
      403,
      cors,
    );
  }
  if (action && verdict.action !== action) {
    return json(
      { ok: false, error: "action-mismatch", expected: action, got: verdict.action ?? null },
      403,
      cors,
    );
  }
  const hostname = (verdict.hostname ?? "").toLowerCase();
  if (!hostname || !hostnames.has(hostname)) {
    return json(
      { ok: false, error: "hostname-not-allowed", hostname: verdict.hostname ?? null },
      403,
      cors,
    );
  }

  return json({ ok: true, hostname: verdict.hostname ?? null }, 200, cors);
};

export const turnstileVerifyConfig = {
  name: "turnstile-verify",
  methods: ["POST"],
  requiredBindings: [...requiredBindings],
  handler: turnstileVerifyHandler,
};
