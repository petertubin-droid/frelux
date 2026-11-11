// Starts a Paystack collection for an escrow contract.
// The money lands in the FRELUX Paystack balance and stays there until a
// milestone is released, so this function only ever creates a checkout link.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

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

  const token =
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return json({ error: "Authentication required" }, 401);

  const admin = createClient(url, serviceKey);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) {
    return json({ error: "Authentication required" }, 401);
  }

  let payload: { contract_id?: string; callback_url?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!payload.contract_id)
    return json({ error: "contract_id is required" }, 400);

  const { data: contract, error: contractError } = await admin
    .from("escrow_contracts")
    .select(
      "id, created_by, reference_code, title, currency, total_minor, status, held_minor, buyer_email, seller_name",
    )
    .eq("id", payload.contract_id)
    .maybeSingle();

  if (contractError) return json({ error: "Could not read the contract" }, 500);
  if (!contract) return json({ error: "Contract not found" }, 404);
  if (contract.created_by !== auth.user.id) {
    return json({ error: "This contract belongs to another account" }, 403);
  }
  if (
    contract.status !== "pending_payment" ||
    Number(contract.held_minor) > 0
  ) {
    return json({ error: "This contract has already been funded" }, 409);
  }

  const email =
    contract.buyer_email || auth.user.email || "buyer@freluxtools.com";

  const response = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Number(contract.total_minor),
        currency: contract.currency,
        reference: contract.reference_code,
        callback_url:
          payload.callback_url ??
          `https://freluxtools.com/escrow?contract=${contract.id}`,
        metadata: {
          contract_id: contract.id,
          purpose: "frelux_escrow",
          title: contract.title,
        },
      }),
    },
  );

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status) {
    const reason =
      (result && (result.message as string)) || "Paystack refused the request";
    console.error("escrow-checkout initialize failed", response.status, reason);
    return json({ error: reason }, 502);
  }

  await admin
    .from("escrow_contracts")
    .update({
      provider: "paystack",
      provider_reference: contract.reference_code,
    })
    .eq("id", contract.id);

  return json({
    authorization_url: result.data?.authorization_url ?? null,
    access_code: result.data?.access_code ?? null,
    reference: result.data?.reference ?? contract.reference_code,
    amount_minor: Number(contract.total_minor),
    currency: contract.currency,
  });
});
