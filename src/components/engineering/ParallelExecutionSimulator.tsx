import { useEffect, useState } from "react";
import type {
  DAGGraph,
  SimulationState,
  WorkingCalendarModel,
} from "@/lib/engineering/dag-engine";
import {
  computeCalendarSchedule,
  computeScheduleWithBuffer,
  WORKING_CALENDAR_CONFIGS,
  exportDAGScheduleCSV,
  generateExecutiveScheduleSummary,
  formatTradeName,
} from "@/lib/engineering/dag-engine";
import type { SequenceStep } from "@/lib/engineering/sequence-planner";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  TrendingUp,
  Users,
  Calendar,
  ShieldAlert,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";

interface ParallelExecutionSimulatorProps {
  graph: DAGGraph<SequenceStep>;
  simulationState: SimulationState<SequenceStep>;
  onStepForward: () => void;
  onReset: () => void;
  fastTrackParallel: boolean;
  onToggleFastTrack: (enabled: boolean) => void;
  calendarModel?: WorkingCalendarModel;
  onChangeCalendarModel?: (model: WorkingCalendarModel) => void;
  contingencyBufferPct?: number;
  onChangeContingencyBuffer?: (pct: number) => void;
  marketCode?: string;
}

export function ParallelExecutionSimulator({
  graph,
  simulationState,
  onStepForward,
  onReset,
  fastTrackParallel,
  onToggleFastTrack,
  calendarModel = "calendar_7d",
  onChangeCalendarModel,
  contingencyBufferPct = 10,
  onChangeContingencyBuffer,
  marketCode = "Global",
}: ParallelExecutionSimulatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { metrics } = graph;

  useEffect(() => {
    if (!isPlaying) return;
    if (simulationState.isCompleted) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      onStepForward();
    }, 1800);
    return () => clearTimeout(timer);
  }, [isPlaying, simulationState, onStepForward]);

  const activeTasksCount = simulationState.activeNodeIds.length;
  const progressPercent =
    metrics.parallelDuration > 0
      ? Math.round(
          (simulationState.elapsedDays / metrics.parallelDuration) * 100,
        )
      : 0;

  // Calendar conversion & Risk allowance
  const calendarSchedule = computeCalendarSchedule(
    metrics.parallelDuration,
    calendarModel,
  );
  const bufferedSchedule = computeScheduleWithBuffer(
    metrics.parallelDuration,
    contingencyBufferPct,
  );

  const handleDownloadCSV = () => {
    const csvContent = exportDAGScheduleCSV(graph);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `FRELUX-CPM-Schedule-${marketCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyExecutiveBrief = () => {
    const brief = generateExecutiveScheduleSummary(graph, {
      calendarModel,
      contingencyBufferPct,
      marketCode,
    });
    navigator.clipboard.writeText(brief).then(() => {
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2500);
    });
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Critical Path Parallel Duration */}
        <div className="rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Parallel duration (CPM Critical Path)
            </p>
            <Calendar className="h-4 w-4 text-brand-purple" />
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {metrics.parallelDuration}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              work days
            </span>
          </p>
          <p className="mt-1 text-[11px] text-brand-purple font-medium">
            ~{calendarSchedule.calendarWeeks} calendar weeks (
            {calendarSchedule.calendarDays} cal days)
          </p>
        </div>

        {/* Sequential Baseline */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Sequential Duration
          </p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground line-through">
            {metrics.sequentialDuration}{" "}
            <span className="text-xs font-normal">days</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Single-crew linear execution
          </p>
        </div>

        {/* Concurrency Speedup & Time Saved */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Parallel Time Saved
            </p>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {metrics.timeSavedDays}{" "}
            <span className="text-xs font-normal text-emerald-700">
              days ({metrics.concurrencySavingsPct}%)
            </span>
          </p>
          <p className="mt-1 text-[11px] text-emerald-600/80">
            Schedule compression gain
          </p>
        </div>

        {/* Multi-Trade Peak Concurrency */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Peak concurrency (Multi-Trade)
            </p>
            <Users className="h-4 w-4 text-brand-purple" />
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {metrics.peakSimultaneousTrades}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              trade gangs
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {metrics.maxConcurrency} simultaneous tasks ({metrics.wavesCount}{" "}
            waves)
          </p>
        </div>
      </div>

      {/* Global Configuration Bar (Working Calendar & Time Risk Allowance Buffer) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Working Calendar Model */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">Calendar:</span>
            <select
              value={calendarModel}
              onChange={(e) =>
                onChangeCalendarModel?.(e.target.value as WorkingCalendarModel)
              }
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-purple"
            >
              <option value="calendar_7d">
                7-Day Continuous (Curing & Fast-track)
              </option>
              <option value="site_6d">
                6-Day Site Week (Mon–Sat standard)
              </option>
              <option value="standard_5d">
                5-Day Week (Mon–Fri public/civil)
              </option>
            </select>
          </div>

          {/* Time Risk Allowance / Contingency Buffer */}
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold text-foreground">
              Time Risk Buffer (TRA):
            </span>
            <select
              value={contingencyBufferPct}
              onChange={(e) =>
                onChangeContingencyBuffer?.(parseInt(e.target.value, 10))
              }
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-purple"
            >
              <option value={0}>0% Deterministic Baseline</option>
              <option value={10}>
                10% Standard Weather & Inspection Buffer
              </option>
              <option value={15}>
                15% Heavy Rain / Geotechnical Contingency
              </option>
            </select>
            {contingencyBufferPct > 0 && (
              <span className="font-semibold text-amber-600">
                +{bufferedSchedule.bufferDays}d →{" "}
                {bufferedSchedule.totalBufferedDays}d total
              </span>
            )}
          </div>
        </div>

        {/* Professional Export Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1 text-xs h-7"
            title="Download CSV for Microsoft Project, Primavera P6, or Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export CPM CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyExecutiveBrief}
            className="inline-flex items-center gap-1 text-xs h-7"
            title="Copy Executive Schedule Brief in Markdown"
          >
            {copiedBrief ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copied Brief!
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 text-brand-purple" />
                Executive Brief
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Interactive Parallel Runner & Controls */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-brand-purple" />
            <h4 className="text-sm font-bold text-foreground">
              Interactive Parallel Execution Runner
            </h4>
            <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              ISO 21502 / PMBOK 7th Ed
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={fastTrackParallel}
              onChange={(e) => onToggleFastTrack(e.target.checked)}
              className="rounded border-border text-brand-purple focus:ring-brand-purple"
            />
            <span className="font-medium text-foreground">
              Fast-track overlapping branches (MEP, Partitions, Fascia)
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={isPlaying ? "destructive" : "default"}
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isPlaying
                ? "Pause Run"
                : simulationState.isCompleted
                  ? "Replay Simulation"
                  : "Run Parallel Simulation"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onStepForward}
              disabled={simulationState.isCompleted || isPlaying}
              className="inline-flex items-center gap-1 text-xs"
            >
              <SkipForward className="h-3.5 w-3.5" /> Step Wave
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsPlaying(false);
                onReset();
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              Execution Wave:{" "}
              <strong className="text-foreground">
                {simulationState.currentWave === -1
                  ? "Ready to Launch"
                  : `${simulationState.currentWave + 1} of ${simulationState.totalWaves}`}
              </strong>
            </span>
            <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 font-medium text-brand-purple">
              Active Concurrent Tasks: {activeTasksCount}
            </span>
            <span className="text-muted-foreground">
              Day{" "}
              <strong className="text-foreground">
                {simulationState.elapsedDays}
              </strong>{" "}
              of {metrics.parallelDuration}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-brand-purple transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
