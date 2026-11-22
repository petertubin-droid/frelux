// =========================================================
// Shared provider-secret resolution (server-side only).
//
// Environment variable first (existing deploys unchanged), then the key
// pasted in Admin -> Integration Center -> Provider Keys
// (integration_secrets, admin-only RLS). Same contract as the Resend
// fallback in send-email: the browser never sees these values.
//
// Honest limit: a secret is only read when the function runs, so a key
// pasted after a request has started applies to the next one. Nothing is
// cached here on purpose, so revoking a key in the admin takes effect on
// the next call rather than at some later expiry.
// =========================================================

export async function resolveProviderSecret(
  envNames: readonly string[],
  providerId: string,
): Promise<string> {
  for (const name of envNames) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return "";
  try {
    const res = await fetch(
      `${url}/rest/v1/integration_secrets?select=key_value&provider_id=eq.${providerId}&status=eq.active`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!res.ok) return "";
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.key_value ? rows[0].key_value : "";
  } catch {
    return "";
  }
}
