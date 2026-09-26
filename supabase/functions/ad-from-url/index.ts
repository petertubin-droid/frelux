// =========================================================
// Ad-from-URL — Supabase Edge Function
// =========================================================
// AI Assistant for the Network Hub → House Promos → External
// Partner Promos editor ("create an ad from a URL").
//
// Flow:
//   1. Admin pastes a partner's URL in the House Promos tab.
//   2. This function fetches the page server-side (SSRF-guarded),
//      extracts its REAL og:title / og:description / og:image
//      (with <title>, meta description and favicon fallbacks, and
//      relative-URL resolution against the page origin).
//   3. Returns { label, blurb, url, owner_name, logo_url } so the
//      admin UI can drop a fully-filled partner row in for review.
//
// No LLM is needed for the extraction itself — deterministic meta
// parsing keeps it fast, quota-free and honest: the ad copy is
// always the partner's own description, never an invention.
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { jsonResponse, errorResponse, handleCors } from "../_shared/cors.ts";
import { serveWithCors } from "../_shared/serve.ts";

/** SSRF guard: block loopback, link-local, private and internal hosts
 *  so an admin can't make the edge function fetch internal surfaces. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (
      a === 127 ||
      a === 10 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }
  return false;
}

/** Decode the common HTML entities a scraped meta tag can carry. */
function decodeEntities(v: string): string {
  return v
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function pick(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : "";
}

serveWithCors(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // ── Auth: admin only (same gate as ai-admin-assistant) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Authentication required", 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return errorResponse("Invalid authentication", 401);
    }
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return errorResponse("Admin access required", 403);
    }

    // ── Parse + validate the target URL ──
    const body = (await req.json()) as { url?: string };
    const raw = String(body?.url ?? "").trim();
    if (!raw) {
      return errorResponse("A URL is required", 400);
    }
    // A URL that already carries a non-http(s) scheme is invalid, not a
    // bare host to prefix (ftp://x must not become https://ftp://x).
    const schemeMatch = raw.match(/^[a-z][a-z0-9+.-]*:/i);
    if (schemeMatch && !/^https?:/i.test(schemeMatch[0])) {
      return errorResponse("Only http:// and https:// URLs are supported", 400);
    }
    const target = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return errorResponse("That is not a valid URL", 400);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return errorResponse("Only http:// and https:// URLs are supported", 400);
    }
    if (isBlockedHost(parsed.hostname)) {
      return errorResponse("That host cannot be fetched", 400);
    }

    // ── Fetch the page ──
    let html = "";
    try {
      const fetchRes = await fetch(parsed.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FreluxAdAssistant/1.0)",
        },
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });
      if (!fetchRes.ok) {
        return errorResponse(
          `That site responded with ${fetchRes.status}. Double-check the URL.`,
          502,
        );
      }
      html = await fetchRes.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "network error";
      return errorResponse(`Could not reach that URL: ${msg}`, 502);
    }

    // ── Extract real meta (og: first, sensible fallbacks) ──
    const title =
      pick(
        html,
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      pick(
        html,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      ) ||
      pick(html, /<title[^>]*>([^<]+)<\/title>/i);
    const description =
      pick(
        html,
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      pick(
        html,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
      ) ||
      pick(
        html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      pick(
        html,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      );
    let logoUrl =
      pick(
        html,
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      pick(
        html,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      );
    if (logoUrl) {
      try {
        logoUrl = new URL(logoUrl, parsed).toString();
      } catch {
        logoUrl = "";
      }
    }
    if (!logoUrl) {
      // Favicon fallback so the Display format always has something.
      const iconHref =
        pick(
          html,
          /<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i,
        ) ||
        pick(
          html,
          /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["']/i,
        );
      if (iconHref) {
        try {
          logoUrl = new URL(iconHref, parsed).toString();
        } catch {
          logoUrl = "";
        }
      }
    }

    const host = parsed.hostname.replace(/^www\./, "");
    return jsonResponse({
      label: title || host,
      blurb: description || `Visit ${host}.`,
      url: parsed.toString(),
      owner_name: host,
      logo_url: logoUrl || "",
    });
  } catch (err) {
    console.error("[ad-from-url] Unhandled error:", err);
    return errorResponse("Internal server error", 500);
  }
});
