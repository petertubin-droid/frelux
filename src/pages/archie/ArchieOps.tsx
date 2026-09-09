// =========================================================
// FRELUX ARCHIE PWA — OPS CONSOLE (mobile)
//
// Owner's mobile surface for the Phase 8 P5 capabilities —
// identical backend to FRELUX Admin's Ops Console:
//   1. Internal Agents: spawn fleets (budget-gated), advance
//      lifecycle, terminate. Append-only audit trail.
//   2. Infrastructure Costs: month-to-date spend and budget
//      snapshot. These are FRELUX infrastructure costs,
//      NEVER user/subscriber credits.
//   3. Crypto Intelligence (Owner-only): live market fetch,
//      classified analysis recording with guardrails,
//      portfolio concentration risk.
//
// All writes are authorized server-side. ARCHIE cannot execute
// financial actions; predictions always carry the disclaimer.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  AGENT_ROLES,
  type InternalAgentRecord,
} from "@/lib/archie/internal-agents";
import {
  advanceAgent,
  budgetStatus,
  fetchCryptoMarket,
  portfolioRisk,
  recordCryptoAnalysis,
  spawnFleet,
} from "@/lib/archie/p5-client";

type Tab = "agents" | "budgets" | "crypto";

const CRYPTO_DISCLAIMER =
  "Analysis is informational, not financial advice. ARCHIE cannot execute financial actions.";

function naira(cents: number) {
  return `₦${(cents / 100).toFixed(2)}`;
}

function agentColor(status: string) {
  if (["EXECUTING", "MONITORING"].includes(status)) return "text-emerald-300";
  if (status === "REPORTING") return "text-sky-300";
  if (["TERMINATED", "FAILED"].includes(status)) return "text-slate-500";
  return "text-amber-300";
}

