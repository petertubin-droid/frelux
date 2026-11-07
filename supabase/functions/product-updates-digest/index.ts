// =========================================================
// product-updates-digest — what's new email, every three days
//
// pg_cron calls this every third day at 08:00 UTC with the
// x-digest-token header. The token lives server-side in
// public.product_updates_digest_tokens, so anyone without it
// gets a 401.
//
// What it sends, per active newsletter subscriber:
//  - the announcements published since their last digest that
//    they have not been sent yet (max 3, newest first)
//  - a short "in case you missed it" list of evergreen
//    highlights they have not received (max 3)
//
// Behavioural rules:
//  - Nothing new for a subscriber: no email at all. A quiet
//    week is silent rather than hollow.
//  - Zero active subscribers: one heartbeat to the owner so
//    the schedule is provably alive.
//  - Every delivery is recorded in product_update_deliveries,
//    so an announcement is never repeated to the same person.
//  - One failing send never aborts the batch.
//
// Required env:
// - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (always set)
// - RESEND_API_KEY            for the email (skipped without)
// - OWNER_NOTIFY_EMAIL or CONTACT_NOTIFY_EMAIL  heartbeat
//
// Deploy with --no-verify-jwt (the token header IS the gate).
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Frelux <noreply@freluxtools.com>";
const REPLY_TO = "Frelux <freluxtools@gmail.com>";
const SITE = "https://freluxtools.com";
const FUNCTIONS_URL = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;
const LOOKBACK_DAYS = 60;
const MAX_NEW = 3;
const MAX_EVERGREEN = 3;

interface ProductUpdate {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  product_area: string | null;
  link_path: string | null;
  is_highlight: boolean;
  published_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  unsub_token: string;
  created_at: string;
}

async function resolveResendKey(): Promise<string | null> {
  const envKey = Deno.env.get("RESEND_API_KEY");
  if (envKey) return envKey;
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/integration_secrets?select=key_value&provider_id=eq.resend&status=eq.active`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.key_value ? rows[0].key_value : null;
  } catch {
    return null;
  }
}

function esc(value: string | null): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absolute(linkPath: string | null): string {
  if (!linkPath) return SITE;
  if (/^https?:\/\//.test(linkPath)) return linkPath;
  return `${SITE}${linkPath.startsWith("/") ? "" : "/"}${linkPath}`;
}

function updateItem(update: ProductUpdate): string {
  const area = update.product_area
    ? `<span style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">${esc(update.product_area)}</span><br />`
    : "";
  return [
    '<li style="margin:0 0 18px;">',
    area,
    `<a href="${absolute(update.link_path)}" style="color:#18181b;font-size:16px;font-weight:600;text-decoration:none;">${esc(update.title)}</a>`,
    `<p style="margin:6px 0 0;color:#52525b;font-size:14px;line-height:1.6;">${esc(update.summary)}</p>`,
    "</li>",
  ].join("");
}

