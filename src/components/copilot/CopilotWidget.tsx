// =========================================================
// FRELUX AI COPILOT, UI entry point
//
// A small floating entry that adds natural-language estimation
// WITHOUT overwhelming the existing calculators:
//   - every manual workflow keeps working exactly as before
//   - the Copilot only interprets + routes to authoritative engines
//   - assumptions are always visible and editable
//   - it refuses rather than guesses
//
// Flow: request → interpretation (deterministic first; AI-assisted
// only when needed) → review facts/provenance → fill missing info →
// authoritative engine run → result + provenance → optional save to
// project (explicit confirmation only).
// =========================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  X,
  Loader2,
  Send,
  Sparkles,
  ShieldCheck,
  Info,
  Save,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import { checkAndSpendCredits } from "@/lib/ai-credit-gate";
import { fetchContractorProjects } from "@/lib/contractor";
import { saveCalculationToProject } from "@/lib/project-intelligence";
import {
  interpretRequest,
  planTask,
  runTask,
  type AiFact,
  type CopilotPlan,
  type CopilotTaskType,
  type EngineResult,
  type FreluxContext,
  type InterpretationResult,
  type TaskRunOutcome,
} from "@/lib/ai-foundation";
import { interpretWithAi } from "@/lib/ai-foundation/copilot-client";
import { trustBadge } from "@/lib/ai-foundation/trust";

type Phase = "input" | "review" | "running" | "result" | "refused";

interface ProjectOption {
  id: string;
  name: string;
}

export default function CopilotWidget({
  embedded = false,
  onClose,
}: {
  /** Rendered inside the single floating chat widget instead of
   *  as its own floating button (owner instruction: one floating
   *  button on display). */
  embedded?: boolean;
  onClose?: () => void;
} = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(embedded);
  const [phase, setPhase] = useState<Phase>("input");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [interpretation, setInterpretation] =
    useState<InterpretationResult | null>(null);
  const [plan, setPlan] = useState<CopilotPlan | null>(null);
  const [outcome, setOutcome] = useState<TaskRunOutcome | null>(null);
  const [missingInput, setMissingInput] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const resultRef = useRef<HTMLDivElement>(null);

  // Load projects once, for the optional save step.
  useEffect(() => {
    if (!open || !user || projects.length > 0) return;
    fetchContractorProjects()
      .then((data) =>
        setProjects(data.map((p) => ({ id: p.id, name: p.name })).slice(0, 12)),
      )
      .catch(() => undefined);
  }, [open, user, projects.length]);

  const buildContext = useCallback(
    (): FreluxContext => ({
      userId: user?.id ?? null,
      project: null,
      location: null,
      calculations: [],
      marketDataAvailable: false,
    }),
    [user],
  );

  const reset = useCallback(() => {
    setPhase("input");
    setInterpretation(null);
    setPlan(null);
    setOutcome(null);
    setMissingInput({});
    setSaveState("idle");
    setBusy(false);
  }, []);

  const handleSubmit = useCallback(
    async (text?: string) => {
      const q = (text ?? draft).trim();
      if (!q || busy) return;
      setBusy(true);
      setDraft("");
      reset();
      setPhase("running");

      // 1. Deterministic interpretation first, free, offline, no API call.
      let interpretation = interpretRequest(q);

      // 2. AI-assisted interpretation ONLY when the deterministic parse
      //    can't understand the request. Costs ai_copilot credits, and
      //    requires login (edge function enforces auth).
      if (interpretation.taskType === "unsupported" && user) {
        const gate = await checkAndSpendCredits("ai_copilot");
        if (gate.allowed) {
          interpretation = await interpretWithAi(q, user.id);
        }
        // Gate denied or AI unavailable → deterministic refusal below.
      }

      setInterpretation(interpretation);
      // Plan now so the review panel can ask for genuinely missing
      // fields BEFORE running the engine (planning is synchronous and free).
      setPlan(
        planTask(interpretation.taskType, buildContext(), interpretation.facts),
      );
      setPhase("review");
      setBusy(false);
    },
    [buildContext, busy, draft, reset, user],
  );

  const handleRunEngine = useCallback(async () => {
    if (!interpretation) return;
    setBusy(true);
    setPhase("running");

    // User-supplied missing values become user_input facts (trusted).
    const suppliedFacts: AiFact[] = Object.entries(missingInput)
      .filter(([, v]) => v.trim() !== "")
      .map(([key, v]) => {
        const num = Number(v);
        return {
          key,
          label: key.replace(/_/g, " "),
          value: Number.isFinite(num) && v.trim() !== "" ? num : v,
          origin: "user_input" as const,
          source: "copilot-missing-info-form",
          confidence: 1,
          trust: "user_confirmed" as const,
        };
      });

    const result = await runTask(interpretation.taskType, buildContext(), [
      ...interpretation.facts,
      ...suppliedFacts,
    ]);
    setOutcome(result);
    setPhase(result.refusal && !result.result ? "refused" : "result");
    setBusy(false);
  }, [buildContext, interpretation, missingInput]);

  const handleSave = useCallback(
    async (projectId: string) => {
      if (!outcome?.result?.ok) return;
      setSaveState("saving");
      try {
        // calculator_type must match the existing enum, build-to-roof runs
        // are saved with the calculator this engine belongs to.
        await saveCalculationToProject({
          project_id: projectId,
          calculator_type: "build_to_roof",
          calculator_slug: "build-to-roof-estimator",
          calc_title: `Copilot estimate, ${new Date().toLocaleDateString()}`,
          calc_data: outcome.engineInput ?? {},
          result_summary: {
            grand_total: outcome.result.costs?.total ?? 0,
            currency: outcome.result.costs?.currency ?? "NGN",
          },
          materials: outcome.result.quantities.slice(0, 50).map((q) => ({
            name: q.label,
            category: "general",
            quantity: q.quantity,
            unit: q.unit,
          })),
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [outcome],
  );

  if (!open && !embedded) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open FRELUX AI Copilot"
        className="fixed bottom-20 left-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-brand-purple/30 transition-transform hover:scale-105 active:scale-95 sm:bottom-4"
      >
        <Sparkles className="h-6 w-6" aria-hidden />
      </button>
    );
  }

  return (
    <div
      className={
        embedded
          ? "flex h-full w-full flex-col overflow-hidden"
          : "fixed bottom-20 left-1/2 z-50 flex h-[min(78vh,640px)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl dark:border-white/5 sm:bottom-4 sm:left-4 sm:translate-x-0"
      }
      role="dialog"
      aria-label="FRELUX AI Copilot"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold leading-none">FRELUX Copilot</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Interprets your request · FRELUX engines calculate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (onClose) onClose();
              else {
                setOpen(false);
                reset();
              }
            }}
            aria-label="Close Copilot"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3" ref={resultRef}>
        {phase === "input" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Describe what you want to estimate. Example:{" "}
              <em>
                "Estimate materials and cost for a 4-bedroom duplex, 15m by 12m"
              </em>
              .
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Your words are turned into inputs, no guessing.</li>
              <li>
                • Quantities & costs come only from FRELUX calculation engines.
              </li>
              <li>• Assumptions are always shown, never hidden.</li>
            </ul>
          </div>
        )}

        {(phase === "running" || busy) && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Working,
            interpreting your request…
          </div>
        )}

        {phase === "review" && interpretation && !busy && (
          <ReviewPanel
            interpretation={interpretation}
            plan={plan}
            missingInput={missingInput}
            setMissingInput={setMissingInput}
            onRun={handleRunEngine}
          />
        )}

        {phase === "result" && outcome?.result && (
          <ResultPanel
            outcome={outcome}
            projects={projects}
            saveState={saveState}
            onSave={handleSave}
            onOpenEstimator={() => {
              setOpen(false);
              onClose?.();
              navigate("/build-to-roof-estimator");
            }}
            onNewRequest={reset}
          />
        )}

        {phase === "refused" && outcome?.refusal && (
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <p>{outcome.refusal}</p>
            </div>
            <Button size="sm" variant="outline" onClick={reset}>
              Try another request
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Estimate a 4-bedroom bungalow, 14m by 11m"
          aria-label="Describe your estimation request"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          maxLength={400}
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !draft.trim()}
          aria-label="Send request"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </form>
    </div>
  );
}

