// =========================================================
// FRELUX ARCHIE STAGE 1, SECURITY
//
// Live security feed and the Owner authorization ledger.
// Protected operations always pass through the server-side
// authorization workflow: a bug report, recommendation or AI
// decision is NEVER interpreted as Owner authorization.
// =========================================================
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ShieldCheck, FileCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/utils";

interface SecurityEvent {
  id: string;
  kind: string;
  severity: string;
  message: string;
  created_date: string;
}

interface OwnerAuthorization {
  id: string;
  change_kind: string;
  target: string;
  status: string;
  tests_passed: boolean;
  created_date: string;
}

function severityClass(severity: string): string {
  if (severity === "CRITICAL") return "bg-destructive/10 text-destructive";
  if (severity === "WARNING" || severity === "warning")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

export default function ArchieSecurity() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [auths, setAuths] = useState<OwnerAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [eventsRes, authsRes] = await Promise.all([
          supabase
            .from("frelux_security_events")
            .select("id,kind,severity,message,created_date")
            .order("created_date", { ascending: false })
            .limit(30),
          supabase
            .from("frelux_owner_authorizations")
            .select("id,change_kind,target,status,tests_passed,created_date")
            .order("created_date", { ascending: false })
            .limit(20),
        ]);
        if (eventsRes.error || authsRes.error) {
          setError(
            eventsRes.error?.message ??
              authsRes.error?.message ??
              "Security data unavailable",
          );
          return;
        }
        setEvents((eventsRes.data ?? []) as SecurityEvent[]);
        setAuths((authsRes.data ?? []) as OwnerAuthorization[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6" data-testid="archie-security">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          Security
        </h1>
        <p className="text-sm text-muted-foreground">
          Security events and the Owner authorization ledger. Server-side
          enforcement: sessions, token rotation, revocation, audit.
        </p>
      </div>

      <section aria-label="Security events">
        <h2 className="mb-3 font-display text-base font-bold text-foreground">
          Recent security events
        </h2>
        {loading ? (
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
            Loading…
          </p>
        ) : error ? (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
          </p>
        ) : events.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> No security
            events recorded.
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
              >
                <div>
                  <p className="text-sm text-foreground">{e.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.kind} · {new Date(e.created_date).toLocaleString()}
                  </p>
                </div>
                <span
                  className={classNames(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    severityClass(e.severity),
                  )}
                >
                  {e.severity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Owner authorizations">
        <h2 className="mb-3 font-display text-base font-bold text-foreground">
          Owner authorization ledger
        </h2>
        {auths.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <FileCheck className="h-4 w-4" aria-hidden="true" />
            No protected operations have been authorized yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {auths.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {a.change_kind}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.target} · tests{" "}
                    {a.tests_passed ? "passed" : "not passed"} ·{" "}
                    {new Date(a.created_date).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
