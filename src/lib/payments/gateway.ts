// =========================================================
// FRELUX Payment Gateway Dispatch
//
// Paystack remains the default and flagship gateway for Nigeria.
// Admin can select Stripe (international) or Flutterwave
// (Pan-African) in Admin Settings → Payment gateway.
//
// Paystack and Flutterwave use server-created hosted checkout URLs, so their
// secret keys must stay in Edge Function secrets and cannot be inferred from
// browser environment variables. Stripe still requires a browser publishable
// key. The server reports missing/invalid provider credentials at checkout.
// =========================================================

import { supabase, isSupabaseConfigured, getFunctionErrorMessage } from "@/lib/supabase";
import {
  initializeSubscriptionCheckout,
  isPaystackConfigured,
} from "@/lib/paystack";
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

export function isFlutterwaveConfigured(_cfg: GatewayRuntimeConfig): boolean {
  // Flutterwave uses a server-created hosted checkout link. Its secret key is
  // configured on the Edge Function, and no browser public key is used here.
  return true;
}

export interface ResolvedGateway {
  gateway: PaymentGateway;
  /** Set when the admin-selected gateway was unavailable and we fell back. */
  fallbackFrom?: PaymentGateway;
  reason?: string;
}

/**
 * Pure resolution: which gateway runs hosted checkout given the admin
 * setting and what is available to the browser. Server-side secret validity
 * is reported by checkout, never guessed from client environment variables.
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

/**
 * Gateways with a browser-side checkout path. Paystack/Flutterwave use
 * hosted Edge Function checkout, so their secret configuration is not visible
 * here. Stripe still requires its public browser key.
 */
export function availableGateways(cfg: GatewayRuntimeConfig): PaymentGateway[] {
  // Paystack and Flutterwave both use hosted checkout initialized by Edge
  // Functions. Their server-side secret keys cannot be reliably inferred from
  // VITE_ variables, so don't hide these gateways based on unused public keys.
  const list: PaymentGateway[] = ["paystack", "flutterwave"];
  if (isStripeConfigured(cfg)) list.push("stripe");
  return list;
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

async function initializeFlutterwaveSubscription(
  planId: SubscriptionPlan,
  billingCycle: "monthly" | "yearly",
  amountMinor: number,
  email: string,
  userId: string,
): Promise<CheckoutStartResult> {
  const { data, error } = await supabase.functions.invoke("flutterwave-checkout", {
    body: {
      plan_id: planId,
      billing_cycle: billingCycle,
      amount_minor: amountMinor,
      email,
      user_id: userId,
    },
  });
  if (error) {
    return { error: await getFunctionErrorMessage(error) };
  }
  const url = (data as { authorization_url?: string } | null)?.authorization_url;
  return url
    ? { authorization_url: url }
    : { error: (data as { error?: string } | null)?.error ?? "Flutterwave did not return a payment URL." };
}

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
  /**
   * Explicit user choice from the checkout selector. When set and
   * configured, it wins over the admin default; otherwise the admin
   * default (with Paystack fallback) runs. Both gateways stay live:
   * the admin setting is the default, never a kill switch.
   */
  preferred?: PaymentGateway,
): Promise<CheckoutStartResult> {
  const wanted = await fetchConfiguredGateway();
  const cfg = currentGatewayRuntimeConfig();
  let resolved = resolveCheckoutGateway(wanted, cfg);
  if (preferred) {
    resolved = resolveCheckoutGateway(preferred, cfg);
    if (resolved.fallbackFrom && parseGateway(wanted) !== "paystack") {
      // User's pick is not configured in this build; fall back to the
      // admin default resolution rather than silently to Paystack.
      resolved = resolveCheckoutGateway(wanted, cfg);
    }
  }

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
    if (!("error" in result)) {
      return { authorization_url: result.authorization_url };
    }

    // A rejected Paystack API key is a server configuration failure, not a
    // failed transaction. Retry via Flutterwave's hosted checkout before any
    // charge exists. Never retry after a redirect or verification attempt.
    if (/(?:invalid|incorrect|unauthori[sz]ed).{0,30}(?:api[\s_-]*)?key|(?:api[\s_-]*)?key.{0,30}(?:invalid|incorrect)/i.test(result.error)) {
      const fallback = await initializeFlutterwaveSubscription(
        planId, billingCycle, amountMinor, email, userId,
      );
      if ("authorization_url" in fallback) return fallback;
      return {
        error: `Paystack rejected its API key. Flutterwave fallback could not start: ${fallback.error}`,
      };
    }
    return { error: result.error };
  }

  if (resolved.gateway === "flutterwave") {
    return initializeFlutterwaveSubscription(
      planId, billingCycle, amountMinor, email, userId,
    );
  }

  return { error: "Stripe checkout is not available in this checkout flow." };
}
