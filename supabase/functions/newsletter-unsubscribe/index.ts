// =========================================================
// newsletter-unsubscribe — one-click opt out (Phase 12)
//
// GET ?token=<unsub_token>
//  - Marks the subscriber unsubscribed and serves a tiny
//    confirmation page. Unknown or already-used tokens get the
//    same generic page (no enumeration, no error page to
//    phish with).
//
// Deploy with --no-verify-jwt: the token IS the credential.
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

const SITE = "https://freluxtools.com";

function pageHtml(title: string, message: string): string {
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    `<title>${title}</title>`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<style>body{font-family:system-ui,sans-serif;background:#fafaf9;color:#1c1917;",
    "display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}",
    ".card{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:32px 40px;",
    "max-width:420px;text-align:center}h1{font-size:20px;margin:0 0 8px}",
    "p{color:#57534e;line-height:1.5;margin:0}a{color:#7c3aed}</style></head><body>",
    `<div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`,
  ].join("");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "GET") {
    return new Response(
      pageHtml("Unsupported", "Use the unsubscribe link from the email."),
      {
        status: 405,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return new Response(
      pageHtml(
        "Link not recognised",
        "This unsubscribe link is invalid. Use the link from a recent email, or subscribe again from the site.",
      ),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      pageHtml(
        "Try again later",
        "The service is not configured right now. Please try again later.",
      ),
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { error } = await db
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
    .eq("unsub_token", token)
    .eq("status", "active");
  if (error) {
    return new Response(
      pageHtml(
        "Try again later",
        "Something went wrong. Please try again later.",
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  // Same page whether the token matched or not (no enumeration).
  return new Response(
    pageHtml(
      "You are unsubscribed",
      `You will not receive any more price update emails. Changed your mind? <a href="${SITE}">Subscribe again</a> any time.`,
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
};

serveWithCors(handler);
