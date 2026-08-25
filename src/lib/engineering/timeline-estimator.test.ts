import { describe, it, expect } from "vitest";
import { estimateTimeline, type TimelineInput } from "./timeline-estimator";

describe("estimateTimeline", () => {
  const baseInput: TimelineInput = {
    building_type: "residential",
    building_length: 15,
    building_width: 10,
    number_of_floors: 1,
    complexity: "standard",
    workforce: "medium",
    season: "dry",
    foundation_type: "strip",
    roof_type: "pitched",
    has_engineer_schedule: true,
  };

  it("returns multiple stages with durations", () => {
    const result = estimateTimeline(baseInput);
    expect(result.stages.length).toBeGreaterThan(3);
    result.stages.forEach((stage) => {
      expect(stage.estimated_days).toBeGreaterThan(0);
      expect(stage.min_days).toBeGreaterThan(0);
      expect(stage.max_days).toBeGreaterThanOrEqual(stage.estimated_days);
    });
  });

  it("calculates total duration as sum of stages", () => {
    const result = estimateTimeline(baseInput);
    const sum = result.stages.reduce((s, st) => s + st.estimated_days, 0);
    expect(result.total_days).toBe(sum);
  });

  it("produces milestones", () => {
    const result = estimateTimeline(baseInput);
    expect(result.milestones.length).toBeGreaterThan(0);
    result.milestones.forEach((m) => {
      expect(m.label).toBeTruthy();
      expect(m.after_days).toBeGreaterThan(0);
    });
  });

  it("includes risk factors", () => {
    const result = estimateTimeline(baseInput);
    expect(result.risks.length).toBeGreaterThan(0);
  });

  it("adds rainy season risks", () => {
    const rainy = { ...baseInput, season: "rainy" as const };
    const result = estimateTimeline(rainy);
    expect(
      result.risks.some((r) => r.includes("rain") || r.includes("Rain")),
    ).toBe(true);
  });

  it("adds rainy season notes to concrete and roofing stages", () => {
    const rainy = { ...baseInput, season: "rainy" as const };
    const result = estimateTimeline(rainy);
    const hasNotes = result.stages.some((s) => s.notes.includes("Rainy"));
    expect(hasNotes).toBe(true);
  });

  it("adds extra days for raft foundation", () => {
    const raft = { ...baseInput, foundation_type: "raft" as const };
    const strip = estimateTimeline(baseInput);
    const raftResult = estimateTimeline(raft);
    const stripExcavation = strip.stages.find(
      (s) => s.stage === "excavation",
    )!.estimated_days;
    const raftExcavation = raftResult.stages.find(
      (s) => s.stage === "excavation",
    )!.estimated_days;
    expect(raftExcavation).toBeGreaterThan(stripExcavation);
  });

  it("adds extra days for pile foundation", () => {
    const pile = { ...baseInput, foundation_type: "pile" as const };
    const strip = estimateTimeline(baseInput);
    const pileResult = estimateTimeline(pile);
    expect(pileResult.total_days).toBeGreaterThan(strip.total_days);
  });

  it("complex buildings take longer than simple ones", () => {
    const simple = estimateTimeline({
      ...baseInput,
      complexity: "simple" as const,
    });
    const complex = estimateTimeline({
      ...baseInput,
      complexity: "high_end" as const,
    });
    expect(complex.total_days).toBeGreaterThan(simple.total_days);
  });

  it("larger workforce reduces timeline", () => {
    const small = estimateTimeline({
      ...baseInput,
      workforce: "small" as const,
    });
    const large = estimateTimeline({
      ...baseInput,
      workforce: "large" as const,
    });
    expect(large.total_days).toBeLessThan(small.total_days);
  });

  it("multi-storey adds wall stage notes", () => {
    const multi = { ...baseInput, number_of_floors: 3 };
    const result = estimateTimeline(multi);
    const wallStage = result.stages.find((s) => s.stage === "walls");
    expect(wallStage?.notes).toContain("Multi-storey");
  });
});
