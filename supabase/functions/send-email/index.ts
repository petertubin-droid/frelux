// =========================================================
// Send Email — Transactional emails via Resend
//
// Called by the frontend as a best-effort follow-up after a
// legitimate action (e.g. the contact form stores a message);
// email delivery NEVER blocks or breaks the user flow.
//
// Safety rules (mirroring the platform's edge conventions):
//  - Rate limited: 5 requests / minute / IP.
//  - Recipients are NEVER taken from the request body; they are
//    derived server-side from the stored row (the visitor's own
//    address) and the CONTACT_NOTIFY_EMAIL secret (admin inbox).
//  - The sender address is a fixed verified-domain address
//    (noreply@freluxtools.com); callers cannot choose it.
//  - The message body is plain, reviewed text stored server-side;
//    caller-supplied content never reaches the email directly.
//
// Required env (supabase functions secrets set):
// - RESEND_API_KEY          Resend API key (re_...)
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - CONTACT_NOTIFY_EMAIL    admin inbox; OWNER_NOTIFY_EMAIL is used
// - OWNER_NOTIFY_EMAIL      as a fallback so a single missing name
//                           never silences notifications (both unset
//                           means the admin email is skipped)
//
// Resend REST API: POST https://api.resend.com/emails
// Emails fail gracefully (HTTP 200, sent:false) until the
// freluxtools.com domain is verified in Resend; the frontend
// ignores failures by design.
// =========================================================

// ---------------------------------------------------------
// Resend key resolution: env var first (existing deploys
// unchanged), then the operator-pasted key in
// integration_secrets (Admin → Integration Center → Provider
// Keys). Server-side only — the browser never sees this key.
// ---------------------------------------------------------
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
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.key_value ? rows[0].key_value : null;
  } catch {
    return null;
  }
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Frelux <noreply@freluxtools.com>";
const REPLY_TO = "Frelux <freluxtools@gmail.com>";

interface ContactRow {
  id: string;
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
}

function htmlEscape(value: string | null): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function visitorConfirmation(row: ContactRow): string {
  const firstName = (row.name ?? "there").split(/\s+/)[0];
  return [
    `<p>Hi ${htmlEscape(firstName)},</p>`,
    "<p>Thanks for reaching out to Frelux. We received your message:</p>",
    `<p style="border-left:3px solid #7e37d4;padding-left:12px;color:#333;font-style:italic;">${htmlEscape(row.subject ?? "(no subject)")}</p>`,
    "<p>Our team reviews every message and will reply as soon as possible, usually within one business day.</p>",
    "<p>If your request is urgent, you can also message us on WhatsApp from the contact page.</p>",
    "<p>The Frelux team</p>",
    '<p style="color:#888;font-size:12px;">Frelux: construction estimation, powered by FRELUX PROJECT CALC.</p>',
  ].join("\n");
}

function adminNotification(row: ContactRow): string {
  return [
    `<p>New contact message from the website:</p>`,
    `<ul>`,
    `<li><strong>Name:</strong> ${htmlEscape(row.name ?? "(unknown)")}</li>`,
    `<li><strong>Email:</strong> ${htmlEscape(row.email ?? "(unknown)")}</li>`,
    `<li><strong>Subject:</strong> ${htmlEscape(row.subject ?? "(no subject)")}</li>`,
    `<li><strong>Message:</strong> ${htmlEscape(row.message ?? "")}</li>`,
    `</ul>`,
    `<p>Open the admin panel (Communications: Contact Messages) to reply and update the status.</p>`,
  ].join("\n");
}

/**
 * Admin inbox for contact notifications. CONTACT_NOTIFY_EMAIL is the
 * specific name; OWNER_NOTIFY_EMAIL is accepted as an alias so an
 * operator who set only the general owner address still gets mail.
 * With neither configured the message still goes to the public Frelux
 * inbox: an enquiry nobody can see is the same as one never sent.
 */
export const DEFAULT_INBOX = "freluxtools@gmail.com";

export function resolveNotifyEmail(
  getEnv: (name: string) => string | undefined,
): string | null {
  for (const name of ["CONTACT_NOTIFY_EMAIL", "OWNER_NOTIFY_EMAIL"]) {
    const value = (getEnv(name) ?? "").trim();
    if (value) return value;
  }
  return DEFAULT_INBOX;
}

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ sent: boolean; error?: string }> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      reply_to: REPLY_TO,
      to: [to],
      subject,
      html,
    }),
  });
  if (response.ok) return { sent: true };
  const detail = await response.text();
  return { sent: false, error: detail.slice(0, 200) };
}

