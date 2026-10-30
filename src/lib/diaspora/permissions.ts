/**
 * Diaspora tracker: roles, permissions and budget arithmetic.
 *
 * Pure functions only, so the rules that decide who may spend, approve or
 * verify can be tested without a browser or a database. The same matrix is
 * mirrored by row level security in the database; this layer decides what the
 * interface offers, the database decides what is actually allowed.
 */

export type ProjectRole = "owner" | "site_manager" | "contractor" | "inspector";

export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Project owner",
  site_manager: "Site manager",
  contractor: "Contractor",
  inspector: "Inspector",
};

export type Permission =
  | "view_project"
  | "invite_participants"
  | "manage_permissions"
  | "submit_daily_report"
  | "record_materials"
  | "submit_expense"
  | "approve_expense"
  | "upload_photos"
  | "update_milestone"
  | "decide_milestone"
  | "submit_inspection"
  | "upload_invoice"
  | "rotate_invitation";

const MATRIX: Record<Permission, ProjectRole[]> = {
  view_project: ["owner", "site_manager", "contractor", "inspector"],
  invite_participants: ["owner"],
  manage_permissions: ["owner"],
  submit_daily_report: ["owner", "site_manager"],
  record_materials: ["owner", "site_manager", "contractor"],
  submit_expense: ["owner", "site_manager", "contractor"],
  approve_expense: ["owner"],
  upload_photos: ["owner", "site_manager", "contractor", "inspector"],
  update_milestone: ["owner", "site_manager"],
  decide_milestone: ["owner", "inspector"],
  submit_inspection: ["owner", "inspector"],
  upload_invoice: ["owner", "contractor"],
  rotate_invitation: ["owner"],
};

export function can(role: ProjectRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[permission].includes(role);
}

/** Reasons shown when an action is unavailable, so the gap is explained. */
export const DENIAL_REASONS: Partial<Record<Permission, string>> = {
  approve_expense: "Only the project owner can approve expenditure.",
  decide_milestone: "Only the owner or an inspector can approve or dispute a milestone.",
  invite_participants: "Only the project owner can invite participants.",
  manage_permissions: "Only the project owner can change access.",
  submit_daily_report: "Daily reports are submitted by the site manager.",
  update_milestone: "Milestones are updated by the site manager.",
};

export type ExpenseStatus = "submitted" | "approved" | "rejected";

export interface ExpenseRecord {
  id: string;
  category: string;
  name: string;
  amount: number;
  currency: string;
  spent_at: string;
  status: ExpenseStatus;
  receipt_path: string | null;
  recipient: string | null;
  decision_note: string | null;
}

export interface BudgetSummary {
  currency: string;
  /** The budget the owner set, never altered by expenditure. */
  budget: number | null;
  approved: number;
  pending: number;
  remaining: number | null;
  /** approved + pending against budget; negative means over. */
  variance: number | null;
  variance_percent: number | null;
  /** Approved spend as a share of budget, for a progress bar. */
  committed_percent: number;
  by_stage: { category: string; approved: number; pending: number }[];
  /** Expenses in a different currency, which are listed but not summed. */
  excluded_currencies: string[];
}

/**
 * Budget position.
 *
 * Deliberately conservative: only approved expenditure reduces the remaining
 * budget, pending spend is reported separately so an owner can see the
 * commitment it represents, and a second currency is never silently converted
 * at an invented exchange rate.
 */
export function summariseBudget(
  budget: number | null,
  expenses: ExpenseRecord[],
  currency = "NGN",
): BudgetSummary {
  const sameCurrency = expenses.filter((e) => (e.currency || currency) === currency);
  const others = Array.from(
    new Set(
      expenses
        .filter((e) => (e.currency || currency) !== currency)
        .map((e) => e.currency),
    ),
  );

  const approved = sameCurrency
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const pending = sameCurrency
    .filter((e) => e.status === "submitted")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const remaining = budget == null ? null : round(budget - approved);
  const variance = budget == null ? null : round(budget - approved - pending);

  const byCategory = new Map<string, { approved: number; pending: number }>();
  for (const e of sameCurrency) {
    const key = e.category || "Other";
    const entry = byCategory.get(key) ?? { approved: 0, pending: 0 };
    if (e.status === "approved") entry.approved = round(entry.approved + Number(e.amount || 0));
    if (e.status === "submitted") entry.pending = round(entry.pending + Number(e.amount || 0));
    byCategory.set(key, entry);
  }

  return {
    currency,
    budget,
    approved: round(approved),
    pending: round(pending),
    remaining,
    variance,
    variance_percent:
      budget && budget > 0 ? round(((variance ?? 0) / budget) * 100, 1) : null,
    committed_percent:
      budget && budget > 0 ? Math.min(100, round((approved / budget) * 100, 1)) : 0,
    by_stage: Array.from(byCategory.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.approved + b.pending - (a.approved + a.pending)),
    excluded_currencies: others,
  };
}

export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Delivery shortfall, reported rather than corrected silently. */
export function deliveryDiscrepancy(d: {
  quantity_ordered: number;
  quantity_delivered: number;
  quantity_accepted: number;
}): { shortfall: number; rejected: number; has_issue: boolean } {
  const shortfall = round(Math.max(0, d.quantity_ordered - d.quantity_delivered));
  const rejected = round(Math.max(0, d.quantity_delivered - d.quantity_accepted));
  return { shortfall, rejected, has_issue: shortfall > 0 || rejected > 0 };
}

export function formatMoney(amount: number | null, currency = "NGN"): string {
  if (amount == null) return "Not set";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
