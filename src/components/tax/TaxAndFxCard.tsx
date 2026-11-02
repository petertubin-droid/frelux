/**
 * FRELUX Engine #4 UI: Tax & currency reference card for a market.
 *
 * Three honest sections:
 *  1. The market's VERIFIED consumption tax (catalog citation included).
 *  2. FX conversion of the quote total with full provenance — direct
 *     recorded rate or an explicitly disclosed bridge; refusals are
 *     shown as refusals, never as invented numbers.
 *  3. Withholding/settlement rules behind the legal-review gate: pending
 *     rules are badges "informational, pending legal review".
 *
 * This card NEVER changes what the BOQ engine charges (rates there stay
 * admin-configured). It informs, cites, and refuses honestly.
 */

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  resolveConsumptionTax,
  type TaxResolution,
} from "@/lib/tax/tax-calculator";
import { convertAmount, type FxConversion } from "@/lib/fx/fx-converter";
import {
  resolveWithholding,
  type WithholdingResolution,
} from "@/lib/tax/withholding";

export const FX_TARGET_CURRENCIES = [
  "NGN",
  "USD",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
  "INR",
  "GHS",
  "KES",
  "ZAR",
  "JPY",
  "BRL",
  "SAR",
  "AED",
  "CNY",
  "IDR",
  "MXN",
  "KRW",
] as const;

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export interface TaxAndFxCardProps {
  marketCode: string;
  quoteCurrency: string;
  /** Quote grand total in quoteCurrency; null when no quote yet. */
  grandTotal: number | null;
}

export default function TaxAndFxCard({
  marketCode,
  quoteCurrency,
  grandTotal,
}: TaxAndFxCardProps) {
  const { t } = useLanguage();
  const [tax, setTax] = useState<TaxResolution | null>(null);
  const [withholding, setWithholding] = useState<WithholdingResolution | null>(
    null,
  );
  const [target, setTarget] = useState<string>("USD");
  const [fx, setFx] = useState<FxConversion | null>(null);
  const [fxBusy, setFxBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setTax(null);
    resolveConsumptionTax(marketCode)
      .then((t) => alive && setTax(t))
      .catch(
        () =>
          alive &&
          setTax({
            status: "unknown",
            message: "The tax catalog could not be reached right now.",
          }),
      );
    resolveWithholding(marketCode)
      .then((w) => alive && setWithholding(w))
      .catch(() => alive && setWithholding(null));
    return () => {
      alive = false;
    };
  }, [marketCode]);

  const canConvert = grandTotal !== null && Number.isFinite(grandTotal);
  useEffect(() => {
    let alive = true;
    if (!canConvert || grandTotal === null) {
      setFx(null);
      return;
    }
    setFxBusy(true);
    convertAmount(grandTotal, quoteCurrency, target)
      .then((c) => {
        if (alive) {
          setFx(c);
          setFxBusy(false);
        }
      })
      .catch(() => {
        if (alive) {
          setFx(null);
          setFxBusy(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [canConvert, grandTotal, quoteCurrency, target]);

  const effectivePct = useMemo(
    () => (tax?.status === "ok" ? tax.effectivePct : null),
    [tax],
  );

  return (
    <details className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm dark:border-white/5">
      <summary className="cursor-pointer font-medium">
        Tax &amp; currency reference — {marketCode.toUpperCase()}
      </summary>

      {/* ── 1. Verified consumption tax ── */}
      <div className="mt-3 grid gap-1">
        <h4 className="font-medium">{t("Verified tax rate")}</h4>
        {!tax ? (
          <p className="text-muted-foreground">Loading the tax catalog…</p>
        ) : tax.status === "ok" ? (
          <>
            <p data-testid="tax-resolved">
              <span className="font-medium">{tax.taxName}</span>{" "}
              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                {effectivePct}%
              </span>
              {tax.additionalLeviesPct ? (
                <span className="text-muted-foreground">
                  {" "}
                  (base {tax.ratePct}% + verified levies{" "}
                  {tax.additionalLeviesPct}%)
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground">{tax.basis}</p>
            <a
              href={tax.citation?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Source: {tax.citation?.publisher}
            </a>
            {tax.notes ? (
              <p className="text-xs text-muted-foreground">{tax.notes}</p>
            ) : null}
          </>
        ) : (
          <p
            data-testid={`tax-${tax.status}`}
            className="text-muted-foreground"
          >
            {tax.message}
          </p>
        )}
      </div>

      {/* ── 2. FX conversion with provenance ── */}
      <div className="mt-4 grid gap-1">
        <h4 className="font-medium">{t("Currency conversion")}</h4>
        {!canConvert ? (
          <p className="text-muted-foreground">
            {t("Generate a quote to convert its grand total.")}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">
                {fmt(grandTotal, quoteCurrency)} =
              </span>
              <select
                aria-label={t("Target currency")}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="rounded border border-input bg-background px-2 py-1"
              >
                {FX_TARGET_CURRENCIES.filter((c) => c !== quoteCurrency).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ),
                )}
              </select>
              <span data-testid="fx-result" className="font-semibold">
                {fxBusy
                  ? "…"
                  : fx?.result !== null && fx?.result !== undefined
                    ? fmt(fx.result, target)
                    : "—"}
              </span>
            </div>
            {fx ? (
              <p
                data-testid="fx-provenance"
                className="text-xs text-muted-foreground"
              >
                {fx.status === "bridged" ? (
                  <span className="rounded bg-amber-500/10 px-1 py-0.5 font-medium text-amber-600">
                    bridged
                  </span>
                ) : null}{" "}
                {fx.message}
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* ── 3. Withholding / settlement rules (legal-review gate) ── */}
      <div className="mt-4 grid gap-1">
        <h4 className="font-medium">Settlement &amp; withholding rules</h4>
        {!withholding ? (
          <p className="text-muted-foreground">
            {t("Rules could not be loaded right now.")}
          </p>
        ) : withholding.status === "none" ? (
          <p className="text-muted-foreground">{withholding.message}</p>
        ) : (
          <>
            {withholding.actionableRules.map((r) => (
              <p key={r.id}>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600">
                  approved
                </span>{" "}
                <span className="font-medium">{r.rule_name}</span> —{" "}
                {r.rate_pct}% ·{" "}
                <a
                  href={r.citation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  {r.citation_publisher}
                </a>
              </p>
            ))}
            {withholding.pendingRules.map((r) => (
              <p key={r.id}>
                <span
                  data-testid="wh-pending"
                  className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600"
                >
                  pending legal review — informational
                </span>{" "}
                <span className="font-medium">{r.rule_name}</span> —{" "}
                {r.rate_pct}% ·{" "}
                <a
                  href={r.citation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  {r.citation_publisher}
                </a>
              </p>
            ))}
            <p className="text-xs text-muted-foreground">
              {withholding.message}
            </p>
          </>
        )}
      </div>
    </details>
  );
}
