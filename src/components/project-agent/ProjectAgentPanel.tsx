import { useCallback, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  History,
  Play,
  Pencil,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/Toast";
import {
  buildGuidance,
  GUIDANCE_QUESTIONS,
  GUIDANCE_QUESTION_PHRASES,
  type GuidanceAnswer,
  type GuidanceQuestion,
} from "@/lib/project-agent/guidance";
import {
  buildRecommendations,
  type AgentRecommendation,
  type RecommendationReport,
} from "@/lib/project-agent/recommendations";
import {
  prepareAction,
  decideApproval,
  cancelAction,
  amendPreparedAction,
  listPreparedActions,
  type PreparedActionWithApprovals,
  type ApprovalDecision,
} from "@/lib/project-agent/actions";
import { executeApprovedAction } from "@/lib/project-agent/execute";
import {
  runProactiveMonitoring,
  dismissProjectAlert,
  type MonitoringResult,
} from "@/lib/project-agent/monitoring";
import { getProjectStory, type ProjectStory } from "@/lib/project-agent/audit";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import { supabase } from "@/lib/supabase";
import type { AgentResult } from "@/lib/project-agent/types";

// =========================================================
// PHASE 6 STAGE 13, Project Agent panel (mobile-first).
//
// The full agent workflow on one screen, stacked for small
// viewports: ask → evidence → recommendation → prepared
// action → review → approve/reject → execute → history.
// The agent never acts on its own, every button is the
// user's explicit instruction.
// =========================================================

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

/** Which recommendation conditions ground which action kinds
 * (mirrors KIND_CONDITIONS in actions.ts, the backend still
 * re-validates; the UI just refuses to offer impossible buttons). */
const CONDITION_TO_KIND: Record<string, "record_purchase" | "confirm_stage_completion" | "update_material_price"> = {
  procurement_risk: "record_purchase",
  incomplete_task: "confirm_stage_completion",
  schedule_risk: "confirm_stage_completion",
  stale_market_data: "update_material_price",
};

function errMessage(r: { ok: boolean; error?: { message: string } }): string {
  return r.ok ? "" : (r.error?.message ?? "Something went wrong.");
}

interface PrepareDraft {
  recId: string;
  kind: string;
  /** record_purchase */
  shoppingItemId: string;
  actualPrice: string;
  /** confirm_stage_completion */
  stageId: string;
  /** update_material_price */
  materialId: string;
  newPrice: string;
}

const EMPTY_DRAFT: PrepareDraft = {
  recId: "",
  kind: "",
  shoppingItemId: "",
  actualPrice: "",
  stageId: "",
  materialId: "",
  newPrice: "",
};

interface SnapshotRefs {
  unpurchased: Array<{ id: string; name: string; estimatedPrice: number | null }>;
  incompleteStages: Array<{ id: string; name: string }>;
  materials: Array<{ id: string; name: string }>;
}

export default function ProjectAgentPanel({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const nowIso = () => new Date().toISOString();

  // ---- Panel state -------------------------------------------------
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<RecommendationReport | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringResult | null>(null);
  const [actions, setActions] = useState<PreparedActionWithApprovals[]>([]);
  const [story, setStory] = useState<ProjectStory | null>(null);

  const [question, setQuestion] = useState<GuidanceQuestion | null>(null);
  const [guidance, setGuidance] = useState<GuidanceAnswer | null>(null);
  const [guidanceBusy, setGuidanceBusy] = useState(false);

  const [draft, setDraft] = useState<PrepareDraft | null>(null);
  const [refs, setRefs] = useState<SnapshotRefs | null>(null);
  const [prepareBusy, setPrepareBusy] = useState(false);

  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [amendOpenFor, setAmendOpenFor] = useState<string | null>(null);
  const [amendText, setAmendText] = useState("");

  // ---- Loaders ------------------------------------------------------
  const refreshCore = useCallback(
    async (opts: { withMonitoring?: boolean } = {}) => {
      setChecking(true);
      try {
        const [rep, acts] = await Promise.all([
          buildRecommendations(projectId, nowIso()),
          listPreparedActions(projectId, nowIso()),
        ]);
        if (rep.ok) setReport(rep.data);
        else toast({ title: "Agent check failed", message: errMessage(rep), variant: "error" });
        if (acts.ok) setActions(acts.data);
        if (opts.withMonitoring) {
          const mon = await runProactiveMonitoring(projectId, nowIso());
          if (mon.ok) setMonitoring(mon.data);
        }
        const hist = await getProjectStory(projectId, nowIso());
        if (hist.ok) setStory(hist.data);
      } finally {
        setChecking(false);
      }
    },
    [projectId, toast],
  );

  const ask = useCallback(
    async (q: GuidanceQuestion) => {
      setQuestion(q);
      setGuidance(null);
      setGuidanceBusy(true);
      try {
        const r = await buildGuidance(projectId, q, nowIso());
        if (r.ok) setGuidance(r.data);
        else
          toast({ title: "The agent could not answer", message: errMessage(r), variant: "error" });
      } finally {
        setGuidanceBusy(false);
      }
    },
    [projectId, toast],
  );

  const openPrepare = useCallback(async (rec: AgentRecommendation) => {
    const kind = CONDITION_TO_KIND[rec.condition];
    if (!kind) return;
    setDraft({ ...EMPTY_DRAFT, recId: rec.id, kind });
    setRefs(null);
    // Material catalog is authoritative for price updates, fetch
    // the names the user selects from directly (RLS-enforced).
    let materials: Array<{ id: string; name: string }> = [];
    try {
      const { data: mats } = await supabase
        .from("material_catalog")
        .select("id, name")
        .order("name")
        .limit(200);
      materials = (mats ?? []).map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }));
    } catch {
      materials = [];
    }
    const snap = await buildProjectSnapshot(projectId, { now: nowIso() });
    if (snap) {
      setRefs({
        unpurchased: snap.shoppingItems
          .filter((i) => !i.is_purchased)
          .map((i) => ({
            id: i.id,
            name: i.name,
            estimatedPrice: i.estimated_price ?? null,
          })),
        incompleteStages: (snap.stages ?? [])
          .filter((s) => !s.isCompleted)
          .map((s) => ({ id: s.id, name: s.stageName })),
        materials: materials ?? [],
      });
    } else {
      setRefs({
        unpurchased: [],
        incompleteStages: [],
        materials: materials ?? [],
      });
    }
  }, [projectId]);

  const submitPrepare = useCallback(async () => {
    if (!draft) return;
    setPrepareBusy(true);
    try {
      let params: Record<string, unknown> = {};
      if (draft.kind === "record_purchase") {
        if (!draft.shoppingItemId) {
          toast({ title: "Select a shopping item", variant: "error" });
          return;
        }
        params = { shoppingItemId: draft.shoppingItemId };
        const price = Number(draft.actualPrice);
        if (draft.actualPrice.trim() !== "" && Number.isFinite(price) && price > 0) {
          params.actualPrice = price;
        }
      } else if (draft.kind === "confirm_stage_completion") {
        if (!draft.stageId) {
          toast({ title: "Select a stage", variant: "error" });
          return;
        }
        params = { stageId: draft.stageId };
      } else if (draft.kind === "update_material_price") {
        if (!draft.materialId) {
          toast({ title: "Select a material", variant: "error" });
          return;
        }
        const price = Number(draft.newPrice);
        if (!Number.isFinite(price) || price <= 0) {
          toast({ title: "Enter the new price", variant: "error" });
          return;
        }
        params = { materialId: draft.materialId, newPrice: price, source: "user:agent panel" };
      }
      const r = await prepareAction(
        projectId,
        {
          kind: draft.kind as never,
          recommendationId: draft.recId,
          params: params as never,
          idempotencyKey: `ui:${draft.recId}:${draft.kind}:${JSON.stringify(params)}`,
        },
        nowIso(),
      );
      if (r.ok) {
        toast({ title: "Action prepared", message: "Review it below, then approve or reject." });
        setDraft(null);
        await refreshCore();
      } else {
        toast({ title: "Could not prepare the action", message: errMessage(r), variant: "error" });
      }
    } finally {
      setPrepareBusy(false);
    }
  }, [draft, projectId, refreshCore, toast]);

  const decide = useCallback(
    async (approvalId: string, decision: ApprovalDecision) => {
      setDecisionBusy(`${approvalId}:${decision}`);
      try {
        const r = await decideApproval(projectId, approvalId, decision, nowIso());
        if (r.ok) {
          toast({
            title: decision === "approved" ? "Approved" : "Rejected",
            message:
              decision === "approved"
                ? "You can execute the action when you are ready, nothing is written until then."
                : "The action was rejected. Nothing was changed.",
          });
          await refreshCore();
        } else {
          toast({ title: "Decision failed", message: errMessage(r), variant: "error" });
        }
      } finally {
        setDecisionBusy(null);
      }
    },
    [projectId, refreshCore, toast],
  );

  const execute = useCallback(
    async (actionId: string) => {
      setDecisionBusy(`${actionId}:execute`);
      try {
        const r = await executeApprovedAction(projectId, actionId, nowIso());
        if (r.ok) {
          toast({
            title: r.data.duplicate ? "Already executed" : "Executed",
            message: r.data.execution.summary,
          });
          await refreshCore();
        } else {
          toast({ title: "Execution refused", message: errMessage(r), variant: "error" });
        }
      } finally {
        setDecisionBusy(null);
      }
    },
    [projectId, refreshCore, toast],
  );

  const cancel = useCallback(
    async (actionId: string) => {
      setDecisionBusy(`${actionId}:cancel`);
      try {
        const r = await cancelAction(projectId, actionId, nowIso());
        if (r.ok) {
          toast({ title: "Action cancelled", message: "Nothing was changed." });
          await refreshCore();
        } else {
          toast({ title: "Cancel failed", message: errMessage(r), variant: "error" });
        }
      } finally {
        setDecisionBusy(null);
      }
    },
    [projectId, refreshCore, toast],
  );

  const amend = useCallback(
    async (actionId: string) => {
      setDecisionBusy(`${actionId}:amend`);
      try {
        const r = await amendPreparedAction(
          projectId,
          actionId,
          amendText.trim() ? { assumptions: [amendText.trim()] } : {},
          nowIso(),
        );
        if (r.ok) {
          toast({ title: "Action updated", message: "The approval request was refreshed." });
          setAmendOpenFor(null);
          setAmendText("");
          await refreshCore();
        } else {
          toast({ title: "Update failed", message: errMessage(r), variant: "error" });
        }
      } finally {
        setDecisionBusy(null);
      }
    },
    [amendText, projectId, refreshCore, toast],
  );

  const dismissAlert = useCallback(
    async (alertId: string) => {
      const r = await dismissProjectAlert(alertId, nowIso());
      if (r.ok) {
        toast({ title: "Alert dismissed" });
        const mon = await runProactiveMonitoring(projectId, nowIso());
        if (mon.ok) setMonitoring(mon.data);
      } else {
        toast({ title: "Dismiss failed", message: errMessage(r as AgentResult<unknown>), variant: "error" });
      }
    },
    [projectId, toast],
  );

  const openAlerts = (monitoring?.openAlerts ?? []).filter((a) => a.status === "open");

  return (
    <div className="space-y-4" data-testid="project-agent-panel">
      {/* ---- Header + run check ---- */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Project Agent</h3>
              <p className="text-xs text-muted-foreground">
                Evidence-based guidance. Nothing is written without your approval.
              </p>
            </div>
          </div>
          <Button onClick={() => refreshCore({ withMonitoring: true })} disabled={checking} className="gap-2">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {checking ? "Checking…" : "Run agent check"}
          </Button>
        </div>

        {monitoring && (
          <p className="mt-3 text-xs text-muted-foreground" data-testid="agent-monitoring-summary">
            {monitoring.summary}
          </p>
        )}
      </div>

      {/* ---- Open alerts ---- */}
      {openAlerts.length > 0 && (
        <div className="space-y-3">
          {openAlerts.map((a) => (
            <div key={a.id} className="rounded-xl border bg-card p-4" data-testid="agent-alert">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${a.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
                  <h4 className="font-medium text-sm">{a.title}</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => dismissAlert(a.id)}
                >
                  Dismiss
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.condition_text}</p>
              <p className="mt-1 text-sm">
                <span className="font-medium">Recommended: </span>
                {a.recommended_action}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ---- Ask the agent ---- */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Ask the agent</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {GUIDANCE_QUESTIONS.map((q) => (
            <Button
              key={q}
              variant={question === q ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => ask(q)}
              disabled={guidanceBusy}
            >
              {GUIDANCE_QUESTION_PHRASES[q]}
            </Button>
          ))}
        </div>

        {guidanceBusy && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the recorded project state…
          </div>
        )}

        {guidance && (
          <div className="mt-4 space-y-2" data-testid="agent-guidance-answer">
            <p className="text-sm font-medium">{guidance.headline}</p>
            {guidance.items.map((item, i) => (
              <div key={i} className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm">{item.action}</p>
                <ul className="mt-1 space-y-0.5">
                  {item.evidence.map((e, j) => (
                    <li key={j} className="text-xs text-muted-foreground">• {e}</li>
                  ))}
                </ul>
              </div>
            ))}
            {guidance.insufficientData.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Not enough recorded data for: {guidance.insufficientData.join("; ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Derived from: {guidance.derivedFrom.join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* ---- Recommendations ---- */}
      {report && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Recommendations</h4>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{report.summary}</p>

          {report.recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No risks found in the recorded project state.
            </p>
          )}

          <div className="space-y-3">
            {report.recommendations.map((rec) => (
              <div key={rec.id} className="rounded-lg border p-3" data-testid="agent-recommendation">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${SEVERITY_STYLES[rec.severity]}`}>
                    {rec.severity}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">{rec.dataFreshness} data</span>
                </div>
                <p className="mt-2 text-sm font-medium">{rec.recommendation}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium">Next step: </span>{rec.nextStep}
                </p>
                <ul className="mt-2 space-y-0.5">
                  {rec.evidence.map((e, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {e}</li>
                  ))}
                </ul>
                {rec.assumptions.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assumptions: {rec.assumptions.join("; ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Source: {rec.source}</p>

                {CONDITION_TO_KIND[rec.condition] && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => openPrepare(rec)}
                  >
                    Prepare action…
                  </Button>
                )}
              </div>
            ))}
          </div>

          {report.insufficientData.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              Could not assess:{" "}
              {report.insufficientData.map((c) => `${c.condition} (${c.reason})`).join("; ")}
            </div>
          )}
        </div>
      )}

      {/* ---- Prepare-action draft form ---- */}
      {draft && (
        <div className="rounded-xl border bg-card p-4 sm:p-6" data-testid="agent-prepare-form">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Prepare: {draft.kind.replace(/_/g, " ")}</h4>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDraft(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!refs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading the recorded project state…
            </div>
          ) : (
            <div className="space-y-3">
              {draft.kind === "record_purchase" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Which purchase did you make? Only unpurchased recorded items are offered.
                  </p>
                  <select
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={draft.shoppingItemId}
                    onChange={(e) => setDraft({ ...draft, shoppingItemId: e.target.value })}
                    data-testid="prepare-item-select"
                  >
                    <option value="">Select an item…</option>
                    {refs.unpurchased.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}{i.estimatedPrice != null ? `, estimated ${i.estimatedPrice}` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="Actual price paid (optional)"
                    inputMode="decimal"
                    value={draft.actualPrice}
                    onChange={(e) => setDraft({ ...draft, actualPrice: e.target.value })}
                  />
                </>
              )}

              {draft.kind === "confirm_stage_completion" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Which stage is complete? Only incomplete recorded stages are offered.
                  </p>
                  <select
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={draft.stageId}
                    onChange={(e) => setDraft({ ...draft, stageId: e.target.value })}
                    data-testid="prepare-stage-select"
                  >
                    <option value="">Select a stage…</option>
                    {refs.incompleteStages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </>
              )}

              {draft.kind === "update_material_price" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Record the price you actually found. Never guess a price.
                  </p>
                  <select
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={draft.materialId}
                    onChange={(e) => setDraft({ ...draft, materialId: e.target.value })}
                    data-testid="prepare-material-select"
                  >
                    <option value="">Select a material…</option>
                    {refs.materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="New price"
                    inputMode="decimal"
                    value={draft.newPrice}
                    onChange={(e) => setDraft({ ...draft, newPrice: e.target.value })}
                  />
                </>
              )}

              <Button onClick={submitPrepare} disabled={prepareBusy} className="gap-2">
                {prepareBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Prepare for review
              </Button>
              <p className="text-xs text-muted-foreground">
                Preparing never changes project data. You will review it before anything is approved.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---- Prepared actions ---- */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Prepared actions</h4>
        </div>

        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No prepared actions. When a recommendation grounds one, use “Prepare action…”.
          </p>
        ) : (
          <div className="space-y-3">
            {actions.map(({ action, approval, availableDecisions, note }) => (
              <div key={action.id} className="rounded-lg border p-3" data-testid="agent-action">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${SEVERITY_STYLES.medium}`}>
                    {action.state}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    approval: {action.permission}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium">{action.what}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium">Why: </span>{action.why}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium">Expected result: </span>{action.expectedResult}
                </p>
                {action.assumptions.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assumptions: {action.assumptions.join("; ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Data used: {action.dataUsed.join(", ")}
                </p>

                {amendOpenFor === action.id ? (
                  <div className="mt-2 space-y-2">
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      placeholder="Add an assumption or note…"
                      value={amendText}
                      onChange={(e) => setAmendText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => amend(action.id)} disabled={decisionBusy === `${action.id}:amend`}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAmendOpenFor(null)}>
                        Cancel edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableDecisions.includes("approved") && approval && (
                      <Button
                        size="sm"
                        onClick={() => decide(approval.id, "approved")}
                        disabled={decisionBusy === `${approval.id}:approved`}
                        className="gap-1.5"
                      >
                        {decisionBusy === `${approval.id}:approved` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Approve
                      </Button>
                    )}
                    {availableDecisions.includes("rejected") && approval && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide(approval.id, "rejected")}
                        disabled={decisionBusy === `${approval.id}:rejected`}
                      >
                        Reject
                      </Button>
                    )}
                    {action.state === "approved" && (
                      <Button
                        size="sm"
                        onClick={() => execute(action.id)}
                        disabled={decisionBusy === `${action.id}:execute`}
                        className="gap-1.5"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Execute
                      </Button>
                    )}
                    {action.state !== "executed" && action.state !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancel(action.id)}
                        disabled={decisionBusy === `${action.id}:cancel`}
                      >
                        Cancel
                      </Button>
                    )}
                    {(action.state === "prepared") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => { setAmendOpenFor(action.id); setAmendText(""); }}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                    )}
                  </div>
                )}
                {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- History ---- */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">What the agent observed & what happened</h4>
        </div>
        {!story ? (
          <p className="text-sm text-muted-foreground">
            Run an agent check to load the recorded history.
          </p>
        ) : (
          <div className="space-y-2">
            {story.timeline.length === 0 && (
              <p className="text-sm text-muted-foreground">No recorded agent activity yet.</p>
            )}
            {story.timeline.slice(-30).reverse().map((e, i) => (
              <div key={`${e.at}-${i}`} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {e.kind}
                </span>
                <div>
                  <p>{e.summary}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(e.at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
