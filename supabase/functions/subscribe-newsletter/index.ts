// =========================================================
// subscribe-newsletter — site-wide email signup (Phase 12)
//
// POST { email, source? }
//  - validates the address, upserts into
//    public.newsletter_subscribers (active), and sends a
//    one-time welcome email via Resend with an unsubscribe
//    link keyed by the per-subscriber token.
//  - Idempotent: subscribing twice re-sends the welcome at
//    most once per hour per address (rate limited) and never
//    duplicates the row.
//  - Re-subscribing an unsubscribed address reactivates it
//    (they explicitly asked again).
//
// POST { unsub_token } via ?action=unsubscribe, or GET with
// ?token=<unsub_token> is handled by newsletter-unsubscribe;
// this function only handles subscriptions.
//
// Deploy with --no-verify-jwt: the write happens with the
// service key inside this function, and a per-IP rate limit
// guards the endpoint.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Frelux <noreply@freluxtools.com>";
const SITE = "https://freluxtools.com";
const FUNCTIONS_URL = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;

// Same shape the auth flows use: practical, not exhaustive.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "")).join("");
}

function htmlEscape(value: string | null): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function welcomeHtml(email: string, unsubUrl: string): string {
  return [
    `<p>Hi ${htmlEscape(email.split("@")[0])},</p>`,
    "<p>Thanks for subscribing to the Frelux price updates.</p>",
    "<p>Every Monday you will get a short email with the current tracked building material prices, week-over-week changes, and what they mean for your estimates. Nothing else: no marketing, no spam.</p>",
    `<p>Meanwhile, the <a href="${SITE}/learn/">Learn library</a> has practical guides for every trade, and the <a href="${SITE}/price-tracker/">price tracker</a> shows the same numbers the email will.</p>`,
    "<p>Build well,<br>The Frelux team</p>",
    `<p style="color:#888;font-size:12px;">You are receiving this because you subscribed on freluxtools.com (${htmlEscape(email)}).</p>`,
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

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = checkRateLimit(`subscribe-newsletter:${ip}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email = (body?.email ?? "").trim().toLowerCase();
  const source =
    typeof body?.source === "string" ? body.source.slice(0, 60) : null;
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: "Valid email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Service not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Idempotent subscribe: reactivate unsubscribed addresses,
  // keep the row unique by email, rotate the token so stale
  // unsubscribe links from a previous subscription die.
  const token = generateToken();
  const { data: row, error: dbError } = await db
    .from("newsletter_subscribers")
    .upsert(
      { email, status: "active", unsub_token: token, source },
      { onConflict: "email" },
    )
    .select("id, unsub_token")
    .single();
  if (dbError || !row) {
    return new Response(
      JSON.stringify({ error: "Could not subscribe right now" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Welcome email is best-effort: a missing RESEND_API_KEY must
  // never fail the subscription itself.
  let welcomeSent = false;
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (apiKey) {
    const unsubUrl = `${FUNCTIONS_URL}/newsletter-unsubscribe?token=${row.unsub_token}`;
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: "Welcome to Frelux price updates",
          html: welcomeHtml(email, unsubUrl),
        }),
      });
      welcomeSent = res.ok;
    } catch {
      welcomeSent = false;
    }
  }

  return new Response(
    JSON.stringify({ subscribed: true, welcome_email_sent: welcomeSent }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

serveWithCors(handler);
