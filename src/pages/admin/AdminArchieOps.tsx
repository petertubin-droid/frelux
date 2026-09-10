// =========================================================
// FRELUX PHASE 8 P5, ADMIN ARCHIE OPS CONSOLE
//
// Owner/Admin console for the Phase 8 P5 capabilities:
//   1. Internal Agents: spawn fleets (budget-gated), advance
//      lifecycle, terminate. Append-only audit trail visible.
//   2. Infrastructure Costs: month-to-date internal provider
//      spend, budget configuration (monthly, concurrency,
//      rate limit, emergency threshold, exhaustion policy).
//      These costs are FRELUX infrastructure costs, NEVER
//      user/subscriber credits.
//   3. Crypto Intelligence (Owner-only): live market fetch
//      with provenance, classified analysis recording with
//      mandatory guardrails, portfolio concentration risk.
//
// All writes are authorized server-side. ARCHIE cannot execute
// financial actions; predictions always carry the disclaimer.
// =========================================================
import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  Loader2,
  AlertCircle,
  Bot,
  Wallet,
  LineChart,
  Plus,
  RefreshCw,
  Ban,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
} from "@/components/admin/AdminUi";
import { AGENT_ROLES } from "@/lib/archie/internal-agents";
import {
  budgetStatus,
  spawnFleet,
  advanceAgent,
  recordCryptoAnalysis,
  fetchCryptoMarket,
  portfolioRisk,
} from "@/lib/archie/p5-client";
import type { InternalAgentRecord } from "@/lib/archie/internal-agents";
import {
  fetchArchieStatus,
  buildSystemsRegistry,
  type SystemSection,
} from "@/lib/archie/status";

type BudgetStatus = Awaited<ReturnType<typeof budgetStatus>>;
type RiskReport = Awaited<ReturnType<typeof portfolioRisk>>["report"];

type Tab = "agents" | "costs" | "systems" | "crypto";

interface AgentRow {
  id: string;
  role: string;
  display_name: string;
  status: string;
  task: string;
  estimated_cost_cents: number;
  actual_cost_cents: number;
  created_date: string;
}

const CLASSIFICATIONS = [
  "LIVE_MARKET_DATA",
  "OBSERVED_INFORMATION",
  "ANALYSIS",
  "RISK_ASSESSMENT",
  "RECOMMENDATION",
  "PREDICTION",
];

function fmtCents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

