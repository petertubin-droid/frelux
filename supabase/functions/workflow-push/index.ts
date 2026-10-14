// =========================================================
// FRELUX EDGE: workflow-push
//
// Sends Web Push notifications (RFC 8030/8291/8292, VAPID) for
// workflow events to the project owner's subscribed browsers.
// Closes the workflow engine's "no push notifications" gap
// with NO third-party provider — the platform itself is the
// push application server.
//
// Security model (mirrors workflow-notify):
//   * Caller MUST be authenticated; the document's project
//     owner must be the caller (verified server-side).
//   * Payload content is derived server-side from the DB
//     (document + newest event); nothing from the request body
//     is used for content.
//   * Delivery targets ONLY the caller's own subscriptions
//     (workflow_push_subscriptions, user_id = caller).
//   * At-most-once per (event, browser) via the
//     workflow_push_log unique index: the slot is claimed
//     before sending; transient failures release the claim so
//     retries work, dead endpoints (404/410) get their
//     subscription pruned and their log row kept as 'failed'.
//   * Silent, honest no-op when no VAPID keys are active (env
//     vars first, then the admin-pasted keys in
//     integration_secrets: web-push-public / web-push-private)
//     — nothing is logged, so keys pasted later still allow a
//     retry. A push with no subscriptions at all is also an
//     honest no-op.
//   * Crypto is hand-rolled WebCrypto (see _shared/web-push.ts)
//     and validated byte-for-byte against the official RFC
//     8291 test vector in web-push.test.ts.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";
import {
  deadEndpoint,
  encryptPayload,
  vapidHeader,
} from "../_shared/web-push.ts";

const SITE = "https://freluxtools.com";
const VAPID_SUBJECT = "mailto:noreply@freluxtools.com";

const TYPE_LABELS: Record<string, string> = {
  rfi: "RFI",
  submittal: "Submittal",
  change_order: "Change Order",
};

async function resolveSecret(providerId: string): Promise<string | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/integration_secrets?select=key_value&provider_id=eq.${providerId}&status=eq.active`,
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

/** VAPID keys: env vars first, then admin-pasted DB rows. */
async function resolveVapidKeys(): Promise<{
  public: string;
  private: string;
} | null> {
  const envPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const envPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  if (envPublic && envPrivate) {
    return { public: envPublic, private: envPrivate };
  }
  const [pub, priv] = await Promise.all([
    resolveSecret("web-push-public"),
    resolveSecret("web-push-private"),
  ]);
  if (!pub || !priv) return null;
  return { public: pub, private: priv };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = checkRateLimit(`workflow-push:${ip}`, {
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

  // Document + project verified server-side; caller must own it.
  const { data: doc, error: docError } = await admin
    .from("workflow_documents")
    .select(
      `id, doc_type, reference_code, title, status,
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

  // Newest recorded event for this document is the trigger
  // (selected deterministically — never rely on server order).
  const { data: events, error: eventError } = await admin
    .from("workflow_events")
    .select("id, event_type, from_status, to_status, note, created_at")
    .eq("document_id", doc.id)
    .limit(20);
  if (eventError || !Array.isArray(events) || events.length === 0) {
    return new Response(JSON.stringify({ sent: false, reason: "no event" }), {
      status: 200,
      headers: { "Content-Type": "application/json" } as Record<string, string>,
    });
  }
  const event = events.reduce((a: (typeof events)[0], b: (typeof events)[0]) =>
    String(b.created_at ?? "") > String(a.created_at ?? "") ? b : a,
  );

  // Push delivery targets the caller's own subscriptions only.
  const { data: subs, error: subsError } = await admin
    .from("workflow_push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .eq("user_id", callerId)
    .limit(50);
  if (subsError || !Array.isArray(subs) || subs.length === 0) {
    return new Response(
      JSON.stringify({ sent: false, reason: "no subscriptions" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const keys = await resolveVapidKeys();
  if (!keys) {
    return new Response(
      JSON.stringify({ sent: false, reason: "not configured" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const typeLabel = TYPE_LABELS[doc.doc_type] ?? "Workflow item";
  const isTransition =
    event.event_type === "transition" &&
    event.from_status &&
    event.from_status !== event.to_status;
  const payload = JSON.stringify({
    title: isTransition
      ? `Frelux: ${typeLabel} ${doc.reference_code} is now ${event.to_status}`
      : `Frelux: ${typeLabel} ${doc.reference_code} update`,
    body: isTransition
      ? `${doc.title}${project.name ? ` (${project.name})` : ""}: ${event.from_status} → ${event.to_status}`
      : `${doc.title}${project.name ? ` (${project.name})` : ""}: ${event.to_status}`,
    tag: `workflow-${doc.id}`,
    url: SITE,
  });

  let sent = 0;
  let pruned = 0;
  let failed = 0;

  for (const sub of subs) {
    // At-most-once claim BEFORE sending.
    const { data: claimed, error: claimError } = await admin
      .from("workflow_push_log")
      .insert({
        document_id: doc.id,
        event_id: event.id,
        subscription_id: sub.id,
        status: "sent",
        detail: null,
      })
      .select("id")
      .single();
    if (claimError || !claimed) continue; // already pushed to this browser

    try {
      const encrypted = await encryptPayload(payload, sub.p256dh, sub.auth);
      const authorization = await vapidHeader(
        sub.endpoint,
        keys.public,
        keys.private,
        VAPID_SUBJECT,
      );
      const res = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          TTL: "3600",
          Urgency: "normal",
          Authorization: authorization,
        },
        body: encrypted as unknown as BodyInit,
      });
      if (res.ok || res.status >= 500 || res.status === 429) {
        if (res.ok) sent++;
        else {
          // Transient failure: release the claim so a retry works.
          await admin.from("workflow_push_log").delete().eq("id", claimed.id);
          failed++;
        }
        continue;
      }
      if (deadEndpoint(res.status)) {
        // Dead subscription: prune it and keep the log row as
        // 'failed' — this browser must re-subscribe.
        await admin
          .from("workflow_push_log")
          .update({ status: "failed", detail: `endpoint ${res.status}` })
          .eq("id", claimed.id);
        await admin
          .from("workflow_push_subscriptions")
          .delete()
          .eq("id", sub.id);
        pruned++;
        continue;
      }
      // Other client errors (400/403): release and mark failed.
      await admin.from("workflow_push_log").delete().eq("id", claimed.id);
      failed++;
    } catch {
      // Network error: release the claim so a retry can work.
      await admin.from("workflow_push_log").delete().eq("id", claimed.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ sent: sent > 0, count: sent, pruned, failed }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

serveWithCors(handler);
