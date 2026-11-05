// =========================================================
// SOCIAL PLATFORM CREDENTIALS
//
// The OAuth credentials each platform issues for the FRELUX app:
// a client identifier and a client secret. They live in
// integration_secrets under provider_id "social_<platform>",
// which social-connect reads server side before it will start
// an authorization. A platform with no row there answers
// platform_not_configured, so the Brand Center shows which
// platforms are ready and which still need keys.
//
// Access is admin only through the existing integration_secrets
// policies (is_admin()). The secret is written once and never
// read back to the browser; the list returns a masked tail.
// =========================================================

import { supabase } from "@/lib/supabase";

export interface CredentialPlatform {
  platform: "tiktok" | "instagram";
  label: string;
  /** What the platform calls the public identifier. */
  idLabel: string;
  secretLabel: string;
  where: string;
}

export const CREDENTIAL_PLATFORMS: CredentialPlatform[] = [
  {
    platform: "tiktok",
    label: "TikTok",
    idLabel: "Client key",
    secretLabel: "Client secret",
    where:
      "developers.tiktok.com → your app → Login Kit and Content Posting API",
  },
  {
    platform: "instagram",
    label: "Instagram",
    idLabel: "Meta app ID",
    secretLabel: "App secret",
    where: "developers.facebook.com → your app → Instagram Graph API",
  },
];

export interface PlatformCredentialRow {
  platform: string;
  keyLast4: string | null;
  status: string;
  updatedAt: string | null;
}

const providerId = (platform: string) => `social_${platform}`;

export async function listPlatformCredentials(): Promise<
  Record<string, PlatformCredentialRow>
> {
  const { data, error } = await supabase
    .from("integration_secrets")
    .select("provider_id,key_last4,status,updated_at")
    .in(
      "provider_id",
      CREDENTIAL_PLATFORMS.map((p) => providerId(p.platform)),
    );
  if (error || !data) return {};
  const out: Record<string, PlatformCredentialRow> = {};
  for (const row of data as Record<string, unknown>[]) {
    const platform = String(row.provider_id ?? "").replace(/^social_/, "");
    out[platform] = {
      platform,
      keyLast4: (row.key_last4 as string | null) ?? null,
      status: String(row.status ?? "inactive"),
      updatedAt: (row.updated_at as string | null) ?? null,
    };
  }
  return out;
}

export async function savePlatformCredentials(input: {
  platform: string;
  clientId: string;
  clientSecret: string;
  label: string;
}): Promise<{ ok: boolean; error?: string }> {
  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      error: "Both the identifier and the secret are required.",
    };
  }
  if (clientSecret.length < 8) {
    return {
      ok: false,
      error: "That secret looks too short to be a real key.",
    };
  }

  const { error } = await supabase.from("integration_secrets").upsert(
    {
      provider_id: providerId(input.platform),
      key_value: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
      key_last4: clientSecret.slice(-4),
      client_visible: false,
      status: "active",
      notes: `${input.label} OAuth app credentials saved from the Brand Center.`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removePlatformCredentials(
  platform: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("integration_secrets")
    .delete()
    .eq("provider_id", providerId(platform));
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Which platforms the connector can actually start an authorization for,
 *  whether the keys came from function secrets or from this panel. */
export async function connectorPlatformStatus(): Promise<
  Record<string, { configured: boolean; source: string }>
> {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token ?? "";
  if (!token) return {};
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return {};
  try {
    const res = await fetch(`${base}/functions/v1/social-connect/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    const body = (await res.json()) as {
      platforms?: Record<string, { configured: boolean; source: string }>;
    };
    return body.platforms ?? {};
  } catch {
    return {};
  }
}
