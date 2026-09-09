// =========================================================
// FRELUX ARCHIE STAGE 1 — SECURITY CENTER
//
// Owner-visible audit trail (real events from archie-core
// and session actions), access-denied events and the
// security posture. No fabricated incidents (spec §12, §3).
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  listAuditEvents,
  type ArchieAuditEvent,
} from "@/lib/archie/stage1-client";
import {
  ArchiePage,
  ArchieStat,
  ArchieBadge,
} from "@/components/archie/premium";

function severityTone(
  s: ArchieAuditEvent["severity"],
): "critical" | "warning" | "neutral" {
  if (s === "CRITICAL") return "critical";
  if (s === "WARNING") return "warning";
  return "neutral";
}

export default function ArchieSecurity() {
  const [events, setEvents] = useState<ArchieAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await listAuditEvents(60));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load audit trail");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const critical = events.filter((e) => e.severity === "CRITICAL").length;
  const warnings = events.filter((e) => e.severity === "WARNING").length;

  const postureValue =
    critical > 0 ? "CRITICAL" : warnings > 0 ? "WARNING" : "NORMAL";
  const postureTone =
    critical > 0 ? "critical" : warnings > 0 ? "warning" : "positive";

  return (
    <ArchiePage
      title="Security"
      subtitle="Server-side authorization, audit logging and revocation. ARCHIE is Owner-only — every non-admin access attempt is recorded below."
    >
      <div className="mt-4 grid grid-cols-3 gap-2">
        <ArchieStat label="Posture" value={postureValue} tone={postureTone} />
        <ArchieStat
          label="Warnings"
          value={warnings}
          tone={warnings > 0 ? "warning" : "neutral"}
        />
        <ArchieStat label="Events" value={events.length} tone="neutral" />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading audit trail…</p>
      )}

      <ul className="mt-4 space-y-2">
        {events.map((e) => (
          <li
            key={e.id}
            className="archie-panel flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          >
            <ArchieBadge tone={severityTone(e.severity)}>
              {e.severity}
            </ArchieBadge>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
              {e.event_type}
            </span>
            <span className="text-[10px] text-slate-500">
              {new Date(e.created_date).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
      {!loading && events.length === 0 && !error && (
        <p className="mt-4 text-sm text-slate-500">
          No security events recorded yet — a quiet system is a good system.
        </p>
      )}
    </ArchiePage>
  );
}
