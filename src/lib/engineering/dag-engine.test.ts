import { describe, it, expect } from "vitest";
import {
  buildDAG,
  parseDurationString,
  sequencePlanToDAG,
  initializeSimulation,
  stepSimulationWave,
  resolveTradeDiscipline,
  formatTradeName,
  computeCalendarSchedule,
  computeScheduleWithBuffer,
  exportScheduleToCSV,
  generateScheduleExecutiveSummary,
  type RawDAGNode,
} from "./dag-engine";
import { generateSequencePlan } from "./sequence-planner";

describe("DAG & Parallel Execution Engine", () => {
  describe("parseDurationString", () => {
    it("parses range durations correctly", () => {
      expect(parseDurationString("2-3 days")).toBe(3);
      expect(parseDurationString("5-7 days (including curing)")).toBe(7);
      expect(parseDurationString("7-14 days (multi-storey)")).toBe(14);
    });

    it("parses single day strings", () => {
      expect(parseDurationString("1 day + curing")).toBe(1);
      expect(parseDurationString("4 days")).toBe(4);
    });

    it("handles invalid or empty strings gracefully", () => {
      expect(parseDurationString("")).toBe(1);
      expect(parseDurationString("unknown")).toBe(1);
    });
  });

  describe("buildDAG core algorithms", () => {
    it("builds a simple linear DAG correctly", () => {
      const rawNodes: RawDAGNode[] = [
        { id: "A", name: "Task A", duration: 2, dependencies: [] },
        { id: "B", name: "Task B", duration: 3, dependencies: ["A"] },
        { id: "C", name: "Task C", duration: 4, dependencies: ["B"] },
      ];

      const dag = buildDAG(rawNodes);

      expect(dag.metrics.hasCycles).toBe(false);
      expect(dag.metrics.totalNodes).toBe(3);
      expect(dag.metrics.totalEdges).toBe(2);
      expect(dag.topologicalOrder).toEqual(["A", "B", "C"]);
      expect(dag.metrics.sequentialDuration).toBe(9);
      expect(dag.metrics.parallelDuration).toBe(9);
      expect(dag.metrics.timeSavedDays).toBe(0); // linear graph has no parallel savings
      expect(dag.metrics.wavesCount).toBe(3);

      const nodeA = dag.nodes.get("A")!;
      expect(nodeA.isCritical).toBe(true);
      expect(nodeA.earlyStart).toBe(0);
      expect(nodeA.earlyFinish).toBe(2);
      expect(nodeA.freeFloat).toBe(0);
      expect(nodeA.totalFloat).toBe(0);

      const nodeB = dag.nodes.get("B")!;
      expect(nodeB.isCritical).toBe(true);
      expect(nodeB.earlyStart).toBe(2);
      expect(nodeB.earlyFinish).toBe(5);

      const nodeC = dag.nodes.get("C")!;
      expect(nodeC.isCritical).toBe(true);
      expect(nodeC.earlyStart).toBe(5);
      expect(nodeC.earlyFinish).toBe(9);
    });

    it("handles parallel execution branches, CPM and float calculations", () => {
      // Graph with parallel branches:
      // Start -> A (3d) -> B (4d) -> End (2d) [Path: 3 + 4 + 2 = 9d]
      //       -> A (3d) -> C (2d) -> End (2d) [Path: 3 + 2 + 2 = 7d]
      // B is critical, C has totalFloat = 2d, freeFloat = ES(D) - EF(C) = 7 - 5 = 2d
      const rawNodes: RawDAGNode[] = [
        { id: "A", name: "Start A", duration: 3, dependencies: [] },
        { id: "B", name: "Heavy Branch B", duration: 4, dependencies: ["A"] },
        { id: "C", name: "Light Branch C", duration: 2, dependencies: ["A"] },
        { id: "D", name: "Merge End D", duration: 2, dependencies: ["B", "C"] },
      ];

      const dag = buildDAG(rawNodes);

      expect(dag.metrics.hasCycles).toBe(false);
      expect(dag.metrics.sequentialDuration).toBe(11); // 3 + 4 + 2 + 2
      expect(dag.metrics.parallelDuration).toBe(9); // Critical path A -> B -> D (3+4+2)
      expect(dag.metrics.timeSavedDays).toBe(2);
      expect(dag.metrics.maxConcurrency).toBe(2);

      // Waves verification
      expect(dag.waves.length).toBe(3);
      expect(dag.waves[0].nodeIds).toEqual(["A"]);
      expect(dag.waves[1].nodeIds.sort()).toEqual(["B", "C"].sort());
      expect(dag.waves[2].nodeIds).toEqual(["D"]);

      // CPM Verification
      const nodeB = dag.nodes.get("B")!;
      const nodeC = dag.nodes.get("C")!;

      expect(nodeB.isCritical).toBe(true);
      expect(nodeB.totalFloat).toBe(0);
      expect(nodeB.freeFloat).toBe(0);

      expect(nodeC.isCritical).toBe(false);
      expect(nodeC.totalFloat).toBe(2);
      expect(nodeC.freeFloat).toBe(2);

      expect(dag.metrics.criticalPathNodeIds.sort()).toEqual(
        ["A", "B", "D"].sort(),
      );
    });

    it("detects cyclic graphs safely", () => {
      const cyclicNodes: RawDAGNode[] = [
        { id: "1", name: "One", duration: 1, dependencies: ["3"] },
        { id: "2", name: "Two", duration: 1, dependencies: ["1"] },
        { id: "3", name: "Three", duration: 1, dependencies: ["2"] },
      ];

      const dag = buildDAG(cyclicNodes);
      expect(dag.metrics.hasCycles).toBe(true);
      expect(dag.metrics.cycleNodes?.length).toBe(3);
    });
  });

  describe("International Trade Discipline & Standards Resolution", () => {
    it("classifies structural concrete and foundation accurately", () => {
      const res = resolveTradeDiscipline(
        "Foundation Footing Concrete Pour",
        "Substructure",
      );
      expect(res.trade).toBe("structural_concrete");
      expect(res.standardRef).toContain("EN 13670");
    });

    it("classifies electrical and MEP works with IEC standard", () => {
      const res = resolveTradeDiscipline(
        "First Fix Electrical Piping & Conduits",
        "MEP",
      );
      expect(res.trade).toBe("mep_roughin");
      expect(res.standardRef).toContain("IPC");
    });

    it("classifies earthworks and excavation with OSHA / BS 6031", () => {
      const res = resolveTradeDiscipline(
        "Site Excavation & Trenching",
        "Site Prep",
      );
      expect(res.trade).toBe("earthworks_groundwork");
      expect(res.standardRef).toContain("BS 6031");
    });

    it("formats trade names into clean human-readable titles", () => {
      expect(formatTradeName("mep_roughin")).toBe("MEP & Underground Drainage");
      expect(formatTradeName("structural_concrete")).toBe(
        "Structural Concrete & Rebar",
      );
    });
  });

  describe("International Working Calendar & Contingency Buffers", () => {
    it("computes calendar duration accurately for standard 5-day week", () => {
      const cal = computeCalendarSchedule(20, "standard_5d");
      expect(cal.workDays).toBe(20);
      expect(cal.calendarDays).toBe(28); // 20 * 1.4 = 28
      expect(cal.calendarWeeks).toBe(4);
    });

    it("computes calendar duration for continuous 7-day operations", () => {
      const cal = computeCalendarSchedule(21, "calendar_7d");
      expect(cal.workDays).toBe(21);
      expect(cal.calendarDays).toBe(21);
      expect(cal.calendarWeeks).toBe(3);
    });

    it("calculates contingency buffer and clamps invalid inputs safely", () => {
      const buff = computeScheduleWithBuffer(50, 10);
      expect(buff.baseDurationDays).toBe(50);
      expect(buff.contingencyBufferPct).toBe(10);
      expect(buff.contingencyDays).toBe(5);
      expect(buff.bufferedTotalDays).toBe(55);

      // Clamping test
      const clamped = computeScheduleWithBuffer(50, 150);
      expect(clamped.contingencyBufferPct).toBe(50); // clamped to max 50%
    });
  });

  describe("CSV & Executive Summary Export", () => {
    it("generates well-formed CSV with ISO headers and escaped fields", () => {
      const plan = generateSequencePlan();
      const dag = sequencePlanToDAG(plan, { fastTrackParallel: true });
      const csv = exportScheduleToCSV(dag);

      expect(csv).toContain("Activity ID");
      expect(csv).toContain("Activity Name");
      expect(csv).toContain("Stage");
      expect(csv).toContain("Trade");
      expect(csv).toContain("Duration (working days)");
      expect(csv).toContain("Standard Reference");
      expect(csv).toContain("Critical");
      // Checks lines count
      const lines = csv.split("\n");
      expect(lines.length).toBeGreaterThan(dag.nodes.size);
    });

    it("generates markdown executive summary citing international standards", () => {
      const plan = generateSequencePlan();
      const dag = sequencePlanToDAG(plan, { fastTrackParallel: true });
      const summary = generateScheduleExecutiveSummary(dag, {
        calendarModel: "calendar_7d",
        contingencyBufferPct: 15,
        marketCode: "GB",
      });

      expect(summary).toContain("# Construction Schedule Executive Brief");
      expect(summary).toContain("Deterministic CPM");
      expect(summary).toContain("Critical path activities");
      expect(summary).toContain("Trade waves");
    });
  });

  describe("sequencePlanToDAG", () => {
    it("converts construction sequence plan into a valid DAG", () => {
      const plan = generateSequencePlan();
      const dag = sequencePlanToDAG(plan, { fastTrackParallel: false });

      expect(dag.metrics.hasCycles).toBe(false);
      expect(dag.metrics.totalNodes).toBe(plan.steps.length);
      expect(dag.metrics.totalNodes).toBeGreaterThan(10);
      expect(dag.topologicalOrder.length).toBe(plan.steps.length);
      expect(dag.metrics.parallelDuration).toBeGreaterThan(0);
    });

    it("generates parallel branches in fast-track mode with schedule compression", () => {
      const plan = generateSequencePlan();
      const dagFastTrack = sequencePlanToDAG(plan, { fastTrackParallel: true });

      expect(dagFastTrack.metrics.hasCycles).toBe(false);
      expect(dagFastTrack.metrics.maxConcurrency).toBeGreaterThanOrEqual(2);
      expect(dagFastTrack.metrics.timeSavedDays).toBeGreaterThan(0);
      expect(dagFastTrack.metrics.concurrencySavingsPct).toBeGreaterThan(0);

      // Verify parallel nodes exist
      expect(dagFastTrack.nodes.has("step-parallel-mep-ground")).toBe(true);
      expect(dagFastTrack.nodes.has("step-parallel-partitions")).toBe(true);
      expect(dagFastTrack.nodes.has("step-parallel-fascia-gutters")).toBe(true);

      // Check active trades populated in waves
      expect(dagFastTrack.waves.every((w) => w.activeTrades.length > 0)).toBe(
        true,
      );
    });
  });

  describe("simulation engine", () => {
    it("initializes and steps through simulation waves", () => {
      const rawNodes: RawDAGNode[] = [
        { id: "1", name: "Site Clearance", duration: 2, dependencies: [] },
        { id: "2a", name: "Trench Digging", duration: 3, dependencies: ["1"] },
        {
          id: "2b",
          name: "Material Staging",
          duration: 1,
          dependencies: ["1"],
        },
        {
          id: "3",
          name: "Foundation Pour",
          duration: 5,
          dependencies: ["2a", "2b"],
        },
      ];

      const dag = buildDAG(rawNodes);
      let state = initializeSimulation(dag);

      expect(state.currentWave).toBe(-1);
      expect(state.nodeStatuses["1"]).toBe("ready");
      expect(state.isCompleted).toBe(false);

      // Step to Wave 0
      state = stepSimulationWave(dag, state);
      expect(state.currentWave).toBe(0);
      expect(state.activeNodeIds).toEqual(["1"]);
      expect(state.nodeStatuses["1"]).toBe("in_progress");

      // Step to Wave 1 (parallel execution of 2a and 2b)
      state = stepSimulationWave(dag, state);
      expect(state.currentWave).toBe(1);
      expect(state.activeNodeIds.sort()).toEqual(["2a", "2b"].sort());
      expect(state.nodeStatuses["1"]).toBe("completed");
      expect(state.nodeStatuses["2a"]).toBe("in_progress");
      expect(state.nodeStatuses["2b"]).toBe("in_progress");

      // Step to Wave 2
      state = stepSimulationWave(dag, state);
      expect(state.currentWave).toBe(2);
      expect(state.activeNodeIds).toEqual(["3"]);
      expect(state.nodeStatuses["2a"]).toBe("completed");
      expect(state.nodeStatuses["2b"]).toBe("completed");

      // Final step completes
      state = stepSimulationWave(dag, state);
      expect(state.isCompleted).toBe(true);
    });
  });
});
