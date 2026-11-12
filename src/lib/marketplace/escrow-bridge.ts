/**
 * Marketplace ↔ escrow bridge.
 *
 * on_bid_accepted_create_order() creates an order and default milestones, but
 * until now nothing connected that order to a funded escrow contract and
 * approving a milestone only flipped a status flag. An accepted bid could not
 * actually be paid for, and approved work could not be paid out.
 *
 * The bridge is deliberately thin: escrow owns all money movement, and the
 * linked columns are the join. escrow-release writes the settlement back onto
 * marketplace_milestones and marketplace_payments when the transfer succeeds,
 * so a payout is never recorded before it happened.
 */
import { supabase } from "@/lib/supabase";
import {
  createEscrowContract,
  releaseEscrowMilestone,
} from "@/lib/payments/escrow-client";
import type {
  DbMarketplaceMilestone,
  DbMarketplaceOrder,
} from "@/types/marketplace";

export interface EscrowFundingResult {
  checkoutUrl: string;
  contractId: string;
}

/** Minor units for a currency. The escrow engine stores integer minor units. */
function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

export class MilestoneAmountError extends Error {}

/**
 * Create the escrow contract for an accepted order and hand back the checkout
 * link. Milestone amounts must already be set and add up to the agreed price:
 * inventing or rounding a split would decide how much a builder gets paid.
 */
export async function fundOrderWithEscrow(
  order: DbMarketplaceOrder,
  milestones: DbMarketplaceMilestone[],
): Promise<EscrowFundingResult> {
  if (order.escrow_contract_id) {
    throw new Error("This order already has an escrow contract.");
  }
  if (milestones.length === 0) {
    throw new MilestoneAmountError(
      "Add at least one milestone before funding the order.",
    );
  }

  const missing = milestones.filter(
    (milestone) => milestone.amount == null || Number(milestone.amount) <= 0,
  );
  if (missing.length > 0) {
    throw new MilestoneAmountError(
      `Set an amount on every milestone first (missing: ${missing
        .map((m) => m.title)
        .join(", ")}).`,
    );
  }

  const total = milestones.reduce(
    (sum, milestone) => sum + Number(milestone.amount ?? 0),
    0,
  );
  if (Math.abs(total - Number(order.agreed_price)) > 0.01) {
    throw new MilestoneAmountError(
      `Milestone amounts add up to ${total.toFixed(2)}, but the agreed price is ${Number(
        order.agreed_price,
      ).toFixed(2)}. They must match before escrow can be funded.`,
    );
  }

  const ordered = [...milestones].sort((a, b) => a.sort_order - b.sort_order);

  const { checkoutUrl, contractId } = await createEscrowContract({
    title: `FRELUX Marketplace order ${order.order_number ?? order.id.slice(0, 8)}`,
    sellerName: "FRELUX marketplace professional",
    totalMinor: toMinor(Number(order.agreed_price)),
    stages: ordered.map((milestone) => ({
      label: milestone.title,
      amountMinor: toMinor(Number(milestone.amount ?? 0)),
    })),
  });

  // Link the order, then map each escrow stage onto its marketplace milestone
  // so a release can find the right row without guessing by position.
  const { error: linkError } = await supabase
    .from("marketplace_orders")
    .update({ escrow_contract_id: contractId })
    .eq("id", order.id);
  if (linkError) throw linkError;

  const { data: stages, error: stageError } = await supabase
    .from("escrow_milestones")
    .select("id, label, sort_order")
    .eq("contract_id", contractId)
    .order("sort_order", { ascending: true });
  if (stageError) throw stageError;

  const escrowStages = stages ?? [];
  for (let index = 0; index < ordered.length; index += 1) {
    const stage = escrowStages[index];
    if (!stage) break;
    await supabase
      .from("marketplace_milestones")
      .update({ escrow_milestone_id: stage.id })
      .eq("id", ordered[index].id);
  }

  return { checkoutUrl, contractId };
}

/**
 * Approve a milestone and release its escrow payment in one action.
 * Refuses when the order was never funded instead of quietly marking work
 * approved with no money behind it.
 */
export async function approveAndReleaseMilestone(
  order: DbMarketplaceOrder,
  milestone: DbMarketplaceMilestone,
): Promise<void> {
  if (!order.escrow_contract_id) {
    throw new Error(
      "This order is not funded through escrow, so there is nothing to release.",
    );
  }
  if (!milestone.escrow_milestone_id) {
    throw new Error(
      "This milestone is not linked to an escrow stage. Re-open the order and fund it again.",
    );
  }

  await releaseEscrowMilestone(
    order.escrow_contract_id,
    milestone.escrow_milestone_id,
  );
}

/** Payments recorded against an order by the escrow engine. */
export async function fetchOrderPayments(orderId: string) {
  const { data, error } = await supabase
    .from("marketplace_payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
