// Starts a Paystack collection for an escrow contract.
// The money lands in the FRELUX Paystack balance and stays there until a
// milestone is released, so this function only ever creates a checkout link.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  PROVIDER_CURRENCIES,
  currencyIsSupported,
  minorToMajor,
  providerForCurrency,
} from "../_shared/escrow_providers.ts";

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

  let payload: {
    action?: "create" | "fund";
    contract_id?: string;
    callback_url?: string;
    title?: string;
    currency?: string;
    total_minor?: number;
    seller_name?: string;
    seller_email?: string;
    seller_bank_code?: string;
    seller_account_number?: string;
    job_country?: string;
    buyer_name?: string;
    buyer_email?: string;
    milestones?: { label?: string; amount_minor?: number }[];
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (payload.action === "create") {
    const title = (payload.title ?? "").trim();
    const sellerName = (payload.seller_name ?? "").trim();
    const currency = (payload.currency ?? "NGN").trim().toUpperCase();
    const total = Number(payload.total_minor ?? 0);
    const lines = Array.isArray(payload.milestones) ? payload.milestones : [];

    if (title.length < 3 || title.length > 160) {
      return json(
        { error: "Give the contract a title of 3 to 160 characters" },
        400,
      );
    }
    if (!sellerName) return json({ error: "The seller needs a name" }, 400);
    if (!/^[A-Z]{3}$/.test(currency)) {
      return json({ error: "Currency must be a three letter code" }, 400);
    }
    if (!Number.isInteger(total) || total <= 0) {
      return json(
        { error: "The contract total must be a whole amount in kobo" },
        400,
      );
    }

    // A market that is not open must not start a charge. Switching a country on
    // is a business decision, and "coming soon" is a promise a payment rail
    // cannot keep. A market with no profile row is not gated: that is the
    // existing behaviour for everywhere FRELUX has not formally listed yet.
    const jobCountry = (payload.job_country ?? "NG").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(jobCountry)) {
      return json({ error: "Country must be a two letter code" }, 400);
    }
    const { data: market } = await admin
      .from("market_profiles")
      .select("status")
      .eq("country_code", jobCountry)
      .maybeSingle();
    const marketStatus = market?.status ? String(market.status) : null;
    if (marketStatus && !["active", "test_only"].includes(marketStatus)) {
      return json(
        {
          error: `FRELUX is not taking payments in ${jobCountry} yet.`,
          market_status: marketStatus,
        },
        409,
      );
    }
    if (lines.length === 0 || lines.length > 12) {
      return json({ error: "Add between 1 and 12 payment stages" }, 400);
    }

    const stages = lines.map((line, index) => {
      const label = (line.label ?? `Stage ${index + 1}`).trim().slice(0, 120);
      const amount = Number(line.amount_minor ?? 0);
      return { label: label || `Stage ${index + 1}`, amount, index };
    });
    for (const stage of stages) {
      if (!Number.isInteger(stage.amount) || stage.amount <= 0) {
        return json(
          { error: `Stage "${stage.label}" needs a positive whole amount` },
          400,
        );
      }
    }
    const planned = stages.reduce((sum, stage) => sum + stage.amount, 0);
    if (planned !== total) {
      return json(
        {
          error: `The stages add up to ${planned} but the contract total is ${total}`,
        },
        400,
      );
    }

    const reference = `ESC-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const { data: created, error: createError } = await admin
      .from("escrow_contracts")
      .insert({
        created_by: auth.user.id,
        reference_code: reference,
        title,
        currency,
        total_minor: total,
        seller_name: sellerName,
        seller_email: payload.seller_email ?? null,
        seller_bank_code: payload.seller_bank_code ?? null,
        seller_account_number: payload.seller_account_number ?? null,
        buyer_name: payload.buyer_name ?? null,
        buyer_email: payload.buyer_email ?? auth.user.email ?? null,
        // Who the two sides are, so the contact gate and the safety rules can
        // reason about the pairing instead of matching names and emails.
        buyer_user_id: auth.user.id,
        seller_user_id: payload.seller_user_id ?? null,
        source:
          payload.source === "pro_connect" || payload.source === "marketplace"
            ? payload.source
            : "direct",
        job_city: payload.job_city ?? null,
        job_state: payload.job_state ?? null,
        job_country: payload.job_country ?? "NG",
      })
      .select("id, reference_code")
      .single();

    if (createError || !created) {
      // The worker safety guard refuses the contract on purpose. Pass its
      // reason through so the person sees what to fix instead of a 500.
      const reason = `${createError?.message ?? ""} ${createError?.details ?? ""}`;
      if (reason.includes("CLIENT_ID_REQUIRED")) {
        return json(
          {
            error:
              "The client must verify one government ID before a worker can be booked",
            code: "CLIENT_ID_REQUIRED",
          },
          409,
        );
      }
      if (reason.includes("CROSS_STATE_JOB_BLOCKED")) {
        return json(
          {
            error:
              "This job is outside the professional's own city and state. An admin has to approve the travel first.",
            code: "CROSS_STATE_JOB_BLOCKED",
          },
          409,
        );
      }
      console.error(
        "escrow-checkout could not create the contract",
        createError,
      );
      return json({ error: "Could not create the escrow contract" }, 500);
    }

    const { error: milestoneError } = await admin
      .from("escrow_milestones")
      .insert(
        stages.map((stage) => ({
          contract_id: created.id,
          label: stage.label,
          position: stage.index,
          amount_minor: stage.amount,
        })),
      );

    if (milestoneError) {
      console.error("escrow-checkout could not add the stages", milestoneError);
      await admin.from("escrow_contracts").delete().eq("id", created.id);
      return json({ error: "Could not add the payment stages" }, 500);
    }

    payload.contract_id = created.id;
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

  // International buyers settle through Flutterwave; naira stays on Paystack.
  const provider = payload.provider ?? providerForCurrency(contract.currency);
  if (!currencyIsSupported(provider, contract.currency)) {
    return json(
      {
        error: `${contract.currency} is not supported on ${provider}. Supported: ${PROVIDER_CURRENCIES[provider].join(", ")}.`,
      },
      400,
    );
  }

  if (provider === "flutterwave") {
    if (contract.currency.toUpperCase() === "NGN") {
      return json({ error: "Naira escrow collects on Paystack" }, 400);
    }
    const flwKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flwKey) return json({ error: "Flutterwave is not configured" }, 503);

    const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flwKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: contract.reference_code,
        amount: minorToMajor(Number(contract.total_minor)),
        currency: contract.currency,
        redirect_url:
          payload.callback_url ??
          `https://freluxtools.com/escrow?contract=${contract.id}`,
        customer: {
          email,
          name: contract.buyer_name ?? undefined,
        },
        customizations: {
          title: contract.title,
          description: "FRELUX escrow",
        },
        meta: { contract_id: contract.id, purpose: "frelux_escrow" },
      }),
    });

    const flwResult = await flwResponse.json().catch(() => null);
    if (
      !flwResponse.ok ||
      flwResult?.status !== "success" ||
      !flwResult?.data?.link
    ) {
      const reason =
        (flwResult && (flwResult.message as string)) ||
        "Flutterwave refused the request";
      console.error(
        "escrow-checkout flutterwave failed",
        flwResponse.status,
        reason,
      );
      return json({ error: reason }, 502);
    }

    await admin
      .from("escrow_contracts")
      .update({
        provider: "flutterwave",
        provider_reference: contract.reference_code,
      })
      .eq("id", contract.id);

    return json({
      contract_id: contract.id,
      reference_code: contract.reference_code,
      provider: "flutterwave",
      authorization_url: flwResult.data.link,
      reference: contract.reference_code,
      amount_minor: Number(contract.total_minor),
      currency: contract.currency,
    });
  }

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
    contract_id: contract.id,
    reference_code: contract.reference_code,
    provider: "paystack",
    authorization_url: result.data?.authorization_url ?? null,
    access_code: result.data?.access_code ?? null,
    reference: result.data?.reference ?? contract.reference_code,
    amount_minor: Number(contract.total_minor),
    currency: contract.currency,
  });
});
