/**
 * Matching an order to the travel approval that covers it.
 *
 * cross_state_approvals records the professional, the client and the state, not
 * an order id, because one approval covers that pairing wherever the job goes.
 * The order page and the admin page must read it the same way, so the rule
 * lives here once.
 */

export interface TravelOrder {
  id: string;
  order_number?: string | null;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  status: string;
  payment_status?: string | null;
  client_id: string;
  pro_profile_id?: string | null;
  created_at?: string;
}

export interface TravelApproval {
  id: string;
  seller_user_id: string | null;
  buyer_user_id: string | null;
  job_state: string | null;
  approved_at: string;
  expires_at: string | null;
  note: string | null;
}

export type TravelState = "approved" | "expired" | "missing";

const sameText = (a?: string | null, b?: string | null) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

/** The newest approval that speaks to this order's professional, client and state. */
export function approvalForOrder(
  order: TravelOrder,
  sellerUserId: string | null | undefined,
  approvals: TravelApproval[],
): TravelApproval | null {
  if (!sellerUserId) return null;
  const matches = approvals
    .filter(
      (approval) =>
        approval.seller_user_id === sellerUserId &&
        (approval.buyer_user_id === null ||
          approval.buyer_user_id === order.client_id) &&
        sameText(approval.job_state, order.job_state),
    )
    .sort((a, b) => Date.parse(b.approved_at) - Date.parse(a.approved_at));
  return matches[0] ?? null;
}

export function travelState(
  approval: TravelApproval | null,
  now: Date = new Date(),
): TravelState {
  if (!approval) return "missing";
  if (!approval.expires_at) return "approved";
  return Date.parse(approval.expires_at) > now.getTime()
    ? "approved"
    : "expired";
}

export function travelLabel(state: TravelState): string {
  if (state === "approved") return "Approved";
  if (state === "expired") return "Expired or revoked";
  return "No approval";
}
