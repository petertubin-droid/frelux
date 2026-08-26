import { describe, it, expect } from "vitest";
import {
  detectPlanFileType,
  isSupportedPlanType,
  MAX_PLAN_FILE_SIZE,
  validatePlanFile,
  createPlanFile,
  createDefaultCalibration,
  computePixelsPerMeter,
  completeCalibration,
} from "./plan-scanner";

describe("roof/plan-scanner", () => {
  it("detectPlanFileType by extension", () => {
    expect(detectPlanFileType("plan.pdf")).toBe("pdf");
    expect(detectPlanFileType("plan.png")).toBe("png");
    expect(detectPlanFileType("plan.jpg")).toBe("jpg");
    expect(detectPlanFileType("plan.jpeg")).toBe("jpg");
    expect(detectPlanFileType("plan.webp")).toBe("webp");
    expect(detectPlanFileType("plan.xyz")).toBe("unknown");
  });

  it("detectPlanFileType by MIME type", () => {
    expect(detectPlanFileType("file", "application/pdf")).toBe("pdf");
    expect(detectPlanFileType("file", "image/png")).toBe("png");
    expect(detectPlanFileType("file", "image/jpeg")).toBe("jpg");
    expect(detectPlanFileType("file", "image/webp")).toBe("webp");
  });

  it("isSupportedPlanType", () => {
    expect(isSupportedPlanType("pdf")).toBe(true);
    expect(isSupportedPlanType("png")).toBe(true);
    expect(isSupportedPlanType("unknown")).toBe(false);
  });

  it("MAX_PLAN_FILE_SIZE is 50MB", () => {
    expect(MAX_PLAN_FILE_SIZE).toBe(50 * 1024 * 1024);
  });

  it("validatePlanFile accepts valid file", () => {
    const r = validatePlanFile("plan.pdf", 1000, "application/pdf");
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("validatePlanFile rejects unsupported type", () => {
    const r = validatePlanFile("plan.xyz", 1000);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Unsupported");
  });

  it("validatePlanFile rejects oversized file", () => {
    const r = validatePlanFile(
      "plan.pdf",
      MAX_PLAN_FILE_SIZE + 1,
      "application/pdf",
    );
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("too large");
  });

  it("validatePlanFile rejects empty file", () => {
    const r = validatePlanFile("plan.pdf", 0, "application/pdf");
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("File is empty.");
  });

  it("createPlanFile creates plan with id", () => {
    const plan = createPlanFile(
      "test.pdf",
      1000,
      "blob:url",
      "application/pdf",
    );
    expect(plan.id).toBeTruthy();
    expect(plan.filename).toBe("test.pdf");
    expect(plan.fileType).toBe("pdf");
    expect(plan.fileSizeBytes).toBe(1000);
    expect(plan.uploadedAt).toBeTruthy();
  });

  it("createDefaultCalibration returns uncalibrated state", () => {
    const cal = createDefaultCalibration();
    expect(cal.calibrated).toBe(false);
    expect(cal.pixelsPerMeter).toBeNull();
    expect(cal.calibratedAt).toBeNull();
  });

  it("computePixelsPerMeter with meters", () => {
    expect(computePixelsPerMeter(5, "m", 100)).toBe(20);
  });

  it("computePixelsPerMeter with feet", () => {
    expect(computePixelsPerMeter(10, "ft", 100)).toBeCloseTo(
      100 / (10 * 0.3048),
    );
  });

  it("computePixelsPerMeter with cm", () => {
    expect(computePixelsPerMeter(500, "cm", 100)).toBeCloseTo(100 / 5);
  });

  it("computePixelsPerMeter with mm", () => {
    expect(computePixelsPerMeter(5000, "mm", 100)).toBeCloseTo(100 / 5);
  });

  it("computePixelsPerMeter returns null for invalid inputs", () => {
    expect(computePixelsPerMeter(0, "m", 100)).toBeNull();
    expect(computePixelsPerMeter(5, "m", 0)).toBeNull();
    expect(computePixelsPerMeter(-5, "m", 100)).toBeNull();
  });

  it("computePixelsPerMeter returns null for unknown unit", () => {
    expect(computePixelsPerMeter(5, "inches", 100)).toBeNull();
  });

  it("completeCalibration returns calibrated state", () => {
    const cal = createDefaultCalibration();
    const result = completeCalibration(cal, 5, "m", 100);
    expect(result.calibrated).toBe(true);
    expect(result.pixelsPerMeter).toBe(20);
    expect(result.calibratedAt).toBeTruthy();
  });

  it("completeCalibration returns uncalibrated for invalid input", () => {
    const cal = createDefaultCalibration();
    const result = completeCalibration(cal, 0, "m", 100);
    expect(result.calibrated).toBe(false);
    expect(result.pixelsPerMeter).toBeNull();
  });
});
