import { useMemo, useState } from "react";
import {
  buildLineGeometry,
  buildScale,
  formatCompactNumber,
  toCsv,
  type Point,
} from "@/lib/market-intelligence/chart";

interface PriceChartProps {
  series: Point[];
  /** Drawn in the accent colour: rises use the positive tone, falls the negative. */
  height?: number;
  label: string;
  valuePrefix?: string;
  /** "index" renders levels without a currency symbol. */
  formatValue?: (value: number) => string;
  onExport?: () => void;
}

/**
 * Line/area chart with a hover readout and an export affordance. SVG only: no
 * charting dependency to keep the route light, and the geometry lives in
 * lib/market-intelligence/chart so it can be tested without a DOM.
 */
export default function PriceChart({
  series,
  height = 240,
  label,
  valuePrefix = "",
  formatValue,
}: PriceChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;

  const scale = useMemo(() => buildScale(series.map((p) => p.value)), [series]);
  const geometry = useMemo(
    () => buildLineGeometry(series, width, height, scale),
    [series, height, scale],
  );

  const rising =
    series.length > 1 && series[series.length - 1].value >= series[0].value;
  const stroke = rising ? "#0f9d58" : "#d93025";
  const fmt =
    formatValue ??
    ((v: number) =>
      `${valuePrefix}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

  if (series.length === 0) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
        role="img"
        aria-label={`${label}: no data available`}
      >
        No data available for this range.
      </div>
    );
  }

  const active = hover != null ? geometry.points[hover] : null;

  function downloadCsv() {
    const csv = toCsv(
      ["date", "value"],
      series.map((p) => [p.ts, p.value]),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <figure className="w-full">
      <div className="mb-2 flex items-start justify-between gap-3">
        <figcaption className="text-xs font-medium text-muted-foreground">
          {label}
        </figcaption>
        <div className="flex items-center gap-2">
          {active ? (
            <span className="text-xs tabular-nums text-foreground">
              {new Date(active.ts).toLocaleDateString()} · {fmt(active.value)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {series.length} points · latest{" "}
              {fmt(series[series.length - 1].value)}
            </span>
          )}
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-purple hover:text-brand-purple"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[220px] w-full sm:h-[260px]"
          role="img"
          aria-label={`${label}. ${series.length} data points, latest ${fmt(series[series.length - 1].value)}.`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient
              id={`fill-${label.replace(/[^a-z0-9]/gi, "")}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path
            d={geometry.areaPath}
            fill={`url(#fill-${label.replace(/[^a-z0-9]/gi, "")})`}
          />
          <path
            d={geometry.linePath}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {active && (
            <>
              <line
                x1={active.x}
                y1={0}
                x2={active.x}
                y2={height}
                stroke={stroke}
                strokeOpacity={0.35}
                strokeDasharray="4 3"
              />
              <circle cx={active.x} cy={active.y} r={4} fill={stroke} />
            </>
          )}
          {geometry.points.map((p, i) => (
            <rect
              key={p.ts + i}
              x={p.x - width / Math.max(series.length, 1) / 2}
              y={0}
              width={width / Math.max(series.length, 1)}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>

      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{new Date(series[0].ts).toLocaleDateString()}</span>
        <span>
          low {fmt(scale.min)} · high {fmt(scale.max)}
        </span>
        <span>
          {new Date(series[series.length - 1].ts).toLocaleDateString()}
        </span>
      </div>

      {/* Screen-reader and no-JS fallback: the same numbers, not a picture. */}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {series.map((p) => (
            <tr key={p.ts}>
              <th scope="row">{p.ts}</th>
              <td>{formatCompactNumber(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
