/**
 * FRELUX Quote Check
 *
 * Compares a contractor or supplier quote against the market price book line by
 * line, and says plainly which lines it can judge and which it cannot.
 *
 * - The verdict is produced ONLY by checkQuote.
 *   This page collects inputs, resolves reference prices and renders.
 * - A line without a price book rate is never given a verdict.
 * - The rate, unit and market that supplied each reference are shown on the
 *   row, so a comparison traces back to a real row in the price book.
 */

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { useMarket } from "@/lib/international/market-context";
import { formatCurrency } from "@/lib/utils";
import { getSafeError } from "@/lib/safeError";
import {
  fetchMarketRoleMappings,
  resolveMaterialPriceByRole,
  evidenceSentence,
  type MarketRoleMapping,
  type ResolvedMaterialPrice,
} from "@/lib/estimation/market-materials";
import {
  checkQuote,
  type QuoteLineInput,
  type QuoteReference,
} from "@/lib/estimation/quote-check-engine";
import AdSlot from "@/components/ui/AdSlot";

interface QuoteRow {
  key: string;
  role: string;
  description: string;
  quantity: string;
  unit: string;
  quotedRate: string;
}

const money = (value: number) => formatCurrency(value);

const newRow = (): QuoteRow => ({
  key: `row-${Math.random().toString(36).slice(2, 9)}`,
  role: "",
  description: "",
  quantity: "",
  unit: "",
  quotedRate: "",
});

const statusStyles: Record<string, string> = {
  fair: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  over: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  under:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  no_reference:
    "bg-muted text-muted-foreground border-border dark:bg-white/5 dark:border-white/10",
  unit_mismatch:
    "bg-muted text-muted-foreground border-border dark:bg-white/5 dark:border-white/10",
  invalid:
    "bg-muted text-muted-foreground border-border dark:bg-white/5 dark:border-white/10",
};

const statusLabels: Record<string, string> = {
  fair: "Fair",
  over: "Above market",
  under: "Below market",
  no_reference: "No reference",
  unit_mismatch: "Unit differs",
  invalid: "Incomplete",
};

