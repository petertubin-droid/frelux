/**
 * FRELUX Directed Acyclic Graph (DAG) & Parallel Execution Engine
 * Engine, Phase 32 — Construction Sequence & Workflow Orchestration
 *
 * Deterministic graph algorithms & Critical Path Method (CPM):
 * - Validates graph topology & detects cycles via Kahn's algorithm.
 * - Computes topological ordering of dependent tasks.
 * - Partitions tasks into parallel execution waves (concurrency tiers).
 * - Computes Critical Path Method (CPM):
 *     - Forward Pass: Early Start (ES) & Early Finish (EF)
 *     - Backward Pass: Late Start (LS) & Late Finish (LF)
 *     - Total Float (Slack): LF - EF
 *     - Critical Path Identification: nodes where Float === 0
 * - Concurrency performance metrics:
 *     - Sequential Duration vs Parallel (Critical Path) Duration
 *     - Schedule compression & percentage time saved via parallel execution
 *     - Peak concurrency (maximum simultaneous tasks)
 * - Interactive simulation state machine for wave-by-wave parallel runs.
 * - Integration with FRELUX Construction Sequence Planner.
 */

import type { SequencePlan, SequenceStep } from "./sequence-planner";

// =========================================================
// Types
// =========================================================

export type NodeExecutionStatus =
  "pending" | "ready" | "in_progress" | "completed";

export interface RawDAGNode<T = unknown> {
  id: string;
  name: string;
  stage?: string;
  duration: number; // positive duration (in days or arbitrary units)
  dependencies: string[]; // IDs of prerequisite nodes
  data?: T;
}

export interface DAGNode<T = unknown> {
  id: string;
  name: string;
  stage: string;
  duration: number;
  dependencies: string[];
  dependents: string[];
  data?: T;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
  wave: number; // 0-indexed parallel execution wave
}

export interface DAGEdge {
  from: string;
  to: string;
  isCritical: boolean;
}

export interface ExecutionWave<T = unknown> {
  waveIndex: number;
  title: string;
  nodeIds: string[];
  nodes: DAGNode<T>[];
  waveDuration: number; // max duration among concurrent nodes in this wave
  cumulativeDuration: number;
}

export interface DAGMetrics {
  totalNodes: number;
  totalEdges: number;
  sequentialDuration: number;
  parallelDuration: number;
  timeSavedDays: number;
  concurrencySavingsPct: number;
  maxConcurrency: number;
  criticalPathNodeIds: string[];
  wavesCount: number;
  hasCycles: boolean;
  cycleNodes?: string[];
}

export interface DAGGraph<T = unknown> {
  nodes: Map<string, DAGNode<T>>;
  edges: DAGEdge[];
  waves: ExecutionWave<T>[];
  metrics: DAGMetrics;
  topologicalOrder: string[];
}

export interface SimulationState<T = unknown> {
  currentWave: number;
  totalWaves: number;
  elapsedDays: number;
  totalDays: number;
  nodeStatuses: Record<string, NodeExecutionStatus>;
  activeNodeIds: string[];
  completedNodeIds: string[];
  isCompleted: boolean;
}

// =========================================================
// Duration Parser Helper
// =========================================================

/**
 * Extracts a representative duration in days from string specs such as:
 * "2-3 days", "5-7 days (including curing)", "1 day + curing".
 * Defaults conservatively to the upper bound of the estimate range.
 */
export function parseDurationString(durationStr: string): number {
  if (!durationStr || typeof durationStr !== "string") return 1;
  const match = durationStr.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return 1;
  if (match[2]) {
    const high = parseInt(match[2], 10);
    return isNaN(high) ? 1 : Math.max(1, high);
  }
  const single = parseInt(match[1], 10);
  return isNaN(single) ? 1 : Math.max(1, single);
}

// =========================================================
// Core DAG Construction & Analysis
// =========================================================

/**
 * Builds and analyzes a DAG from a list of raw nodes.
 * Guarantees cycle detection, topological sorting, parallel execution
 * wave grouping, and Critical Path Method (CPM) calculation.
 */
