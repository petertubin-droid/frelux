// Supabase Edge Function: archie-owner-auth
// =========================================================
// FRELUX PHASE 8b — SERVER-SIDE OWNER AUTHORIZATION
//
// The ONLY place owner authorization is verified. Rules:
//   * The secret arrives once over HTTPS and is immediately
//     converted to a PBKDF2 hash — the plaintext secret is
//     NEVER stored, echoed in a response, logged, or placed in
//     any database field.
//   * Verification is constant-time over the derived hash.
//   * Every authorization records: authenticated owner identity,
//     audit row, before/after state, current/proposed version,
//     tests flag, rollback ref.
//   * Failures are rate-limited and recorded as security events.
//   * Only authenticated users can call this function; only
//     the OWNER can authorize production changes.
// =========================================================

import { serveWithCors } from "../_shared/serve.ts";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ITERATIONS = 310_000;

// ---- minimal fetch helpers (service role) ----------------
async function service<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      data: null,
      error: (body as { message?: string })?.message ?? `HTTP ${res.status}`,
    };
  }
  return { data: body as T, error: null };
}

function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Derive the stored verifier hash — never log or return this. */
async function deriveVerifier(
  secret: string,
  saltB64: string,
  iterations: number,
): Promise<string> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: Uint8Array.from(atob(saltB64), (c) =>
        c.charCodeAt(0),
      ) as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );
  return b64encode(new Uint8Array(bits));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomSaltB64(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return b64encode(salt);
}

