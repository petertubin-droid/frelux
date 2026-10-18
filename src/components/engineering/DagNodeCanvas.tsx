import { useState, useMemo, useRef, useEffect } from "react";
import type {
  DAGGraph,
  DAGNode,
  NodeExecutionStatus,
} from "@/lib/engineering/dag-engine";
import { formatTradeName } from "@/lib/engineering/dag-engine";
import type { SequenceStep } from "@/lib/engineering/sequence-planner";
import {
  Clock,
  CheckCircle2,
  HardHat,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Search,
  Filter,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";

interface DagNodeCanvasProps {
  graph: DAGGraph<SequenceStep>;
  nodeStatuses?: Record<string, NodeExecutionStatus>;
  onSelectNode?: (nodeId: string | null) => void;
}

type FilterMode = "all" | "critical" | "float";

export function DagNodeCanvas({
  graph,
  nodeStatuses = {},
  onSelectNode,
}: DagNodeCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return graph.nodes.get(selectedId) || null;
  }, [selectedId, graph]);

  const { ancestorIds, descendantIds } = useMemo(() => {
    if (!selectedId)
      return {
        ancestorIds: new Set<string>(),
        descendantIds: new Set<string>(),
      };

    const ancestors = new Set<string>();
    const descendants = new Set<string>();

    const traceAncestors = (id: string) => {
      const preds = graph.predecessors[id] || [];
      for (const p of preds) {
        if (!ancestors.has(p)) {
          ancestors.add(p);
          traceAncestors(p);
        }
      }
    };

    const traceDescendants = (id: string) => {
      const succs = graph.successors[id] || [];
      for (const s of succs) {
        if (!descendants.has(s)) {
          descendants.add(s);
          traceDescendants(s);
        }
      }
    };

    traceAncestors(selectedId);
    traceDescendants(selectedId);

    return { ancestorIds: ancestors, descendantIds: descendants };
  }, [selectedId, graph]);

  // Track coordinates for connecting lines
  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const positions: Record<string, { x: number; y: number }> = {};

      const nodeElements =
        containerRef.current.querySelectorAll<HTMLElement>("[data-node-id]");
      nodeElements.forEach((el) => {
        const id = el.getAttribute("data-node-id");
        if (id) {
          const rect = el.getBoundingClientRect();
          positions[id] = {
            x: (rect.left - containerRect.left + rect.width / 2) / zoom,
            y: (rect.top - containerRect.top + rect.height / 2) / zoom,
          };
        }
      });
      setNodePositions(positions);
    };

    updatePositions();
    const timer = setTimeout(updatePositions, 100);
    window.addEventListener("resize", updatePositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePositions);
    };
  }, [graph, zoom]);

  const handleSelect = (id: string) => {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    onSelectNode?.(next);
  };

  const matchesFilter = (node: DAGNode<SequenceStep>) => {
    if (filterMode === "critical" && !node.isCritical) return false;
    if (filterMode === "float" && node.isCritical) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        node.stage.toLowerCase().includes(q) ||
        node.standardReference.toLowerCase().includes(q)
      );
    }
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Canvas Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Interactive DAG Network Graph
            </h4>
            <p className="text-xs text-muted-foreground">
              {graph.metrics.totalNodes} nodes · {graph.metrics.totalEdges}{" "}
              dependency edges · {graph.waves.length} parallel waves · CPM
              Critical Path
            </p>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filterMode === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({graph.metrics.totalNodes})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("critical")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filterMode === "critical"
                  ? "bg-card text-amber-600 shadow-sm"
                  : "text-muted-foreground hover:text-amber-600"
              }`}
            >
              Critical ({graph.metrics.criticalNodesCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("float")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filterMode === "float"
                  ? "bg-card text-emerald-600 shadow-sm"
                  : "text-muted-foreground hover:text-emerald-600"
              }`}
            >
              With Float (
              {graph.metrics.totalNodes - graph.metrics.criticalNodesCount})
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(1)}
              title="Reset zoom"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="relative min-h-[480px] overflow-x-auto rounded-2xl border border-border bg-muted/20 p-6 shadow-inner"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
      >
        {/* SVG Dependency Lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{
            minWidth: `${Math.max(graph.waves.length * 340, 1100)}px`,
            minHeight: "540px",
          }}
        >
          <defs>
            <marker
              id="arrowhead-default"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                className="fill-muted-foreground/40"
              />
            </marker>
            <marker
              id="arrowhead-critical"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" className="fill-amber-500" />
            </marker>
            <marker
              id="arrowhead-highlight"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" className="fill-brand-purple" />
            </marker>
          </defs>

          {graph.edges.map((edge) => {
            const fromPos = nodePositions[edge.from];
            const toPos = nodePositions[edge.to];
            if (!fromPos || !toPos) return null;

            const isEdgeHighlighted =
              selectedId &&
              ((ancestorIds.has(edge.from) &&
                (ancestorIds.has(edge.to) || edge.to === selectedId)) ||
                (descendantIds.has(edge.to) &&
                  (descendantIds.has(edge.from) || edge.from === selectedId)));

            const strokeColor = isEdgeHighlighted
              ? "stroke-brand-purple"
              : edge.isCritical
                ? "stroke-amber-500"
                : "stroke-border";

            const marker = isEdgeHighlighted
              ? "url(#arrowhead-highlight)"
              : edge.isCritical
                ? "url(#arrowhead-critical)"
                : "url(#arrowhead-default)";

            const dx = toPos.x - fromPos.x;
            const curve = Math.max(30, dx * 0.45);
            const pathData = `M ${fromPos.x + 115} ${fromPos.y} C ${fromPos.x + 115 + curve} ${fromPos.y}, ${toPos.x - 115 - curve} ${toPos.y}, ${toPos.x - 115} ${toPos.y}`;

            return (
              <path
                key={`${edge.from}->${edge.to}`}
                d={pathData}
                fill="none"
                className={`${strokeColor} transition-all duration-200`}
                strokeWidth={
                  isEdgeHighlighted ? "2.5" : edge.isCritical ? "2" : "1.25"
                }
                strokeDasharray={edge.isCritical ? undefined : "3 3"}
                markerEnd={marker}
              />
            );
          })}
        </svg>

        {/* Waves Columns */}
        <div className="relative flex min-w-max gap-8 pb-8 pt-2">
          {graph.waves.map((wave) => (
            <div key={wave.waveIndex} className="flex w-76 flex-col space-y-4">
              {/* Wave Column Header */}
              <div className="sticky top-0 z-10 rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-purple">
                    Wave {wave.waveIndex + 1}
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-brand-purple">
                    ~{wave.waveDuration}d window
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {wave.nodes.length}{" "}
                    {wave.nodes.length === 1 ? "task" : "parallel tasks"}
                  </span>
                  <span>Day {wave.cumulativeDuration}</span>
                </div>
              </div>

              {/* Node Cards in this Wave */}
              <div className="space-y-4">
                {wave.nodes.map((node) => {
                  const isVisible = matchesFilter(node);
                  if (!isVisible) return null;

                  const status = nodeStatuses[node.id] || "pending";
                  const isSelected = selectedId === node.id;
                  const isAncestor = ancestorIds.has(node.id);
                  const isDescendant = descendantIds.has(node.id);

                  let borderClass = "border-border";
                  let bgClass = "bg-card";

                  if (isSelected) {
                    borderClass =
                      "border-brand-purple ring-2 ring-brand-purple/30";
                    bgClass = "bg-primary/5";
                  } else if (isAncestor) {
                    borderClass = "border-blue-400";
                    bgClass = "bg-blue-50/40 dark:bg-blue-950/20";
                  } else if (isDescendant) {
                    borderClass = "border-purple-400";
                    bgClass = "bg-purple-50/40 dark:bg-purple-950/20";
                  } else if (node.isCritical) {
                    borderClass = "border-amber-500/70";
                  }

                  return (
                    <div
                      key={node.id}
                      data-node-id={node.id}
                      onClick={() => handleSelect(node.id)}
                      className={`relative z-10 cursor-pointer rounded-2xl border p-4 shadow-card transition-all duration-200 hover:shadow-md ${borderClass} ${bgClass}`}
                    >
                      {/* Status indicator & Float badge */}
                      <div className="mb-2 flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                          {node.stage}
                        </span>
                        {status === "in_progress" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-purple/10 px-2 py-0.5 text-[10px] font-bold text-brand-purple animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-purple" />
                            Executing
                          </span>
                        )}
                        {status === "completed" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </span>
                        )}
                        {status === "pending" && node.isCritical && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                            Critical (0d float)
                          </span>
                        )}
                        {status === "pending" && !node.isCritical && (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                            TF: {node.totalFloat}d
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs font-semibold leading-tight text-foreground">
                        {node.name}
                      </h5>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatTradeName(node.trade)}
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <Clock className="h-3 w-3 text-brand-purple" />
                          {node.duration}d
                        </span>
                        <span className="font-mono text-[10px]">
                          ES:{node.earlyStart} · EF:{node.earlyFinish}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="rounded-2xl border border-brand-purple/30 bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-brand-purple px-2.5 py-1 text-xs font-bold text-white">
                  Wave {selectedNode.wave + 1}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {selectedNode.stage}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {formatTradeName(selectedNode.trade)}
                </span>
                {selectedNode.isCritical ? (
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600">
                    CPM Critical Path (Total Float: 0d)
                  </span>
                ) : (
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Float Available: {selectedNode.totalFloat}d (Free Float:{" "}
                    {selectedNode.freeFloat}d)
                  </span>
                )}
              </div>
              <h4 className="mt-2 text-lg font-bold text-foreground">
                {selectedNode.name}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                <strong className="text-foreground">Standard Citation:</strong>{" "}
                {selectedNode.standardReference}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedId(null)}
            >
              Close
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/40 p-3 text-xs sm:grid-cols-6">
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Duration
              </span>
              <strong className="text-sm text-foreground">
                {selectedNode.duration} days
              </strong>
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Early Start (ES)
              </span>
              <strong className="text-sm text-foreground font-mono">
                Day {selectedNode.earlyStart}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Early Finish (EF)
              </span>
              <strong className="text-sm text-foreground font-mono">
                Day {selectedNode.earlyFinish}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Late Start (LS)
              </span>
              <strong className="text-sm text-foreground font-mono">
                Day {selectedNode.lateStart}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Late Finish (LF)
              </span>
              <strong className="text-sm text-foreground font-mono">
                Day {selectedNode.lateFinish}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Total Float / Free Float
              </span>
              <strong className="text-sm text-foreground font-mono">
                {selectedNode.totalFloat}d / {selectedNode.freeFloat}d
              </strong>
            </div>
          </div>

          {/* Predecessors & Successors causal links */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-card p-3">
              <span className="text-xs font-semibold text-muted-foreground">
                Prerequisites ({selectedNode.dependencies.length})
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selectedNode.dependencies.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    None (Project Milestone / Root)
                  </span>
                ) : (
                  selectedNode.dependencies.map((depId) => {
                    const parent = graph.nodes.get(depId);
                    return (
                      <button
                        key={depId}
                        type="button"
                        onClick={() => setSelectedId(depId)}
                        className="rounded bg-muted px-2 py-0.5 text-xs text-brand-purple hover:underline"
                      >
                        {parent?.name || depId}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3">
              <span className="text-xs font-semibold text-muted-foreground">
                Successors ({selectedNode.dependents.length})
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selectedNode.dependents.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    None (Terminal Activity / Project Completion)
                  </span>
                ) : (
                  selectedNode.dependents.map((succId) => {
                    const child = graph.nodes.get(succId);
                    return (
                      <button
                        key={succId}
                        type="button"
                        onClick={() => setSelectedId(succId)}
                        className="rounded bg-muted px-2 py-0.5 text-xs text-brand-purple hover:underline"
                      >
                        {child?.name || succId}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {selectedNode.data && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                {selectedNode.data.description}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-purple">
                    <HardHat className="h-4 w-4" /> Activities
                  </p>
                  <ul className="space-y-1.5">
                    {selectedNode.data.activities.map(
                      (item: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <span className="text-brand-purple">•</span>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Quality Checks &
                    International Standards
                  </p>
                  <ul className="space-y-1.5">
                    {selectedNode.data.quality_checks.map(
                      (item: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <span className="text-emerald-500">✓</span>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
