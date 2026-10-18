import type {
  DAGGraph,
  NodeExecutionStatus,
} from "@/lib/engineering/dag-engine";
import type { SequenceStep } from "@/lib/engineering/sequence-planner";
import {
  Clock,
  CheckCircle2,
  HardHat,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowDown,
} from "lucide-react";

interface ParallelWavesViewProps {
  graph: DAGGraph<SequenceStep>;
  nodeStatuses?: Record<string, NodeExecutionStatus>;
}

export function ParallelWavesView({
  graph,
  nodeStatuses = {},
}: ParallelWavesViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 text-xs shadow-sm">
        <p className="text-muted-foreground">
          <strong className="text-foreground">Parallel execution waves:</strong>{" "}
          Tasks within each wave share no unfinished dependencies and can
          proceed simultaneously across site crews. The next wave unlocks as
          soon as its prerequisites complete.
        </p>
      </div>

      <div className="space-y-4">
        {graph.waves.map((wave, idx) => (
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
                      ? "Single-trade milestone"
                      : `${wave.nodes.length} concurrent work streams`}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Cumulative timeline: Day{" "}
                    {wave.cumulativeDuration - wave.waveDuration} → Day{" "}
                    {wave.cumulativeDuration}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-purple">
                  Wave window: ~{wave.waveDuration} days
                </span>
              </div>
            </div>

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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {node.stage}
                      </span>
                      {node.isCritical ? (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                          Critical
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">
                          Float: {node.totalFloat}d
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground line-clamp-2">
                      {node.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Clock className="h-3 w-3 text-brand-purple" />{" "}
                        {node.duration}d
                      </span>
                      <span>
                        Day {node.earlyStart} → {node.earlyFinish}
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
        ))}
      </div>
    </div>
  );
}
