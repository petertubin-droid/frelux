import { describe, it, expect } from "vitest";
import {
  buildEstimateReport,
  reportToText,
  reportToMarkdown,
} from "./estimate-report";

function makeProjectResult() {
  return {
    projectId: "p1",
    name: "Test Project",
    elementResults: [],
    totalAreaM2: 100,
    areaByFinishType: { paint: 60, tile: 40 },
    areaByElementType: { interior_space: 100 },
    spaceResults: [],
    allSpaceResults: [],
    steps: [],
  } as any;
}

describe("measurement/estimate-report", () => {
  it("buildEstimateReport creates report with sections", () => {
    const report = buildEstimateReport(makeProjectResult());
    expect(report.sections.length).toBeGreaterThan(0);
    expect(report.generatedAt).toBeTruthy();
    expect(report.projectName).toBe("Test Project");
  });

  it("buildEstimateReport accepts custom project name", () => {
    const report = buildEstimateReport(
      makeProjectResult(),
      undefined,
      undefined,
      [],
      {
        projectName: "Custom Name",
      },
    );
    expect(report.projectName).toBe("Custom Name");
  });

  it("reportToText produces non-empty string", () => {
    const report = buildEstimateReport(makeProjectResult());
    const text = reportToText(report);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("FRELUX");
  });

  it("reportToMarkdown produces non-empty markdown", () => {
    const report = buildEstimateReport(makeProjectResult());
    const md = reportToMarkdown(report);
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain("##");
  });
});
