// =========================================================
// broadcast-campaign — Admin email broadcast & scheduler
//
// Handles:
//  - Immediate broadcasts to active newsletter subscribers
//  - Automated dispatch of scheduled campaigns (via pg_cron)
//  - Real-time test preview sends to administrator inbox
//  - Dynamic price snapshot and product update embedding
//  - Delivery tracking and per-subscriber audit logging
//
// Gates:
//  - Admin user authentication (profiles.role = 'admin')
//  - OR valid x-scheduler-token matching newsletter_scheduler_tokens
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";
import {
  EMAIL,
  escapeHtml,
  renderEmailHtml,
  type EmailContent,
  type EmailDetail,
} from "../_shared/email/kit.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Frelux <noreply@freluxtools.com>";
const REPLY_TO = "Frelux <freluxtools@gmail.com>";
const SITE = "https://freluxtools.com";

interface MaterialPriceRow {
  name: string;
  category: string;
  unit: string;
  price: number;
  currency: string;
}

interface ProductUpdateRow {
  title: string;
  summary: string;
  category: string;
  link_path: string | null;
  published_at: string;
}

interface SubscriberRow {
  id: string;
  email: string;
  unsub_token: string;
  status: string;
}

interface CampaignRow {
  id: string;
  title: string;
  subject: string;
  preview_text: string | null;
  campaign_type: string;
  target_audience: string;
  content_html: string;
  content_text: string;
  cta_label: string | null;
  cta_url: string | null;
  include_price_snapshot: boolean;
  include_recent_updates: boolean;
  status: string;
  scheduled_for: string | null;
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

function formatMoney(amount: number, currency: string): string {
  const sym =
    currency === "NGN"
      ? "₦"
      : currency === "USD"
        ? "$"
        : currency === "GBP"
          ? "£"
          : currency === "EUR"
            ? "€"
            : `${currency} `;
  return `${sym}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

serveWithCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Authorization: check if caller is verified admin or cron with valid token
  const schedulerToken = req.headers.get("x-scheduler-token");
  let isAuthorized = false;
  let callerAdminId: string | null = null;

  if (schedulerToken) {
    const { data: tokenRow } = await supabase
      .from("newsletter_scheduler_tokens")
      .select("token")
      .eq("token", schedulerToken)
      .maybeSingle();

    if (tokenRow) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const userId = await getVerifiedUserId(req);
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.role === "admin") {
        isAuthorized = true;
        callerAdminId = userId;
      }
    }
  }

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized. Admin role or scheduler token required.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = (body.action as string) || "list";

  // ACTION: get_preview_data — fetch live prices, recent updates, and subscriber stats
  if (action === "get_preview_data") {
    const [subStats, pricesRes, updatesRes] = await Promise.all([
      supabase.from("newsletter_subscribers").select("status"),
      supabase
        .from("material_prices")
        .select("name,category,unit,price,currency")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(10),
      supabase
        .from("product_updates")
        .select("title,summary,category,link_path,published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(5),
    ]);

    const subs = subStats.data || [];
    const activeSubs = subs.filter((s) => s.status === "active").length;
    const unsubscribedSubs = subs.filter(
      (s) => s.status === "unsubscribed",
    ).length;

    return new Response(
      JSON.stringify({
        stats: {
          total: subs.length,
          active: activeSubs,
          unsubscribed: unsubscribedSubs,
        },
        material_prices: pricesRes.data || [],
        product_updates: updatesRes.data || [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ACTION: send_test — Send a preview email to a specific admin address
  if (action === "send_test") {
    const testEmail = String(body.test_email || "").trim();
    if (!testEmail || !testEmail.includes("@")) {
      return new Response(
        JSON.stringify({ error: "A valid test recipient email is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const resendKey = await resolveResendKey();
    if (!resendKey) {
      return new Response(
        JSON.stringify({
          error:
            "Resend API key is not configured. Add it in Admin → Integration Center → Provider Keys.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const subject = String(body.subject || "Frelux Update Preview");
    const previewText = String(
      body.preview_text || "Preview of your scheduled newsletter update",
    );
    const heading = String(body.heading || body.subject || "Frelux Broadcast");
    const contentText = String(body.content_text || "");
    const ctaLabel = body.cta_label ? String(body.cta_label) : undefined;
    const ctaUrl = body.cta_url ? String(body.cta_url) : undefined;
    const includePriceSnapshot = Boolean(body.include_price_snapshot);
    const includeRecentUpdates = Boolean(body.include_recent_updates);

    // Build email paragraphs & details
    const paragraphs = contentText
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const details: EmailDetail[] = [];
    if (includePriceSnapshot) {
      const { data: prices } = await supabase
        .from("material_prices")
        .select("name,price,currency,unit")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(6);

      if (prices && prices.length > 0) {
        details.push(
          ...prices.map((p) => ({
            label: `${p.name} (${p.unit})`,
            value: formatMoney(Number(p.price), p.currency),
          })),
        );
      }
    }

    const bullets: string[] = [];
    if (includeRecentUpdates) {
      const { data: updates } = await supabase
        .from("product_updates")
        .select("title,summary")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);

      if (updates && updates.length > 0) {
        bullets.push(...updates.map((u) => `${u.title}: ${u.summary}`));
      }
    }

    const emailContent: EmailContent = {
      preheader: previewText,
      heading,
      paragraphs:
        paragraphs.length > 0
          ? paragraphs
          : ["Here is a preview of the upcoming broadcast."],
      bullets: bullets.length > 0 ? bullets : undefined,
      details: details.length > 0 ? details : undefined,
      cta:
        ctaLabel && ctaUrl?.startsWith("https://")
          ? { label: ctaLabel, href: ctaUrl }
          : undefined,
      note: "This is an administrator test preview. Your actual subscribers will receive this with their personalized unsubscribe link.",
      footer: "Frelux Construction Intelligence • Admin Preview",
    };

    const renderedHtml = renderEmailHtml(emailContent);

    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          reply_to: REPLY_TO,
          to: [testEmail],
          subject: `[TEST PREVIEW] ${subject}`,
          html: renderedHtml,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `Resend error: ${errText}` }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ ok: true, sent_to: testEmail }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (sendErr) {
      return new Response(
        JSON.stringify({
          error:
            sendErr instanceof Error ? sendErr.message : "Test send failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ACTION: send_now or dispatch_scheduled — Dispatches a campaign to subscribers
  if (action === "send_now" || action === "dispatch_scheduled") {
    let campaignId = body.campaign_id as string | undefined;

    // If dispatch_scheduled without specific ID, find the next due campaign
    if (!campaignId && action === "dispatch_scheduled") {
      const nowIso = new Date().toISOString();
      const { data: dueCampaigns } = await supabase
        .from("newsletter_campaigns")
        .select("id")
        .eq("status", "scheduled")
        .lte("scheduled_for", nowIso)
        .order("scheduled_for", { ascending: true })
        .limit(1);

      if (!dueCampaigns || dueCampaigns.length === 0) {
        return new Response(
          JSON.stringify({
            ok: true,
            message: "No scheduled campaigns are due for dispatch.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      campaignId = dueCampaigns[0].id;
    }

    if (!campaignId) {
      return new Response(JSON.stringify({ error: "Missing campaign_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the campaign
    const { data: campaign, error: campErr } = await supabase
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle<CampaignRow>();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (campaign.status === "sent") {
      return new Response(
        JSON.stringify({ error: "Campaign has already been sent." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const resendKey = await resolveResendKey();
    if (!resendKey) {
      await supabase
        .from("newsletter_campaigns")
        .update({
          status: "failed",
          error_log: "Resend API key is not configured.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return new Response(
        JSON.stringify({
          error: "Resend API key is not configured. Add it in Provider Keys.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Mark as sending
    await supabase
      .from("newsletter_campaigns")
      .update({ status: "sending", updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    // Fetch active subscribers
    const { data: subscribers, error: subErr } = await supabase
      .from("newsletter_subscribers")
      .select("id,email,unsub_token,status")
      .eq("status", "active");

    if (subErr || !subscribers || subscribers.length === 0) {
      await supabase
        .from("newsletter_campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          total_recipients: 0,
          successful_sends: 0,
          failed_sends: 0,
          error_log: "Zero active subscribers found.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return new Response(
        JSON.stringify({
          ok: true,
          sent: 0,
          failed: 0,
          message: "No active subscribers found.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Pre-fetch dynamic snapshot data if requested
    const details: EmailDetail[] = [];
    if (campaign.include_price_snapshot) {
      const { data: prices } = await supabase
        .from("material_prices")
        .select("name,price,currency,unit")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(8);

      if (prices && prices.length > 0) {
        details.push(
          ...prices.map((p) => ({
            label: `${p.name} (${p.unit})`,
            value: formatMoney(Number(p.price), p.currency),
          })),
        );
      }
    }

    const bullets: string[] = [];
    if (campaign.include_recent_updates) {
      const { data: updates } = await supabase
        .from("product_updates")
        .select("title,summary")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(4);

      if (updates && updates.length > 0) {
        bullets.push(...updates.map((u) => `${u.title}: ${u.summary}`));
      }
    }

    const paragraphs = campaign.content_text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    let successfulSends = 0;
    let failedSends = 0;

    // Send in batches of 5 to respect Resend rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (sub) => {
          const unsubUrl = `${SITE}/functions/v1/newsletter-unsubscribe?token=${encodeURIComponent(sub.unsub_token)}`;
          const emailContent: EmailContent = {
            preheader: campaign.preview_text || "Frelux construction update",
            heading: campaign.subject,
            paragraphs:
              paragraphs.length > 0
                ? paragraphs
                : ["Here is your latest update from Frelux."],
            bullets: bullets.length > 0 ? bullets : undefined,
            details: details.length > 0 ? details : undefined,
            cta:
              campaign.cta_label && campaign.cta_url?.startsWith("https://")
                ? { label: campaign.cta_label, href: campaign.cta_url }
                : undefined,
            footer: `Frelux Construction Intelligence. To unsubscribe, visit ${unsubUrl}`,
          };

          const html = renderEmailHtml(emailContent);

          try {
            const res = await fetch(RESEND_ENDPOINT, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: FROM,
                reply_to: REPLY_TO,
                to: [sub.email],
                subject: campaign.subject,
                html,
              }),
            });

            if (res.ok) {
              successfulSends += 1;
              await supabase.from("newsletter_campaign_deliveries").insert({
                campaign_id: campaign.id,
                subscriber_id: sub.id,
                email: sub.email,
                status: "delivered",
                delivered_at: new Date().toISOString(),
              });
            } else {
              failedSends += 1;
              const errBody = await res.text();
              await supabase.from("newsletter_campaign_deliveries").insert({
                campaign_id: campaign.id,
                subscriber_id: sub.id,
                email: sub.email,
                status: "failed",
                error_message: errBody.slice(0, 300),
              });
            }
          } catch (err) {
            failedSends += 1;
            await supabase.from("newsletter_campaign_deliveries").insert({
              campaign_id: campaign.id,
              subscriber_id: sub.id,
              email: sub.email,
              status: "failed",
              error_message: err instanceof Error ? err.message : "Send failed",
            });
          }
        }),
      );

      // Brief backoff between batches
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Finalize campaign row
    await supabase
      .from("newsletter_campaigns")
      .update({
        status: failedSends > 0 && successfulSends === 0 ? "failed" : "sent",
        sent_at: new Date().toISOString(),
        total_recipients: subscribers.length,
        successful_sends: successfulSends,
        failed_sends: failedSends,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({
        ok: true,
        campaign_id: campaignId,
        total: subscribers.length,
        successful: successfulSends,
        failed: failedSends,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
});