function digestHtml(
  fresh: ProductUpdate[],
  evergreen: ProductUpdate[],
  unsubUrl: string,
): string {
  const freshBlock = fresh.length
    ? [
        '<h2 style="margin:28px 0 12px;color:#18181b;font-size:15px;letter-spacing:0.06em;text-transform:uppercase;">New this week</h2>',
        `<ul style="margin:0;padding-left:18px;list-style:disc;">${fresh.map(updateItem).join("")}</ul>`,
      ].join("")
    : "";

  const evergreenBlock = evergreen.length
    ? [
        '<h2 style="margin:28px 0 12px;color:#18181b;font-size:15px;letter-spacing:0.06em;text-transform:uppercase;">Worth a look</h2>',
        `<ul style="margin:0;padding-left:18px;list-style:disc;">${evergreen.map(updateItem).join("")}</ul>`,
      ].join("")
    : "";

  const subjectLead = fresh[0]?.title ?? evergreen[0]?.title ?? "";

  return [
    "<div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;max-width:560px;\">",
    '<p style="margin:0 0 4px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6d28d9;font-weight:700;">Frelux</p>',
    `<h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;">${esc(subjectLead)}</h1>`,
    '<p style="margin:0 0 6px;color:#52525b;font-size:15px;line-height:1.6;">Here is what changed on Frelux, and what it means for your next estimate.</p>',
    freshBlock,
    evergreenBlock,
    '<p style="margin:28px 0 0;color:#52525b;font-size:14px;line-height:1.7;">Run your numbers: <a href="https://freluxtools.com/calculators/" style="color:#6d28d9;">all calculators</a>, <a href="https://freluxtools.com/price-tracker/" style="color:#6d28d9;">price tracker</a>, <a href="https://freluxtools.com/build-to-roof-estimator/" style="color:#6d28d9;">build to roof</a>.</p>',
    '<p style="margin:22px 0 0;color:#52525b;font-size:14px;">Build well,<br />The Frelux team</p>',
    `<p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;line-height:1.6;">You are receiving this because you subscribed at freluxtools.com. <a href="${unsubUrl}" style="color:#71717a;">Unsubscribe</a> at any time.</p>`,
    "</div>",
  ].join("\n");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = await resolveResendKey();
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

  // Token gate (same pattern as price-digest / signup-digest).
  const supplied = req.headers.get("x-digest-token") ?? "";
  const { data: tokenRow } = await db
    .from("product_updates_digest_tokens")
    .select("token")
    .limit(1)
    .maybeSingle();
  if (!tokenRow?.token || supplied !== tokenRow.token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const since = new Date(
    Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000,
  ).toISOString();

  const { data: updateRows } = await db
    .from("product_updates")
    .select(
      "id, slug, title, summary, category, product_area, link_path, is_highlight, published_at",
    )
    .eq("is_published", true)
    .gte("published_at", since)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(200);

  const updates = (updateRows ?? []) as ProductUpdate[];

  const { data: subscriberRows } = await db
    .from("newsletter_subscribers")
    .select("id, email, unsub_token, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(5000);

  const subscribers = (subscriberRows ?? []) as Subscriber[];
  const ownerEmail =
    Deno.env.get("OWNER_NOTIFY_EMAIL") ??
    Deno.env.get("CONTACT_NOTIFY_EMAIL") ??
    "freluxtools@gmail.com";

  // Heartbeat when nobody has subscribed yet.
  if (subscribers.length === 0) {
    if (ownerEmail) {
      await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          reply_to: REPLY_TO,
          to: [ownerEmail],
          subject: "Frelux updates digest: 0 subscribers",
          html: `<p>The three day updates digest ran with no active subscribers, so no subscriber email was sent. ${updates.length} published update(s) are waiting to go out. The schedule is alive.</p>`,
        }),
      }).catch(() => undefined);
    }
    return new Response(
      JSON.stringify({
        sent: 0,
        subscribers: 0,
        publishedUpdates: updates.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  if (updates.length === 0) {
    return new Response(
      JSON.stringify({ sent: 0, reason: "no published updates" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // Everything already delivered, for everyone in this batch.
  const { data: deliveryRows } = await db
    .from("product_update_deliveries")
    .select("subscriber_id, update_id")
    .in(
      "update_id",
      updates.map((u) => u.id),
    )
    .limit(20000);

  const delivered = new Map<string, Set<string>>();
  for (const row of (deliveryRows ?? []) as {
    subscriber_id: string;
    update_id: string;
  }[]) {
    const set = delivered.get(row.subscriber_id) ?? new Set<string>();
    set.add(row.update_id);
    delivered.set(row.subscriber_id, set);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let deliveredRows = 0;

  for (const sub of subscribers) {
    const already = delivered.get(sub.id) ?? new Set<string>();
    const subscribedAt = new Date(sub.created_at).getTime();

    const unseen = updates.filter(
      (u) =>
        !already.has(u.id) &&
        new Date(u.published_at).getTime() >= subscribedAt - 24 * 3600 * 1000,
    );
    const fresh = unseen.filter((u) => !u.is_highlight).slice(0, MAX_NEW);
    // Highlights carry the standing features a new reader may not
    // know about; without any news they are the whole email.
    const evergreen = unseen
      .filter((u) => u.is_highlight)
      .slice(0, fresh.length ? MAX_EVERGREEN : MAX_NEW + MAX_EVERGREEN);

    const batch = [...fresh, ...evergreen];
    if (batch.length === 0) {
      skipped += 1;
      continue;
    }

    const unsubUrl = `${FUNCTIONS_URL}/newsletter-unsubscribe?token=${sub.unsub_token}`;
    const subject = fresh.length
      ? `Frelux update: ${fresh[0].title}`
      : `What's new on Frelux: ${evergreen[0]?.title ?? "recent tools"}`;

    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          reply_to: REPLY_TO,
          to: [sub.email],
          subject,
          html: digestHtml(fresh, evergreen, unsubUrl),
        }),
      });
      if (!res.ok) {
        failed += 1;
        continue;
      }
      sent += 1;
      const rows = batch.map((u) => ({
        subscriber_id: sub.id,
        update_id: u.id,
      }));
      const { error } = await db
        .from("product_update_deliveries")
        .upsert(rows, {
          onConflict: "subscriber_id,update_id",
          ignoreDuplicates: true,
        });
      if (!error) deliveredRows += rows.length;
    } catch {
      failed += 1;
    }
  }

  return new Response(
    JSON.stringify({
      sent,
      skipped,
      failed,
      subscribers: subscribers.length,
      publishedUpdates: updates.length,
      deliveredRows,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

serveWithCors(handler);
