/**
 * Shared layout for the specialty takeoff calculators.
 *
 * One shell renders the working, the shopping list, the money and the honesty
 * notices, so four tools cannot drift into four different ideas of what a total
 * means. A line without a configured price shows an entry box for the buyer's
 * own supplier price rather than a zero or a guess.
 */

import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Calculator, Info, Printer } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import MarketScopeNotice from "@/components/MarketScopeNotice";
import PriceFreshnessNotice from "@/components/prices/PriceFreshnessNotice";
import { useMarket } from "@/lib/international/market-context";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import { printQuote } from "@/lib/estimation/quote-export";
import type { PriceBookSummary } from "@/lib/prices/freshness";
import type { SpecialtyResult } from "@/lib/estimation/specialty";

export interface SpecialtyCrossLink {
  label: string;
  to: string;
  description: string;
}

export interface SpecialtyCalculatorShellProps {
  calculatorType: string;
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
  breadcrumbName: string;
  /** Canonical route, used for the breadcrumb trail and structured data. */
  routePath: string;
  /** What this tool deliberately does not cover, shown at the foot of the page. */
  limitations: string[];
  inputs: ReactNode;
  notes?: ReactNode;
  result: SpecialtyResult | null;
  onRun: () => void;
  running?: boolean;
  priceOverrides: Record<string, string>;
  onPriceOverride: (slug: string, value: string) => void;
  bookSummary?: PriceBookSummary | null;
  crossLinks: SpecialtyCrossLink[];
  proCallout?: { title: string; body: string; cta: string; to: string };
  quoteTitle: string;
  quoteFooter: string;
}

function fmt(v: number | null, symbol: string): string {
  if (v === null) return "Not priced";
  return formatCurrency(v, symbol);
}

