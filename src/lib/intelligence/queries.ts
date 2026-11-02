/**
 * Construction intelligence: one snapshot, assembled from the systems that
 * already own the data.
 *
 * Nothing here writes project, expense, price or supplier records — those keep
 * living in the diaspora tracker, the price index, the BOQ studio and the
 * marketplace. This module reads them under the caller's own RLS session,
 * derives the money arithmetic in `derive.ts`, and reports which sources failed
 * instead of pretending an empty list is the truth.
 */

import { supabase } from "@/lib/supabase";
import { fetchMyTrackedProjects } from "@/lib/diaspora/queries";
import type { ProjectRole } from "@/lib/diaspora/permissions";
import {
  fetchListings,
  fetchPendingSubmissions,
} from "@/lib/price-index/queries";
import { fetchDocuments } from "@/lib/boq/queries";
import { fetchMyRequests, fetchOrders } from "@/lib/suppliers/procurement";
import { fetchSavedSupplierIds } from "@/lib/suppliers/queries";
import type { MaterialOrder, MaterialRequest } from "@/lib/suppliers/types";
import {
  buildProjectCard,
  compareCosts,
  deriveAlerts,
  isMilestoneDelayed,
  percentChange,
  primaryPersona,
  resolvePersonas,
  round2,
  summarisePortfolio,
} from "./derive";
import type {
  AdminAnalytics,
  AlertItem,
  ApprovalItem,
  BoqRow,
  CityPrice,
  CostComparison,
  DeliveryItem,
  IntelligenceSnapshot,
  MilestoneItem,
  NotificationPreferences,
  Persona,
  PriceBoard,
  PriceMove,
  ProjectCard,
  RevisionRow,
  SiteReportItem,
  SupplierPulse,
} from "./types";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; snapshot: IntelligenceSnapshot }>();

export function invalidateIntelligenceCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  market_code: "NG",
  price_alerts: true,
  budget_alerts: true,
  approval_alerts: true,
  milestone_alerts: true,
  report_alerts: true,
  procurement_alerts: true,
  price_move_threshold: 5,
  digest_frequency: "instant",
};

type Row = Record<string, unknown>;

const num = (value: unknown): number =>
  value === null || value === undefined ? 0 : Number(value);
const text = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

/** In-list reads, chunked so a large portfolio does not build a giant URL. */
async function readIn(
  table: string,
  columns: string,
  ids: string[],
  order?: { column: string },
): Promise<Row[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return [];
  const out: Row[] = [];
  for (let i = 0; i < unique.length; i += 25) {
    let query = supabase
      .from(table)
      .select(columns)
      .in("project_id", unique.slice(i, i + 25));
    if (order) query = query.order(order.column, { ascending: false });
    const { data } = await query;
    out.push(...((data ?? []) as unknown as Row[]));
  }
  return out;
}

interface PriceListing {
  name: string;
  slug?: string | null;
  category?: string | null;
  city_slug: string | null;
  price: number;
  currency: string;
  effective_date: string | null;
  verification_status: string | null;
  supporting_submissions: number;
  price_source: string | null;
  supplier_name: string | null;
}

/**
 * Per material: the newest observation is the current price, the most recent
 * observation at a different price is what it moved from. When nothing differs,
 * the movement is reported as zero rather than invented.
 */
export function movementsFromListings(listings: PriceListing[]): PriceMove[] {
  const byMaterial = new Map<string, PriceListing[]>();
  for (const listing of listings) {
    if (!Number.isFinite(listing.price) || listing.price <= 0) continue;
    const key = listing.slug || listing.name;
    byMaterial.set(key, [...(byMaterial.get(key) ?? []), listing]);
  }

  const moves: PriceMove[] = [];
  for (const [key, rows] of byMaterial) {
    const sorted = [...rows].sort(
      (a, b) =>
        new Date(b.effective_date ?? 0).getTime() -
        new Date(a.effective_date ?? 0).getTime(),
    );
    const current = sorted[0];
    const previous = sorted.find((row) => row.price !== current.price) ?? null;
    moves.push({
      materialSlug: key,
      materialName: current.name,
      category: current.category ?? null,
      unit: "unit",
      city: current.city_slug,
      marketCode: "NG",
      currentPrice: round2(current.price),
      previousPrice: previous ? round2(previous.price) : null,
      changePct: percentChange(current.price, previous?.price ?? null),
      currency: current.currency || "NGN",
      observedAt: current.effective_date,
      source:
        current.price_source ||
        current.supplier_name ||
        "FRELUX price submissions",
      verification: current.verification_status || "unverified",
      supplierCount: Math.max(1, current.supporting_submissions || 0),
    });
  }
  return moves;
}

