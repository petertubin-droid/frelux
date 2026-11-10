import { describe, it, expect } from "vitest";
import { packageTooSmallForBulk } from "./visual-finishing-engine";

describe("market finishing rates pick a bulk package", () => {
  it("rejects sample pots and tubs as the bucket default", () => {
    // The estimator offers this number as "price / bucket", so a 1 L tester pot
    // or a 500 ml sample would seed a 20 L bucket at a twentieth of its cost.
    expect(packageTooSmallForBulk({ package_size: 1, package_unit: "L" })).toBe(true);
    expect(packageTooSmallForBulk({ package_size: 4.5, package_unit: "litre" })).toBe(true);
    expect(packageTooSmallForBulk({ package_size: 500, package_unit: "ml" })).toBe(true);
    expect(packageTooSmallForBulk({ package_size: 1, package_unit: "kg" })).toBe(true);
    expect(packageTooSmallForBulk({ package_size: 800, package_unit: "g" })).toBe(true);
  });

  it("accepts the packages a job is actually priced in", () => {
    expect(packageTooSmallForBulk({ package_size: 20, package_unit: "L" })).toBe(false);
    expect(packageTooSmallForBulk({ package_size: 5, package_unit: "litres" })).toBe(false);
    expect(packageTooSmallForBulk({ package_size: 25, package_unit: "kg" })).toBe(false);
  });

  it("leaves non volume or mass packages to their own rule", () => {
    expect(packageTooSmallForBulk({ package_size: 1.44, package_unit: "m2" })).toBe(false);
    expect(packageTooSmallForBulk({ package_size: 1, package_unit: "box" })).toBe(false);
    expect(packageTooSmallForBulk({ package_size: null, package_unit: null })).toBe(false);
  });
});
