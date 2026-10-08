// =========================================================
// Send Welcome Email — fired automatically when a new user
// registers (owner directive 2026-10-08).
//
// Every signup path (email + password, Google OAuth, email OTP)
// creates a profiles row via the on_auth_user_created trigger,
// and the client calls this function right after the profile
// loads with welcome_email_sent = false. One integration point
// covers all paths; the flag is the at-most-once guard.
//
// Safety rules (mirroring the platform's edge conventions):
//  - Rate limited: 5 requests / minute / IP.
//  - Deployed with --no-verify-jwt so it also works when email
//    confirmation is on (no session yet). The caller names a
//    user_id but the recipient email is derived server-side
//    from the profiles row; content is fixed server-side text.
//  - At-most-once per user: profiles.welcome_email_sent is
//    checked and set server-side, so repeated calls (multiple
//    tabs, retries) never double-send.
//  - Best effort: HTTP 200 with sent:false when Resend is not
//    configured or rejects; the auth flow never waits on it.
//
// Required env:
// - RESEND_API_KEY          Resend API key (re_...)
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Frelux <noreply@freluxtools.com>";
const SITE = "https://freluxtools.com";

function htmlEscape(value: string | null): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function welcomeHtml(profile: {
  email: string;
  full_name: string | null;
  account_type: string | null;
}): string {
  const firstName =
    (profile.full_name ?? "").trim().split(/\s+/)[0] ||
    (profile.email.split("@")[0] ?? "there");
  const isPro = profile.account_type === "pro_worker";
  return [
    `<p>Hi ${htmlEscape(firstName)},</p>`,
    "<p>Welcome to Frelux. Your account is ready.</p>",
    "<p>Frelux is every trade, every cost, one platform: instant construction estimates for painting, tiling, roofing, solar, boreholes and more, with real rates for Nigeria and 40+ countries.</p>",
    "<p>Here is how to get the most out of it:</p>",
    "<ul>",
    `<li><strong>Run your first estimate.</strong> Pick any calculator on the <a href="${SITE}/">home page</a> and get costs in seconds: materials, labour and totals.</li>`,
    `<li><strong>Learn the trade.</strong> The <a href="${SITE}/learn/">Learn library</a> has practical guides written for real projects, from paint quantities to borehole sizing.</li>`,
    isPro
      ? `<li><strong>Build your pro profile.</strong> Pro Connect lets clients find and hire you for jobs in your trade.</li>`
      : `<li><strong>Find a pro.</strong> Need hands on site? Pro Connect matches you with verified professionals for your project.</li>`,
    `</ul>`,
    "<p>Got a question or a project that does not fit a calculator? Reply to the contact page and a human gets back to you.</p>",
    "<p>Build well,<br>The Frelux team</p>",
    '<p style="color:#888;font-size:12px;">Frelux: construction estimation, powered by FRELUX PROJECT CALC.</p>',
    `<p style="color:#888;font-size:12px;">You are receiving this email because you created a Frelux account (${htmlEscape(profile.email)}).</p>`,
  ].join("\n");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit per client IP.
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = checkRateLimit(`send-welcome-email:${ip}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (
    typeof body?.user_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.user_id)
  ) {
    return new Response(JSON.stringify({ error: "user_id (uuid) required" }), {
      status: 400,
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
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Derive the recipient server-side; never trust caller-supplied
  // addresses.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name, account_type, welcome_email_sent")
    .eq("id", body.user_id)
    .maybeSingle();
  if (profileError || !profile || !profile.email) {
    return new Response(JSON.stringify({ sent: false, reason: "no profile" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // At-most-once: a repeat call (second tab, retry, login after
  // the first welcome already went out) is a silent no-op.
  if (profile.welcome_email_sent === true) {
    return new Response(
      JSON.stringify({ sent: false, reason: "already sent" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [profile.email],
      subject: "Welcome to Frelux",
      html: welcomeHtml(profile),
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    return new Response(
      JSON.stringify({
        sent: false,
        reason: "resend",
        detail: detail.slice(0, 200),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // Only set the flag after a confirmed send, so a Resend outage
  // does not permanently swallow the welcome.
  await admin
    .from("profiles")
    .update({ welcome_email_sent: true })
    .eq("id", profile.id);

  return new Response(JSON.stringify({ sent: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

serveWithCors(handler);
