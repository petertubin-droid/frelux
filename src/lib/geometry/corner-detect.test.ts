import { describe, expect, it } from "vitest";

import { validateDetection } from "@/lib/geometry/corner-detect";

const goodQuad = [
  { x: 0.1, y: 0.2 },
  { x: 0.9, y: 0.2 },
  { x: 0.9, y: 0.8 },
  { x: 0.1, y: 0.8 },
];

describe("corner detection contract", () => {
  it("accepts four in-frame corners with an opening and a ridge", () => {
    const result = validateDetection({
      verdict: "detected",
      quad: goodQuad,
      ridge: { x: 0.5, y: 0.08 },
      openings: [{ kind: "door", rect: { x: 0.4, y: 0.55, w: 0.1, h: 0.25 } }],
      confidence: 0.82,
      reason: "Traced the front wall.",
    });
    expect(result.status).toBe("detected");
    expect(result.quad).toHaveLength(4);
    expect(result.ridge).toEqual({ x: 0.5, y: 0.08 });
    expect(result.openings).toHaveLength(1);
    expect(result.openings[0].kind).toBe("door");
  });

  it("refuses a corner outside the frame", () => {
    const result = validateDetection({
      verdict: "detected",
      quad: [{ x: -0.2, y: 0.2 }, ...goodQuad.slice(1)],
      confidence: 0.9,
    });
    expect(result.status).toBe("unclear");
    expect(result.quad).toBeNull();
    expect(result.reason).toMatch(/four in-frame corners/i);
  });

  it("refuses a quad that encloses almost none of the photograph", () => {
    const result = validateDetection({
      verdict: "detected",
      quad: [
        { x: 0.5, y: 0.5 },
        { x: 0.55, y: 0.5 },
        { x: 0.55, y: 0.55 },
        { x: 0.5, y: 0.55 },
      ],
      confidence: 0.9,
    });
    expect(result.status).toBe("unclear");
    expect(result.reason).toMatch(/almost none/i);
  });

  it("refuses a low-confidence proposal instead of showing it", () => {
    const result = validateDetection({
      verdict: "detected",
      quad: goodQuad,
      confidence: 0.3,
    });
    expect(result.status).toBe("unclear");
    expect(result.reason).toMatch(/30%/);
  });

  it("reports the deployment and switch states separately from a refusal", () => {
    expect(
      validateDetection({ verdict: "unavailable", confidence: 0 }).status,
    ).toBe("unavailable");
    expect(
      validateDetection({ verdict: "disabled", confidence: 0 }).status,
    ).toBe("disabled");
    expect(validateDetection({ verdict: "unclear" }).status).toBe("unclear");
  });

  it("drops openings that spill outside the frame", () => {
    const result = validateDetection({
      verdict: "detected",
      quad: goodQuad,
      openings: [
        { kind: "window", rect: { x: 0.9, y: 0.5, w: 0.4, h: 0.2 } },
        { kind: "window", rect: { x: 0.4, y: 0.5, w: 0.1, h: 0.1 } },
      ],
      confidence: 0.8,
    });
    expect(result.status).toBe("detected");
    expect(result.openings).toHaveLength(1);
  });

  it("never throws on junk", () => {
    expect(validateDetection(null).status).toBe("unclear");
    expect(validateDetection("nonsense").status).toBe("unclear");
    expect(validateDetection({ verdict: "detected", quad: "x" }).status).toBe(
      "unclear",
    );
  });
});
