import { describe, it, expect } from "vitest";
import { calibrationMetres, pixelsPerMetre } from "./plan-scale";
import { LENGTH_TO_M } from "@/lib/convert/units";

describe("plan takeoff calibration", () => {
  it("reads a metre dimension as metres", () => {
    expect(calibrationMetres("4.2", "m")).toBeCloseTo(4.2, 9);
  });

  it("reads millimetres, feet and inches from the shared factors", () => {
    expect(calibrationMetres(3000, "mm")).toBeCloseTo(3, 9);
    expect(calibrationMetres(20, "ft")).toBeCloseTo(6.096, 9);
    expect(calibrationMetres(36, "in")).toBeCloseTo(0.9144, 9);
    expect(calibrationMetres(12, "in")).toBeCloseTo(12 * LENGTH_TO_M.in, 12);
  });

  it("treats an imperial and a metric statement of one length alike", () => {
    // 1 ft and 12 in are the same wall, so they must scale the sheet the same.
    expect(calibrationMetres(1, "ft")).toBeCloseTo(
      calibrationMetres(12, "in")!,
      12,
    );
  });

  it("rejects lengths that are not positive numbers", () => {
    for (const bad of ["", "0", "-3", "abc"]) {
      expect(calibrationMetres(bad, "m")).toBeNull();
    }
    expect(calibrationMetres(Number.NaN, "ft")).toBeNull();
  });

  it("divides the pixel span by the metres the dimension states", () => {
    expect(pixelsPerMetre(400, 4)).toBeCloseTo(100, 9);
    expect(pixelsPerMetre(400, calibrationMetres(20, "ft"))).toBeCloseTo(
      400 / 6.096,
      9,
    );
  });

  it("refuses to scale on a missing dimension or a flat click", () => {
    expect(pixelsPerMetre(400, null)).toBeNull();
    expect(pixelsPerMetre(0, 4)).toBeNull();
  });
});
