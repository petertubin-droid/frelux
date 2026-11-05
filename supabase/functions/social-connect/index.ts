// =========================================================
// social-connect — FRELUX owned social account connector
//
// Serves the three paths the admin brand centre needs, so no
// FRELUX surface depends on an ARCHIE endpoint:
//   GET|POST /social-connect/authorize?platform=&redirect=
//   GET      /social-connect/callback?code=&state=   (provider redirect)
//   POST     /social-connect/callback                (code exchange)
//   POST     /social-connect/revoke
//
// Auth: authorize and the POSTs require a user bearer token, checked here
// rather than at the gateway because the provider's browser redirect cannot
// carry one. That redirect is authenticated by the HMAC signed state instead,
// and it only ever bounces back to an allowlisted page.
//
// Nothing invents a connection. A platform without credentials answers
// platform_not_configured; the exchange never writes an account row unless a
// real provider token came back.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

interface PlatformConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  pkce: boolean;
  /** Providers disagree on the name of the client identifier. */
  clientField: "client_id" | "client_key";
}

const PLATFORMS: Record<string, PlatformConfig> = {
  facebook: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["pages_manage_posts", "pages_read_engagement"],
    pkce: false,
    clientField: "client_id",
  },
  instagram: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    pkce: false,
    clientField: "client_id",
  },
  linkedin: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["w_member_social", "r_liteprofile"],
    pkce: false,
    clientField: "client_id",
  },
  x: {
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    pkce: true,
    clientField: "client_id",
  },
  tiktok: {
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish"],
    pkce: true,
    clientField: "client_key",
  },
  youtube: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    pkce: true,
    clientField: "client_id",
  },
};

const DEFAULT_REDIRECT_HOSTS = [
  "freluxtools.com",
  "www.freluxtools.com",
  "freluxtools.netlify.app",
];

const STATE_TTL_MS = 10 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalisePlatform(value: string): string {
  const key = value.trim().toLowerCase();
  if (key === "meta" || key === "fb") return "facebook";
  if (key === "ig") return "instagram";
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

/** The connector only returns the owner to a page we recognise. */
function allowedRedirect(target: string | null): string | null {
  if (!target) return null;
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  const hosts = (Deno.env.get("SOCIAL_ALLOWED_REDIRECT_HOSTS") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const allowlist = hosts.length ? hosts : DEFAULT_REDIRECT_HOSTS;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return url.toString();
  if (url.protocol !== "https:") return null;
  if (!allowlist.includes(host)) return null;
  return url.toString();
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
      client_key?: string;
      client_secret?: string;
    };
    const clientId = parsed.client_id ?? parsed.client_key;
    if (!clientId || !parsed.client_secret) return null;
    return { clientId, clientSecret: parsed.client_secret };
  } catch {
    return null;
  }
}

/** AES-256-GCM key: SOCIAL_TOKEN_KEY when set, otherwise derived from the
 *  service role key so the vault works without another secret to manage. */
async function vaultKey(): Promise<Uint8Array | null> {
  const configured = Deno.env.get("SOCIAL_TOKEN_KEY");
  if (configured) {
    try {
      const bytes = Uint8Array.from(atob(configured), (c) => c.charCodeAt(0));
      if (bytes.length === 32) return bytes;
      return null;
    } catch {
      return null;
    }
  }
  const seed = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!seed) return null;
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(seed),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("frelux-social-vault"),
      info: new TextEncoder().encode("aes-256-gcm-v1"),
    },
    material,
    256,
  );
  return new Uint8Array(bits);
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

async function exchangeCode(input: {
  config: PlatformConfig;
  credentials: { clientId: string; clientSecret: string };
  code: string;
  redirectUri: string;
  verifier: string | null;
}): Promise<
  { ok: true; token: string } | { ok: false; status: number; error: string }
