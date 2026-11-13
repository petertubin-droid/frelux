// =========================================================
// Product promotion checkout
//
// A seller buys placement for one of their own products. The price is always
// resolved server-side from marketplace_promotion_packages: the client sends
// which package it wants, never how much it costs. Naira goes to Paystack,
// everything else to Flutterwave, through the one currency registry.
//
// Returns { authorization_url } for the browser to follow.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";
import { providerForCurrency } from "../_shared/escrow_providers.ts";
import { minorToMajor } from "../_shared/currency-units.ts";
import { getSiteUrl } from "../_shared/site.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serveWithCors(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.PAYMENT);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey)
    return json({ error: "Not configured" }, 503);

  const admin = createClient(supabaseUrl, serviceKey);
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: auth } = token
    ? await admin.auth.getUser(token)
    : { data: { user: null } };
  const user = auth?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: { product_id?: string; package_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const productId = typeof body.product_id === "string" ? body.product_id : "";
  const packageId = typeof body.package_id === "string" ? body.package_id : "";
  if (!productId || !packageId)
    return json({ error: "Missing product or package" }, 400);

  const { data: product } = await admin
    .from("marketplace_products")
    .select("id,seller_id,title,currency,images,status")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return json({ error: "Product not found" }, 404);
  if (product.seller_id !== user.id)
    return json({ error: "Not your product" }, 403);

  const { data: pack } = await admin
    .from("marketplace_promotion_packages")
    .select(
      "id,slug,name,days,placements,price_ngn_minor,price_usd_minor,is_active",
    )
    .eq("id", packageId)
    .maybeSingle();
  if (!pack || !pack.is_active)
    return json({ error: "Package not available" }, 404);

  // Naira is collected in naira; every other seller is billed the dollar price.
  const currency =
    String(product.currency || "").toUpperCase() === "NGN" ? "NGN" : "USD";
  const amountMinor =
    currency === "NGN"
      ? Number(pack.price_ngn_minor)
      : Number(pack.price_usd_minor);
  const provider = providerForCurrency(currency);
  const reference = `PRM_${crypto.randomUUID().replace(/-/g, "")}`;
  const redirectBase = `${getSiteUrl()}/marketplace/my-products/`;

  const { data: promotion, error: insertError } = await admin
    .from("marketplace_promotions")
    .insert({
      user_id: user.id,
      product_id: product.id,
      package_id: pack.id,
      reference,
      provider,
      currency,
      amount_minor: amountMinor,
      status: "pending",
    })
    .select("id,reference")
    .single();
  if (insertError || !promotion)
    return json({ error: "Could not start the promotion" }, 500);

  const email = user.email ?? "";
  try {
    if (provider === "paystack") {
      const secret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
      if (!secret) return json({ error: "Paystack is not configured" }, 503);
      const res = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount: amountMinor,
            currency,
            reference,
            callback_url: `${redirectBase}?promotion=${reference}`,
            metadata: {
              purpose: "marketplace_promotion",
              promotion_id: promotion.id,
              product_id: product.id,
              package: pack.slug,
            },
          }),
        },
      );
      const payload = await res.json();
      if (!res.ok || !payload?.status) {
        await admin
          .from("marketplace_promotions")
          .update({ status: "failed" })
          .eq("id", promotion.id);
        return json(
          { error: payload?.message || "Paystack refused the charge" },
          502,
        );
      }
      return json({
        authorization_url: payload.data.authorization_url,
        reference,
      });
    }

    const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";
    if (!secret) return json({ error: "Flutterwave is not configured" }, 503);
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: minorToMajor(amountMinor, currency),
        currency,
        redirect_url: `${redirectBase}?promotion=${reference}`,
        customer: { email },
        customizations: {
          title: "FRELUX product promotion",
          description: pack.name,
        },
        meta: { purpose: "marketplace_promotion", promotion_id: promotion.id },
      }),
    });
    const payload = await res.json();
    if (!res.ok || payload?.status !== "success" || !payload?.data?.link) {
      await admin
        .from("marketplace_promotions")
        .update({ status: "failed" })
        .eq("id", promotion.id);
      return json(
        { error: payload?.message || "Flutterwave refused the charge" },
        502,
      );
    }
    return json({ authorization_url: payload.data.link, reference });
  } catch {
    await admin
      .from("marketplace_promotions")
      .update({ status: "failed" })
      .eq("id", promotion.id);
    return json({ error: "Could not reach the payment provider" }, 502);
  }
});
