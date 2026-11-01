import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { RANGE_LABELS, type ChartRange } from "@/lib/market-intelligence/chart";

export function RangeTabs({
  value,
  onChange,
  disabled = [],
}: {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  disabled?: ChartRange[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Chart timeframe">
      {RANGE_LABELS.map((range) => {
        const isDisabled = disabled.includes(range);
        return (
          <button
            key={range}
            type="button"
            role="tab"
            aria-selected={value === range}
            disabled={isDisabled}
            onClick={() => onChange(range)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              value === range
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            } ${isDisabled ? "cursor-not-allowed opacity-40" : ""}`}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "up" | "down";
}) {
  const toneClass =
    tone === "up" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "down" ? "text-red-600 dark:text-red-400"
    : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ProviderNotice({
  title,
  message,
  tone = "info",
}: {
  title: string;
  message: string;
  tone?: "info" | "warning";
}) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      role="status"
      className={`flex gap-3 rounded-xl border p-4 text-sm ${
        tone === "warning"
          ? "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

export function Attribution({
  source,
  asOf,
  licence,
  url,
  note,
}: {
  source: string;
  asOf?: string | null;
  licence?: string | null;
  url?: string | null;
  note?: string;
}) {
  return (
    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
      Source:{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          {source}
        </a>
      ) : (
        source
      )}
      {asOf ? ` · as of ${new Date(asOf).toLocaleString()}` : ""}
      {licence ? ` · ${licence}` : ""}
      {note ? ` · ${note}` : ""}
    </p>
  );
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
