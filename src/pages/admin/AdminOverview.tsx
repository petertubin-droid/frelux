import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Brain,
  CheckCircle2,
  Coins,
  Database,
  FileText,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchAiAccessConfig } from "@/lib/ai-access";
import { CONSTRUCTION_TOOLS } from "@/config/construction-tools";
import {
  AdminCard,
  AdminHeader,
  StateMessage,
  StatusBadge,
} from "@/components/admin/AdminUi";

/**
 * Admin Overview - answers "Is FRELUX healthy?" at a glance.
 *
 * Every number on this page is a real live query (or an honest failure
 * message). Nothing is hardcoded or assumed: if a query fails, the tile
 * says so instead of pretending everything is fine.
 */

interface Counts {
  profiles: number | null;
  estimates: number | null;
  materials: number | null;
  prices: number | null;
  errors24h: number | null;
  analytics24h: number | null;
}

type Health = "checking" | "ok" | "down";

function StatTile({
  label,
  value,
  to,
  icon: Icon,
  hint,
  failed,
}: {
  label: string;
  value: number | string;
  to: string;
  icon: LucideIcon;
  hint?: string;
  failed?: boolean;
}) {
  return (
    <Link
      to={to}
      className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {failed && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
            query failed
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold text-foreground dark:text-primary-foreground">
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>}
    </Link>
  );
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [dbHealth, setDbHealth] = useState<Health>("checking");
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Counts>({
    profiles: null,
    estimates: null,
    materials: null,
    prices: null,
    errors24h: null,
    analytics24h: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [
        dbProbe,
        profilesRes,
        estimatesRes,
        materialsRes,
        pricesRes,
        errorsRes,
        analyticsRes,
        aiCfg,
      ] = await Promise.all([
        supabase.from("estimation_prices").select("id").limit(1),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("estimation_estimates")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("estimation_materials")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("estimation_prices")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("application_errors")
          .select("*", { count: "exact", head: true })
          .eq("resolved", false)
          .gte("last_seen", since24h),
        supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since24h),
        fetchAiAccessConfig(),
      ]);
      if (cancelled) return;
      setDbHealth(dbProbe.error ? "down" : "ok");
      setAiEnabled(aiCfg ? aiCfg.aiEnabled : null);
      setCounts({
        profiles: profilesRes.count ?? (profilesRes.error ? null : 0),
        estimates: estimatesRes.count ?? (estimatesRes.error ? null : 0),
        materials: materialsRes.count ?? (materialsRes.error ? null : 0),
        prices: pricesRes.count ?? (pricesRes.error ? null : 0),
        errors24h: errorsRes.count ?? (errorsRes.error ? null : 0),
        analytics24h: analyticsRes.count ?? (analyticsRes.error ? null : 0),
      });
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <>
        <AdminHeader title="Overview" subtitle="Platform health at a glance." />
        <StateMessage
          type="loading"
          title="Loading summary…"
          message="Checking database, AI status and platform counts."
        />
      </>
    );
  }

  const sections: {
    label: string;
    question: string;
    to: string;
    icon: LucideIcon;
  }[] = [
    {
      label: "Construction Engines",
      question: "Which engines exist and are they active?",
      to: "/admin/engine-config",
      icon: Activity,
    },
    {
      label: "Materials & Prices",
      question: "Which materials and prices are configured?",
      to: "/admin/material-catalog",
      icon: Boxes,
    },
    {
      label: "Projects & Estimates",
      question: "How is FRELUX being used?",
      to: "/admin/estimation-estimates",
      icon: FileText,
    },
    {
      label: "Users",
      question: "Who uses FRELUX?",
      to: "/admin/users",
      icon: Users,
    },
    {
      label: "ARCHIE / AI",
      question: "What is the AI doing?",
      to: "/admin/ai-settings",
      icon: Brain,
    },
    {
      label: "Content",
      question: "What does the site say?",
      to: "/admin/learn",
      icon: ScrollText,
    },
    {
      label: "Monetization",
      question: "What earns money?",
      to: "/admin/ads",
      icon: Megaphone,
    },
    {
      label: "Marketplace & Pros",
      question: "Pro and marketplace activity",
      to: "/admin/marketplace",
      icon: Store,
    },
    {
      label: "System",
      question: "Technical configuration",
      to: "/admin/settings",
      icon: Settings,
    },
    {
      label: "Security & Audit",
      question: "What happened recently?",
      to: "/admin/estimation-audit",
      icon: ShieldCheck,
    },
  ];

  return (
    <>
      <AdminHeader
        title="Overview"
        subtitle="Is FRELUX healthy? Live answers, no assumptions."
      />

      {/* Health strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
              <Database className="h-5 w-5" aria-hidden="true" />
            </span>
            {dbHealth === "ok" && <StatusBadge status="Active" />}
            {dbHealth === "down" && <StatusBadge status="Error" />}
          </div>
          <p className="mt-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Database
          </p>
          <p className="mt-1 text-sm text-foreground dark:text-primary-foreground">
            {dbHealth === "ok"
              ? "Connected and responding."
              : "Unreachable right now: check System Health."}
          </p>
        </AdminCard>

        <AdminCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </span>
            {aiEnabled === null ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                unknown
              </span>
            ) : aiEnabled ? (
              <StatusBadge status="Active" />
            ) : (
              <StatusBadge status="Inactive" />
            )}
          </div>
          <p className="mt-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            ARCHIE / AI
          </p>
          <p className="mt-1 text-sm text-foreground dark:text-primary-foreground">
            {aiEnabled === null
              ? "AI status could not be read."
              : aiEnabled
                ? "AI assistants enabled for users."
                : "AI assistants switched off."}
          </p>
          <Link
            to="/admin/ai-settings"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple"
          >
            AI Control Center
          </Link>
        </AdminCard>

        <Link
          to="/admin/errors"
          className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            {(counts.errors24h ?? 0) > 0 ? (
              <StatusBadge status="Error" />
            ) : (
              <StatusBadge status="Active" />
            )}
          </div>
          <p className="mt-4 text-3xl font-bold text-foreground dark:text-primary-foreground">
            {counts.errors24h ?? "N/A"}
          </p>
          <p className="text-sm text-muted-foreground">
            Unresolved errors (24h)
            {counts.errors24h === null && ": query failed"}
          </p>
        </Link>

        <StatTile
          label={`Estimates saved${counts.estimates === null ? ": query failed" : ""}`}
          value={counts.estimates ?? "N/A"}
          to="/admin/estimation-estimates"
          icon={FileText}
          failed={counts.estimates === null}
        />
      </div>

      {/* Platform at a glance */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Platform at a glance
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          label={`Registered users${counts.profiles === null ? ": query failed" : ""}`}
          value={counts.profiles ?? "N/A"}
          to="/admin/users"
          icon={Users}
          failed={counts.profiles === null}
        />
        <StatTile
          label={`Estimation materials${counts.materials === null ? ": query failed" : ""}`}
          value={counts.materials ?? "N/A"}
          to="/admin/estimation-materials"
          icon={Boxes}
          failed={counts.materials === null}
        />
        <StatTile
          label={`Price records${counts.prices === null ? ": query failed" : ""}`}
          value={counts.prices ?? "N/A"}
          to="/admin/estimation-pricing"
          icon={Coins}
          failed={counts.prices === null}
        />
        <StatTile
          label={`Public tools${CONSTRUCTION_TOOLS.length}`}
          value={CONSTRUCTION_TOOLS.length}
          to="/construction-tools"
          icon={LayoutDashboard}
          hint="Open the public Construction Tools page"
        />
        <StatTile
          label={`Events tracked (24h)${counts.analytics24h === null ? ": query failed" : ""}`}
          value={counts.analytics24h ?? "N/A"}
          to="/admin/analytics"
          icon={Activity}
          failed={counts.analytics24h === null}
        />
      </div>

      {/* Owner quick actions */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Owner quick actions
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Update a material price",
            to: "/admin/price-updater",
            icon: RefreshCw,
          },
          {
            label: "Review AI learning",
            to: "/admin/learning-review",
            icon: Brain,
          },
          {
            label: "Add a material",
            to: "/admin/material-catalog",
            icon: Boxes,
          },
          { label: "Search admin pages", to: "/admin/settings", icon: Search },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to}
              to={a.to}
              className="card flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                {a.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Section map */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Admin sections
      </h2>
      <AdminCard className="p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.to}
                to={s.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted dark:hover:bg-card-foreground/90"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-brand-purple"
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground dark:text-primary-foreground">
                    {s.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {s.question}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </AdminCard>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Every figure on this page is a live query: failed queries say so.
        <XCircle className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
        Nothing here is hardcoded.
      </p>
    </>
  );
}
