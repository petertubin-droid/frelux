// =========================================================
// FRELUX ARCHIE STAGE 1, OWNER CENTRAL CONTROL DASHBOARD
//
// Live system status from production tables + the systems
// registry. Sections with a real backend show their real
// state; sections without one are marked ADAPTER PENDING.
// No fake controls: configuration links point to the real
// admin consoles that own those write paths.
// =========================================================
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import {
  fetchArchieStatus,
  buildSystemsRegistry,
  type ArchieStatus,
  type SystemSection,
  type SystemState,
} from "@/lib/archie/status";
import { classNames } from "@/lib/utils";

const STATE_STYLES: Record<SystemState, string> = {
  operational: "bg-primary/10 text-primary",
  degraded: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  pending: "bg-muted text-muted-foreground",
  alert: "bg-destructive/10 text-destructive",
  offline: "bg-destructive/10 text-destructive",
};

const STATE_LABELS: Record<SystemState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  pending: "Adapter pending",
  alert: "Alert",
  offline: "Offline",
};

function StatusTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold text-foreground">
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function ArchieControl() {
  const [status, setStatus] = useState<ArchieStatus | null>(null);
  const [sections, setSections] = useState<SystemSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchArchieStatus();
      setStatus(s);
      setSections(buildSystemsRegistry(s));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ARCHIE status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
      >
        <Loader2
          className="h-6 w-6 animate-spin text-primary"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="archie-control">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Central Control
          </h1>
          <p className="text-sm text-muted-foreground">
            ARCHIE system overview, live from production.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
        </p>
      )}

      {status && (
        <>
          {/* Status Center */}
          <section
            aria-label="ARCHIE status center"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            <StatusTile
              label="ARCHIE Core"
              value={status.coreReachable ? "Online" : "Unreachable"}
              hint={
                status.coreReachable ? "archie-chat responding" : "probe failed"
              }
            />
            <StatusTile
              label="Knowledge Core"
              value={`${status.knowledge.active} items`}
              hint="approved knowledge"
            />
            <StatusTile
              label="Learning"
              value={status.learning.processing > 0 ? "Processing" : "Ready"}
              hint={`${status.learning.ingestions} ingestion(s) recorded`}
            />
            <StatusTile
              label="FRELUX Connection"
              value="Connected"
              hint="Supabase session active"
            />
            <StatusTile
              label="Security"
              value={
                status.security.latestSeverity === "CRITICAL"
                  ? "Critical"
                  : status.security.latestSeverity === "WARNING"
                    ? "Warning"
                    : "Normal"
              }
              hint={`${status.security.events24h} event(s), 24h`}
            />
            <StatusTile
              label="Trusted Devices"
              value={String(status.devices.trusted)}
              hint={`${status.devices.pending} pending`}
            />
            <StatusTile
              label="Active Projects"
              value={String(status.projects.contractorProjects)}
              hint={`${status.projects.estimates} saved estimates`}
            />
            <StatusTile
              label="Internal Agents"
              value={String(status.agents.active)}
              hint={`${status.agents.total} total`}
            />
          </section>

          {/* Systems registry */}
          <section aria-label="ARCHIE systems">
            <h2 className="mb-3 font-display text-base font-bold text-foreground">
              Systems
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((s) => (
                <li
                  key={s.key}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {s.label}
                    </p>
                    <span
                      className={classNames(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        STATE_STYLES[s.state],
                      )}
                    >
                      {s.state === "operational" ? (
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      ) : s.state === "pending" ? (
                        <Clock className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                      )}
                      {STATE_LABELS[s.state]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {s.detail}
                  </p>
                  {s.adminPath && (
                    <Link
                      to={s.adminPath}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      Configure in console{" "}
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
