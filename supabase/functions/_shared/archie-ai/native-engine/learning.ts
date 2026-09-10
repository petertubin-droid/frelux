// =========================================================
// ARCHIE NATIVE ENGINE — LEARNING FROM VALIDATED OUTCOMES
//
// Real reinforcement over the knowledge store (§3 RETAIN and
// §8 LEARN FREELY → ANALYZE → VALIDATE → RETAIN → APPLY →
// IMPROVE of the permanent architecture):
//   * outcomes record success/failure/correction with the
//     fact/rule ids that contributed (credit assignment)
//   * success strengthens contributing knowledge, failure and
//     correction weaken it
//   * consolidation runs on the fact store (merge, decay,
//     promote, drop)
// Learning NEVER grants authority — this module only adjusts
// knowledge confidence.
// =========================================================

import type { Fact, LearningOutcome } from "./types.ts";
import { FactStore } from "./knowledge.ts";

export interface OutcomePersistence {
  loadOutcomes(): Promise<LearningOutcome[]>;
  saveOutcome(outcome: LearningOutcome): Promise<void>;
}

const SUCCESS_DELTA = 0.05;
const FAILURE_DELTA = 0.12;
const CORRECTION_DELTA = 0.15;

export class OutcomeLearner {
  private outcomes: LearningOutcome[] = [];
  private persistence: OutcomePersistence | null = null;

  constructor(
    private facts: FactStore,
    persistence?: OutcomePersistence,
  ) {
    this.persistence = persistence ?? null;
  }

  async hydrate(): Promise<number> {
    if (!this.persistence) return 0;
    this.outcomes = await this.persistence.loadOutcomes();
    return this.outcomes.length;
  }

  count(): number {
    return this.outcomes.length;
  }

  list(): LearningOutcome[] {
    return [...this.outcomes];
  }

  /** Record an outcome and reinforce the knowledge that
   *  contributed to it. Real credit assignment. */
  async record(
    outcome: Omit<LearningOutcome, "id" | "timestamp">,
  ): Promise<LearningOutcome> {
    // Lesson extraction for failures/corrections (lo-3):
    // a deterministic cause taxonomy, with an honest
    // "needs owner diagnosis" fallback.
    let cause: string | undefined;
    let lesson: string | undefined;
    if (outcome.kind === "failure" || outcome.kind === "correction") {
      const t = outcome.task.toLowerCase();
      if (/off by \d+%|overestimat|underestimat|deviat/.test(t)) {
        cause = "calibration — the estimate deviated from the measured outcome";
        lesson = "recalibrate: apply the observed deviation as a bias correction on future estimates of this kind";
      } else if (/timeout|too slow|took too long/.test(t)) {
        cause = "performance — the operation exceeded its time budget";
        lesson = "reduce the workload per pass or pre-compute the expensive step";
      } else if (/typo|malform|garble|invalid/.test(t)) {
        cause = "input integrity — malformed input reached the computation";
        lesson = "validate and normalize inputs before computing";
      } else {
        cause = "unknown — needs owner diagnosis";
        lesson = "inspect the contributing knowledge; no known failure signature matched this task";
      }
    }

    const full: LearningOutcome = {
      ...outcome,
      ...(cause !== undefined ? { cause } : {}),
      ...(lesson !== undefined ? { lesson } : {}),
      id: `outcome_${Date.now().toString(36)}_${this.outcomes.length}`,
      timestamp: new Date().toISOString(),
    };
    this.outcomes.push(full);
    if (this.persistence) await this.persistence.saveOutcome(full);

    // Citing is not a verified outcome: no reinforcement at
    // all (audit C3, lo-2). Only real outcome evidence moves
    // confidence.
    if (outcome.kind === "cited") return full;

    const delta =
      outcome.kind === "success"
        ? SUCCESS_DELTA
        : outcome.kind === "failure"
          ? -FAILURE_DELTA
          : -CORRECTION_DELTA;

    for (const id of outcome.contributing) {
      const fact = this.facts.get(id);
      if (fact) {
        fact.confidence = clamp01(fact.confidence + delta);
        if (delta > 0) {
          fact.validatedCount += 1;
          if (fact.validatedCount >= 2 && fact.confidence >= 0.6) {
            fact.status = "validated";
          }
        } else if (fact.confidence < 0.25 || outcome.kind === "correction") {
          // Owner-corrected knowledge is always parked as
          // uncertain — never silently retained as established.
          fact.status = "uncertain";
        }
      }
    }
    return full;
  }

  /** Improvement pass: consolidate the fact store. */
  async improve(): Promise<{
    merged: number;
    decayed: number;
    promoted: number;
    dropped: number;
  }> {
    return this.facts.consolidate();
  }

  /** Knowledge that survived correction learning — used by
   *  diagnostics to show measurable learning. */
  reinforcedFacts(): Fact[] {
    const contributing = new Set(
      this.outcomes
        .filter((o) => o.kind === "success")
        .flatMap((o) => o.contributing),
    );
    return this.facts
      .list()
      .filter((f) => contributing.has(f.id) && f.status === "validated");
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
