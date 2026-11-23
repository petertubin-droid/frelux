// =========================================================
// Issues a document print pass, but only against a payment that the gateway
// itself confirms.
//
// The browser sends a reference; nothing it says about price or entitlement is
// trusted. The amount is re-derived here from DOCUMENT_PRINT_USD and the live
// fx_rates row for the currency the gateway actually charged, and the pass is
// written with the service role. A reference already used for another document
// is rejected by the unique index, so one payment cannot unlock many documents.
// =========================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors, corsHeaders } from "../_shared/serve.ts";

const DOCUMENT_PRINT_USD = 1.09;
const PASS_HOURS = 48;
/** Rounding tolerance: local rounding must not make a fair payment fail. */
const AMOUNT_TOLERANCE = 0.97;

type Gateway = "paystack" | "flutterwave";

interface VerifiedCharge {
  amountMinor: number;
  currency: string;
  metadata: Record<string, unknown>;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyPaystack(reference: string): Promise<VerifiedCharge> {
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) throw new Error("paystack_not_configured");
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const payload = await res.json();
  if (!res.ok || !payload?.status || payload?.data?.status !== "success") {
    throw new Error("payment_not_successful");
  }
  const tx = payload.data;
  return {
    amountMinor: Number(tx.amount),
    currency: String(tx.currency || "").toUpperCase(),
    metadata: (tx.metadata ?? {}) as Record<string, unknown>,
  };
}

async function verifyFlutterwave(reference: string): Promise<VerifiedCharge> {
  const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if (!secret) throw new Error("flutterwave_not_configured");
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const payload = await res.json();
  if (
    !res.ok ||
    payload?.status !== "success" ||
    payload?.data?.status !== "successful"
  ) {
    throw new Error("payment_not_successful");
  }
  const tx = payload.data;
  return {
    amountMinor: Math.round(Number(tx.amount) * 100),
    currency: String(tx.currency || "").toUpperCase(),
    metadata: (tx.meta ?? {}) as Record<string, unknown>,
  };
}

serveWithCors(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer "))
    return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const documentId = String(body?.documentId ?? "").trim();
  const reference = String(body?.reference ?? "").trim();
  const gateway = String(body?.gateway ?? "") as Gateway;

  if (!documentId || documentId.length > 200)
    return json({ error: "Missing documentId" }, 400);
  if (!reference) return json({ error: "Missing reference" }, 400);
  if (gateway !== "paystack" && gateway !== "flutterwave") {
    return json({ error: "Unsupported gateway" }, 400);
  }

  let charge: VerifiedCharge;
  try {
    charge =
      gateway === "paystack"
        ? await verifyPaystack(reference)
        : await verifyFlutterwave(reference);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "verification_failed";
    const status = reason === "payment_not_successful" ? 402 : 503;
    return json({ error: reason }, status);
  }

  // The payment must be the one this user made for this document.
  const metaPurpose = String(charge.metadata?.purpose ?? "");
  const metaUser = String(charge.metadata?.user_id ?? "");
  const metaDocument = String(charge.metadata?.document_id ?? "");
  if (
    metaPurpose !== "document_print" ||
    metaUser !== user.id ||
    metaDocument !== documentId
  ) {
    return json({ error: "Payment does not match this document" }, 403);
  }

  const currency = charge.currency;
  if (!/^[A-Z]{3}$/.test(currency))
    return json({ error: "Unknown charge currency" }, 400);

  const service = createClient(supabaseUrl, serviceRoleKey);

  // Price from the live rate the platform uses, never from the request body.
  let rate = 1;
  if (currency !== "USD") {
    const { data: fx } = await service
      .from("fx_rates")
      .select("rate")
      .eq("base_currency", "USD")
      .eq("quote_currency", currency)
      .eq("is_active", true)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const parsed = Number(fx?.rate);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Refuse rather than guess: charging a currency we cannot price is how a
      // fee silently becomes a fraction of what it should be.
      return json({ error: `No active FX rate for ${currency}` }, 409);
    }
    rate = parsed;
  }

  const expectedMinor = Math.round(DOCUMENT_PRINT_USD * rate * 100);
  if (!(charge.amountMinor >= expectedMinor * AMOUNT_TOLERANCE)) {
    return json(
      {
        error: "Amount paid is below the document print fee",
        expectedMinor,
        currency,
      },
      402,
    );
  }

  const expiresAt = new Date(Date.now() + PASS_HOURS * 3600_000).toISOString();
  const { data: pass, error: passError } = await service
    .from("document_print_passes")
    .upsert(
      {
        user_id: user.id,
        document_id: documentId,
        amount_minor: charge.amountMinor,
        currency,
        usd_amount: DOCUMENT_PRINT_USD,
        gateway,
        provider_reference: reference,
        expires_at: expiresAt,
      },
      { onConflict: "user_id,document_id" },
    )
    .select("document_id, expires_at, currency, amount_minor")
    .single();

  if (passError) {
    const duplicate = passError.code === "23505";
    return json(
      {
        error: duplicate
          ? "This payment has already unlocked a document"
          : "Could not record the print pass",
      },
      duplicate ? 409 : 500,
    );
  }

  return json({ pass });
});
