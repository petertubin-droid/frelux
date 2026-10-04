/**
 * FRELUX Contractor Credit Score (Future Engine 13)
 *
 * A deterministic trust signal from verified job history — for
 * clients and lenders checking a contractor.
 *
 * - The score is produced ONLY by calculateCreditScore. This page
 *   renders; it never scores a contractor itself.
 * - A contractor with zero verified jobs is refused with
 *   "insufficient verified history" — never a zero score.
 * - Every profile shown is admin-verified with a source reference.
 */

import { useEffect, useState, useCallback } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchContractorCreditProfiles,
  fetchCalcRules,
} from "@/lib/estimation/queries";
import {
  calculateCreditScore,
  type CreditScoreResult,
} from "@/lib/estimation/contractor-credit-engine";
import type {
  ContractorCreditProfile,
  EstimationCalcRule,
} from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

export default function ContractorCredit() {
  useSeo({
    title: "Contractor Credit Score — Verified Job History | FRELUX",
    description:
      "Check a contractor's trust signal before you commit: a deterministic 0–100 score from verified job history — on-time delivery, estimate accuracy, verified volume, dispute penalty. Unverified history is refused, never scored zero.",
  });

  const [profiles, setProfiles] = useState<ContractorCreditProfile[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contractorId, setContractorId] = useState("");
  const [result, setResult] = useState<CreditScoreResult | null>(null);
  const [selected, setSelected] = useState<ContractorCreditProfile | null>(
    null,
  );

  const load = useCallback(async () => {
    const p = await fetchContractorCreditProfiles(true);
    if (p.error)
      setLoadError(
        getSafeError(p.error, "Failed to load contractor credit profiles."),
      );
    else setProfiles(p.data);
    const rl = await fetchCalcRules("credit_score");
    setRules(rl.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = (id: string) => {
    setContractorId(id);
    setResult(null);
    const profile = profiles.find((p) => p.id === id) ?? null;
    setSelected(profile);
    if (!profile) return;

    const r = calculateCreditScore({
      stats: {
        verified_jobs: profile.verified_jobs,
        on_time_jobs: profile.on_time_jobs,
        dispute_count: profile.dispute_count,
        avg_estimate_error_pct: profile.avg_estimate_error_pct,
      },
      rules: rules.map((r) => ({
        rule_key: r.rule_key,
        rule_value: r.rule_value as Record<string, unknown>,
      })),
    });
    setResult(r);
    if (r.ok) track("credit_score_checked");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Contractor Credit Score" },
          ]}
          title="Contractor Credit Score"
          subtitle="Before you commit money to a contractor, check the record: on-time delivery, estimate accuracy, verified job volume and disputes — scored deterministically from admin-verified job history. Unverified history is refused, never scored zero."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <label className="grid gap-1 text-sm font-medium">
            Contractor
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
              value={contractorId}
              onChange={(e) => run(e.target.value)}
            >
              <option value="">Select a contractor to check</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.contractor_name}
                  {p.registration_number ? ` (${p.registration_number})` : ""}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <p className="mt-2 text-xs text-muted-foreground">
              Verified from: {selected.verification_reference}
              {selected.effective_date
                ? ` · effective ${selected.effective_date}`
                : ""}
            </p>
          )}
        </div>

        {result && !result.ok && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {w}
              </p>
            ))}
          </div>
        )}

        {result?.ok && selected && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Credit score
                </p>
                <p className="mt-1 text-3xl font-semibold">{result.score}</p>
                <p className="text-xs text-muted-foreground">out of 100</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Band
                </p>
                <p className="mt-1 text-3xl font-semibold">{result.band}</p>
                <p className="text-xs text-muted-foreground">
                  from admin-configured thresholds
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Reliability
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.reliability_pct}%
                </p>
                <p className="text-xs text-muted-foreground">jobs on time</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Estimate accuracy
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.accuracy_pct}%
                </p>
                <p className="text-xs text-muted-foreground">
                  100 minus average estimate error
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Verified volume
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.volume_pct}%
                </p>
                <p className="text-xs text-muted-foreground">
                  of the configured reference history
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Dispute penalty
                </p>
                <p className="mt-1 text-xl font-semibold text-destructive">
                  −{result.penalty}
                </p>
                <p className="text-xs text-muted-foreground">
                  capped at the base score — the score never goes below zero
                </p>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {w}
                  </p>
                ))}
              </div>
            )}

            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                How this was determined
              </summary>
              <ul className="mt-2 space-y-1">
                {result.steps.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.label}:</span>{" "}
                    <span className="text-muted-foreground">{s.detail}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
