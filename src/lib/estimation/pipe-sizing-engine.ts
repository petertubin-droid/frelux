/**
 * Domestic water pipe sizing by velocity limit.
 *
 * The plumbing estimator has always counted pipe metres without ever checking
 * whether the pipe it was counting could carry the water. This module closes
 * that gap with arithmetic only: demand comes from the user's own outlet flow
 * rates, the velocity limits are theirs to set, and the answer is the smallest
 * standard bore whose velocity stays inside the limit.
 *
 * Nothing here decides demand for the user. A simultaneity factor is applied
 * only because they asked for one, and it is shown in the working.
 */

export type PipeFamily = "copper" | "ppr";

export interface PipeBore {
  /** How the size is bought and quoted. */
  label: string;
  /** True internal diameter, mm. The number that governs velocity. */
  inner_mm: number;
  family: PipeFamily;
}

/**
 * Internal bores, not nominal sizes. A "15 mm" copper tube is 13.6 mm inside,
 * and using the nominal figure overstates capacity by about 20 percent.
 * EN 1057 copper, half hard, and PPR PN20.
 */
export const COPPER_BORES: ReadonlyArray<PipeBore> = [
  { label: "15 mm copper", inner_mm: 13.6, family: "copper" },
  { label: "22 mm copper", inner_mm: 20.2, family: "copper" },
  { label: "28 mm copper", inner_mm: 26.2, family: "copper" },
  { label: "35 mm copper", inner_mm: 32.6, family: "copper" },
  { label: "42 mm copper", inner_mm: 40.0, family: "copper" },
  { label: "54 mm copper", inner_mm: 51.6, family: "copper" },
];

export const PPR_BORES: ReadonlyArray<PipeBore> = [
  { label: "20 mm PPR", inner_mm: 13.2, family: "ppr" },
  { label: "25 mm PPR", inner_mm: 16.6, family: "ppr" },
  { label: "32 mm PPR", inner_mm: 21.2, family: "ppr" },
  { label: "40 mm PPR", inner_mm: 26.6, family: "ppr" },
  { label: "50 mm PPR", inner_mm: 33.2, family: "ppr" },
  { label: "63 mm PPR", inner_mm: 42.0, family: "ppr" },
];

export function boresFor(family: PipeFamily): ReadonlyArray<PipeBore> {
  return family === "ppr" ? PPR_BORES : COPPER_BORES;
}

export interface OutletFlow {
  /** What the outlet is, for the working shown back to the user. */
  label: string;
  /** Rated flow of that outlet, litres per minute. */
  flow_lpm: number;
  count: number;
}

export interface DemandInput {
  outlets: OutletFlow[];
  /**
   * Share of the outlets assumed to run at once, 0 to 1. A value the user
   * chooses, never one this engine invents: 1 means every outlet at full flow,
   * which sizes the pipe that cannot fail but is expensive.
   */
  simultaneity_factor: number;
}

export interface DemandResult {
  connected_lpm: number;
  design_lpm: number;
  design_lps: number;
  simultaneity_factor: number;
  detail: string;
}

export function designFlow(input: DemandInput): DemandResult {
  const factor =
    Number.isFinite(input.simultaneity_factor) && input.simultaneity_factor > 0
      ? Math.min(1, input.simultaneity_factor)
      : 1;
  const connected = (input.outlets ?? []).reduce((sum, o) => {
    const flow = Number(o.flow_lpm);
    const count = Number(o.count);
    if (
      !Number.isFinite(flow) ||
      !Number.isFinite(count) ||
      flow <= 0 ||
      count <= 0
    ) {
      return sum;
    }
    return sum + flow * count;
  }, 0);
  const designLpm = connected * factor;
  const parts = (input.outlets ?? [])
    .filter((o) => Number(o.flow_lpm) > 0 && Number(o.count) > 0)
    .map((o) => `${o.count} × ${o.label} at ${o.flow_lpm} l/min`)
    .join(" + ");
  return {
    connected_lpm: round(connected, 2),
    design_lpm: round(designLpm, 2),
    design_lps: round(designLpm / 60, 3),
    simultaneity_factor: factor,
    detail: parts
      ? `${parts} = ${round(connected, 2)} l/min × ${factor} simultaneity = ${round(designLpm, 2)} l/min (${round(designLpm / 60, 3)} l/s).`
      : "No outlet flow rates entered yet.",
  };
}