// ---- rate limiting (per-user, in-memory + DB-backed events) ----
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = attempts.get(userId);
  if (!entry || entry.resetAt < now) {
    attempts.set(userId, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordAttempt(userId: string): void {
  const now = Date.now();
  const entry = attempts.get(userId);
  if (!entry || entry.resetAt < now) {
    attempts.set(userId, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

async function securityEvent(
  userId: string,
  kind: string,
  severity: "info" | "warning" | "critical",
  message: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await service("rest/v1/frelux_security_events", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      kind,
      severity,
      message,
      metadata,
    }),
  });
}

// ---- handlers ---------------------------------------------
interface Body {
  action: string;
  secret?: string;
  changeKind?: string;
  target?: string;
  currentVersion?: string;
  proposedVersion?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  testsPassed?: boolean;
  rollbackRef?: string;
  reason?: string;
  authorizationId?: string;
}

serveWithCors(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Headers":
          "authorization, content-type, x-client-info, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  // ---- authenticate the caller (normal Supabase model) ----
  const authHeader = req.headers.get("Authorization") ?? "";
  const { data: authUser, error: authError } = await service<{
    user: { id: string; email?: string };
  }>("auth/v1/user", { headers: { Authorization: authHeader } });
  if (authError || !authUser?.user?.id) {
    return json({ ok: false, error: "Authentication required." }, 401);
  }
  const userId = authUser.user.id;

  // ---- owner check: only the owner authorizes production changes ----
  // The FRELUX owner is the admin account (single-owner business
  // model — is_admin() is the authoritative server-side check).
  const profile = await service<{ is_admin: boolean }[]>(
    `rest/v1/profiles?id=eq.${userId}&select=is_admin`,
  );
  const isOwner =
    Array.isArray(profile.data) && profile.data[0]?.is_admin === true;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }

  // =========================================================
  // IMPORTANT — SECRET HANDLING
  // The `secret` field below is used ONLY to derive the
  // verifier hash. It is NEVER logged, NEVER included in any
  // response, and NEVER persisted in plaintext.
  // =========================================================

  try {
    switch (body.action) {
      case "check": {
        if (!isOwner)
          return json(
            {
              ok: false,
              error: "Only the owner may manage owner authorization.",
            },
            403,
          );
        const cred = await service<{ user_id: string }>(
          `rest/v1/frelux_owner_credentials?user_id=eq.${userId}&select=user_id`,
        );
        return json({
          ok: true,
          hasCredential: !!cred.data && (cred.data as unknown[]).length > 0,
        });
      }

      case "set-credential": {
        if (!isOwner)
          return json(
            { ok: false, error: "Only the owner may set the owner secret." },
            403,
          );
        const secret = body.secret ?? "";
        if (secret.length < 12 || /^(.)\1+$/.test(secret)) {
          return json(
            {
              ok: false,
              error:
                "The owner secret must be at least 12 characters and not all-identical.",
            },
            400,
          );
        }
        const salt = randomSaltB64();
        const hash = await deriveVerifier(secret, salt, ITERATIONS);
        const { error } = await service("rest/v1/frelux_owner_credentials", {
          method: "POST",
          body: JSON.stringify({
            user_id: userId,
            secret_hash: hash,
            salt,
            iterations: ITERATIONS,
            updated_date: new Date().toISOString(),
          }),
          headers: { Prefer: "resolution=merge-duplicates" },
        });
        if (error)
          return json(
            { ok: false, error: "Could not store the owner credential." },
            500,
          );
        // Never echo the secret or the hash.
        await securityEvent(
          userId,
          "OWNER_AUTH_SUCCEEDED",
          "info",
          "Owner credential set (secret stored as a salted hash only).",
        );
        return json({ ok: true, hasCredential: true });
      }

      case "authorize-change": {
        if (!isOwner) {
          await securityEvent(
            userId,
            "NON_OWNER_AUTH_ATTEMPT",
            "critical",
            "A non-owner account attempted an owner authorization.",
          );
          return json(
            {
              ok: false,
              error: "Only the owner can authorize production changes.",
            },
            403,
          );
        }
        if (rateLimited(userId)) {
          await securityEvent(
            userId,
            "RATE_LIMIT_HIT",
            "critical",
            "Too many authorization attempts — locked for 10 minutes.",
          );
          return json(
            {
              ok: false,
              error: "Too many failed attempts. Try again in 10 minutes.",
            },
            429,
          );
        }
        const secret = body.secret ?? "";
        const cred = await service<{
          secret_hash: string;
          salt: string;
          iterations: number;
        }>(
          `rest/v1/frelux_owner_credentials?user_id=eq.${userId}&select=secret_hash,salt,iterations`,
        );
        const credRow = Array.isArray(cred.data) ? cred.data[0] : null;
        if (!credRow)
          return json(
            { ok: false, error: "No owner credential is set. Set it first." },
            400,
          );

        const verifier = await deriveVerifier(
          secret,
          credRow.salt,
          credRow.iterations,
        );
        const verified = constantTimeEqual(verifier, credRow.secret_hash);
        if (!verified) {
          recordAttempt(userId);
          await securityEvent(
            userId,
            "OWNER_AUTH_FAILED",
            "critical",
            "An owner authorization attempt failed verification.",
          );
          return json(
            {
              ok: false,
              error: "Authorization failed — the secret did not verify.",
            },
            401,
          );
        }
        attempts.delete(userId);

        if (!body.changeKind || !body.target) {
          return json(
            { ok: false, error: "changeKind and target are required." },
            400,
          );
        }
        if (body.testsPassed !== true) {
          return json(
            {
              ok: false,
              error: "Authorized changes require a passing test run.",
            },
            400,
          );
        }
        const reason = (body.reason ?? "").trim();
        if (!reason) {
          return json(
            {
              ok: false,
              error: "Authorized changes require the reason/context.",
            },
            400,
          );
        }

        const { data: record, error: recErr } = await service<
          Record<string, unknown>
        >("rest/v1/frelux_owner_authorizations", {
          method: "POST",
          body: JSON.stringify({
            user_id: userId,
            change_kind: body.changeKind,
            target: body.target,
            current_version: body.currentVersion ?? null,
            proposed_version: body.proposedVersion ?? null,
            before_state: body.beforeState ?? {},
            after_state: body.afterState ?? {},
            tests_passed: true,
            rollback_ref: body.rollbackRef ?? null,
            reason,
            status: "AUTHORIZED",
          }),
          headers: { Prefer: "return=representation" },
        });
        if (recErr || !record) {
          return json(
            { ok: false, error: "Could not record the authorization." },
            500,
          );
        }
        await securityEvent(
          userId,
          "OWNER_AUTH_SUCCEEDED",
          "warning",
          `Owner authorized: ${body.changeKind} → ${body.target}.`,
        );
        return json({ ok: true, authorization: record });
      }

      case "record-rollback": {
        if (!isOwner)
          return json(
            { ok: false, error: "Only the owner may record rollbacks." },
            403,
          );
        if (rateLimited(userId)) {
          return json(
            { ok: false, error: "Too many attempts. Try again in 10 minutes." },
            429,
          );
        }
        const secret = body.secret ?? "";
        const cred = await service<{
          secret_hash: string;
          salt: string;
          iterations: number;
        }>(
          `rest/v1/frelux_owner_credentials?user_id=eq.${userId}&select=secret_hash,salt,iterations`,
        );
        const credRow = Array.isArray(cred.data) ? cred.data[0] : null;
        if (!credRow)
          return json({ ok: false, error: "No owner credential is set." }, 400);
        const verifier = await deriveVerifier(
          secret,
          credRow.salt,
          credRow.iterations,
        );
        if (!constantTimeEqual(verifier, credRow.secret_hash)) {
          recordAttempt(userId);
          await securityEvent(
            userId,
            "OWNER_AUTH_FAILED",
            "critical",
            "A rollback recording failed verification.",
          );
          return json({ ok: false, error: "Authorization failed." }, 401);
        }
        attempts.delete(userId);
        if (!body.authorizationId) {
          return json(
            { ok: false, error: "authorizationId is required." },
            400,
          );
        }
        const { error } = await service(
          `rest/v1/frelux_owner_authorizations?id=eq.${body.authorizationId}&user_id=eq.${userId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status: "ROLLED_BACK" }),
          },
        );
        if (error)
          return json(
            { ok: false, error: "Could not record the rollback." },
            500,
          );
        await securityEvent(
          userId,
          "OWNER_AUTH_SUCCEEDED",
          "warning",
          "A previously authorized change was rolled back.",
        );
        return json({ ok: true });
      }

      case "list": {
        if (!isOwner)
          return json(
            {
              ok: false,
              error: "Only the owner may read the authorization trail.",
            },
            403,
          );
        const rows = await service<Record<string, unknown>>(
          `rest/v1/frelux_owner_authorizations?user_id=eq.${userId}&order=created_date.desc&limit=50`,
        );
        return json({ ok: true, authorizations: rows.data ?? [] });
      }

      default:
        return json({ ok: false, error: "Unknown action." }, 400);
    }
  } catch (_e) {
    // Never log the body (it may contain the secret).
    return json(
      {
        ok: false,
        error: "The authorization service hit an unexpected error.",
      },
      500,
    );
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
