// Supplier network operations.
//
// Everything in the marketplace that a client must not be able to do alone runs
// here, on the server, against the caller's verified identity:
//
//   * awarding a quote and creating an order (money moves, so totals are
//     recomputed from the stored quote, never trusted from the browser);
//   * order status progression and delivery confirmation (only a party to the
//     order may act);
//   * verification decisions, listing moderation, paid placement, complaint
//     resolution and plan changes (administrators only).
//
// Every decision appends to supplier_audit_log, which no client can edit or
// delete. No card details are handled anywhere in this function; a paid order
// only ever stores a payment provider reference.

import { createClient } from "npm:@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";

type Json = Record<string, unknown>;

function json(payload: Json, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const VERIFICATION_LEVELS = [
  "unverified",
  "identity_checked",
  "documents_reviewed",
  "address_checked",
  "platform_verified",
] as const;

const ORDER_FLOW: Record<string, string[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["dispatched", "cancelled"],
  dispatched: ["delivered", "disputed"],
  delivered: ["completed", "disputed"],
  completed: [],
  cancelled: [],
  disputed: ["completed", "cancelled"],
};

function money(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function orderReference(): string {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${stamp}-${suffix}`;
}

serveWithCors(async (req: Request): Promise<Response> => {
  if (req.method !== "POST")
    return json({ ok: false, error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey)
    return json({ ok: false, error: "Service is not configured." }, 500);

  const userId = await getVerifiedUserId(req);
  if (!userId) return json({ ok: false, error: "Sign in to continue." }, 401);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let body: Json;
  try {
    body = (await req.json()) as Json;
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  const action = String(body.action ?? "");

  const [{ data: profile }, { data: supplier }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    supabase
      .from("supplier_profiles")
      .select("id,company_name,market_code,city,is_active")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const isAdmin = profile?.role === "admin";
  const supplierId = (supplier?.id as string | undefined) ?? null;

  async function audit(entry: {
    action: string;
    entity_type: string;
    entity_ref: string | null;
    detail: Json;
  }) {
    await supabase.from("supplier_audit_log").insert({
      actor_id: userId,
      actor_role: isAdmin ? "admin" : supplierId ? "supplier" : "buyer",
      action: entry.action,
      entity_type: entry.entity_type,
      entity_ref: entry.entity_ref,
      detail: entry.detail,
    });
  }

  /** The supplier id of the caller, checked against the row being operated on. */
  function requireAdmin(): Response | null {
    return isAdmin
      ? null
      : json({ ok: false, error: "Administrator access is required." }, 403);
  }

  // ── Buyer awards a quotation ────────────────────────────────────
  if (action === "award_quote") {
    const requestId = String(body.request_id ?? "");
    const quoteId = String(body.quote_id ?? "");
    if (!requestId || !quoteId)
      return json(
        { ok: false, error: "A request and a quote are required." },
        400,
      );

    const { data: request } = await supabase
      .from("material_requests")
      .select(
        "id,buyer_id,status,currency,awarded_quote_id,reference,market_code",
      )
      .eq("id", requestId)
      .maybeSingle();
    if (!request)
      return json({ ok: false, error: "That request was not found." }, 404);
    if (request.buyer_id !== userId)
      return json(
        { ok: false, error: "Only the buyer can award this request." },
        403,
      );
    if (request.awarded_quote_id)
      return json(
        { ok: false, error: "This request has already been awarded." },
        409,
      );
    if (!["open", "quoted"].includes(String(request.status))) {
      return json(
        { ok: false, error: "This request is no longer open for award." },
        409,
      );
    }

    const { data: quote } = await supabase
      .from("material_request_quotes")
      .select(
        "id,request_id,supplier_id,supplier_user_id,currency,subtotal,delivery_fee,total,status,lead_time_days",
      )
      .eq("id", quoteId)
      .maybeSingle();
    if (!quote)
      return json({ ok: false, error: "That quotation was not found." }, 404);
    if (quote.request_id !== requestId)
      return json(
        { ok: false, error: "That quotation belongs to another request." },
        400,
      );
    if (quote.status !== "submitted")
      return json(
        { ok: false, error: "That quotation is no longer open." },
        409,
      );

    // Totals are recomputed in cents from the stored figures; the browser cannot
    // propose an order total.
    const subtotal = money(quote.subtotal);
    const delivery = money(quote.delivery_fee);
    const total = Math.round((subtotal + delivery) * 100) / 100;

    const { data: order, error: orderError } = await supabase
      .from("material_orders")
      .insert({
        reference: orderReference(),
        request_id: requestId,
        quote_id: quoteId,
        buyer_id: userId,
        supplier_id: quote.supplier_id,
        currency: quote.currency ?? request.currency,
        subtotal,
        delivery_fee: delivery,
        total,
        status: "placed",
        expected_delivery: null,
      })
      .select("*")
      .single();
    if (orderError || !order) {
      console.error("order insert failed", orderError?.message);
      return json({ ok: false, error: "The order could not be created." }, 500);
    }

    await supabase
      .from("material_request_quotes")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", quoteId);
    await supabase
      .from("material_request_quotes")
      .update({ status: "declined" })
      .eq("request_id", requestId)
      .neq("id", quoteId)
      .eq("status", "submitted");
    await supabase
      .from("material_requests")
      .update({
        status: "awarded",
        awarded_quote_id: quoteId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    await supabase.from("material_order_events").insert({
      order_id: order.id,
      status: "placed",
      actor_id: userId,
      note: `Awarded to quotation ${quoteId}`,
    });

    await audit({
      action: "award_quote",
      entity_type: "material_order",
      entity_ref: order.id as string,
      detail: {
        request_id: requestId,
        quote_id: quoteId,
        supplier_id: quote.supplier_id,
        total,
      },
    });

    return json({ ok: true, order });
  }

  // ── Supplier advances an order ──────────────────────────────────
  if (action === "advance_order") {
    const orderId = String(body.order_id ?? "");
    const next = String(body.status ?? "");
    if (!orderId || !next)
      return json(
        { ok: false, error: "An order and a status are required." },
        400,
      );

    const { data: order } = await supabase
      .from("material_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!order)
      return json({ ok: false, error: "That order was not found." }, 404);
    if (!supplierId || order.supplier_id !== supplierId) {
      return json(
        {
          ok: false,
          error: "Only the supplier on this order can update its progress.",
        },
        403,
      );
    }
    const allowed = ORDER_FLOW[String(order.status)] ?? [];
    if (!allowed.includes(next)) {
      return json(
        {
          ok: false,
          error: `An order that is ${order.status} cannot move to ${next}.`,
        },
        409,
      );
    }

    const patch: Json = { status: next, updated_at: new Date().toISOString() };
    if (next === "delivered") patch.delivered_at = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("material_orders")
      .update(patch)
      .eq("id", orderId)
      .select("*")
      .single();
    if (error)
      return json({ ok: false, error: "The order could not be updated." }, 500);

    await supabase.from("material_order_events").insert({
      order_id: orderId,
      status: next,
      actor_id: userId,
      note: (body.note as string | null) ?? null,
    });
    await audit({
      action: "advance_order",
      entity_type: "material_order",
      entity_ref: orderId,
      detail: { from: order.status, to: next },
    });
    return json({ ok: true, order: updated });
  }

  // ── Buyer confirms delivery ─────────────────────────────────────
  if (action === "confirm_delivery") {
    const orderId = String(body.order_id ?? "");
    if (!orderId)
      return json({ ok: false, error: "An order is required." }, 400);
    const { data: order } = await supabase
      .from("material_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!order)
      return json({ ok: false, error: "That order was not found." }, 404);
    if (order.buyer_id !== userId)
      return json(
        { ok: false, error: "Only the buyer can confirm delivery." },
        403,
      );
    if (!["delivered", "dispatched"].includes(String(order.status))) {
      return json(
        {
          ok: false,
          error:
            "Delivery can only be confirmed once the supplier has dispatched or delivered the goods.",
        },
        409,
      );
    }

    const patch = {
      status: "completed",
      delivered_at: order.delivered_at ?? new Date().toISOString(),
      delivery_confirmed_by: userId,
      delivery_note: (body.note as string | null) ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data: updated, error } = await supabase
      .from("material_orders")
      .update(patch)
      .eq("id", orderId)
      .select("*")
      .single();
    if (error)
      return json(
        { ok: false, error: "The confirmation could not be saved." },
        500,
      );

    await supabase.from("material_order_events").insert({
      order_id: orderId,
      status: "completed",
      actor_id: userId,
      note: (body.note as string | null) ?? "Buyer confirmed delivery",
    });
    await audit({
      action: "confirm_delivery",
      entity_type: "material_order",
      entity_ref: orderId,
      detail: { previous_status: order.status },
    });
    return json({ ok: true, order: updated });
  }

  // ── Either party opens a dispute ────────────────────────────────
  if (action === "open_dispute") {
    const orderId = String(body.order_id ?? "");
    const reason = String(body.note ?? "").slice(0, 1000);
    if (!orderId)
      return json({ ok: false, error: "An order is required." }, 400);
    if (reason.trim().length < 10)
      return json(
        { ok: false, error: "Describe the problem in a sentence or two." },
        400,
      );

    const { data: order } = await supabase
      .from("material_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!order)
      return json({ ok: false, error: "That order was not found." }, 404);
    const isParty =
      order.buyer_id === userId ||
      (supplierId && order.supplier_id === supplierId);
    if (!isParty && !isAdmin)
      return json(
        {
          ok: false,
          error: "Only the buyer or supplier on this order can dispute it.",
        },
        403,
      );

    const { data: updated, error } = await supabase
      .from("material_orders")
      .update({ status: "disputed", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select("*")
      .single();
    if (error)
      return json(
        { ok: false, error: "The dispute could not be recorded." },
        500,
      );

    await supabase.from("material_order_events").insert({
      order_id: orderId,
      status: "disputed",
      actor_id: userId,
      note: reason,
    });
    const { error: reportError } = await supabase
      .from("marketplace_reports")
      .insert({
        reporter_id: userId,
        report_type: "order_dispute",
        supplier_id: order.supplier_id,
        reason: "order_dispute",
        description: reason,
        status: "open",
      });
    if (reportError) {
      return json(
        {
          ok: false,
          error:
            "The dispute was recorded on the order but could not reach the review queue.",
          order: updated,
        },
        500,
      );
    }
    await audit({
      action: "open_dispute",
      entity_type: "material_order",
      entity_ref: orderId,
      detail: { reason },
    });
    return json({ ok: true, order: updated });
  }

  // ── Supplier submits a verification request ─────────────────────
  if (action === "request_verification") {
    const requested = String(body.level ?? "");
    const evidenceRef = String(body.evidence_ref ?? "").slice(0, 500);
    if (
      !VERIFICATION_LEVELS.includes(
        requested as (typeof VERIFICATION_LEVELS)[number],
      ) ||
      requested === "unverified"
    ) {
      return json(
        { ok: false, error: "Choose a verification level to request." },
        400,
      );
    }
    if (!supplierId)
      return json(
        { ok: false, error: "Create a supplier profile first." },
        403,
      );
    if (evidenceRef.trim().length < 5) {
      return json(
        {
          ok: false,
          error:
            "Add a reference FRELUX can check (document number, address, or contact).",
        },
        400,
      );
    }

    const { data: pending } = await supabase
      .from("supplier_verification_events")
      .select("id")
      .eq("supplier_id", supplierId)
      .eq("action", "submitted")
      .eq("requested_level", requested)
      .limit(1);
    if (pending && pending.length > 0) {
      return json({
        ok: true,
        unchanged: true,
        message: "That request is already waiting for review.",
      });
    }

    const { error } = await supabase
      .from("supplier_verification_events")
      .insert({
        supplier_id: supplierId,
        requested_level: requested,
        action: "submitted",
        evidence_type: (body.evidence_type as string | null) ?? "document",
        evidence_ref: evidenceRef,
        note: (body.note as string | null) ?? null,
      });
    if (error)
      return json({ ok: false, error: "The request could not be saved." }, 500);
    await audit({
      action: "request_verification",
      entity_type: "supplier",
      entity_ref: supplierId,
      detail: { requested_level: requested },
    });
    return json({
      ok: true,
      message: "Verification request submitted for review.",
    });
  }

  // ── Administrator: verification decision ────────────────────────
  if (action === "review_verification") {
    const denied = requireAdmin();
    if (denied) return denied;
    const eventId = String(body.event_id ?? "");
    const decision = String(body.decision ?? "");
    if (!eventId || !["approve", "reject"].includes(decision)) {
      return json(
        {
          ok: false,
          error: "An evidence request and a decision are required.",
        },
        400,
      );
    }

    const { data: event } = await supabase
      .from("supplier_verification_events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();
    if (!event)
      return json(
        { ok: false, error: "That verification request was not found." },
        404,
      );
    if (event.action !== "submitted")
      return json(
        { ok: false, error: "That request has already been decided." },
        409,
      );

    const { data: target } = await supabase
      .from("supplier_profiles")
      .select("id,verification_level,company_name")
      .eq("id", event.supplier_id)
      .maybeSingle();
    if (!target)
      return json({ ok: false, error: "That supplier was not found." }, 404);

    const currentRank = VERIFICATION_LEVELS.indexOf(
      target.verification_level as (typeof VERIFICATION_LEVELS)[number],
    );
    const requestedRank = VERIFICATION_LEVELS.indexOf(
      event.requested_level as (typeof VERIFICATION_LEVELS)[number],
    );

    await supabase.from("supplier_verification_events").insert({
      supplier_id: event.supplier_id,
      requested_level: event.requested_level,
      action: decision === "approve" ? "approved" : "rejected",
      evidence_type: event.evidence_type,
      evidence_ref: event.evidence_ref,
      reviewer_id: userId,
      note: (body.note as string | null) ?? null,
    });

    let newLevel = target.verification_level as string;
    if (decision === "approve") {
      // A level can only be raised one step at a time, and never skipped.
      if (requestedRank !== currentRank + 1) {
        return json(
          {
            ok: false,
            error:
              "Verification levels must be approved in order; approve the next level first.",
          },
          409,
        );
      }
      newLevel = VERIFICATION_LEVELS[requestedRank];
      await supabase
        .from("supplier_profiles")
        .update({
          verification_level: newLevel,
          is_verified: true,
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.supplier_id);
    }

    await audit({
      action:
        decision === "approve" ? "approve_verification" : "reject_verification",
      entity_type: "supplier",
      entity_ref: event.supplier_id as string,
      detail: {
        requested_level: event.requested_level,
        previous_level: target.verification_level,
        new_level: newLevel,
      },
    });
    return json({ ok: true, verification_level: newLevel });
  }

  // ── Administrator: listing moderation ───────────────────────────
  if (action === "moderate_listing") {
    const denied = requireAdmin();
    if (denied) return denied;
    const listingId = String(body.listing_id ?? "");
    const decision = String(body.decision ?? "");
    if (!listingId || !["approve", "reject", "remove"].includes(decision)) {
      return json(
        { ok: false, error: "A listing and a decision are required." },
        400,
      );
    }
    const status =
      decision === "approve"
        ? "active"
        : decision === "reject"
          ? "rejected"
          : "removed";
    const { data: listing, error } = await supabase
      .from("supplier_inventory_items")
      .update({
        listing_status: status,
        admin_notes: (body.note as string | null) ?? null,
        is_active: status !== "removed",
      })
      .eq("id", listingId)
      .select("id,supplier_id,product_name")
      .maybeSingle();
    if (error || !listing)
      return json({ ok: false, error: "That listing was not found." }, 404);
    await audit({
      action: "moderate_listing",
      entity_type: "supplier_listing",
      entity_ref: listingId,
      detail: { decision, supplier_id: listing.supplier_id },
    });
    return json({ ok: true, status });
  }

  // ── Administrator: paid placement, explicitly recorded ──────────
  if (action === "set_featured") {
    const denied = requireAdmin();
    if (denied) return denied;
    const targetSupplier = String(body.supplier_id ?? "");
    const enabled = Boolean(body.enabled);
    const days = Number(body.days ?? 30);
    if (!targetSupplier)
      return json({ ok: false, error: "A supplier is required." }, 400);
    if (enabled && (!Number.isFinite(days) || days <= 0 || days > 365)) {
      return json(
        {
          ok: false,
          error: "Featured placement must run between 1 and 365 days.",
        },
        400,
      );
    }
    const { error } = await supabase
      .from("supplier_profiles")
      .update({
        is_featured: enabled,
        featured_until: enabled
          ? new Date(Date.now() + days * 86_400_000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetSupplier);
    if (error)
      return json(
        { ok: false, error: "The placement could not be saved." },
        500,
      );
    await audit({
      action: "set_featured",
      entity_type: "supplier",
      entity_ref: targetSupplier,
      detail: { enabled, days: enabled ? days : 0 },
    });
    return json({ ok: true });
  }

  // ── Administrator: subscription plan ────────────────────────────
  if (action === "set_plan") {
    const denied = requireAdmin();
    if (denied) return denied;
    const targetSupplier = String(body.supplier_id ?? "");
    const plan = String(body.plan ?? "");
    if (!["free", "growth", "enterprise"].includes(plan)) {
      return json(
        { ok: false, error: "Choose free, growth or enterprise." },
        400,
      );
    }
    const { data: planRow } = await supabase
      .from("supplier_plans")
      .select("*")
      .eq("code", plan)
      .maybeSingle();
    const { error } = await supabase
      .from("supplier_profiles")
      .update({
        subscription_plan: plan,
        subscription_status: "active",
        lead_credits: planRow?.monthly_lead_credits ?? 0,
        subscription_renews_at: new Date(
          Date.now() + 30 * 86_400_000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetSupplier);
    if (error)
      return json({ ok: false, error: "The plan could not be changed." }, 500);
    await audit({
      action: "set_plan",
      entity_type: "supplier",
      entity_ref: targetSupplier,
      detail: { plan },
    });
    return json({ ok: true });
  }

  // ── Administrator: complaint resolution ─────────────────────────
  if (action === "resolve_report") {
    const denied = requireAdmin();
    if (denied) return denied;
    const reportId = String(body.report_id ?? "");
    const status = String(body.status ?? "");
    if (
      !reportId ||
      !["resolved", "dismissed", "investigating"].includes(status)
    ) {
      return json(
        { ok: false, error: "A report and a resolution are required." },
        400,
      );
    }
    const { error } = await supabase
      .from("marketplace_reports")
      .update({
        status,
        admin_notes: (body.note as string | null) ?? null,
        resolved_by: status === "investigating" ? null : userId,
        resolved_at:
          status === "investigating" ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (error)
      return json(
        { ok: false, error: "The report could not be updated." },
        500,
      );
    await audit({
      action: "resolve_report",
      entity_type: "marketplace_report",
      entity_ref: reportId,
      detail: { status },
    });
    return json({ ok: true });
  }

  return json({ ok: false, error: "Unknown action." }, 400);
});