export default function QuoteCheck() {
  const { marketCode, market } = useMarket();
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Quote Check", path: "/quote-check" },
  ]);
  useSeo({
    title: "Contractor Quote Check Against Market Prices | FRELUX",
    description:
      "Check a contractor quote against the market price book line by line. See which lines sit above market and which have no reference price.",
    canonicalPath: "/quote-check",
  });

  const [mappings, setMappings] = useState<MarketRoleMapping[]>([]);
  const [resolved, setResolved] = useState<
    Record<string, ResolvedMaterialPrice | null>
  >({});
  const [rows, setRows] = useState<QuoteRow[]>([newRow()]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    setResolved({});
    fetchMarketRoleMappings(marketCode)
      .then((list) => {
        if (!active) return;
        setMappings(list);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(
          getSafeError(error, "The price book could not be loaded."),
        );
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [marketCode]);

  // Resolve one price per role the quote actually uses. Nothing resolves for
  // rows the user left blank, so an empty page costs no queries.
  const rolesInUse = useMemo(() => {
    const roles = new Set<string>();
    for (const row of rows) {
      if (row.role && !(row.role in resolved)) roles.add(row.role);
    }
    return [...roles];
  }, [rows, resolved]);

  useEffect(() => {
    let active = true;
    for (const role of rolesInUse) {
      resolveMaterialPriceByRole(role as MarketRoleMapping["role"], marketCode)
        .then((value) => {
          if (!active) return;
          setResolved((current) =>
            role in current ? current : { ...current, [role]: value },
          );
        })
        .catch(() => {
          if (!active) return;
          setResolved((current) =>
            role in current ? current : { ...current, [role]: null },
          );
        });
    }
    return () => {
      active = false;
    };
  }, [rolesInUse, marketCode]);

  const toReference = (role: string): QuoteReference | null => {
    const value = resolved[role];
    if (!value) return null;
    const unit =
      mappings.find((mapping) => mapping.role === role)?.unit_label ?? "";
    return {
      rate: value.price.price,
      unit,
      market: value.resolved_market,
      name: value.material.name,
      evidence: value.evidence,
    };
  };

  const engineLines: QuoteLineInput[] = rows.map((row) => ({
    key: row.key,
    description:
      row.description ||
      mappings.find((mapping) => mapping.role === row.role)?.display_name ||
      "Custom line",
    quantity: Number(row.quantity),
    unit: row.unit,
    quotedRate: Number(row.quotedRate),
    reference: row.role ? toReference(row.role) : null,
  }));

  const result = checkQuote(engineLines);

  const updateRow = (key: string, patch: Partial<QuoteRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (key: string) => {
    setRows((current) =>
      current.length === 1 ? [newRow()] : current.filter((r) => r.key !== key),
    );
  };

  const resultFor = (key: string) =>
    result.lines.find((line) => line.key === key) ?? null;

  return (
    <Container className="py-10">
      <PageHeader
        eyebrow="Project and cost"
        title="Quote Check"
        subtitle="Compare a contractor or supplier quote against the FRELUX price book. Every line is judged on the market rate for its own unit, and lines with no reference price are marked instead of guessed."
      />

      <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="quote-lines" className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="quote-lines"
              className="text-lg font-semibold text-foreground"
            >
              Quote lines
            </h2>
            <p className="text-xs text-muted-foreground">
              {market.countryName} price book
            </p>
          </div>

          {loadError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{loadError}</p>
            </div>
          )}

          {rows.map((row, index) => {
            const line = resultFor(row.key);
            const reference = row.role ? resolved[row.role] : null;
            const evidence = row.role ? toReference(row.role) : null;
            const mapping = mappings.find((item) => item.role === row.role);
            return (
              <article
                key={row.key}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    Line {index + 1}
                  </p>
                  <div className="flex items-center gap-2">
                    {line && line.status !== "invalid" && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[line.status]}`}
                      >
                        {statusLabels[line.status]}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Item from the price book
                    <select
                      className="input-field mt-1 w-full"
                      value={row.role}
                      onChange={(event) => {
                        const role = event.target.value;
                        const picked = mappings.find(
                          (item) => item.role === role,
                        );
                        updateRow(row.key, {
                          role,
                          unit: picked?.unit_label ?? row.unit,
                          description: picked?.display_name ?? row.description,
                        });
                      }}
                    >
                      <option value="">Custom line, no reference</option>
                      {mappings.map((item) => (
                        <option key={item.role} value={item.role}>
                          {item.display_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!row.role && (
                    <label className="block text-xs font-medium text-muted-foreground">
                      Description
                      <input
                        type="text"
                        className="input-field mt-1 w-full"
                        placeholder="What the supplier quoted"
                        value={row.description}
                        onChange={(event) =>
                          updateRow(row.key, {
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Quantity
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className="input-field mt-1 w-full"
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(row.key, { quantity: event.target.value })
                        }
                      />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Unit
                      <input
                        type="text"
                        className="input-field mt-1 w-full"
                        placeholder={mapping?.unit_label ?? "bag, m2, piece"}
                        value={row.unit}
                        onChange={(event) =>
                          updateRow(row.key, { unit: event.target.value })
                        }
                      />
                    </label>
                  </div>

                  <label className="block text-xs font-medium text-muted-foreground">
                    Quoted rate per unit
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      className="input-field mt-1 w-full"
                      value={row.quotedRate}
                      onChange={(event) =>
                        updateRow(row.key, { quotedRate: event.target.value })
                      }
                    />
                  </label>
                </div>

                {line && line.status !== "invalid" && (
                  <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    <p>{line.note}</p>
                    {line.referenceRate !== null && (
                      <p className="text-foreground">
                        Market rate {money(line.referenceRate)} per {line.unit}.
                        Line total {money(line.quotedAmount)} against{" "}
                        {money(line.referenceAmount ?? 0)} at market.
                      </p>
                    )}
                    {reference && evidence && (
                      <p>
                        {reference.material.name} in {reference.resolved_market}{" "}
                        price book. {evidenceSentence(reference.evidence)}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          <button
            type="button"
            onClick={() => setRows((current) => [...current, newRow()])}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> Add another line
          </button>

          {!isLoading && !loadError && mappings.length === 0 && (
            <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              This market has no price book items yet, so quotes can be recorded
              but not judged. Add material prices for {market.countryName} in
              the price book, or switch market, and the comparison becomes
              available.
            </p>
          )}
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Verdict</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {result.verdict}
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Quoted total</dt>
                <dd className="font-semibold text-foreground">
                  {money(result.quotedTotal)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Comparable at market</dt>
                <dd className="font-semibold text-foreground">
                  {money(result.comparableReferenceTotal)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Difference</dt>
                <dd
                  className={`font-semibold ${
                    result.comparableDelta > 0
                      ? "text-red-600 dark:text-red-400"
                      : result.comparableDelta < 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                  }`}
                >
                  {money(result.comparableDelta)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Above market</dt>
                <dd className="font-semibold text-foreground">
                  {money(result.overpricedAmount)}
                </dd>
              </div>
            </dl>
          </div>

          <HowCalculatedSection
            methodologyText="Each line is quantity multiplied by the quoted rate. The reference amount is the same quantity at the price book rate for this market, compared only when the units match exactly. A line within 10% either side of the market rate is fair, above the band is marked above market, below the band is marked below market. Lines with no price book rate, or quoted in a different unit, are reported but never included in the comparison totals or the amount above market."
            assumptions={[
              {
                label: "Fair band",
                value: "10% either side of the market rate",
              },
              {
                label: "Reference source",
                value: `${market.countryName} price book, with the evidence class shown on each line`,
              },
              {
                label: "Currency",
                value:
                  "Amounts stay in the quote currency and are not converted",
              },
            ]}
          />
        </aside>
      </div>
      <AdSlot slotKey="tools_mid" className="mt-8" />
    </Container>
  );
}
