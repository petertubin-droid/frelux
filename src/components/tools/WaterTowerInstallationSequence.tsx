import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import type { TowerInstallationStep } from "@/lib/estimation/water-tower-staging-engine";

interface Props {
  steps: TowerInstallationStep[];
  material: "steel" | "concrete";
  heightMeters: number;
  hasFootings: boolean;
}

/**
 * Animated build sequence for an overhead water tank staging.
 *
 * The drawing is an elevation: two legs in front, two behind, the tank above.
 * Each step reveals only the work it is about, so a first-time builder can see
 * the order the stage actually goes up in: pads, legs, bracing, deck, tank,
 * plumbing. Autoplay stops on the last step, and reduced-motion users get the
 * static drawing with step-by-step controls.
 */
export default function WaterTowerInstallationSequence({
  steps,
  material,
  heightMeters,
  hasFootings,
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
    }, 3200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, index, steps.length, reducedMotion]);

  const active = steps[index]?.id ?? "";
  const reached = (id: string) => {
    const at = steps.findIndex((s) => s.id === id);
    return at >= 0 && at <= index;
  };

  const groundY = 250;
  const padY = groundY - 10;
  const legTopY = groundY - 10 - Math.min(150, 18 + heightMeters * 16);
  const deckY = legTopY - 6;
  const tankH = 34;
  const tankW = 74;
  const legXs = [66, 194];
  const backLegXs = [90, 170];
  const tiers = Math.max(1, Math.round(heightMeters / 3));
  const legStroke = material === "steel" ? "text-sky-600" : "text-zinc-500";

  const transitionCls = useMemo(
    () =>
      reducedMotion
        ? ""
        : "transition-opacity duration-700 ease-out motion-reduce:transition-none",
    [reducedMotion],
  );
  const show = (visible: boolean) =>
    `${transitionCls} ${visible ? "opacity-100" : "opacity-0"}`;

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(steps.length - 1, next)));
    setPlaying(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <svg
            viewBox="0 0 260 285"
            className="w-full max-w-[280px] mx-auto"
            role="img"
            aria-label={`Animated construction sequence of a ${heightMeters} metre ${material} water tank staging, step ${index + 1} of ${steps.length}: ${steps[index]?.title ?? ""}`}
          >
            <line
              x1="16"
              y1={groundY}
              x2="244"
              y2={groundY}
              className="stroke-zinc-300"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <text
              x="244"
              y={groundY + 14}
              textAnchor="end"
              className="fill-zinc-400"
              fontSize="9"
            >
              Existing ground level
            </text>

            <g className={show(reached("set-out") && !reached("blinding"))}>
              {legXs.map((x, i) => (
                <rect
                  key={i}
                  x={x - 20}
                  y={padY}
                  width="40"
                  height="10"
                  className="fill-none stroke-amber-500"
                  strokeDasharray="3 2"
                  strokeWidth="1.5"
                />
              ))}
            </g>

            <g className={show(reached("blinding"))}>
              {legXs.map((x, i) => (
                <rect
                  key={i}
                  x={x - 22}
                  y={padY}
                  width="44"
                  height="10"
                  rx="1.5"
                  className="fill-zinc-400"
                />
              ))}
            </g>

            <g className={show(reached("blinding") && !reached("legs"))}>
              {legXs.map((x, i) => (
                <line
                  key={i}
                  x1={x}
                  y1={padY}
                  x2={x}
                  y2={padY - 9}
                  className="stroke-zinc-500"
                  strokeWidth="2"
                />
              ))}
            </g>

            <g className={show(reached("legs"))}>
              {backLegXs.map((x, i) => (
                <rect
                  key={`b${i}`}
                  x={x - 3}
                  y={legTopY + 4}
                  width="6"
                  height={padY - legTopY - 4}
                  className="fill-zinc-300"
                />
              ))}
              {legXs.map((x, i) => (
                <rect
                  key={i}
                  x={x - 4}
                  y={legTopY}
                  width="8"
                  height={padY - legTopY}
                  rx={material === "steel" ? 0.5 : 1}
                  className={`${legStroke} fill-current`}
                />
              ))}
            </g>

            <g className={show(reached("bracing"))}>
              {Array.from({ length: tiers }).map((_, tier) => {
                const segH = (padY - legTopY) / tiers;
                const y1 = padY - tier * segH;
                const y2 = y1 - segH;
                return (
                  <g key={tier}>
                    <line
                      x1={legXs[0]}
                      y1={y1}
                      x2={legXs[1]}
                      y2={y2}
                      className="stroke-amber-500"
                      strokeWidth="1.6"
                    />
                    <line
                      x1={legXs[0]}
                      y1={y2}
                      x2={legXs[1]}
                      y2={y1}
                      className="stroke-amber-500"
                      strokeWidth="1.6"
                    />
                  </g>
                );
              })}
            </g>

            <g className={show(reached("deck"))}>
              <rect
                x={legXs[0] - 16}
                y={deckY - 6}
                width={legXs[1] - legXs[0] + 32}
                height="7"
                rx="1"
                className="fill-amber-700/80"
              />
            </g>

            <g className={show(reached("tank"))}>
              <rect
                x={(legXs[0] + legXs[1]) / 2 - tankW / 2}
                y={deckY - 6 - tankH}
                width={tankW}
                height={tankH}
                rx="6"
                className="fill-sky-500/85 stroke-sky-700"
                strokeWidth="1.5"
              />
              <text
                x={(legXs[0] + legXs[1]) / 2}
                y={deckY - 6 - tankH / 2 + 3}
                textAnchor="middle"
                className="fill-white"
                fontSize="9"
                fontWeight="600"
              >
                TANK
              </text>
            </g>

            <g className={show(reached("plumbing"))}>
              <path
                d={`M ${legXs[1] - 30} ${deckY - 6} L ${legXs[1] - 30} ${groundY - 26} L ${legXs[1] + 26} ${groundY - 26}`}
                className="fill-none stroke-sky-600"
                strokeWidth="2.5"
              />
              <text
                x={legXs[1] + 26}
                y={groundY - 32}
                textAnchor="end"
                className="fill-sky-700"
                fontSize="8"
              >
                riser to house
              </text>
            </g>

            <g className="text-zinc-400">
              <line
                x1="18"
                y1={deckY}
                x2="18"
                y2={groundY}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              <text
                x="22"
                y={(deckY + groundY) / 2}
                className="fill-current"
                fontSize="8"
              >
                {heightMeters} m
              </text>
            </g>

            {hasFootings && (
              <text
                x="130"
                y="280"
                textAnchor="middle"
                className="fill-zinc-400"
                fontSize="8"
              >
                Pad footings sized from the load each leg carries
              </text>
            )}
          </svg>
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
                      ? "border-primary bg-primary/5 text-foreground"
                      : i < index
                        ? "border-border bg-background text-muted-foreground"
                        : "border-transparent text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <span className="font-semibold text-foreground">
                    {i + 1}. {step.title}
                  </span>
                  {
                    <span
                      className={
                        i === index ? "mt-1 block space-y-1" : "sr-only"
                      }
                    >
                      <span className="block text-foreground">
                        {step.detail}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Check before moving on: {step.check}
                      </span>
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
      <p className="text-xs text-muted-foreground">
        Sequence shown for a {material} frame at {heightMeters} m. The order
        does not change with size: footings carry the load, bracing resists the
        wind, and the tank is landed empty.
      </p>
      {active === "" && null}
    </div>
  );
}
