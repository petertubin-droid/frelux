import { CURRENCY_REGISTRY } from "@studio-shared/currency-registry";
// =========================================================
// FRELUX Payment Gateway Dispatch
//
// Paystack remains the default and flagship gateway for Nigeria.
// Admin can select Stripe (international), Flutterwave (Pan-African),
// or NOWPayments / BTCPay (FRELUX PAY borderless crypto) in Admin Settings.
//
// Paystack and Flutterwave use server-created hosted checkout URLs, so their
// secret keys must stay in Edge Function secrets and cannot be inferred from
// browser environment variables. NOWPayments and BTCPay use server-priced
// crypto invoices. The server reports missing/invalid provider credentials.
// =========================================================

import {
  supabase,
  isSupabaseConfigured,
  getFunctionErrorMessage,
} from "@/lib/supabase";
import {
  initializeSubscriptionCheckout,
  isPaystackConfigured,
} from "@/lib/paystack";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import type { SubscriptionPlan } from "@/lib/subscription";

export type PaymentGateway =
  "paystack" | "flutterwave" | "nowpayments" | "btcpay";

export const PAYMENT_GATEWAYS: PaymentGateway[] = [
  "paystack",
  "flutterwave",
  "nowpayments",
  "btcpay",
];

export interface GatewayRuntimeConfig {
  flutterwavePublicKey?: string;
}

export function parseGateway(value: unknown): PaymentGateway {
  return PAYMENT_GATEWAYS.includes(value as PaymentGateway)
    ? (value as PaymentGateway)
    : "paystack";
}

export function isFlutterwaveConfigured(_cfg: GatewayRuntimeConfig): boolean {
  // Flutterwave uses a server-created hosted checkout link. Its secret key is
  // configured on the Edge Function, and no browser public key is used here.
  return true;
}

export interface ResolvedGateway {
  gateway: PaymentGateway;
  /** Set when FRELUX-selected gateway was unavailable and we fell back. */
  fallbackFrom?: PaymentGateway;
  reason?: string;
}

/**
 * Pure resolution: which gateway runs hosted checkout given FRELUX
 * setting and what is available to the browser. Server-side secret validity
 * is reported by checkout, never guessed from client environment variables.
 */
export function resolveCheckoutGateway(
  setting: unknown,
  cfg: GatewayRuntimeConfig,
): ResolvedGateway {
  const wanted = parseGateway(setting);
  if (wanted === "paystack") return { gateway: "paystack" };
  if (wanted === "nowpayments") return { gateway: "nowpayments" };
  if (wanted === "btcpay") return { gateway: "btcpay" };

  const configured = isFlutterwaveConfigured(cfg);
  if (configured) return { gateway: wanted };

  return {
    gateway: "paystack",
    fallbackFrom: wanted,
    reason: `${wanted} is selected but not configured in this build; falling back to Paystack.`,
  };
}

/**
 * Gateways with a browser-side checkout path.
 */
export function availableGateways(
  _cfg: GatewayRuntimeConfig,
): PaymentGateway[] {
  return ["paystack", "flutterwave", "nowpayments", "btcpay"];
}

export const PAYSTACK_CURRENCIES = Object.freeze(
  Object.entries(CURRENCY_REGISTRY)
    .filter(([, rules]) => rules.rails.includes("paystack"))
    .map(([code]) => code),
);

/** Settlement currency per listed market, from the built-in profiles. */
function marketCurrency(marketCode?: string | null): string | undefined {
  const code = String(marketCode || "").toUpperCase();
  if (!code) return undefined;
  return BUILTIN_MARKET_PROFILES.find((p) => p.country_code === code)
    ?.currency_code;
}

/** The gateway that can settle a charge in this currency. */
export function gatewayForCurrency(currency?: string | null): PaymentGateway {
  const code = String(currency || "").toUpperCase();
  return PAYSTACK_CURRENCIES.includes(code) ? "paystack" : "flutterwave";
}

/**
 * The gateway for a market, via its settlement currency. A market FRELUX does
 * not list has no known currency, so it is treated as international rather than
 * guessed at naira.
 */
export function gatewayForMarket(marketCode?: string | null): PaymentGateway {
  return gatewayForCurrency(marketCurrency(marketCode) ?? null);
}

/** The settlement currency FRELUX assumes for a market, when it knows one. */
export function currencyForMarket(
  marketCode?: string | null,
): string | undefined {
  return marketCurrency(marketCode);
}

