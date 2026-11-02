/**
 * FRELUX Embodied Carbon Estimator (Future Engine 5)
 *
 * kgCO2e for a set of estimate lines from admin-configured
 * carbon factors. Lines without a configured factor are
 * excluded with a warning - never a guessed emission.
 *
 * - Totals are produced ONLY by calculateEmbodiedCarbon.
 *   This page renders; it never computes emissions itself.
 */

import { useEffect, useState } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { fetchCarbonFactors, fetchCalcRules } from "@/lib/estimation/queries";
import { lookupEc3Epds, type EpdFactor } from "@/lib/estimation/ec3-epd";
import { getSupabase } from "@/lib/supabase-lazy";
import {
  calculateEmbodiedCarbon,
  categoriesWithFactors,
  type EmbodiedCarbonResult,
} from "@/lib/estimation/embodied-carbon-engine";
import type { CarbonFactor, EstimationCalcRule } from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";
import { useLanguage } from "@/lib/i18n";

interface LineForm {
  category: string;
  quantity: string;
}

const emptyLine: LineForm = { category: "", quantity: "" };

export default function CarbonFootprint() {
  const { t } = useLanguage();
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Embodied Carbon Estimator", path: "/carbon-footprint" },
  ]);
  useSeo({
    title: "Embodied Carbon Estimator: FRELUX",
    description:
      "Estimate the embodied carbon (kgCO2e) of your construction and finishing works from verified, verified emission factors.",
  });

  const [factors, setFactors] = useState<CarbonFactor[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lines, setLines] = useState<LineForm[]>([{ ...emptyLine }]);
  const [result, setResult] = useState<EmbodiedCarbonResult | null>(null);

  useEffect(() => {
    fetchCarbonFactors().then(({ data, error }) => {
      if (error)
        setLoadError(getSafeError(error, "Failed to load carbon factors."));
      else setFactors(data);
    });
    fetchCalcRules("embodied_carbon").then(({ data }) => setRules(data));
  }, []);

  const [epdFactors, setEpdFactors] = useState<EpdFactor[]>([]);
  const [epdNotice, setEpdNotice] = useState<string | null>(null);

  // EC3 lookup: plant-specific verified EPDs for the categories on screen.
  // Refusal is expected and honest (no key configured yet) — the assessment
  // then runs on admin factors and says exactly that.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (categoriesWithFactors(factors).length === 0) return;
      const supabase = await getSupabase().catch(() => null);
      if (!supabase) return;
      const outcome = await lookupEc3Epds(
        {
          materialQuery: categoriesWithFactors(factors).slice(0, 5).join(" "),
          limit: 10,
        },
        async (req) => {
          const { data, error } = await supabase.functions.invoke(
            "ec3-epd-lookup",
            { body: req },
          );
          if (error) throw new Error(error.message);
          return data;
        },
      );
      if (cancelled) return;
      if (outcome.ok) {
        setEpdFactors(outcome.factors);
        setEpdNotice(
          `Plant-specific verified EPDs loaded from Building Transparency EC3: ${outcome.factors.length} declaration(s) adopted.`,
        );
      } else if (outcome.reason) {
        setEpdNotice(outcome.reason);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [factors]);

  const categories = categoriesWithFactors(factors);
  const factorByCategory = (cat: string) =>
    factors.find(
      (f) =>
        f.is_active !== false && f.category.toLowerCase() === cat.toLowerCase(),
    );

  const setLine = (i: number, patch: Partial<LineForm>) =>
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );

  const calculate = () => {
    const r = calculateEmbodiedCarbon({
      lines: lines
        .filter((l) => l.category && l.quantity !== "")
        .map((l) => ({ category: l.category, quantity: Number(l.quantity) })),
      factors,
      epdFactors,
      rules,
    });
    if (epdFactors.length === 0 && epdNotice) {
      r.epd_unavailable_reason = epdNotice;
    }
    setResult(r);
    if (r.ok) track("carbon_estimated");
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Embodied Carbon Estimator" },
          ]}
          title={t("Embodied Carbon Estimator")}
          subtitle="kgCO2e per line from verified, verifiable emission factors (EPDs, ICE database). Lines without a configured factor are excluded with a warning: FRELUX never guesses an emission."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {epdNotice && (
          <div
            className={
              epdFactors.length > 0
                ? "rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-muted-foreground"
                : "rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-muted-foreground"
            }
          >
            {epdNotice}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <h2 className="mb-3 text-base font-semibold">
            {t("Estimate lines")}
          </h2>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No carbon factors configured yet. Factors are entered by FRELUX
              team from verifiable sources: FRELUX never publishes guessed
              emission values.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((line, i) => {
                const factor = line.category
                  ? factorByCategory(line.category)
                  : null;
                return (
                  <div
                    key={i}
                    className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <select
                      aria-label={`Line ${i + 1} material or finish`}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={line.category}
                      onChange={(e) => setLine(i, { category: e.target.value })}
                    >
                      <option value="">{t("Select material/finish")}</option>
                      {categories.map((c) => {
                        const f = factorByCategory(c)!;
                        return (
                          <option key={c} value={c}>
                            {f.category_label ?? c} ({f.unit})
                          </option>
                        );
                      })}
                    </select>
                    <input
                      aria-label={`Line ${i + 1} quantity`}
                      type="number"
                      min="0"
                      step="any"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={line.quantity}
                      onChange={(e) => setLine(i, { quantity: e.target.value })}
                      placeholder={`Quantity${factor ? ` (${factor.unit})` : ""}`}
                    />
                    <p className="self-center text-xs text-muted-foreground">
                      {factor
                        ? `${factor.kg_co2e_per_unit} kgCO2e/${factor.unit} · ${factor.source_reference}`
                        : "Pick a material to see its factor and source"}
                    </p>
                    <button
                      type="button"
                      className="self-center rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-30"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      {t("Remove")}
                    </button>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
                  onClick={() =>
                    setLines((prev) => [...prev, { ...emptyLine }])
                  }
                >
                  + Add line
                </button>
                <button
                  type="button"
                  onClick={calculate}
                  disabled={!lines.some((l) => l.category && l.quantity !== "")}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {t("Calculate Carbon")}
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
            <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
              <p className="text-sm text-muted-foreground">
                Total embodied carbon across {result.covered_lines} covered line
                {result.covered_lines === 1 ? "" : "s"}
                {result.excluded_lines > 0
                  ? ` (${result.excluded_lines} excluded: see warnings)`
                  : ""}
              </p>
              <p className="mt-1 text-3xl font-bold">
                {result.total_kg_co2e.toLocaleString()} kgCO₂e
              </p>
            </div>
            {result.whole_life && result.whole_life.ok && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
                <p className="mb-2 font-medium">
                  {t("RICS whole life carbon modules (EN 15978)")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {result.whole_life.modules.map((m) => (
                    <div
                      key={m.module}
                      className="flex items-center justify-between rounded border border-border px-3 py-2 dark:border-white/5"
                    >
                      <span className="text-muted-foreground">
                        Module {m.module}
                      </span>
                      <span className="font-medium">
                        {m.kg_co2e.toLocaleString()} kgCO₂e
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-muted-foreground">
                  Upfront (A1–A5){" "}
                  {result.whole_life.upfrontCarbon.toLocaleString()}
                  {" · "}use stage embodied{" "}
                  {result.whole_life.useStageEmbodied.toLocaleString()}
                  {" · "}operational{" "}
                  {result.whole_life.operationalInUse.toLocaleString()}
                  {" · "}end of life{" "}
                  {result.whole_life.endOfLife.toLocaleString()}
                  {" · "}total excl. D{" "}
                  {result.whole_life.totalExcludingD.toLocaleString()}
                  {" · "}whole life incl. D{" "}
                  {result.whole_life.wholeLifeTotal.toLocaleString()} kgCO₂e
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground">
                    {t("Tender reportability disclosures")}
                  </summary>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {result.whole_life.disclosures.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                {t("Per-line breakdown")}
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
    </Container>
  );
}
