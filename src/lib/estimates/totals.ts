import type { DbClientEstimate } from "@/types/database";

/**
 * Quote money and quote editing rules.
 *
 * Both are pure functions of what the contractor typed and what the row already
 * says, so a saved quote can always be checked against its own inputs. Nothing
 * here reads the database or calls the estimation engine: an edit changes the
 * figures a contractor typed, it never re-runs a calculation behind their back.
 */

export interface CostInputs {
  materials: number;
  labour: number;
  transport: number;
  misc: number;
  markupPercentage: number;
}

export interface CostTotals {
  subtotal: number;
  markupAmount: number;
  grandTotal: number;
}

function amount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Round to whole units, the precision a quote is presented at. */
function tidy(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeTotals(input: CostInputs): CostTotals {
  const subtotal =
    amount(input.materials) +
    amount(input.labour) +
    amount(input.transport) +
    amount(input.misc);
  const markupAmount = (subtotal * amount(input.markupPercentage)) / 100;
  return {
    subtotal: tidy(subtotal),
    markupAmount: tidy(markupAmount),
    grandTotal: tidy(subtotal + markupAmount),
  };
}

export type EditabilityReason = "approved" | null;

/**
 * An approved quote is the record of what the client agreed to. Changing it
 * silently would rewrite history, so edits stop there and a new quote is the
 * honest way forward.
 */
export function editBlockedReason(
  status: DbClientEstimate["status"],
): EditabilityReason {
  return status === "approved" ? "approved" : null;
}

export function isEditable(status: DbClientEstimate["status"]): boolean {
  return editBlockedReason(status) === null;
}

/**
 * Editing a quote the client has already seen means what they saw is no longer
 * what the link shows, so it goes back to draft and has to be sent again. The
 * timestamps stay as history: the record still shows it was shared and opened.
 */
export function statusAfterEdit(
  status: DbClientEstimate["status"],
): DbClientEstimate["status"] {
  if (status === "sent" || status === "viewed") return "draft";
  return status;
}

export function requiresResend(previous: DbClientEstimate["status"]): boolean {
  return statusAfterEdit(previous) !== previous;
}

/** How far a stored quote has drifted from its own cost inputs. */
export function totalsDrift(estimate: {
  materials_cost: number;
  labour_cost: number;
  transport_cost: number;
  misc_cost: number;
  markup_percentage: number;
  grand_total: number;
}): number {
  const expected = computeTotals({
    materials: estimate.materials_cost,
    labour: estimate.labour_cost,
    transport: estimate.transport_cost,
    misc: estimate.misc_cost,
    markupPercentage: estimate.markup_percentage,
  });
  return tidy(estimate.grand_total - expected.grandTotal);
}
