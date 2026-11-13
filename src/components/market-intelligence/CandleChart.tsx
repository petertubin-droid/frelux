import { useMemo, useState } from "react";
import { buildCandleGeometry, type Candle } from "@/lib/market-intelligence/chart";

interface CandleChartProps {
  candles: Candle[];
  label: string;
  currency?: string | null;
  height?: number;
}

/**
 * Daily candlesticks drawn as SVG rects and wicks. Two colours only, because
 * direction is the one thing a candle encodes: rising is green, falling is red.
 */
export default function CandleChart({ candles, label, currency, height = 260 }: CandleChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;
  const geometry = useMemo(() => buildCandleGeometry(candles, width, height), [candles, height]);

  if (candles.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No price history available for this range.
      </div>
    );
  }

  const active = hover != null ? candles[hover] : null;
  const prefix = currency ? `${currency} ` : "";

  return (
    <figure className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <figcaption className="text-xs font-medium text-muted-foreground">
          {label} · {candles.length} sessions
        </figcaption>
        {active ? (
          <span className="text-xs tabular-nums text-foreground">
            {new Date(active.ts).toLocaleDateString()} · O {prefix}{active.open.toFixed(2)} H{" "}
            {prefix}{active.high.toFixed(2)} L {prefix}{active.low.toFixed(2)} C {prefix}
            {active.close.toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Hover a candle for the session range</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[240px] w-full sm:h-[300px]"
        role="img"
        aria-label={`${label} daily candlestick chart, ${candles.length} sessions, last close ${prefix}${candles[candles.length - 1].close.toFixed(2)}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        {geometry.map((c, i) => (
          <g key={c.ts}>
            <line
              x1={c.x}
              y1={c.wickTop}
              x2={c.x}
              y2={c.wickBottom}
              stroke={c.rising ? "#0f9d58" : "#d93025"}
              strokeWidth={1}
            />
            <rect
              x={c.bodyX}
              y={c.bodyTop}
              width={c.bodyW}
              height={Math.max(c.bodyBottom - c.bodyTop, 1)}
              fill={c.rising ? "#0f9d58" : "#d93025"}
            />
            <rect
              x={c.bodyX - c.bodyW / 2}
              y={0}
              width={c.bodyW * 2}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{new Date(candles[0].ts).toLocaleDateString()}</span>
        <span>{new Date(candles[candles.length - 1].ts).toLocaleDateString()}</span>
      </div>
    </figure>
  );
}
