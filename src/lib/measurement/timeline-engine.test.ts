import { describe, it, expect } from "vitest";
import { estimateTimeline, DEFAULT_PHASE_TEMPLATES } from "./timeline-engine";

describe("measurement/timeline-engine", () => {
  it("DEFAULT_PHASE_TEMPLATES has phases in order", () => {
    expect(DEFAULT_PHASE_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_PHASE_TEMPLATES[0].name).toBe("Site Preparation");
    expect(DEFAULT_PHASE_TEMPLATES[1].dependsOn).toContain("Site Preparation");
  });

  it("estimateTimeline computes days from scope", () => {
    const scope = new Map([
      ["site_preparation", 200],
      ["foundation", 20],
      ["masonry", 150],
    ]);
    const result = estimateTimeline(scope);
    expect(result.phases.length).toBe(DEFAULT_PHASE_TEMPLATES.length);
    expect(result.phases[0].estimatedDays).toBe(1);
    expect(result.phases[1].estimatedDays).toBe(2);
    expect(result.phases[2].estimatedDays).toBe(10);
    expect(result.totalEstimatedDays).toBeGreaterThan(0);
  });

  it("estimateTimeline returns 0 days for empty scope", () => {
    const result = estimateTimeline(new Map());
    expect(result.totalEstimatedDays).toBe(0);
    expect(result.phases.every((p) => p.estimatedDays === 0)).toBe(true);
  });

  it("estimateTimeline applies weather buffer", () => {
    const scope = new Map([["masonry", 150]]);
    const noBuffer = estimateTimeline(scope, undefined, {
      weatherBufferPercent: 0,
    });
    const withBuffer = estimateTimeline(scope, undefined, {
      weatherBufferPercent: 20,
    });
    expect(noBuffer.phases[2].estimatedDays).toBe(10);
    expect(withBuffer.phases[2].estimatedDays).toBe(12);
  });

  it("estimateTimeline adds contingency days to total", () => {
    const scope = new Map([["masonry", 150]]);
    const result = estimateTimeline(scope, undefined, { contingencyDays: 5 });
    const baseResult = estimateTimeline(scope);
    expect(result.totalEstimatedDays).toBe(baseResult.totalEstimatedDays + 5);
  });

  it("estimateTimeline sets start/end dates when startDate provided", () => {
    const scope = new Map([["masonry", 150]]);
    const result = estimateTimeline(scope, undefined, {
      startDate: "2026-01-01",
    });
    expect(result.startDate).toBe("2026-01-01");
    expect(result.endDate).toBeTruthy();
  });

  it("estimateTimeline null dates when no startDate", () => {
    const result = estimateTimeline(new Map());
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it("estimateTimeline generates milestones", () => {
    const scope = new Map([["masonry", 150]]);
    const result = estimateTimeline(scope);
    expect(result.milestones.length).toBeGreaterThan(0);
  });

  it("estimateTimeline generates critical path", () => {
    const scope = new Map([["masonry", 150]]);
    const result = estimateTimeline(scope);
    expect(result.criticalPath.length).toBeGreaterThan(0);
  });

  it("estimateTimeline generates explanations", () => {
    const scope = new Map([["masonry", 150]]);
    const result = estimateTimeline(scope);
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});