/** One row per city: median of that city's latest price per material. */
export function cityBoard(moves: PriceMove[]): CityPrice[] {
  const byCity = new Map<string, PriceMove[]>();
  for (const move of moves) {
    if (!move.city) continue;
    byCity.set(move.city, [...(byCity.get(move.city) ?? []), move]);
  }
  return [...byCity.entries()]
    .map(([city, rows]) => {
      const prices = rows.map((r) => r.currentPrice).sort((a, b) => a - b);
      const median = prices.length
        ? prices.length % 2
          ? prices[(prices.length - 1) / 2]
          : round2(
              (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2,
            )
        : 0;
      const changes = rows
        .filter((r) => r.previousPrice !== null)
        .map((r) => r.changePct);
      const verified = rows.some((r) =>
        ["verified", "platform_verified", "approved"].includes(
          r.verification.toLowerCase(),
        ),
      );
      return {
        city,
        marketCode: rows[0].marketCode,
        currency: rows[0].currency,
        medianPrice: round2(median),
        materialCount: rows.length,
        changePct: changes.length
          ? round2(changes.reduce((a, b) => a + b, 0) / changes.length)
          : 0,
        observedAt:
          rows
            .map((r) => r.observedAt)
            .filter((d): d is string => Boolean(d))
            .sort()
            .pop() ?? null,
        verification: verified ? "verified" : "mixed",
      };
    })
    .sort((a, b) => b.materialCount - a.materialCount);
}

async function loadPriceBoard(degraded: string[]): Promise<PriceBoard> {
  const { listings, error } = await fetchListings({ limit: 400 });
  if (error) degraded.push(`price index (${error})`);

  const shaped: PriceListing[] = (listings as unknown as Row[]).map((row) => ({
    name: String(row.name ?? "Material"),
    slug: text(row.slug),
    category: text(row.category),
    city_slug: text(row.city_slug),
    price: num(row.price),
    currency: String(row.currency ?? "NGN"),
    effective_date: text(row.effective_date),
    verification_status: text(row.verification_status),
    supporting_submissions: num(row.supporting_submissions),
    price_source: text(row.price_source),
    supplier_name: text(row.supplier_name),
  }));

  const pendingResult = await fetchPendingSubmissions();
  if (pendingResult.error)
    degraded.push(`price submissions (${pendingResult.error})`);

  const moves = movementsFromListings(shaped).sort(
    (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct),
  );

  return {
    indexName: "FRELUX Material Price Index",
    materialCount: new Set(moves.map((m) => m.materialSlug)).size,
    moves: moves.slice(0, 24),
    cities: cityBoard(moves).slice(0, 12),
    lastApprovedAt:
      shaped
        .map((row) => row.effective_date)
        .filter((d): d is string => Boolean(d))
        .sort()
        .pop() ?? null,
    pendingSubmissions: pendingResult.rows?.length ?? 0,
    note: "Prices come from supplier submissions and verified observations. Every price is shown with its source, verification level and observation date — none of them is a guarantee.",
  };
}

async function loadSupplierPulse(
  userId: string,
  degraded: string[],
): Promise<SupplierPulse> {
  const [savedResult, requestsResult, ordersResult] = await Promise.all([
    fetchSavedSupplierIds(userId),
    fetchMyRequests(userId),
    fetchOrders(userId, "buyer"),
  ]);
  if (savedResult.error)
    degraded.push(`saved suppliers (${savedResult.error})`);
  if (requestsResult.error) degraded.push(`requests (${requestsResult.error})`);
  if (ordersResult.error) degraded.push(`orders (${ordersResult.error})`);

  const requests = (requestsResult.requests ?? []) as MaterialRequest[];
  const orders = (ordersResult.orders ?? []) as MaterialOrder[];
  const requestIds = requests.map((r) => r.id);

  let quotes: Row[] = [];
  if (requestIds.length) {
    const { data, error } = await supabase
      .from("material_request_quotes")
      .select(
        "id,request_id,supplier_id,total,currency,lead_time_days,created_at",
      )
      .in("request_id", requestIds)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) degraded.push(`quotations (${error.message})`);
    quotes = (data ?? []) as Row[];
  }

  const supplierIds = Array.from(
    new Set([
      ...quotes.map((q) => String(q.supplier_id)),
      ...orders.map((o) => o.supplier_id),
    ]),
  );
  let supplierNames = new Map<string, string>();
  if (supplierIds.length) {
    const { data } = await supabase
      .from("supplier_profiles")
      .select("id,company_name")
      .in("id", supplierIds);
    supplierNames = new Map(
      ((data ?? []) as Row[]).map((row) => [
        String(row.id),
        String(row.company_name),
      ]),
    );
  }

  const titles = new Map(requests.map((r) => [r.id, r.title]));
  const activeStatuses = new Set(["placed", "confirmed", "dispatched"]);

  return {
    savedSuppliers: savedResult.ids.length,
    openRequests: requests.filter((r) => ["open", "quoted"].includes(r.status))
      .length,
    awaitingQuotes: requests.filter((r) => r.status === "open").length,
    quotesReceived: quotes.length,
    activeOrders: orders.filter((o) => activeStatuses.has(o.status)).length,
    deliveredOrders: orders.filter((o) =>
      ["delivered", "completed"].includes(o.status),
    ).length,
    recentQuotes: quotes.slice(0, 6).map((q) => ({
      id: String(q.id),
      requestTitle: titles.get(String(q.request_id)) ?? "Material request",
      supplierName: supplierNames.get(String(q.supplier_id)) ?? "Supplier",
      total: num(q.total),
      currency: String(q.currency ?? "NGN"),
      leadTimeDays:
        q.lead_time_days === null || q.lead_time_days === undefined
          ? null
          : num(q.lead_time_days),
    })),
    orders: orders.slice(0, 8).map((o) => ({
      id: o.id,
      reference: o.reference,
      supplierName: supplierNames.get(o.supplier_id) ?? null,
      total: num(o.total),
      currency: o.currency,
      status: o.status,
      expectedDelivery: o.expected_delivery ?? null,
    })),
  };
}

