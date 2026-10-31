// =========================================================
// frelix-wallet-topup — start a prepaid API wallet top-up.
//
// The wallet could be spent but never filled (see migration
// 20261031170000). This opens the checkout; the webhook is
// what credits, because a redirect the caller controls is not
// evidence of payment.
//
// The amount is validated here, but never trusted later: the
// browser can post whatever it likes, so the quote is carried
// in the charge metadata and the settled figure is compared
// against it before any credit.
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";
import {
  buildTopupTxRef,
  validateTopupAmount,
} from "../_shared/wallet-topup.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serveWithCors(async (req: Request) => {
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.PAYMENT);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secretKey || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Payment provider not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const check = validateTopupAmount(
      (body as { amount_usd?: unknown }).amount_usd,
    );
    if (!check.ok) return json({ error: check.error }, 400);
    const amountUsd = check.amountUsd;

    // Identity comes from the token, never from the body: a caller must not
    // be able to top up somebody else's wallet.
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authHeader =
      req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const tokenUser = await admin.auth.getUser(authHeader);
    const user = tokenUser?.data?.user;
    if (!user?.id || !user.email) return json({ error: "Unauthorized" }, 401);

    const origin = req.headers.get("origin") ?? "";
    if (!origin) return json({ error: "Missing origin" }, 400);

    // The drawer the caller returns to; the page re-reads the balance from
    // the database rather than believing anything in the URL.
    const redirectUrl = `${origin}/developers?status=wallet_topup&gw=flutterwave`;
    const txRef = buildTopupTxRef(user.id);

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amountUsd,
        currency: "USD",
        redirect_url: redirectUrl,
        payment_options: "card",
        customer: { email: user.email },
        customizations: {
          title: "FRELUX API",
          description: `API wallet top-up of $${amountUsd}`,
        },
        meta: {
          purpose: "wallet_topup",
          user_id: user.id,
          amount_usd: amountUsd,
          expected_currency: "USD",
        },
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.status || !data?.data?.link) {
      return json(
        { error: data?.message || "Flutterwave initialization failed" },
        response.status ?? 502,
      );
    }

    return json({
      authorization_url: data.data.link,
      reference: txRef,
      amount_usd: amountUsd,
    });
  } catch (error) {
    void error;
    return json({ error: "Could not start the top-up. Try again." }, 500);
  }
});
