/**
 * POST /api/fn/turnstile-verify — native Worker port of
 * supabase/functions/turnstile-verify.
 *
 * Public on purpose (verify_jwt = false on the Supabase side): the widget is
 * solved before a visitor has a session. It answers one question only — "did
 * Cloudflare just vouch for this token, for this action, on this hostname?" —
 * so any handler that takes a bot-prone submission can gate on it.
 *
 * Contract is byte-identical to the Supabase function so the frontend does not
 * change: `{ ok: true }` | `{ ok: true, configured: false }` when the secret is
 * not installed | 403 `{ ok: false, error }` | 400 / 405 / 429 with the same
 * error strings. The verdict comes from the same shared module the Supabase
 * function uses, not a reimplementation.
 */
import { json, type ApiEnv } from "../api";
import {
  parseHostnames,
  verifyTurnstile,
} from "../../../supabase/functions/_shared/turnstile";
import { RATE_LIMITS, clientKey, hit } from "./rate-limit";

export async function turnstileVerify(
  request: Request,
  env: ApiEnv,
  _url: URL,
  cors: Record<string, string> = {},
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method" }, 405, cors);
  }

  const limited = await hit(
    clientKey(request, "turnstile-verify"),
    RATE_LIMITS.GENERAL,
  );
  if (!limited.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, cors);
  }

  let payload: { token?: unknown; action?: unknown };
  try {
    payload = (await request.json()) as { token?: unknown; action?: unknown };
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, cors);
  }

  const action =
    typeof payload.action === "string" ? payload.action.trim() : "";
  // Actions are fixed strings chosen by the app, never free text.
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(action)) {
    return json({ ok: false, error: "invalid_action" }, 400, cors);
  }

  const secret = env.TURNSTILE_SECRET;
  const hostnames = env.TURNSTILE_HOSTNAMES;

  // Not installed yet: the widget is live but the server cannot verify, so the
  // form behaves exactly as it did before Turnstile. Installing the secret
  // turns enforcement on; a client cannot cause this state.
  if (!secret || parseHostnames(hostnames).size === 0) {
    return json({ ok: true, configured: false }, 200, cors);
  }

  const verdict = await verifyTurnstile({
    token: typeof payload.token === "string" ? payload.token : null,
    action,
    secret,
    hostnames,
    remoteIp:
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for"),
  });

  if (!verdict.ok) return json({ ok: false, error: verdict.reason }, 403, cors);
  return json({ ok: true }, 200, cors);
}
