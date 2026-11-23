// =========================================================
// Ported: client-identity
//
// Same rules as the Supabase function, and the same one that matters: a name
// the client typed themselves cannot clear the check. Only a name the bank
// returned for the account can auto-approve; everything else is pending for a
// person. Name comparison is imported from the tested shared module, not
// reimplemented, so the two runtimes cannot drift.
// =========================================================

import { decideNameMatch } from "../../../supabase/functions/_shared/name-match.ts";
import { type EdgeContext, type EdgeEnv, clientKey, json } from "./runtime";

const ID_TYPES = ["nin", "voters_card", "drivers_license", "intl_passport"];

interface IdentityBody {
  action?: string;
  legal_name?: string;
  id_type?: string;
  id_last4?: string;
  document_path?: string;
  bank_code?: string;
  bank_name?: string;
  account_number?: string;
  funding_account_name?: string;
}

function rest(env: EdgeEnv) {
  const base = typeof env.SUPABASE_URL === "string" ? env.SUPABASE_URL.replace(/\/+$/, "") : "";
  const key = typeof env.SUPABASE_SERVICE_ROLE_KEY === "string" ? env.SUPABASE_SERVICE_ROLE_KEY : "";
  return base && key ? { base, key, auth: { apikey: key, Authorization: `Bearer ${key}` } } : null;
}

async function resolveAccount(
  env: EdgeEnv,
  bankCode: string,
  accountNumber: string,
): Promise<{ accountName: string | null; bankName: string | null; reason: string }> {
  const key =
    (typeof env.PAYSTACK_SECRET_KEY === "string" && env.PAYSTACK_SECRET_KEY) ||
    (typeof env.PAYSTACK_ESCROW_SECRET === "string" && env.PAYSTACK_ESCROW_SECRET) ||
    "";
  if (!key) return { accountName: null, bankName: null, reason: "no_provider_key" };
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const payload = (await response.json().catch(() => null)) as
      | { data?: { account_name?: string; bank_name?: string }; message?: string }
      | null;
    const accountName = payload?.data?.account_name ?? null;
    if (!response.ok || !accountName) {
      return { accountName: null, bankName: null, reason: payload?.message ?? "unresolved" };
    }
    return { accountName: String(accountName), bankName: payload?.data?.bank_name ?? null, reason: "resolved" };
  } catch {
    return { accountName: null, bankName: null, reason: "provider_unreachable" };
  }
}

