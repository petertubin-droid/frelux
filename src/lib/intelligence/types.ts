/**
 * Construction intelligence: shared types.
 *
 * The dashboard composes seven existing systems. Every number below is either
 * read straight from a source of record or derived in `derive.ts`, so the page
 * itself never does arithmetic and never invents a figure.
 */

import type { ProjectRole } from "@/lib/diaspora/permissions";

/** The lens a person sees the workspace through. */
export type Persona =
  | "homeowner"
  | "contractor"
  | "site_manager"
  | "quantity_surveyor"
  | "engineer"
  | "supplier"
  | "enterprise_admin";

export const PERSONA_LABELS: Record<Persona, string> = {
  homeowner: "Homeowner",
  contractor: "Contractor",
  site_manager: "Site manager",
  quantity_surveyor: "Quantity surveyor",
  engineer: "Engineer",
  supplier: "Supplier",
  enterprise_admin: "Enterprise administrator",
};

export type Section =
  "overview" | "prices" | "costs" | "progress" | "boq" | "suppliers" | "alerts";

/** Which sections each persona opens on, in reading order. */
export const PERSONA_SECTIONS: Record<Persona, Section[]> = {
  homeowner: ["overview", "costs", "progress", "boq", "alerts"],
  contractor: ["overview", "costs", "progress", "suppliers", "boq"],
  site_manager: ["overview", "progress", "costs", "alerts"],
  quantity_surveyor: ["overview", "costs", "boq", "prices"],
  engineer: ["overview", "progress", "prices", "costs"],
  supplier: ["overview", "suppliers", "prices", "alerts"],
  enterprise_admin: [
    "overview",
    "prices",
    "costs",
    "progress",
    "boq",
    "suppliers",
    "alerts",
  ],
};

export interface PriceMove {
  materialSlug: string;
  materialName: string;
  category: string | null;
  unit: string;
  city: string | null;
  marketCode: string;
  currentPrice: number;
  previousPrice: number | null;
  changePct: number;
  currency: string;
  observedAt: string | null;
  /** Where the price came from and how far it has been verified. */
  source: string;
  verification: string;
  supplierCount: number;
}

export interface CityPrice {
  city: string;
  marketCode: string;
  currency: string;
  /** Median of the city's most recent price per material — never a single shop. */
  medianPrice: number;
  materialCount: number;
  changePct: number;
  observedAt: string | null;
  verification: string;
}

export interface PriceBoard {
  indexName: string;
  materialCount: number;
  moves: PriceMove[];
  cities: CityPrice[];
  lastApprovedAt: string | null;
  pendingSubmissions: number;
  note: string;
}

export interface ProjectCard {
  id: string;
  name: string;
  role: ProjectRole | null;
  status: string | null;
  currency: string;
  progress: number;
  /** Budget agreed at the start of the project. */
  budget: number | null;
  /** Materials + labour + transport + misc from the project record. */
  estimate: number;
  approvedSpend: number;
  pendingSpend: number;
  /** Committed money still unspent, against the agreed budget. */
  remaining: number;
  overrun: number;
  pendingApprovals: number;
  startDate: string | null;
  endDate: string | null;
}

export interface PortfolioTotals {
  activeProjects: number;
  estimatedTotal: number;
  approvedSpend: number;
  pendingSpend: number;
  remainingBudget: number;
  overrunTotal: number;
  currency: string;
  /** True when projects span several currencies, so totals are per-currency only. */
  mixedCurrency: boolean;
}

export interface RevisionRow {
  id: string;
  projectId: string;
  projectName: string;
  revisionNo: number;
  label: string;
  source: string;
  total: number;
  currency: string;
  note: string | null;
  createdAt: string;
}

export interface CostComparison {
  projectId: string;
  projectName: string;
  currency: string;
  originalTotal: number | null;
  latestTotal: number | null;
  actualSpend: number;
  estimateDrift: number;
  unspentAgainstLatest: number;
  overrun: number;
  revisionCount: number;
}

export interface ApprovalItem {
  id: string;
  kind: "expense" | "milestone";
  projectId: string;
  projectName: string;
  title: string;
  amount: number | null;
  currency: string;
  submittedBy: string | null;
  submittedAt: string | null;
  /** The permission that would clear it, for the audit trail. */
  requiredRole: string;
}

export interface MilestoneItem {
  id: string;
  projectId: string;
  projectName: string;
  stageName: string;
  status: string;
  progressPct: number;
  decisionNote: string | null;
  updatedAt: string | null;
  delayed: boolean;
}

export interface SiteReportItem {
  id: string;
  projectId: string;
  projectName: string;
  logDate: string | null;
  workPerformed: string | null;
  workersCount: number | null;
  weather: string | null;
  status: string;
  createdAt: string;
}

export interface DeliveryItem {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  quantityOrdered: number;
  quantityAccepted: number;
  unit: string;
  supplier: string | null;
  deliveryDate: string | null;
  discrepancy: number;
}

export interface BoqRow {
  id: string;
  title: string;
  quoteRef: string;
  status: string;
  revision: number;
  currency: string;
  total: number;
  marketCode: string | null;
  updatedAt: string;
}

export interface SupplierPulse {
  savedSuppliers: number;
  openRequests: number;
  awaitingQuotes: number;
  quotesReceived: number;
  activeOrders: number;
  deliveredOrders: number;
  recentQuotes: {
    id: string;
    requestTitle: string;
    supplierName: string;
    total: number;
    currency: string;
    leadTimeDays: number | null;
  }[];
  orders: {
    id: string;
    reference: string;
    supplierName: string | null;
    total: number;
    currency: string;
    status: string;
    expectedDelivery: string | null;
  }[];
}

export interface AlertItem {
  key: string;
  kind:
    "price" | "budget" | "approval" | "milestone" | "report" | "procurement";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  href: string | null;
}

export interface AdminAnalytics {
  users: { total: number; newThisMonth: number };
  projects: { active: number; total: number; tracked: number };
  priceContributions: { pending: number; approved: number; rejected: number };
  suppliers: {
    total: number;
    verified: number;
    pendingVerification: number;
    activeListings: number;
  };
  marketplace: {
    requests: number;
    quotes: number;
    orders: number;
    awardedValue: number;
    currency: string;
  };
  subscriptions: { plan: string; suppliers: number }[];
  featureUsage: { report: string; runs: number }[];
  growth: { month: string; users: number }[];
}

export interface NotificationPreferences {
  market_code: string;
  price_alerts: boolean;
  budget_alerts: boolean;
  approval_alerts: boolean;
  milestone_alerts: boolean;
  report_alerts: boolean;
  procurement_alerts: boolean;
  price_move_threshold: number;
  digest_frequency: "instant" | "daily" | "weekly" | "off";
}

export interface IntelligenceSnapshot {
  generatedAt: string;
  userId: string;
  personas: Persona[];
  primaryPersona: Persona;
  isAdmin: boolean;
  currency: string;
  totals: PortfolioTotals;
  projects: ProjectCard[];
  comparisons: CostComparison[];
  revisions: RevisionRow[];
  approvals: ApprovalItem[];
  milestones: MilestoneItem[];
  reports: SiteReportItem[];
  deliveries: DeliveryItem[];
  boq: BoqRow[];
  prices: PriceBoard;
  suppliers: SupplierPulse;
  preferences: NotificationPreferences;
  alerts: AlertItem[];
  admin: AdminAnalytics | null;
  /** Sources that failed to load, so the page can say so instead of showing zero. */
  degraded: string[];
}
