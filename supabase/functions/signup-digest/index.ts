// =========================================================
// Signup Digest — daily notification email / SMS for the owner
// (owner directive 2026-10-08).
//
// pg_cron calls this once a day (07:05 UTC) with the
// x-digest-token header. The token is stored server-side in
// public.signup_digest_tokens, so no extra function secret is
// required; anyone without the token gets 401.
//
// What it reports: users who registered in the last 24 hours.
//  - Email via Resend to OWNER_NOTIFY_EMAIL (falls back to
//    CONTACT_NOTIFY_EMAIL). Sent daily, even when there are no
//    new signups, so the owner always hears the heartbeat.
//  - SMS via Termii to OWNER_NOTIFY_PHONE, only when there ARE
//    new signups (SMS credits are not spent on zero-news days).
//    Nigerian numbers are auto-formatted to 234… like send-sms-otp.
//
// Required env:
// - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (always set)
// - RESEND_API_KEY            for the email (skipped silently without)
// - OWNER_NOTIFY_EMAIL or CONTACT_NOTIFY_EMAIL for the email
// - OWNER_NOTIFY_PHONE + TERMII_API_KEY       for the SMS
// - TERMII_SENDER_ID optional, default "FRELUX"
//
// Deploy with --no-verify-jwt (the token header IS the gate).
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TERMII_ENDPOINT = "https://api.ng.termii.com/api/sms/send";
const FROM = "Frelux <noreply@freluxtools.com>";

interface ProfileRow {
  id: string;
  email: string;
  account_type: string | null;
  created_at: string;
}

function htmlEscape(value: string | null): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function digestHtml(rows: ProfileRow[], totalUsers: number): string {
  if (rows.length === 0) {
    return [
      `<p>No new Frelux registrations in the last 24 hours.</p>`,
      `<p>Total registered users: <strong>${totalUsers}</strong>.</p>`,
      '<p style="color:#888;font-size:12px;">Frelux daily signup digest</p>',
    ].join("\n");
  }
  const items = rows
    .map(
      (r) =>
        `<li><strong>${htmlEscape(r.email)}</strong> (${htmlEscape(
          r.account_type ?? "client",
        )}) joined ${htmlEscape(
          new Date(r.created_at).toISOString().slice(0, 16).replace("T", " "),
        )} UTC</li>`,
    )
    .join("\n");
  return [
    `<p><strong>${rows.length}</strong> new Frelux registration${rows.length === 1 ? "" : "s"} in the last 24 hours. Total registered users: <strong>${totalUsers}</strong>.</p>`,
    `<ul>${items}</ul>`,
    '<p style="color:#888;font-size:12px;">Frelux daily signup digest. Manage notifications in the Supabase secrets (OWNER_NOTIFY_EMAIL / OWNER_NOTIFY_PHONE).</p>',
  ].join("\n");
}

/** Format a phone number for the Termii gateway (Nigerian rules,
 * mirroring send-sms-otp). */
function formatPhone(phone: string): string {
  let p = phone.replace(/\s/g, "");
  if (p.startsWith("0")) p = "234" + p.slice(1);
  else if (p.startsWith("+234")) p = p.slice(1);
  else if (!p.startsWith("234")) p = "234" + p;
  return p;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Token gate: the stored token is the only accepted value. An
  // empty table means the owner never applied the migration.
  const { data: tokenRow } = await admin
    .from("signup_digest_tokens")
    .select("token")
    .limit(1)
    .maybeSingle();
  const expected = tokenRow?.token ?? "";
  const provided = req.headers.get("x-digest-token") ?? "";
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Registrations in the last 24 hours + total user count.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: rowsError } = await admin
    .from("profiles")
    .select("id, email, account_type, created_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(50);
  if (rowsError) {
    return new Response(JSON.stringify({ error: "profiles query failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const recent = (rows ?? []) as ProfileRow[];

  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const totalUsers = count ?? 0;

  const result: {
    new_users: number;
    email_sent: boolean;
    sms_sent: boolean;
  } = { new_users: recent.length, email_sent: false, sms_sent: false };

  // ── Email (daily heartbeat, zero news included) ──
  const ownerEmail =
    Deno.env.get("OWNER_NOTIFY_EMAIL") ??
    Deno.env.get("CONTACT_NOTIFY_EMAIL") ??
    "";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (ownerEmail && resendKey) {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [ownerEmail],
        subject:
          recent.length === 0
            ? "Frelux daily digest: no new signups"
            : `Frelux daily digest: ${recent.length} new signup${recent.length === 1 ? "" : "s"}`,
        html: digestHtml(recent, totalUsers),
      }),
    });
    result.email_sent = res.ok;
  }

  // ── SMS (only when there is news; SMS credits cost money) ──
  const ownerPhone = (Deno.env.get("OWNER_NOTIFY_PHONE") ?? "").trim();
  const termiiKey = Deno.env.get("TERMII_API_KEY") ?? "";
  if (recent.length > 0 && ownerPhone && termiiKey) {
    const byType = recent.reduce<Record<string, number>>((acc, r) => {
      const t = r.account_type ?? "client";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    const breakdown = Object.entries(byType)
      .map(([t, n]) => `${n} ${t.replace(/_/g, " ")}`)
      .join(", ");
    const message =
      `FRELUX daily: ${recent.length} new user${recent.length === 1 ? "" : "s"} (${breakdown}). Total: ${totalUsers}.`.slice(
        0,
        160,
      );
    const res = await fetch(TERMII_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: termiiKey,
        to: formatPhone(ownerPhone),
        from: Deno.env.get("TERMII_SENDER_ID") ?? "FRELUX",
        sms: message,
        type: "plain",
        channel: "generic",
      }),
    });
    result.sms_sent = res.ok;
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

serveWithCors(handler);
