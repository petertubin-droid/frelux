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

import {
  supabase,
  isSupabaseConfigured,
  getFunctionErrorMessage,
} from "@/lib/supabase";
import {
  initializeSubscriptionCheckout,
  isPaystackConfigured,
} from "@/lib/paystack";
import type { SubscriptionPlan } from "@/lib/subscription";

/**
 * Two gateways, split by what can actually settle the money.
 *
 * Paystack charges in its own settlement currencies (NGN, GHS, ZAR, KES).
 * Flutterwave covers everywhere else and also gives an international card a
 * route into an African market, so it is never wrong, only slower.
 *
 * Stripe was removed rather than repaired: it had no signature-verified
 * webhook, so a payment could succeed without ever crediting a purchase.
 * Running two working rails is better than three where one takes money it
 * cannot honour.
 */
export type PaymentGateway = "paystack" | "flutterwave";

export const PAYMENT_GATEWAYS: PaymentGateway[] = ["paystack", "flutterwave"];

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

  const configured = isFlutterwaveConfigured(cfg);
  if (configured) return { gateway: wanted };

  return {
    gateway: "paystack",
    fallbackFrom: wanted,
    reason: `${wanted} is selected but not configured in this build; falling back to Paystack.`,
  };
}

/**
 * Gateways with a browser-side checkout path. Both use hosted Edge Function
 * checkout, so their secret configuration cannot be inferred from VITE_
 * variables and neither is hidden on that basis.
 */
export function availableGateways(
  _cfg: GatewayRuntimeConfig,
): PaymentGateway[] {
  return ["paystack", "flutterwave"];
}

/**
 * The rail is decided by the currency being charged, not by where the buyer
 * happens to be sitting, because that is what the server does:
 * `providerForCurrency` in supabase/functions/_shared/escrow_providers.ts keeps
 * naira on Paystack and sends every other currency to Flutterwave. Two list of
 * countries used to disagree with that rule, which is how a Ghanaian buyer could
 * be sent to a rail the server would not have chosen.
 *
 * Paystack's account can also settle GHS, ZAR and KES. Adding them here (and to
 * the server map) is a one-line change once the Paystack account is enabled for
 * those countries; until then they go to Flutterwave, which settles them today.
 */
export const PAYSTACK_CURRENCIES: readonly string[] = ["NGN"];

/** Settlement currency for the markets FRELUX lists. */
const MARKET_CURRENCY: Record<string, string> = {
  NG: "NGN",
  GH: "GHS",
  ZA: "ZAR",
  KE: "KES",
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  NL: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  AE: "AED",
  EG: "EGP",
};

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
  const code = String(marketCode || "").toUpperCase();
  return gatewayForCurrency(MARKET_CURRENCY[code]);
}

/** The settlement currency FRELUX assumes for a market, when it knows one. */
export function currencyForMarket(
  marketCode?: string | null,
): string | undefined {
  return MARKET_CURRENCY[String(marketCode || "").toUpperCase()];
}

/**
 * Checkout gateways for a market, primary first. Paystack is only offered
 * where it settles locally; Flutterwave stays available everywhere so an
 * African buyer can still pay by international card.
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
  /** Browser-reported country, used to gate the domestic naira price list. */
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
        // The market's own price row is what the page showed; the server
        // resolves and quotes it, never trusting an amount here.
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
   * configured, it wins over FRELUX default; otherwise FRELUX
   * default (with Paystack fallback) runs. Both gateways stay live:
   * FRELUX setting is the default, never a kill switch.
   */
  preferred?: PaymentGateway,
  /**
   * Visitor market. Paystack cannot settle currencies outside NGN/GHS/ZAR/KES,
   * so a non-African market switches the default to Flutterwave even when the
   * admin default is Paystack. An explicit user choice still wins.
   */
  marketCode?: string | null,
  /** Browser-reported country, used to gate the domestic naira price list. */
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
      marketCode,
      originMarketCode,
    );
    if (!("error" in result)) {
      return { authorization_url: result.authorization_url };
    }

    // A rejected Paystack API key is a server configuration failure, not a
    // failed transaction. Retry via Flutterwave's hosted checkout before any
    // charge exists. Never retry after a redirect or verification attempt.
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

  return { error: "Stripe checkout is not available in this checkout flow." };
}
