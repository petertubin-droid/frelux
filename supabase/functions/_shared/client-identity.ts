// =========================================================
// Automatic client identity review.
//
// Lives in a shared module and is called by paystack-verify, because the
// project is at its function limit (402 on deploy) and this check is a
// Paystack interaction anyway: the bank tells us the name on the account, we
// compare it to the name on the ID, and only an ambiguous pair reaches a
// person.
// =========================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decideNameMatch } from "./name-match.ts";

const ID_TYPES = ["nin", "voters_card", "drivers_license", "intl_passport"];

export interface IdentityBody {
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

export interface IdentityResult {
  status: number;
  body: Record<string, unknown>;
}

interface Resolved {
  accountName: string | null;
  bankName: string | null;
  reason: string;
}

async function resolveAccount(
  bankCode: string,
  accountNumber: string,
): Promise<Resolved> {
  const key =
    Deno.env.get("PAYSTACK_SECRET_KEY") ??
    Deno.env.get("PAYSTACK_ESCROW_SECRET") ??
    "";
  if (!key) return { accountName: null, bankName: null, reason: "no_provider_key" };

  const url =
    `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    const payload = await response.json().catch(() => null);
    const accountName = payload?.data?.account_name ?? null;
    if (!response.ok || !accountName) {
      return {
        accountName: null,
        bankName: null,
        reason: (payload?.message as string | undefined) ?? "unresolved",
      };
    }
    return {
      accountName: String(accountName),
      bankName: payload?.data?.bank_name ?? null,
      reason: "resolved",
    };
  } catch (error) {
    console.error("client identity could not resolve the account", error);
    return { accountName: null, bankName: null, reason: "provider_unreachable" };
  }
}

/** Handle an identity submission or status read for the calling user. */
export async function handleClientIdentity(
  req: Request,
  body: IdentityBody,
): Promise<IdentityResult> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return { status: 500, body: { error: "Server configuration error" } };

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return { status: 401, body: { error: "Authentication required" } };

  const admin = createClient(url, serviceKey);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) {
    return { status: 401, body: { error: "Authentication required" } };
  }
  const userId = auth.user.id;

  const { data: settings } = await admin
    .from("worker_safety_settings")
    .select("identity_auto_approve_score, identity_manual_review_score, identity_auto_review")
    .eq("id", 1)
    .maybeSingle();

  const thresholds = {
    autoApprove: Number(settings?.identity_auto_approve_score ?? 0.85),
    manualReview: Number(settings?.identity_manual_review_score ?? 0.6),
  };
  const autoReviewEnabled = settings?.identity_auto_review !== false;

  const { data: existing } = await admin
    .from("client_verifications")
    .select("status, name_match_score, match_reason, resolved_account_name, match_method, rejection_reason")
    .eq("user_id", userId)
    .maybeSingle();

  const wantsStatus = body.action !== "client_identity_submit";
  if (wantsStatus) {
    if (!existing) return { status: 200, body: { status: "none" } };
    return {
      status: 200,
      body: {
        status: existing.status,
        score: existing.name_match_score,
        reason: existing.match_reason,
        matched_name: existing.resolved_account_name,
        method: existing.match_method,
        detail: existing.rejection_reason,
      },
    };
  }

  if (existing?.status === "verified") {
    return {
      status: 200,
      body: {
        status: "verified",
        score: existing.name_match_score,
        matched_name: existing.resolved_account_name,
        method: existing.match_method,
        explanation: "This account is already verified.",
      },
    };
  }

  const legalName = (body.legal_name ?? "").trim();
  const idType = (body.id_type ?? "").trim();
  const idLast4 = (body.id_last4 ?? "").trim();
  const bankCode = (body.bank_code ?? "").replace(/\D/g, "");
  const accountNumber = (body.account_number ?? "").replace(/\D/g, "");

  if (legalName.length < 2 || legalName.length > 120) {
    return { status: 400, body: { error: "Enter the full name printed on your ID" } };
  }
  if (!ID_TYPES.includes(idType)) {
    return { status: 400, body: { error: "Choose NIN, voter's card, licence or passport" } };
  }
  if (!/^[0-9A-Za-z]{4}$/.test(idLast4)) {
    return { status: 400, body: { error: "Enter the last four characters of the ID" } };
  }
  if (accountNumber && accountNumber.length !== 10) {
    return { status: 400, body: { error: "A Nigerian account number has ten digits" } };
  }

  let resolvedName: string | null = null;
  let bankName: string | null = (body.bank_name ?? "").trim() || null;
  let method: "bank_resolve" | "declared_account_name" = "declared_account_name";
  let resolveReason = "no_account_number";

  if (bankCode && accountNumber) {
    const resolved = await resolveAccount(bankCode, accountNumber);
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

  // Automatic approval needs evidence the client cannot type themselves. A
  // matching name proves little when the client wrote both names, so only a
  // name the bank returned for the account can clear the check on its own.
  const bankConfirmed = method === "bank_resolve";
  const downgrade =
    !autoReviewEnabled || (!bankConfirmed && verdict.decision === "verified");

  const decision = downgrade && verdict.decision === "verified"
    ? "pending"
    : verdict.decision;

  const { error: writeError } = await admin.from("client_verifications").upsert(
    {
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
    },
    { onConflict: "user_id" },
  );

  if (writeError) {
    console.error("client identity could not save the check", writeError);
    return { status: 500, body: { error: "Could not save the identity check" } };
  }

  return {
    status: 200,
    body: {
      status: decision,
      score: verdict.score,
      matched_name: comparisonName,
      method,
      auto_reviewed: autoReviewEnabled && decision !== "pending",
      resolve_reason: resolveReason,
      needs_bank_confirmation: !bankConfirmed,
      explanation: verdict.explanation,
    },
  };
}
