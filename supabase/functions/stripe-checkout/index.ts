// Stripe Checkout for international cards (worldwide layer).
// Env: STRIPE_SECRET_KEY (Supabase secret). When no key is set,
// returns 501 so the client falls back to Paystack.
import { serve } from "https://deno.land/std/http/server.ts";

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

const NGN_AMOUNTS: Record<string, number> = {
  "pro:monthly": 500000, // N5,000 in kobo
  "pro:yearly": 5000000,
  "premium:monthly": 1500000,
  "premium:yearly": 15000000,
  "enterprise:monthly": 5000000,
  "enterprise:yearly": 50000000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) {
    return json({ error: "stripe_not_configured" }, 501);
  }

  let body: {
    planId?: string;
    cycle?: string;
    success_url?: string;
    cancel_url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  const key = `${body.planId}:${body.cycle}`;
  const amount = NGN_AMOUNTS[key];
  if (!amount) return json({ error: "unknown_plan" }, 400);
  if (!body.success_url || !body.cancel_url) {
    return json({ error: "missing_urls" }, 400);
  }

  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "ngn",
    "line_items[0][price_data][unit_amount]": String(amount),
    "line_items[0][price_data][product_data][name]": `FRELUX ${body.planId} (${body.cycle})`,
    success_url: body.success_url,
    cancel_url: body.cancel_url,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const session = await res.json();
  if (!res.ok) {
    return json({ error: session?.error?.message ?? "stripe_error" }, 502);
  }
  return json({ url: session.url });
});
