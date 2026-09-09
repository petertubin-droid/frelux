// =========================================================
// FRELUX ARCHIE STAGE 1, SYSTEM
//
// Infrastructure, cost governance and integration state.
// Internal ARCHIE agents are FRELUX infrastructure
// operations: they can NEVER touch subscriber credits or
// subscription balances. Provider costs are tracked on the
// separate infrastructure ledger shown here.
// =========================================================
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Budget {
  id: string;
  provider: string;
  monthly_budget_cents: number;
  concurrency_limit: number;
  rate_limit_per_minute: number;
  exhaustion_policy: string;
  active: boolean;
}

export default function ArchieSystem() {
  const [mtdCents, setMtdCents] = useState<number | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const monthStart = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        ).toISOString();
        const [costsRes, budgetsRes] = await Promise.all([
          supabase
            .from("frelux_infrastructure_costs")
            .select("cost_cents")
            .gte("created_date", monthStart)
            .limit(1000),
          supabase
            .from("frelux_infrastructure_budgets")
            .select(
              "id,provider,monthly_budget_cents,concurrency_limit,rate_limit_per_minute,exhaustion_policy,active",
            )
            .order("provider")
            .limit(20),
        ]);
        if (costsRes.error || budgetsRes.error) {
          setError(
            costsRes.error?.message ??
              budgetsRes.error?.message ??
              "System data unavailable",
          );
          return;
        }
        setMtdCents(
          (costsRes.data ?? []).reduce((s, r) => s + (r.cost_cents ?? 0), 0),
        );
        setBudgets((budgetsRes.data ?? []) as Budget[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6" data-testid="archie-system">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          System
        </h1>
        <p className="text-sm text-muted-foreground">
          Infrastructure, internal cost governance and integrations. ARCHIE
          internal operations are FRELUX infrastructure expenditure and never
          touch subscriber credits.
        </p>
      </div>

      {loading ? (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
          Loading system data…
        </p>
      ) : error ? (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
        </p>
      ) : (
        <>
          <section
            aria-label="Infrastructure spend"
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Internal provider spend, month to date
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">
              {mtdCents === null
                ? "Unavailable"
                : `$${(mtdCents / 100).toFixed(2)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Recorded on the frelux_infrastructure_costs ledger as
              INTERNAL_ARCHIE_OPERATION. Subscriber credits are structurally
              unreachable for internal agent usage.
            </p>
          </section>

          <section aria-label="Budgets">
            <h2 className="mb-3 font-display text-base font-bold text-foreground">
              Provider budgets
            </h2>
            {budgets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No provider budgets configured yet. Configure them in the ARCHIE
                Ops console.
              </p>
            ) : (
              <ul className="space-y-2">
                {budgets.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-xl border border-border bg-card p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        {b.provider}
                      </p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {b.active ? "active" : "inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Monthly ${(b.monthly_budget_cents / 100).toFixed(2)} ·
                      concurrency {b.concurrency_limit} ·{" "}
                      {b.rate_limit_per_minute}/min · on exhaustion:{" "}
                      {b.exhaustion_policy}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-label="Integrations"
            className="rounded-xl border border-border bg-card p-4"
          >
            <h2 className="mb-2 font-display text-base font-bold text-foreground">
              Integrations
            </h2>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-foreground">
                  Supabase (auth, database, storage, edge)
                </span>
                <span className="text-xs font-semibold text-primary">
                  Connected
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-foreground">
                  ARCHIE Core (archie-chat)
                </span>
                <span className="text-xs font-semibold text-primary">
                  Deployed
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-foreground">
                  FRELUX public API (frelix-api)
                </span>
                <span className="text-xs font-semibold text-primary">
                  Deployed
                </span>
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
