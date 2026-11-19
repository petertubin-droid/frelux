/**
 * Pillar 3: model revision chains for the IFC viewer.
 *
 * Engine-1A #1 (BIM/CAD) milestone: track successive issues of the same
 * model (arch v1 -> v2 -> v3) as a parent-linked chain, and produce an
 * HONEST element-level diff between two issues.
 *
 * Scope discipline:
 *  - The diff compares GlobalIds and geometry part counts only. It never
 *    claims geometric comparison (no shape, volume, or position diff), and
 *    it says so in the result.
 *  - A revision whose parent is missing, whose chain has a cycle, or whose
 *    id is duplicated is REFUSED, never silently reordered.
 *  - Element index entries are plain data, so a revision can be stored,
 *    exported and re-checked without web-ifc or three.js present.
 */

import type { IfcModelElement } from "./ifc-model-loader";

export interface RevisionElementEntry {
  /** number of geometry parts the element carried in this issue */
  parts: number;
  /** IFC type as reported by the loader (IFCWALL, IFCSLAB, ...) */
  type?: string;
}

export interface IfcModelRevision {
  id: string;
  /** model this revision belongs to (federation model id) */
  model_id: string;
  /** human label, e.g. "A-102 Rev C" */
  label: string;
  /** ISO timestamp of the issue */
  issued_at: string;
  /** null for the first issue */
  parent_revision_id: string | null;
  /** GlobalId -> entry, captured at issue time */
  element_index: Record<string, RevisionElementEntry>;
  notes?: string;
}

export interface RevisionDiff {
  base_id: string;
  next_id: string;
  added: string[];
  removed: string[];
  /** same GlobalId, different geometry part count */
  modified: string[];
  /** unchanged GlobalIds */
  unchanged_count: number;
  /** explicit statement of what this diff does NOT claim */
  scope_note: string;
}

const SCOPE_NOTE =
  "Element-level comparison by GlobalId and geometry part count only. " +
  "No geometric, positional or dimensional comparison is performed.";

export type ChainResult =
  { ok: true; chain: IfcModelRevision[] } | { ok: false; errors: string[] };

/**
 * Order a model's revisions oldest -> newest by walking parent links.
 * Refuses duplicate ids, missing parents, cycles and revisions of other models.
 */
export function buildRevisionChain(
  model_id: string,
  revisions: readonly IfcModelRevision[],
): ChainResult {
  const errors: string[] = [];
  const byId = new Map<string, IfcModelRevision>();
  for (const rev of revisions) {
    if (rev.model_id !== model_id) {
      errors.push(
        `Revision ${rev.id} belongs to model ${rev.model_id}, not ${model_id}.`,
      );
      continue;
    }
    if (byId.has(rev.id)) errors.push(`Duplicate revision id ${rev.id}.`);
    byId.set(rev.id, rev);
  }
  if (errors.length > 0) return { ok: false, errors };

  // Find roots (no parent). Exactly one root per model chain.
  const roots = [...byId.values()].filter((r) => r.parent_revision_id === null);
  if (roots.length === 0) {
    return {
      ok: false,
      errors: ["No root revision (parent_revision_id null) found."],
    };
  }
  if (roots.length > 1) {
    return {
      ok: false,
      errors: [
        `Multiple root revisions found (${roots.map((r) => r.id).join(", ")}); a model has exactly one first issue.`,
      ],
    };
  }

  // Children map; refuse parents that do not exist.
  const children = new Map<string, IfcModelRevision[]>();
  for (const rev of byId.values()) {
    if (rev.parent_revision_id === null) continue;
    if (!byId.has(rev.parent_revision_id)) {
      return {
        ok: false,
        errors: [
          `Revision ${rev.id} points at missing parent ${rev.parent_revision_id}.`,
        ],
      };
    }
    const list = children.get(rev.parent_revision_id) ?? [];
    list.push(rev);
    children.set(rev.parent_revision_id, list);
  }

  const chain: IfcModelRevision[] = [];
  const visited = new Set<string>();
  let current: IfcModelRevision | undefined = roots[0];
  while (current) {
    if (visited.has(current.id)) {
      return {
        ok: false,
        errors: [`Cycle detected at revision ${current.id}.`],
      };
    }
    visited.add(current.id);
    chain.push(current);
    const kids: IfcModelRevision[] = children.get(current.id) ?? [];
    if (kids.length > 1) {
      return {
        ok: false,
        errors: [
          `Revision ${current.id} has ${kids.length} children (${kids.map((k: IfcModelRevision) => k.id).join(", ")}); a linear issue chain is required.`,
        ],
      };
    }
    current = kids[0];
  }

  if (chain.length !== byId.size) {
    return {
      ok: false,
      errors: [
        `${byId.size - chain.length} revision(s) are not reachable from the root.`,
      ],
    };
  }
  return { ok: true, chain };
}

/** Capture a revision element index from loader output. */
export function indexModelElements(
  elements: readonly IfcModelElement[],
): Record<string, RevisionElementEntry> {
  const index: Record<string, RevisionElementEntry> = {};
  for (const element of elements) {
    if (!element.globalId) continue;
    index[element.globalId] = {
      parts: element.geometry.length,
      type: element.ifcClass,
    };
  }
  return index;
}

/**
 * Honest element-level diff between two revisions of the same model.
 * Refuses revisions from different models.
 */
export function diffRevisions(
  base: IfcModelRevision,
  next: IfcModelRevision,
): RevisionDiff | { ok: false; errors: string[] } {
  if (base.model_id !== next.model_id) {
    return {
      ok: false,
      errors: [
        `Cannot diff revisions of different models (${base.model_id} vs ${next.model_id}).`,
      ],
    };
  }
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  let unchanged = 0;

  for (const [globalId, entry] of Object.entries(next.element_index)) {
    const before = base.element_index[globalId];
    if (!before) added.push(globalId);
    else if (before.parts !== entry.parts) modified.push(globalId);
    else unchanged += 1;
  }
  for (const globalId of Object.keys(base.element_index)) {
    if (!next.element_index[globalId]) removed.push(globalId);
  }

  return {
    base_id: base.id,
    next_id: next.id,
    added: added.sort(),
    removed: removed.sort(),
    modified: modified.sort(),
    unchanged_count: unchanged,
    scope_note: SCOPE_NOTE,
  };
}
