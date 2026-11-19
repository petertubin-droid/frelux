import { describe, it, expect } from "vitest";

import type { IfcModelElement } from "../ifc-model-loader";
import {
  buildRevisionChain,
  diffRevisions,
  indexModelElements,
  type IfcModelRevision,
} from "../model-revisions";

function rev(
  id: string,
  parent: string | null,
  elements: Record<string, number>,
): IfcModelRevision {
  const index: Record<string, { parts: number }> = {};
  for (const [globalId, parts] of Object.entries(elements)) {
    index[globalId] = { parts };
  }
  return {
    id,
    model_id: "arch",
    label: `Rev ${id}`,
    issued_at: "2026-11-19T00:00:00Z",
    parent_revision_id: parent,
    element_index: index,
  };
}

describe("indexModelElements", () => {
  it("captures GlobalId, part count and type from loader output", () => {
    const elements = [
      { globalId: "w1", ifcClass: "IFCWALL", geometry: [{}, {}] },
      { globalId: "s1", ifcClass: "IFCSLAB", geometry: [{}] },
      { globalId: "", ifcClass: "IFCWALL", geometry: [{}] },
    ] as unknown as IfcModelElement[];
    const index = indexModelElements(elements);
    expect(index.w1).toEqual({ parts: 2, type: "IFCWALL" });
    expect(index.s1).toEqual({ parts: 1, type: "IFCSLAB" });
    // elements without a GlobalId are skipped, never invented
    expect(Object.keys(index)).toHaveLength(2);
  });
});

describe("buildRevisionChain", () => {
  it("orders revisions root-first through parent links", () => {
    const r = buildRevisionChain("arch", [
      rev("c", "b", {}),
      rev("a", null, {}),
      rev("b", "a", {}),
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chain.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("refuses a missing parent instead of guessing order", () => {
    const r = buildRevisionChain("arch", [rev("a", null, {}), rev("b", "zz", {})]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("missing parent");
  });

  it("refuses a cycle", () => {
    const a = rev("a", null, {});
    const b = rev("b", "a", {});
    const c = rev("c", "b", {});
    // break the root: a points at c
    const aCyclic = { ...a, parent_revision_id: "c" };
    const r = buildRevisionChain("arch", [aCyclic, b, c]);
    expect(r.ok).toBe(false);
  });

  it("refuses two roots and duplicate ids", () => {
    const twoRoots = buildRevisionChain("arch", [rev("a", null, {}), rev("b", null, {})]);
    expect(twoRoots.ok).toBe(false);
    const dup = buildRevisionChain("arch", [rev("a", null, {}), rev("a", null, {})]);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.errors.join(" ")).toContain("Duplicate");
  });

  it("refuses revisions from another model", () => {
    const foreign = { ...rev("x", null, {}), model_id: "struct" };
    const r = buildRevisionChain("arch", [rev("a", null, {}), foreign]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("belongs to model struct");
  });
});

describe("diffRevisions", () => {
  it("reports added, removed, modified and unchanged by GlobalId", () => {
    const base = rev("a", null, { w1: 1, w2: 2, d1: 1 });
    const next = rev("b", "a", { w1: 1, w2: 3, n1: 1 });
    const diff = diffRevisions(base, next);
    if ("ok" in diff) throw new Error("unexpected refusal");
    expect(diff.added).toEqual(["n1"]);
    expect(diff.removed).toEqual(["d1"]);
    expect(diff.modified).toEqual(["w2"]);
    expect(diff.unchanged_count).toBe(1);
    expect(diff.scope_note).toContain("No geometric");
  });

  it("refuses to diff across models", () => {
    const a = rev("a", null, {});
    const b = { ...rev("b", "a", {}), model_id: "struct" };
    const diff = diffRevisions(a, b);
    expect("ok" in diff && diff.ok === false).toBe(true);
  });
});