export function buildDAG<T = unknown>(rawNodes: RawDAGNode<T>[]): DAGGraph<T> {
  const nodeMap = new Map<string, DAGNode<T>>();
  const dependentsMap = new Map<string, string[]>();
  const inDegreeMap = new Map<string, number>();

  // 1. Initialize nodes and adjacency
  for (const raw of rawNodes) {
    dependentsMap.set(raw.id, []);
    inDegreeMap.set(raw.id, 0);
  }

  for (const raw of rawNodes) {
    // Filter out dependencies that do not exist
    const validDeps = raw.dependencies.filter((depId) =>
      dependentsMap.has(depId),
    );
    inDegreeMap.set(raw.id, validDeps.length);

    for (const depId of validDeps) {
      dependentsMap.get(depId)?.push(raw.id);
    }

    nodeMap.set(raw.id, {
      id: raw.id,
      name: raw.name,
      stage: raw.stage || "General",
      duration: Math.max(0.5, raw.duration),
      dependencies: validDeps,
      dependents: [], // populated next
      data: raw.data,
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: 0,
      lateFinish: 0,
      totalFloat: 0,
      isCritical: false,
      wave: 0,
    });
  }

  // Populate dependents on DAGNode instances
  for (const [id, deps] of dependentsMap.entries()) {
    const node = nodeMap.get(id);
    if (node) {
      node.dependents = [...deps];
    }
  }

  // 2. Kahn's Algorithm for Topological Sort & Cycle Detection
  const queue: string[] = [];
  const inDegreeCopy = new Map(inDegreeMap);

  for (const [id, deg] of inDegreeCopy.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    topologicalOrder.push(currentId);

    const children = dependentsMap.get(currentId) || [];
    for (const childId of children) {
      const currentDeg = inDegreeCopy.get(childId) || 0;
      const nextDeg = currentDeg - 1;
      inDegreeCopy.set(childId, nextDeg);
      if (nextDeg === 0) {
        queue.push(childId);
      }
    }
  }

  // Check for cycles
  const hasCycles = topologicalOrder.length !== rawNodes.length;
  let cycleNodes: string[] | undefined;
  if (hasCycles) {
    cycleNodes = rawNodes
      .map((n) => n.id)
      .filter((id) => !topologicalOrder.includes(id));
  }

  // 3. Parallel Execution Waves (Topological Generations)
  // Wave 0 = roots (no dependencies).
  // Wave(v) = max(Wave(u) for u in dependencies) + 1.
  for (const id of topologicalOrder) {
    const node = nodeMap.get(id)!;
    if (node.dependencies.length === 0) {
      node.wave = 0;
    } else {
      let maxParentWave = 0;
      for (const parentId of node.dependencies) {
        const parentNode = nodeMap.get(parentId);
        if (parentNode) {
          maxParentWave = Math.max(maxParentWave, parentNode.wave);
        }
      }
      node.wave = maxParentWave + 1;
    }
  }

  // 4. Critical Path Method (CPM) - Forward Pass
  // Early Start (ES) & Early Finish (EF)
  for (const id of topologicalOrder) {
    const node = nodeMap.get(id)!;
    if (node.dependencies.length === 0) {
      node.earlyStart = 0;
      node.earlyFinish = node.duration;
    } else {
      let maxParentEF = 0;
      for (const parentId of node.dependencies) {
        const parentNode = nodeMap.get(parentId);
        if (parentNode) {
          maxParentEF = Math.max(maxParentEF, parentNode.earlyFinish);
        }
      }
      node.earlyStart = maxParentEF;
      node.earlyFinish = node.earlyStart + node.duration;
    }
  }

  // Project overall duration (max Early Finish of all sink nodes)
  let projectDuration = 0;
  for (const node of nodeMap.values()) {
    projectDuration = Math.max(projectDuration, node.earlyFinish);
  }

  // 5. Critical Path Method (CPM) - Backward Pass
  // Late Finish (LF) & Late Start (LS)
  // Traverse topological order in reverse
  for (let i = topologicalOrder.length - 1; i >= 0; i--) {
    const id = topologicalOrder[i];
    const node = nodeMap.get(id)!;

    if (node.dependents.length === 0) {
      // Sink node
      node.lateFinish = projectDuration;
      node.lateStart = node.lateFinish - node.duration;
    } else {
      let minChildLS = Infinity;
      for (const childId of node.dependents) {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          minChildLS = Math.min(minChildLS, childNode.lateStart);
        }
      }
      node.lateFinish = minChildLS;
      node.lateStart = node.lateFinish - node.duration;
    }

    // Total Float (Slack) = LF - EF (or LS - ES)
    node.totalFloat = Math.max(
      0,
      Math.round((node.lateFinish - node.earlyFinish) * 100) / 100,
    );
    // Critical if totalFloat is 0 (or within floating-point tolerance of 0.001)
    node.isCritical = Math.abs(node.totalFloat) < 0.001;
  }

  // 6. Build Edges and mark critical edges
  const edges: DAGEdge[] = [];
  const criticalPathNodeIds: string[] = [];

  for (const node of nodeMap.values()) {
    if (node.isCritical) {
      criticalPathNodeIds.push(node.id);
    }
    for (const childId of node.dependents) {
      const childNode = nodeMap.get(childId);
      const isCriticalEdge = Boolean(node.isCritical && childNode?.isCritical);
      edges.push({
        from: node.id,
        to: childId,
        isCritical: isCriticalEdge,
      });
    }
  }

  // 7. Group into Execution Waves
  const wavesMap = new Map<number, DAGNode<T>[]>();
  for (const node of nodeMap.values()) {
    const w = node.wave;
    if (!wavesMap.has(w)) {
      wavesMap.set(w, []);
    }
    wavesMap.get(w)!.push(node);
  }

  const sortedWaveKeys = Array.from(wavesMap.keys()).sort((a, b) => a - b);
  const waves: ExecutionWave<T>[] = [];
  let cumulative = 0;
  let maxConcurrency = 0;

  for (const waveIndex of sortedWaveKeys) {
    const waveNodes = wavesMap.get(waveIndex)!;
    maxConcurrency = Math.max(maxConcurrency, waveNodes.length);
    const waveDuration = Math.max(...waveNodes.map((n) => n.duration), 0);
    cumulative += waveDuration;

    waves.push({
      waveIndex,
      title: `Wave ${waveIndex + 1} (${waveNodes.length} ${waveNodes.length === 1 ? "task" : "parallel tasks"})`,
      nodeIds: waveNodes.map((n) => n.id),
      nodes: waveNodes,
      waveDuration,
      cumulativeDuration: cumulative,
    });
  }

  // 8. Compute Aggregate Metrics
  let sequentialDuration = 0;
  for (const node of nodeMap.values()) {
    sequentialDuration += node.duration;
  }

  const timeSavedDays = Math.max(0, sequentialDuration - projectDuration);
  const concurrencySavingsPct =
    sequentialDuration > 0
      ? Math.round((timeSavedDays / sequentialDuration) * 1000) / 10
      : 0;

  const metrics: DAGMetrics = {
    totalNodes: nodeMap.size,
    totalEdges: edges.length,
    sequentialDuration,
    parallelDuration: projectDuration,
    timeSavedDays,
    concurrencySavingsPct,
    maxConcurrency,
    criticalPathNodeIds,
    wavesCount: waves.length,
    hasCycles,
    cycleNodes,
  };

  return {
    nodes: nodeMap,
    edges,
    waves,
    metrics,
    topologicalOrder,
  };
}