/** Display names are user-supplied: text in an email, never markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit per client IP (per Deno isolate, like all shared helpers).
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = checkRateLimit(`send-email:${ip}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = await resolveResendKey();
  if (!apiKey) {
    return new Response(JSON.stringify({ sent: false, reason: "no key" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { type?: string; id?: string; conversation_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  // ── Pro enquiry alert ──────────────────────────────────────
  // A customer opened a conversation with a professional. The customer is
  // proven from their token, the conversation from the database, and the
  // recipient from the professional's own row: nothing in the body can pick
  // an address or write the email.
  if (body?.type === "pro_inquiry") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ sent: false, reason: "no env" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof body.conversation_id !== "string") {
      return new Response(
        JSON.stringify({ error: "conversation_id required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = (req.headers.get("Authorization") ?? "").replace(
      /^Bearer\s+/i,
      "",
    );
    const { data: authData } = token
      ? await admin.auth.getUser(token)
      : { data: { user: null } };
    const customer = authData?.user;
    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data: convo } = await admin
      .from("pro_conversations")
      .select("id, customer_id, professional_id")
      .eq("id", body.conversation_id)
      .maybeSingle();
    if (!convo || convo.customer_id !== customer.id) {
      return new Response(
        JSON.stringify({ sent: false, reason: "not owner" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data: pro } = await admin
      .from("pro_profiles")
      .select("display_name, business_name, slug, user_id")
      .eq("id", convo.professional_id)
      .maybeSingle();

    // contact_email_public is a boolean visibility flag, not an address, so
    // the alert always goes to the professional's own account email.
    let recipient: string | null = null;
    if (pro?.user_id) {
      const { data: proUser } = await admin.auth.admin.getUserById(
        pro.user_id as string,
      );
      recipient = proUser?.user?.email ?? null;
    }
    if (!recipient) {
      return new Response(
        JSON.stringify({ sent: false, reason: "no address" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const customerName = escapeHtml(
      (customer.user_metadata?.full_name as string) ||
        customer.email ||
        "A customer",
    );
    const proName = escapeHtml(pro?.display_name ?? "there");
    const dashboard = "https://freluxtools.com/pro-connect/dashboard";
    const sent = await sendEmail(
      apiKey,
      recipient,
      "New client enquiry on FRELUX Pro Connect",
      `<p>Hello ${proName},</p>
       <p><strong>${customerName}</strong> has started a conversation with you on FRELUX Pro Connect.</p>
       <p>Open your dashboard to reply: <a href="${dashboard}">${dashboard}</a></p>
       <p>Replying quickly wins the job. You are receiving this because your profile is listed on FRELUX Pro Connect.</p>`,
    );
    return new Response(JSON.stringify({ sent: sent.sent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body?.type !== "contact" || typeof body.id !== "string") {
    return new Response(JSON.stringify({ error: "Unsupported request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Derive everything from the stored row; never trust caller-supplied
  // addresses or content.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ sent: false, reason: "no service env" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: row, error: rowError } = await admin
    .from("contact_messages")
    .select("id, name, email, subject, message")
    .eq("id", body.id)
    .maybeSingle<ContactRow>();
  if (rowError || !row || !row.email) {
    return new Response(
      JSON.stringify({ sent: false, reason: "row missing" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const results: { visitor: boolean; admin: boolean } = {
    visitor: false,
    admin: false,
  };

  const visitor = await sendEmail(
    apiKey,
    row.email,
    "We received your message: Frelux",
    visitorConfirmation(row),
  );
  results.visitor = visitor.sent;

  const adminInbox = resolveNotifyEmail((name) => Deno.env.get(name));
  if (adminInbox) {
    const notified = await sendEmail(
      apiKey,
      adminInbox,
      `New contact message: ${row.subject ?? "(no subject)"}`,
      adminNotification(row),
    );
    results.admin = notified.sent;
  }

  // Best-effort by design: HTTP 200 even when Resend rejects (e.g. the
  // freluxtools.com domain is not verified yet). The frontend ignores
  // the sent flag; the admin panel remains the source of truth.
  return new Response(
    JSON.stringify({ sent: results.visitor, detail: results }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};

serveWithCors(handler);
