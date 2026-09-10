// =========================================================
// FRELUX ARCHIE PWA — EXECUTION CONSOLE (mobile)
//
// Owner's mobile surface for the ARCHIE Execution & Runtime
// Engine — identical audited backend (archie-execute):
//   1. Registry: authorized execution targets with
//      environment, risk class and Owner-Secret requirement.
//   2. Run: execute a registered target through the full
//      audited pipeline. PRODUCTION targets require the Owner
//      Secret — sent only in the request, verified server-
//      side, never stored on the device.
//   3. History: the immutable audit trail (redacted payloads,
//      service-role-written — humans only read).
//
// This page performs NO execution logic: every gate (verify,
// authority, timeout, retries, rollback, redaction, audit)
// runs server-side in the engine. The console cannot execute
// anything that is not registered and enabled.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  listExecutionTargets,
  runExecution,
  getExecutionHistory,
  type ExecutionTargetView,
  type ExecutionRunView,
} from "@/lib/archie/execution-client";

type Tab = "registry" | "run" | "history";

function envBadge(env: string) {
  if (env === "PRODUCTION")
    return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  if (env === "STAGING")
    return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
}

export default function ArchieExecution() {
  const [tab, setTab] = useState<Tab>("registry");

  // Auth
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  // Registry
  const [targets, setTargets] = useState<ExecutionTargetView[]>([]);

  // Run form
  const [targetKey, setTargetKey] = useState("");
  const [inputJson, setInputJson] = useState("{}");
  const [ownerSecret, setOwnerSecret] = useState("");
  const [outcome, setOutcome] = useState<Record<string, unknown> | null>(null);

  // History
  const [runs, setRuns] = useState<ExecutionRunView[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();
          setIsAdmin(profile?.role === "admin");
        }
      } catch {
        /* offline — leave gated */
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setError("");
    const [reg, hist] = await Promise.all([
      listExecutionTargets(),
      getExecutionHistory(25),
    ]);
    if (!reg.ok) setError(reg.error);
    else setTargets(reg.targets);
    if (!hist.ok) {
      if (!reg.ok) setError(hist.error);
    } else setRuns(hist.runs);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const selected = targets.find((t) => t.key === targetKey) ?? null;
  const needsSecret = selected?.requires_owner_secret ?? false;

  async function doRun() {
    setBusy(true);
    setOutcome(null);
    setError("");
    try {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(inputJson || "{}");
      } catch {
        setError("Input must be valid JSON.");
        return;
      }
      const res = await runExecution({
        targetKey,
        input,
        ownerSecret: ownerSecret || undefined,
      });
      setOutcome(res as Record<string, unknown>);
      const hist = await getExecutionHistory(25);
      if (hist.ok) setRuns(hist.runs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  }

  if (checked && !isAdmin)
    return (
      <div className="px-4 py-10 text-center text-sm text-slate-400">
        Owner access only.
      </div>
    );

  return (
    <div className="archie-fade-up mx-auto max-w-2xl px-4 py-4 md:py-6">
      <h1 className="archie-title-gradient text-lg font-semibold md:text-xl">
        Execution
      </h1>
      <p className="text-xs text-slate-400">
        The ARCHIE Execution &amp; Runtime Engine — registry-gated, audited,
        Owner-Secret protected. Every gate runs server-side.
      </p>

      {/* Tabs */}
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg archie-panel p-1">
        {(["registry", "run", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-2 py-2 text-xs font-medium capitalize ${
              tab === t ? "bg-brand-purple text-white" : "text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      {/* ---------------- Registry ---------------- */}
      {tab === "registry" && (
        <div className="mt-4 space-y-3">
          {targets.length === 0 && !error && (
            <p className="text-xs text-slate-500">
              No execution targets registered.
            </p>
          )}
          {targets.map((t) => (
            <div key={t.key} className="archie-panel rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-100">
                  {t.label}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${envBadge(t.environment)}`}
                >
                  {t.environment}
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                {t.key}
              </p>
              {t.description && (
                <p className="mt-1 text-xs text-slate-400">{t.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-slate-300">
                  {t.kind}
                </span>
                <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-slate-300">
                  {t.http_method}
                </span>
                <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-slate-300">
                  risk: {t.risk_class}
                </span>
                {t.requires_owner_secret ? (
                  <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-300">
                    Owner Secret required
                  </span>
                ) : (
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                    no secret
                  </span>
                )}
                {!t.enabled && (
                  <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-slate-400">
                    disabled
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- Run ---------------- */}
      {tab === "run" && (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-slate-300">
            Target
            <select
              value={targetKey}
              onChange={(e) => {
                setTargetKey(e.target.value);
                setOutcome(null);
              }}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">— select a registered target —</option>
              {targets.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} ({t.environment})
                </option>
              ))}
            </select>
          </label>

          {needsSecret && (
            <p className="rounded-md bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
              This is a PRODUCTION target. The Owner Secret is verified
              server-side for this run only — it is never stored on this device.
            </p>
          )}

          <label className="block text-xs font-medium text-slate-300">
            Input (JSON)
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              rows={4}
              spellCheck={false}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
            />
          </label>

          {needsSecret && (
            <label className="block text-xs font-medium text-slate-300">
              Owner Secret
              <input
                type="password"
                value={ownerSecret}
                onChange={(e) => setOwnerSecret(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          )}

          <button
            onClick={() => void doRun()}
            disabled={busy || !targetKey}
            className="w-full rounded-md bg-brand-purple px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Executing…" : "Execute"}
          </button>

          {outcome && (
            <div className="archie-panel rounded-lg p-3" data-testid="run-outcome">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-semibold ${
                    outcome.ok ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {String(outcome.status)}
                </span>
                <span className="text-[11px] text-slate-400">
                  {outcome.attempts != null ? `${outcome.attempts} attempt(s) · ` : ""}
                  {outcome.duration_ms != null ? `${outcome.duration_ms}ms` : ""}
                </span>
              </div>
              {typeof outcome.runId === "string" && (
                <p className="mt-1 font-mono text-[11px] text-slate-400">
                  run {outcome.runId}
                </p>
              )}
              {typeof outcome.error === "string" && outcome.error && (
                <p className="mt-1 text-xs text-rose-300">{outcome.error}</p>
              )}
              {outcome.result != null && (
                <pre className="mt-2 max-h-56 overflow-auto rounded bg-slate-900/70 p-2 font-mono text-[10px] text-slate-300">
                  {JSON.stringify(outcome.result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------- History ---------------- */}
      {tab === "history" && (
        <div className="mt-4 space-y-2">
          {runs.length === 0 && (
            <p className="text-xs text-slate-500">No execution runs yet.</p>
          )}
          {runs.map((r) => (
            <div
              key={r.id}
              className="archie-panel flex items-center justify-between gap-2 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-slate-200">
                  {r.target_key}
                </p>
                <p className="text-[10px] text-slate-500">
                  {new Date(r.created_date).toLocaleString()} · {r.initiator_system}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`text-[11px] font-semibold ${
                    r.status === "SUCCESS"
                      ? "text-emerald-300"
                      : r.status === "ROLLED_BACK" || r.status === "TIMEOUT"
                        ? "text-amber-300"
                        : r.status === "RUNNING" || r.status === "PENDING"
                          ? "text-sky-300"
                          : "text-rose-300"
                  }`}
                >
                  {r.status}
                </span>
                <span className="text-[10px] text-slate-500">
                  {r.environment} · {r.authority_method}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
