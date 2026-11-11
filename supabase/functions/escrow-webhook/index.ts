// Escrow webhook (kept as a dedicated endpoint for escrow-only testing).
//
// The primary Live Mode URL is `paystack-webhook`, which now dispatches escrow
// itself. This endpoint stays in place so an escrow integration can be proved
// on its own, and it shares the same decision module so the two can never drift:
// see `_shared/escrow_paystack.ts`.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  escrowReferenceOf,
  planEscrowFunding,
  verifyPaystackSignature,
} from "../_shared/escrow_paystack.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Apikey, X-Paystack-Signature",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey)
    return json({ error: "Server configuration error" }, 500);

  const rawBody = await req.text();
  const valid = await verifyPaystackSignature(
    rawBody,
    req.headers.get("x-paystack-signature"),
    [
      Deno.env.get("PAYSTACK_ESCROW_SECRET"),
      Deno.env.get("PAYSTACK_SECRET_KEY"),
    ],
  );
  if (!valid) return json({ error: "Invalid signature" }, 401);

  let body: { event?: string; data?: Record<string, unknown> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Malformed body" }, 400);
  }

  const event = body.event ?? "";
  const data = body.data ?? {};
  const reference = escrowReferenceOf(data);
  if (!reference)
    return json({ received: true, ignored: "not an escrow reference" });

  const admin = createClient(url, serviceKey);
  const { data: contract, error } = await admin
    .from("escrow_contracts")
    .select(
      "id, status, total_minor, currency, held_minor, released_minor, refunded_minor, provider_transaction_id",
    )
    .eq("reference_code", reference)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!contract) return json({ received: true, escrow: "unknown_reference" });

  if (event !== "charge.success") {
    return json({ received: true, escrow: "ignored", event });
  }

  const decision = planEscrowFunding(contract, data);
  if (decision.action === "duplicate")
    return json({ received: true, duplicate: true });
  if (decision.action === "reject") {
    return json({
      received: true,
      escrow: "rejected",
      reason: decision.reason,
    });
  }

  const { data: funded, error: fundError } = await admin
    .from("escrow_contracts")
    .update({
      status: "funds_held",
      held_minor: decision.amountMinor,
      provider_transaction_id: decision.transactionId,
      provider_reference: reference,
    })
    .eq("id", contract.id)
    .eq("status", "pending_payment")
    .is("provider_transaction_id", null)
    .select("id, held_minor")
    .maybeSingle();

  if (fundError) return json({ error: fundError.message }, 500);
  if (!funded) return json({ received: true, duplicate: true });

  return json({
    received: true,
    contract_id: funded.id,
    held_minor: funded.held_minor,
  });
});