export function SpecialtyCalculatorShell({
  calculatorType,
  title,
  subtitle,
  seoTitle,
  seoDescription,
  breadcrumbName,
  routePath,
  limitations,
  inputs,
  notes,
  result,
  onRun,
  running = false,
  priceOverrides,
  onPriceOverride,
  bookSummary,
  crossLinks,
  proCallout,
  quoteTitle,
  quoteFooter,
}: SpecialtyCalculatorShellProps) {
  const { market, marketCode } = useMarket();
  const { symbol: displaySymbol } = useDisplayCurrency();
  const symbol = market?.currencySymbol || displaySymbol || "₦";
  const currencyCode = market?.currencyCode || "NGN";
  const totalsId = useId();

  useSeo({ title: seoTitle, description: seoDescription });
  useBreadcrumbJsonLd([
    { name: "Construction Tools", path: "/construction-tools" },
    { name: breadcrumbName, path: routePath },
  ]);

  const exportQuote = () => {
    if (!result?.ok) return;
    printQuote(
      {
        title: quoteTitle,
        subtitle: `Generated ${new Date().toLocaleDateString()} · ${result.lines.length} line item(s)`,
        metaRows: result.steps.map(
          (s) => [s.label, s.detail] as [string, string],
        ),
        lines: result.lines.map((l) => ({
          label: l.label,
          quantity:
            l.quantity === null ? "(missing)" : l.quantity.toLocaleString(),
          unit: l.unit,
          unit_price:
            l.unit_price === null
              ? "unpriced"
              : formatCurrency(l.unit_price, symbol),
          line_total:
            l.line_total === null
              ? "Not priced"
              : formatCurrency(l.line_total, symbol),
          detail: l.detail,
        })),
        totals: [
          {
            label: "Material subtotal",
            value:
              result.material_subtotal === null
                ? "(some items unpriced)"
                : formatCurrency(result.material_subtotal, symbol),
          },
          {
            label: "Priced so far",
            value: formatCurrency(result.priced_subtotal, symbol),
          },
          { label: `Tax (${currencyCode})`, value: "Not determined" },
        ],
        warnings: result.warnings,
        footer: quoteFooter,
      },
      `frelux-${calculatorType.replace(/_/g, "-")}-estimate.html`,
    );
  };

  return (
    <>
      <PageHeader
        variant="tool"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: breadcrumbName, path: routePath },
        ]}
        title={title}
        subtitle={subtitle}
      />

      <Container className="pb-16 pt-6">
        <div className="mb-6">
          <MarketScopeNotice />
        </div>

        {marketCode !== "NG" && (
          <div
            className="mb-6 rounded-lg border bg-muted/40 p-4 text-sm"
            data-testid="market-price-provenance"
          >
            <p className="font-semibold">
              Prices from the {marketCode} price book ({symbol})
            </p>
            <p className="mt-1 text-muted-foreground">
              Only prices recorded for this market are used. A material priced
              from another market's reference book is shown as unpriced so you
              can enter your own supplier figure, rather than presenting a
              converted number as a local price.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.15fr)]">
          {/* Inputs */}
          <section
            aria-labelledby={`${calculatorType}-inputs`}
            className="rounded-xl border bg-card p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id={`${calculatorType}-inputs`} className="font-semibold">
                Your measurements
              </h2>
            </div>
            <div className="space-y-4">{inputs}</div>

            <button
              type="button"
              onClick={onRun}
              disabled={running}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
            >
              Calculate materials
            </button>

            {notes ? (
              <div className="mt-5 text-xs text-muted-foreground">{notes}</div>
            ) : null}
          </section>

          {/* Results */}
          <section aria-label="Results" className="space-y-4">
            {result && !result.ok && result.errors.length > 0 ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/5 p-4"
              >
                <p className="text-sm font-medium">Cannot calculate yet</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!result ? (
              <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
                Enter your measurements and calculate to see the shopping list.
                Every quantity below will show the rule that produced it.
              </div>
            ) : null}

            {result?.ok ? (
              <div className="space-y-4">
                <div className="rounded-xl border bg-card p-5">
                  <h2 className="font-semibold">Shopping list</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quantities are rounded up to what you actually buy. Money
                    appears only where a price is known or you enter one.
                  </p>

                  <div className="-mx-5 mt-4 overflow-x-auto px-5">
                    <table className="w-full min-w-[34rem] text-sm">
                      <caption className="sr-only">
                        Material quantities and prices
                      </caption>
                      <thead>
                        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th scope="col" className="pb-2 pr-3 font-medium">
                            Material
                          </th>
                          <th
                            scope="col"
                            className="pb-2 pr-3 text-right font-medium"
                          >
                            Quantity
                          </th>
                          <th
                            scope="col"
                            className="pb-2 pr-3 text-right font-medium"
                          >
                            Unit price
                          </th>
                          <th
                            scope="col"
                            className="pb-2 text-right font-medium"
                          >
                            Line total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.lines.map((line) => {
                          const overrideId = `${calculatorType}-price-${line.key}`;
                          return (
                            <tr
                              key={line.key}
                              className="border-b last:border-0"
                            >
                              <td className="py-3 pr-3">
                                <span className="font-medium">
                                  {line.label}
                                </span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {line.detail}
                                </span>
                              </td>
                              <td className="py-3 pr-3 text-right tabular-nums">
                                {line.quantity === null
                                  ? "missing"
                                  : line.quantity.toLocaleString()}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {line.unit}
                                </span>
                              </td>
                              <td className="py-3 pr-3 text-right">
                                {line.unit_price !== null ? (
                                  <span className="tabular-nums">
                                    {fmt(line.unit_price, symbol)}
                                  </span>
                                ) : (
                                  <span className="inline-flex flex-col items-end gap-1">
                                    <label
                                      htmlFor={overrideId}
                                      className="text-xs text-muted-foreground"
                                    >
                                      Your price per {line.unit}
                                    </label>
                                    <input
                                      id={overrideId}
                                      type="number"
                                      inputMode="decimal"
                                      min={0}
                                      step="any"
                                      value={
                                        priceOverrides[line.material_slug] ?? ""
                                      }
                                      onChange={(e) =>
                                        onPriceOverride(
                                          line.material_slug,
                                          e.target.value,
                                        )
                                      }
                                      className="w-28 rounded-lg border bg-background px-2 py-1.5 text-right text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                      placeholder="Not set"
                                    />
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-right tabular-nums">
                                {line.line_total === null ? (
                                  <span className="text-xs text-muted-foreground">
                                    Not priced
                                  </span>
                                ) : (
                                  fmt(line.line_total, symbol)
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div
                    id={totalsId}
                    className="mt-4 space-y-1 border-t pt-4 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Priced so far
                      </span>
                      <span className="tabular-nums">
                        {fmt(result.priced_subtotal, symbol)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Material subtotal
                      </span>
                      <span className="tabular-nums">
                        {result.material_subtotal === null
                          ? "Some items unpriced"
                          : fmt(result.material_subtotal, symbol)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tax ({currencyCode})
                      </span>
                      <span className="text-muted-foreground">
                        Not determined
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Estimated material cost</span>
                      <span className="tabular-nums">
                        {result.grand_total === null
                          ? "Not priced"
                          : fmt(result.grand_total, symbol)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={exportQuote}
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Printer className="h-4 w-4" aria-hidden="true" /> Print
                      or save as PDF
                    </button>
                    <PriceFreshnessNotice
                      bookSummary={bookSummary ?? undefined}
                    />
                  </div>
                </div>

                {/* Working */}
                <div className="rounded-xl border bg-card p-5">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Info
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />{" "}
                    How this was worked out
                  </h2>
                  <dl className="mt-3 space-y-2 text-sm">
                    {result.steps.map((s) => (
                      <div key={s.label} className="sm:flex sm:gap-3">
                        <dt className="font-medium text-muted-foreground sm:w-52 sm:shrink-0">
                          {s.label}
                        </dt>
                        <dd className="tabular-nums">{s.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {result.warnings.length > 0 ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />{" "}
                      Read before ordering
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {result.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <AdSlot slotKey="calculator_mid" className="mt-8" />

        {proCallout ? (
          <div className="mt-8 rounded-xl border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="font-semibold">{proCallout.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {proCallout.body}
              </p>
            </div>
            <Link
              to={proCallout.to}
              className="mt-3 inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:mt-0"
            >
              {proCallout.cta}
            </Link>
          </div>
        ) : null}

        {crossLinks.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {crossLinks.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <p className="font-medium">{c.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.description}
                </p>
              </Link>
            ))}
          </div>
        ) : null}

        <section
          aria-labelledby={`${calculatorType}-limits`}
          className="mt-8 rounded-xl border bg-card p-5"
        >
          <h2 id={`${calculatorType}-limits`} className="font-semibold">
            What this tool does, and does not, do
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>
              Prices come from the shared material database and are never
              invented. A material without a configured price shows its quantity
              and asks you for the price you were quoted.
            </li>
            <li>
              Tax is never assumed. The estimate reports tax as not determined
              rather than applying a rate that may not belong to your
              jurisdiction.
            </li>
          </ul>
        </section>

        <AdSlot slotKey="calculator_native" className="mt-8" />
      </Container>
    </>
  );
}

export default SpecialtyCalculatorShell;
