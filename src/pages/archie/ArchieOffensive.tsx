// =========================================================
// ARCHIE OFFENSIVE SECURITY SCREEN (batch 21, fix 72, 2026-09-15)
//
// Owner-only operator surface for the offensive-security
// engine (src/lib/archie/offensive-security.ts — the 8-phase
// engagement lifecycle: DISCOVER -> ENUMERATE -> ANALYZE ->
// TEST -> EXPLOIT -> DOCUMENT -> REMEDIATE -> RETEST).
//
// Honesty rules (same as the engine and its tables):
//   * Every environment must be REGISTERED before intrusive
//     phases may run against it.
//   * Findings REQUIRE non-empty evidence — no evidence, no
//     finding. No fake security results, ever.
//   * OWNER_AUTHORIZED_EXTERNAL targets need a LIVE owner
//     authorization record (archie_global_authorizations)
//     before TEST/EXPLOIT phases — the screen shows refusals
//     verbatim.
//   * Exclusions are honoured over scope, always.
//   * fix_status becomes RESOLVED only with RETEST evidence.
//   * Data flows through admin-only RLS policies; the pure
//     engine functions validate every transition.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  advancePhase,
  OFFENSIVE_PHASES,
  registerTarget,
  recordFinding,
  startEngagement,
  type Engagement,
  type OffensiveFinding,
  type OffensivePhase,
  type OffensiveTarget,
} from "@/lib/archie/offensive-security";
import { AuthorizationRegistry } from "@/lib/archie/capability-authority";

type Tab = "targets" | "engagements" | "findings";

interface TargetRow {
  id: string;
  kind: OffensiveTarget["kind"];
  identifier: string;
  scope: string[];
  exclusions: string[] | null;
  registered_at: string;
}

interface EngagementRow {
  id: string;
  target_id: string;
  current_phase: OffensivePhase;
  phases: Record<string, { phase: string; status: string; notes: string[] }>;
  started_at: string;
}

interface FindingRow {
  id: string;
  engagement_id: string;
  target_id: string;
  phase: string;
  title: string;
  severity: OffensiveFinding["severity"];
  category: string;
  evidence: string[];
  remediation: string | null;
  fix_status: "OPEN" | "RESOLVED" | "NOT_VERIFIED";
  created_at: string;
}

const KINDS: OffensiveTarget["kind"][] = [
  "FRELUX_INFRASTRUCTURE",
  "ARCHIE_INFRASTRUCTURE",
  "DEDICATED_LAB",
  "CTF_ENVIRONMENT",
  "OWNER_AUTHORIZED_EXTERNAL",
];

function rowToTarget(r: TargetRow): OffensiveTarget {
  return {
    id: r.id,
    kind: r.kind,
    identifier: r.identifier,
    scope: r.scope ?? [],
    exclusions: r.exclusions ?? [],
    registeredAt: r.registered_at,
    registeredBy: "owner",
  };
}

