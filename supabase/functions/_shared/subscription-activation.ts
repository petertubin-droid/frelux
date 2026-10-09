// =========================================================
// Shared subscription activation — idempotent via the
// subscription_purchases ledger (migration 20261009180000).
//
// The full-site audit (2026-10-09, Phase 7) found that both the
// verify endpoints and the webhooks upserted user_paid_status
// directly with paid_until = now + plan days on EVERY call, so
// replaying one successful payment reference extended the
// subscription forever. All four activation sites now call the
// apply_subscription_purchase RPC instead: the (provider,
// reference) pair is inserted with ON CONFLICT DO NOTHING, and a
// row that already exists means the payment was already processed
// and paid_until is left untouched.
//
// The caller is responsible for everything that must happen BEFORE
// activation: provider-side transaction verification, webhook
// signature validation, and server-side price validation.
// =========================================================

export type SubscriptionActivationResult = {
  /** True when this reference had not been seen before and the grant was applied. */
  applied: boolean;
  /** True when the (provider, reference) pair was already in the ledger. */
  alreadyApplied: boolean;
  /** The granted expiry, only present when applied. */
  paidUntil: string | null;
};

export async function applySubscriptionPurchase(
  admin: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  },
  args: {
    userId: string;
    provider: "paystack" | "flutterwave";
    reference: string;
    plan: string;
    billingCycle: string;
    amountKobo: number;
    currency?: string;
    days: number;
    providerCustomerId?: string | null;
  },
): Promise<
  | { ok: true; result: SubscriptionActivationResult }
  | { ok: false; error: string }
> {
  const rpc = await admin.rpc("apply_subscription_purchase", {
    p_user_id: args.userId,
    p_provider: args.provider,
    p_reference: args.reference,
    p_plan: args.plan,
    p_billing_cycle: args.billingCycle,
    p_amount_kobo: args.amountKobo,
    p_days: args.days,
    p_currency: args.currency ?? "NGN",
    p_provider_customer_id: args.providerCustomerId ?? null,
  });
  if (rpc.error) return { ok: false, error: rpc.error.message };
  const row = (rpc.data as unknown as Array<Record<string, unknown>>)?.[0];
  const applied = Boolean(row?.applied);
  return {
    ok: true,
    result: {
      applied,
      alreadyApplied: !applied,
      paidUntil: applied ? String(row?.paid_until ?? "") || null : null,
    },
  };
}
