// Client for the live escrow functions. The page reads contracts it is allowed
// to see (row level security enforces ownership) and can only ask the server to
// move money; no amount or state is ever written from the browser.
import { supabase } from "@/lib/supabase";

export type EscrowStatus =
  | "pending_payment"
  | "funds_held"
  | "partially_released"
  | "released"
  | "refunded"
  | "disputed";

export interface EscrowContractRow {
  id: string;
  reference_code: string;
  title: string;
  currency: string;
  total_minor: number;
  held_minor: number;
  released_minor: number;
  refunded_minor: number;
  fee_minor: number;
  fee_basis_points: number;
  status: EscrowStatus;
  seller_name: string;
  created_date: string;
}

export interface EscrowMilestoneRow {
  id: string;
  contract_id: string;
  label: string;
  position: number;
  amount_minor: number;
  state: "pending" | "released" | "refunded";
  released_at: string | null;
}

/** Minor units formatted for humans, e.g. 93000000 kobo is N930,000.00. */
export function formatMinor(amount: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? "\u20a6" : `${currency} `;
  const whole = Math.trunc(amount / 100);
  const cents = Math.abs(amount % 100)
    .toString()
    .padStart(2, "0");
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${symbol}${grouped}.${cents}`;
}

const STATUS_COPY: Record<EscrowStatus, { label: string; detail: string }> = {
  pending_payment: {
    label: "Awaiting payment",
    detail: "Nothing has been collected yet, so nothing can be released.",
  },
  funds_held: {
    label: "Funds held in escrow",
    detail:
      "The money is collected and held. Release a stage when the work is done.",
  },
  partially_released: {
    label: "Partly released",
    detail: "Some stages are paid out and the rest is still held.",
  },
  released: {
    label: "Fully released",
    detail: "Every stage has been paid out and the contract is closed.",
  },
  refunded: {
    label: "Refunded",
    detail: "The held money has gone back to the buyer.",
  },
  disputed: {
    label: "In dispute",
    detail: "Releases are frozen until the dispute is resolved.",
  },
};

export function describeStatus(status: EscrowStatus) {
  return STATUS_COPY[status] ?? STATUS_COPY.pending_payment;
}

export interface ContractFigures {
  inEscrowMinor: number;
  refundableMinor: number;
  sellerNetMinor: number;
  progressPercent: number;
}

/**
 * What is still held, what could still be refunded, and what the seller has
 * actually earned once the FRELUX fee is removed from released value.
 */
export function contractFigures(contract: EscrowContractRow): ContractFigures {
  const held = Number(contract.held_minor) || 0;
  const released = Number(contract.released_minor) || 0;
  const refunded = Number(contract.refunded_minor) || 0;
  const fee = Number(contract.fee_minor) || 0;
  const total = Number(contract.total_minor) || 0;
  return {
    inEscrowMinor: Math.max(0, held - released - refunded),
    refundableMinor: Math.max(0, held - released - refunded),
    sellerNetMinor: Math.max(0, released - fee),
    progressPercent:
      total > 0 ? Math.min(100, Math.round((released / total) * 100)) : 0,
  };
}

export async function fetchMyEscrowContracts(): Promise<EscrowContractRow[]> {
  const { data, error } = await supabase
    .from("escrow_contracts")
    .select(
      "id, reference_code, title, currency, total_minor, held_minor, released_minor, refunded_minor, fee_minor, fee_basis_points, status, seller_name, created_date",
    )
    .order("created_date", { ascending: false })
    .limit(20);
  if (error) throw new Error("Could not load your escrow contracts.");
  return (data ?? []) as EscrowContractRow[];
}

export async function fetchMilestones(
  contractId: string,
): Promise<EscrowMilestoneRow[]> {
  const { data, error } = await supabase
    .from("escrow_milestones")
    .select(
      "id, contract_id, label, position, amount_minor, state, released_at",
    )
    .eq("contract_id", contractId)
    .order("position", { ascending: true });
  if (error)
    throw new Error("Could not load the milestones for this contract.");
  return (data ?? []) as EscrowMilestoneRow[];
}

async function callEscrow(
  fn: "escrow-checkout" | "escrow-release",
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const message = await readFunctionError(error);
    throw new Error(message);
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as Record<string, unknown>;
}

async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    .context;
  if (context?.json) {
    try {
      const body = (await context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* fall through to the generic message */
    }
  }
  return "The escrow service did not complete the request.";
}

export async function startEscrowCheckout(contractId: string) {
  const data = await callEscrow("escrow-checkout", {
    contract_id: contractId,
  });
  const url =
    typeof data.authorization_url === "string" ? data.authorization_url : null;
  if (!url) throw new Error("No checkout link was returned.");
  return url;
}

export async function releaseEscrowMilestone(
  contractId: string,
  milestoneId: string,
) {
  return callEscrow("escrow-release", {
    contract_id: contractId,
    milestone_id: milestoneId,
    action: "release",
  });
}

export async function refundEscrow(contractId: string, amountMinor?: number) {
  return callEscrow("escrow-release", {
    contract_id: contractId,
    action: "refund",
    ...(amountMinor ? { amount_minor: amountMinor } : {}),
  });
}
