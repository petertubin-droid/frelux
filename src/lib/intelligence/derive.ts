/**
 * Construction intelligence: derived numbers.
 *
 * Pure functions only. Anything a person could argue about — what counts as an
 * overrun, when a milestone is late, which alerts fire, which lens a user sees —
 * is decided here and covered by tests, so the page cannot disagree with the
 * database.
 */

import type { ProjectRole } from "@/lib/diaspora/permissions";
import type {
  AlertItem,
  ApprovalItem,
  BoqRow,
  CostComparison,
  MilestoneItem,
  Persona,
  ProjectCard,
  RevisionRow,
  Section,
} from "./types";
import { PERSONA_SECTIONS } from "./types";

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function percentChange(
  current: number,
  previous: number | null,
): number {
  if (previous === null || previous === undefined || previous === 0) return 0;
  return round2(((current - previous) / previous) * 100);
}

export interface ProjectInput {
  id: string;
  name: string;
  role: ProjectRole | null;
  status: string | null;
  currency: string | null;
  progress: number | null;
  budget: number | null;
  materials: number | null;
  labour: number | null;
  transport: number | null;
  misc: number | null;
  markup: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface SpendInput {
  project_id: string;
  amount: number;
  status: string | null;
}

const APPROVED = new Set(["approved", "paid"]);
const PENDING = new Set(["pending", "submitted", "awaiting_approval"]);

/** Materials, labour, transport, misc and markup, as the project stores them. */
export function projectEstimate(input: ProjectInput): number {
  return round2(
    (input.materials ?? 0) +
      (input.labour ?? 0) +
      (input.transport ?? 0) +
      (input.misc ?? 0) +
      (input.markup ?? 0),
  );
}

/**
 * A project card. `remaining` is measured against the agreed budget when there
 * is one, otherwise against the estimate, and it can go negative — an overrun is
 * the honest answer, not a floor at zero.
 */
export function buildProjectCard(
  input: ProjectInput,
  spends: SpendInput[],
): ProjectCard {
  const estimate = projectEstimate(input);
  const mine = spends.filter((s) => s.project_id === input.id);
  const approvedSpend = round2(
    mine
      .filter((s) => APPROVED.has((s.status ?? "").toLowerCase()))
      .reduce((sum, s) => sum + s.amount, 0),
  );
  const pendingSpend = round2(
    mine
      .filter((s) => PENDING.has((s.status ?? "").toLowerCase()))
      .reduce((sum, s) => sum + s.amount, 0),
  );
  const ceiling = input.budget && input.budget > 0 ? input.budget : estimate;
  const remaining = round2(ceiling - approvedSpend);
  return {
    id: input.id,
    name: input.name,
    role: input.role,
    status: input.status,
    currency: input.currency ?? "NGN",
    progress: Math.max(0, Math.min(100, input.progress ?? 0)),
    budget: input.budget,
    estimate,
    approvedSpend,
    pendingSpend,
    remaining,
    overrun: remaining < 0 ? round2(Math.abs(remaining)) : 0,
    pendingApprovals: mine.filter((s) =>
      PENDING.has((s.status ?? "").toLowerCase()),
    ).length,
    startDate: input.startDate,
    endDate: input.endDate,
  };
}

export interface PortfolioTotalsShape {
  activeProjects: number;
  estimatedTotal: number;
  approvedSpend: number;
  pendingSpend: number;
  remainingBudget: number;
  overrunTotal: number;
  currency: string;
  mixedCurrency: boolean;
}

/**
 * Portfolio totals. Summing naira and dollars into one number would be a lie, so
 * a mixed-currency portfolio reports the dominant currency's figures and sets
 * `mixedCurrency` for the page to disclose.
 */
export function summarisePortfolio(cards: ProjectCard[]): PortfolioTotalsShape {
  const active = cards.filter(
    (c) => (c.status ?? "active") !== "completed" && c.status !== "archived",
  );
  const byCurrency = new Map<string, ProjectCard[]>();
  for (const card of active) {
    byCurrency.set(card.currency, [
      ...(byCurrency.get(card.currency) ?? []),
      card,
    ]);
  }
  const [currency, group] = [...byCurrency.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )[0] ?? ["NGN", [] as ProjectCard[]];
  const sum = (pick: (c: ProjectCard) => number) =>
    round2(group.reduce((total, card) => total + pick(card), 0));
  return {
    activeProjects: active.length,
    estimatedTotal: sum((c) => c.estimate),
    approvedSpend: sum((c) => c.approvedSpend),
    pendingSpend: sum((c) => c.pendingSpend),
    remainingBudget: sum((c) => c.remaining),
    overrunTotal: sum((c) => c.overrun),
    currency: active.length ? currency : "NGN",
    mixedCurrency: byCurrency.size > 1,
  };
}

/**
 * Original estimate vs the latest revision vs money actually spent. Revisions
 * are ordered by their own revision number; nothing is averaged or overwritten.
 */
export function compareCosts(
  card: ProjectCard,
  revisions: RevisionRow[],
): CostComparison {
  const mine = revisions
    .filter((r) => r.projectId === card.id)
    .sort((a, b) => a.revisionNo - b.revisionNo);
  const originalTotal = mine.length ? mine[0].total : card.estimate;
  const latestTotal = mine.length ? mine[mine.length - 1].total : card.estimate;
  return {
    projectId: card.id,
    projectName: card.name,
    currency: card.currency,
    originalTotal,
    latestTotal,
    actualSpend: card.approvedSpend,
    estimateDrift: round2(latestTotal - originalTotal),
    unspentAgainstLatest: round2(latestTotal - card.approvedSpend),
    overrun:
      latestTotal > 0 && card.approvedSpend > latestTotal
        ? round2(card.approvedSpend - latestTotal)
        : 0,
    revisionCount: mine.length,
  };
}

/** A milestone is late when it is unfinished and its project end date has passed. */
export function isMilestoneDelayed(
  status: string,
  projectEndDate: string | null,
  today = new Date(),
): boolean {
  const done = ["approved", "completed"].includes(status.toLowerCase());
  if (done) return false;
  if (!projectEndDate) return false;
  const end = new Date(projectEndDate);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < today.getTime();
}

export function milestoneProgress(items: MilestoneItem[]): number {
  if (!items.length) return 0;
  const done = items.filter((m) =>
    ["approved", "completed"].includes(m.status.toLowerCase()),
  ).length;
  return Math.round((done / items.length) * 100);
}

/** Approvals someone is entitled to act on, so the list is an invitation to act. */
export function approvalsForRole(
  items: ApprovalItem[],
  role: ProjectRole | null,
  isAdmin: boolean,
): ApprovalItem[] {
  if (isAdmin) return items;
  if (!role) return [];
  if (role === "owner") return items;
  if (role === "inspector") return items.filter((i) => i.kind === "milestone");
  return [];
}

export interface AlertInput {
  cards: ProjectCard[];
  comparisons: CostComparison[];
  milestones: MilestoneItem[];
  approvals: ApprovalItem[];
  priceMoves: {
    materialName: string;
    changePct: number;
    city: string | null;
    materialSlug: string;
  }[];
  reportsCount: number;
  procurementPending: number;
  threshold: number;
  canApprove: boolean;
}

/**
 * Alerts are derived, never stored: a price move, an overrun or a late milestone
 * stops being an alert the moment the underlying record changes. Each carries
 * the link that lets someone act on it.
 */
export function deriveAlerts(input: AlertInput): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const move of input.priceMoves) {
    if (Math.abs(move.changePct) < input.threshold) continue;
    const up = move.changePct > 0;
    alerts.push({
      key: `price:${move.materialSlug}:${move.city ?? "all"}`,
      kind: "price",
      severity:
        Math.abs(move.changePct) >= input.threshold * 2 ? "warning" : "info",
      title: `${move.materialName} ${up ? "up" : "down"} ${Math.abs(move.changePct).toFixed(1)}%`,
      detail: `${move.city ? `${move.city} market` : "Market index"} moved beyond your ${input.threshold}% threshold.`,
      href: `/price-index?material=${encodeURIComponent(move.materialSlug)}`,
    });
  }

  for (const card of input.cards) {
    if (card.overrun > 0) {
      alerts.push({
        key: `budget:${card.id}`,
        kind: "budget",
        severity: "critical",
        title: `${card.name} is over budget`,
        detail: `Approved spending exceeds the budget by ${card.overrun.toLocaleString()} ${card.currency}.`,
        href: `/site-tracker/${card.id}`,
      });
    }
  }

  if (input.canApprove) {
    const money = input.approvals.filter((a) => a.kind === "expense");
    if (money.length) {
      alerts.push({
        key: "approvals:expenses",
        kind: "approval",
        severity: "warning",
        title: `${money.length} expense${money.length === 1 ? "" : "s"} awaiting your approval`,
        detail: "Nothing is counted as spent until you approve it.",
        href: "/site-tracker",
      });
    }
  }

  const late = input.milestones.filter((m) => m.delayed);
  if (late.length) {
    alerts.push({
      key: "milestones:late",
      kind: "milestone",
      severity: "warning",
      title: `${late.length} milestone${late.length === 1 ? "" : "s"} past the project end date`,
      detail: late
        .map((m) => `${m.projectName}: ${m.stageName}`)
        .slice(0, 3)
        .join(", "),
      href: "/site-tracker",
    });
  }

  if (input.reportsCount > 0) {
    alerts.push({
      key: "reports:recent",
      kind: "report",
      severity: "info",
      title: `${input.reportsCount} new site report${input.reportsCount === 1 ? "" : "s"}`,
      detail: "Daily reports submitted by the site team since your last visit.",
      href: "/site-tracker",
    });
  }

  if (input.procurementPending > 0) {
    alerts.push({
      key: "procurement:open",
      kind: "procurement",
      severity: "info",
      title: `${input.procurementPending} procurement action${input.procurementPending === 1 ? "" : "s"} open`,
      detail:
        "Quotations waiting on your decision, or orders awaiting delivery confirmation.",
      href: "/procurement",
    });
  }

  const order = { critical: 0, warning: 1, info: 2 } as const;
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export interface PersonaInput {
  isAdmin: boolean;
  hasSupplierProfile: boolean;
  projectRoles: ProjectRole[];
  hasEstimatesOrBoq: boolean;
}