// ── Review panel: facts found, provenance, missing info ──
function ReviewPanel({
  interpretation,
  plan,
  missingInput,
  setMissingInput,
  onRun,
}: {
  interpretation: InterpretationResult;
  plan: CopilotPlan | null;
  missingInput: Record<string, string>;
  setMissingInput: (v: Record<string, string>) => void;
  onRun: () => void;
}) {
  const missing =
    plan?.steps.find((s) => s.kind === "request_missing_info")?.missingFields ??
    [];
  const refused = plan?.steps.find((s) => s.kind === "refuse");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Understood task
        </p>
        <p className="mt-1 text-sm font-medium">
          {TASK_LABELS[interpretation.taskType] ?? interpretation.taskType}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {interpretation.interpretedBy === "ai_assisted"
            ? "Interpreted by AI, values below are detected and need your confirmation."
            : "Parsed directly from your request, no AI call needed."}
        </p>
      </div>

      {interpretation.facts.length > 0 && (
        <div className="space-y-1.5">
          {interpretation.facts.map((fact) => (
            <div
              key={fact.key + String(fact.value)}
              className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{fact.label}:</span>{" "}
                {String(fact.value)}
                {fact.unit ? ` ${fact.unit}` : ""}
                {fact.evidence && (
                  <span className="block text-[11px] text-muted-foreground">
                    {fact.evidence}
                  </span>
                )}
              </span>
              <span
                className={classNames(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px]",
                  badgeClass(fact),
                )}
              >
                {trustBadge(fact)}
              </span>
            </div>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-medium">
            A few details are still needed, FRELUX won't guess them:
          </p>
          {missing.map((field) => (
            <label key={field.key} className="block text-sm">
              <span className="text-muted-foreground">
                {field.label}
                {field.unit ? ` (${field.unit})` : ""}
              </span>
              <input
                value={missingInput[field.key] ?? ""}
                onChange={(e) =>
                  setMissingInput({
                    ...missingInput,
                    [field.key]: e.target.value,
                  })
                }
                inputMode={
                  field.unit === "m" || field.unit === "count"
                    ? "decimal"
                    : undefined
                }
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          ))}
        </div>
      )}

      {refused ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            aria-hidden
          />
          <p>{refused.detail}</p>
        </div>
      ) : (
        <Button size="sm" onClick={onRun} className="w-full">
          Run FRELUX engine
        </Button>
      )}
    </div>
  );
}

