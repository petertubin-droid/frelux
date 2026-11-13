// =========================================================
// Product promotion verification
//
// Called when the seller comes back from Paystack or Flutterwave. It asks the
// provider what actually happened rather than trusting the return URL, then
// turns a paid promotion into a live sponsored campaign. Running it twice is
// safe: a promotion that is already active is not duplicated.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getSiteUrl } from "../_shared/site.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type PromotionRow = {
  id: string;
  user_id: string;
  product_id: string;
  package_id: string;
  reference: string;
  provider: "paystack" | "flutterwave";
  currency: string;
  amount_minor: number;
  status: string;
  campaign_id: string | null;
};

async function providerSaysPaid(promotion: PromotionRow): Promise<boolean> {
  if (promotion.provider === "paystack") {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
    if (!secret) return false;
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(promotion.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const payload = await res.json();
    const data = payload?.data;
    if (!res.ok || !data || data.status !== "success") return false;
    // The provider must have collected the same amount and currency we quoted.
    return (
      Number(data.amount) === Number(promotion.amount_minor) &&
      String(data.currency || "").toUpperCase() === promotion.currency
    );
  }

  const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";
  if (!secret) return false;
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(promotion.reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const payload = await res.json();
  const data = payload?.data;
  if (!res.ok || !data || data.status !== "successful") return false;
  return String(data.currency || "").toUpperCase() === promotion.currency;
}

serveWithCors(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

  let body: { reference?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const reference = typeof body.reference === "string" ? body.reference : "";
  if (!reference) return json({ error: "Missing reference" }, 400);

  const { data: promotion } = await admin
    .from("marketplace_promotions")
    .select(
      "id,user_id,product_id,package_id,reference,provider,currency,amount_minor,status,campaign_id",
    )
    .eq("reference", reference)
    .maybeSingle<PromotionRow>();

  if (!promotion) return json({ error: "Promotion not found" }, 404);
  if (promotion.user_id !== user.id)
    return json({ error: "Not your promotion" }, 403);
  if (promotion.status === "active" || promotion.status === "paid") {
    return json({
      status: promotion.status,
      campaign_id: promotion.campaign_id,
    });
  }

  const paid = await providerSaysPaid(promotion).catch(() => false);
  if (!paid) return json({ status: "pending" }, 202);

  const [{ data: pack }, { data: product }, { data: profile }] =
    await Promise.all([
      admin
        .from("marketplace_promotion_packages")
        .select("id,name,days,placements")
        .eq("id", promotion.package_id)
        .maybeSingle(),
      admin
        .from("marketplace_products")
        .select("id,title,description,images,currency")
        .eq("id", promotion.product_id)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("full_name,marketplace_id")
        .eq("id", promotion.user_id)
        .maybeSingle(),
    ]);

  if (!pack || !product)
    return json({ error: "Promotion data is incomplete" }, 500);

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + Number(pack.days) * 86_400_000);
  const slug = `promo-${promotion.id.replace(/-/g, "").slice(0, 12)}`;
  const site = getSiteUrl();
  const image =
    Array.isArray(product.images) && product.images.length
      ? String(product.images[0])
      : null;

  const { data: campaign, error: campaignError } = await admin
    .from("ad_campaigns")
    .insert({
      name: `Product promotion: ${product.title}`.slice(0, 120),
      slug,
      campaign_type: "sponsored",
      status: "active",
      format: "native",
      headline: product.title.slice(0, 120),
      description: (product.description ?? "").slice(0, 200) || null,
      cta_label: "View product",
      destination_url: `${site}/marketplace/products/${product.id}/`,
      is_external: false,
      image_url: image,
      image_alt: product.title.slice(0, 120),
      advertiser_name:
        profile?.full_name || profile?.marketplace_id || "Marketplace seller",
      is_sponsored: true,
      target_markets: ["ALL"],
      placements: pack.placements,
      target_devices: ["desktop", "tablet", "mobile"],
      priority: 60,
      weight: 1,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: `Paid promotion ${promotion.reference}`,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    return json(
      { error: "Payment cleared but the campaign could not be created" },
      500,
    );
  }

  await admin
    .from("marketplace_promotions")
    .update({
      status: "active",
      campaign_id: campaign.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      paid_at: startsAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", promotion.id);

  return json({
    status: "active",
    campaign_id: campaign.id,
    ends_at: endsAt.toISOString(),
  });
});