> {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    [input.config.clientField]: input.credentials.clientId,
    client_secret: input.credentials.clientSecret,
  });
  if (input.verifier) form.set("code_verifier", input.verifier);

  const res = await fetch(input.config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof body.access_token === "string" ? body.access_token : "";
  if (!res.ok || !token) {
    const detail =
      typeof body.error === "string"
        ? body.error
        : typeof body.error_description === "string"
          ? body.error_description
          : undefined;
    return { ok: false, status: 502, error: detail ?? "token_exchange_failed" };
  }
  return { ok: true, token };
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

  // ---- provider redirect (browser, no bearer token) -----------------
  if (route === "callback" && req.method === "GET") {
    const code = url.searchParams.get("code") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const denied =
      url.searchParams.get("error_description") ??
      url.searchParams.get("error");
    const payload = state ? await verifyState(state) : null;
    const target = allowedRedirect(
      typeof payload?.redirect_uri === "string" ? payload.redirect_uri : null,
    );
    if (!payload || !target) return json({ error: "invalid_state" }, 400);

    const back = new URL(target);
    if (denied) back.searchParams.set("social_error", denied);
    if (code) back.searchParams.set("code", code);
    back.searchParams.set("state", state);
    back.searchParams.set("platform", String(payload.platform ?? ""));
    return new Response(null, {
      status: 302,
      headers: { Location: back.toString() },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const { data: userResult, error: userError } = await db.auth.getUser(token);
  const user = userResult?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  // ---- authorize ---------------------------------------------------
  if (
    route === "authorize" &&
    (req.method === "GET" || req.method === "POST")
  ) {
    const platform = normalisePlatform(url.searchParams.get("platform") ?? "");
    const config = PLATFORMS[platform];
    if (!config) return json({ error: "unsupported_platform", platform }, 400);

    const credentials = await resolveCredentials(platform);
    if (!credentials)
      return json({ error: "platform_not_configured", platform }, 503);

    const redirectUri = allowedRedirect(url.searchParams.get("redirect"));
    if (!redirectUri) return json({ error: "redirect_not_allowed" }, 400);

    const verifier = config.pkce
      ? b64url(crypto.getRandomValues(new Uint8Array(48)))
      : null;
    const state = await signState({
      platform,
      uid: user.id,
      exp: Date.now() + STATE_TTL_MS,
      verifier,
      redirect_uri: redirectUri,
    });

    const params = new URLSearchParams({
      [config.clientField]: credentials.clientId,
      redirect_uri: `${supabaseUrl}/functions/v1/social-connect/callback`,
      response_type: "code",
      scope: config.scopes.join(
        config.clientField === "client_key" ? "," : " ",
      ),
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
      pkce: config.pkce,
    });
  }

  // ---- code exchange -----------------------------------------------
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
    const key = await vaultKey();
    if (!key) return json({ error: "token_vault_not_configured" }, 503);

    const state =
      typeof body.state === "string" ? await verifyState(body.state) : null;
    if (typeof body.state === "string" && !state) {
      return json({ error: "invalid_state" }, 400);
    }
    if (state && state.uid && state.uid !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    const verifier =
      state && typeof state.verifier === "string"
        ? state.verifier
        : typeof body.code_verifier === "string"
          ? body.code_verifier
          : null;
    const redirectUri =
      state && typeof state.redirect_uri === "string"
        ? state.redirect_uri
        : `${supabaseUrl}/functions/v1/social-connect/callback`;

    const exchanged = await exchangeCode({
      config,
      credentials,
      code,
      redirectUri,
      verifier,
    });
    if (!exchanged.ok) {
      return json({ error: exchanged.error, platform }, exchanged.status);
    }

    const scopes =
      Array.isArray(body.scopes) && (body.scopes as string[]).length
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
    if (accountError || !account)
      return json({ error: "account_write_failed" }, 500);

    const sealed = await sealToken(exchanged.token, key);
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

    return json({ ok: true, account_id: account.id, platform });
  }

  // ---- revoke ------------------------------------------------------
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
