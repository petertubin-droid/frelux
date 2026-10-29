import type {
  DAGGraph,
  NodeExecutionStatus,
  WorkingCalendarModel,
} from "@/lib/engineering/dag-engine";
import {
  formatTradeName,
  computeCalendarSchedule,
} from "@/lib/engineering/dag-engine";
import type { SequenceStep } from "@/lib/engineering/sequence-planner";
import { useLanguage } from "@/lib/i18n";
import {
  Clock,
  CheckCircle2,
  HardHat,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowDown,
  Users,
} from "lucide-react";

interface ParallelWavesViewProps {
  graph: DAGGraph<SequenceStep>;
  nodeStatuses?: Record<string, NodeExecutionStatus>;
  calendarModel?: WorkingCalendarModel;
}

export function ParallelWavesView({
  graph,
  nodeStatuses = {},
  calendarModel = "calendar_7d",
}: ParallelWavesViewProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 text-xs shadow-sm">
        <p className="text-muted-foreground">
          <strong className="text-foreground">Parallel execution waves:</strong>{" "}
          Tasks within each wave share zero unfinished dependencies and can
          proceed simultaneously across dedicated site trade crews. In
          accordance with ISO 21502 and PMBOK® scheduling principles, succeeding
          waves unlock as soon as all prerequisite milestones finish.
        </p>
      </div>

      <div className="space-y-4">
        {graph.waves.map((wave, idx) => {
          const calStart = computeCalendarSchedule(
            Math.max(0, wave.cumulativeDuration - wave.waveDuration),
            calendarModel,
          );
          const calEnd = computeCalendarSchedule(
            wave.cumulativeDuration,
            calendarModel,
          );

          return (
            <div
              key={wave.waveIndex}
              className="relative rounded-2xl border border-border bg-card p-5 shadow-card transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-purple text-xs font-bold text-white">
                    {wave.waveIndex + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Wave {wave.waveIndex + 1}:{" "}
                      {wave.nodes.length === 1
                        ? "Single-Trade Focus Milestone"
                        : `${wave.nodes.length} Concurrent Work Streams`}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Cumulative: Work Day{" "}
                      {Math.max(0, wave.cumulativeDuration - wave.waveDuration)}{" "}
                      → Day {wave.cumulativeDuration} (~Week{" "}
                      {calStart.calendarWeeks} → {calEnd.calendarWeeks})
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-brand-purple" />
                    {wave.activeTrades.length}{" "}
                    {wave.activeTrades.length === 1
                      ? "trade gang"
                      : "trade gangs"}
                  </span>
                  <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-purple">
                    Wave window: ~{wave.waveDuration} work days
                  </span>
                </div>
              </div>

              {/* Active Trades for this wave */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {wave.activeTrades.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-foreground"
                  >
                    {formatTradeName(t)}
                  </span>
                ))}
              </div>

              {/* Task cards in this wave */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {wave.nodes.map((node) => {
                  const status = nodeStatuses[node.id] || "pending";
                  return (
                    <div
                      key={node.id}
                      className={`rounded-xl border p-3.5 transition-all ${
                        node.isCritical
                          ? "border-amber-500/50 bg-amber-500/5"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                          {node.stage}
                        </span>
                        {node.isCritical ? (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                            {t("Critical (0d float)")}
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                            TF: {node.totalFloat}d · FF: {node.freeFloat}d
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-foreground line-clamp-2">
                        {node.name}
                      </p>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatTradeName(node.trade)}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2 font-mono text-[10px]">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <Clock className="h-3 w-3 text-brand-purple" />{" "}
                          {node.duration}d
                        </span>
                        <span>
                          ES:{node.earlyStart} → EF:{node.earlyFinish}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {idx < graph.waves.length - 1 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm">
                  <ArrowDown className="h-3 w-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
