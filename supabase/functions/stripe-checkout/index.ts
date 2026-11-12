// Stripe Checkout — parked deliberately.
//
// This endpoint used to create a session from a hardcoded naira price table
// (pro ₦5,000, premium ₦15,000, …) with no authentication, no metadata tying the
// session to a user, and no webhook to credit anything. Two things were wrong
// with that, and both cost real money:
//
//   1. The prices here drifted away from the canonical
//      `subscription_plan_prices` table the pricing page renders, so a customer
//      could pay an amount the platform never quoted.
//   2. Even a successful payment could not be honoured: nothing listened for
//      Stripe events, and the session carried no user id, so there was no way to
//      grant the plan. A customer would have paid and received nothing.
//
// Stripe stays off until it can be done to the same standard as Paystack and
// Flutterwave. What a working version needs, in order:
//
//   • price resolved server-side from `subscription_plan_prices`
//     (see `../_shared/subscription-pricing.ts`), never a literal;
//   • the caller authenticated, with their user id in
//     `client_reference_id` and `metadata.user_id`;
//   • a `stripe-webhook` that verifies the `Stripe-Signature` HMAC (t=,v1=)
//     in constant time, then calls `apply_subscription_purchase` with the
//     session id as the reference, so replays are idempotent;
//   • the paid amount compared against the quote before granting.
//
// Until then this returns 501, which the client already treats as
// "not configured" and falls back to Paystack. Failing closed here is the whole
// point: no session can be created that the platform cannot complete.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  return json(
    {
      error: "stripe_not_available",
      reason:
        "Stripe checkout is parked until a signature-verified webhook can credit the purchase; use Paystack or Flutterwave.",
    },
    501,
  );
});