export interface PipeSizingRequest {
  flow_lps: number;
  velocity_limit_mps: number;
  family?: PipeFamily;
}

export interface PipeSizingVerdict {
  feasible: boolean;
  required_bore_mm: number | null;
  chosen: PipeBore | null;
  velocity_mps: number | null;
  velocity_limit_mps: number;
  reason: string;
  /** Every size considered, so the choice can be inspected. */
  candidates: Array<{
    label: string;
    inner_mm: number;
    velocity_mps: number;
    passes: boolean;
  }>;
}

function round(v: number, dp: number): number {
  const m = 10 ** dp;
  return Math.round(v * m) / m;
}

/** Bore needed to hold a flow at or below the velocity limit, in mm. */
export function requiredBoreMm(
  flow_lps: number,
  velocity_limit_mps: number,
): number | null {
  if (!(flow_lps > 0) || !(velocity_limit_mps > 0)) return null;
  // q (l/s) is 1e-3 m3/s; A = q / v in m2, then to mm2.
  const area_mm2 = (flow_lps / 1000 / velocity_limit_mps) * 1_000_000;
  return round(Math.sqrt((4 * area_mm2) / Math.PI), 2);
}

/**
 * Smallest standard bore that carries the design flow inside the velocity
 * limit. Refuses when the largest tabulated size is still too small, rather
 * than returning a size that will whistle.
 */
export function sizePipe(request: PipeSizingRequest): PipeSizingVerdict {
  const limit = Number(request.velocity_limit_mps);
  const flow = Number(request.flow_lps);
  const bores = boresFor(request.family === "ppr" ? "ppr" : "copper");

  if (!(flow > 0) || !(limit > 0)) {
    return {
      feasible: false,
      required_bore_mm: null,
      chosen: null,
      velocity_mps: null,
      velocity_limit_mps: limit,
      reason:
        "Pipe size not determined: the design flow and a velocity limit above zero are both required.",
      candidates: [],
    };
  }

  const candidates = bores.map((bore) => {
    const area_mm2 = (Math.PI * bore.inner_mm ** 2) / 4;
    const velocity = flow / 1000 / (area_mm2 / 1_000_000);
    return {
      label: bore.label,
      inner_mm: bore.inner_mm,
      velocity_mps: round(velocity, 2),
      passes: velocity <= limit,
      bore,
    };
  });
  const chosen = candidates.find((c) => c.passes);

  if (!chosen) {
    const largest = candidates[candidates.length - 1];
    return {
      feasible: false,
      required_bore_mm: requiredBoreMm(flow, limit),
      chosen: null,
      velocity_mps: largest.velocity_mps,
      velocity_limit_mps: limit,
      reason: `${flow} l/s cannot be carried inside ${limit} m/s by any tabulated bore up to ${largest.label}: enlarge the supply, split the run, or raise the limit deliberately.`,
      candidates: candidates.map(
        ({ label, inner_mm, velocity_mps, passes }) => ({
          label,
          inner_mm,
          velocity_mps,
          passes,
        }),
      ),
    };
  }

  return {
    feasible: true,
    required_bore_mm: requiredBoreMm(flow, limit),
    chosen: chosen.bore,
    velocity_mps: chosen.velocity_mps,
    velocity_limit_mps: limit,
    reason: `${flow} l/s in ${chosen.label} (${chosen.inner_mm} mm bore) runs at ${chosen.velocity_mps} m/s against a ${limit} m/s limit; ${requiredBoreMm(flow, limit)} mm of bore is the minimum that holds the limit.`,
    candidates: candidates.map(({ label, inner_mm, velocity_mps, passes }) => ({
      label,
      inner_mm,
      velocity_mps,
      passes,
    })),
  };
}

/** Where a velocity sits between "quiet" and "audible", for the UI note. */
export function velocityNote(velocity_mps: number | null): string {
  if (velocity_mps === null) return "Velocity not computed.";
  if (velocity_mps <= 0.5)
    return "Slow: generous pipe, quiet, more material than needed.";
  if (velocity_mps <= 1.0) return "Normal domestic velocity: quiet in service.";
  if (velocity_mps <= 1.5)
    return "Upper end of normal: fine for cold branches, audible at night.";
  return "Fast: erosion and noise risk.";
}
