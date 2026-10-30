// Live Material Price Index, administrator review endpoint.
//
// The only path by which a submitted price can become a published one.
// Server-side because the client must not be able to approve its own
// submission, skip the audit trail, or write a price without a matching
// submission. Every action appends to price_index_audit, which has no update
// or delete policy.

import { createClient } from "npm:@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";

type Body = {
  action?: "approve" | "reject" | "flag" | "toggle_city";
  submission_id?: string;
  city_slug?: string;
  is_active?: boolean;
  note?: string | null;
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serveWithCors(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) {
    return json({ ok: false, error: "Pricing service is not configured." }, 500);
  }

  const userId = await getVerifiedUserId(req);
  if (!userId) return json({ ok: false, error: "Sign in to review prices." }, 401);

  // Service-role client: this function performs the write, but only after the
  // caller is proven to be an administrator.
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return json({ ok: false, error: "Administrator access is required." }, 403);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;

  const audit = async (entry: {
    action: string;
    entity: string;
    entity_id: string | null;
    before?: unknown;
    after?: unknown;
    note?: string | null;
  }) => {
    const { error } = await supabase.from("price_index_audit").insert({
      actor: userId,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id,
      before: entry.before ?? null,
      after: entry.after ?? null,
      note: entry.note ?? null,
    });
    if (error) console.error("audit append failed", error.message);
  };

  // ── City management ─────────────────────────────────────
  if (body.action === "toggle_city") {
    if (!body.city_slug || typeof body.is_active !== "boolean") {
      return json({ ok: false, error: "City and target state are required." }, 400);
    }
    const { data: before } = await supabase
      .from("market_cities")
      .select("slug,is_active")
      .eq("slug", body.city_slug)
      .maybeSingle();
    if (!before) return json({ ok: false, error: "Unknown city." }, 404);

    const { error } = await supabase
      .from("market_cities")
      .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
      .eq("slug", body.city_slug);
    if (error) return json({ ok: false, error: "The city could not be updated." }, 500);

    await audit({
      action: body.is_active ? "city_enabled" : "city_disabled",
      entity: "market_cities",
      entity_id: body.city_slug,
      before,
      after: { is_active: body.is_active },
      note,
    });
    return json({ ok: true, city_slug: body.city_slug, is_active: body.is_active });
  }

  // ── Submission review ───────────────────────────────────
  if (!body.submission_id) {
    return json({ ok: false, error: "A submission id is required." }, 400);
  }

  const { data: submission, error: fetchError } = await supabase
    .from("price_submissions")
    .select("*")
    .eq("id", body.submission_id)
    .maybeSingle();

  if (fetchError) return json({ ok: false, error: "The submission could not be read." }, 500);
  if (!submission) return json({ ok: false, error: "Unknown submission." }, 404);

  if (body.action === "flag") {
    const { error } = await supabase
      .from("price_submissions")
      .update({
        status: "flagged",
        flag_reason: note ?? "Flagged by an administrator.",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission.id);
    if (error) return json({ ok: false, error: "The submission could not be flagged." }, 500);

    // If this submission had already reached a live price, pull that price out
    // of circulation until it is resolved.
    if (submission.applied_price_id) {
      await supabase
        .from("estimation_prices")
        .update({ verification_status: "flagged", is_active: false })
        .eq("id", submission.applied_price_id);
    }

    await audit({
      action: "submission_flagged",
      entity: "price_submissions",
      entity_id: submission.id,
      before: { status: submission.status },
      after: { status: "flagged", flag_reason: note },
      note,
    });
    return json({ ok: true, status: "flagged" });
  }

  if (body.action === "reject") {
    const { error } = await supabase
      .from("price_submissions")
      .update({
        status: "rejected",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission.id);
    if (error) return json({ ok: false, error: "The submission could not be rejected." }, 500);

    await audit({
      action: "submission_rejected",
      entity: "price_submissions",
      entity_id: submission.id,
      before: { status: submission.status },
      after: { status: "rejected" },
      note,
    });
    return json({ ok: true, status: "rejected" });
  }

  if (body.action !== "approve") {
    return json({ ok: false, error: "Unknown action." }, 400);
  }

  // Approve: requires the submission to map onto a real catalogue material,
  // otherwise the price could never be used by a calculator.
  const { data: material } = submission.estimation_material_id
    ? await supabase
        .from("estimation_materials")
        .select("id,name")
        .eq("id", submission.estimation_material_id)
        .maybeSingle()
    : { data: null };

  if (!material) {
    return json(
      {
        ok: false,
        error:
          "This submission is not linked to a catalogue material. Match it to a material before approving, otherwise no calculator could use the price.",
      },
      409,
    );
  }

  const priceRow = {
    price_type: "material",
    ref_id: material.id,
    price: Number(submission.price),
    currency: "NGN",
    effective_date: new Date().toISOString().slice(0, 10),
    is_active: true,
    market: submission.market,
    city_slug: submission.city_slug ?? null,
    price_kind: submission.price_kind ?? "retail",
    sale_unit: submission.unit ?? null,
    supplier_name: submission.vendor ?? null,
    source_url: submission.source_url ?? null,
    price_source: submission.vendor
      ? `Supplier submission: ${submission.vendor}`
      : "Supplier submission",
    verified_at: new Date().toISOString(),
    verification_status: "verified",
    supporting_submissions: 1,
  };

  // One live price per material, city and basis: approving a fresher figure
  // supersedes the old one rather than stacking duplicates.
  const existingQuery = supabase
    .from("estimation_prices")
    .select("id,price")
    .eq("price_type", "material")
    .eq("ref_id", material.id)
    .eq("market", submission.market)
    .eq("price_kind", priceRow.price_kind)
    .eq("is_active", true);
  if (submission.city_slug) existingQuery.eq("city_slug", submission.city_slug);
  else existingQuery.is("city_slug", null);

  const { data: existing } = await existingQuery.limit(1);

  let priceId: string;
  let previousPrice: number | null = null;

  if (existing?.length) {
    priceId = existing[0].id as string;
    previousPrice = Number(existing[0].price);
    const { error } = await supabase
      .from("estimation_prices")
      .update({ ...priceRow, supporting_submissions: 1 })
      .eq("id", priceId);
    if (error) return json({ ok: false, error: "The price could not be updated." }, 500);
    await audit({
      action: "price_updated",
      entity: "estimation_prices",
      entity_id: priceId,
      before: { price: previousPrice },
      after: { price: priceRow.price },
      note: note ?? `Approved submission ${submission.id}`,
    });
  } else {
    const { data: inserted, error } = await supabase
      .from("estimation_prices")
      .insert(priceRow)
      .select("id")
      .single();
    if (error || !inserted) {
      return json({ ok: false, error: "The price could not be written." }, 500);
    }
    priceId = inserted.id as string;
    await audit({
      action: "price_set",
      entity: "estimation_prices",
      entity_id: priceId,
      after: priceRow,
      note: note ?? `Approved submission ${submission.id}`,
    });
  }

  // History row: calculators and the index chart read this.
  await supabase.from("estimation_price_history").insert({
    price_type: "material",
    ref_id: material.id,
    old_price: previousPrice,
    new_price: priceRow.price,
    currency: "NGN",
    changed_by: userId,
    change_reason: `Approved supplier submission${submission.vendor ? ` (${submission.vendor})` : ""}`,
  });

  const { error: updateError } = await supabase
    .from("price_submissions")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      applied_price_id: priceId,
      applied_price: priceRow.price,
      applied_at: new Date().toISOString(),
      verification_count: (submission.verification_count ?? 0) + 1,
    })
    .eq("id", submission.id);

  if (updateError) {
    // The price is written; say so rather than pretending the whole thing failed.
    console.error("submission status update failed", updateError.message);
    return json({
      ok: true,
      warning: "Price published, but the submission record could not be updated.",
      price_id: priceId,
    });
  }

  await audit({
    action: "submission_approved",
    entity: "price_submissions",
    entity_id: submission.id,
    before: { status: submission.status },
    after: { status: "approved", price_id: priceId, price: priceRow.price },
    note,
  });

  return json({
    ok: true,
    status: "approved",
    price_id: priceId,
    material: material.name,
    price: priceRow.price,
  });
});