// =========================================================
// Sequence Plan to DAG Converter
// =========================================================

export interface SequenceDAGOptions {
  /**
   * If true, activates parallel branch decomposition for activities that can
   * legally execute in parallel (e.g. partition walls parallel with external walls,
   * hardcore filling overlap with foundation blockwork, fascia overlap with roof covering).
   */
  fastTrackParallel?: boolean;
}

/**
 * Transforms a FRELUX SequencePlan into a fully computed DAG.
 */
export function sequencePlanToDAG(
  plan: SequencePlan,
  options: SequenceDAGOptions = {},
): DAGGraph<SequenceStep> {
  const { fastTrackParallel = true } = options;

  const rawNodes: RawDAGNode<SequenceStep>[] = [];

  for (const step of plan.steps) {
    const stepId = `step-${step.step_number}`;
    const duration = parseDurationString(step.estimated_duration_days);

    let dependencies = step.prerequisites.map((p) => `step-${p}`);

    // If fast-track parallel is enabled, optimize dependencies where independent
    // branches can execute concurrently per standard construction practice:
    if (fastTrackParallel) {
      // Step 7 (Hardcore filling) can start as soon as Step 5 (Foundation concrete) is done,
      // in parallel with Step 6 (Foundation blockwork).
      if (step.step_number === 7) {
        dependencies = ["step-5"];
      }
    }

    rawNodes.push({
      id: stepId,
      name: step.title,
      stage: step.stage,
      duration,
      dependencies,
      data: step,
    });
  }

  // If fastTrackParallel is enabled, add realistic parallel sub-branch nodes
  // to reflect actual contractor site division of labour:
  if (fastTrackParallel) {
    // 1. Underground MEP Rough-in (Runs in parallel with Hardcore Filling, depends on Step 5, blocks Slab Step 8)
    rawNodes.push({
      id: "step-parallel-mep-ground",
      name: "Underground MEP Drainage & Conduit Rough-in",
      stage: "Ground Floor",
      duration: 3,
      dependencies: ["step-5"],
      data: {
        step_number: 701,
        stage: "Ground Floor",
        title: "Underground MEP Drainage & Conduit Rough-in",
        description:
          "Install underground PVC sewer pipes, waste drains, water supply sleeves, and electrical ground conduits before oversite concrete pour.",
        prerequisites: [5],
        activities: [
          "Lay 4-inch and 6-inch soil drain pipes at minimum 1:50 fall",
          "Install water supply sleeves through foundation grade beams",
          "Position electrical ground earth rod and main feed sleeve",
          "Pressure-test drainage before backfilling",
        ],
        materials_required: [
          "PVC drain pipes",
          "Solvent cement",
          "Sleeves",
          "Earth rod and copper clamp",
        ],
        quality_checks: [
          "Pipe slopes verified with spirit level (minimum 1:50)",
          "All stub-ups capped to prevent debris entry during pour",
          "Air or water test held for 15 minutes without leakage",
        ],
        safety_notes: ["Keep trenches guarded during pipe installation"],
        common_mistakes: [
          "Forgetting pipes before casting slab → costly diamond core cutting later",
        ],
        estimated_duration_days: "2-3 days",
        is_critical: false,
      },
    });

    // Make Step 8 (Slab) depend on both Hardcore (step-7) AND underground MEP
    const slabNode = rawNodes.find((n) => n.id === "step-8");
    if (
      slabNode &&
      !slabNode.dependencies.includes("step-parallel-mep-ground")
    ) {
      slabNode.dependencies.push("step-parallel-mep-ground");
    }

    // 2. Internal Partition Walls (Runs in parallel with External Walls step-9 & step-10)
    rawNodes.push({
      id: "step-parallel-partitions",
      name: "Internal Room Partition Blockwork",
      stage: "Walls",
      duration: 6,
      dependencies: ["step-8"],
      data: {
        step_number: 901,
        stage: "Walls",
        title: "Internal Room Partition Blockwork",
        description:
          "Concurrent mason crew laying non-load-bearing room dividing walls while the main structural crew carries load-bearing perimeter walls to lintel level.",
        prerequisites: [8],
        activities: [
          "Set out internal room partition lines from architectural drawings",
          "Lay 150mm (6-inch) partition blocks to door lintel level",
          "Tie internal walls to external walls with hoop iron or wire mesh every 3 courses",
          "Form interior door openings with proper tolerances",
        ],
        materials_required: [
          "150mm blocks",
          "Cement",
          "Sand",
          "Wall ties / hoop iron",
        ],
        quality_checks: [
          "Room dimensions match approved layout ±15mm",
          "Walls plumb and properly keyed into external masonry",
          "Door opening heights and widths verified with door schedule",
        ],
        safety_notes: ["Provide safe internal scaffolding"],
        common_mistakes: [
          "Omitting wall ties → cracking at wall intersections",
        ],
        estimated_duration_days: "5-6 days",
        is_critical: false,
      },
    });

    // Step 10 (Ring beam) ties in external walls and internal partitions
    const ringBeamNode = rawNodes.find((n) => n.id === "step-10");
    if (
      ringBeamNode &&
      !ringBeamNode.dependencies.includes("step-parallel-partitions")
    ) {
      ringBeamNode.dependencies.push("step-parallel-partitions");
    }

    // 3. Fascia & Rainwater Gutter Prep (Runs in parallel with Roof Covering step-12)
    rawNodes.push({
      id: "step-parallel-fascia-gutters",
      name: "Fascia Board, Soffit Framing & Gutter Alignment",
      stage: "Roofing",
      duration: 3,
      dependencies: ["step-11"],
      data: {
        step_number: 1101,
        stage: "Roofing",
        title: "Fascia Board, Soffit Framing & Gutter Alignment",
        description:
          "Specialist carpentry team fixing hardwood or PVC fascia boards and bracket alignments concurrently while the sheet roofing crew commences decking.",
        prerequisites: [11],
        activities: [
          "Fix straight line fascia boards to rafter feet",
          "Install soffit bearers and ventilation mesh",
          "Mount gutter support brackets with correct falls to downpipes",
        ],
        materials_required: [
          "Fascia board (hardwood or fiber-cement)",
          "Nails/screws",
          "Gutter brackets",
        ],
        quality_checks: [
          "Fascia is laser-straight along roof eaves",
          "Minimum 1:100 fall on gutters toward downpipes",
        ],
        safety_notes: ["Fall protection harness mandatory at eaves"],
        common_mistakes: [
          "Inadequate fall → standing water and gutter overflow",
        ],
        estimated_duration_days: "2-3 days",
        is_critical: false,
      },
    });
  }

  return buildDAG(rawNodes);
}

