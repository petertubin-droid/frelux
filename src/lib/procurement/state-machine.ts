// =========================================================
// FRELUX Phase 3: deterministic procurement state machine
//
// Mirrors the database-level transition table exactly
// (public.procurement_transition_allowed). The database is the
// authority; this module exists so the UI can disable
// impossible transitions and tests can prove the shape of the
// model. No AI inference: transitions are human actions
// recorded with provenance.
// =========================================================

export type ProcurementStatus =
  | "listed"
  | "quote_requested"
  | "quoted"
  | "approved"
  | "purchase_ordered"
  | "dispatched"
  | "in_transit"
  | "customs_hold"
  | "delivered"
  | "partial_delivery"
  | "exception"
  | "cancelled";

export const PROCUREMENT_STATUSES: readonly ProcurementStatus[] = [
  "listed",
  "quote_requested",
  "quoted",
  "approved",
  "purchase_ordered",
  "dispatched",
  "in_transit",
  "customs_hold",
  "delivered",
  "partial_delivery",
  "exception",
  "cancelled",
] as const;

/**
 * The single source of truth on the client. It must match the
 * (from, to) pairs in migration 20261025150000 exactly.
 */
export const PROCUREMENT_TRANSITIONS: Readonly<
  Record<ProcurementStatus, readonly ProcurementStatus[]>
> = {
  listed: ["quote_requested", "cancelled"],
  quote_requested: ["quoted", "cancelled"],
  quoted: ["approved", "quote_requested", "cancelled"],
  approved: ["purchase_ordered", "cancelled"],
  purchase_ordered: ["dispatched", "exception", "cancelled"],
  dispatched: ["in_transit", "exception"],
  in_transit: ["customs_hold", "partial_delivery", "delivered", "exception"],
  customs_hold: ["in_transit", "exception"],
  partial_delivery: ["in_transit", "delivered", "exception", "cancelled"],
  exception: [
    "purchase_ordered",
    "dispatched",
    "in_transit",
    "delivered",
    "cancelled",
  ],
  delivered: [],
  cancelled: [],
};

export function isTerminal(status: ProcurementStatus): boolean {
  return PROCUREMENT_TRANSITIONS[status].length === 0;
}

export function canTransition(
  from: ProcurementStatus,
  to: ProcurementStatus,
): boolean {
  return PROCUREMENT_TRANSITIONS[from].includes(to);
}

/** Professional, user-facing labels; no decorative wording. */
export const PROCUREMENT_STATUS_LABELS: Readonly<
  Record<ProcurementStatus, string>
> = {
  listed: "Listed",
  quote_requested: "Quote requested",
  quoted: "Quoted",
  approved: "Approved",
  purchase_ordered: "Purchase ordered",
  dispatched: "Dispatched",
  in_transit: "In transit",
  customs_hold: "Customs hold",
  delivered: "Delivered",
  partial_delivery: "Partial delivery",
  exception: "Exception",
  cancelled: "Cancelled",
};
