/**
 * FRELUX Engine #4, M4: settlement/withholding rules per market, gated
 * behind LEGAL REVIEW.
 *
 * The gate is behavioural, not cosmetic:
 *  - legal_review_status = 'approved'  -> the rule is returned as
 *    actionable (computable deduction).
 *  - 'pending'  -> returned as INFORMATIONAL ONLY with the pending
 *    disclosure; computeWithholding never uses it.
 *  - 'rejected' -> hidden from resolution entirely.
 * The application can never approve a rule (restricted writes via RLS,
 * mirroring predictive_model_validations): settlement advice cannot be
 * self-certified.
 */

import { supabase } from "@/lib/supabase";

export interface WithholdingRuleRow {
  id: string;
  market_code: string;
  rule_kind: "withholding" | "settlement";
  rule_name: string;
  rate_pct: number | null;
  applies_to: string;
  basis: string;
  citation_title: string;
  citation_url: string;
  citation_publisher: string;
  effective_date: string;
  legal_review_status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  is_active: boolean;
}

export type WithholdingResolutionStatus =
  | "approved" // actionable rules exist
  | "pending_only" // rules exist but only pending review
  | "none"; // no rules on file

export interface WithholdingResolution {
  status: WithholdingResolutionStatus;
  marketCode: string;
  /** Actionable (approved) rules. Empty unless status === 'approved'. */
  actionableRules: WithholdingRuleRow[];
  /** Rules disclosed as informational (pending review). */
  pendingRules: WithholdingRuleRow[];
  message: string;
}

const CACHE = new Map<string, WithholdingResolution>();
const TTL_MS = 10 * 60 * 1000;
let sweptAt = 0;

function sweep(): void {
  if (Date.now() - sweptAt > TTL_MS) {
    CACHE.clear();
    sweptAt = Date.now();
  }
}

export async function fetchWithholdingRules(
  marketCode: string,
): Promise<WithholdingRuleRow[]> {
  const cc = (marketCode || "").trim().toUpperCase();
  const { data, error } = await supabase
    .from("withholding_rules")
    .select("*")
    .eq("market_code", cc)
    .eq("is_active", true)
    .order("effective_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WithholdingRuleRow[];
}

/**
 * Resolve withholding/settlement rules for a market, honouring the
 * legal-review gate. Never invents a rule and never promotes a pending
 * rule to actionable.
 */
export async function resolveWithholding(
  marketCode: string,
): Promise<WithholdingResolution> {
  const cc = (marketCode || "").trim().toUpperCase();
  sweep();
  const cached = CACHE.get(cc);
  if (cached) return cached;

  const rows = await fetchWithholdingRules(cc);
  const pending = rows.filter((r) => r.legal_review_status === "pending");
  const approved = rows.filter((r) => r.legal_review_status === "approved");

  let status: WithholdingResolutionStatus;
  let message: string;
  if (approved.length > 0) {
    status = "approved";
    message =
      `${approved.length} approved settlement/withholding rule(s) for ` +
      `${cc}; each carries its official citation.`;
  } else if (pending.length > 0) {
    status = "pending_only";
    message =
      `${pending.length} settlement/withholding rule(s) exist for ${cc} but ` +
      "are pending legal review: they are shown for information only and " +
      "never computed. No deduction is applied until review approves them.";
  } else {
    status = "none";
    message =
      `No settlement/withholding rule is on file for ${cc}. ` +
      "None is invented; confirm requirements with a local professional.";
  }
  const res: WithholdingResolution = {
    status,
    marketCode: cc,
    actionableRules: approved,
    pendingRules: pending,
    message,
  };
  CACHE.set(cc, res);
  return res;
}

export interface WithholdingComputation {
  rule: WithholdingRuleRow;
  gross: number;
  ratePct: number;
  withholdingAmount: number;
  net: number;
  citation: { title: string; url: string; publisher: string };
}

/**
 * Compute a withholding deduction. Only APPROVED rules with a verified
 * rate compute; anything else is an honest refusal (returns null + the
 * resolution so the caller can disclose it).
 */
export async function computeWithholding(
  marketCode: string,
  gross: number,
  ruleId?: string,
): Promise<{ resolution: WithholdingResolution; computation: WithholdingComputation | null }> {
  const resolution = await resolveWithholding(marketCode);
  if (resolution.status !== "approved") {
    return { resolution, computation: null };
  }
  const rule = ruleId
    ? resolution.actionableRules.find((r) => r.id === ruleId)
    : resolution.actionableRules[0];
  if (!rule) {
    return { resolution, computation: null };
  }
  if (rule.rate_pct === null || !Number.isFinite(gross) || gross < 0) {
    return { resolution, computation: null };
  }
  const ratePct = Number(rule.rate_pct);
  const withholdingAmount = Math.round(((gross * ratePct) / 100) * 100) / 100;
  return {
    resolution,
    computation: {
      rule,
      gross,
      ratePct,
      withholdingAmount,
      net: Math.round((gross - withholdingAmount) * 100) / 100,
      citation: {
        title: rule.citation_title,
        url: rule.citation_url,
        publisher: rule.citation_publisher,
      },
    },
  };
}

/** Test hook. */
export function __clearWithholdingCache(): void {
  CACHE.clear();
}
