import { describe, it, expect } from "vitest";

import {
  createClashIssue,
  screenClashes,
  type Box3Like,
  type ModelBoxes,
} from "../clash-rules";

function box(
  min: [number, number, number],
  max: [number, number, number],
): Box3Like {
  return { min, max };
}

function model(id: string, entries: Record<string, Box3Like>): ModelBoxes {
  return { model_id: id, boxes: new Map(Object.entries(entries)) };
}

describe("screenClashes", () => {
  it("reports an overlapping cross-model pair with extents and volume", () => {
    const result = screenClashes([
      model("arch", { w1: box([0, 0, 0], [2, 1, 1]) }),
      model("struct", { c1: box([1, 0, 0], [3, 1, 1]) }),
    ]);
    expect(result.candidates).toHaveLength(1);
    const c = result.candidates[0];
    expect(c.model_a).toBe("arch");
    expect(c.global_id_a).toBe("w1");
    expect(c.model_b).toBe("struct");
    expect(c.overlap).toEqual([1, 1, 1]);
    expect(c.overlap_volume).toBe(1);
    expect(result.rule.scope_note).toContain("not that geometry intersects");
  });

  it("does not report separated boxes, and touches nothing when tolerance is 0", () => {
    const result = screenClashes([
      model("arch", { w1: box([0, 0, 0], [1, 1, 1]) }),
      model("struct", { c1: box([1, 0, 0], [2, 1, 1]) }), // touching face
    ]);
    expect(result.candidates).toHaveLength(0);
  });

  it("reports near-misses only when tolerance bridges the gap", () => {
    const models = [
      model("arch", { w1: box([0, 0, 0], [1, 1, 1]) }),
      model("struct", { c1: box([1.05, 0, 0], [2, 1, 1]) }),
    ];
    expect(screenClashes(models).candidates).toHaveLength(0);
    const withTol = screenClashes(models, { tolerance: 0.1 });
    expect(withTol.candidates).toHaveLength(1);
    expect(withTol.rule.tolerance).toBe(0.1);
  });

  it("skips same-model pairs unless cross_model_only is false", () => {
    const models = [
      model("arch", {
        a: box([0, 0, 0], [2, 2, 2]),
        b: box([1, 1, 1], [3, 3, 3]),
      }),
    ];
    expect(screenClashes(models).candidates).toHaveLength(0);
    expect(
      screenClashes(models, { cross_model_only: false }).candidates,
    ).toHaveLength(1);
  });

  it("is deterministic: same input, same ordered output", () => {
    const models = [
      model("b", { x: box([0, 0, 0], [3, 3, 3]) }),
      model("a", {
        y: box([0, 0, 0], [1, 1, 1]),
        z: box([0, 0, 0], [2, 2, 2]),
      }),
    ];
    const r1 = screenClashes(models);
    const r2 = screenClashes(models);
    expect(r1.candidates.map((c) => c.id)).toEqual(
      r2.candidates.map((c) => c.id),
    );
    // largest overlap first
    expect(r1.candidates[0].overlap_volume).toBeGreaterThanOrEqual(
      r1.candidates[r1.candidates.length - 1].overlap_volume,
    );
  });

  it("honours the candidate cap and flags truncation", () => {
    const arch: Record<string, Box3Like> = {};
    const struct: Record<string, Box3Like> = {};
    for (let i = 0; i < 5; i += 1) {
      arch[`w${i}`] = box([0, 0, 0], [10, 10, 10]);
      struct[`c${i}`] = box([0, 0, 0], [10, 10, 10]);
    }
    const result = screenClashes(
      [model("arch", arch), model("struct", struct)],
      {
        max_candidates: 3,
      },
    );
    expect(result.candidates).toHaveLength(3);
    expect(result.truncated).toBe(true);
  });
});

describe("createClashIssue", () => {
  it("creates an auditable open issue from a candidate", () => {
    const result = screenClashes([
      model("arch", { w1: box([0, 0, 0], [2, 1, 1]) }),
      model("struct", { c1: box([1, 0, 0], [3, 1, 1]) }),
    ]);
    const issue = createClashIssue(
      result.candidates[0],
      "2026-11-19T12:00:00Z",
      0.05,
    );
    expect(issue.status).toBe("open");
    expect(issue.rule_id).toBe("aabb-overlap-v1");
    expect(issue.detected_at).toBe("2026-11-19T12:00:00Z");
    expect(issue.tolerance).toBe(0.05);
    expect(issue.candidate_id).toBe(result.candidates[0].id);
  });
});