export default function ArchieOps() {
  const [tab, setTab] = useState<Tab>("agents");

  // Auth
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  // Agents
  const [agents, setAgents] = useState<InternalAgentRecord[]>([]);
  const [spawnRole, setSpawnRole] = useState(AGENT_ROLES[0]?.role ?? "");
  const [spawnTask, setSpawnTask] = useState("");

  // Budgets
  const [budgets, setBudgets] = useState<Awaited<
    ReturnType<typeof budgetStatus>
  > | null>(null);

  // Crypto
  const [market, setMarket] = useState<Array<Record<string, unknown>> | null>(
    null,
  );
  const [statement, setStatement] = useState("");
  const [classification, setClassification] = useState("ANALYSIS");
  const [holdings, setHoldings] = useState("BTC: 50000, ETH: 15000");
  const [risk, setRisk] = useState<Record<string, unknown> | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", auth.user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }
      setChecked(true);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { supabase } = await import("@/lib/supabase");
      const [agentRes, budget] = await Promise.all([
        supabase
          .from("frelux_archie_internal_agents")
          .select("*")
          .order("created_date", { ascending: false })
          .limit(30),
        budgetStatus(),
      ]);
      if (agentRes.data)
        setAgents(agentRes.data as unknown as InternalAgentRecord[]);
      setBudgets(budget);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ops data");
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function handleSpawn() {
    if (!spawnTask.trim() || !spawnRole) {
      setError("Pick a role and describe the task");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const role = AGENT_ROLES.find((r) => r.role === spawnRole);
      const res = await spawnFleet([
        {
          role: spawnRole,
          task: spawnTask.trim(),
          permissions: [...(role?.required_permissions ?? [])],
        },
      ]);
      setNotice(
        `Spawned ${res.spawned?.length ?? 0} agent — decision: ${res.decision}`,
      );
      setSpawnTask("");
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Spawn failed (budget gate may have rejected it)",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance(
    id: string,
    event:
      | "AUTHORIZE"
      | "ASSIGN"
      | "EXECUTE"
      | "MONITOR"
      | "REPORT"
      | "TERMINATE"
      | "FAIL",
  ) {
    setBusy(true);
    setError("");
    try {
      const res = await advanceAgent(id, event);
      if (res.ok) setNotice(`Agent ${event.toLowerCase()} recorded`);
      else
        setError(res.status ? `Rejected: ${res.status}` : "Transition failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleMarket() {
    setBusy(true);
    setError("");
    try {
      const res = await fetchCryptoMarket(["BTC", "ETH", "SOL"]);
      setMarket(res.assets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Market fetch failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordAnalysis() {
    if (!statement.trim()) {
      setError("Write the analysis statement first");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await recordCryptoAnalysis({
        asset_symbol: "BTC",
        classification,
        statement: statement.trim(),
        confidence: 0.7,
        evidence: ["Owner-issued from ARCHIE PWA"],
      });
      setNotice(
        `Analysis recorded (${res.ok ? "ok" : "pending"}), guardrails applied.`,
      );
      setStatement("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record analysis");
    } finally {
      setBusy(false);
    }
  }

  async function handleRisk() {
    setBusy(true);
    setError("");
    try {
      const parsed = holdings
        .split(",")
        .map((s) => s.split(":").map((p) => p.trim()))
        .filter((kv) => kv.length === 2)
        .map(([symbol, value]) => ({ symbol, value: Number(value) || 0 }));
      const res = await portfolioRisk(parsed);
      setRisk(res as unknown as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Risk calculation failed");
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
        Operations
      </h1>
      <p className="text-xs text-slate-400">
        Internal agents, infrastructure budgets and crypto intelligence — the
        same data as the FRELUX Admin Ops Console.
      </p>

      {/* Tabs */}
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg archie-panel p-1">
        {(["agents", "budgets", "crypto"] as Tab[]).map((t) => (
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
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {notice}
        </p>
      )}

      {/* ── Agents ── */}
      {tab === "agents" && (
        <div className="mt-4 space-y-3">
          <div className="space-y-2 rounded-xl archie-panel p-3">
            <p className="text-xs font-medium text-slate-200">Spawn an agent</p>
            <select
              value={spawnRole}
              onChange={(e) => setSpawnRole(e.target.value)}
              className="w-full rounded-lg archie-input px-3 py-2.5 text-sm text-slate-100"
              aria-label="Agent role"
            >
              {AGENT_ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.role}
                </option>
              ))}
            </select>
            <input
              value={spawnTask}
              onChange={(e) => setSpawnTask(e.target.value)}
              placeholder="Task description"
              className="w-full rounded-lg archie-input px-3 py-2.5 text-sm text-slate-100"
            />
            <button
              onClick={() => void handleSpawn()}
              disabled={busy}
              className="w-full rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Working…" : "Spawn (budget-gated)"}
            </button>
          </div>

          <ul className="space-y-2">
            {agents.map((a) => (
              <li key={a.id} className="rounded-xl archie-panel p-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                    {a.display_name || a.role}
                  </span>
                  <span className={`text-[10px] ${agentColor(a.status)}`}>
                    {a.status}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">
                  {a.task}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  est {naira(a.estimated_cost_cents)} · actual{" "}
                  {naira(a.actual_cost_cents ?? 0)}
                </p>
                {!["TERMINATED", "FAILED"].includes(a.status) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.status === "CREATED" && (
                      <button
                        onClick={() => void handleAdvance(a.id, "AUTHORIZE")}
                        disabled={busy}
                        className="rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 disabled:opacity-50"
                      >
                        Authorize
                      </button>
                    )}
                    {a.status === "AUTHORIZED" && (
                      <button
                        onClick={() => void handleAdvance(a.id, "ASSIGN")}
                        disabled={busy}
                        className="rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 disabled:opacity-50"
                      >
                        Assign
                      </button>
                    )}
                    {a.status === "ASSIGNED" && (
                      <button
                        onClick={() => void handleAdvance(a.id, "EXECUTE")}
                        disabled={busy}
                        className="rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 disabled:opacity-50"
                      >
                        Execute
                      </button>
                    )}
                    <button
                      onClick={() => void handleAdvance(a.id, "TERMINATE")}
                      disabled={busy}
                      className="rounded-md bg-red-600/70 px-2.5 py-1.5 text-[11px] text-white disabled:opacity-50"
                    >
                      Terminate
                    </button>
                  </div>
                )}
              </li>
            ))}
            {!agents.length && !error && (
              <li className="py-4 text-center text-xs text-slate-500">
                No agents yet — spawn the first one above.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ── Budgets ── */}
      {tab === "budgets" && budgets && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl archie-panel p-3">
            <p className="text-xs font-medium text-slate-200">
              Month-to-date infrastructure spend
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">
              {naira(budgets.month_to_date_spend_cents)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {budgets.active_agents} active agent(s) · infrastructure costs,
              never user credits
            </p>
          </div>
          {budgets.budgets.map((b) => (
            <div key={b.provider} className="rounded-xl archie-panel p-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-slate-100">
                  {b.provider}
                </span>
                <span
                  className={`text-[10px] ${b.active ? "text-emerald-300" : "text-slate-500"}`}
                >
                  {b.active ? "active" : "inactive"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <p>
                  Monthly:{" "}
                  <span className="text-slate-200">
                    {naira(b.monthly_budget_cents)}
                  </span>
                </p>
                <p>
                  Concurrency:{" "}
                  <span className="text-slate-200">{b.concurrency_limit}</span>
                </p>
                <p>
                  Rate:{" "}
                  <span className="text-slate-200">
                    {b.rate_limit_per_minute}/min
                  </span>
                </p>
                <p>
                  Emergency:{" "}
                  <span className="text-slate-200">
                    {b.emergency_threshold_pct}%
                  </span>
                </p>
                <p className="col-span-2">
                  Exhaustion policy:{" "}
                  <span className="text-slate-200">{b.exhaustion_policy}</span>
                </p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-slate-500">
            Budget configuration (monthly amounts, concurrency, emergency
            thresholds) is editable from the FRELUX Admin Ops Console — the same
            record; both interfaces read the same state.
          </p>
        </div>
      )}

      {/* ── Crypto ── */}
      {tab === "crypto" && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl archie-panel p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-200">Live market</p>
              <button
                onClick={() => void handleMarket()}
                disabled={busy}
                className="rounded-md bg-white/10 px-3 py-1.5 text-[11px] text-slate-200 disabled:opacity-50"
              >
                Fetch BTC/ETH/SOL
              </button>
            </div>
            {market && (
              <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                {market.map((m, i) => (
                  <li key={i} className="truncate">
                    {String(m.symbol ?? m.asset ?? "?")}:{" "}
                    {String(m.price_usd ?? m.price ?? "?")}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 rounded-xl archie-panel p-3">
            <p className="text-xs font-medium text-slate-200">
              Record an analysis (with guardrails)
            </p>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full rounded-lg archie-input px-3 py-2.5 text-sm text-slate-100"
              aria-label="Classification"
            >
              {["ANALYSIS", "OBSERVATION", "PREDICTION", "RISK_WARNING"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ),
              )}
            </select>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Analysis statement…"
              rows={3}
              className="w-full rounded-lg archie-input px-3 py-2.5 text-sm text-slate-100"
            />
            <button
              onClick={() => void handleRecordAnalysis()}
              disabled={busy}
              className="w-full rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Record
            </button>
          </div>

          <div className="space-y-2 rounded-xl archie-panel p-3">
            <p className="text-xs font-medium text-slate-200">
              Portfolio concentration risk
            </p>
            <input
              value={holdings}
              onChange={(e) => setHoldings(e.target.value)}
              placeholder="BTC: 50000, ETH: 15000"
              className="w-full rounded-lg archie-input px-3 py-2.5 text-sm text-slate-100"
            />
            <button
              onClick={() => void handleRisk()}
              disabled={busy}
              className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-50"
            >
              Calculate risk
            </button>
            {risk && (
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-2 text-[10px] text-slate-300">
                {JSON.stringify(risk, null, 1).slice(0, 1500)}
              </pre>
            )}
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">
            {CRYPTO_DISCLAIMER} Every recorded analysis keeps its provenance and
            classification; the guardrail chain is enforced server-side.
          </p>
        </div>
      )}
    </div>
  );
}
