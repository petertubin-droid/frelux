/**
 * Chart geometry, kept pure so the drawing can be tested without a DOM.
 *
 * Everything here assumes a positive y-up data set (prices, index values) and
 * a fixed viewport supplied by the component. No dates are parsed: the caller
 * passes already-ordered points, which keeps timezone handling in one place.
 */

export interface Point {
  /** ISO date or timestamp the point belongs to. */
  ts: string;
  value: number;
}

export interface Candle {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
}

export interface Scale {
  min: number;
  max: number;
  /** Map a value into [0, 1], 0 at the bottom. */
  normalise: (value: number) => number;
}

export function buildScale(values: number[], padRatio = 0.06): Scale {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) {
    return { min: 0, max: 1, normalise: () => 0.5 };
  }
  const rawMin = Math.min(...clean);
  const rawMax = Math.max(...clean);
  const span = rawMax - rawMin;
  // A flat series still needs a visible band, otherwise the line sits on the
  // axis and reads as missing data.
  const pad = span === 0 ? Math.max(Math.abs(rawMax) * 0.02, 0.5) : span * padRatio;
  const min = rawMin - pad;
  const max = rawMax + pad;
  return {
    min,
    max,
    normalise: (value: number) => (max === min ? 0.5 : (value - min) / (max - min)),
  };
}

export interface ChartGeometry {
  width: number;
  height: number;
  points: { x: number; y: number; ts: string; value: number }[];
  linePath: string;
  areaPath: string;
}

export function buildLineGeometry(
  series: Point[],
  width: number,
  height: number,
  scale: Scale = buildScale(series.map((p) => p.value)),
  padding = { top: 8, right: 8, bottom: 8, left: 8 },
): ChartGeometry {
  const innerW = Math.max(width - padding.left - padding.right, 1);
  const innerH = Math.max(height - padding.top - padding.bottom, 1);
  const points = series.map((p, i) => {
    const x = padding.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = padding.top + (1 - scale.normalise(p.value)) * innerH;
    return { x: round(x), y: round(y), ts: p.ts, value: p.value };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
    .join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x} ${padding.top + innerH} L${points[0].x} ${padding.top + innerH} Z`
    : "";
  return { width, height, points, linePath, areaPath };
}

export interface CandleGeometry {
  x: number;
  wickTop: number;
  wickBottom: number;
  bodyTop: number;
  bodyBottom: number;
  bodyX: number;
  bodyW: number;
  rising: boolean;
  ts: string;
}

export function buildCandleGeometry(
  candles: Candle[],
  width: number,
  height: number,
  padding = { top: 8, right: 8, bottom: 8, left: 8 },
): CandleGeometry[] {
  if (candles.length === 0) return [];
  const scale = buildScale(candles.flatMap((c) => [c.high, c.low]));
  const innerW = Math.max(width - padding.left - padding.right, 1);
  const innerH = Math.max(height - padding.top - padding.bottom, 1);
  const slot = innerW / candles.length;
  const bodyW = Math.max(Math.min(slot * 0.62, 14), 1);
  const y = (value: number) => padding.top + (1 - scale.normalise(value)) * innerH;

  return candles.map((c, i) => {
    const cx = padding.left + slot * i + slot / 2;
    const openY = y(c.open);
    const closeY = y(c.close);
    return {
      x: round(cx),
      wickTop: round(Math.min(y(c.high), y(c.low))),
      wickBottom: round(Math.max(y(c.high), y(c.low))),
      bodyTop: round(Math.min(openY, closeY)),
      bodyBottom: round(Math.max(openY, closeY)),
      bodyX: round(cx - bodyW / 2),
      bodyW: round(bodyW),
      rising: c.close >= c.open,
      ts: c.ts,
    };
  });
}

export function percentChange(from: number | null | undefined, to: number | null | undefined): number | null {
  if (from == null || to == null || from === 0) return null;
  return ((to - from) / from) * 100;
}

export function formatPercent(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

/** CSV for the "export" affordance on every chart. */
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const escape = (cell: string | number | null) => {
    const text = cell == null ? "" : String(cell);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export const RANGE_LABELS = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"] as const;
export type ChartRange = (typeof RANGE_LABELS)[number];
