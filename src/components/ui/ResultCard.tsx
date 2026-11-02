import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Save,
  FileDown,
  Share2,
  MessageCircle,
  RotateCcw,
  Gem,
  Copy,
  Check,
} from "lucide-react";
import { classNames } from "@/lib/utils";
import ConvertedTotal from "@/components/ui/ConvertedTotal";
import {
  activeCurrencyCode,
  preferredDisplayCurrency,
} from "@/lib/currency/active-currency";
import {
  convert,
  describeConversion,
  formatMoney,
} from "@/lib/currency/engine";
import { useRateTable } from "@/lib/currency/use-currency";
import { Button } from "@/components/ui/shadcn/button";
import {
  buildCopyText,
  copyConfirmationText,
  copyText,
  type CopyOutcome,
} from "@/lib/results/copy-results";

export interface ResultStat {
  label: string;
  value: string;
  icon?: ReactNode;
  highlight?: boolean;
}

export default function ResultCard({
  title,
  subtitle,
  stats,
  grandTotal,
  currencySymbol,
  onSave,
  onExport,
  onShare,
  onAskAi,
  onRecalculate,
  children,
}: {
  title: string;
  subtitle?: string;
  stats: ResultStat[];
  grandTotal: number;
  currencySymbol: string;
  onSave?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onAskAi?: () => void;
  onRecalculate?: () => void;
  children?: ReactNode;
}) {
  const [copyState, setCopyState] = useState<CopyOutcome | null>(null);
  const { table } = useRateTable();

  // What was pasted alongside the total earlier must stay usable later, so the
  // copy carries the converted figure only when a trusted rate is at hand.
  const conversion = useMemo(() => {
    if (!table) return null;
    const from = activeCurrencyCode();
    const to = preferredDisplayCurrency(from);
    if (from === to) return null;
    const result = convert(grandTotal, from, to, table);
    if (result.result === null) return null;
    return {
      amount: formatMoney(result.result, to),
      currency: to,
      rateLine: describeConversion(result),
      note:
        result.status === "fallback"
          ? "Converted at a saved rate for comparison. This is not the local price of materials."
          : "Converted for comparison. This is not the local price of materials.",
    };
  }, [table, grandTotal]);

  // The same rows the reader sees, in the same order, with the total last.
  const copyBlock = useMemo(
    () => ({
      title,
      subtitle,
      lines: stats.map((stat) => ({ label: stat.label, value: stat.value })),
      total: `Grand total: ${currencySymbol}${grandTotal.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 0,
        },
      )}`,
      conversion: conversion ?? undefined,
      sourceUrl:
        typeof window === "undefined" ? undefined : window.location.href,
    }),
    [title, subtitle, stats, grandTotal, currencySymbol, conversion],
  );

  const handleCopy = async () => {
    const outcome = await copyText(buildCopyText(copyBlock));
    setCopyState(outcome);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setCopyState(null), 2400);
    }
  };

  return (
    <div className="calc-card card overflow-hidden animate-fade-in-up dark:border-white/5">
      {/* Premium gradient header with shimmer */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background to-primary px-6 py-5 text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="calc-orb absolute -right-10 -top-1/2 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 bg-grid-dark opacity-20"
            aria-hidden="true"
          />
        </div>
        <div className="relative flex items-center gap-2">
          <Gem className="h-4 w-4 text-brand-purple-light" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {subtitle && (
          <p className="relative mt-1 text-sm text-primary-foreground/70">
            {subtitle}
          </p>
        )}
      </div>

      <div className="p-6 dark:bg-card">
        {/* Stats grid with stagger entrance */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={classNames(
                "animate-stagger-in rounded-xl border p-4 transition-all duration-300",
                stat.highlight ? "stat-card-highlight" : "stat-card",
              )}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                {stat.icon}
                {stat.label}
              </div>
              <p
                className={classNames(
                  "mt-1.5 text-lg font-bold tabular-nums",
                  stat.highlight
                    ? "text-brand-purple dark:text-brand-purple-lighter"
                    : "text-foreground dark:text-primary-foreground",
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Grand total with premium glow */}
        <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-accent-orange/10 p-6 text-center dark:from-primary/15 dark:to-accent-orange/5">
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="calc-orb absolute -top-1/2 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          </div>
          <p className="relative text-sm font-medium text-muted-foreground dark:text-muted-foreground">
            Grand Total
          </p>
          <p className="relative mt-1 text-3xl font-extrabold text-foreground sm:text-4xl dark:text-primary-foreground grand-total-glow">
            {currencySymbol}
            <span className="tabular-nums">
              {grandTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </p>
          <ConvertedTotal amount={grandTotal} />
        </div>

        {children}

        {/* Action buttons with glow on primary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            variant="secondary"
            type="button"
            onClick={handleCopy}
            className="press-scale"
            aria-label="Copy these results"
          >
            {copyState === "copied" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copyState === "copied" ? "Copied" : "Copy results"}
          </Button>
          {onSave && (
            <Button
              variant="default"
              type="button"
              onClick={onSave}
              className="press-scale btn-glow"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          )}
          {onExport && (
            <Button
              variant="secondary"
              type="button"
              onClick={onExport}
              className="press-scale"
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
          )}
          {onShare && (
            <Button
              variant="secondary"
              type="button"
              onClick={onShare}
              className="press-scale"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}
          {onAskAi && (
            <Button
              variant="secondary"
              type="button"
              onClick={onAskAi}
              className="press-scale"
            >
              <MessageCircle className="h-4 w-4" />
              Ask AI
            </Button>
          )}
          {onRecalculate && (
            <Button
              variant="secondary"
              type="button"
              onClick={onRecalculate}
              className="press-scale"
            >
              <RotateCcw className="h-4 w-4" />
              Recalculate
            </Button>
          )}
        </div>
        <p
          aria-live="polite"
          className="mt-2 min-h-[1rem] text-xs text-muted-foreground"
        >
          {copyState ? copyConfirmationText(copyState) : ""}
        </p>
      </div>
    </div>
  );
}
