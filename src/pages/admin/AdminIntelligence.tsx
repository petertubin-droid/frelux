/**
 * Platform analytics for administrators.
 *
 * Counts, not contents: how many users, projects, suppliers, contributions and
 * transactions exist, and which reports are actually used. No private project
 * figure, client name or document leaves the project it belongs to.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { formatByCode } from "@/lib/international/currency-format";
import { loadIntelligence } from "@/lib/intelligence/queries";
import type { AdminAnalytics } from "@/lib/intelligence/types";

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="tabular-nums">{row.value}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
      {!rows.length ? (
        <li className="text-xs text-muted-foreground">No data recorded yet.</li>
      ) : null}
    </ul>
  );
}

export default function AdminIntelligence() {
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: "Platform analytics",
    description:
      "Growth, project, price contribution, supplier and marketplace analytics for administrators.",
    canonicalPath: "/admin/intelligence",
    noIndex: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { snapshot, error: loadError } = await loadIntelligence({
      force: true,
    });
    setAnalytics(snapshot?.admin ?? null);
    setIsAdmin(snapshot?.isAdmin ?? false);
    setError(loadError);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user) void load();
    if (!authLoading && !user) {
      setLoading(false);
      setError("Sign in with an administrator account.");
    }
  }, [authLoading, user, load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Loading analytics"
        />
      </div>
    );
  }

  if (error || !isAdmin || !analytics) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">
          Administrator access required
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "Platform analytics are limited to administrator accounts."}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/intelligence">Back to my dashboard</Link>
        </Button>
      </div>
    );
  }

  const money = (amount: number) =>
    formatByCode(amount, analytics.marketplace.currency, { decimals: 0 });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Platform analytics
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Aggregated counts across the marketplace, the price index and the
            project systems. Private project and financial detail stays inside
            each project.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/intelligence">My dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          label="Registered users"
          value={String(analytics.users.total)}
          hint={`${analytics.users.newThisMonth} new this month`}
        />
        <Card
          label="Active projects"
          value={String(analytics.projects.active)}
          hint={`${analytics.projects.total} created in total`}
        />
        <Card
          label="Suppliers"
          value={String(analytics.suppliers.total)}
          hint={`${analytics.suppliers.verified} platform-verified`}
        />
        <Card
          label="Active listings"
          value={String(analytics.suppliers.activeListings)}
          hint={`${analytics.suppliers.pendingVerification} suppliers unverified`}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          label="Material requests"
          value={String(analytics.marketplace.requests)}
        />
        <Card label="Quotations" value={String(analytics.marketplace.quotes)} />
        <Card label="Orders" value={String(analytics.marketplace.orders)} />
        <Card
          label="Awarded value"
          value={money(analytics.marketplace.awardedValue)}
          hint="Excludes cancelled orders"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">User growth</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            New accounts per month, last six months with data.
          </p>
          <Bars
            rows={analytics.growth.map((row) => ({
              label: row.month,
              value: row.users,
            }))}
          />
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Supplier subscriptions</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Supplier accounts by plan.
          </p>
          <Bars
            rows={analytics.subscriptions.map((row) => ({
              label: row.plan,
              value: row.suppliers,
            }))}
          />
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Report usage</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Reports generated from the intelligence dashboard.{" "}
            {analytics.priceContributions.pending} price submission(s) await
            review.
          </p>
          <Bars
            rows={analytics.featureUsage.map((row) => ({
              label: row.report,
              value: row.runs,
            }))}
          />
        </section>
      </div>

      <footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
        <p>
          Counts are read under administrator permissions. Nothing on this page
          exposes a client name, a project document or an individual expense.
        </p>
      </footer>
    </div>
  );
}
