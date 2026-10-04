/**
 * Stripe checkout gateway — international cards.
 *
 * Paystack remains the default checkout (Nigeria + African cards).
 * When VITE_STRIPE_PUBLISHABLE_KEY + the deployed `stripe-checkout`
 * edge function (STRIPE_SECRET_KEY) are configured, the pricing page
 * can offer Stripe Checkout so US/EU/Asia visitors can pay in their
 * own currency. Until then every call throws NotConfiguredError and
 * callers fall back to Paystack — no partial checkout states.
 */
import { getSupabase } from "@/lib/supabase-lazy";

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe checkout is not configured for this deployment");
    this.name = "StripeNotConfiguredError";
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
}

export interface StripeCheckoutRequest {
  planId: string;
  cycle: "monthly" | "yearly";
  currency?: string; // ISO 4217; the edge function maps to a Stripe price
}

export async function createStripeCheckout(
  req: StripeCheckoutRequest,
): Promise<{ url: string }> {
  if (!isStripeConfigured()) throw new StripeNotConfiguredError();
  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: req,
  });
  if (error) throw error;
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error("stripe-checkout returned no session URL");
  return { url };
}
