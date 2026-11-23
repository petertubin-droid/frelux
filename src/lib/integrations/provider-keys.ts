// =========================================================
// FRELUX: EXTERNAL PROVIDER API KEYS
//
// Registry + client-side resolvers for operator-pasted
// provider keys (Admin → Integration Center → Provider Keys).
//
// Two exposure classes, mirroring the DB security model:
//   * "server"  — the key lives in integration_secrets with
//                 restricted RLS and is read exclusively by
//                 service-role edge functions at call time
//                 (Resend). The client NEVER sees it.
//   * "client"  — keys that are public by design (OpenWeather's
//                 appid already ships inside the JS bundle via
//                 VITE_OPENWEATHER_API_KEY). These are exposed
//                 through the integration_keys_public view, and
//                 only when FRELUX explicitly saved one.
//
// Resolution order (additive, env-first so existing deploys keep
// working untouched): build-time env var → admin-pasted DB key.
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type ProviderExposure = "server" | "client";
export type ProviderConsumption = "live" | "slot-ready";

export interface ProviderMeta {
  /** Primary key in integration_secrets. */
  id: string;
  label: string;
  description: string;
  exposure: ProviderExposure;
  /** Honest state of the consuming code path. */
  consumption: ProviderConsumption;
  consumptionNote: string;
  /** Build-time env var that takes precedence, if one exists. */
  envVar?: string;
  /** Where the operator gets a key. */
  docsUrl: string;
  /** Icon name rendered by FRELUX cards. */
  icon: "mail" | "cloud" | "exchange" | "bell" | "map";
}

