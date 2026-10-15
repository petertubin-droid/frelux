/**
 * FRELUX Engine #5, M2: provision-level cite-and-flag for calculators.
 *
 * Given a market + the engines a calculation/quote actually used, this
 * resolves the exact registry standards that apply and returns them as
 * FLAGS: each flag carries the precise citation the calculator output
 * should show next to the affected scope. It CITES, never CERTIFIES —
 * the flag status is always "flagged", never "compliant", and engines
 * with no standard on file are disclosed as unknowns, never guessed.
 *
 * Designed to be wired into any calculator result flow:
 *   const flags = await flagStandardsForCalculation(marketCode, engines);
 */

import {
  fetchStandardsForMarket,
  fetchComplianceReviews,
  buildChecklistFromRows,
  type ComplianceChecklist,
} from "./compliance-checklist";

export interface ProvisionFlag {
  /** Engine the flag applies to (e.g. 'structural'). */
  engine: string;
  /** Exact citation string for display. */
  citation: string;
  ref: string;
  evidenceUrl: string | null;
  coverageSpec: string | null;
  confidence: "high" | "medium" | "low" | null;
  /** Always 'flagged' — this engine never certifies. */
  status: "flagged";
  /** Human sentence to render under the calculation. */
  note: string;
}

export interface StandardsFlagSet {
  marketCode: string;
  /** Engines that were flagged (had at least one standard). */
  flaggedEngines: string[];
  /** Engines with NO standard on file — disclosed, never guessed. */
  unknownEngines: string[];
  flags: ProvisionFlag[];
  disclaimer: string;
}

/** The one note template — deterministic output. */
function noteFor(engine: string, citation: string, reviewed: boolean): string {
  const review = reviewed
    ? " Expert review on file."
    : "";
  return (
    `Your ${engine} calculation in this market is subject to ${citation}. ` +
    `Verify execution against the cited provision; this flag cites the ` +
    `standard, it does not certify compliance.${review}`
  );
}

/**
 * Resolve provision flags for the engines used by a calculation.
 * Deterministic: same registry rows => same flags, engine-asc then
 * ref-asc.
 */
export async function flagStandardsForCalculation(
  marketCode: string,
  engines: string[],
): Promise<StandardsFlagSet> {
  const [rows, reviews] = await Promise.all([
    fetchStandardsForMarket(marketCode),
    fetchComplianceReviews(marketCode),
  ]);
  const checklist = buildChecklistFromRows(rows, reviews, marketCode, engines);

  const flags: ProvisionFlag[] = [];
  for (const item of checklist.items) {
    if (!item.ref) continue; // unknowns handled separately
    for (const engine of item.appliesToEngines) {
      if (checklist.requestedEngines.length > 0 && !checklist.requestedEngines.includes(engine)) {
        continue;
      }
      flags.push({
        engine,
        citation: item.citation,
        ref: item.ref,
        evidenceUrl: item.evidenceUrl,
        coverageSpec: item.coverageSpec,
        confidence: item.confidence,
        status: "flagged",
        note: noteFor(engine, item.citation, item.review.status === "approved"),
      });
    }
  }
  flags.sort((a, b) =>
    a.engine === b.engine
      ? a.ref.localeCompare(b.ref)
      : a.engine.localeCompare(b.engine),
  );

  const flaggedEngines = Array.from(new Set(flags.map((f) => f.engine))).sort();
  return {
    marketCode: checklist.marketCode,
    flaggedEngines,
    unknownEngines: checklist.unknowns,
    flags,
    disclaimer: checklist.disclaimer,
  };
}
