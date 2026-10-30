import { describe, expect, it } from "vitest";
import {
  deriveCorrosionIndicative,
  deriveFloodProxy,
  deriveFrostRisk,
  deriveSnowExposure,
} from "./climate-factors";
import {
  bandForDistance,
  coastalExposureFor,
  nearestCoastKm,
} from "./coastal-exposure";

describe("frost and snow derivation", () => {
  it("treats zero frost days as no frost risk", () => {
    expect(deriveFrostRisk(0)).toBe("none");
    expect(deriveFrostRisk(0.4)).toBe("none");
  });

  it("bands frost days into rare / seasonal / frequent", () => {
    expect(deriveFrostRisk(5)).toBe("rare");
    expect(deriveFrostRisk(30)).toBe("seasonal");
    expect(deriveFrostRisk(61)).toBe("frequent");
  });

  it("derives snow exposure from frost days and mean minima", () => {
    expect(deriveSnowExposure(0, 20)).toBe("not_indicated");
    expect(deriveSnowExposure(40, -8)).toBe("likely");
    expect(deriveSnowExposure(20, 0.5)).toBe("possible");
    expect(deriveSnowExposure(20, 3)).toBe("not_indicated");
  });
});

describe("flood proxy", () => {
  it("maps elevation bands and admits when elevation is missing", () => {
    expect(deriveFloodProxy(null)).toBe("not_assessed");
    expect(deriveFloodProxy(4)).toBe("low_lying");
    expect(deriveFloodProxy(25)).toBe("moderate_elevation");
    expect(deriveFloodProxy(120)).toBe("elevated_ground");
  });
});

describe("indicative corrosion band", () => {
  it("scores marine humidity and coastal proximity strongly", () => {
    expect(deriveCorrosionIndicative(86, "coast_adjacent", 26)).toBe(
      "very_high",
    );
    expect(deriveCorrosionIndicative(86, "coastal", 26)).toBe("high");
    expect(deriveCorrosionIndicative(86, "inland", 26)).toBe("elevated");
  });

  it("keeps dry inland sites low", () => {
    expect(deriveCorrosionIndicative(30, "inland", 18)).toBe("low");
    expect(deriveCorrosionIndicative(60, "inland", 18)).toBe("low");
  });

  it("is monotonic: adding coastal proximity never lowers the band order", () => {
    const order = ["low", "moderate", "elevated", "high", "very_high"];
    const inland = order.indexOf(deriveCorrosionIndicative(75, "inland", 20));
    const near = order.indexOf(deriveCorrosionIndicative(75, "near_coast", 20));
    const coastal = order.indexOf(deriveCorrosionIndicative(75, "coastal", 20));
    expect(near).toBeGreaterThanOrEqual(inland);
    expect(coastal).toBeGreaterThanOrEqual(near);
  });
});

describe("coastal exposure reference", () => {
  it("bands distances at the documented thresholds", () => {
    expect(bandForDistance(0)).toBe("coast_adjacent");
    expect(bandForDistance(5)).toBe("coast_adjacent");
    expect(bandForDistance(25)).toBe("coastal");
    expect(bandForDistance(100)).toBe("near_coast");
    expect(bandForDistance(101)).toBe("inland");
  });

  it("places Lagos (island city) within the coastal bands", () => {
    const exposure = coastalExposureFor(6.455, 3.395);
    expect(exposure.distanceKm).toBeLessThanOrEqual(25);
    expect(exposure.approximate).toBe(true);
  });

  it("places Kano deep inland", () => {
    const exposure = coastalExposureFor(12.0022, 8.5919);
    expect(exposure.band).toBe("inland");
    expect(exposure.distanceKm).toBeGreaterThan(400);
  });

  it("places London within the coastal bands and Denver inland", () => {
    expect(coastalExposureFor(51.5074, -0.1278).distanceKm).toBeLessThanOrEqual(
      100,
    );
    expect(coastalExposureFor(39.7392, -104.9903).band).toBe("inland");
  });

  it("reports a distance for any point on earth without throwing", () => {
    for (const [lat, lon] of [
      [0, 0],
      [89, 179],
      [-89, -179],
      [-33.87, 151.21],
    ]) {
      expect(Number.isFinite(nearestCoastKm(lat, lon))).toBe(true);
    }
  });
});
