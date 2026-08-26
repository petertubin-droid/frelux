import { describe, it, expect } from "vitest";
import {
  getErrorIssues,
  getWarningIssues,
  getInfoIssues,
  getReadinessLabel,
  type RoofReviewData,
  type ReviewIssue,
} from "./review";

describe("roof/review", () => {
  const mockIssues: ReviewIssue[] = [
    {
      sectionId: "s1",
      sectionName: "Sec 1",
      severity: "error",
      message: "err",
    },
    {
      sectionId: "s1",
      sectionName: "Sec 1",
      severity: "warning",
      message: "warn",
    },
    { sectionId: null, sectionName: null, severity: "info", message: "info" },
    {
      sectionId: "s2",
      sectionName: "Sec 2",
      severity: "error",
      message: "err2",
    },
  ];

  const mockReview: RoofReviewData = {
    planFile: null,
    calibration: null,
    sections: [],
    edgeSummary: null,
    multiRoofCalc: null,
    readinessScore: 75,
    readyForEstimation: false,
    issues: mockIssues,
  };

  it("getErrorIssues returns only errors", () => {
    const errors = getErrorIssues(mockReview);
    expect(errors.length).toBe(2);
    expect(errors.every((i) => i.severity === "error")).toBe(true);
  });

  it("getWarningIssues returns only warnings", () => {
    const warnings = getWarningIssues(mockReview);
    expect(warnings.length).toBe(1);
    expect(warnings[0].severity).toBe("warning");
  });

  it("getInfoIssues returns only info", () => {
    const infos = getInfoIssues(mockReview);
    expect(infos.length).toBe(1);
    expect(infos[0].severity).toBe("info");
  });

  it('getReadinessLabel returns "Ready" for 90+', () => {
    expect(getReadinessLabel(95)).toBe("Ready for estimation");
  });

  it('getReadinessLabel returns "Almost ready" for 70-89', () => {
    expect(getReadinessLabel(75)).toBe("Almost ready — review warnings");
  });

  it('getReadinessLabel returns "Needs attention" for 50-69', () => {
    expect(getReadinessLabel(60)).toBe("Needs attention — missing data");
  });

  it('getReadinessLabel returns "Not ready" for <50', () => {
    expect(getReadinessLabel(30)).toBe("Not ready — critical data missing");
  });

  it("getErrorIssues returns empty when no errors", () => {
    const review: RoofReviewData = { ...mockReview, issues: [] };
    expect(getErrorIssues(review)).toEqual([]);
  });
});
