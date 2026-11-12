/**
 * Marketplace order disputes — the buyer's way back from "sent for review".
 *
 * An order that has been submitted for review can be pushed to `disputed`, but a
 * bare status change tells nobody what went wrong and, until now, left the order
 * stuck there. A dispute is therefore a row: what the buyer is contesting, what
 * the professional answered, and how it ended.
 *
 * Rules the database enforces (see migration 20261112234000), mirrored here so a
 * button is never offered that the database would refuse:
 *   - only the client may raise one, and only while status is `client_review`;
 *   - only inside the window, measured from when the work reached them;
 *   - one open dispute per order;
 *   - the professional answers, the buyer may withdraw, an admin adjudicates.
 */
import { supabase } from "@/lib/supabase";
import { updateOrderStatus } from "@/lib/marketplace";

export const DISPUTE_WINDOW_DAYS = 7;

export const DISPUTE_CATEGORIES = [
  { value: "work_quality", label: "The work is not what we agreed" },
  { value: "not_delivered", label: "Submitted, but not actually done" },
  { value: "scope", label: "The scope or price changed" },
  { value: "payment", label: "A problem with the payment" },
  { value: "other", label: "Something else" },
] as const;

export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number]["value"];

export interface OrderDispute {
  id: string;
  order_id: string;
  opened_by: string;
  opened_role: "client" | "pro";
  category: DisputeCategory;
  detail: string;
  status: "open" | "withdrawn" | "refunded" | "dismissed";
  seller_response: string | null;
  seller_responded_at: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  refund_amount_minor: number | null;
  created_at: string;
}

/** True while the buyer can still raise a complaint on this order. */
export function withinDisputeWindow(
  clientReviewAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!clientReviewAt) return false;
  const opened = new Date(clientReviewAt).getTime();
  if (!Number.isFinite(opened)) return false;
  const days = (now.getTime() - opened) / 86_400_000;
  return days >= 0 && days <= DISPUTE_WINDOW_DAYS;
}

/** The order's newest dispute, if any. */
export async function loadOrderDispute(
  orderId: string,
): Promise<OrderDispute | null> {
  const { data, error } = await supabase
    .from("marketplace_order_disputes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as OrderDispute | null) ?? null;
}

/**
 * Raise a dispute.
 *
 * The complaint is written first so the order guard can see an open dispute when
 * it checks the move to `disputed`. If that move is refused the row is withdrawn
 * rather than left dangling, so a failure never leaves a complaint on file that
 * nobody is deciding.
 */
export async function openOrderDispute(input: {
  orderId: string;
  category: DisputeCategory;
  detail: string;
}): Promise<OrderDispute> {
  const detail = input.detail.trim();
  if (detail.length < 10) {
    throw new Error("Describe the problem in at least a short sentence.");
  }

  const { data, error } = await supabase
    .from("marketplace_order_disputes")
    .insert({
      order_id: input.orderId,
      opened_by: (await supabase.auth.getUser()).data.user?.id,
      opened_role: "client",
      category: input.category,
      detail,
    })
    .select("*")
    .single();

  if (error) throw error;
  const dispute = data as OrderDispute;

  try {
    await updateOrderStatus(input.orderId, "disputed");
  } catch (cause) {
    await supabase
      .from("marketplace_order_disputes")
      .update({ status: "withdrawn" })
      .eq("id", dispute.id);
    throw cause;
  }

  return dispute;
}

/** The professional's answer. Only their own words, only while it is open. */
export async function respondToOrderDispute(
  disputeId: string,
  response: string,
): Promise<void> {
  const text = response.trim();
  if (text.length < 5) {
    throw new Error("Write a short response before sending it.");
  }
  const { error } = await supabase
    .from("marketplace_order_disputes")
    .update({
      seller_response: text,
      seller_responded_at: new Date().toISOString(),
    })
    .eq("id", disputeId)
    .eq("status", "open");
  if (error) throw error;
}

/**
 * Take the complaint back. The dispute is closed first, because the order guard
 * only allows `disputed → client_review` once no dispute is left open.
 */
export async function withdrawOrderDispute(
  disputeId: string,
  orderId: string,
): Promise<void> {
  const { error } = await supabase
    .from("marketplace_order_disputes")
    .update({ status: "withdrawn" })
    .eq("id", disputeId)
    .eq("status", "open");
  if (error) throw error;
  await updateOrderStatus(orderId, "client_review");
}

export interface DisputeWithOrder extends OrderDispute {
  order: {
    id: string;
    order_number: string;
    status: string;
    agreed_price: number;
    currency: string;
    client_id: string;
    escrow_contract_id: string | null;
  } | null;
}

/** Open disputes for admin review, newest first. */
export async function loadOpenDisputes(): Promise<DisputeWithOrder[]> {
  const { data, error } = await supabase
    .from("marketplace_order_disputes")
    .select(
      "*, order:marketplace_orders(id, order_number, status, agreed_price, currency, client_id, escrow_contract_id)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DisputeWithOrder[];
}
