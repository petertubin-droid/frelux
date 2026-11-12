// =========================================================
// The only place escrow money fields are written from a webhook.
//
// Both rails call this, so a funded Flutterwave payment and a funded Paystack
// payment take the identical path into the ledger and cannot drift apart.
// Every write is a conditional update that only succeeds while the contract is
// still awaiting payment and carries no transaction, which makes a duplicate
// delivery a no-op rather than a second credit.
// =========================================================

type EscrowRow = {
  id: string;
  held_minor?: number | string | null;
  refunded_minor?: number | string | null;
};

type UpdateQuery = {
  eq: (column: string, value: string | number) => UpdateQuery;
  is: (column: string, value: null) => UpdateQuery;
  select: (columns: string) => Promise<{ data: EscrowRow[] | null }>;
};

type Admin = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => UpdateQuery;
  };
};

export interface AppliedFunding {
  status: "funded" | "already_processed";
  contractId: string;
  heldMinor: number;
}

export interface AppliedRefund {
  status: "refunded" | "already_processed";
  contractId: string;
  refundedMinor: number;
}

export async function applyEscrowFunding(
  admin: Admin,
  contract: { id: string; reference_code: string },
  decision: { transactionId: string; amountMinor: number },
  provider: "paystack" | "flutterwave",
): Promise<AppliedFunding> {
  const { data: funded } = await admin
    .from("escrow_contracts")
    .update({
      status: "funds_held",
      held_minor: decision.amountMinor,
      provider,
      provider_reference: contract.reference_code,
      provider_transaction_id: decision.transactionId,
    })
    .eq("id", contract.id)
    .eq("status", "pending_payment")
    .is("provider_transaction_id", null)
    .select("id, held_minor");

  if (!funded?.length) {
    return {
      status: "already_processed",
      contractId: contract.id,
      heldMinor: 0,
    };
  }

  return {
    status: "funded",
    contractId: funded[0].id,
    heldMinor: Number(funded[0].held_minor),
  };
}

export async function applyEscrowRefund(
  admin: Admin,
  contract: {
    id: string;
    status: string;
    held_minor?: number | string | null;
    refunded_minor?: number | string | null;
    released_minor?: number | string | null;
  },
  amountMinor: number,
): Promise<AppliedRefund> {
  const alreadyRefunded = Number(contract.refunded_minor ?? 0);
  const held = Number(contract.held_minor ?? 0);
  const nextRefunded = alreadyRefunded + amountMinor;
  const released = Number(contract.released_minor ?? 0);

  const { data: refunded } = await admin
    .from("escrow_contracts")
    .update({
      refunded_minor: nextRefunded,
      status: nextRefunded + released >= held ? "refunded" : contract.status,
    })
    .eq("id", contract.id)
    .eq("refunded_minor", alreadyRefunded)
    .select("id, refunded_minor");

  if (!refunded?.length) {
    return {
      status: "already_processed",
      contractId: contract.id,
      refundedMinor: 0,
    };
  }

  return {
    status: "refunded",
    contractId: refunded[0].id,
    refundedMinor: Number(refunded[0].refunded_minor),
  };
}
