// =========================================================
// Turnstile siteverify — one canonical check for every edge
// function that accepts a visitor-submitted form.
//
// The contract is Cloudflare's: POST the widget token to
// siteverify, then require success === true, the exact action
// the widget was rendered with, and a hostname on the
// allowlist. A token is only valid once, so the caller must
// reject before doing any work (insert, email, credit spend).
// =========================================================

export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cloudflare caps the token at 2048 bytes; anything longer is not ours. */
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileFailure =
  | "missing-token"
  | "token-too-long"
  | "missing-secret"
  | "no-hostnames"
  | "network"
  | "siteverify-failed"
  | "action-mismatch"
  | "hostname-not-allowed";

export type TurnstileVerdict =
  | { ok: true; hostname: string | null }
  | { ok: false; reason: TurnstileFailure };

export type TurnstileVerifyInput = {
  token: string | null | undefined;
  action: string;
  secret: string | undefined;
  /** Comma-separated allowlist. Empty means "not configured", which fails closed. */
  hostnames: string | undefined;
  remoteIp?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/** Split the allowlist env into a set, lowercased and trimmed. */
export function parseHostnames(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

type SiteverifyBody = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(
  input: TurnstileVerifyInput,
): Promise<TurnstileVerdict> {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (!token) return { ok: false, reason: "missing-token" };
  if (token.length > MAX_TOKEN_LENGTH)
    return { ok: false, reason: "token-too-long" };
  if (!input.secret) return { ok: false, reason: "missing-secret" };

  const expectedHostnames = parseHostnames(input.hostnames);
  if (expectedHostnames.size === 0)
    return { ok: false, reason: "no-hostnames" };

  const body = new URLSearchParams({ secret: input.secret, response: token });
  if (input.remoteIp) body.set("remoteip", input.remoteIp);

  let result: SiteverifyBody;
  try {
    const response = await (input.fetchImpl ?? fetch)(
      TURNSTILE_SITEVERIFY_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(input.timeoutMs ?? 10_000),
        body,
      },
    );
    if (!response.ok) return { ok: false, reason: "siteverify-failed" };
    result = (await response.json()) as SiteverifyBody;
  } catch {
    return { ok: false, reason: "network" };
  }

  if (result.success !== true)
    return { ok: false, reason: "siteverify-failed" };

  // One widget renders one action; a token minted for `contact` must never
  // satisfy `signup`.
  if ((result.action ?? "") !== input.action)
    return { ok: false, reason: "action-mismatch" };

  const hostname = (result.hostname ?? "").toLowerCase();
  if (!hostname || !expectedHostnames.has(hostname))
    return { ok: false, reason: "hostname-not-allowed" };

  return { ok: true, hostname };
}
