// =========================================================
// Verified export entitlement (server-side).
//
// The BOQ verified export is a paid artifact, but the PDF is drawn in the
// browser, so its content cannot be protected. What CAN be refused at the
// server is the part that makes an export "verified": the blockchain
// registration. Until now that endpoint took any signed-in caller, so a free
// account could mint a verified, Bitcoin-anchored BOQ from the console while
// the UI showed a paywall.
//
// Scope is deliberately narrow: only document_type "boq" is gated, because that
// is the paywalled product. Quotations, material schedules, bank estimates and
// cost plans keep their current behaviour, so nothing already working breaks.
// =========================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type EntitlementVerdict =
  | { ok: true; via: "admin" | "plan" }
  | { ok: false; code: string; message: string };

/**
 * Does this user hold the verified-export entitlement?
 *
 * Admin, or an active paid plan. An expired plan is not paid: `paid_until` in
 * the past means the plan lapsed, the same rule the browser applies. A read
 * failure is reported as unavailable rather than as a refusal, so a database
 * blip cannot silently downgrade a paying customer.
 */
export async function checkVerifiedExportEntitlement(
  userId: string,
  options: { url?: string; serviceKey?: string } = {},
): Promise<EntitlementVerdict> {
  const url = options.url ?? Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey =
    options.serviceKey ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) {
    return {
      ok: false,
      code: "VERIFIED_EXPORT_UNAVAILABLE",
      message: "Verified export could not be checked. Try again shortly.",
    };
  }

  const admin = createClient(url, serviceKey);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    return {
      ok: false,
      code: "VERIFIED_EXPORT_UNAVAILABLE",
      message: "Verified export could not be checked. Try again shortly.",
    };
  }
  if (profile?.role === "admin") return { ok: true, via: "admin" };

  const { data: paid, error: paidError } = await admin
    .from("user_paid_status")
    .select("is_paid, plan, paid_until")
    .eq("user_id", userId)
    .maybeSingle();
  if (paidError) {
    return {
      ok: false,
      code: "VERIFIED_EXPORT_UNAVAILABLE",
      message: "Verified export could not be checked. Try again shortly.",
    };
  }

  const active =
    Boolean(paid?.is_paid) &&
    (!paid?.paid_until || new Date(paid.paid_until).getTime() > Date.now());
  if (active) return { ok: true, via: "plan" };

  return {
    ok: false,
    code: "VERIFIED_EXPORT_REQUIRES_PLAN",
    message:
      "A verified, blockchain-anchored BOQ is part of a paid plan. The free summary export stays available.",
  };
}
