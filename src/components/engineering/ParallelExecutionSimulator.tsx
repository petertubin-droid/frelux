import { useEffect, useState } from "react";
import type { DAGGraph, SimulationState } from "@/lib/engineering/dag-engine";
import type { SequenceStep } from "@/lib/engineering/sequence-planner";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Zap,
  Users,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";

interface ParallelExecutionSimulatorProps {
  graph: DAGGraph<SequenceStep>;
  simulationState: SimulationState<SequenceStep>;
  onStepForward: () => void;
  onReset: () => void;
  fastTrackParallel: boolean;
  onToggleFastTrack: (enabled: boolean) => void;
}

export function ParallelExecutionSimulator({
  graph,
  simulationState,
  onStepForward,
  onReset,
  fastTrackParallel,
  onToggleFastTrack,
}: ParallelExecutionSimulatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Parallel duration
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {metrics.parallelDuration}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              days
            </span>
          </p>
          <p className="mt-1 text-[11px] text-brand-purple">
            Critical path timeline
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Sequential duration
          </p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground line-through">
            {metrics.sequentialDuration}{" "}
            <span className="text-xs font-normal">days</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            If run end-to-end
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Time saved
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
            Parallel speedup
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Peak concurrency
            </p>
            <Users className="h-4 w-4 text-brand-purple" />
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {metrics.maxConcurrency}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              parallel tasks
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {metrics.wavesCount} execution waves
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-brand-purple" />
            <h4 className="text-sm font-bold text-foreground">
              Interactive parallel execution runner
            </h4>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={fastTrackParallel}
              onChange={(e) => onToggleFastTrack(e.target.checked)}
              className="rounded border-border text-brand-purple focus:ring-brand-purple"
            />
            <span className="font-medium text-foreground">
              Fast-track overlapping branches
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
                ? "Pause run"
                : simulationState.isCompleted
                  ? "Replay simulation"
                  : "Run parallel simulation"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onStepForward}
              disabled={simulationState.isCompleted || isPlaying}
              className="inline-flex items-center gap-1 text-xs"
            >
              <SkipForward className="h-3.5 w-3.5" /> Step wave
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
              Wave:{" "}
              <strong className="text-foreground">
                {simulationState.currentWave === -1
                  ? "Ready"
                  : `${simulationState.currentWave + 1} of ${simulationState.totalWaves}`}
              </strong>
            </span>
            <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 font-medium text-brand-purple">
              Active streams: {activeTasksCount}
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
