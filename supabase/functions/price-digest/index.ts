// =========================================================
// price-digest — weekly material price email (Phase 12)
//
// pg_cron calls this every Monday (07:15 UTC) with the
// x-digest-token header. The token lives server-side in
// public.price_digest_tokens (same pattern as signup-digest),
// so anyone without the token gets 401.
//
// What it sends: the current tracked material prices with the
// change versus the previous week (from material_price_history
// plus the current live price), to every active subscriber,
// plus the owner as a blind copy so deliverability is visible.
//
// Behavioural rules:
//  - Zero active subscribers: sends ONE heartbeat to the
//    owner only (so the cron is provably alive).
//  - Zero configured prices: still emails, with an honest
//    "no tracked prices yet" body.
//  - A failing individual send never aborts the batch.
//
// Required env:
// - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (always set)
// - RESEND_API_KEY           for the email (skipped without)
// - OWNER_NOTIFY_EMAIL or CONTACT_NOTIFY_EMAIL  heartbeat/blind copy
//
// Deploy with --no-verify-jwt (the token header IS the gate).
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Frelux <noreply@freluxtools.com>";
const SITE = "https://freluxtools.com";
const FUNCTIONS_URL = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;

interface MaterialPrice {
  name: string;
  category: string | null;
  unit: string | null;
  price: number | null;
  currency: string | null;
}

interface PriceChange {
  material_name: string;
  old_price: number | null;
  new_price: number | null;
  created_at: string;
}

function htmlEscape(value: string | null): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(v: number | null, currency: string | null): string {
  if (v === null || !Number.isFinite(v)) return "n/a";
  const symbol = currency === "NGN" ? "₦" : currency ? `${currency} ` : "";
  return `${symbol}${v.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

// Latest change row per material within the last 8 days.
function latestChangePerMaterial(
  changes: PriceChange[],
): Map<string, PriceChange> {
  const latest = new Map<string, PriceChange>();
  for (const c of changes) {
    const prev = latest.get(c.material_name);
    if (!prev || new Date(c.created_at) > new Date(prev.created_at)) {
      latest.set(c.material_name, c);
    }
  }
  return latest;
}

function digestHtml(
  prices: MaterialPrice[],
  changes: PriceChange[],
  unsubUrl: string,
): string {
  const latest = latestChangePerMaterial(changes);
  const rows = prices
    .map((p) => {
      const change = latest.get(p.name);
      let delta = "";
      if (change && change.old_price && change.new_price) {
        const pct =
          ((change.new_price - change.old_price) / change.old_price) * 100;
        const sign = pct > 0 ? "+" : "";
        const cls = pct > 0 ? "#b91c1c" : pct < 0 ? "#15803d" : "#57534e";
        delta = ` <span style="color:${cls};font-size:12px;">(${sign}${pct.toFixed(1)}% this week)</span>`;
      }
      const category = p.category
        ? ` <span style="color:#888;font-size:12px;">(${htmlEscape(p.category)})</span>`
        : "";
      return `<li><strong>${htmlEscape(p.name)}</strong>${category}: ${money(p.price, p.currency)} per ${htmlEscape(p.unit) ?? "unit"}${delta}</li>`;
    })
    .join("");

  const body = prices.length
    ? `<p>Here are this week's tracked building material prices. Change your project prices to match, then re-run your estimates before you buy.</p><ul style="line-height:1.9;">${rows}</ul>`
    : "<p>No tracked prices are configured yet. When the team adds them, they will appear here every Monday.</p>";

  return [
    "<p>Your weekly Frelux price check.</p>",
    body,
    `<p>Run your numbers: <a href="${SITE}/price-tracker/">price tracker</a>, <a href="${SITE}/paint-calculator/">paint calculator</a>, <a href="${SITE}/build-to-roof-estimator/">build-to-roof estimator</a>.</p>`,
    "<p>Build well,<br>The Frelux team</p>",
    `<p style="color:#888;font-size:12px;"><a href="${unsubUrl}">Unsubscribe</a> at any time.</p>`,
  ].join("\n");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ sent: false, reason: "not configured" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Token gate (same pattern as signup-digest).
  const supplied = req.headers.get("x-digest-token") ?? "";
  const { data: tokenRow } = await db
    .from("price_digest_tokens")
    .select("token")
    .limit(1)
    .maybeSingle();
  if (!tokenRow?.token || supplied !== tokenRow.token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: prices } = await db
    .from("material_prices")
    .select("name, category, unit, price, currency")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const { data: changes } = await db
    .from("material_price_history")
    .select("material_name, old_price, new_price, created_at")
    .gte(
      "created_at",
      new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    );

  const { data: subscribers } = await db
    .from("newsletter_subscribers")
    .select("email, unsub_token")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(5000);

  const ownerEmail =
    Deno.env.get("OWNER_NOTIFY_EMAIL") ??
    Deno.env.get("CONTACT_NOTIFY_EMAIL") ??
    null;
  const activeSubscribers = subscribers ?? [];
  const priceList = (prices ?? []) as MaterialPrice[];
  const changeList = (changes ?? []) as PriceChange[];

  // Heartbeat when nobody has subscribed yet.
  if (activeSubscribers.length === 0) {
    if (ownerEmail) {
      await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [ownerEmail],
          subject: "Frelux weekly price digest: 0 subscribers",
          html: "<p>Weekly price digest heartbeat: no newsletter subscribers yet, so no subscriber email was sent. The cron is alive and prices are tracked.</p>",
        }),
      }).catch(() => undefined);
    }
    return new Response(
      JSON.stringify({ sent: 0, subscribers: 0, prices: priceList.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  let sent = 0;
  let failed = 0;
  for (const sub of activeSubscribers) {
    const unsubUrl = `${FUNCTIONS_URL}/newsletter-unsubscribe?token=${sub.unsub_token}`;
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [sub.email],
          subject: "Your weekly Frelux price check",
          html: digestHtml(priceList, changeList, unsubUrl),
        }),
      });
      if (res.ok) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return new Response(
    JSON.stringify({
      sent,
      failed,
      subscribers: activeSubscribers.length,
      prices: priceList.length,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

serveWithCors(handler);
