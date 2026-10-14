// =========================================================
// FRELUX EDGE: workflow-notify
//
// Sends ONE email per workflow event (transition, revision,
// comment) to the project owner. Closes the workflow engine's
// "no email notifications" gap.
//
// Security model (mirrors send-welcome-email):
//   * Caller MUST be authenticated; the document's project
//     owner must be the caller (verified server-side).
//   * The recipient is derived server-side from the profiles
//     row — a caller-supplied address is never used.
//   * Content is fixed server-side templates; the event data
//     (statuses, note) is loaded from the DB, not the request.
//   * At-most-once per event: workflow_notify_log has a unique
//     event_id; the slot is claimed before sending and
//     released if Resend fails, so retries work but a
//     successful send can never repeat.
//   * Silent, honest no-op when no Resend key is active
//     (env var first, then the admin-pasted key in
//     integration_secrets) — nothing is logged in that case,
//     so a key pasted later still allows a retry.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Frelux <noreply@freluxtools.com>";
const SITE = "https://freluxtools.com";

const TYPE_LABELS: Record<string, string> = {
  rfi: "RFI",
  submittal: "Submittal",
  change_order: "Change Order",
};

function htmlEscape(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function notifyHtml(
  doc: {
    doc_type: string;
    reference_code: string;
    title: string;
    assignee: string | null;
    due_date: string | null;
    from_status: string | null;
    to_status: string;
    note: string | null;
  },
  projectName: string,
  firstName: string,
): string {
  const typeLabel = TYPE_LABELS[doc.doc_type] ?? "Workflow item";
  const rows: string[] = [
    `<li><strong>Item:</strong> ${htmlEscape(`${typeLabel} ${doc.reference_code}`)}</li>`,
    `<li><strong>Title:</strong> ${htmlEscape(doc.title)}</li>`,
    `<li><strong>Project:</strong> ${htmlEscape(projectName)}</li>`,
  ];
  if (doc.from_status && doc.from_status !== doc.to_status) {
    rows.push(
      `<li><strong>Status:</strong> ${htmlEscape(doc.from_status)} → ${htmlEscape(doc.to_status)}</li>`,
    );
  } else {
    rows.push(`<li><strong>Status:</strong> ${htmlEscape(doc.to_status)}</li>`);
  }
  if (doc.assignee) {
    rows.push(
      `<li><strong>Assignee:</strong> ${htmlEscape(doc.assignee)}</li>`,
    );
  }
  if (doc.due_date) {
    rows.push(
      `<li><strong>Due date:</strong> ${htmlEscape(doc.due_date)}</li>`,
    );
  }
  if (doc.note) {
    rows.push(`<li><strong>Note:</strong> ${htmlEscape(doc.note)}</li>`);
  }
  return [
    `<p>Hi ${htmlEscape(firstName)},</p>`,
    `<p>A workflow item in your Frelux project was just updated:</p>`,
    `<ul>`,
    ...rows,
    `</ul>`,
    `<p><a href="${SITE}">Open your Frelux dashboard</a> to review the full audit history.</p>`,
    `<p style="color:#6b7280;font-size:12px">This is an automated notification from Frelux. You receive it because you own this project.</p>`,
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
  const limit = checkRateLimit(`workflow-notify:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { document_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (
    typeof body?.document_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.document_id)
  ) {
    return new Response(
      JSON.stringify({ error: "document_id (uuid) required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ sent: false, reason: "not configured" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Caller must be authenticated; identify them from the token.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { data: authUser, error: authError } = await admin.auth.getUser(token);
  if (authError || !authUser?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const callerId = authUser.user.id;

  // Load the document + project server-side and verify the
  // caller owns the project. Nothing from the request body is
  // used for content.
  const { data: doc, error: docError } = await admin
    .from("workflow_documents")
    .select(
      `id, doc_type, reference_code, title, assignee, due_date, status,
       project:project_id (id, name, user_id)`,
    )
    .eq("id", body.document_id)
    .maybeSingle();
  const project = doc?.project as
    { id: string; name: string | null; user_id: string } | undefined;
  if (docError || !doc || !project || project.user_id !== callerId) {
    return new Response(JSON.stringify({ sent: false, reason: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Latest recorded event for this document is the trigger.
  const { data: events, error: eventError } = await admin
    .from("workflow_events")
    .select("id, event_type, from_status, to_status, note, created_at")
    .eq("document_id", doc.id)
    .limit(20);
  if (eventError || !Array.isArray(events) || events.length === 0) {
    return new Response(JSON.stringify({ sent: false, reason: "no event" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = events.reduce((a: (typeof events)[0], b: (typeof events)[0]) =>
    String(b.created_at ?? "") > String(a.created_at ?? "") ? b : a,
  );

  // Recipient derived server-side from the profiles row.
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", callerId)
    .maybeSingle();
  if (!profile?.email) {
    return new Response(
      JSON.stringify({ sent: false, reason: "no profile email" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const apiKey = await resolveResendKey();
  if (!apiKey) {
    // Nothing logged: a key pasted later still allows a retry.
    return new Response(
      JSON.stringify({ sent: false, reason: "not configured" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // Claim the at-most-once slot BEFORE sending; release it on
  // failure so retries work.
  const { data: claimed, error: claimError } = await admin
    .from("workflow_notify_log")
    .insert({
      document_id: doc.id,
      event_id: event.id,
      status: "sent",
      detail: null,
    })
    .select("id")
    .single();
  if (claimError || !claimed) {
    return new Response(
      JSON.stringify({ sent: false, reason: "already notified" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const firstName = (profile.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const typeLabel = TYPE_LABELS[doc.doc_type] ?? "Workflow item";
  const subject =
    event.from_status && event.from_status !== event.to_status
      ? `Frelux: ${typeLabel} ${doc.reference_code} is now ${event.to_status}`
      : `Frelux: ${typeLabel} ${doc.reference_code} update`;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [profile.email],
      subject,
      html: notifyHtml(
        {
          doc_type: doc.doc_type,
          reference_code: doc.reference_code,
          title: doc.title,
          assignee: doc.assignee,
          due_date: doc.due_date,
          from_status: event.from_status,
          to_status: event.to_status ?? doc.status,
          note: event.note,
        },
        project.name ?? "(unnamed project)",
        firstName,
      ),
    }),
  });
  if (!response.ok) {
    // Release the slot: an honest failure keeps retries possible.
    await admin.from("workflow_notify_log").delete().eq("id", claimed.id);
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

  return new Response(JSON.stringify({ sent: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

serveWithCors(handler);
