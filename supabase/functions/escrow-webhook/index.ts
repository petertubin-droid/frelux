// Paystack webhook for escrow. Funds are recorded here and nowhere else, and
// only after the signature verifies, so a forged call cannot mark an order paid.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function signatureIsValid(raw: string, signature: string, key: string) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(raw));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
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

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  if (!signature || !(await signatureIsValid(raw, signature, paystackKey))) {
    console.warn("escrow-webhook rejected: bad signature");
    return json({ error: "Invalid signature" }, 401);
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      id?: number | string;
      amount?: number;
      status?: string;
      metadata?: { contract_id?: string };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (event.event !== "charge.success") return json({ received: true });

  const reference = event.data?.reference;
  const contractId = event.data?.metadata?.contract_id;
  const amount = Number(event.data?.amount ?? 0);
  if (!reference || !Number.isInteger(amount) || amount <= 0) {
    return json({ received: true });
  }

  const admin = createClient(url, serviceKey);
  const query = admin
    .from("escrow_contracts")
    .select("id, total_minor, held_minor, status, provider_transaction_id");
  const { data: contract, error } = contractId
    ? await query.eq("id", contractId).maybeSingle()
    : await query.eq("reference_code", reference).maybeSingle();

  if (error) return json({ error: "Could not read the contract" }, 500);
  if (!contract) return json({ received: true });

  const transactionId = String(event.data?.id ?? reference);
  if (contract.provider_transaction_id === transactionId) {
    return json({ received: true, duplicate: true });
  }

  const held = Number(contract.held_minor) + amount;
  const total = Number(contract.total_minor);
  const status = held >= total ? "funds_held" : contract.status;

  const { error: updateError } = await admin
    .from("escrow_contracts")
    .update({
      held_minor: held,
      status,
      provider_transaction_id: transactionId,
      provider_reference: reference,
    })
    .eq("id", contract.id);

  if (updateError) {
    console.error("escrow-webhook could not record the payment", updateError);
    return json({ error: "Could not record the payment" }, 500);
  }

  return json({ received: true, contract_id: contract.id, held_minor: held });
});