export default function ArchieOffensive() {
  const [tab, setTab] = useState<Tab>("targets");
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [engagements, setEngagements] = useState<EngagementRow[]>([]);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Target form
  const [kind, setKind] = useState<OffensiveTarget["kind"]>("DEDICATED_LAB");
  const [identifier, setIdentifier] = useState("");
  const [scope, setScope] = useState("");
  const [exclusions, setExclusions] = useState("");

  // Finding form
  const [findingEngagement, setFindingEngagement] = useState("");
  const [findingPhase, setFindingPhase] = useState<OffensivePhase>("ANALYZE");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] =
    useState<OffensiveFinding["severity"]>("MEDIUM");
  const [category, setCategory] = useState("");
  const [evidence, setEvidence] = useState("");
  const [remediation, setRemediation] = useState("");

  // Advance form (per engagement)
  const [advanceOp, setAdvanceOp] = useState("");

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [t, e, f] = await Promise.all([
        supabase
          .from("archie_offensive_targets")
          .select("id,kind,identifier,scope,exclusions,registered_at"),
        supabase
          .from("archie_offensive_engagements")
          .select("id,target_id,current_phase,phases,started_at")
          .order("started_at", { ascending: false }),
        supabase
          .from("archie_offensive_findings")
          .select(
            "id,engagement_id,target_id,phase,title,severity,category,evidence,remediation,fix_status,created_at",
          )
          .order("created_at", { ascending: false }),
      ]);
      if (t.error) throw new Error(t.error.message);
      if (e.error) throw new Error(e.error.message);
      if (f.error) throw new Error(f.error.message);
      setTargets((t.data as unknown as TargetRow[]) ?? []);
      setEngagements((e.data as unknown as EngagementRow[]) ?? []);
      setFindings((f.data as unknown as FindingRow[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /** Load the live owner authorization records into the
   * runtime registry (DB is source of truth). */
  const loadRegistry = useCallback(async () => {
    const reg = new AuthorizationRegistry();
    const { data, error: e } = await supabase
      .from("archie_global_authorizations")
      .select("id,authority,scope,granted_at,expires_at,evidence,revoked_at");
    if (e) throw new Error(e.message);
    for (const r of (data ?? []) as Array<{
      id: string;
      authority: Parameters<AuthorizationRegistry["grant"]>[0]["authority"];
      evidence: string | null;
      scope: string;
      granted_at: string;
      expires_at: string;
      revoked_at: string | null;
    }>) {
      if (r.revoked_at) continue;
      reg.grant({
        id: r.id,
        authority: r.authority,
        scope: r.scope,
        granted_at: Date.parse(r.granted_at),
        expires_at: Date.parse(r.expires_at),
        evidence: r.evidence ?? "",
      });
    }
    return reg;
  }, []);

  const onRegisterTarget = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const scopeList = scope
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const exclList = exclusions
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const reg = registerTarget({
        kind,
        identifier,
        scope: scopeList,
        exclusions: exclList,
        registeredBy: "owner",
      });
      if (!reg.ok) {
        setError(reg.error);
        return;
      }
      const { error: e } = await supabase
        .from("archie_offensive_targets")
        .insert({
          id: reg.target.id,
          kind: reg.target.kind,
          identifier: reg.target.identifier,
          scope: reg.target.scope,
          exclusions: reg.target.exclusions ?? [],
          registered_by: (await supabase.auth.getUser()).data.user?.id,
        });
      if (e) throw new Error(e.message);
      setNotice(
        `Target registered: ${reg.target.identifier}. Intrusive phases still require live authorization records.`,
      );
      setIdentifier("");
      setScope("");
      setExclusions("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onStartEngagement = async (targetRow: TargetRow) => {
    setBusy(true);
    setError(null);
    try {
      const target = rowToTarget(targetRow);
      const started = startEngagement(target);
      if (!started.ok) {
        setError(started.error);
        return;
      }
      const eng = started.engagement;
      const { error: e } = await supabase
        .from("archie_offensive_engagements")
        .insert({
          id: eng.id,
          target_id: eng.target.id,
          current_phase: eng.currentPhase,
          phases: eng.phases,
        });
      if (e) throw new Error(e.message);
      setNotice(
        `Engagement ${eng.id} started at DISCOVER (passive). Advance phases only with live authorization in place.`,
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onAdvance = async (engRow: EngagementRow) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const targetRow = targets.find((t) => t.id === engRow.target_id);
      if (!targetRow) throw new Error("target for this engagement is missing");
      const target = rowToTarget(targetRow);
      const engagement: Engagement = {
        id: engRow.id,
        target,
        currentPhase: engRow.current_phase,
        phases: engRow.phases as unknown as Engagement["phases"],
        findings: [],
        startedAt: engRow.started_at,
      };
      const registry = await loadRegistry();
      const res = advancePhase(engagement, registry, {
        operation: advanceOp || "advance to the next lifecycle phase",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const { error: e } = await supabase
        .from("archie_offensive_engagements")
        .update({
          current_phase: res.engagement.currentPhase,
          phases: res.engagement.phases,
          updated_date: new Date().toISOString(),
        })
        .eq("id", engRow.id);
      if (e) throw new Error(e.message);
      setNotice(
        `Engagement ${engRow.id} advanced to ${res.engagement.currentPhase}.`,
      );
      setAdvanceOp("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onRecordFinding = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const engRow = engagements.find((e) => e.id === findingEngagement);
      if (!engRow)
        throw new Error("select the engagement this finding belongs to");
      const targetRow = targets.find((t) => t.id === engRow.target_id);
      if (!targetRow) throw new Error("target for this engagement is missing");
      const target = rowToTarget(targetRow);
      const engagement: Engagement = {
        id: engRow.id,
        target,
        currentPhase: engRow.current_phase,
        phases: engRow.phases as unknown as Engagement["phases"],
        findings: [],
        startedAt: engRow.started_at,
      };
      const evidenceList = evidence
        .split(/\n---\n/)
        .map((e) => e.trim())
        .filter(Boolean);
      const res = recordFinding(engagement, {
        phase: findingPhase,
        title,
        severity,
        category: category || "OTHER",
        evidence: evidenceList,
        remediation: remediation || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const finding = res.finding;
      const { error: e } = await supabase
        .from("archie_offensive_findings")
        .insert({
          id: finding.id,
          engagement_id: engagement.id,
          target_id: target.id,
          phase: finding.phase,
          title: finding.title,
          severity: finding.severity,
          category: finding.category,
          evidence: finding.evidence,
          remediation: finding.remediation ?? null,
          fix_status: finding.fixStatus,
        });
      if (e) throw new Error(e.message);
      setNotice(
        `Finding recorded with ${evidenceList.length} evidence item(s). No evidence = no finding — the gate held.`,
      );
      setTitle("");
      setCategory("");
      setEvidence("");
      setRemediation("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Offensive Security</h1>
        <p className="text-sm text-muted-foreground">
          Authorized ethical hacking — the 8-phase engagement lifecycle with
          registered targets, live authorization gates and evidence-backed
          findings. No fake security results: a finding exists only with real
          evidence.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <nav className="flex gap-2">
        {(["targets", "engagements", "findings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "border"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Targets */}
      {tab === "targets" && (
        <div className="space-y-4">
          <section className="grid gap-3 rounded-md border p-4">
            <h2 className="font-semibold">Register a target</h2>
            <label className="text-sm">
              Environment kind
              <select
                className="mt-1 w-full rounded-md border px-2 py-1"
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as OffensiveTarget["kind"])
                }
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Identifier (URL, hostname, IP range, repo path, environment id)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </label>
            <label className="text-sm">
              In-scope surfaces (comma or newline separated — anything not
              listed is out of scope)
              <textarea
                className="mt-1 h-16 w-full rounded-md border px-2 py-1"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Exclusions (honoured over scope, always)
              <textarea
                className="mt-1 h-14 w-full rounded-md border px-2 py-1"
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
              />
            </label>
            <button
              disabled={busy}
              onClick={onRegisterTarget}
              className="w-fit rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-40"
            >
              Register target
            </button>
          </section>
          <section className="rounded-md border p-4">
            <h2 className="mb-2 font-semibold">
              Registered targets ({targets.length})
            </h2>
            {targets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No targets registered. Every environment — labs and CTF ranges
                included — must be registered before intrusive phases may run
                against it.
              </p>
            )}
            <ul className="space-y-2">
              {targets.map((t) => (
                <li key={t.id} className="rounded-md border p-2 text-sm">
                  <span className="font-medium">{t.identifier}</span>{" "}
                  <span className="text-muted-foreground">({t.kind})</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    scope: {t.scope?.join(", ")}
                    {t.exclusions && t.exclusions.length > 0
                      ? ` · excluded: ${t.exclusions.join(", ")}`
                      : ""}
                  </span>
                  <button
                    disabled={busy}
                    onClick={() => onStartEngagement(t)}
                    className="ml-2 rounded-md border px-2 py-0.5 text-xs disabled:opacity-40"
                  >
                    Start engagement
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* Engagements */}
      {tab === "engagements" && (
        <div className="space-y-4">
          <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
            DISCOVER is passive. TEST/EXPLOIT against external targets require a
            LIVE owner authorization record covering the target — refusals are
            shown verbatim, never bypassed.
          </p>
          {engagements.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No engagements. Start one from a registered target.
            </p>
          )}
          <ul className="space-y-3">
            {engagements.map((e) => {
              const target = targets.find((t) => t.id === e.target_id);
              return (
                <li key={e.id} className="rounded-md border p-3">
                  <p className="text-sm">
                    <span className="font-medium">{e.id}</span> —{" "}
                    {target?.identifier ?? e.target_id}
                  </p>
                  <p className="mt-1 text-sm">
                    Current phase:{" "}
                    <span className="font-medium">{e.current_phase}</span>
                  </p>
                  {/* Phase rail */}
                  <ol className="mt-2 flex flex-wrap gap-1 text-xs">
                    {OFFENSIVE_PHASES.map((p) => {
                      const st = e.phases?.[p]?.status ?? "PENDING";
                      return (
                        <li
                          key={p}
                          className={`rounded px-1.5 py-0.5 ${
                            st === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : st === "IN_PROGRESS"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      className="w-64 rounded-md border px-2 py-1 text-xs"
                      placeholder="What will the next phase do?"
                      value={advanceOp}
                      onChange={(ev) => setAdvanceOp(ev.target.value)}
                    />
                    <button
                      disabled={busy || e.current_phase === "RETEST"}
                      onClick={() => onAdvance(e)}
                      className="rounded-md border px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Advance phase
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Findings */}
      {tab === "findings" && (
        <div className="space-y-4">
          <section className="grid gap-3 rounded-md border p-4">
            <h2 className="font-semibold">Record a finding</h2>
            <label className="text-sm">
              Engagement
              <select
                className="mt-1 w-full rounded-md border px-2 py-1"
                value={findingEngagement}
                onChange={(e) => setFindingEngagement(e.target.value)}
              >
                <option value="">— select —</option>
                {engagements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id} (
                    {targets.find((t) => t.id === e.target_id)?.identifier ??
                      e.target_id}
                    )
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Phase
              <select
                className="mt-1 w-full rounded-md border px-2 py-1"
                value={findingPhase}
                onChange={(e) =>
                  setFindingPhase(e.target.value as OffensivePhase)
                }
              >
                {(
                  ["ENUMERATE", "ANALYZE", "TEST", "EXPLOIT", "RETEST"] as const
                ).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Title (plain and specific)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                placeholder="e.g. SQL injection in /api/quotes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Severity
              <select
                className="mt-1 w-full rounded-md border px-2 py-1"
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as OffensiveFinding["severity"])
                }
              >
                {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm">
              Category (e.g. AUTHZ_WEAKNESS)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Evidence (one item per line, separated by ——— lines; REQUIRED — no
              evidence, no finding)
              <textarea
                className="mt-1 h-24 w-full rounded-md border px-2 py-1 font-mono text-xs"
                placeholder={
                  "GET /api/quotes?x=1' → 500 stack trace\n---\ntool output excerpt"
                }
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Remediation
              <textarea
                className="mt-1 h-16 w-full rounded-md border px-2 py-1"
                value={remediation}
                onChange={(e) => setRemediation(e.target.value)}
              />
            </label>
            <button
              disabled={busy}
              onClick={onRecordFinding}
              className="w-fit rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-40"
            >
              Record finding
            </button>
          </section>
          <section className="rounded-md border p-4">
            <h2 className="mb-2 font-semibold">Findings ({findings.length})</h2>
            {findings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No findings recorded. Findings require real evidence — an empty
                evidence list is refused by the engine.
              </p>
            )}
            <ul className="space-y-2">
              {findings.map((f) => (
                <li key={f.id} className="rounded-md border p-2 text-sm">
                  <span
                    className={
                      f.severity === "CRITICAL" || f.severity === "HIGH"
                        ? "font-medium text-red-600"
                        : "font-medium"
                    }
                  >
                    [{f.severity}] {f.title}
                  </span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {f.category} · {f.phase} · {f.evidence?.length ?? 0}{" "}
                    evidence item(s) · fix: {f.fix_status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