async function loadPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("intelligence_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_PREFERENCES };
  const row = data as Row;
  return {
    market_code: String(row.market_code ?? "NG"),
    price_alerts: Boolean(row.price_alerts),
    budget_alerts: Boolean(row.budget_alerts),
    approval_alerts: Boolean(row.approval_alerts),
    milestone_alerts: Boolean(row.milestone_alerts),
    report_alerts: Boolean(row.report_alerts),
    procurement_alerts: Boolean(row.procurement_alerts),
    price_move_threshold: num(row.price_move_threshold),
    digest_frequency:
      (row.digest_frequency as NotificationPreferences["digest_frequency"]) ??
      "instant",
  };
}

export async function savePreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("intelligence_preferences")
    .upsert({ user_id: userId, ...preferences }, { onConflict: "user_id" });
  invalidateIntelligenceCache(userId);
  return { error: error?.message ?? null };
}

/** Platform analytics. Counts only; no private project or financial detail. */
async function loadAdminAnalytics(
  degraded: string[],
): Promise<AdminAnalytics | null> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  interface Filterable {
    gte(column: string, value: string): Filterable;
    neq(column: string, value: string): Filterable;
    eq(column: string, value: string): Filterable;
  }

  const countRows = async (
    table: string,
    configure?: (builder: Filterable) => void,
  ): Promise<number> => {
    const builder = supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    if (configure) configure(builder as unknown as Filterable);
    const { count, error } = await (builder as unknown as PromiseLike<{
      count: number | null;
      error: { message: string } | null;
    }>);
    if (error) {
      degraded.push(`${table} (${error.message})`);
      return 0;
    }
    return count ?? 0;
  };

  const totalUsers = await countRows("profiles");
  const newUsers = await countRows("profiles", (q) =>
    q.gte("created_at", monthStart.toISOString()),
  );
  const totalProjects = await countRows("contractor_projects");
  const activeProjects = await countRows("contractor_projects", (q) =>
    q.neq("status", "completed"),
  );
  const suppliers = await countRows("supplier_profiles");
  const verifiedSuppliers = await countRows("supplier_profiles", (q) =>
    q.eq("is_verified", "true"),
  );
  const pendingPrice = await countRows("price_submissions", (q) =>
    q.eq("status", "pending"),
  );
  const requests = await countRows("material_requests");
  const quotes = await countRows("material_request_quotes");
  const orders = await countRows("material_orders");

  const { data: awarded } = await supabase
    .from("material_orders")
    .select("total")
    .neq("status", "cancelled")
    .limit(1000);
  const awardedValue = round2(
    ((awarded ?? []) as Row[]).reduce((sum, row) => sum + num(row.total), 0),
  );

  const { data: planRows } = await supabase
    .from("supplier_profiles")
    .select("subscription_plan,verification_level")
    .limit(1000);
  const planCounts = new Map<string, number>();
  let pendingVerification = 0;
  for (const row of (planRows ?? []) as Row[]) {
    const plan = String(row.subscription_plan ?? "free");
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
    if (String(row.verification_level ?? "unverified") === "unverified")
      pendingVerification += 1;
  }

  const activeListings = await countRows("supplier_inventory_items", (q) =>
    q.eq("status", "active"),
  );

  const { data: reportRuns } = await supabase
    .from("intelligence_report_runs")
    .select("report_type")
    .limit(1000);
  const usage = new Map<string, number>();
  for (const row of (reportRuns ?? []) as Row[]) {
    const key = String(row.report_type ?? "unknown");
    usage.set(key, (usage.get(key) ?? 0) + 1);
  }

  const { data: growthRows } = await supabase
    .from("profiles")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const monthly = new Map<string, number>();
  for (const row of (growthRows ?? []) as Row[]) {
    const created = text(row.created_at);
    if (!created) continue;
    const key = created.slice(0, 7);
    monthly.set(key, (monthly.get(key) ?? 0) + 1);
  }

  return {
    users: { total: totalUsers, newThisMonth: newUsers },
    projects: {
      active: activeProjects,
      total: totalProjects,
      tracked: totalProjects,
    },
    priceContributions: { pending: pendingPrice, approved: 0, rejected: 0 },
    suppliers: {
      total: suppliers,
      verified: verifiedSuppliers,
      pendingVerification,
      activeListings,
    },
    marketplace: { requests, quotes, orders, awardedValue, currency: "NGN" },
    subscriptions: [...planCounts.entries()].map(([plan, value]) => ({
      plan,
      suppliers: value,
    })),
    featureUsage: [...usage.entries()].map(([report, runs]) => ({
      report,
      runs,
    })),
    growth: [...monthly.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, users]) => ({ month, users })),
  };
}

