import { classNames } from "@/lib/utils";
import {
  buildConsoleElevation,
  type ConsoleLayoutInput,
} from "@/lib/tv-console/elevation";
import {
  buildMediaContext,
  SCREEN_CLEARANCE_MM,
  type MediaContextInput,
} from "@/lib/tv-console/media-context";

/** Everything about the room except the unit's own size, which comes from the layout. */
export type ElevationContext = Omit<MediaContextInput, "widthMm" | "heightMm">;

interface ConsoleElevationProps {
  layout: ConsoleLayoutInput;
  /** Depth is not visible in elevation, so it is captioned rather than drawn. */
  depthMm: number;
  /** Overall dimension lines. Off by default: small cards carry the numbers. */
  annotate?: boolean;
  /** What the drawing shows, for screen readers. */
  label: string;
  /**
   * The room around the unit: screen, panelled wall, how it meets the floor.
   * Without it the drawing is the carcass alone, which is why presets that
   * describe very different media walls used to render identically.
   */
  context?: ElevationContext;
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
 * are placed by buildConsoleElevation, and the screen, panelling and mounting
 * by buildMediaContext, so two presets cannot show the same picture while
 * describing different furniture. There is no photograph here and nothing is
 * fetched from a third party.
 */
export default function ConsoleElevation({
  layout,
  depthMm,
  annotate = false,
  label,
  context,
  className,
}: ConsoleElevationProps) {
  const plan = buildConsoleElevation(layout);
  const room = buildMediaContext({
    widthMm: plan.widthMm,
    heightMm: plan.heightMm,
    ...context,
  });

  // The drawing has to hold the panelled band and the screen as well as the
  // unit, so the viewBox is the union of everything actually drawn.
  const topMm = Math.min(
    0,
    room.wall?.yMm ?? 0,
    room.screen?.yMm ?? 0,
    -SCREEN_CLEARANCE_MM,
  );
  const bottomMm =
    plan.heightMm +
    room.plinthHeightMm +
    room.legs.length * 0 +
    room.shadowGapMm;
  const leftMm = Math.min(0, room.wall?.xMm ?? 0, room.screen?.xMm ?? 0);
  const rightMm = Math.max(
    plan.widthMm,
    (room.wall?.xMm ?? 0) + (room.wall?.widthMm ?? 0),
    (room.screen?.xMm ?? 0) + (room.screen?.widthMm ?? 0),
  );

  const extent = Math.max(rightMm - leftMm, bottomMm - topMm);
  const pad = extent * 0.04;
  // Room for the dimension lines only when they are drawn.
  const gutter = annotate ? extent * 0.11 : pad;
  const stroke = Math.max(extent * 0.0035, 1);
  const fontSize = extent * 0.045;
  const viewBox = [
    leftMm - gutter,
    topMm - pad,
    rightMm - leftMm + gutter + pad,
    bottomMm - topMm + gutter + pad,
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
      {/* Panelled wall behind the unit: flutes, battens or a stone face. */}
      {room.wall && (
        <g>
          <rect
            x={room.wall.xMm}
            y={room.wall.yMm}
            width={room.wall.widthMm}
            height={room.wall.heightMm}
            fill="hsl(var(--primary) / 0.045)"
            stroke="hsl(var(--border))"
            strokeWidth={stroke * 0.8}
          />
          {room.members.map((member, index) => (
            <rect
              key={`member-${index}`}
              x={member.xMm}
              y={room.wall!.yMm}
              width={member.widthMm}
              height={room.wall!.heightMm}
              fill="hsl(var(--primary) / 0.09)"
              stroke="hsl(var(--border))"
              strokeWidth={stroke * 0.5}
            />
          ))}
          {room.veins.map((vein, index) => (
            <line
              key={`vein-${index}`}
              x1={vein[0]}
              y1={vein[1]}
              x2={vein[2]}
              y2={vein[3]}
              stroke="hsl(var(--border))"
              strokeWidth={stroke * 0.6}
            />
          ))}
        </g>
      )}

      {/* Screen: the reason the furniture exists, so it is always drawn. */}
      {room.screen && (
        <g>
          <rect
            x={room.screen.xMm}
            y={room.screen.yMm}
            width={room.screen.widthMm}
            height={room.screen.heightMm}
            rx={room.screen.heightMm * 0.012}
            fill="hsl(var(--foreground) / 0.82)"
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
          />
          <rect
            x={room.screen.xMm + room.screen.widthMm * 0.004}
            y={room.screen.yMm + room.screen.heightMm * 0.004}
            width={room.screen.widthMm * 0.992}
            height={room.screen.heightMm * 0.992}
            fill="hsl(var(--background) / 0.16)"
            stroke="none"
          />
        </g>
      )}

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

      {/* How the unit meets the floor: plinth, legs, or a shadow gap. */}
      {room.plinthHeightMm > 0 && (
        <rect
          x={plan.thicknessMm}
          y={plan.heightMm}
          width={Math.max(plan.widthMm - plan.thicknessMm * 2, 1)}
          height={room.plinthHeightMm}
          fill="hsl(var(--foreground) / 0.22)"
          stroke="hsl(var(--border))"
          strokeWidth={stroke * 0.6}
        />
      )}
      {room.legs.map((leg, index) => (
        <rect
          key={`leg-${index}`}
          x={leg.xMm}
          y={leg.yMm}
          width={leg.widthMm}
          height={leg.heightMm}
          fill="hsl(var(--foreground) / 0.35)"
        />
      ))}
      {room.shadowGapMm > 0 && (
        <line
          x1={plan.thicknessMm}
          y1={plan.heightMm + room.shadowGapMm * 0.5}
          x2={plan.widthMm - plan.thicknessMm}
          y2={plan.heightMm + room.shadowGapMm * 0.5}
          stroke="hsl(var(--border))"
          strokeWidth={stroke * 0.5}
          strokeDasharray={`${stroke * 2} ${stroke * 2}`}
        />
      )}

      {/* LED profile specified by the design, drawn along the band's underside. */}
      {room.led && (
        <line
          x1={plan.thicknessMm}
          y1={room.led.yMm}
          x2={plan.widthMm - plan.thicknessMm}
          y2={room.led.yMm}
          stroke="hsl(var(--primary) / 0.7)"
          strokeWidth={stroke * 1.6}
          strokeLinecap="round"
        />
      )}

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