export default function AdminArchieOps() {
  const [tab, setTab] = useState<Tab>("agents");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Agents + budgets state
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetStatus | null>(null);
  const [spend, setSpend] = useState(0);
  const [activeAgents, setActiveAgents] = useState(0);
  const [spawnRole, setSpawnRole] = useState("code_analysis");
  const [spawnTask, setSpawnTask] = useState("");
  const [spawnEstimate, setSpawnEstimate] = useState("50");

  // Crypto state
  const [assets, setAssets] = useState<
    Array<{ symbol: string; name: string; is_active: boolean }>
  >([]);
  const [market, setMarket] = useState<Array<Record<string, unknown>> | null>(
    null,
  );
  const [assetSymbol, setAssetSymbol] = useState("BTC");
  const [classification, setClassification] = useState("ANALYSIS");
  const [statement, setStatement] = useState("");
  const [confidence, setConfidence] = useState("0.7");
  const [holdings, setHoldings] = useState("BTC: 50000, ETH: 15000");
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null);

  const loadAgents = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("frelux_archie_internal_agents")
      .select("*")
      .order("created_date", { ascending: false })
      .limit(50);
    if (e) setError(e.message);
    else setAgents((data ?? []) as unknown as AgentRow[]);
  }, []);

  const loadBudgets = useCallback(async () => {
    try {
      const s = await budgetStatus();
      setBudgets(s);
      setSpend(s.month_to_date_spend_cents);
      setActiveAgents(s.active_agents);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const loadAssets = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("frelux_archie_crypto_assets")
      .select("symbol,name,is_active")
      .order("symbol");
    if (e) setError(e.message);
    else setAssets(data ?? []);
  }, []);

  useEffect(() => {
    loadAgents();
    loadBudgets();
    loadAssets();
  }, [loadAgents, loadBudgets, loadAssets]);

  const run = useCallback(async (fn: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const msg = await fn();
      setNotice(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSpawn = () =>
    run(async () => {
      const est = Math.max(0, parseInt(spawnEstimate, 10) || 0);
      const res = await spawnFleet([
        { role: spawnRole, task: spawnTask, estimated_cost_cents: est },
      ]);
      await loadAgents();
      await loadBudgets();
      return `Agent spawned (${res.decision}). Month spend: ${fmtCents(res.month_to_date_spend_cents)}.`;
    });

  const handleLifecycle = (
    agentId: string,
    event: Parameters<typeof advanceAgent>[1],
  ) =>
    run(async () => {
      await advanceAgent(agentId, event);
      await loadAgents();
      await loadBudgets();
      return `Agent ${event}d.`;
    });

  const handleMarket = () =>
    run(async () => {
      const res = await fetchCryptoMarket(
        assets.filter((a) => a.is_active).map((a) => a.symbol),
      );
      setMarket(res.assets);
      return `Live ${res.classification} fetched and recorded with provenance.`;
    });

  const handleAnalysis = () =>
    run(async () => {
      const res = await recordCryptoAnalysis({
        asset_symbol: assetSymbol,
        classification,
        statement,
        confidence: parseFloat(confidence) || undefined,
      });
      return `Analysis recorded as ${res.classification}${res.disclaimer_appended ? " (disclaimer appended)" : ""}.`;
    });

  const handleRisk = () =>
    run(async () => {
      const parsed = holdings
        .split(/[,\n]/)
        .map((line) => line.split(":").map((s) => s.trim()))
        .filter(([sym, val]) => sym && val)
        .map(([sym, val]) => ({ symbol: sym, value: parseFloat(val) || 0 }));
      const res = await portfolioRisk(parsed);
      setRiskReport(res.report);
      return `Portfolio risk: ${res.report.concentration} (HHI ${res.report.hhi}).`;
    });

  return (
    <div>
      <AdminHeader
        title="ARCHIE Ops"
        subtitle="Internal agent orchestration, infrastructure cost governance and owner-only crypto intelligence. Internal provider costs are FRELUX infrastructure costs, never user credits."
      />

      {(error || notice) && (
        <div className="mb-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
              <Brain className="h-4 w-4" aria-hidden />
              {notice}
            </div>
          )}
        </div>
      )}

      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="ARCHIE Ops sections"
      >
        {(
          [
            ["agents", "Internal Agents", Bot],
            ["costs", "Infrastructure Costs", Wallet],
            ["systems", "Systems Registry", RefreshCw],
            ["crypto", "Crypto Intelligence", LineChart],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "agents" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <AdminCard className="lg:col-span-1">
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Spawn internal agent
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Budget-gated: the server refuses spawns beyond the configured
              monthly budget, concurrency or emergency threshold. No arbitrary
              ceiling, real limits only.
            </p>
            <AdminField label="Role">
              <AdminSelect
                value={spawnRole}
                onChange={(e) => setSpawnRole(e.target.value)}
              >
                {AGENT_ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label} ({r.role})
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Task">
              <AdminTextarea
                value={spawnTask}
                onChange={(e) => setSpawnTask(e.target.value)}
                rows={3}
                placeholder="e.g. Audit rewarded-ad postback verification paths"
              />
            </AdminField>
            <AdminField label="Estimated cost (cents)">
              <AdminInput
                type="number"
                min={0}
                value={spawnEstimate}
                onChange={(e) => setSpawnEstimate(e.target.value)}
              />
            </AdminField>
            <AdminButton
              onClick={handleSpawn}
              disabled={busy || !spawnTask.trim()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Spawn
            </AdminButton>
          </AdminCard>

          <AdminCard className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold">
                Agent registry
              </h3>
              <span className="text-xs text-muted-foreground">
                Month spend: {fmtCents(spend)} · Active: {activeAgents}
              </span>
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto">
              {agents.length === 0 && (
                <p className="text-sm text-muted-foreground">No agents yet.</p>
              )}
              {agents.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {a.display_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.task}
                      </p>
                    </div>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {a.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.status === "AUTHORIZED" && (
                      <AdminButton
                        onClick={() => handleLifecycle(a.id, "ASSIGN")}
                      >
                        Assign
                      </AdminButton>
                    )}
                    {a.status === "ASSIGNED" && (
                      <AdminButton
                        onClick={() => handleLifecycle(a.id, "EXECUTE")}
                      >
                        Execute
                      </AdminButton>
                    )}
                    {a.status === "EXECUTING" && (
                      <AdminButton
                        onClick={() => handleLifecycle(a.id, "MONITOR")}
                      >
                        Monitor
                      </AdminButton>
                    )}
                    {a.status === "MONITORING" && (
                      <AdminButton
                        onClick={() => handleLifecycle(a.id, "REPORT")}
                      >
                        Report
                      </AdminButton>
                    )}
                    {a.status === "REPORTING" && (
                      <AdminButton
                        onClick={() => handleLifecycle(a.id, "TERMINATE")}
                      >
                        Terminate
                      </AdminButton>
                    )}
                    {[
                      "CREATED",
                      "AUTHORIZED",
                      "ASSIGNED",
                      "EXECUTING",
                      "MONITORING",
                    ].includes(a.status) && (
                      <AdminButton
                        onClick={() => handleLifecycle(a.id, "TERMINATE")}
                      >
                        <Ban className="h-4 w-4" aria-hidden />
                        Terminate now
                      </AdminButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "costs" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminCard>
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Budget controls
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Internal ARCHIE provider costs land on a dedicated FRELUX
              infrastructure ledger. User, subscriber and API-customer credits
              are structurally never touched. Configure budgets below; when
              exhausted, agents queue, reduce, consolidate or stop per policy.
            </p>
            {budgets?.budgets.map((b) => (
              <div
                key={b.provider}
                className="mb-3 rounded-xl border border-border bg-background p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {b.provider === "*" ? "Global" : b.provider}
                  </span>
                  <span className="text-muted-foreground">
                    {fmtCents(spend)} / {fmtCents(b.monthly_budget_cents)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Concurrency {b.concurrency_limit} · {b.rate_limit_per_minute}
                  /min · emergency at {b.emergency_threshold_pct}% · policy{" "}
                  {b.exhaustion_policy}
                </p>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">Loading budgets…</p>
            )}
            <AdminButton
              onClick={() =>
                run(async () => {
                  await loadBudgets();
                  return "Budget status refreshed.";
                })
              }
              disabled={busy}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Refresh
            </AdminButton>
          </AdminCard>
          <AdminCard>
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Ledger separation
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                •{" "}
                <span className="font-medium text-foreground">
                  INTERNAL_ARCHIE_OPERATION
                </span>{" "}
                → frelux_infrastructure_costs (service-role writes only).
              </li>
              <li>
                • Customer metering (frelux_api_usage) accepts customer classes
                only; a DB CHECK rejects internal classes.
              </li>
              <li>
                • A trigger on credit_transactions rejects any row attributed to
                an internal ARCHIE agent.
              </li>
              <li>
                • ARCHIE never invents billing rules; customers are never
                charged for internal agent activity.
              </li>
            </ul>
          </AdminCard>
        </div>
      )}

      {tab === "systems" && <SystemsRegistryPanel />}

      {tab === "crypto" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminCard>
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Live market (owner-only)
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Observations are recorded with provenance (source, time). Live
              data is a point-in-time observation, never a prediction.
            </p>
            <AdminButton
              onClick={handleMarket}
              disabled={busy || assets.length === 0}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <LineChart className="h-4 w-4" aria-hidden />
              )}
              Fetch and record
            </AdminButton>
            {market && (
              <div className="mt-4 space-y-2">
                {market.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-background p-3 text-sm"
                  >
                    <span className="font-semibold">{String(m.symbol)}</span>
                    <span className="ml-3 text-muted-foreground">
                      ${Number(m.usd ?? 0).toLocaleString()} · 24h{" "}
                      {Number(m.usd_24h_change ?? 0).toFixed(2)}% · cap $
                      {Number(m.usd_market_cap ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard>
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Record classified analysis
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Guaranteed-profit language is rejected server-side. RECOMMENDATION
              and PREDICTION records automatically carry the mandatory
              disclaimer. ARCHIE cannot execute financial actions.
            </p>
            <AdminField label="Asset">
              <AdminSelect
                value={assetSymbol}
                onChange={(e) => setAssetSymbol(e.target.value)}
              >
                {assets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol} — {a.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Classification">
              <AdminSelect
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
              >
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Statement">
              <AdminTextarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={4}
                placeholder="e.g. BTC dominance rising while ETH/BTC trend weakens; risk remains elevated."
              />
            </AdminField>
            <AdminField label="Confidence (0-1)">
              <AdminInput
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
              />
            </AdminField>
            <AdminButton
              onClick={handleAnalysis}
              disabled={busy || !statement.trim()}
            >
              Record analysis
            </AdminButton>
          </AdminCard>

          <AdminCard className="lg:col-span-2">
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Portfolio concentration risk
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Owner-recorded research notebook only. ARCHIE does not hold, move
              or control any funds. Format: SYMBOL: usd value per line.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Holdings">
                <AdminTextarea
                  value={holdings}
                  onChange={(e) => setHoldings(e.target.value)}
                  rows={4}
                />
              </AdminField>
              <div>
                <AdminButton onClick={handleRisk} disabled={busy}>
                  Assess risk
                </AdminButton>
                {riskReport && (
                  <div className="mt-4 rounded-xl border border-border bg-background p-3 text-sm">
                    <p className="font-semibold">{riskReport.concentration}</p>
                    <p className="text-xs text-muted-foreground">
                      HHI {riskReport.hhi} · largest position{" "}
                      {(riskReport.largest_weight * 100).toFixed(1)}% · total $
                      {riskReport.total_value.toLocaleString()}
                    </p>
                    <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-muted">
                      {riskReport.weights.map((w, i) => (
                        <div
                          key={w.symbol}
                          className="bg-primary"
                          style={{
                            width: `${w.weight * 100}%`,
                            opacity: 1 - i * 0.15,
                          }}
                          title={`${w.symbol} ${(w.weight * 100).toFixed(1)}%`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// Systems registry — the real client-side status aggregate
// (status.ts) rendered as the admin systems registry. Every
// state is derived from live data counts; failures render
// honestly instead of pretending.
// ---------------------------------------------------------
function SystemsRegistryPanel() {
  const [sections, setSections] = useState<SystemSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await fetchArchieStatus();
      setSections(buildSystemsRegistry(status));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tone = (state: SystemSection["state"]) =>
    state === "operational"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : state === "degraded" || state === "pending"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400";

  return (
    <AdminCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold">Systems registry</h3>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Live aggregate of ARCHIE's systems — every state below is derived from
        real row counts and reachability probes, never asserted.
      </p>
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          Registry unavailable: {error}
        </div>
      )}
      {sections && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sections.map((sec) => (
            <li
              key={sec.key}
              className="rounded-lg border border-border/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{sec.label}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${tone(sec.state)}`}
                >
                  {sec.state}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{sec.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}