export async function loadIntelligence(options?: {
  force?: boolean;
}): Promise<{ snapshot: IntelligenceSnapshot | null; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId)
    return {
      snapshot: null,
      error: "Sign in to open the intelligence dashboard.",
    };

  const cached = cache.get(userId);
  if (!options?.force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { snapshot: cached.snapshot, error: null };
  }

  const degraded: string[] = [];

  const [tracked, boqResult, priceBoard, supplierPulse, preferences] =
    await Promise.all([
      fetchMyTrackedProjects().catch(() => {
        degraded.push("projects (could not be read)");
        return [];
      }),
      fetchDocuments(userId),
      loadPriceBoard(degraded),
      loadSupplierPulse(userId, degraded),
      loadPreferences(userId),
    ]);
  if (boqResult.error) degraded.push(`BOQ documents (${boqResult.error})`);

  const projectIds = tracked.map((p) => p.id);

  const [
    costRows,
    expenseRows,
    stageRows,
    reportRows,
    deliveryRows,
    revisionRows,
  ] = await Promise.all([
    readIn(
      "contractor_projects",
      "id,total_material_cost,total_labour_cost,total_transport_cost,total_misc_cost,total_markup",
      projectIds,
    ),
    readIn(
      "project_expenses",
      "id,project_id,name,amount,status,spent_at,submitted_by",
      projectIds,
    ),
    readIn(
      "project_progress_stages",
      "id,project_id,stage_name,status,sort_order,is_completed,decision_note,submitted_at,updated_at",
      projectIds,
    ),
    readIn(
      "project_site_logs",
      "id,project_id,log_date,work_performed,workers_count,weather_condition,status,created_at",
      projectIds,
      { column: "created_at" },
    ),
    readIn(
      "project_material_deliveries",
      "id,project_id,description,unit,quantity_ordered,quantity_delivered,quantity_accepted,supplier,delivery_date",
      projectIds,
    ),
    readIn(
      "project_estimate_revisions",
      "id,project_id,revision_no,label,source,total,currency,note,created_at",
      projectIds,
    ),
  ]);

  const costs = new Map(costRows.map((row) => [String(row.id), row]));

  const projects: ProjectCard[] = tracked.map((project) =>
    buildProjectCard(
      {
        id: project.id,
        name: project.name,
        role: project.role as ProjectRole | null,
        status: project.status,
        currency: project.currency,
        progress: project.progress_percentage,
        budget: project.budget,
        materials: num(costs.get(project.id)?.total_material_cost),
        labour: num(costs.get(project.id)?.total_labour_cost),
        transport: num(costs.get(project.id)?.total_transport_cost),
        misc: num(costs.get(project.id)?.total_misc_cost),
        markup: num(costs.get(project.id)?.total_markup),
        startDate: project.start_date,
        endDate: project.end_date,
      },
      expenseRows.map((row) => ({
        project_id: String(row.project_id),
        amount: num(row.amount),
        status: text(row.status),
      })),
    ),
  );

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const projectRoles = tracked
    .map((p) => p.role)
    .filter((role): role is ProjectRole => Boolean(role));

  const revisions: RevisionRow[] = revisionRows
    .map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      projectName: projectNames.get(String(row.project_id)) ?? "Project",
      revisionNo: num(row.revision_no),
      label: String(row.label ?? "Revision"),
      source: String(row.source ?? "manual"),
      total: num(row.total),
      currency: String(row.currency ?? "NGN"),
      note: text(row.note),
      createdAt: String(row.created_at ?? ""),
    }))
    .sort((a, b) => a.revisionNo - b.revisionNo);

  const comparisons: CostComparison[] = projects.map((card) =>
    compareCosts(card, revisions),
  );

  const isPending = (value: unknown) =>
    ["pending", "submitted", "awaiting_approval"].includes(
      String(value ?? "").toLowerCase(),
    );

  const approvals: ApprovalItem[] = [
    ...expenseRows
      .filter((row) => isPending(row.status))
      .map((row) => ({
        id: String(row.id),
        kind: "expense" as const,
        projectId: String(row.project_id),
        projectName: projectNames.get(String(row.project_id)) ?? "Project",
        title: String(row.name ?? "Expense"),
        amount: num(row.amount),
        currency: "NGN",
        submittedBy: text(row.submitted_by),
        submittedAt: text(row.spent_at),
        requiredRole: "approve_expense",
      })),
    ...stageRows
      .filter((row) => isPending(row.status))
      .map((row) => ({
        id: String(row.id),
        kind: "milestone" as const,
        projectId: String(row.project_id),
        projectName: projectNames.get(String(row.project_id)) ?? "Project",
        title: String(row.stage_name ?? "Milestone"),
        amount: null,
        currency: "NGN",
        submittedBy: null,
        submittedAt: text(row.submitted_at),
        requiredRole: "decide_milestone",
      })),
  ];

  const endDates = new Map(projects.map((p) => [p.id, p.endDate]));
  const milestones: MilestoneItem[] = stageRows.map((row) => {
    const status = String(
      row.status ?? (row.is_completed ? "completed" : "pending"),
    );
    const done = ["approved", "completed"].includes(status.toLowerCase());
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      projectName: projectNames.get(String(row.project_id)) ?? "Project",
      stageName: String(row.stage_name ?? "Milestone"),
      status,
      progressPct: done ? 100 : 0,
      decisionNote: text(row.decision_note),
      updatedAt: text(row.updated_at),
      delayed: isMilestoneDelayed(
        status,
        endDates.get(String(row.project_id)) ?? null,
      ),
    };
  });

  const reports: SiteReportItem[] = reportRows.slice(0, 12).map((row) => ({
    id: String(row.id),
    projectId: String(row.project_id),
    projectName: projectNames.get(String(row.project_id)) ?? "Project",
    logDate: text(row.log_date),
    workPerformed: text(row.work_performed),
    workersCount: row.workers_count === null ? null : num(row.workers_count),
    weather: text(row.weather_condition),
    status: String(row.status ?? "submitted"),
    createdAt: String(row.created_at ?? ""),
  }));

  const deliveries: DeliveryItem[] = deliveryRows.slice(0, 12).map((row) => {
    const accepted =
      row.quantity_accepted === null || row.quantity_accepted === undefined
        ? num(row.quantity_delivered)
        : num(row.quantity_accepted);
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      projectName: projectNames.get(String(row.project_id)) ?? "Project",
      description: String(row.description ?? "Delivery"),
      quantityOrdered: num(row.quantity_ordered),
      quantityAccepted: accepted,
      unit: String(row.unit ?? "unit"),
      supplier: text(row.supplier),
      deliveryDate: text(row.delivery_date),
      discrepancy: round2(num(row.quantity_ordered) - accepted),
    };
  });

  const boq: BoqRow[] = (boqResult.documents ?? []).map((doc) => {
    const totals = ((doc.boq_document as unknown as Row | null)?.totals ??
      {}) as Record<string, unknown>;
    const grand = num(totals.grandTotal ?? totals.grand_total ?? totals.total);
    return {
      id: doc.id,
      title: doc.title,
      quoteRef: doc.quote_ref,
      status: doc.status,
      revision: doc.revision ?? 1,
      currency: doc.currency,
      total: round2(grand),
      marketCode: doc.market_code ?? null,
      updatedAt: doc.updated_at ?? doc.created_at ?? "",
    };
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = (profile as Row | null)?.role === "admin";

  const { data: supplierRow } = await supabase
    .from("supplier_profiles")
    .select("id,verification_level")
    .eq("user_id", userId)
    .maybeSingle();

  const personas: Persona[] = resolvePersonas({
    isAdmin,
    hasSupplierProfile: Boolean(supplierRow),
    projectRoles,
    hasEstimatesOrBoq: boq.length > 0,
  });

  const totals = summarisePortfolio(projects);
  const canApprove = isAdmin || projectRoles.includes("owner");

  const alerts: AlertItem[] = deriveAlerts({
    cards: preferences.budget_alerts ? projects : [],
    comparisons,
    milestones: preferences.milestone_alerts ? milestones : [],
    approvals,
    priceMoves: preferences.price_alerts
      ? priceBoard.moves.map((m) => ({
          materialName: m.materialName,
          changePct: m.changePct,
          city: m.city,
          materialSlug: m.materialSlug,
        }))
      : [],
    reportsCount: preferences.report_alerts ? reports.length : 0,
    procurementPending: preferences.procurement_alerts
      ? supplierPulse.awaitingQuotes + supplierPulse.activeOrders
      : 0,
    threshold: preferences.price_move_threshold,
    canApprove: canApprove && preferences.approval_alerts,
  });

  const snapshot: IntelligenceSnapshot = {
    generatedAt: new Date().toISOString(),
    userId,
    personas,
    primaryPersona: primaryPersona(personas),
    isAdmin,
    currency: totals.currency,
    totals,
    projects,
    comparisons,
    revisions,
    approvals,
    milestones,
    reports,
    deliveries,
    boq,
    prices: priceBoard,
    suppliers: supplierPulse,
    preferences,
    alerts,
    admin: isAdmin ? await loadAdminAnalytics(degraded) : null,
    degraded,
  };

  cache.set(userId, { at: Date.now(), snapshot });
  return { snapshot, error: null };
}

/** Record that a report was generated, for feature usage analytics. */
export async function logReportRun(input: {
  userId: string;
  reportType:
    | "project_cost"
    | "material_price"
    | "expenditure"
    | "progress"
    | "boq_summary";
  format: "pdf" | "xlsx";
  scopeId?: string | null;
  rowCount: number;
}): Promise<void> {
  await supabase.from("intelligence_report_runs").insert({
    user_id: input.userId,
    report_type: input.reportType,
    format: input.format,
    scope_id: input.scopeId ?? null,
    row_count: input.rowCount,
  });
}

/**
 * Append an estimate revision. The previous estimate stays in the ledger, so a
 * client who was shown the old figure can still be shown what changed.
 */
export async function saveEstimateRevision(input: {
  projectId: string;
  userId: string;
  label: string;
  source: "manual" | "calculator" | "boq" | "price_index" | "imported";
  materials: number;
  labour: number;
  transport: number;
  misc: number;
  markup: number;
  currency: string;
  note?: string | null;
}): Promise<{ error: string | null }> {
  const total = round2(
    input.materials +
      input.labour +
      input.transport +
      input.misc +
      input.markup,
  );
  const { error } = await supabase.from("project_estimate_revisions").insert({
    project_id: input.projectId,
    user_id: input.userId,
    label: input.label,
    source: input.source,
    materials_cost: input.materials,
    labour_cost: input.labour,
    transport_cost: input.transport,
    misc_cost: input.misc,
    markup_amount: input.markup,
    total,
    currency: input.currency,
    note: input.note ?? null,
  });
  invalidateIntelligenceCache(input.userId);
  return { error: error?.message ?? null };
}
