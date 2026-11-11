// =========================================================
// FRELUX Marketplace Settlement Core
//
// One deterministic money model shared by marketplace orders and diaspora
// escrow, so both settle the same way once a payment provider is wired in.
//
// Rules this module enforces:
//  - every amount is an integer in the currency's minor unit (kobo, cents).
//    No floating point arithmetic touches money.
//  - money can only be released from funds actually held.
//  - a milestone cannot be released twice, and cannot be released while the
//    order is disputed or refunded.
//  - the platform fee accrues on released value only, never on money that
//    was refunded to the buyer.
// =========================================================

export type SettlementStatus =
  | "pending_payment"
  | "funds_held"
  | "partially_released"
  | "released"
  | "refunded"
  | "disputed";

export type MilestoneState = "pending" | "released" | "refunded";

export interface SettlementMilestone {
  id: string;
  /** Integer minor units. The sum of milestones equals the order total. */
  amount: number;
  state: MilestoneState;
  label: string;
}

export interface Settlement {
  id: string;
  currency: string;
  /** Integer minor units actually received from the buyer. */
  held: number;
  /** Integer minor units sent to the seller. */
  releasedToSeller: number;
  /** Integer minor units returned to the buyer. */
  refundedToBuyer: number;
  /** Integer minor units earned by FRELUX, computed from released value. */
  platformFee: number;
  /** Basis points applied to released value, e.g. 250 = 2.5 percent. */
  feeBasisPoints: number;
  status: SettlementStatus;
  milestones: SettlementMilestone[];
}

export class SettlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementError";
  }
}

/**
 * FRELUX's escrow and marketplace fee, set by the owner at 7 percent on
 * 12 November 2026. Held here as one constant so the checkout, the release and
 * any report read the same number instead of each carrying their own.
 */
export const ESCROW_FEE_BASIS_POINTS = 700;

/** Platform fee on a gross amount, rounded down so FRELUX never over-bills. */
export function feeOn(gross: number, feeBasisPoints: number): number {
  assertMinorUnits(gross, "gross");
  if (!Number.isInteger(feeBasisPoints) || feeBasisPoints < 0) {
    throw new SettlementError("fee basis points must be a whole number");
  }
  if (feeBasisPoints > 10_000) {
    throw new SettlementError("fee basis points cannot exceed 100 percent");
  }
  return Math.floor((gross * feeBasisPoints) / 10_000);
}

function assertMinorUnits(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new SettlementError(`${label} must be a whole number of minor units`);
  }
}

export function createSettlement(input: {
  id: string;
  currency: string;
  total: number;
  feeBasisPoints: number;
  milestones?: { id: string; label: string; amount: number }[];
}): Settlement {
  assertMinorUnits(input.total, "total");
  if (!input.id.trim()) throw new SettlementError("settlement id is required");
  if (!input.currency.trim()) {
    throw new SettlementError("currency is required");
  }
  feeOn(input.total, input.feeBasisPoints);

  const milestones = input.milestones?.length
    ? input.milestones.map((m) => {
        assertMinorUnits(m.amount, `milestone ${m.id}`);
        return { ...m, state: "pending" as MilestoneState };
      })
    : [
        {
          id: "full",
          label: "Full payment on delivery",
          amount: input.total,
          state: "pending" as MilestoneState,
        },
      ];

  const planned = milestones.reduce((sum, m) => sum + m.amount, 0);
  if (planned !== input.total) {
    throw new SettlementError(
      `milestones must add up to the order total (${planned} vs ${input.total})`,
    );
  }

  return {
    id: input.id,
    currency: input.currency,
    held: 0,
    releasedToSeller: 0,
    refundedToBuyer: 0,
    platformFee: 0,
    feeBasisPoints: input.feeBasisPoints,
    status: "pending_payment",
    milestones,
  };
}

/** Records money actually received. Repeated calls add to what is held. */
export function recordPayment(
  settlement: Settlement,
  received: number,
): Settlement {
  assertMinorUnits(received, "received amount");
  if (received === 0)
    throw new SettlementError("received amount must be positive");
  if (settlement.status === "refunded") {
    throw new SettlementError("cannot take payment on a refunded order");
  }
  const total = settlement.milestones.reduce((s, m) => s + m.amount, 0);
  const held = settlement.held + received;
  if (held > total) {
    throw new SettlementError("payment exceeds the order total");
  }
  return {
    ...settlement,
    held,
    status: settlement.status === "disputed" ? "disputed" : "funds_held",
  };
}