export const PROVIDER_REGISTRY: readonly ProviderMeta[] = [
  {
    id: "resend",
    label: "Resend",
    description:
      "Transactional email: contact notifications, welcome emails, digests, workflow alerts. Pasting a key activates every email edge function — no redeploy needed.",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side: send-email, send-welcome-email, signup-digest, price-digest and subscribe-newsletter fall back to this key when the RESEND_API_KEY env var is absent. The key never reaches the browser.",
    envVar: "RESEND_API_KEY",
    docsUrl: "https://resend.com/api-keys",
    icon: "mail",
  },
  {
    id: "openweather",
    label: "OpenWeather",
    description:
      "Live forecast data for the weather intelligence banner and site weather widgets. One free key covers 1,000 calls/day at api.openweathermap.org.",
    exposure: "client",
    consumption: "live",
    consumptionNote:
      "Client-side: weather widgets read this key when VITE_OPENWEATHER_API_KEY is not baked into the build. OpenWeather appids are public by design — same exposure as the env var.",
    envVar: "VITE_OPENWEATHER_API_KEY",
    docsUrl: "https://home.openweathermap.org/api_keys",
    icon: "cloud",
  },
  {
    id: "carto",
    label: "CARTO basemaps",
    description:
      "Raster basemap tiles behind the Explore map and the 2D map panel. A key keeps FRELUX traffic attributed to its own CARTO account instead of the open CDN allowance.",
    exposure: "client",
    consumption: "live",
    consumptionNote:
      "Client-side: every tile request carries this key when VITE_CARTO_API_KEY is not baked into the build. CARTO basemap keys are public by design, like the OpenWeather appid, because the browser has to present them.",
    envVar: "VITE_CARTO_API_KEY",
    docsUrl: "https://app.carto.com/",
    icon: "map",
  },
  {
    id: "web-push-public",
    label: "Web Push (VAPID public key)",
    description:
      "The public half of the Web Push VAPID keypair: browsers need it to subscribe to workflow push notifications. Generate one pair and paste the public key here (with the private key in its own slot). No third-party account is required.",
    exposure: "client",
    consumption: "live",
    consumptionNote:
      "Client-side: the Workflows tab subscribes this browser with this key (VITE_VAPID_PUBLIC_KEY takes precedence if baked into the build). Public by design — this value cannot decrypt or send anything.",
    envVar: "VITE_VAPID_PUBLIC_KEY",
    docsUrl: "https://tools.webpush.dev/vapid-key-generator",
    icon: "bell",
  },
  {
    id: "web-push-private",
    label: "Web Push (VAPID private key)",
    description:
      "The private half of the Web Push VAPID keypair. Frelux signs every push delivery with it server-side (RFC 8292); it never reaches the browser. Generate the pair once and paste both slots together.",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side: the workflow-push edge function signs delivery with this key (VAPID_PRIVATE_KEY env var takes precedence). The key never leaves integration_secrets.",
    docsUrl: "https://tools.webpush.dev/vapid-key-generator",
    icon: "bell",
  },
  {
    id: "btcpay-url",
    label: "BTCPay Server URL (FRELUX PAY)",
    description:
      "Base URL of your BTCPay Server instance, e.g. https://btcpay.yourdomain.com. FRELUX PAY (Bitcoin and Lightning invoices) talks to the Greenfield API at this address. No trailing slash needed.",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side: btcpay-checkout, btcpay-verify and btcpay-webhook read this when BTCPAY_URL / BTCPAY_SERVER_URL is not set as an env var.",
    envVar: "BTCPAY_URL",
    docsUrl: "https://docs.btcpayserver.org/API/Greenfield/v1/",
    icon: "exchange",
  },
  {
    id: "btcpay-store-id",
    label: "BTCPay Store ID (FRELUX PAY)",
    description:
      "The store identifier from BTCPay Server → Store settings → General. Invoices are created against this store, and verify checks that the invoice belongs to it.",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side: read by btcpay-checkout / btcpay-verify when BTCPAY_STORE_ID is not set as an env var.",
    envVar: "BTCPAY_STORE_ID",
    docsUrl: "https://docs.btcpayserver.org/API/Greenfield/v1/",
    icon: "exchange",
  },
  {
    id: "btcpay-api-key",
    label: "BTCPay API Key (FRELUX PAY)",
    description:
      "A store-scoped Greenfield API key from BTCPay Server → Account → API Keys, with the invoice permissions (btcpay.store.cancreateinvoice, btcpay.store.canviewinvoices). This is the key FRELUX PAY needs to create and read Bitcoin invoices.",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side only: used by btcpay-checkout / btcpay-verify / btcpay-webhook when BTCPAY_API_KEY is not set as an env var. The key never reaches the browser.",
    envVar: "BTCPAY_API_KEY",
    docsUrl:
      "https://docs.btcpayserver.org/API/Greenfield/v1/#section/Authentication",
    icon: "exchange",
  },
  {
    id: "btcpay-webhook-secret",
    label: "BTCPay Webhook Secret (FRELUX PAY)",
    description:
      "The secret you set on the BTCPay webhook pointing at /functions/v1/btcpay-webhook. FRELUX uses it to verify the BTCPay-Sig HMAC-SHA256 header, so a forged payment confirmation is refused.",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side: btcpay-webhook verifies every delivery against this secret (BTCPAY_WEBHOOK_SECRET env var takes precedence). Without it, webhooks are refused rather than trusted.",
    envVar: "BTCPAY_WEBHOOK_SECRET",
    docsUrl: "https://docs.btcpayserver.org/API/Greenfield/v1/#tag/Webhooks",
    icon: "exchange",
  },
  {
    id: "nowpayments-api-key",
    label: "NOWPayments API Key (FRELUX PAY)",
    description:
      "Your NOWPayments production API key from Store settings → API keys. Used server-side to generate dynamic multi-crypto invoices (Bitcoin, Ethereum, USDT, Solana, and 200+ coins).",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side only: read by nowpayments-checkout and nowpayments-verify when NOWPAYMENTS_API_KEY is not set as an env var. The key never reaches the browser.",
    envVar: "NOWPAYMENTS_API_KEY",
    docsUrl:
      "https://documenter.getpostman.com/view/7907941/2s93JtP3x6#authentication",
    icon: "exchange",
  },
  {
    id: "nowpayments-ipn-secret",
    label: "NOWPayments IPN Secret Key (FRELUX PAY)",
    description:
      "The Instant Payment Notification (IPN) secret key from Store settings. FRELUX PAY uses this secret to verify the x-nowpayments-sig HMAC-SHA512 header on incoming payment notifications.",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side only: nowpayments-webhook verifies every IPN notification against this secret before crediting accounts. Without it, incoming webhooks are refused.",
    envVar: "NOWPAYMENTS_IPN_SECRET",
    docsUrl: "https://nowpayments.io/doc",
    icon: "exchange",
  },
  {
    id: "flutterwave-secret-key",
    label: "Flutterwave Secret Key (card payments)",
    description:
      "Your Flutterwave secret key (Dashboard → Settings → API Keys, starting FLWSECK-). Server-side only: it creates hosted checkout links and verifies transactions. Use the test key first; live keys settle real money.",
    exposure: "server",
    consumption: "live",
    consumptionNote:
      "Server-side: flutterwave-checkout, flutterwave-verify and flutterwave-webhook read this when FLUTTERWAVE_SECRET_KEY is not set as an env var. The key never reaches the browser.",
    envVar: "FLUTTERWAVE_SECRET_KEY",
    docsUrl: "https://developer.flutterwave.com/docs/authentication",
    icon: "exchange",
  },
  {
    id: "open-exchange-rates",
    label: "Open Exchange Rates",
    description:
      "App-ID for the FX rates layer. Reserved for payable-grade currency conversion once settlement features are enabled.",
    exposure: "server",
    consumption: "slot-ready",
    consumptionNote:
      "Slot ready: the FX layer still uses the keyless display-rate feed with manual overrides. This key activates payable-grade endpoints when they are wired; it is stored now so no migration is needed later.",
    docsUrl: "https://openexchangerates.org/signup",
    icon: "exchange",
  },
] as const;

