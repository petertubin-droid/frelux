/**
 * Google credential resolver shared by the SEO functions.
 *
 * Three routes, in order of preference:
 *  1. GOOGLE_SERVICE_ACCOUNT_JSON - a service account key. The account's
 *     address is added as a user on the Search Console property, so there is no
 *     consent screen and no expiring token to refresh by hand.
 *  2. GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN - an OAuth
 *     refresh token minted into short-lived access tokens per worker.
 *  3. GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN - a static access token, honoured so a
 *     deployment that already has one keeps working until it expires.
 *
 * getGoogleAuth() never throws for a missing credential: it returns an empty
 * token plus the provider's own message, so callers can report an honest
 * "not connected" state instead of inventing data.
 */
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";
const STATIC_TOKEN = Deno.env.get("GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN") ?? "";

const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "";

let cachedToken: { value: string; expiresAt: number } | null = null;
let authError = "";

function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Service account keys skip the consent screen entirely: sign a JWT, trade it
 *  for an access token, and add the account's address as a Search Console user. */
async function serviceAccountToken(): Promise<string> {
  let sa: { client_email?: string; private_key?: string } = {};
  try {
    sa = JSON.parse(SA_JSON);
  } catch {
    return "";
  }
  if (!sa.client_email || !sa.private_key) return "";
  const issued = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: issued,
      exp: issued + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`)),
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    authError = [data.error, data.error_description].filter(Boolean).join(": ");
    return "";
  }
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

/** Mint an access token per invocation. A refresh token keeps the dashboard
 *  working past the one hour life of a hand-copied access token; a static
 *  access token is still honoured so an existing deployment keeps running. */
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  if (SA_JSON) {
    const fromKey = await serviceAccountToken();
    if (fromKey) return fromKey;
  }
  if (REFRESH_TOKEN && CLIENT_ID && CLIENT_SECRET) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!res.ok || !data.access_token) {
      authError = [data.error, data.error_description].filter(Boolean).join(": ");
      return "";
    }
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  }
  return STATIC_TOKEN;
}

export async function getGoogleAuth(): Promise<{ token: string; error: string }> {
  authError = "";
  const token = await accessToken();
  return { token, error: token ? "" : authError };
}

/** Exposed for diagnostics scripts; the functions use getGoogleAuth(). */
export { accessToken };
