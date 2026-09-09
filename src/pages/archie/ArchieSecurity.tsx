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

function severityColor(s: ArchieAuditEvent["severity"]) {
  if (s === "CRITICAL") return "text-red-300";
  if (s === "WARNING") return "text-amber-300";
  return "text-slate-400";
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 md:py-6">
      <h1 className="text-lg font-semibold text-slate-100">Security</h1>
      <p className="text-xs text-slate-400">
        Server-side authorization, audit logging and revocation. ARCHIE is
        Owner-only — every non-admin access attempt is recorded below.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Posture
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              critical > 0
                ? "text-red-300"
                : warnings > 0
                  ? "text-amber-300"
                  : "text-emerald-300"
            }`}
          >
            {critical > 0 ? "CRITICAL" : warnings > 0 ? "WARNING" : "NORMAL"}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Warnings
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {warnings}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Events
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {events.length}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading audit trail…</p>
      )}

      <ul className="mt-4 space-y-1.5">
        {events.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-medium ${severityColor(e.severity)}`}
              >
                {e.severity}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                {e.event_type}
              </span>
              <span className="text-[10px] text-slate-500">
                {new Date(e.created_date).toLocaleString()}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {!loading && events.length === 0 && !error && (
        <p className="mt-4 text-sm text-slate-500">
          No security events recorded yet — a quiet system is a good system.
        </p>
      )}
    </div>
  );
}