/**
 * Releases one milestone to the seller. Requires funds on hand, an undisputed
 * order, and a milestone that has not already been released or refunded.
 */
export function releaseMilestone(
  settlement: Settlement,
  milestoneId: string,
): Settlement {
  if (settlement.status === "disputed") {
    throw new SettlementError(
      "cannot release funds while the order is disputed",
    );
  }
  if (settlement.status === "refunded") {
    throw new SettlementError("cannot release funds from a refunded order");
  }
  const milestone = settlement.milestones.find((m) => m.id === milestoneId);
  if (!milestone) throw new SettlementError(`unknown milestone ${milestoneId}`);
  if (milestone.state === "released") {
    throw new SettlementError(`milestone ${milestoneId} was already released`);
  }
  if (milestone.state === "refunded") {
    throw new SettlementError(`milestone ${milestoneId} was already refunded`);
  }
  if (settlement.held < milestone.amount) {
    throw new SettlementError(
      "not enough funds held to release this milestone",
    );
  }

  const milestones = settlement.milestones.map((m) =>
    m.id === milestoneId ? { ...m, state: "released" as MilestoneState } : m,
  );
  const releasedToSeller = settlement.releasedToSeller + milestone.amount;
  const platformFee =
    settlement.platformFee + feeOn(milestone.amount, settlement.feeBasisPoints);
  const allReleased = milestones.every((m) => m.state !== "pending");

  return {
    ...settlement,
    milestones,
    releasedToSeller,
    platformFee,
    status: allReleased ? "released" : "partially_released",
  };
}

/** Returns held money to the buyer. Released milestones cannot be clawed back. */
export function refund(settlement: Settlement, amount: number): Settlement {
  assertMinorUnits(amount, "refund amount");
  if (amount === 0) throw new SettlementError("refund amount must be positive");
  const refundable = settlement.held - settlement.releasedToSeller;
  if (amount > refundable) {
    throw new SettlementError(
      "refund exceeds the money still held for this order",
    );
  }
  const refundedToBuyer = settlement.refundedToBuyer + amount;
  const fullyRefunded =
    refundedToBuyer + settlement.releasedToSeller === settlement.held;
  return {
    ...settlement,
    refundedToBuyer,
    status: fullyRefunded ? "refunded" : settlement.status,
    milestones: fullyRefunded
      ? settlement.milestones.map((m) =>
          m.state === "pending"
            ? { ...m, state: "refunded" as MilestoneState }
            : m,
        )
      : settlement.milestones,
  };
}

/** Freezes releases while a dispute is open. Refunds stay possible. */
export function openDispute(settlement: Settlement): Settlement {
  if (settlement.status === "refunded" || settlement.status === "released") {
    throw new SettlementError("this order is already closed");
  }
  return { ...settlement, status: "disputed" };
}

export function resolveDispute(settlement: Settlement): Settlement {
  if (settlement.status !== "disputed") {
    throw new SettlementError("there is no open dispute to resolve");
  }
  const anyReleased = settlement.releasedToSeller > 0;
  return {
    ...settlement,
    status: anyReleased ? "partially_released" : "funds_held",
  };
}

export interface SettlementSummary {
  held: number;
  releasedToSeller: number;
  refundedToBuyer: number;
  platformFee: number;
  /** Money still sitting in escrow. */
  inEscrow: number;
  /** What the seller receives net of the platform fee. */
  sellerNet: number;
  fullySettled: boolean;
}

export function summarise(settlement: Settlement): SettlementSummary {
  const inEscrow =
    settlement.held - settlement.releasedToSeller - settlement.refundedToBuyer;
  return {
    held: settlement.held,
    releasedToSeller: settlement.releasedToSeller,
    refundedToBuyer: settlement.refundedToBuyer,
    platformFee: settlement.platformFee,
    inEscrow: Math.max(0, inEscrow),
    sellerNet: settlement.releasedToSeller - settlement.platformFee,
    fullySettled:
      settlement.status === "released" || settlement.status === "refunded",
  };
}
