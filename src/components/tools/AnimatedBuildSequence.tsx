import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";

export interface BuildStep {
  id: string;
  title: string;
  detail: string;
  /** What a builder checks before moving to the next step. */
  check?: string;
  /** Optional quantity already calculated by the engine, shown next to the step. */
  quantity?: string;
}

export type BuildKind = "member" | "layers" | "truss" | "courses" | "cage";

interface Props {
  steps: BuildStep[];
  kind: BuildKind;
  /** Element drawn in "member" mode. */
  member?: "slab" | "beam" | "column" | "footing";
  /** Bottom-to-top strata for "layers" mode. */
  layers?: Array<{ id: string; label: string; thickness: string }>;
  /** Caption under the drawing. */
  caption?: string;
  title?: string;
}

/**
 * Animated build sequence shared by the structural calculators.
 *
 * Every shape in the drawing belongs to a step, so the picture can only show
 * work the estimate has actually described. Quantities come from the engine, not
 * from this component, and the animation respects reduced-motion preferences by
 * exposing the same steps as plain controls.
 */
export default function AnimatedBuildSequence({
  steps,
  kind,
  member = "beam",
  layers = [],
  caption,
  title = "How this is built on site",
}: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    timer.current = window.setTimeout(() => {
      setIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 3000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, index, steps.length, reducedMotion]);

  const reached = (id: string) => {
    const at = steps.findIndex((s) => s.id === id);
    return at >= 0 && at <= index;
  };
  const transition = useMemo(
    () => (reducedMotion ? "" : "transition-opacity duration-700 ease-out"),
    [reducedMotion],
  );
  const show = (visible: boolean) =>
    `${transition} ${visible ? "opacity-100" : "opacity-0"}`;

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(steps.length - 1, next)));
    setPlaying(false);
  };

  // ── member drawing ──
  const renderMember = () => {
    if (member === "slab") {
      // Section through a slab: subgrade, hardcore, blinding, slab.
      return (
        <g>
          <rect
            x="30"
            y="150"
            width="200"
            height="26"
            className={`fill-amber-200/70 stroke-amber-600/40 ${show(reached("subgrade"))}`}
          />
          <rect
            x="30"
            y="132"
            width="200"
            height="18"
            className={`fill-zinc-300 stroke-zinc-500/50 ${show(reached("subgrade"))}`}
          />
          <rect
            x="30"
            y="122"
            width="200"
            height="10"
            className={`fill-zinc-400 ${show(reached("blinding"))}`}
          />
          <rect
            x="30"
            y="84"
            width="200"
            height="38"
            className={`fill-sky-200/80 stroke-sky-600 ${show(reached("concrete"))}`}
          />
          <g
            className={`stroke-sky-700 ${show(reached("rebar"))}`}
            strokeWidth="1.4"
          >
            <line x1="34" y1="96" x2="226" y2="96" />
            <line x1="34" y1="112" x2="226" y2="112" />
            {Array.from({ length: 9 }).map((_, i) => (
              <line
                key={i}
                x1={38 + i * 22}
                y1="94"
                x2={38 + i * 22}
                y2="116"
              />
            ))}
          </g>
        </g>
      );
    }

    if (member === "footing") {
      return (
        <g>
          <rect
            x="20"
            y="150"
            width="220"
            height="26"
            className={`fill-amber-200/70 stroke-amber-600/40 ${show(reached("excavate"))}`}
          />
          <rect
            x="52"
            y="132"
            width="156"
            height="18"
            className={`fill-zinc-300 stroke-zinc-500/50 ${show(reached("excavate"))}`}
          />
          <rect
            x="52"
            y="122"
            width="156"
            height="10"
            className={`fill-zinc-400 ${show(reached("blinding"))}`}
          />
          <rect
            x="52"
            y="96"
            width="156"
            height="26"
            className={`fill-sky-200/80 stroke-sky-600 ${show(reached("concrete"))}`}
          />
          <g className={`stroke-zinc-600 ${show(reached("column"))}`}>
            <rect
              x="112"
              y="52"
              width="36"
              height="44"
              className="fill-zinc-200"
            />
          </g>
          <g
            className={`stroke-sky-700 ${show(reached("rebar"))}`}
            strokeWidth="1.6"
          >
            <line x1="60" y1="104" x2="200" y2="104" />
            <line x1="60" y1="114" x2="200" y2="114" />
            <line x1="120" y1="118" x2="120" y2="48" />
            <line x1="140" y1="118" x2="140" y2="48" />
          </g>
        </g>
      );
    }

    if (member === "column") {
      return (
        <g>
          <rect
            x="30"
            y="150"
            width="200"
            height="26"
            className={`fill-amber-200/70 stroke-amber-600/40 ${show(reached("base"))}`}
          />
          <rect
            x="96"
            y="52"
            width="68"
            height="98"
            className={`fill-sky-200/80 stroke-sky-600 ${show(reached("concrete"))}`}
          />
          <g
            className={`stroke-amber-600 ${show(reached("shutter"))}`}
            strokeWidth="1.4"
            strokeDasharray="4 3"
          >
            <rect x="90" y="46" width="80" height="110" className="fill-none" />
          </g>
          <g
            className={`stroke-sky-700 ${show(reached("rebar"))}`}
            strokeWidth="1.6"
          >
            <line x1="106" y1="60" x2="106" y2="146" />
            <line x1="154" y1="60" x2="154" y2="146" />
            {Array.from({ length: 8 }).map((_, i) => (
              <rect
                key={i}
                x="104"
                y={62 + i * 11}
                width="52"
                height="6"
                className="fill-none"
              />
            ))}
          </g>
        </g>
      );
    }

    // beam on two supports
    return (
      <g>
        <rect
          x="26"
          y="140"
          width="26"
          height="34"
          className={`fill-zinc-400 ${show(reached("supports"))}`}
        />
        <rect
          x="208"
          y="140"
          width="26"
          height="34"
          className={`fill-zinc-400 ${show(reached("supports"))}`}
        />
        <rect
          x="26"
          y="88"
          width="208"
          height="40"
          rx="1"
          className={`fill-sky-200/80 stroke-sky-600 ${show(reached("concrete"))}`}
        />
        <g
          className={`stroke-amber-600 ${show(reached("shutter"))}`}
          strokeWidth="1.4"
          strokeDasharray="4 3"
        >
          <rect x="22" y="82" width="216" height="52" className="fill-none" />
        </g>
        <g
          className={`stroke-sky-700 ${show(reached("rebar"))}`}
          strokeWidth="1.6"
        >
          <line x1="34" y1="100" x2="226" y2="100" />
          <line x1="34" y1="118" x2="226" y2="118" />
          <line x1="34" y1="104" x2="226" y2="104" strokeDasharray="5 3" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x={40 + i * 24}
              y="98"
              width="8"
              height="22"
              className="fill-none"
            />
          ))}
        </g>
      </g>
    );
  };

  // ── layers drawing ──
  const renderLayers = () => {
    const total = Math.max(layers.length, 1);
    return (
      <g>
        {layers.map((layer, i) => {
          const h = 130 / total;
          const y = 40 + i * h;
          return (
            <g key={layer.id} className={show(reached(layer.id))}>
              <rect
                x="34"
                y={y}
                width="192"
                height={h - 2}
                className={
                  i === layers.length - 1
                    ? "fill-sky-200/80 stroke-sky-600"
                    : "fill-zinc-300/80 stroke-zinc-500/40"
                }
                strokeWidth="1"
              />
              <text
                x="130"
                y={y + h / 2 + 2}
                textAnchor="middle"
                className="fill-zinc-700"
                fontSize="8"
              >
                {layer.label} {layer.thickness}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // ── truss drawing ──
  const renderTruss = () => (
    <g>
      <rect
        x="26"
        y="176"
        width="208"
        height="14"
        className={`fill-zinc-400 ${show(reached("wall-plate"))}`}
      />
      <g
        className={`stroke-sky-700 ${show(reached("trusses"))}`}
        strokeWidth="2"
        fill="none"
      >
        <line x1="34" y1="176" x2="226" y2="176" />
        <line x1="34" y1="176" x2="130" y2="86" />
        <line x1="226" y1="176" x2="130" y2="86" />
        <line x1="130" y1="86" x2="130" y2="176" />
        <line x1="85" y1="128" x2="175" y2="128" />
        <line x1="85" y1="128" x2="130" y2="176" />
        <line x1="175" y1="128" x2="130" y2="176" />
      </g>
      <g
        className={`stroke-amber-600 ${show(reached("purlins"))}`}
        strokeWidth="1.8"
      >
        <line x1="46" y1="158" x2="214" y2="158" />
        <line x1="66" y1="140" x2="194" y2="140" />
        <line x1="88" y1="120" x2="172" y2="120" />
        <line x1="108" y1="100" x2="152" y2="100" />
      </g>
      <g
        className={`stroke-emerald-600 ${show(reached("bracing"))}`}
        strokeWidth="1.6"
        strokeDasharray="6 3"
      >
        <line x1="34" y1="176" x2="226" y2="86" />
        <line x1="226" y1="176" x2="34" y2="86" />
      </g>
      <g
        className={`stroke-zinc-600 ${show(reached("sheet"))}`}
        strokeWidth="1.4"
      >
        <line x1="28" y1="172" x2="130" y2="80" />
        <line x1="232" y1="172" x2="130" y2="80" />
      </g>
    </g>
  );

  // ── blockwork drawing ──
  // Running bond: every course is offset half a block, which is the point the
  // sequence makes. Courses appear one at a time from the foundation up.
  const renderCourses = () => {
    const courseHeight = 139 / 6;
    const courseIds = [
      "foundation",
      "mortar",
      "courses",
      "courses",
      "courses",
      "cure",
    ];
    return (
      <g>
        <rect
          x="24"
          y="176"
          width="212"
          height="14"
          className={`fill-zinc-500 ${show(reached("foundation"))}`}
        />
        {Array.from({ length: 6 }).map((_, row) => {
          const y = 176 - (row + 1) * courseHeight;
          const offset = row % 2 === 0 ? 0 : 24;
          return (
            <g key={row} className={show(reached(courseIds[row]))}>
              {[0, 1, 2, 3, 4].map((col) => {
                const x = 30 + offset + col * 40;
                if (x > 210) return null;
                const width = Math.min(38, 232 - x);
                return (
                  <rect
                    key={col}
                    x={x}
                    y={y + 1}
                    width={width}
                    height={courseHeight - 2}
                    className={
                      row >= 4
                        ? "fill-zinc-400/80 stroke-zinc-600/50"
                        : "fill-zinc-300/85 stroke-zinc-500/45"
                    }
                    strokeWidth="0.8"
                  />
                );
              })}
            </g>
          );
        })}
        {/* mortar joint called out on the step that explains it */}
        <g className={show(reached("mortar"))}>
          <line
            x1="30"
            y1="168"
            x2="230"
            y2="168"
            className="stroke-amber-500"
            strokeWidth="1.4"
            strokeDasharray="4 2"
          />
        </g>
      </g>
    );
  };

  // ── rebar cage drawing ──
  // Four main bars with links; the schedule step lights the bar marks, the
  // placing step the verticals, the tying step the links, cover the spacers.
  const renderCage = () => (
    <g>
      <g className={show(reached("verticals"))}>
        {[64, 100, 160, 196].map((x) => (
          <line
            key={x}
            x1={x}
            y1="52"
            x2={x}
            y2="180"
            className="stroke-zinc-600"
            strokeWidth="2"
          />
        ))}
      </g>
      <g className={show(reached("links"))}>
        {[62, 86, 110, 134, 158].map((y) => (
          <rect
            key={y}
            x="60"
            y={y}
            width="140"
            height="6"
            className="fill-none stroke-zinc-500"
            strokeWidth="1.2"
          />
        ))}
      </g>
      <g className={show(reached("cover"))}>
        {[
          [56, 176],
          [204, 176],
          [56, 56],
          [204, 56],
        ].map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="3"
            className="fill-amber-500"
          />
        ))}
      </g>
      <g className={show(reached("bend"))}>
        <path
          d="M120 44 h24 v14"
          className="fill-none stroke-zinc-500"
          strokeWidth="1.4"
          strokeDasharray="3 2"
        />
        <text x="150" y="42" fontSize="7" className="fill-zinc-600">
          bend per schedule
        </text>
      </g>
    </g>
  );

  const active = steps[index];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <svg
            viewBox="0 0 260 210"
            className="w-full max-w-[280px] mx-auto"
            role="img"
            aria-label={`${title}, step ${index + 1} of ${steps.length}: ${active?.title ?? ""}`}
          >
            {kind === "layers"
              ? renderLayers()
              : kind === "truss"
                ? renderTruss()
                : kind === "courses"
                  ? renderCourses()
                  : kind === "cage"
                    ? renderCage()
                    : renderMember()}
            <line
              x1="16"
              y1="190"
              x2="244"
              y2="190"
              className="stroke-zinc-300"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
          </svg>
          {caption && (
            <p className="text-[11px] text-muted-foreground text-center mt-1">
              {caption}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <ol className="space-y-1.5" aria-live="polite">
            {steps.map((step, i) => (
              <li key={step.id} id={`build-step-${i + 1}`}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === index ? "step" : undefined}
                  className={`w-full text-left rounded-md border px-3 py-2 text-xs leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    i === index
                      ? "border-primary bg-primary/5"
                      : i < index
                        ? "border-border bg-background"
                        : "border-transparent hover:bg-muted/60"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {i + 1}. {step.title}
                    </span>
                    {step.quantity && (
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                        {step.quantity}
                      </span>
                    )}
                  </span>
                  {
                    // The full text of every step stays in the DOM. Only the
                    // active step is visible, but a crawler or screen reader
                    // still gets the whole method, not just the current frame.
                    <span
                      className={
                        i === index ? "mt-1 block space-y-1" : "sr-only"
                      }
                    >
                      <span className="block text-foreground">
                        {step.detail}
                      </span>
                      {step.check && (
                        <span className="block text-[11px] text-muted-foreground">
                          Check first: {step.check}
                        </span>
                      )}
                    </span>
                  }
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="Previous step"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (reducedMotion) {
              go(Math.min(steps.length - 1, index + 1));
              return;
            }
            if (index === steps.length - 1) {
              setIndex(0);
              setPlaying(true);
              return;
            }
            setPlaying((p) => !p);
          }}
          aria-label={playing ? "Pause the sequence" : "Play the sequence"}
        >
          {playing && !reducedMotion ? (
            <>
              <Pause className="mr-1.5 h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="mr-1.5 h-4 w-4" />
              {index === steps.length - 1
                ? "Replay"
                : reducedMotion
                  ? "Next step"
                  : "Play"}
            </>
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => go(index + 1)}
          disabled={index === steps.length - 1}
          aria-label="Next step"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setPlaying(false);
            setIndex(0);
          }}
          aria-label="Restart from the first step"
        >
          <RotateCcw className="mr-1.5 h-4 w-4" /> Restart
        </Button>
        <span className="text-xs text-muted-foreground">
          Step {index + 1} of {steps.length}
        </span>
      </div>
    </div>
  );
}
