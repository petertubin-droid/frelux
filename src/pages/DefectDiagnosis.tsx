/**
 * FRELUX Defect Diagnosis (Future Engine 9)
 *
 * Symptom-to-root-cause mapping with fix quantities, from an
 * admin-configured knowledge base.
 *
 * - The diagnosis is produced ONLY by diagnoseDefect.
 *   This page renders; it never ranks causes or computes
 *   quantities itself.
 */

import { useEffect, useState } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchDefects,
  fetchDefectCauses,
  fetchCalcRules,
} from "@/lib/estimation/queries";
import {
  diagnoseDefect,
  type DiagnosisResult,
} from "@/lib/estimation/defect-diagnosis-engine";
import type {
  Defect,
  DefectCause,
  EstimationCalcRule,
} from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

const severityColor: Record<string, string> = {
  low: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-500",
  high: "text-destructive",
};

export default function DefectDiagnosis() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Defect Diagnosis", path: "/defect-diagnosis" },
  ]);
  useSeo({
    title: "Defect Diagnosis — FRELUX",
    description:
      "Map a paint or finish defect to its root cause and get the fix, with quantities — from a deterministic, admin-configured knowledge base.",
  });

  const [defects, setDefects] = useState<Defect[]>([]);
  const [allCauses, setAllCauses] = useState<DefectCause[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [symptomKey, setSymptomKey] = useState("");
  const [area, setArea] = useState("");
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  useEffect(() => {
    fetchDefects({ activeOnly: true }).then(({ data, error }) => {
      if (error) setLoadError(getSafeError(error, "Failed to load defects."));
      else setDefects(data);
    });
    fetchDefectCauses().then(({ data, error }) => {
      if (error)
        setLoadError(getSafeError(error, "Failed to load defect causes."));
      else setAllCauses(data);
    });
    fetchCalcRules("defects").then(({ data }) => setRules(data));
  }, []);

  const selected = defects.find((d) => d.symptom_key === symptomKey) ?? null;
  const causesForSymptom = selected
    ? allCauses.filter((c) => c.defect_id === selected.id)
    : [];

  const run = () => {
    if (!selected) return;
    const r = diagnoseDefect({
      symptom_key: symptomKey,
      causes: causesForSymptom,
      affected_area_sqm: area.trim() === "" ? null : Number(area),
      rules,
    });
    setResult(r);
    if (r.ok) track("defect_diagnosed");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Defect Diagnosis" },
          ]}
          title="Defect Diagnosis"
          subtitle="Pick the symptom you're seeing and get its root causes with fixes — ranked by our configured likelihood order, never an algorithm's guess. Causes with a configured consumption rate also show the exact fix quantity for your affected area."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          {defects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No defect symptoms configured yet. The knowledge base is entered
              by the admin team — FRELUX never publishes guessed diagnoses.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                Symptom
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={symptomKey}
                  onChange={(e) => {
                    setSymptomKey(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="">Select what you're seeing</option>
                  {defects.map((d) => (
                    <option key={d.id} value={d.symptom_key}>
                      {d.symptom_label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Affected area (sqm, optional)
                <input
                  type="number"
                  min="1"
                  step="any"
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. 120"
                />
              </label>
              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={run}
                  disabled={!symptomKey}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Diagnose
                </button>
              </div>
            </div>
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

        {result?.ok && (
          <div className="space-y-4">
            {result.warnings.map((w, i) => (
              <p
                key={i}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-muted-foreground"
              >
                {w}
              </p>
            ))}
            <p className="text-sm text-muted-foreground">
              {result.causes.length} likely cause
              {result.causes.length === 1 ? "" : "s"}, listed in the configured
              likelihood order
              {result.affected_area_sqm !== null &&
                ` for ${result.affected_area_sqm} sqm`}
              .
            </p>
            <div className="space-y-3">
              {result.causes.map((c) => (
                <div
                  key={c.cause_key}
                  className="rounded-lg border border-border bg-card p-4 dark:border-white/5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{c.cause_label}</p>
                    <p
                      className={`text-xs font-semibold uppercase ${severityColor[c.severity] ?? ""}`}
                    >
                      {c.severity} severity
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.root_cause}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Fix: </span>
                    <span className="text-muted-foreground">
                      {c.fix_summary}
                    </span>
                  </p>
                  {c.fix_quantity !== null ? (
                    <p className="mt-2 rounded-lg border border-border bg-muted/40 p-2 text-sm">
                      <span className="font-medium">
                        {c.fix_quantity} {c.fix_unit}
                      </span>{" "}
                      of {c.fix_material ?? "fix material"}
                      {result.affected_area_sqm !== null && (
                        <span className="text-muted-foreground">
                          {" "}
                          for {result.affected_area_sqm} sqm
                        </span>
                      )}
                    </p>
                  ) : (
                    c.quantity_note && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {c.quantity_note}
                      </p>
                    )
                  )}
                </div>
              ))}
            </div>
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
