/**
 * Pillar 3: clash screening rules for federated models.
 *
 * Engine-1A #1 (BIM/CAD) milestone: measurable, auditable clash CANDIDATES
 * between elements of different models (or within one model).
 *
 * Scope discipline:
 *  - Axis-aligned bounding-box (AABB) screening only. This is NOT a
 *    geometric intersection test: a reported clash means the boxes
 *    overlap, which a designer must confirm or dismiss. The result says so.
 *  - Deterministic: same input, same ordered output, stable ids.
 *  - Issue records are plain data (auditable), with rule id, tolerance and
 *    detection timestamp, so a screening run can be replayed.
 */

export interface Box3Like {
  min: [number, number, number];
  max: [number, number, number];
}

export interface ModelBoxes {
  model_id: string;
  /** GlobalId -> element AABB in world coordinates */
  boxes: Map<string, Box3Like>;
}

export interface ClashCandidate {
  /** stable, deterministic id: rule + both elements */
  id: string;
  model_a: string;
  global_id_a: string;
  model_b: string;
  global_id_b: string;
  /** overlap extents in metres (all > 0 for a reported clash) */
  overlap: [number, number, number];
  /** overlap volume in m^3 */
  overlap_volume: number;
}

export interface ClashScreenOptions {
  /** expand every box by this many metres before testing (default 0) */
  tolerance?: number;
  /** only report pairs from different models (default true) */
  cross_model_only?: boolean;
  /** hard cap on reported candidates (default 500) */
  max_candidates?: number;
}

export interface ClashScreenResult {
  ok: true;
  candidates: ClashCandidate[];
  /** number of element pairs tested */
  pairs_tested: number;
  truncated: boolean;
  rule: {
    id: string;
    method: string;
    tolerance: number;
    cross_model_only: boolean;
    scope_note: string;
  };
}

const RULE_ID = "aabb-overlap-v1";
const SCOPE_NOTE =
  "Axis-aligned bounding-box screening only; a candidate means the boxes " +
  "overlap, not that geometry intersects. Confirm or dismiss each candidate " +
  "before treating it as a clash.";

function overlapExtents(
  a: Box3Like,
  b: Box3Like,
  tol: number,
): [number, number, number] | null {
  const ox =
    Math.min(a.max[0], b.max[0]) + tol - (Math.max(a.min[0], b.min[0]) - tol);
  const oy =
    Math.min(a.max[1], b.max[1]) + tol - (Math.max(a.min[1], b.min[1]) - tol);
  const oz =
    Math.min(a.max[2], b.max[2]) + tol - (Math.max(a.min[2], b.min[2]) - tol);
  if (ox <= 0 || oy <= 0 || oz <= 0) return null;
  return [ox, oy, oz];
}

export function screenClashes(
  models: readonly ModelBoxes[],
  options: ClashScreenOptions = {},
): ClashScreenResult {
  const tolerance = options.tolerance ?? 0;
  const crossOnly = options.cross_model_only ?? true;
  const cap = options.max_candidates ?? 500;

  // Flatten to a deterministic element list.
  const elements: { model: string; globalId: string; box: Box3Like }[] = [];
  for (const model of [...models].sort((a, b) =>
    a.model_id.localeCompare(b.model_id),
  )) {
    for (const [globalId, box] of [...model.boxes.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      elements.push({ model: model.model_id, globalId, box });
    }
  }

  const candidates: ClashCandidate[] = [];
  let pairsTested = 0;
  let truncated = false;

  for (let i = 0; i < elements.length && !truncated; i += 1) {
    for (let j = i + 1; j < elements.length; j += 1) {
      const a = elements[i];
      const b = elements[j];
      if (crossOnly && a.model === b.model) continue;
      pairsTested += 1;
      const overlap = overlapExtents(a.box, b.box, tolerance);
      if (!overlap) continue;
      candidates.push({
        id: `${RULE_ID}:${a.model}/${a.globalId}~${b.model}/${b.globalId}`,
        model_a: a.model,
        global_id_a: a.globalId,
        model_b: b.model,
        global_id_b: b.globalId,
        overlap,
        overlap_volume: Number(
          (overlap[0] * overlap[1] * overlap[2]).toFixed(6),
        ),
      });
      if (candidates.length >= cap) {
        truncated = true;
        break;
      }
    }
  }

  // Largest overlap first, then stable id order.
  candidates.sort(
    (x, y) => y.overlap_volume - x.overlap_volume || x.id.localeCompare(y.id),
  );

  return {
    ok: true,
    candidates,
    pairs_tested: pairsTested,
    truncated,
    rule: {
      id: RULE_ID,
      method: "axis-aligned bounding box overlap",
      tolerance,
      cross_model_only: crossOnly,
      scope_note: SCOPE_NOTE,
    },
  };
}

export type ClashIssueStatus = "open" | "confirmed" | "dismissed";

export interface ClashIssueRecord {
  id: string;
  candidate_id: string;
  rule_id: string;
  status: ClashIssueStatus;
  detected_at: string;
  tolerance: number;
  note?: string;
  model_a: string;
  global_id_a: string;
  model_b: string;
  global_id_b: string;
  overlap_volume: number;
}

/** Auditable issue record for one candidate. Status starts open. */
export function createClashIssue(
  candidate: ClashCandidate,
  detected_at: string,
  tolerance = 0,
): ClashIssueRecord {
  return {
    id: `issue:${candidate.id}`,
    candidate_id: candidate.id,
    rule_id: RULE_ID,
    status: "open",
    detected_at,
    tolerance,
    model_a: candidate.model_a,
    global_id_a: candidate.global_id_a,
    model_b: candidate.model_b,
    global_id_b: candidate.global_id_b,
    overlap_volume: candidate.overlap_volume,
  };
}
