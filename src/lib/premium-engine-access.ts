/**
 * Who sees how much of a gated engine's answer.
 *
 * Kept as a pure function so the rule can be tested without a browser, and so
 * the shell that renders a gated tool has no opinion of its own about plans.
 * A paid plan or an admin account sees everything. Everyone else sees the
 * preview allowance and no export.
 */

import { premiumEngineFor, type PremiumEngine } from "@/config/premium-engines";

export interface EngineAccess {
  engine: PremiumEngine | null;
  /** True when the page is showing a cut down answer. */
  limited: boolean;
  /** Lines visible to this viewer for this engine. */
  visibleLines: number;
  /** Rows hidden behind the plan, given the result's own line count. */
  hiddenLines: (totalLines: number) => number;
  /** Export, print and saved documents are paid actions. */
  canExport: boolean;
}

const OPEN_ACCESS: EngineAccess = {
  engine: null,
  limited: false,
  visibleLines: Number.POSITIVE_INFINITY,
  hiddenLines: () => 0,
  canExport: true,
};

export function engineAccessFor(
  route: string,
  viewer: { isPaid?: boolean | null; isAdmin?: boolean | null } | null,
): EngineAccess {
  const engine = premiumEngineFor(route);
  if (!engine) return OPEN_ACCESS;

  // Entitlement that has not loaded yet must never hide a paying customer's
  // work, so an unknown viewer is treated as entitled and the account state,
  // once known, decides.
  const known =
    typeof viewer?.isPaid === "boolean" || typeof viewer?.isAdmin === "boolean";
  if (!known)
    return {
      ...OPEN_ACCESS,
      engine,
      visibleLines: Number.POSITIVE_INFINITY,
    };

  const entitled = Boolean(viewer?.isPaid || viewer?.isAdmin);
  if (entitled)
    return {
      ...OPEN_ACCESS,
      engine,
      visibleLines: Number.POSITIVE_INFINITY,
    };
  return {
    engine,
    limited: true,
    visibleLines: engine.previewLines,
    hiddenLines: (totalLines: number) =>
      Math.max(0, totalLines - engine.previewLines),
    canExport: false,
  };
}