// ── Result panel: engine output + provenance + save ──
function ResultPanel({
  outcome,
  projects,
  saveState,
  onSave,
  onOpenEstimator,
  onNewRequest,
}: {
  outcome: TaskRunOutcome;
  projects: ProjectOption[];
  saveState: "idle" | "saving" | "saved" | "error";
  onSave: (projectId: string) => void;
  onOpenEstimator: () => void;
  onNewRequest: () => void;
}) {
  const result = outcome.result as EngineResult;
  const fmt = (n: number) => `₦${Math.round(n).toLocaleString()}`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Estimated total
        </p>
        <p className="mt-1 text-2xl font-bold">
          {result.costs ? fmt(result.costs.total) : "-"}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          Calculated by:{" "}
          {outcome.plan.steps
            .find((s) => s.kind === "run_engine")
            ?.detail.replace(/^Run the /, "") ??
            "an authoritative FRELUX engine"}
        </p>
        {result.costs && !result.costs.regionalDataAvailable && (
          <p className="mt-1 text-[11px] text-amber-600">
            Pricing basis is older than 30 days, verify current prices before
            decisions.
          </p>
        )}
      </div>

      {result.quantities.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Key quantities
          </p>
          <ul className="mt-1 space-y-1 text-sm">
            {result.quantities.slice(0, 6).map((q, i) => (
              <li key={`${q.label}-${i}`} className="flex justify-between">
                <span className="text-muted-foreground">{q.label}</span>
                <span className="font-medium">
                  {q.quantity.toLocaleString()} {q.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {outcome.assumptions && outcome.assumptions.length > 0 && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Assumptions used (editable)
          </p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {outcome.assumptions.map((a) => (
              <li key={a.key}>
                • {a.label}: {String(a.value)}
                {a.unit ? ` ${a.unit}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!result.raw &&
        "assumptions" in (result.raw as Record<string, unknown>) && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {(
              ((result.raw as Record<string, unknown>)
                .assumptions as string[]) ?? []
            )
              .slice(0, 4)
              .map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
          </ul>
        )}

      <div className="space-y-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={onOpenEstimator}
        >
          Open full estimator breakdown
        </Button>
        {projects.length > 0 && saveState !== "saved" && (
          <div className="space-y-1">
            <label className="block text-xs text-muted-foreground">
              Save this estimate to a project (your confirmation):
            </label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              defaultValue=""
              onChange={(e) => e.target.value && onSave(e.target.value)}
              aria-label="Choose project to save the estimate to"
            >
              <option value="" disabled>
                Choose a project…
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {saveState === "saving" && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving…
              </p>
            )}
            {saveState === "error" && (
              <p className="text-xs text-destructive">
                Couldn't save, please try again.
              </p>
            )}
          </div>
        )}
        {saveState === "saved" && (
          <p className="flex items-center gap-1 text-xs text-emerald-600">
            <Save className="h-3 w-3" aria-hidden /> Saved to your project.
          </p>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={onNewRequest}
        >
          New request
        </Button>
      </div>
    </div>
  );
}

const TASK_LABELS: Record<CopilotTaskType, string> = {
  building_estimate: "Whole-building materials & cost estimate",
  roof_estimate: "Roof estimate",
  painting_estimate: "Painting estimate",
  tyrolene_estimate: "Tyrolene finishing estimate",
  finish_compare: "Finish-system comparison",
  scenario_compare: "Scenario comparison",
  project_question: "Project question",
  unsupported: "Not supported yet",
  painting_materials: "Painting materials & containers",
  screeding_estimate: "Screeding estimate",
  tile_estimate: "Tile estimate",
  pop_estimate: "POP ceiling estimate",
};

function badgeClass(fact: AiFact): string {
  if (fact.trust === "user_confirmed" || fact.trust === "corrected")
    return "bg-emerald-500/15 text-emerald-700";
  if (fact.origin === "user_input" || fact.origin === "engine_calculation")
    return "bg-emerald-500/15 text-emerald-700";
  if (fact.origin === "smart_default") return "bg-muted text-muted-foreground";
  return "bg-amber-500/15 text-amber-700";
}
