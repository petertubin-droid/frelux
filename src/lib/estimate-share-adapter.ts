/**
 * Bridges a calculator's existing quote payload (the same data its PDF export
 * uses) into the universal share format. Nothing is recomputed here: every
 * value is the display string the page already shows.
 */
import type { ShareableEstimate } from "./estimate-sharing";

export interface QuoteLineLike {
  label: string;
  quantity?: string | null;
  unit?: string | null;
  line_total?: string | null;
  detail?: string | null;
}

export interface QuoteTotalsLike {
  label: string;
  value: string;
  strong?: boolean;
}

export interface QuotePayloadLike {
  title?: string;
  metaRows?: Array<[string, string]>;
  lines?: QuoteLineLike[];
  totals?: QuoteTotalsLike[];
  warnings?: string[];
}

export function shareableFromQuote(
  quote: QuotePayloadLike | null,
  opts: { kind: string; link: string },
): ShareableEstimate | null {
  if (!quote) return null;
  const totals = (quote.totals ?? []).map((t) => ({
    label: t.label,
    value: t.value,
    emphasized: Boolean(t.strong),
  }));
  const summaryLines = (quote.metaRows ?? [])
    .filter(([, value]) => Boolean(value))
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));
  const lineItems = (quote.lines ?? []).slice(0, 40).map((l) => ({
    description: l.label,
    quantity: [l.quantity, l.unit].filter(Boolean).join(" ") || null,
    amount: l.line_total ?? null,
  }));
  if (!summaryLines.length && !lineItems.length && !totals.length) return null;
  return {
    kind: opts.kind,
    summaryLines,
    lineItems,
    totals,
    notes: (quote.warnings ?? []).slice(0, 3),
    link: opts.link,
    generatedAt: new Date().toISOString(),
  };
}