export function getProviderMeta(id: string): ProviderMeta | undefined {
  return PROVIDER_REGISTRY.find((p) => p.id === id);
}

// ---------------------------------------------------------
// Client-safe key resolution (client-visible providers only)
// ---------------------------------------------------------

const clientKeyCache = new Map<string, { value: string; at: number }>();
const CLIENT_KEY_TTL_MS = 5 * 60 * 1000;

/**
 * Resolves a CLIENT-SAFE provider key at runtime:
 * build-time env var first (existing deploys unchanged), then
 * FRELUX-pasted key from integration_keys_public.
 * Returns undefined when neither exists — callers keep their
 * honest no-key fallback (e.g. seasonal weather estimates).
 */
export async function resolveClientProviderKey(
  providerId: string,
): Promise<string | undefined> {
  const meta = getProviderMeta(providerId);
  if (meta?.exposure !== "client") return undefined;

  // Build-time key wins: no network round-trip, zero behavior
  // change for already-configured deployments.
  if (meta.envVar) {
    const envKey = import.meta.env[meta.envVar as string];
    if (envKey) return envKey;
  }

  const cached = clientKeyCache.get(providerId);
  if (cached && Date.now() - cached.at < CLIENT_KEY_TTL_MS) {
    return cached.value;
  }

  if (!isSupabaseConfigured) return undefined;
  const { data, error } = await supabase
    .from("integration_keys_public")
    .select("key_value")
    .eq("provider_id", providerId)
    .maybeSingle();
  if (error || !data?.key_value) return undefined;

  clientKeyCache.set(providerId, {
    value: data.key_value,
    at: Date.now(),
  });
  return data.key_value;
}

/** Test hook: clears the in-memory key cache. */
export function clearClientProviderKeyCache(): void {
  clientKeyCache.clear();
}

// ---------------------------------------------------------
// Admin helpers (Integration Center). NEVER select key_value.
// ---------------------------------------------------------

export interface IntegrationSecretMeta {
  provider_id: string;
  key_last4: string;
  status: "active" | "disabled";
  updated_at: string;
  created_at: string;
}

/** Masked metadata for every stored key. Raw values never load. */
export async function listIntegrationSecrets(): Promise<
  IntegrationSecretMeta[]
> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("integration_secrets")
    .select("provider_id,key_last4,status,updated_at,created_at")
    .order("provider_id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    status: r.status === "disabled" ? "disabled" : "active",
  }));
}

/** Upsert (save or rotate) a provider key. Server-side stores it; only last4 is kept for display. */
export async function saveIntegrationSecret(
  providerId: string,
  rawKey: string,
): Promise<IntegrationSecretMeta> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const value = rawKey.trim();
  if (!value) throw new Error("Empty key");
  const meta = getProviderMeta(providerId);
  if (!meta) throw new Error(`Unknown provider: ${providerId}`);
  if (providerId === "resend" && !/^re_[A-Za-z0-9_]+$/.test(value)) {
    throw new Error("Resend keys start with 're_' — check the pasted value");
  }
  if (
    (providerId === "web-push-public" || providerId === "web-push-private") &&
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new Error("VAPID keys are base64url — check the pasted value");
  }

  const { data, error } = await supabase
    .from("integration_secrets")
    .upsert(
      {
        provider_id: providerId,
        key_value: value,
        key_last4: value.slice(-4),
        client_visible: meta.exposure === "client",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_id" },
    )
    .select("provider_id,key_last4,status,updated_at,created_at")
    .single();
  if (error) throw error;

  if (meta.exposure === "client") clearClientProviderKeyCache();
  return {
    ...data,
    status: data.status === "disabled" ? "disabled" : "active",
  };
}

/** Enable or disable a stored key without deleting it (e.g. quota exhausted). */
export async function setIntegrationSecretStatus(
  providerId: string,
  status: "active" | "disabled",
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("integration_secrets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("provider_id", providerId);
  if (error) throw error;
  clearClientProviderKeyCache();
}

/** Removes the stored key entirely. */
export async function deleteIntegrationSecret(
  providerId: string,
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("integration_secrets")
    .delete()
    .eq("provider_id", providerId);
  if (error) throw error;
  clearClientProviderKeyCache();
}
