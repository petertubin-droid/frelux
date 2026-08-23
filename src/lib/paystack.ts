// =========================================================
// FRELUX Paystack Payment Integration
//
// Handles subscription checkout via Paystack (Nigerian market).
// Flow:
// 1. User selects a plan on /pricing
// 2. We initialize a Paystack transaction (server-side via edge function)
// 3. User is redirected to Paystack's secure checkout
// 4. On success, Paystack calls our webhook → activates subscription
// 5. Fallback: user can also verify manually via callback URL
//
// Requires env vars:
// - VITE_PAYSTACK_PUBLIC_KEY — public key for frontend initialization
// - PAYSTACK_SECRET_KEY — secret key (edge function / server only)
// =========================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { SubscriptionPlan } from '@/lib/subscription';

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number; // in kobo
    currency: string;
    status: 'success' | 'failed' | 'abandoned';
    customer: {
      email: string;
      first_name?: string;
      last_name?: string;
    };
    metadata: {
      plan: SubscriptionPlan;
      billing_cycle: 'monthly' | 'yearly';
      user_id?: string;
      custom_fields?: { display_name: string; variable_name: string; value: string }[];
    };
  };
}

/**
 * Initialize a Paystack transaction for subscription checkout.
 * Calls the Supabase edge function `paystack-checkout` which holds the secret key.
 */
export async function initializeSubscriptionCheckout(
  plan: SubscriptionPlan,
  billingCycle: 'monthly' | 'yearly',
  amountInKobo: number,
  email: string,
  userId: string,
): Promise<{ authorization_url: string; reference: string } | { error: string }> {
  if (!isSupabaseConfigured) {
    return { error: 'Payment system is not configured. Please try again later.' };
  }

  const reference = `FRELUX_${plan}_${billingCycle}_${userId.slice(0, 8)}_${Date.now()}`;

  // Call the edge function
  const { data, error } = await supabase.functions.invoke('paystack-checkout', {
    body: {
      email,
      amount: amountInKobo, // Paystack expects kobo (1 NGN = 100 kobo)
      reference,
      plan,
      billing_cycle: billingCycle,
      user_id: userId,
      callback_url: `${window.location.origin}/pricing?status=verify&ref=${reference}`,
      metadata: {
        plan,
        billing_cycle: billingCycle,
        user_id: userId,
        custom_fields: [
          { display_name: 'Plan', variable_name: 'plan', value: plan },
          { display_name: 'Billing Cycle', variable_name: 'billing_cycle', value: billingCycle },
          { display_name: 'Platform', variable_name: 'platform', value: 'FRELUX' },
        ],
      },
    },
  });

  if (error) {
    return { error: error.message || 'Failed to initialize payment. Please try again.' };
  }

  if (!data?.data?.authorization_url) {
    return { error: 'Invalid response from payment server.' };
  }

  return {
    authorization_url: data.data.authorization_url,
    reference: data.data.reference || reference,
  };
}

/**
 * Verify a Paystack transaction after the user returns from checkout.
 * Calls the edge function `paystack-verify`.
 */
export async function verifyPayment(reference: string): Promise<{ verified: boolean; plan?: SubscriptionPlan; error?: string }> {
  if (!isSupabaseConfigured) {
    return { verified: false, error: 'Payment system is not configured.' };
  }

  const { data, error } = await supabase.functions.invoke('paystack-verify', {
    body: { reference },
  });

  if (error) {
    return { verified: false, error: error.message };
  }

  if (!data?.status) {
    return { verified: false, error: data?.message || 'Payment verification failed.' };
  }

  return {
    verified: data.data.status === 'success',
    plan: data.data.metadata?.plan,
  };
}

/**
 * Check if Paystack is configured (public key exists).
 */
export function isPaystackConfigured(): boolean {
  return !!(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY);
}

/**
 * Get the Paystack public key.
 */
export function getPaystackPublicKey(): string {
  return import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? '';
}
