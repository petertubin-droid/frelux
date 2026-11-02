import { useState, useEffect } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import {
  calculateSmartWaste,
  type SurfaceCondition,
  type ApplicationMethod,
} from "@/lib/smart-waste";
import type { ProjectType } from "@/types";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

interface SmartWasteSelectorProps {
  projectType: ProjectType;
  coats: number;
  onWasteChange: (wasteMargin: number) => void;
  currentWaste: number;
}

export function SmartWasteSelector({
  projectType,
  coats,
  onWasteChange,
  currentWaste,
}: SmartWasteSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [surface, setSurface] = useState<SurfaceCondition>("smooth");
  const [method, setMethod] = useState<ApplicationMethod>("roller");
  const [isRepair, setIsRepair] = useState(false);
  const [result, setResult] = useState<{
    wasteMargin: number;
    reason: string;
  } | null>(null);

  function compute() {
    const res = calculateSmartWaste({
      projectType,
      surfaceCondition: surface,
      applicationMethod: method,
      coats,
      isRepair,
    });
    setResult({ wasteMargin: res.wasteMargin, reason: res.reason });
    onWasteChange(res.wasteMargin);
  }

  // Auto-compute on input change
  useEffect(() => {
    if (expanded) compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, method, isRepair, projectType, coats, expanded]);

  return (
    <div className="rounded-lg border border-border dark:border-border border-border">
      <Button
        variant="ghost"
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/50 dark:hover:bg-card-foreground/50"
      >
        <div className="flex items-center gap-2">
          <Lightbulb aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <span className="text-sm font-semibold text-foreground dark:text-primary-foreground">
            Smart waste calculator
          </span>
          {result && !expanded && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-brand-purple">
              {result.wasteMargin}%
            </span>
          )}
        </div>
        <ChevronDown
          className={classNames(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </Button>

      {expanded && (
        <div className="border-t border-border/50 p-3 dark:border-white/5">
          {/* Surface condition */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-muted-foreground">
              Surface condition
            </label>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["smooth", "textured", "rough"] as SurfaceCondition[]).map(
                (s) => (
                  <Button
                    variant="ghost"
                    key={s}
                    type="button"
                    onClick={() => setSurface(s)}
                    className={classNames(
                      "rounded-lg border py-2 text-xs font-medium capitalize transition-all",
                      surface === s
                        ? "border-brand-purple bg-primary/5 text-brand-purple"
                        : "border-border text-muted-foreground hover:border-border dark:border-border border-border",
                    )}
                  >
                    {s}
                  </Button>
                ),
              )}
            </div>
          </div>

          {/* Application method */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-muted-foreground">
              Application method
            </label>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["brush", "roller", "spray"] as ApplicationMethod[]).map(
                (m) => (
                  <Button
                    variant="ghost"
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={classNames(
                      "rounded-lg border py-2 text-xs font-medium capitalize transition-all",
                      method === m
                        ? "border-brand-purple bg-primary/5 text-brand-purple"
                        : "border-border text-muted-foreground hover:border-border dark:border-border border-border",
                    )}
                  >
                    {m}
                  </Button>
                ),
              )}
            </div>
          </div>

          {/* Repair work */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Repair / patch work?
            </span>
            <button
              type="button"
              role="switch"
              onClick={() => setIsRepair(!isRepair)}
              aria-checked={isRepair}
              className={classNames(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-0 p-0 transition-colors",
                isRepair ? "bg-accent-green" : "bg-muted",
              )}
            >
              <span
                className={classNames(
                  "inline-block h-4 w-4 rounded-full bg-card shadow transition-transform",
                  isRepair ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-3 rounded-lg bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-brand-purple">
                  <Lightbulb aria-hidden="true" className="h-4 w-4" />
                  Recommended: {result.wasteMargin}% waste
                </span>
                <span className="text-xs text-muted-foreground">
                  Current: {currentWaste}%
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground dark:text-muted-foreground">
                {result.reason}
              </p>
              <Button
                variant="ghost"
                type="button"
                onClick={() => onWasteChange(result.wasteMargin)}
                className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Apply {result.wasteMargin}% to calculation
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
