// Releases one milestone to the seller. The FRELUX fee is taken from the
// released amount, never from money the buyer can still be refunded.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { minorToMajor } from "../_shared/escrow_providers.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** Write the money movement back onto the marketplace side. Money has already
 *  left the escrow account by this point, so a failure here is logged and never
 *  rolls the release back. */
async function syncMarketplaceRelease(
  admin: ReturnType<typeof createClient>,
  args: {
    contractId: string;
    escrowMilestoneId: string;
    amountMinor: number;
    feeMinor: number;
    provider: string;
    providerRef: string | null;
  },
): Promise<void> {
  try {
    const { data: order } = await admin
      .from("marketplace_orders")
      .select("id, client_id, currency")
      .eq("escrow_contract_id", args.contractId)
      .maybeSingle();
    if (!order) return;

    const now = new Date();
    await admin
      .from("marketplace_milestones")
      .update({
        status: "approved",
        client_approved: true,
        client_approved_at: now.toISOString(),
        completed_date: now.toISOString().slice(0, 10),
      })
      .eq("escrow_milestone_id", args.escrowMilestoneId);

    await admin.from("marketplace_payments").insert({
      order_id: order.id,
      payer_id: order.client_id,
      payee_id: null,
      amount: args.amountMinor / 100,
      currency: order.currency,
      payment_type: "milestone_release",
      status: "completed",
      provider: args.provider,
      provider_ref: args.providerRef,
      notes: `Escrow release; platform fee ${(args.feeMinor / 100).toFixed(2)}`,
    });

    const { data: milestones } = await admin
      .from("marketplace_milestones")
      .select("status")
      .eq("order_id", order.id);
    const settled = (milestones ?? []).every(
      (row) => row.status === "approved",
    );
    await admin
      .from("marketplace_orders")
      .update({ payment_status: settled ? "fully_paid" : "partially_paid" })
      .eq("id", order.id);
  } catch (error) {
    console.error("escrow-release: marketplace sync failed", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const paystackKey =
    Deno.env.get("PAYSTACK_ESCROW_SECRET") ??
    Deno.env.get("PAYSTACK_SECRET_KEY") ??
    "";
  if (!url || !serviceKey || !paystackKey) {
    return json({ error: "Server configuration error" }, 500);
  }

  const admin = createClient(url, serviceKey);

  // Two ways in. A signed-in buyer releases their own escrow, and the
  // scheduled worker releases work the client never answered. The worker is
  // not a user, so it carries the cron secret instead of a session.
  const cronSecret = req.headers.get("x-frelux-cron-secret") ?? "";
  let systemInvocation = false;
  let actorId: string | null = null;

  if (cronSecret) {
    const { data: cronConfig } = await admin
      .from("frelux_internal_config")
      .select("value")
      .eq("name", "escrow_autorelease_cron_secret")
      .maybeSingle();
    const expected = (cronConfig?.value as string | undefined) ?? "";
    if (!expected || cronSecret !== expected) {
      return json({ error: "Invalid cron secret" }, 401);
    }
    systemInvocation = true;
  } else {
    const token =
      req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!token) return json({ error: "Authentication required" }, 401);
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) {
      return json({ error: "Authentication required" }, 401);
    }
    actorId = auth.user.id;
  }

  let payload: {
    contract_id?: string;
    milestone_id?: string;
    action?: "release" | "refund" | "auto_release";
    amount_minor?: number;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // The scheduled pass: find every milestone whose 48 hour clock has run out
  // and release it through the same code path a buyer would use, so there is
  // one release implementation and one ledger.
  if (payload.action === "auto_release") {
    if (!systemInvocation) {
      return json({ error: "Only the scheduled worker can do this" }, 403);
    }
    const { data: due, error: dueError } = await admin.rpc(
      "escrow_auto_release_due",
      { p_limit: 25 },
    );
    if (dueError) {
      console.error("escrow auto release could not list due work", dueError);
      return json({ error: "Could not read due milestones" }, 500);
    }
    const released: Record<string, unknown>[] = [];
    const failed: Record<string, unknown>[] = [];
    for (const row of (due ?? []) as { milestone_id: string; contract_id: string }[]) {
      // The platform still enforces a valid JWT on this function, so the
      // worker's internal call carries the public anon key as its token while
      // the secret proves it is the scheduled worker rather than a stranger.
      const inner = await fetch(`${url}/functions/v1/escrow-release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-frelux-cron-secret": cronSecret,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
        },
        body: JSON.stringify({
          contract_id: row.contract_id,
          milestone_id: row.milestone_id,
          action: "release",
        }),
      });
      const body = await inner.json().catch(() => null);
      if (inner.ok) {
        await admin
          .from("escrow_milestones")
          .update({ auto_released_at: new Date().toISOString() })
          .eq("id", row.milestone_id);
        released.push({ milestone_id: row.milestone_id, ...body });
      } else {
        // A refusal is recorded, not retried in a loop: the next scheduled
        // pass will pick it up only if it is still due and still valid.
        failed.push({ milestone_id: row.milestone_id, reason: body });
      }
    }
    return json({ released: released.length, failed: failed.length, detail: { released, failed } });
  }

  if (!payload.contract_id) {
    return json({ error: "contract_id is required" }, 400);
  }

  if (payload.action === "refund") {
    const { data: refundContract, error: refundError } = await admin
      .from("escrow_contracts")
      .select(
        "id, created_by, status, held_minor, released_minor, refunded_minor, provider_transaction_id, provider_reference",
      )
      .eq("id", payload.contract_id)
      .maybeSingle();

    if (refundError) return json({ error: "Could not read the contract" }, 500);
    if (!refundContract) return json({ error: "Contract not found" }, 404);
    if (!systemInvocation && refundContract.created_by !== actorId) {
      return json({ error: "Only the buyer can ask for this refund" }, 403);
    }

    const refundable =
      Number(refundContract.held_minor) -
      Number(refundContract.released_minor) -
      Number(refundContract.refunded_minor);
    if (refundable <= 0) {
      return json({ error: "There is no held money left to refund" }, 409);
    }

    const requested = payload.amount_minor ?? refundable;
    if (
      !Number.isInteger(requested) ||
      requested <= 0 ||
      requested > refundable
    ) {
      return json(
        { error: `Refund must be between 1 and ${refundable} minor units` },
        400,
      );
    }

    const transaction =
      refundContract.provider_transaction_id ??
      refundContract.provider_reference;
    if (!transaction)
      return json({ error: "This contract was never funded" }, 409);

    if (refundContract.provider === "flutterwave") {
      const flwKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
      if (!flwKey) return json({ error: "Flutterwave is not configured" }, 503);
      const flwRefund = await fetch(
        `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transaction)}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${flwKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: minorToMajor(requested) }),
        },
      );
      const flwRefundResult = await flwRefund.json().catch(() => null);
      if (!flwRefund.ok || flwRefundResult?.status !== "success") {
        const reason =
          (flwRefundResult && (flwRefundResult.message as string)) ||
          "Flutterwave refused the refund";
        console.error("escrow-release flutterwave refund failed", reason);
        return json({ error: reason }, 502);
      }
      const { data: refundClaimed } = await admin
        .from("escrow_contracts")
        .update({
          refunded_minor: Number(refundContract.refunded_minor) + requested,
          status:
            Number(refundContract.refunded_minor) + requested >=
            Number(refundContract.held_minor)
              ? "refunded"
              : refundContract.status,
        })
        .eq("id", refundContract.id)
        .eq("refunded_minor", Number(refundContract.refunded_minor))
        .select("id, refunded_minor, status");
      if (!refundClaimed?.length)
        return json({ error: "This refund was already applied" }, 409);
      return json({
        refunded_minor: requested,
        refunded_total_minor: Number(refundClaimed[0].refunded_minor),
        status: refundClaimed[0].status,
        provider: "flutterwave",
        provider_refund: flwRefundResult.data?.status ?? "pending",
      });
    }

    const refundResponse = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction, amount: requested }),
    });
    const refundResult = await refundResponse.json().catch(() => null);
    if (!refundResponse.ok || !refundResult?.status) {
      const reason =
        (refundResult && (refundResult.message as string)) ||
        "Paystack refused the refund";
      console.error("escrow-refund failed", reason);
      return json({ error: reason }, 502);
    }

    const refundedMinor = Number(refundContract.refunded_minor) + requested;
    const fullyRefunded =
      refundedMinor + Number(refundContract.released_minor) >=
      Number(refundContract.held_minor);

    await admin
      .from("escrow_contracts")
      .update({
        refunded_minor: refundedMinor,
        status: fullyRefunded ? "refunded" : refundContract.status,
      })
      .eq("id", refundContract.id);

    if (fullyRefunded) {
      await admin
        .from("escrow_milestones")
        .update({ state: "refunded" })
        .eq("contract_id", refundContract.id)
        .eq("state", "pending");
    }

    return json({
      refunded_minor: requested,
      contract_status: fullyRefunded ? "refunded" : refundContract.status,
      provider_refund: refundResult.data?.status ?? "pending",
    });
  }

  if (!payload.milestone_id) {
    return json({ error: "milestone_id is required to release funds" }, 400);
  }

  const { data: contract, error: contractError } = await admin
    .from("escrow_contracts")
    .select(
      "id, created_by, status, held_minor, released_minor, refunded_minor, fee_minor, fee_basis_points, seller_name, seller_email, seller_bank_code, seller_account_number, seller_recipient_code, currency, provider",
    )
    .eq("id", payload.contract_id)
    .maybeSingle();

  if (contractError) return json({ error: "Could not read the contract" }, 500);
  if (!contract) return json({ error: "Contract not found" }, 404);
  if (!systemInvocation && contract.created_by !== actorId) {
    return json({ error: "Only the buyer can release this escrow" }, 403);
  }
  if (!["funds_held", "partially_released"].includes(contract.status)) {
    return json(
      {
        error: `Nothing can be released while the contract is ${contract.status}`,
      },
      409,
    );
  }

  const { data: milestone } = await admin
    .from("escrow_milestones")
    .select("id, label, amount_minor, state")
    .eq("id", payload.milestone_id)
    .eq("contract_id", contract.id)
    .maybeSingle();

  if (!milestone) return json({ error: "Milestone not found" }, 404);
  if (milestone.state !== "pending") {
    return json({ error: `This milestone is already ${milestone.state}` }, 409);
  }

  const available =
    Number(contract.held_minor) -
    Number(contract.released_minor) -
    Number(contract.refunded_minor);
  const amount = Number(milestone.amount_minor);
  if (available < amount) {
    return json(
      { error: "Not enough funds held to release this milestone" },
      409,
    );
  }

  const fee = Math.floor((amount * Number(contract.fee_basis_points)) / 10000);
  const payout = amount - fee;
  if (payout <= 0) return json({ error: "Released amount is too small" }, 400);

  if (contract.provider === "flutterwave") {
    const flwKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flwKey) return json({ error: "Flutterwave is not configured" }, 503);
    if (!contract.seller_bank_code || !contract.seller_account_number) {
      return json(
        {
          error:
            "The seller has no payout account on file. Add bank code and account number first.",
        },
        400,
      );
    }
    const flwTransfer = await fetch(
      "https://api.flutterwave.com/v3/transfers",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flwKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_bank: contract.seller_bank_code,
          account_number: contract.seller_account_number,
          amount: minorToMajor(payout),
          currency: contract.currency,
          narration: `FRELUX escrow release: ${milestone.label}`,
          reference: `escrow-${contract.id.slice(0, 8)}-${milestone.id.slice(0, 8)}`,
        }),
      },
    );
    const flwTransferResult = await flwTransfer.json().catch(() => null);
    if (!flwTransfer.ok || flwTransferResult?.status !== "success") {
      const reason =
        (flwTransferResult && (flwTransferResult.message as string)) ||
        "Flutterwave refused the transfer";
      console.error("escrow-release flutterwave transfer failed", reason);
      return json({ error: reason }, 502);
    }

    const { data: flwClaimed } = await admin
      .from("escrow_milestones")
      .update({
        state: "released",
        released_at: new Date().toISOString(),
        transfer_code:
          flwTransferResult.data?.reference ??
          flwTransferResult.data?.id?.toString() ??
          null,
      })
      .eq("id", milestone.id)
      .eq("state", "pending")
      .select("id");
    if (!flwClaimed?.length)
      return json({ error: "This milestone was already released" }, 409);

    const { data: flwSiblings } = await admin
      .from("escrow_milestones")
      .select("state")
      .eq("contract_id", contract.id);
    const flwAllReleased = (flwSiblings ?? []).every(
      (row) => row.state !== "pending",
    );

    await admin
      .from("escrow_contracts")
      .update({
        released_minor: Number(contract.released_minor) + amount,
        fee_minor: Number(contract.fee_minor ?? 0) + fee,
        status: flwAllReleased ? "released" : "partially_released",
      })
      .eq("id", contract.id);

    await syncMarketplaceRelease(admin, {
      contractId: contract.id,
      escrowMilestoneId: milestone.id,
      amountMinor: amount,
      feeMinor: fee,
      provider: "flutterwave",
      providerRef:
        flwTransferResult.data?.reference ??
        flwTransferResult.data?.id?.toString() ??
        null,
    });

    return json({
      released_minor: amount,
      platform_fee_minor: fee,
      payout_minor: payout,
      provider: "flutterwave",
      provider_transfer: flwTransferResult.data?.status ?? "pending",
    });
  }

  let recipient = contract.seller_recipient_code as string | null;
  if (!recipient) {
    if (!contract.seller_bank_code || !contract.seller_account_number) {
      return json(
        {
          error:
            "The seller has no payout account on file. Add bank code and account number first.",
        },
        400,
      );
    }
    const recipientResponse = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nubank",
          name: contract.seller_name,
          account_number: contract.seller_account_number,
          bank_code: contract.seller_bank_code,
          currency: contract.currency,
        }),
      },
    );
    const recipientResult = await recipientResponse.json().catch(() => null);
    if (!recipientResponse.ok || !recipientResult?.status) {
      const reason =
        (recipientResult && (recipientResult.message as string)) ||
        "Paystack rejected the seller payout account";
      console.error("escrow-release recipient failed", reason);
      return json({ error: reason }, 502);
    }
    recipient = recipientResult.data?.recipient_code ?? null;
    if (!recipient) return json({ error: "No payout recipient returned" }, 502);
    await admin
      .from("escrow_contracts")
      .update({ seller_recipient_code: recipient })
      .eq("id", contract.id);
  }

  const transferResponse = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: payout,
      recipient,
      reason: `FRELUX escrow release: ${milestone.label}`,
      reference: `escrow-${contract.id.slice(0, 8)}-${milestone.id.slice(0, 8)}`,
    }),
  });
  const transferResult = await transferResponse.json().catch(() => null);
  if (!transferResponse.ok || !transferResult?.status) {
    const reason =
      (transferResult && (transferResult.message as string)) ||
      "Paystack refused the transfer";
    console.error("escrow-release transfer failed", reason);
    return json({ error: reason }, 502);
  }

  const transferCode = transferResult.data?.transfer_code ?? null;
  const { data: claimed } = await admin
    .from("escrow_milestones")
    .update({
      state: "released",
      released_at: new Date().toISOString(),
      transfer_code: transferCode,
    })
    .eq("id", milestone.id)
    .eq("state", "pending")
    .select("id");

  if (!claimed?.length) {
    console.error("escrow-release race: milestone already released");
    return json({ error: "This milestone was already released" }, 409);
  }

  const releasedMinor = Number(contract.released_minor) + amount;
  const { data: siblings } = await admin
    .from("escrow_milestones")
    .select("state")
    .eq("contract_id", contract.id);
  const allReleased = (siblings ?? []).every((row) => row.state !== "pending");

  await admin
    .from("escrow_contracts")
    .update({
      released_minor: releasedMinor,
      fee_minor: Number(contract.fee_minor ?? 0) + fee,
      status: allReleased ? "released" : "partially_released",
    })
    .eq("id", contract.id);

  await syncMarketplaceRelease(admin, {
    contractId: contract.id,
    escrowMilestoneId: milestone.id,
    amountMinor: amount,
    feeMinor: fee,
    provider: "paystack",
    providerRef: transferCode,
  });

  return json({
    released_minor: amount,
    platform_fee_minor: fee,
    seller_payout_minor: payout,
    transfer_code: transferCode,
    transfer_status: transferResult.data?.status ?? "pending",
    contract_status: allReleased ? "released" : "partially_released",
  });
});
