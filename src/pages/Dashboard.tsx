import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Bookmark,
  Lightbulb,
  Calculator,
  ArrowRight,
  TrendingUp,
  Gem,
  FolderOpen,
  Bitcoin,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import ColorSwatch from "@/components/ui/ColorSwatch";
import {
  fetchUserProjects,
  fetchFavoriteColors,
  fetchRecentlyViewedColors,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import {
  fetchUserCryptoInvoices,
  type UserCryptoInvoiceRow,
  formatBtc,
} from "@/lib/payments/btcpay";
import {
  fetchUserVerifiedDocuments,
  type DocumentVerificationRecord,
} from "@/lib/blockchain/opentimestamps";
import { useLanguage } from "@/lib/i18n";
import type {
  DbUserProject,
  DbPaintColor,
  DbContractorProject,
} from "@/types/database";

const PROJECT_ROUTES: Record<string, string> = {
  screeding: "/screeding-calculator",
  wall_finishing: "/wall-finish-estimator",
  paint_calc: "/paint-calculator",
  cost_estimate: "/paint-calculator?mode=cost",
  ai_recommendation: "/ai-color-assistant",
  custom: "/paint-calculator",
  pop_ceiling: "/pop-ceiling-calculator",
  pop_estimate: "/pop-ceiling-calculator?mode=cost",
  tile: "/tile-calculator",
  tile_estimate: "/tile-calculator?mode=cost",
};

const CONTRACTOR_STATUS: Record<string, { label: string; className: string }> =
  {
    draft: {
      label: "Planning",
      className:
        "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    },
    in_progress: {
      label: "In Progress",
      className:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    on_hold: {
      label: "On Hold",
      className:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    completed: {
      label: "Completed",
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    archived: {
      label: "Archived",
      className:
        "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    },
  };

const QUICK_ACTIONS = [
  {
    to: "/paint-calculator",
    label: "Paint Calc",
    icon: Calculator,
    color: "text-brand-purple bg-primary/10",
  },
  {
    to: "/paint-calculator?mode=cost",
    label: "Cost Est",
    icon: TrendingUp,
    color: "text-accent-green bg-accent-green/8",
  },
  {
    to: "/ai-color-assistant",
    label: "AI Color",
    icon: Gem,
    color: "text-accent-orange bg-accent-orange/8",
  },
  {
    to: "/colors",
    label: "Colors",
    icon: Bookmark,
    color: "text-rose-400 bg-rose-400/8",
  },
];

export default function Dashboard() {
  const { t } = useLanguage();
  useSeo({
    title: "Dashboard, FRELUX",
    description:
      "Your personal dashboard with recent projects, saved estimates, favorite colors, and AI recommendations.",
    canonicalPath: "/dashboard",
    noIndex: true,
  });

  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<DbUserProject[]>([]);
  const [favColors, setFavColors] = useState<DbPaintColor[]>([]);
  const [recentColors, setRecentColors] = useState<DbPaintColor[]>([]);
  const [cryptoInvoices, setCryptoInvoices] = useState<UserCryptoInvoiceRow[]>(
    [],
  );
  const [verifiedDocs, setVerifiedDocs] = useState<
    DocumentVerificationRecord[]
  >([]);
  const [contractorProjects, setContractorProjects] = useState<
    Pick<
      DbContractorProject,
      | "id"
      | "name"
      | "status"
      | "progress_percentage"
      | "total_project_cost"
      | "currency_symbol"
      | "updated_at"
    >[]
  >([]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const orderId = searchParams.get("orderId");
    const invoiceId =
      searchParams.get("invoice_id") || searchParams.get("nowpayments_invoice");
    const identifier =
      payment === "nowpayments_success" ? orderId || invoiceId : invoiceId;

    if (!identifier) return;

    let active = true;
    import("@/lib/payments/nowpayments")
      .then(({ verifyNowPaymentsInvoice }) => {
        verifyNowPaymentsInvoice(identifier)
          .then(async (res) => {
            if (!active) return;
            if (res.status === "Confirmed" || res.activated) {
              await refreshProfile();
              if (user?.id) {
                fetchUserCryptoInvoices(user.id).then(setCryptoInvoices);
              }
              toast({
                title: "Crypto payment confirmed!",
                message: "Your payment has been verified and applied.",
                type: "success",
              });
            } else {
              toast({
                title: `Crypto payment status: ${res.status}`,
                message:
                  "Your transaction is currently being processed by the blockchain network.",
                type: "info",
              });
            }
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("payment");
                next.delete("orderId");
                next.delete("invoice_id");
                next.delete("nowpayments_invoice");
                return next;
              },
              { replace: true },
            );
          })
          .catch((err) => {
            if (!active) return;
            toast({
              title: "Verification issue",
              message:
                err instanceof Error ? err.message : "Could not verify payment",
              type: "error",
            });
          });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [searchParams, user?.id, refreshProfile, toast, setSearchParams]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void loadAll(user.id);
  }, [user]);

  async function loadAll(userId: string) {
    setLoading(true);
    const [projRes, favRes, recentRes, contractorRes, cryptoRes, docRes] =
      await Promise.all([
        fetchUserProjects(),
        fetchFavoriteColors(),
        fetchRecentlyViewedColors(8),
        supabase
          .from("contractor_projects")
          .select(
            "id, name, status, progress_percentage, total_project_cost, currency_symbol, updated_at",
          )
          .order("updated_at", { ascending: false })
          .limit(6),
        fetchUserCryptoInvoices(userId),
        fetchUserVerifiedDocuments(userId),
      ]);
    setCryptoInvoices(cryptoRes);
    setVerifiedDocs(docRes);
    setProjects(projRes.data);
    setFavColors(favRes.data);
    setRecentColors(recentRes.data);
    // Read-only overview; a failure here never breaks the dashboard.
    if (contractorRes.data) setContractorProjects(contractorRes.data);
    setLoading(false);
  }

  if (!user) {
    return (
      <>
        <PageHeader
          eyebrow="Personal workspace"
          title={t("Dashboard")}
          subtitle="Sign in to access your personal dashboard with recent projects, saved estimates, and favorite colors."
        />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <EmptyState
            illustration="projects"
            title={t("Sign in to view your dashboard")}
            description="Track your projects, save calculations, and get personalized AI color recommendations."
            actionLabel="Sign in"
            actionTo="/login?redirect=/dashboard"
            secondaryLabel="Browse colors"
            secondaryTo="/colors"
          />
        </div>
      </>
    );
  }

  const lastProject = projects[0];

  return (
    <>
      <PageHeader
        eyebrow="Personal workspace"
        title={t("Dashboard")}
        subtitle={t("Pick up where you left off and explore your saved work.")}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-in-up">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-brand-purple/20 hover:shadow-sm dark:border-white/5 dark:bg-card"
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Continue Last Project */}
            {lastProject && (
              <section className="relative overflow-hidden rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-card p-6 dark:from-primary/10 dark:to-card animate-fade-in-up">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl"
                  aria-hidden="true"
                />
                <div className="relative flex items-center gap-2 text-sm font-semibold text-brand-purple">
                  <Clock className="h-4 w-4" />{" "}
                  {t("Continue where you left off")}
                </div>
                <div className="relative mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground dark:text-primary-foreground">
                      {lastProject.name}
                    </h3>
                    {lastProject.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {lastProject.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated{" "}
                      {new Date(lastProject.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={
                      PROJECT_ROUTES[lastProject.project_type] ??
                      "/paint-calculator"
                    }
                    state={{
                      projectData: lastProject.project_data,
                      projectId: lastProject.id,
                      projectName: lastProject.name,
                    }}
                    className="btn-primary press-scale shrink-0"
                  >
                    Open Project{" "}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            )}

            {/* Project Workspace overview */}
            <section
              className="animate-fade-in-up"
              data-testid="dashboard-workspace-section"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground dark:text-primary-foreground">
                  <FolderOpen className="h-5 w-5 text-brand-purple" /> Project
                  Workspace
                </h2>
                <Link
                  to="/project-workspace"
                  className="group text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                >
                  {t("View all")}
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-0.5 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              {contractorProjects.length === 0 ? (
                <EmptyState
                  illustration="projects"
                  title={t("No construction projects yet")}
                  description="Create a project to plan stages, materials, shopping and timelines in one connected workspace."
                  actionLabel="Open Project Workspace"
                  actionTo="/project-workspace"
                />
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(
                      [
                        {
                          key: "in_progress",
                          label: "In progress",
                          icon: TrendingUp,
                        },
                        { key: "draft", label: "Planning", icon: Bookmark },
                        { key: "completed", label: "Completed", icon: Clock },
                      ] as const
                    ).map((t) => {
                      const count = contractorProjects.filter(
                        (p) => p.status === t.key,
                      ).length;
                      return (
                        <div
                          key={t.key}
                          className="rounded-xl border border-border/60 bg-card p-4 dark:border-white/5"
                          data-testid="workspace-stat"
                        >
                          <p className="text-2xl font-bold text-foreground dark:text-primary-foreground">
                            {count}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {contractorProjects.slice(0, 4).map((p) => {
                      const st = CONTRACTOR_STATUS[p.status] ?? {
                        label: p.status,
                        className: "bg-muted text-muted-foreground",
                      };
                      return (
                        <Link
                          key={p.id}
                          to={`/project-workspace/${p.id}`}
                          className="card-hover flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 dark:border-white/5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.currency_symbol}
                              {p.total_project_cost.toLocaleString()} ·{" "}
                              {p.progress_percentage}% complete
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${st.className}`}
                          >
                            {st.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* Recent Calculations */}
            <section
              className="animate-fade-in-up"
              style={{ animationDelay: "0.05s" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground dark:text-primary-foreground">
                  <Calculator className="h-5 w-5 text-brand-purple" /> Recent
                  Calculations
                </h2>
                <Link
                  to="/my-projects/"
                  className="group text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                >
                  {t("View all")}
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-0.5 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
              {projects.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.slice(0, 6).map((p, i) => (
                    <Link
                      key={p.id}
                      to={PROJECT_ROUTES[p.project_type] ?? "/paint-calculator"}
                      state={{
                        projectData: p.project_data,
                        projectId: p.id,
                        projectName: p.name,
                      }}
                      className="card-hover group rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card animate-fade-in-up"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="flex items-start justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                          <FolderOpen className="h-4 w-4" />
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-foreground dark:text-primary-foreground group-hover:text-brand-purple dark:group-hover:text-brand-purple-lighter transition-colors">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {p.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  illustration="projects"
                  title={t("No saved calculations yet")}
                  description="Use any calculator and save your results to see them here."
                  actionLabel="Start calculating"
                  actionTo="/paint-calculator"
                />
              )}
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Favorite Colors */}
              <section
                className="animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-foreground dark:text-primary-foreground">
                    <Bookmark className="h-5 w-5 text-rose-400" /> Favorite
                    Colors
                  </h2>
                  <Link
                    to="/my-projects/"
                    className="group text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                  >
                    {t("View all")}
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-0.5 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
                {favColors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {favColors.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        to={`/colors/paint/${c.slug}/`}
                        className="card-hover flex items-center gap-2 rounded-xl border border-border bg-card p-3 dark:border-white/5 dark:bg-card"
                      >
                        <ColorSwatch hex={c.hex_code} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.hex_code}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    illustration="favorites"
                    title={t("No favorites yet")}
                    description="Tap the heart on any color to save it."
                    actionLabel="Browse colors"
                    actionTo="/colors"
                  />
                )}
              </section>

              {/* Recently Viewed */}
              <section
                className="animate-fade-in-up"
                style={{ animationDelay: "0.15s" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-foreground dark:text-primary-foreground">
                    <Clock className="h-5 w-5 text-muted-foreground" /> Recently
                    Viewed
                  </h2>
                  <Link
                    to="/my-projects/"
                    className="group text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                  >
                    {t("View all")}
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-0.5 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
                {recentColors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {recentColors.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        to={`/colors/paint/${c.slug}/`}
                        className="card-hover flex items-center gap-2 rounded-xl border border-border bg-card p-3 dark:border-white/5 dark:bg-card"
                      >
                        <ColorSwatch hex={c.hex_code} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.hex_code}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    illustration="generic"
                    title={t("No recently viewed colors")}
                    description="Colors you browse will appear here for quick access."
                    actionLabel="Browse colors"
                    actionTo="/colors"
                  />
                )}
              </section>
            </div>

            {/* FRELUX VERIFY — Blockchain Document Records */}
            <section
              className="animate-fade-in-up"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("Blockchain Verified Documents")}
                  </h2>
                </div>
                <Link
                  to="/verify"
                  className="text-xs font-semibold text-brand-purple hover:underline"
                >
                  {t("Open Verify Portal")} →
                </Link>
              </div>

              {verifiedDocs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                  <FileCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="font-medium text-foreground">
                    No blockchain-anchored documents yet
                  </p>
                  <p className="text-xs mt-1">
                    Export a BOQ from BOQ Studio to automatically seal and
                    anchor its SHA-256 fingerprint on the Bitcoin blockchain.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {verifiedDocs.slice(0, 6).map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between hover:border-foreground/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-mono font-semibold text-brand-purple">
                            {doc.verification_id}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              doc.status === "Blockchain Verified"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                        <h4 className="font-medium text-foreground text-sm line-clamp-1">
                          {doc.document_title}
                        </h4>
                        <p className="text-[10px] font-mono text-muted-foreground truncate mt-1">
                          SHA: {doc.document_hash.slice(0, 16)}...
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        <Link
                          to={`/verify`}
                          className="font-medium text-brand-purple hover:underline"
                        >
                          Verify →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* FRELUX PAY — Bitcoin Payment Invoices */}
            <section
              className="animate-fade-in-up"
              style={{ animationDelay: "0.18s" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("Bitcoin Payments (FRELUX PAY)")}
                  </h2>
                </div>
                <Link
                  to="/pricing"
                  className="text-xs font-semibold text-brand-purple hover:underline"
                >
                  {t("Pricing & Pay Options")} →
                </Link>
              </div>

              {cryptoInvoices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                  <Bitcoin className="h-8 w-8 mx-auto mb-2 text-amber-500/60" />
                  <p className="font-medium text-foreground">
                    No Bitcoin invoices yet
                  </p>
                  <p className="text-xs mt-1">
                    You can subscribe to FRELUX Pro, Premium, or Enterprise
                    tiers using Bitcoin on the Pricing page.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-medium">Invoice</th>
                        <th className="py-2.5 px-3 font-medium">Plan</th>
                        <th className="py-2.5 px-3 font-medium">BTC</th>
                        <th className="py-2.5 px-3 font-medium">Status</th>
                        <th className="py-2.5 px-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cryptoInvoices.slice(0, 5).map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-2.5 px-3 font-mono font-medium">
                            {inv.invoice_id}
                          </td>
                          <td className="py-2.5 px-3 capitalize font-medium">
                            {inv.plan_id || inv.purpose}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                            ₿ {formatBtc(inv.amount_btc)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                inv.status === "Confirmed"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : inv.status === "Processing"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* AI Suggestion */}
            <section
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-muted/50 to-card p-6 dark:border-white/5 dark:from-card dark:to-card animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-orange/5 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative flex items-center gap-2 text-sm font-semibold text-accent-orange">
                <Lightbulb className="h-4 w-4" /> {t("AI Suggestion")}
              </div>
              <p className="relative mt-3 text-sm text-muted-foreground dark:text-muted-foreground/80">
                Try the Smart Color Assistant to get personalized color
                recommendations based on your room type, lighting, and style
                preferences.
              </p>
              <Link
                to="/ai-color-assistant/"
                className="group relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
              >
                {t("Get recommendations")}
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
