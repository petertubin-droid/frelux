import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import { SectionHeading, StatTile } from "@/components/market-intelligence/ui";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";

type Snapshot = {
  tracked_visitors_30d: number;
  tracked_events_30d: number;
  calculator_completions_30d: number;
  registered_users: number;
  new_users_30d: number;
  purchases_30d: number;
  revenue_30d_kobo: number;
  generated_at: string;
};

type InvestorDocument = {
  id: string;
  title: string;
  period: string | null;
  doc_type: string;
  url: string | null;
  created_at: string;
};

export default function InvestorCentre() {
  const { user, isAdmin, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useSeo({
    title: "FRELUX Investor Centre",
    description: "Private FRELUX business metrics for authorised investors.",
    canonicalPath: "/investor-centre",
    noIndex: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) {
        setHasAccess(false);
        return;
      }
      if (isAdmin) {
        setHasAccess(true);
        return;
      }
      const { data, error } = await supabase
        .from("mi_investor_access")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setHasAccess(!error && Boolean(data));
    }
    if (!loading) void check();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, loading]);

  const snapshot = useAsyncData(async () => {
    const { data, error } = await supabase.rpc("mi_investor_snapshot");
    if (error) throw new Error(error.message);
    const docs = await supabase
      .from("mi_investor_documents")
      .select("id,title,period,doc_type,url,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    return {
      metrics: data as Snapshot,
      documents: (docs.data ?? []) as InvestorDocument[],
    };
  }, [hasAccess]);

  if (loading || hasAccess === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Lock
            className="mx-auto h-6 w-6 text-muted-foreground"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Investor Centre is private
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            This dashboard holds FRELUX business metrics and is limited to
            administrators and named investors. Access is granted by an
            administrator and is not self-service.
          </p>
          <div className="mt-5 flex justify-center gap-3 text-sm">
            {user ? null : (
              <Link
                to="/login"
                className="rounded-md bg-brand-purple px-4 py-2 font-medium text-white hover:opacity-90"
              >
                Sign in
              </Link>
            )}
            <Link
              to="/market-intelligence"
              className="rounded-md border border-border px-4 py-2 text-muted-foreground hover:text-foreground"
            >
              Public market intelligence
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (snapshot.status === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">
        Loading investor metrics…
      </div>
    );
  }
  if (snapshot.status === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">
        Unavailable: {snapshot.message}
      </div>
    );
  }

  const { metrics, documents } = snapshot.data;

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Market Intelligence", path: "/market-intelligence" },
          { label: "Investor Centre" },
        ]}
        eyebrow="Investor Centre"
        title="FRELUX operating snapshot"
        subtitle={`Generated ${new Date(metrics.generated_at).toLocaleString()} from live FRELUX tables.`}
        actions={
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Authorised access
          </span>
        }
      />

      <Container className="max-w-6xl pb-12 pt-8">
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Registered users"
            value={metrics.registered_users.toLocaleString()}
            hint={`${metrics.new_users_30d} new in 30 days`}
          />
          <StatTile
            label="Tracked visitors (30d)"
            value={metrics.tracked_visitors_30d.toLocaleString()}
            hint="Distinct visitor IDs in product analytics"
          />
          <StatTile
            label="Calculator completions (30d)"
            value={metrics.calculator_completions_30d.toLocaleString()}
            hint="Events ending in 'completed'"
          />
          <StatTile
            label="Revenue (30d)"
            value={
              metrics.revenue_30d_kobo === 0
                ? "None recorded"
                : `₦${(metrics.revenue_30d_kobo / 100).toLocaleString()}`
            }
            hint={`${metrics.purchases_30d} recorded purchases`}
          />
        </section>

        <section className="mt-10">
          <SectionHeading
            title="What this dashboard deliberately does not show"
            description="Missing data is stated, never modelled."
          />
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              • <strong className="text-foreground">Website traffic:</strong>{" "}
              FRELUX does not store pageviews in its own tables. Traffic
              requires the GA4 reporting function with a property ID configured;
              until then no figure is shown.
            </li>
            <li>
              • <strong className="text-foreground">Valuation:</strong> no
              valuation model is maintained. Any valuation would be an opinion,
              not a measurement, so none is presented.
            </li>
            <li>
              • <strong className="text-foreground">Profitability:</strong> no
              cost ledger is connected, so margin is not calculable from these
              tables.
            </li>
            <li>
              • <strong className="text-foreground">Retention:</strong> needs
              cohort definitions agreed with investors before a number means
              anything.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <SectionHeading
            title="Investor documents"
            description="Reports uploaded for authorised investors."
          />
          {documents.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No investor reports have been uploaded yet. Administrators add
              them in the Market Intelligence control panel; this list stays
              empty rather than being padded.
            </p>
          ) : (
            <ul className="space-y-2">
              {documents.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {d.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.doc_type}
                      {d.period ? ` · ${d.period}` : ""} · added{" "}
                      {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline text-muted-foreground hover:text-foreground"
                    >
                      Open
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </>
  );
}
