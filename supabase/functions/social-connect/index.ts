// =========================================================
// social-connect — FRELUX owned social account connector
//
// Replaces the three paths the admin brand centre used to call
// on the ARCHIE social function, so FRELUX owns its own OAuth
// surface:
//   GET  /social-connect/authorize?platform=<platform>
//   POST /social-connect/callback
//   POST /social-connect/revoke
//
// Nothing here invents a connection. A platform without
// credentials answers 503 platform_not_configured, a missing
// vault key answers 503 token_vault_not_configured, and only a
// real provider code exchange writes an account row.
//
// Credentials come from integration_secrets (provider_id
// social_<platform>, key_value JSON {client_id, client_secret})
// or the matching environment variables. The vault key comes
// from SOCIAL_TOKEN_KEY (32 byte base64) and encrypts the
// refresh/access token with AES-256-GCM before it is stored in
// public.frelux_social_tokens.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

interface PlatformConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  pkce: boolean;
  authStyle: "query" | "form";
}

const PLATFORMS: Record<string, PlatformConfig> = {
  facebook: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["pages_manage_posts", "pages_read_engagement"],
    pkce: false,
    authStyle: "query",
  },
  instagram: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish"],
    pkce: false,
    authStyle: "query",
  },
  linkedin: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["w_member_social", "r_liteprofile"],
    pkce: false,
    authStyle: "form",
  },
  x: {
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    pkce: true,
    authStyle: "form",
  },
  tiktok: {
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish"],
    pkce: true,
    authStyle: "form",
  },
  youtube: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    pkce: true,
    authStyle: "form",
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalisePlatform(value: string): string {
  const key = value.trim().toLowerCase();
  if (key === "meta") return "facebook";
  if (key === "twitter") return "x";
  if (key === "yt") return "youtube";
  return key;
}

function b64url(bytes: Uint8Array): string {
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return b64url(new Uint8Array(sig));
}

function stateSecret(): string | null {
  return (
    Deno.env.get("SOCIAL_STATE_SECRET") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    null
  );
}

async function signState(payload: Record<string, unknown>): Promise<string> {
  const secret = stateSecret();
  if (!secret) throw new Error("state secret unavailable");
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await hmac(body, secret)}`;
}

async function verifyState(
  state: string,
): Promise<Record<string, unknown> | null> {
  const secret = stateSecret();
  if (!secret) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  if ((await hmac(body, secret)) !== sig) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body)) as Record<string, unknown>;
    if (typeof payload.exp !== "number" || payload.exp < Date.now())
      return null;
    return payload;
  } catch {
    return null;
  }
}

async function resolveCredentials(
  platform: string,
): Promise<{ clientId: string; clientSecret: string } | null> {
  const upper = platform.toUpperCase();
  const envId = Deno.env.get(`${upper}_CLIENT_ID`);
  const envSecret = Deno.env.get(`${upper}_CLIENT_SECRET`);
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret };

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/integration_secrets?select=key_value&provider_id=eq.social_${platform}&status=eq.active`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const raw =
      Array.isArray(rows) && rows[0]?.key_value ? rows[0].key_value : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      client_id?: string;
      client_secret?: string;
    };
    if (!parsed.client_id || !parsed.client_secret) return null;
    return { clientId: parsed.client_id, clientSecret: parsed.client_secret };
  } catch {
    return null;
  }
}