// =========================================================
// Simulation Engine for Interactive Wave-by-Wave Execution
// =========================================================

/**
 * Initializes the simulation state for a DAG graph.
 */
export function initializeSimulation<T = unknown>(
  graph: DAGGraph<T>,
): SimulationState<T> {
  const nodeStatuses: Record<string, NodeExecutionStatus> = {};
  for (const id of graph.nodes.keys()) {
    nodeStatuses[id] = "pending";
  }

  // Wave 0 nodes are ready to execute immediately
  const firstWave = graph.waves[0];
  if (firstWave) {
    for (const id of firstWave.nodeIds) {
      nodeStatuses[id] = "ready";
    }
  }

  return {
    currentWave: -1, // -1 represents not started yet
    totalWaves: graph.waves.length,
    elapsedDays: 0,
    totalDays: graph.metrics.parallelDuration,
    nodeStatuses,
    activeNodeIds: [],
    completedNodeIds: [],
    isCompleted: false,
  };
}

/**
 * Steps the simulation forward by one execution wave.
 * In this step, all nodes in the target wave transition to "completed",
 * and the nodes in the subsequent wave transition to "in_progress" or "ready".
 */
export function stepSimulationWave<T = unknown>(
  graph: DAGGraph<T>,
  state: SimulationState<T>,
): SimulationState<T> {
  if (state.isCompleted || state.currentWave >= graph.waves.length - 1) {
    // Complete everything
    const completedMap: Record<string, NodeExecutionStatus> = {};
    for (const id of graph.nodes.keys()) {
      completedMap[id] = "completed";
    }
    return {
      ...state,
      currentWave: graph.waves.length - 1,
      elapsedDays: graph.metrics.parallelDuration,
      nodeStatuses: completedMap,
      activeNodeIds: [],
      completedNodeIds: Array.from(graph.nodes.keys()),
      isCompleted: true,
    };
  }

  const nextWaveIndex = state.currentWave + 1;
  const targetWave = graph.waves[nextWaveIndex];

  const nextStatuses = { ...state.nodeStatuses };
  const newlyCompleted: string[] = [];

  // Mark previous active nodes as completed
  for (const activeId of state.activeNodeIds) {
    nextStatuses[activeId] = "completed";
    if (!state.completedNodeIds.includes(activeId)) {
      newlyCompleted.push(activeId);
    }
  }

  // Mark all nodes in nextWave as in_progress
  const nextActiveNodeIds = targetWave.nodeIds;
  for (const id of nextActiveNodeIds) {
    nextStatuses[id] = "in_progress";
  }

  // Mark nodes in subsequent wave as ready if all prerequisites are completed or in progress
  const subsequentWave = graph.waves[nextWaveIndex + 1];
  if (subsequentWave) {
    for (const subId of subsequentWave.nodeIds) {
      nextStatuses[subId] = "ready";
    }
  }

  const updatedCompleted = [...state.completedNodeIds, ...newlyCompleted];
  const elapsedDays = targetWave.cumulativeDuration;
  const isCompleted = nextWaveIndex >= graph.waves.length - 1;

  return {
    currentWave: nextWaveIndex,
    totalWaves: graph.waves.length,
    elapsedDays: Math.min(elapsedDays, graph.metrics.parallelDuration),
    totalDays: graph.metrics.parallelDuration,
    nodeStatuses: nextStatuses,
    activeNodeIds: nextActiveNodeIds,
    completedNodeIds: updatedCompleted,
    isCompleted: false, // will complete on next step or final wave
  };
}
