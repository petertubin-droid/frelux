import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeftRight, Ruler, X } from "lucide-react";
import { classNames } from "@/lib/utils";
import {
  convertArea,
  convertLength,
  formatNumber,
  parseMeasurement,
} from "@/lib/convert/units";

/**
 * Conversion shortcut for the calculators.
 *
 * Site measurements arrive in feet and inches while the calculators take
 * metres, so this dock sits beside the active calculator and converts without
 * navigating away. The full converter opens in a new tab, which is what keeps
 * a half-filled calculator form intact.
 */

const CALCULATOR_ROUTES = [
  "paint-calculator",
  "tile-calculator",
  "screeding-calculator",
  "pop-ceiling-calculator",
  "structural-calculator",
  "foundation",
  "flooring",
  "waterproofing",
  "build-to-roof",
  "roof",
  "rebar",
  "concrete",
  "plaster",
  "finish-estimator",
];

function isCalculatorPath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return CALCULATOR_ROUTES.some((route) => path.includes(route));
}

const QUICK = [
  { id: "ft-m", label: "Feet to metres", from: "ft", to: "m", factor: 0.3048 },
  { id: "in-mm", label: "Inches to mm", from: "in", to: "mm", factor: 25.4 },
  {
    id: "ft2-m2",
    label: "Sq feet to sq metres",
    from: "ft2",
    to: "m2",
    factor: 0.09290304,
  },
] as const;

export default function ConversionDock() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({
    "ft-m": "10",
    "in-mm": "4",
    "ft2-m2": "100",
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isCalculatorPath(pathname)) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 sm:bottom-6 sm:right-6">
      <div className="pointer-events-auto">
        {open && (
          <div
            role="dialog"
            aria-label="Measurement conversion shortcut"
            className="mb-3 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-white/20 bg-white/90 p-4 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A0A1A]/95"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Convert without leaving
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your calculator inputs stay exactly as they are.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close converter"
                className="rounded-full p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {QUICK.map((quick) => {
                const value = parseMeasurement(amounts[quick.id]);
                const result =
                  value === null
                    ? null
                    : quick.id === "ft2-m2"
                      ? convertArea(value, "ft2", "m2")
                      : convertLength(
                          value,
                          quick.from as "ft" | "in",
                          quick.to as "m" | "mm",
                        );
                return (
                  <div key={quick.id} className="flex items-center gap-2">
                    <input
                      inputMode="decimal"
                      aria-label={quick.label}
                      value={amounts[quick.id]}
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [quick.id]: e.target.value,
                        }))
                      }
                      className="w-20 rounded-lg border border-white/20 bg-white/70 px-2 py-1.5 text-sm tabular-nums text-foreground outline-none focus:border-primary/50 dark:border-white/10 dark:bg-white/5"
                    />
                    <span className="text-xs text-muted-foreground">
                      {quick.from}
                    </span>
                    <ArrowLeftRight
                      aria-hidden="true"
                      className="h-3 w-3 text-muted-foreground"
                    />
                    <span className="flex-1 text-right text-sm font-medium tabular-nums text-foreground">
                      {result === null
                        ? "n/a"
                        : `${formatNumber(result)} ${quick.to}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <Link
              to="/unit-converter"
              target="_blank"
              rel="noopener"
              className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
            >
              Open the full converter
            </Link>
          </div>
        )}

        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={classNames(
            "flex items-center gap-2 rounded-full border border-white/25 bg-white/90 px-4 py-2.5 text-sm font-medium text-foreground shadow-[0_16px_40px_-18px_rgba(15,23,42,0.5)] backdrop-blur-xl transition hover:border-primary/40 dark:border-white/10 dark:bg-[#0A0A1A]/90",
            open && "border-primary/40",
          )}
        >
          <Ruler aria-hidden="true" className="h-4 w-4" />
          Convert
        </button>
      </div>
    </div>
  );
}
