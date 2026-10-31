// =========================================================
// API wallet auto top-up sweep.
//
// Called by pg_cron every ten minutes, and by nobody else: it presents a
// shared secret that the database hands the scheduler. The secret lives in
// frelux_internal_config, which is unreadable from a browser.
//
// Each candidate is settled in the database before and after the provider
// call, so a crash mid-charge leaves a pending row that a later sweep expires,
// not a wallet that charged twice.
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { jsonResponse } from "../_shared/cors.ts";
import { isProviderSuccess } from "../_shared/auto-topup.ts";

const FLUTTERWAVE_BASE = "https://api.flutterwave.com/v3";
const MAX_PER_SWEEP = 10;

interface Candidate {
  user_id: string;
  card_id: string;
  amount_usd: number;
  balance_usd: number;
}

serveWithCors(async (req: Request) => {
  if (req.method !== "POST")
    return jsonResponse({ error: "method not allowed" }, 405);

  const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("AUTOTOPUP_CRON_SECRET");

  if (!supabaseUrl || !serviceRoleKey)
    return jsonResponse(
      { error: "Supabase credentials are not configured" },
      500,
    );
  if (!secretKey)
    return jsonResponse({ error: "Payment provider is not configured" }, 503);
  // Fail closed: without a secret this endpoint would let anyone trigger
  // charges, and its whole purpose is moving money.
  if (!cronSecret)
    return jsonResponse({ error: "Auto top-up secret is not configured" }, 503);
  if ((req.headers.get("x-frelux-cron-secret") ?? "") !== cronSecret)
    return jsonResponse({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: candidates, error: candidateError } = await admin.rpc(
    "api_autotopup_candidates",
    { p_limit: MAX_PER_SWEEP },
  );
  if (candidateError)
    return jsonResponse({ error: candidateError.message }, 500);

  const rows = (candidates ?? []) as Candidate[];
  const results: Array<Record<string, unknown>> = [];

  for (const candidate of rows) {
    const begun = await admin.rpc("begin_api_autotopup", {
      p_user: candidate.user_id,
    });
    if (begun.error) continue;
    const attempt = begun.data as {
      ok?: boolean;
      attempt_id?: string;
      card_id?: string;
      amount_usd?: number;
      tx_ref?: string;
    } | null;
    if (!attempt?.ok || !attempt.attempt_id || !attempt.tx_ref) continue;
    const attemptId = attempt.attempt_id;

    const settle = async (
      status: "credited" | "declined" | "failed",
      reference: string | null,
      reason: string | null,
    ) => {
      await admin.rpc("finish_api_autotopup", {
        p_attempt: attemptId,
        p_status: status,
        p_provider_reference: reference,
        p_reason: reason,
      });
      results.push({ user: candidate.user_id, status, reason });
    };

    // The token is read here, on the server, and never returned to a client.
    const { data: card } = await admin
      .from("frelux_api_payment_methods")
      .select("provider_token")
      .eq("id", attempt.card_id ?? candidate.card_id)
      .is("revoked_at", null)
      .maybeSingle();

    const token = (card as { provider_token?: string } | null)?.provider_token;
    if (!token) {
      await settle("failed", null, "saved card could not be read");
      continue;
    }

    const { data: userRow } = await admin.auth.admin.getUserById(
      candidate.user_id,
    );
    const email = userRow?.user?.email ?? null;
    if (!email) {
      await settle("failed", null, "no billing email on the account");
      continue;
    }

    try {
      const res = await fetch(`${FLUTTERWAVE_BASE}/tokenized-charges`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          currency: "USD",
          amount: attempt.amount_usd ?? candidate.amount_usd,
          email,
          tx_ref: attempt.tx_ref,
          narration: "FRELUX API credit auto top-up",
        }),
        signal: AbortSignal.timeout(12_000),
      });
      const body = await res.jsonResponse().catch(() => null);
      const data = (body as { data?: Record<string, unknown> } | null)?.data;
      const status = data?.status;
      const reference = data?.flw_ref ?? data?.tx_ref ?? null;

      if (res.ok && isProviderSuccess(status)) {
        await settle("credited", String(reference ?? attempt.tx_ref), null);
      } else {
        // Anything that is not an explicit success is not a payment. A 3DS
        // prompt cannot be answered by a person during a sweep, so that card
        // needs authentication and the owner has to act.
        const providerMessage = (body as { message?: unknown } | null)?.message;
        const reason =
          typeof data?.processor_response === "string"
            ? data.processor_response
            : typeof providerMessage === "string"
              ? providerMessage
              : `provider returned ${status ?? res.status}`;
        await settle("declined", reference ? String(reference) : null, reason);
      }
    } catch {
      await settle("failed", null, "provider did not answer in time");
    }
  }

  return jsonResponse({ considered: rows.length, results });
});
