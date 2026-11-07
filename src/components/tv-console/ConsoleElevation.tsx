import { classNames } from "@/lib/utils";
import {
  buildConsoleElevation,
  type ConsoleLayoutInput,
} from "@/lib/tv-console/elevation";

interface ConsoleElevationProps {
  layout: ConsoleLayoutInput;
  /** Depth is not visible in elevation, so it is captioned rather than drawn. */
  depthMm: number;
  /** Overall dimension lines. Off by default: small cards carry the numbers. */
  annotate?: boolean;
  /** What the drawing shows, for screen readers. */
  label: string;
  className?: string;
}

const FILL: Record<string, string> = {
  carcass: "hsl(var(--primary) / 0.14)",
  divider: "hsl(var(--primary) / 0.2)",
  shelf: "hsl(var(--primary) / 0.2)",
  drawer: "hsl(var(--primary) / 0.1)",
  door: "hsl(var(--primary) / 0.06)",
};

/**
 * To-scale front elevation drawn from the same numbers as the takeoff.
 *
 * The artwork is the calculation: bays, shelves, drawer fronts and door leaves
 * are placed by buildConsoleElevation, so two presets cannot show the same
 * picture while describing different furniture. There is no photograph here
 * and nothing is fetched from a third party.
 */
export default function ConsoleElevation({
  layout,
  depthMm,
  annotate = false,
  label,
  className,
}: ConsoleElevationProps) {
  const plan = buildConsoleElevation(layout);
  const extent = Math.max(plan.widthMm, plan.heightMm);
  const pad = extent * 0.04;
  // Room for the dimension lines only when they are drawn.
  const gutter = annotate ? extent * 0.11 : pad;
  const stroke = Math.max(extent * 0.0035, 1);
  const fontSize = extent * 0.045;
  const viewBox = [
    -gutter,
    -pad,
    plan.widthMm + gutter + pad,
    plan.heightMm + gutter + pad,
  ].join(" ");

  const widthLabel = `${Math.round(plan.widthMm)} mm`;
  const heightLabel = `${Math.round(plan.heightMm)} mm`;
  const depthLabel = `${Math.round(depthMm)} mm deep`;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={classNames("h-full w-full", className)}
      style={{ display: "block" }}
    >
      <g
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={stroke}
        strokeLinejoin="miter"
      >
        <rect
          x={0}
          y={0}
          width={plan.widthMm}
          height={plan.heightMm}
          fill="hsl(var(--primary) / 0.03)"
        />
        {plan.parts.map((part, index) => (
          <rect
            key={`${part.kind}-${index}`}
            x={part.xMm}
            y={part.yMm}
            width={part.widthMm}
            height={part.heightMm}
            fill={FILL[part.kind]}
          />
        ))}
      </g>

      {/* Drawer pulls, placed on the centre line of each front. */}
      {plan.parts
        .filter((part) => part.kind === "drawer")
        .map((part, index) => {
          const pullWidth = Math.min(part.widthMm * 0.34, 360);
          const pullHeight = Math.max(plan.thicknessMm * 0.35, 4);
          return (
            <rect
              key={`pull-${index}`}
              x={part.xMm + (part.widthMm - pullWidth) / 2}
              y={part.yMm + part.heightMm / 2 - pullHeight / 2}
              width={pullWidth}
              height={pullHeight}
              rx={pullHeight / 2}
              fill="hsl(var(--primary) / 0.45)"
            />
          );
        })}

      {annotate && (
        <g
          fill="hsl(var(--muted-foreground))"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={stroke * 0.7}
          fontFamily="inherit"
          fontSize={fontSize}
        >
          {/* Overall width, below the unit. */}
          <line
            x1={0}
            y1={plan.heightMm + pad * 1.6}
            x2={plan.widthMm}
            y2={plan.heightMm + pad * 1.6}
            strokeDasharray={`${stroke * 3} ${stroke * 2}`}
          />
          <text
            x={plan.widthMm / 2}
            y={plan.heightMm + pad * 1.6 + fontSize * 1.1}
            textAnchor="middle"
            stroke="none"
          >
            {widthLabel}
          </text>
          {/* Overall height, to the left of the unit. */}
          <line
            x1={-pad}
            y1={0}
            x2={-pad}
            y2={plan.heightMm}
            strokeDasharray={`${stroke * 3} ${stroke * 2}`}
          />
          <text
            x={-pad * 1.35}
            y={plan.heightMm / 2}
            textAnchor="middle"
            stroke="none"
            transform={`rotate(-90 ${-pad * 1.35} ${plan.heightMm / 2})`}
          >
            {heightLabel}
          </text>
          <text
            x={plan.widthMm}
            y={plan.heightMm + pad * 1.6 + fontSize * 1.1}
            textAnchor="end"
            stroke="none"
          >
            {depthLabel}
          </text>
        </g>
      )}
    </svg>
  );
}