export async function handleClientIdentity(
  request: Request,
  env: EdgeEnv,
  _ctx: EdgeContext,
  cors: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  let body: IdentityBody;
  try {
    body = (await request.json()) as IdentityBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400, cors);
  }

  const cfg = rest(env);
  if (!cfg) return json({ error: "Server configuration error" }, 500, cors);

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return json({ error: "Authentication required" }, 401, cors);

  // Who is calling: ask GoTrue, do not decode the token ourselves.
  let userId = "";
  try {
    const res = await fetch(`${cfg.base}/auth/v1/user`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return json({ error: "Authentication required" }, 401, cors);
    const user = (await res.json()) as { id?: string };
    if (!user?.id) return json({ error: "Authentication required" }, 401, cors);
    userId = user.id;
  } catch {
    return json({ error: "Authentication required" }, 401, cors);
  }

  const settingsRes = await fetch(
    `${cfg.base}/rest/v1/worker_safety_settings?select=identity_auto_approve_score,identity_manual_review_score,identity_auto_review&id=eq.1&limit=1`,
    { headers: cfg.auth },
  ).catch(() => null);
  const settings = (settingsRes?.ok ? await settingsRes.json().catch(() => []) : []) as
    | { identity_auto_approve_score?: number; identity_manual_review_score?: number; identity_auto_review?: boolean }[]
    | null;
  const row = Array.isArray(settings) ? settings[0] : null;
  const thresholds = {
    autoApprove: Number(row?.identity_auto_approve_score ?? 0.85),
    manualReview: Number(row?.identity_manual_review_score ?? 0.6),
  };
  const autoReviewEnabled = row?.identity_auto_review !== false;

  const existingRes = await fetch(
    `${cfg.base}/rest/v1/client_verifications?select=status,name_match_score,match_reason,resolved_account_name,match_method,rejection_reason&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: cfg.auth },
  ).catch(() => null);
  const existingRows = (existingRes?.ok ? await existingRes.json().catch(() => []) : []) as
    | {
        status: string;
        name_match_score: number | null;
        match_reason: string | null;
        resolved_account_name: string | null;
        match_method: string | null;
        rejection_reason: string | null;
      }[]
    | null;
  const existing = Array.isArray(existingRows) ? existingRows[0] ?? null : null;

  if (body.action !== "client_identity_submit") {
    if (!existing) return json({ status: "none" }, 200, cors);
    return json(
      {
        status: existing.status,
        score: existing.name_match_score,
        reason: existing.match_reason,
        matched_name: existing.resolved_account_name,
        method: existing.match_method,
        detail: existing.rejection_reason,
      },
      200,
      cors,
    );
  }

  if (existing?.status === "verified") {
    return json(
      {
        status: "verified",
        score: existing.name_match_score,
        matched_name: existing.resolved_account_name,
        method: existing.match_method,
        explanation: "This account is already verified.",
      },
      200,
      cors,
    );
  }

  const legalName = (body.legal_name ?? "").trim();
  const idType = (body.id_type ?? "").trim();
  const idLast4 = (body.id_last4 ?? "").trim();
  const bankCode = (body.bank_code ?? "").replace(/\D/g, "");
  const accountNumber = (body.account_number ?? "").replace(/\D/g, "");

  if (legalName.length < 2 || legalName.length > 120) {
    return json({ error: "Enter the full name printed on your ID" }, 400, cors);
  }
  if (!ID_TYPES.includes(idType)) {
    return json({ error: "Choose NIN, voter's card, licence or passport" }, 400, cors);
  }
  if (!/^[0-9A-Za-z]{4}$/.test(idLast4)) {
    return json({ error: "Enter the last four characters of the ID" }, 400, cors);
  }
  if (accountNumber && accountNumber.length !== 10) {
    return json({ error: "A Nigerian account number has ten digits" }, 400, cors);
  }

  let resolvedName: string | null = null;
  let bankName: string | null = (body.bank_name ?? "").trim() || null;
  let method: "bank_resolve" | "declared_account_name" = "declared_account_name";
  let resolveReason = "no_account_number";

  if (bankCode && accountNumber) {
    const resolved = await resolveAccount(env, bankCode, accountNumber);
    resolveReason = resolved.reason;
    if (resolved.accountName) {
      resolvedName = resolved.accountName;
      bankName = resolved.bankName ?? bankName;
      method = "bank_resolve";
    }
  }

  const typedName = (body.funding_account_name ?? "").trim();
  const comparisonName = resolvedName ?? (typedName || null);
  const verdict = decideNameMatch(legalName, comparisonName, thresholds);

  const bankConfirmed = method === "bank_resolve";
  const downgrade = !autoReviewEnabled || (!bankConfirmed && verdict.decision === "verified");
  const decision = downgrade && verdict.decision === "verified" ? "pending" : verdict.decision;

  const writeRes = await fetch(`${cfg.base}/rest/v1/client_verifications?on_conflict=user_id`, {
    method: "POST",
    headers: { ...cfg.auth, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      legal_name: legalName,
      id_type: idType,
      id_last4: idLast4.toUpperCase(),
      document_path: body.document_path ?? null,
      bank_code: bankCode || null,
      bank_name: bankName,
      account_last4: accountNumber ? accountNumber.slice(-4) : null,
      resolved_account_name: comparisonName,
      name_match_score: verdict.score,
      match_method: method,
      match_reason: verdict.reason,
      name_match: decision === "verified",
      status: decision,
      auto_reviewed: autoReviewEnabled && decision !== "pending",
      resolved_at: new Date().toISOString(),
      rejection_reason:
        decision === "rejected"
          ? verdict.explanation
          : decision === "pending" && !bankConfirmed && verdict.decision === "verified"
            ? "The bank could not confirm the account name, so a person has to check this one."
            : null,
    }),
  }).catch(() => null);

  if (!writeRes?.ok) {
    return json({ error: "Could not save the identity check" }, 500, cors);
  }

  return json(
    {
      status: decision,
      score: verdict.score,
      matched_name: comparisonName,
      method,
      auto_reviewed: autoReviewEnabled && decision !== "pending",
      resolve_reason: resolveReason,
      needs_bank_confirmation: !bankConfirmed,
      explanation: verdict.explanation,
    },
    200,
    cors,
  );
}

/** Kept for the rate-limit key so identity submissions share the auth budget. */
export { clientKey };

export const clientIdentityConfig = {
  name: "client-identity",
  methods: ["POST"] as const,
  requiredBindings: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const,
  handler: handleClientIdentity,
};
