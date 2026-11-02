/**
 * Shared unit-aware purchase rounding for quantity engines.
 *
 * ceilU / ceilM round a computed quantity UP to the next whole unit
 * (units, metres, rolls, bags, ...) so a purchase list never under-buys,
 * while an epsilon scaled to the magnitude of the value absorbs float dust
 * (e.g. 12.000000000000002 -> 12, not 13).
 *
 * Previously this exact helper was copy-pasted in the reinforcement,
 * electrical, plumbing, flooring, foundation, generator and waterproofing
 * engines; all of them now import it from here so the rounding policy
 * can only ever change in one place.
 */
export function ceilU(v: number): number {
  return Math.ceil(v - Math.max(1e-9, Math.abs(v) * 1e-12));
}

/** Alias for engines whose quantity unit is metres. */
export const ceilM: (v: number) => number = ceilU;
