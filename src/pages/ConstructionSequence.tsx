import { useState, useMemo } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import { useMarket } from "@/lib/international/market-context";
import {
  generateSequencePlan,
  type SequenceStep,
} from "@/lib/engineering/sequence-planner";
import {
  sequencePlanToDAG,
  initializeSimulation,
  stepSimulationWave,
  type WorkingCalendarModel,
  formatTradeName,
  resolveTradeDiscipline,
} from "@/lib/engineering/dag-engine";
import { DagNodeCanvas } from "@/components/engineering/DagNodeCanvas";
import { ParallelExecutionSimulator } from "@/components/engineering/ParallelExecutionSimulator";
import { ParallelWavesView } from "@/components/engineering/ParallelWavesView";
import {
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  HardHat,
  Wrench,
  Package,
  FileCheck,
  GitFork,
  Layers,
  ListOrdered,
  Globe,
  Award,
} from "lucide-react";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import { monitoredCalc } from "@/lib/calculator-monitor";
import { Button } from "@/components/ui/shadcn/button";

export type SequenceViewMode = "dag" | "waves" | "list";

export default function ConstructionSequence() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Construction Sequence Planner", path: "/construction-sequence" },
  ]);
  useSeo({
    title: "Construction Sequence & DAG Parallel Execution | FRELUX",
    description:
      "Interactive DAG network graph, Critical Path Method (CPM), and parallel execution waves conforming to ISO 21502 and PMI PMBOK 7th Ed. Optimize build duration, trade concurrency, and critical path.",
    keywords:
      "construction sequence, DAG nodes, parallel execution, critical path method, CPM scheduling, ISO 21502, PMBOK, build order, construction workflow",
  });

  const { market } = useMarket();
  const plan = monitoredCalc("Construction Sequence", () =>
    generateSequencePlan(undefined, market.marketCode),
  );

  const [viewMode, setViewMode] = useState<SequenceViewMode>("dag");
  const [fastTrackParallel, setFastTrackParallel] = useState(true);
  const [calendarModel, setCalendarModel] =
    useState<WorkingCalendarModel>("calendar_7d");
  const [contingencyBufferPct, setContingencyBufferPct] = useState(10);
  const [openStep, setOpenStep] = useState<number | null>(1);

  // Compute DAG Graph from plan
  const dagGraph = useMemo(() => {
    return sequencePlanToDAG(plan, { fastTrackParallel });
  }, [plan, fastTrackParallel]);

  // Simulation State
  const [simulationState, setSimulationState] = useState(() =>
    initializeSimulation(dagGraph),
  );

  // Reset simulation when DAG structure changes
  const handleToggleFastTrack = (enabled: boolean) => {
    setFastTrackParallel(enabled);
    const newGraph = sequencePlanToDAG(plan, { fastTrackParallel: enabled });
    setSimulationState(initializeSimulation(newGraph));
  };

  const handleStepSimulation = () => {
    setSimulationState((prev) => stepSimulationWave(dagGraph, prev));
  };

  const handleResetSimulation = () => {
    setSimulationState(initializeSimulation(dagGraph));
  };

  return (
    <SubscriptionGate feature="construction_sequence">
      <PageHeader
        variant="tool"
        eyebrow="Orchestration & Planning"
        title="Construction Sequence & DAG Execution"
        subtitle="Directed Acyclic Graph (DAG) task network, Critical Path Method (CPM), and multi-trade parallel execution waves conforming to ISO 21502 and PMI PMBOK® standards."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Calculators", path: "/calculators" },
          { label: "Construction Sequence" },
        ]}
      />

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="flex-1 min-w-[280px]">{plan.methodology_note}</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-brand-purple/10 px-2 py-0.5 font-semibold text-brand-purple">
              <Award className="h-3.5 w-3.5" /> ISO 21502 / PMBOK 7th Ed
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-foreground font-medium">
              <Globe className="h-3 w-3 text-muted-foreground" />{" "}
              {market.countryName} ({market.currencyCode})
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        {/* Parallel Execution Simulator & Metrics Banner */}
        <ParallelExecutionSimulator
          graph={dagGraph}
          simulationState={simulationState}
          onStepForward={handleStepSimulation}
          onReset={handleResetSimulation}
          fastTrackParallel={fastTrackParallel}
          onToggleFastTrack={handleToggleFastTrack}
          calendarModel={calendarModel}
          onChangeCalendarModel={setCalendarModel}
          contingencyBufferPct={contingencyBufferPct}
          onChangeContingencyBuffer={setContingencyBufferPct}
          marketCode={market.marketCode}
        />

        {/* View Switcher Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={viewMode === "dag" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("dag")}
              className="inline-flex items-center gap-2 text-xs font-semibold"
            >
              <GitFork className="h-3.5 w-3.5" />
              DAG Network Graph
            </Button>
            <Button
              variant={viewMode === "waves" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("waves")}
              className="inline-flex items-center gap-2 text-xs font-semibold"
            >
              <Layers className="h-3.5 w-3.5" />
              Parallel Execution Waves
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="inline-flex items-center gap-2 text-xs font-semibold"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              Sequential Step List
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {viewMode === "dag" &&
              "Visual node network with CPM critical path & causal tracing"}
            {viewMode === "waves" &&
              `${dagGraph.waves.length} multi-trade parallel execution waves`}
            {viewMode === "list" &&
              `${plan.steps.length} detailed activity specifications & inspection checkpoints`}
          </span>
        </div>

        {/* Dynamic View Content */}
        {viewMode === "dag" && (
          <DagNodeCanvas
            graph={dagGraph}
            nodeStatuses={simulationState.nodeStatuses}
          />
        )}

        {viewMode === "waves" && (
          <ParallelWavesView
            graph={dagGraph}
            nodeStatuses={simulationState.nodeStatuses}
            calendarModel={calendarModel}
          />
        )}

        {viewMode === "list" && (
          <div className="space-y-6">
            {/* Stage overview */}
            <div className="rounded-2xl border border-border bg-card shadow-card p-6">
              <h3 className="font-semibold text-foreground mb-3">
                Construction Stages
              </h3>
              <div className="flex flex-wrap gap-2">
                {plan.stages.map((s, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-brand-purple"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                      {i + 1}
                    </span>
                    {s}
                    {i < plan.stages.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-brand-purple/40" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quality gates */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5" /> Quality Gates (International
                Standards Inspection)
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">
                Critical engineering verification checkpoints conforming to ACI
                308R, BS EN 13670, and Eurocode 2 before structural loading.
              </p>
              <div className="space-y-3">
                {plan.quality_gates.map((gate, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-blue-100 dark:border-blue-800/40 bg-card p-3"
                  >
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-500" />
                      After Step {gate.after_step}: {gate.gate_name}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {gate.checks.map((c, j) => (
                        <li
                          key={j}
                          className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2"
                        >
                          <CheckCircle2
                            aria-hidden="true"
                            className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0"
                          />{" "}
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Parallel activities */}
            {plan.parallel_activities.length > 0 && (
              <div className="rounded-2xl border border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20 p-6">
                <h3 className="font-semibold text-green-900 dark:text-green-300 flex items-center gap-2 mb-3">
                  <Wrench aria-hidden="true" className="w-5 h-5" /> Fast-Track
                  Concurrency Opportunities
                </h3>
                <div className="space-y-2">
                  {plan.parallel_activities.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-green-100 dark:border-green-800/40 bg-card p-3"
                    >
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">
                        Steps {p.steps.join(" & ")} can overlap:
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2">
              {plan.steps.map((step) => (
                <StepCard
                  key={step.step_number}
                  step={step}
                  isOpen={openStep === step.step_number}
                  onToggle={() =>
                    setOpenStep(
                      openStep === step.step_number ? null : step.step_number,
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Related calculators */}
        <RelatedTools
          links={[
            CALC_LINKS.buildToRoof,
            CALC_LINKS.structuralCalc,
            CALC_LINKS.foundationCalc,
            CALC_LINKS.imageEstimator,
          ]}
        />

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                International Engineering & CPM Scheduling Governance
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                This schedule network conforms to ISO 21502:2020 and PMI PMBOK®
                7th Edition principles. In accordance with FIDIC Clause 8.3 and
                NEC4 Clause 31, float ownership, concurrent delay allocation,
                and fast-track trade overlaps are subject to formal contract
                agreements, site-specific geotechnical ground conditions,
                structural engineering certifications, and local building
                permits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SubscriptionGate>
  );
}

function StepCard({
  step,
  isOpen,
  onToggle,
}: {
  step: SequenceStep;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { trade, standardRef } = resolveTradeDiscipline(step.title, step.stage);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <Button
        variant="ghost"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background text-sm font-bold shrink-0">
            {step.step_number}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {step.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {step.stage} · {step.estimated_duration_days} ·{" "}
              {formatTradeName(trade)}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronDown
            aria-hidden="true"
            className="w-5 h-5 text-muted-foreground"
          />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </Button>

      {isOpen && (
        <div className="border-t border-border/50 p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{step.description}</p>

          <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
            <strong className="text-foreground">Standard Citation:</strong>{" "}
            {standardRef}
          </div>

          {/* Prerequisites */}
          {step.prerequisites.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Prerequisites:
              </p>
              <div className="flex gap-2">
                {step.prerequisites.map((p) => (
                  <span
                    key={p}
                    className="text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground"
                  >
                    Step {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Activities */}
          <Section
            icon={HardHat}
            title="Activities"
            items={step.activities}
            color="brand-purple"
          />
          {/* Materials */}
          <Section
            icon={Package}
            title="Materials Required"
            items={step.materials_required}
            color="neutral"
          />
          {/* Quality checks */}
          <Section
            icon={CheckCircle2}
            title="Quality Checks"
            items={step.quality_checks}
            color="green"
          />
          {/* Safety notes */}
          <Section
            icon={ShieldCheck}
            title="Safety Notes"
            items={step.safety_notes}
            color="blue"
          />
          {/* Common mistakes */}
          {step.common_mistakes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Common Mistakes to
                Avoid
              </p>
              <ul className="space-y-1">
                {step.common_mistakes.map((m, i) => (
                  <li
                    key={i}
                    className="text-xs text-amber-600 dark:text-amber-400"
                  >
                    • {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  items,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  color: "brand-purple" | "neutral" | "green" | "blue";
}) {
  const colorMap = {
    "brand-purple": "text-brand-purple",
    neutral: "text-muted-foreground",
    green: "text-green-600",
    blue: "text-blue-600",
  };

  return (
    <div>
      <h4
        className={`text-xs font-semibold ${colorMap[color]} flex items-center gap-1.5 mb-2`}
      >
        <Icon className="w-4 h-4" /> {title}
      </h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-xs text-muted-foreground flex items-start gap-2"
          >
            <span className="text-muted-foreground/40 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
