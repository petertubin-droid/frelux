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
import { renderEmail } from "../_shared/email/kit.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Frelux <noreply@freluxtools.com>";
const REPLY_TO = "Frelux <freluxtools@gmail.com>";
const SITE = "https://freluxtools.com";

function welcomeContent(profile: {
  email: string;
  full_name: string | null;
  account_type: string | null;
}): Parameters<typeof renderEmail>[0] {
  const firstName =
    (profile.full_name ?? "").trim().split(/\s+/)[0] ||
    (profile.email.split("@")[0] ?? "there");
  const isPro = profile.account_type === "pro_worker";
  return {
    preheader:
      "Your Frelux account is ready. Run your first estimate in under a minute.",
    heading: `Welcome to Frelux, ${firstName}`,
    paragraphs: [
      "Your account is ready.",
      "Frelux is every trade, every cost, one platform: instant construction estimates for painting, tiling, roofing, solar, boreholes and more, with real rates for Nigeria and over 40 countries.",
      "Three things worth doing first:",
    ],
    bullets: [
      "Run an estimate. Pick any calculator on the home page and get materials, labour and totals in seconds.",
      "Read the guide. The Learn library explains real quantities, from paint coverage to borehole sizing.",
      isPro
        ? "Build your pro profile. Pro Connect lets clients find and hire you for work in your trade."
        : "Find a pro. Pro Connect matches you with verified professionals for your project.",
    ],
    cta: { label: "Start an estimate", href: "https://freluxtools.com/" },
    links: [
      { label: "Browse every calculator", href: "https://freluxtools.com/" },
      {
        label: "Read the Learn library",
        href: "https://freluxtools.com/learn/",
      },
      { label: "Talk to a human", href: "https://freluxtools.com/contact" },
    ],
    note: `You are receiving this because you created a Frelux account (${profile.email}).`,
    footer: "Frelux, construction estimation for every trade.",
  };
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

  const apiKey = await resolveResendKey();
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
      reply_to: REPLY_TO,
      to: [profile.email],
      subject: "Welcome to Frelux",
      ...renderEmail(welcomeContent(profile)),
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
