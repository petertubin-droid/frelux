// =========================================================
// FRELUX ARCHIE STAGE 1 — SECURITY CENTER
//
// Owner-visible audit trail (real events from archie-core
// and session actions), access-denied events and the
// security posture. No fabricated incidents (spec §12, §3).
// =========================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAuditEvents,
  type ArchieAuditEvent,
} from "@/lib/archie/stage1-client";
import {
  analyzeAuditEvents,
  type SecuritySentryReport,
} from "@/lib/archie/security-sentry";
import {
  registerTarget,
  inScope,
  OFFENSIVE_PHASES,
  type OffensiveTarget,
} from "@/lib/archie/offensive-security";
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

      <SentryAnalysis events={events} />
      <OffensiveScopePanel />
    </ArchiePage>
  );
}

// ---------------------------------------------------------
// Security sentry — deterministic analysis of the real audit
// events above. Signals cite evidence; recommendations are
// not authorizations.
// ---------------------------------------------------------
function SentryAnalysis({ events }: { events: ArchieAuditEvent[] }) {
  const [windowMinutes, setWindowMinutes] = useState(60);
  const report: SecuritySentryReport = useMemo(
    () => analyzeAuditEvents(events, windowMinutes),
    [events, windowMinutes],
  );

  const levelTone = (level: SecuritySentryReport["level"]) =>
    level === "OBSERVE"
      ? "positive"
      : level === "ALERT"
        ? "warning"
        : "critical";

  return (
    <section className="mt-8">
      <h2 className="archie-section-title text-sm font-semibold text-slate-200">
        Security sentry
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Deterministic analysis of the live audit trail — every signal cites the
        exact events it is based on. A recommendation is never an authorization:
        CONTAIN_CANDIDATE and OWNER_DECISION always wait for the Owner.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <ArchieBadge tone={levelTone(report.level)}>{report.level}</ArchieBadge>
        <span className="text-[11px] text-slate-500">
          {report.analyzedEvents} event(s) in window
        </span>
        <label className="ml-auto text-[11px] text-slate-500">
          Window (min):{" "}
          <input
            className="w-16 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-foreground"
            type="number"
            min={5}
            max={1440}
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(Number(e.target.value) || 60)}
            aria-label="Analysis window minutes"
          />
        </label>
      </div>
      {report.signals.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          No signals in this window — the sentry observes real events only,
          never fabricates incidents.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {report.signals.map((sig) => (
            <li key={sig.kind} className="archie-panel rounded-xl p-3">
              <div className="flex items-center gap-2">
                <ArchieBadge tone={levelTone(sig.level)}>
                  {sig.level}
                </ArchieBadge>
                <span className="text-sm font-medium text-slate-200">
                  {sig.kind}
                </span>
                <span className="text-[10px] text-slate-500">
                  {sig.evidenceCount} event(s)
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{sig.detail}</p>
              <p className="mt-1 text-xs text-amber-300">
                → {sig.recommendation}
              </p>
              {sig.evidence.length > 0 && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Evidence: {sig.evidence.slice(0, 3).join(" · ")}
                  {sig.evidence.length > 3 ? " …" : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-slate-500">{report.note}</p>
    </section>
  );
}

// ---------------------------------------------------------
// Offensive scope check — owner-registered targets and the
// inScope gate. Registration is a capability, not an
// authorization bypass: exclusions always win.
// ---------------------------------------------------------
function OffensiveScopePanel() {
  const [identifier, setIdentifier] = useState("");
  const [scope, setScope] = useState("www.frelux.tools");
  const [exclusions, setExclusions] = useState("");
  const [surface, setSurface] = useState("www.frelux.tools/api");
  const [target, setTarget] = useState<OffensiveTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  function register() {
    setError(null);
    setTarget(null);
    const result = registerTarget({
      kind: "FRELUX_INFRASTRUCTURE",
      identifier,
      scope: scope
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      exclusions: exclusions
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      registeredBy: "owner",
    });
    if (result.ok) setTarget(result.target);
    else setError(result.error);
  }

  return (
    <section className="mt-8">
      <h2 className="archie-section-title text-sm font-semibold text-slate-200">
        Offensive scope check
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Phases: {OFFENSIVE_PHASES.join(" → ")}. Every target — labs and CTF
        ranges included — must be registered by the Owner before intrusive
        phases run; external targets additionally need a live authorization
        record. Anything not explicitly in scope is out of scope.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-500">
            Target identifier
          </span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            aria-label="Target identifier"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-500">
            In-scope surfaces (one per line)
          </span>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground"
            rows={2}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            aria-label="In-scope surfaces"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-500">
            Exclusions (one per line, optional)
          </span>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground"
            rows={2}
            value={exclusions}
            onChange={(e) => setExclusions(e.target.value)}
            aria-label="Exclusions"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-500">
            Surface to check
          </span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            aria-label="Surface to check"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={!identifier.trim()}
        onClick={register}
        className="mt-2 rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
      >
        Register target & check scope
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
      {target && (
        <p
          role="status"
          className={`mt-2 text-xs ${inScope(target, surface) ? "text-emerald-300" : "text-amber-300"}`}
        >
          {inScope(target, surface)
            ? `“${surface}” is IN scope for target ${target.identifier}.`
            : `“${surface}” is OUT of scope for target ${target.identifier} — refused by default.`}
        </p>
      )}
    </section>
  );
}