function vaultKey(): Uint8Array | null {
  const raw = Deno.env.get("SOCIAL_TOKEN_KEY");
  if (!raw) return null;
  try {
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

async function sealToken(token: string, key: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(token),
  );
  const bytes = new Uint8Array(iv.length + sealed.byteLength);
  bytes.set(iv, 0);
  bytes.set(new Uint8Array(sealed), iv.length);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop() ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey)
    return json({ error: "not configured" }, 503);

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const { data: userResult, error: userError } = await db.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  // ---- authorize -------------------------------------------------
  if (
    route === "authorize" &&
    (req.method === "GET" || req.method === "POST")
  ) {
    const platform = normalisePlatform(url.searchParams.get("platform") ?? "");
    const config = PLATFORMS[platform];
    if (!config) return json({ error: "unsupported_platform", platform }, 400);

    const credentials = await resolveCredentials(platform);
    if (!credentials) {
      return json({ error: "platform_not_configured", platform }, 503);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/social-connect/callback`;
    const verifier = config.pkce
      ? b64url(crypto.getRandomValues(new Uint8Array(48)))
      : null;
    const state = await signState({
      platform,
      uid: user.id,
      exp: Date.now() + 10 * 60 * 1000,
      verifier,
    });

    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      state,
    });
    if (verifier) {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verifier),
      );
      params.set("code_challenge", b64url(new Uint8Array(digest)));
      params.set("code_challenge_method", "S256");
    }

    return json({
      authorize_url: `${config.authorizeUrl}?${params.toString()}`,
      platform,
    });
  }

  // ---- callback --------------------------------------------------
  if (route === "callback" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const platform = normalisePlatform(String(body.platform ?? ""));
    const config = PLATFORMS[platform];
    if (!config) return json({ error: "unsupported_platform", platform }, 400);

    const code = typeof body.code === "string" ? body.code.trim() : "";
    const handle =
      typeof body.account_handle === "string" ? body.account_handle.trim() : "";
    if (!code || !handle)
      return json({ error: "code and account_handle required" }, 400);

    const credentials = await resolveCredentials(platform);
    if (!credentials)
      return json({ error: "platform_not_configured", platform }, 503);
    const key = vaultKey();
    if (!key) return json({ error: "token_vault_not_configured" }, 503);

    const verifier =
      typeof body.code_verifier === "string" ? body.code_verifier : null;
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${supabaseUrl}/functions/v1/social-connect/callback`,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });
    if (verifier) {
      form.set("code_verifier", verifier);
    }

    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
    });
    const tokenBody = (await tokenRes.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const accessToken =
      typeof tokenBody.access_token === "string" ? tokenBody.access_token : "";
    if (!tokenRes.ok || !accessToken) {
      return json(
        {
          error: "token_exchange_failed",
          status: tokenRes.status,
          detail:
            typeof tokenBody.error === "string" ? tokenBody.error : undefined,
        },
        502,
      );
    }

    const scopes = Array.isArray(body.scopes)
      ? (body.scopes as string[])
      : config.scopes;
    const { data: account, error: accountError } = await db
      .from("frelux_social_accounts")
      .insert({
        platform,
        account_handle: handle,
        status: "CONNECTED",
        connection_kind: "oauth",
        scopes,
        owner_explicitly_authorized: true,
        connected_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select("id")
      .single();
    if (accountError || !account) {
      return json({ error: "account_write_failed" }, 500);
    }

    const sealed = await sealToken(accessToken, key);
    const { error: tokenError } = await db.from("frelux_social_tokens").insert({
      account_id: account.id,
      token_ciphertext: `\\x${sealed}`,
      key_version: 1,
      rotated_at: new Date().toISOString(),
    });
    if (tokenError) {
      await db.from("frelux_social_accounts").delete().eq("id", account.id);
      return json({ error: "vault_write_failed" }, 500);
    }

    return json({ ok: true, account_id: account.id });
  }

  // ---- revoke ----------------------------------------------------
  if (route === "revoke" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const accountId =
      typeof body.account_id === "string" ? body.account_id : "";
    if (!accountId) return json({ error: "account_id required" }, 400);

    const { data: account } = await db
      .from("frelux_social_accounts")
      .select("id, created_by")
      .eq("id", accountId)
      .maybeSingle();
    if (!account) return json({ error: "account_not_found" }, 404);
    if (account.created_by && account.created_by !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    const { error: tokenError } = await db
      .from("frelux_social_tokens")
      .delete()
      .eq("account_id", accountId);
    if (tokenError) return json({ error: "vault_delete_failed" }, 500);

    const { error: accountError } = await db
      .from("frelux_social_accounts")
      .update({ status: "DISCONNECTED", synced_at: new Date().toISOString() })
      .eq("id", accountId);
    if (accountError) return json({ error: "account_update_failed" }, 500);

    return json({ ok: true });
  }

  return json({ error: "not found" }, 404);
};

serveWithCors(handler);
