// =========================================================
// FRELUX Payment Gateway Dispatch
//
// Paystack remains the default and flagship gateway for Nigeria.
// Admin can select Stripe (international) or Flutterwave
// (Pan-African) in Admin Settings → Payment gateway.
//
// Safety rule: checkout NEVER breaks. If the selected gateway is
// not configured (missing publishable key or its edge function is
// not deployed), we fall back to Paystack and log the reason.
//
// Stripe/Flutterwave require:
//   - VITE_STRIPE_PUBLISHABLE_KEY / VITE_FLUTTERWAVE_PUBLIC_KEY (frontend)
//   - a deployed `<gateway>-checkout` edge function holding the secret key
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { initializeSubscriptionCheckout } from "@/lib/paystack";
import type { SubscriptionPlan } from "@/lib/subscription";

export type PaymentGateway = "paystack" | "stripe" | "flutterwave";

export const PAYMENT_GATEWAYS: PaymentGateway[] = [
  "paystack",
  "stripe",
  "flutterwave",
];

export interface GatewayRuntimeConfig {
  stripePublishableKey?: string;
  flutterwavePublicKey?: string;
}

export function parseGateway(value: unknown): PaymentGateway {
  return PAYMENT_GATEWAYS.includes(value as PaymentGateway)
    ? (value as PaymentGateway)
    : "paystack";
}

export function isStripeConfigured(cfg: GatewayRuntimeConfig): boolean {
  return Boolean(cfg.stripePublishableKey);
}

export function isFlutterwaveConfigured(cfg: GatewayRuntimeConfig): boolean {
  return Boolean(cfg.flutterwavePublicKey);
}

export interface ResolvedGateway {
  gateway: PaymentGateway;
  /** Set when the admin-selected gateway was unavailable and we fell back. */
  fallbackFrom?: PaymentGateway;
  reason?: string;
}

/**
 * Pure resolution: which gateway actually runs checkout given the admin
 * setting and what is configured in this build. Paystack is always safe.
 */
export function resolveCheckoutGateway(
  setting: unknown,
  cfg: GatewayRuntimeConfig,
): ResolvedGateway {
  const wanted = parseGateway(setting);
  if (wanted === "paystack") return { gateway: "paystack" };

  const configured =
    wanted === "stripe"
      ? isStripeConfigured(cfg)
      : isFlutterwaveConfigured(cfg);

  if (configured) return { gateway: wanted };

  return {
    gateway: "paystack",
    fallbackFrom: wanted,
    reason: `${wanted} is selected but not configured in this build; falling back to Paystack.`,
  };
}

export function currentGatewayRuntimeConfig(): GatewayRuntimeConfig {
  return {
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    flutterwavePublicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
  };
}

/** Read the admin-configured gateway from site_settings (anon-readable). */
export async function fetchConfiguredGateway(): Promise<PaymentGateway> {
  if (!isSupabaseConfigured) return "paystack";
  const { data } = await supabase
    .from("site_settings")
    .select("payment_gateway")
    .limit(1)
    .maybeSingle();
  return parseGateway(
    (data as { payment_gateway?: unknown } | null)?.payment_gateway,
  );
}

export type CheckoutStartResult =
  { authorization_url: string } | { error: string };

/**
 * Start subscription checkout through the effective gateway.
 * Same return shape as initializeSubscriptionCheckout so the
 * Pricing page treats both identically.
 */
export async function startSubscriptionCheckout(
  planId: SubscriptionPlan,
  billingCycle: "monthly" | "yearly",
  amountMinor: number,
  email: string,
  userId: string,
): Promise<CheckoutStartResult> {
  const wanted = await fetchConfiguredGateway();
  const resolved = resolveCheckoutGateway(
    wanted,
    currentGatewayRuntimeConfig(),
  );

  if (resolved.fallbackFrom) {
    console.info(`[payments] ${resolved.reason}`);
  }

  if (resolved.gateway === "paystack") {
    const result = await initializeSubscriptionCheckout(
      planId,
      billingCycle,
      amountMinor,
      email,
      userId,
    );
    if ("error" in result) return { error: result.error };
    return { authorization_url: result.authorization_url };
  }

  // Stripe / Flutterwave: secret key stays server-side in the
  // `<gateway>-checkout` edge function (same pattern as paystack-checkout).
  const { data, error } = await supabase.functions.invoke(
    `${resolved.gateway}-checkout`,
    {
      body: {
        plan_id: planId,
        billing_cycle: billingCycle,
        amount_minor: amountMinor,
        email,
        user_id: userId,
      },
    },
  );
  if (error) {
    return {
      error: `${resolved.gateway} checkout is unavailable (${error.message}). Falling back is required — configure the gateway or contact support.`,
    };
  }
  const url = (data as { authorization_url?: string } | null)
    ?.authorization_url;
  if (!url) {
    return { error: `${resolved.gateway} did not return a payment URL.` };
  }
  return { authorization_url: url };
}
