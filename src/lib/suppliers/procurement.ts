/**
 * Procurement workflow: requests, quotations, orders.
 *
 * Buyers create requests and read the quotes that arrive for them; suppliers
 * read open requests in their market and submit one quote each. The two
 * actions that carry real consequence - awarding a quote and moving an order's
 * status - are executed by the supplier-ops function so a client cannot award
 * its own supplier's quote, forge an order total, or mark goods delivered
 * without being a party to the order.
 */

import { supabase } from "@/lib/supabase";
import type {
  MaterialOrder,
  MaterialOrderEvent,
  MaterialRequest,
  MaterialRequestItem,
  MaterialRequestQuote,
  QuoteLine,
} from "./types";

export interface RequestDraftItem {
  materialCategory: string;
  materialSlug: string | null;
  productName: string;
  brand: string | null;
  specification: string | null;
  unit: string;
  quantity: number;
  targetPrice: number | null;
}

export interface RequestDraft {
  marketCode: string;
  currency: string;
  city: string | null;
  neighbourhood: string | null;
  title: string;
  notes: string | null;
  neededBy: string | null;
  visibility: "public" | "invited";
  items: RequestDraftItem[];
}

export function requestReference(now = new Date()): string {
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MR-${stamp}-${suffix}`;
}

/** Validates a draft before it is written. Returns human-readable problems. */
export function validateRequestDraft(draft: RequestDraft): string[] {
  const problems: string[] = [];
  if (!draft.title.trim()) problems.push("Give the request a title.");
  if (!draft.marketCode) problems.push("Choose a market.");
  if (draft.items.length === 0)
    problems.push("Add at least one material line.");
  draft.items.forEach((item, index) => {
    if (!item.productName.trim())
      problems.push(`Line ${index + 1}: add a product name.`);
    if (!item.unit.trim()) problems.push(`Line ${index + 1}: add a unit.`);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      problems.push(`Line ${index + 1}: quantity must be greater than zero.`);
    }
  });
  return problems;
}

export async function createMaterialRequest(
  buyerId: string,
  draft: RequestDraft,
) {
  const problems = validateRequestDraft(draft);
  if (problems.length > 0)
    return { request: null, error: problems[0], problems };

  const { data, error } = await supabase
    .from("material_requests")
    .insert({
      buyer_id: buyerId,
      reference: requestReference(),
      market_code: draft.marketCode,
      currency: draft.currency,
      city: draft.city,
      neighbourhood: draft.neighbourhood,
      title: draft.title.trim(),
      notes: draft.notes?.trim() || null,
      needed_by: draft.neededBy || null,
      visibility: draft.visibility,
      status: "open",
      expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    })
    .select("*")
    .single();

  if (error || !data)
    return {
      request: null,
      error: error?.message ?? "Could not create the request.",
      problems,
    };

  const request = data as MaterialRequest;
  const { error: itemError } = await supabase
    .from("material_request_items")
    .insert(
      draft.items.map((item) => ({
        request_id: request.id,
        material_category: item.materialCategory,
        material_slug: item.materialSlug,
        product_name: item.productName.trim(),
        brand: item.brand?.trim() || null,
        specification: item.specification?.trim() || null,
        unit: item.unit.trim(),
        quantity: item.quantity,
        target_price: item.targetPrice,
      })),
    );

  if (itemError) {
    // Keep the request and its lines consistent: an empty request is useless.
    await supabase.from("material_requests").delete().eq("id", request.id);
    return { request: null, error: itemError.message, problems };
  }
  return { request, error: null, problems };
}

export async function fetchMyRequests(buyerId: string) {
  const { data, error } = await supabase
    .from("material_requests")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  return {
    requests: (data ?? []) as MaterialRequest[],
    error: error?.message ?? null,
  };
}

export async function fetchRequest(id: string) {
  const [{ data: request, error }, { data: items }, { data: quotes }] =
    await Promise.all([
      supabase.from("material_requests").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("material_request_items")
        .select("*")
        .eq("request_id", id)
        .order("created_at"),
      supabase
        .from("material_request_quotes")
        .select(
          "*, supplier_profiles:supplier_id (id, company_name, city, neighbourhood, verification_level, rating, public_slug, phone, email, avg_response_hours)",
        )
        .eq("request_id", id)
        .order("total"),
    ]);
  return {
    request: (request as MaterialRequest | null) ?? null,
    items: (items ?? []) as MaterialRequestItem[],
    quotes: (quotes ?? []) as (MaterialRequestQuote & {
      supplier_profiles: Record<string, unknown> | null;
    })[],
    error: error?.message ?? null,
  };
}

/** Open requests a supplier can quote, limited to its own market. */
export async function fetchOpenRequestsForSupplier(marketCode: string) {
  const [{ data: requests, error }, { data: items }] = await Promise.all([
    supabase
      .from("material_requests")
      .select("*")
      .eq("market_code", marketCode)
      .in("status", ["open", "quoted"])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("material_request_items").select("*").limit(1000),
  ]);
  return {
    requests: (requests ?? []) as MaterialRequest[],
    items: (items ?? []) as MaterialRequestItem[],
    error: error?.message ?? null,
  };
}

export async function fetchMyQuotes(supplierId: string) {
  const { data, error } = await supabase
    .from("material_request_quotes")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  return {
    quotes: (data ?? []) as MaterialRequestQuote[],
    error: error?.message ?? null,
  };
}

export interface QuoteDraft {
  requestId: string;
  supplierId: string;
  supplierUserId: string;
  currency: string;
  lines: QuoteLine[];
  deliveryFee: number;
  leadTimeDays: number | null;
  validUntil: string | null;
  notes: string | null;
}

export function quoteTotals(draft: {
  lines: Pick<QuoteLine, "quantity" | "unit_rate">[];
  deliveryFee: number;
}): { subtotal: number; total: number } {
  const subtotal = draft.lines.reduce((sum, line) => {
    const amount = Number(line.quantity) * Number(line.unit_rate);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const rounded = Math.round(subtotal * 100) / 100;
  const delivery = Math.max(0, Number(draft.deliveryFee) || 0);
  return {
    subtotal: rounded,
    total: Math.round((rounded + delivery) * 100) / 100,
  };
}

export function validateQuoteDraft(draft: QuoteDraft): string[] {
  const problems: string[] = [];
  if (draft.lines.length === 0) problems.push("Quote at least one line.");
  draft.lines.forEach((line, index) => {
    if (!line.description.trim())
      problems.push(`Line ${index + 1}: add a description.`);
    if (!(Number(line.quantity) > 0))
      problems.push(`Line ${index + 1}: quantity must be greater than zero.`);
    if (!(Number(line.unit_rate) > 0))
      problems.push(`Line ${index + 1}: enter a unit rate.`);
  });
  if (draft.deliveryFee < 0) problems.push("Delivery fee cannot be negative.");
  return problems;
}

export async function submitQuote(draft: QuoteDraft) {
  const problems = validateQuoteDraft(draft);
  if (problems.length > 0) return { quote: null, error: problems[0], problems };

  const { subtotal, total } = quoteTotals(draft);
  const { data, error } = await supabase
    .from("material_request_quotes")
    .insert({
      request_id: draft.requestId,
      supplier_id: draft.supplierId,
      supplier_user_id: draft.supplierUserId,
      currency: draft.currency,
      lines: draft.lines,
      subtotal,
      delivery_fee: draft.deliveryFee,
      total,
      lead_time_days: draft.leadTimeDays,
      valid_until: draft.validUntil,
      notes: draft.notes?.trim() || null,
      status: "submitted",
    })
    .select("*")
    .single();
  return {
    quote: (data as MaterialRequestQuote | null) ?? null,
    error: error?.message ?? null,
    problems,
  };
}

async function supplierOps<T>(
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("supplier-ops", {
    body,
  });
  if (error) return { data: null, error: error.message };
  const payload = data as { ok?: boolean; error?: string } & Record<
    string,
    unknown
  >;
  if (!payload || payload.ok !== true) {
    return {
      data: null,
      error: payload?.error ?? "The request could not be completed.",
    };
  }
  return { data: payload as T, error: null };
}

/** Buyer accepts a quotation. The server creates the order and declines the rest. */
export async function awardQuote(requestId: string, quoteId: string) {
  return supplierOps<{ order: MaterialOrder }>({
    action: "award_quote",
    request_id: requestId,
    quote_id: quoteId,
  });
}

export async function fetchOrders(
  userId: string,
  role: "buyer" | "supplier",
  supplierId?: string,
) {
  const column = role === "buyer" ? "buyer_id" : "supplier_id";
  const value = role === "buyer" ? userId : supplierId;
  if (!value) return { orders: [] as MaterialOrder[], error: null };
  const { data, error } = await supabase
    .from("material_orders")
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false });
  return {
    orders: (data ?? []) as MaterialOrder[],
    error: error?.message ?? null,
  };
}

export async function fetchOrderEvents(orderId: string) {
  const { data, error } = await supabase
    .from("material_order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");
  return {
    events: (data ?? []) as MaterialOrderEvent[],
    error: error?.message ?? null,
  };
}

/** Supplier-side progression: confirmed → dispatched → delivered. */
export async function advanceOrderStatus(
  orderId: string,
  status: "confirmed" | "dispatched" | "delivered",
  note?: string,
) {
  return supplierOps<{ order: MaterialOrder }>({
    action: "advance_order",
    order_id: orderId,
    status,
    note: note ?? null,
  });
}

/** Buyer-side delivery confirmation, recorded with who confirmed and when. */
export async function confirmDelivery(orderId: string, note?: string) {
  return supplierOps<{ order: MaterialOrder }>({
    action: "confirm_delivery",
    order_id: orderId,
    note: note ?? null,
  });
}

export async function openDispute(orderId: string, reason: string) {
  return supplierOps<{ order: MaterialOrder }>({
    action: "open_dispute",
    order_id: orderId,
    note: reason,
  });
}

export function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    placed: "Placed",
    confirmed: "Confirmed by supplier",
    dispatched: "Dispatched",
    delivered: "Delivered (awaiting buyer confirmation)",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
  };
  return labels[status] ?? status;
}

export function requestStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    open: "Open for quotes",
    quoted: "Quotes received",
    awarded: "Awarded",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}