/**
 * The lenses a person actually holds. A supplier who also owns a build sees
 * both, and can switch; nobody gets a lens their data does not support.
 */
export function resolvePersonas(input: PersonaInput): Persona[] {
  const lenses: Persona[] = [];
  if (input.isAdmin) lenses.push("enterprise_admin");
  if (input.hasSupplierProfile) lenses.push("supplier");
  const roles = new Set(input.projectRoles);
  if (roles.has("owner")) lenses.push("homeowner");
  if (roles.has("contractor")) lenses.push("contractor");
  if (roles.has("site_manager")) lenses.push("site_manager");
  if (roles.has("inspector")) lenses.push("engineer");
  if (input.hasEstimatesOrBoq && !lenses.includes("quantity_surveyor"))
    lenses.push("quantity_surveyor");
  if (!lenses.length) lenses.push("homeowner");
  return lenses;
}

export function primaryPersona(lenses: Persona[]): Persona {
  const priority: Persona[] = [
    "enterprise_admin",
    "supplier",
    "site_manager",
    "contractor",
    "homeowner",
    "engineer",
    "quantity_surveyor",
  ];
  return priority.find((p) => lenses.includes(p)) ?? "homeowner";
}

/** Sections a lens may open. Filtering happens here, not in the page markup. */
export function sectionsFor(persona: Persona): Section[] {
  return PERSONA_SECTIONS[persona] ?? PERSONA_SECTIONS.homeowner;
}

/** "3 days ago" style age, in days, for report and milestone freshness. */
export function daysSince(
  iso: string | null,
  today = new Date(),
): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((today.getTime() - then.getTime()) / 86_400_000);
}

/** Upcoming milestones: unfinished, soonest project end date first. */
export function upcomingMilestones(
  items: MilestoneItem[],
  limit = 6,
): MilestoneItem[] {
  return [...items]
    .filter((m) => !["approved", "completed"].includes(m.status.toLowerCase()))
    .sort((a, b) =>
      a.delayed === b.delayed
        ? a.stageName.localeCompare(b.stageName)
        : a.delayed
          ? -1
          : 1,
    )
    .slice(0, limit);
}

/** The last few BOQ documents, newest edit first. */
export function recentBoqDocs(rows: BoqRow[], limit = 5): BoqRow[] {
  return [...rows]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, limit);
}
