import { describe, expect, it } from "vitest";
import { deviceClass, rateMetric, shouldSample } from "./vitals";

describe("field vitals", () => {
  it("rates core web vitals against Google's published thresholds", () => {
    expect(rateMetric("LCP", 2400)).toBe("good");
    expect(rateMetric("LCP", 2501)).toBe("needs-improvement");
    expect(rateMetric("LCP", 4001)).toBe("poor");
    expect(rateMetric("CLS", 0.05)).toBe("good");
    expect(rateMetric("CLS", 0.3)).toBe("poor");
    expect(rateMetric("INP", 120)).toBe("good");
    expect(rateMetric("INP", 600)).toBe("poor");
  });

  it("classifies the device by viewport width", () => {
    expect(deviceClass(360)).toBe("phone");
    expect(deviceClass(834)).toBe("tablet");
    expect(deviceClass(1440)).toBe("desktop");
  });

  it("samples the same session the same way every time", () => {
    const first = shouldSample("session-abc");
    expect(shouldSample("session-abc")).toBe(first);
    const sampled = Array.from({ length: 400 }, (_, i) =>
      shouldSample(`s-${i}`),
    );
    const share = sampled.filter(Boolean).length / sampled.length;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.36);
  });
});