/**
 * Checkout gateways for a market, primary first. Paystack is only offered
 * where it settles locally; Flutterwave and crypto stay available everywhere.
 */
export function gatewaysForMarket(
  marketCode: string | null | undefined,
  cfg: GatewayRuntimeConfig,
): PaymentGateway[] {
  const primary = gatewayForMarket(marketCode);
  const available = availableGateways(cfg);
  const ordered = [primary, ...available.filter((g) => g !== primary)];
  return ordered.filter((g) => g !== "paystack" || primary === "paystack");
}

export function currentGatewayRuntimeConfig(): GatewayRuntimeConfig {
  return {
    flutterwavePublicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
  };
}

/** Read FRELUX-configured gateway from site_settings (anon-readable). */
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
  marketCode?: string | null,
  originMarketCode?: string | null,
): Promise<CheckoutStartResult> {
  const { data, error } = await supabase.functions.invoke(
    "flutterwave-checkout",
    {
      body: {
        plan_id: planId,
        billing_cycle: billingCycle,
        amount_minor: amountMinor,
        email,
        user_id: userId,
        market_code: marketCode ?? null,
        origin_market: originMarketCode ?? null,
      },
    },
  );
  if (error) {
    return { error: await getFunctionErrorMessage(error) };
  }
  const url = (data as { authorization_url?: string } | null)
    ?.authorization_url;
  return url
    ? { authorization_url: url }
    : {
        error:
          (data as { error?: string } | null)?.error ??
          "Flutterwave did not return a payment URL.",
      };
}

/**
 * Start subscription checkout through the effective gateway.
 */
export async function startSubscriptionCheckout(
  planId: SubscriptionPlan,
  billingCycle: "monthly" | "yearly",
  amountMinor: number,
  email: string,
  userId: string,
  preferred?: PaymentGateway,
  marketCode?: string | null,
  originMarketCode?: string | null,
): Promise<CheckoutStartResult> {
  const wanted = marketCode
    ? gatewayForMarket(marketCode)
    : await fetchConfiguredGateway();
  const cfg = currentGatewayRuntimeConfig();
  let resolved = resolveCheckoutGateway(wanted, cfg);
  if (preferred) {
    resolved = resolveCheckoutGateway(preferred, cfg);
    if (resolved.fallbackFrom && parseGateway(wanted) !== "paystack") {
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
      marketCode,
      originMarketCode,
    );
    if (!("error" in result)) {
      return { authorization_url: result.authorization_url };
    }

    if (
      /(?:invalid|incorrect|unauthori[sz]ed).{0,30}(?:api[\s_-]*)?key|(?:api[\s_-]*)?key.{0,30}(?:invalid|incorrect)/i.test(
        result.error,
      )
    ) {
      const fallback = await initializeFlutterwaveSubscription(
        planId,
        billingCycle,
        amountMinor,
        email,
        userId,
        marketCode,
        originMarketCode,
      );
      if ("authorization_url" in fallback) return fallback;
      return {
        error: `Paystack rejected its API key. Flutterwave fallback could not start: ${fallback.error}`,
      };
    }
    return { error: result.error };
  }

  if (resolved.gateway === "nowpayments") {
    try {
      const { initializeNowPaymentsCheckout } =
        await import("@/lib/payments/nowpayments");
      const res = await initializeNowPaymentsCheckout({
        planId,
        billingCycle,
        marketCode,
        originMarketCode,
        email,
      });
      return { authorization_url: res.checkout_url };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `FRELUX PAY (NOWPayments) checkout error: ${msg}` };
    }
  }

  if (resolved.gateway === "btcpay") {
    try {
      const { initializeBtcPayCheckout } =
        await import("@/lib/payments/btcpay");
      const btcRes = await initializeBtcPayCheckout({
        planId,
        billingCycle,
        marketCode,
        originMarketCode,
        email,
      });
      return { authorization_url: btcRes.checkout_url };
    } catch (btcErr: unknown) {
      const msg = btcErr instanceof Error ? btcErr.message : String(btcErr);
      return { error: `FRELUX PAY (Bitcoin) checkout error: ${msg}` };
    }
  }

  if (resolved.gateway === "flutterwave") {
    return initializeFlutterwaveSubscription(
      planId,
      billingCycle,
      amountMinor,
      email,
      userId,
      marketCode,
      originMarketCode,
    );
  }

  return {
    error: "Selected payment gateway is not available in this checkout flow.",
  };
}
