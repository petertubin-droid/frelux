/**
 * FRELUX Engine UI Components
 *
 * Reusable React components that display engine features
 * in the user-facing calculator pages. Each component is
 * self-contained and can be dropped into any calculator.
 *
 * Uses simple types from useEngineFeatures — no engine-internal types.
 *
 * Components:
 * - EngineWasteSelector — configurable waste (system/user/none)
 * - EngineAlreadyHaveInput — already-have / purchase quantity
 * - EngineConfidenceBadge — result confidence indicator
 * - EngineConfidenceDetail — expandable confidence breakdown
 * - EngineExplanationPanel — "how this was calculated" display
 * - EngineMaterialSummaryCard — aggregated materials
 * - EngineEstimateReportView — structured estimate report
 *
 * ADDITIVE — existing calculator UI is not modified.
 */

import { useState } from "react";
import {
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertTriangle,
  Package,
  FileText,
} from "lucide-react";
import { classNames } from "@/lib/utils";
import type {
  WasteResolution,
  ExplanationResult,
  ConfidenceResult,
  ConfidenceLevel,
  MaterialSummary,
  EstimateReportData,
} from "@/lib/measurement/use-engine-features";

// ============================================================
// WASTE SELECTOR
// ============================================================

export type WasteMode = "system" | "user" | "none";

export function EngineWasteSelector({
  resolution,
  userWaste,
  onUserWasteChange,
}: {
  resolution: WasteResolution;
  userWaste: number | undefined;
  onUserWasteChange: (waste: number | undefined) => void;
}) {
  const [mode, setMode] = useState<WasteMode>(
    userWaste === undefined ? "system" : "user",
  );

  function handleModeChange(newMode: WasteMode) {
    setMode(newMode);
    if (newMode === "system") onUserWasteChange(undefined);
    else if (newMode === "none") onUserWasteChange(0);
    else if (newMode === "user" && userWaste === undefined)
      onUserWasteChange(resolution.wastePercent);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 dark:border-white/10 dark:bg-background">
      <label className="mb-2 block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
        Waste Allowance
      </label>
      <div className="flex gap-2">
        {(
          [
            ["system", "System Recommended"],
            ["user", "Custom"],
            ["none", "No Waste"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleModeChange(key)}
            className={classNames(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted dark:bg-card-foreground/90 dark:text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "system" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Using {resolution.wastePercent}% waste ({resolution.source})
        </p>
      )}

      {mode === "user" && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={userWaste ?? resolution.wastePercent}
            onChange={(e) => onUserWasteChange(parseFloat(e.target.value) || 0)}
            className="w-20 rounded-md border border-border px-2 py-1 text-sm dark:border-white/10 dark:bg-background"
          />
          <span className="text-sm text-muted-foreground">% waste</span>
        </div>
      )}

      {mode === "none" && (
        <p className="mt-2 text-xs text-muted-foreground">
          No waste allowance — exact quantity only
        </p>
      )}
    </div>
  );
}

// ============================================================
// ALREADY-HAVE INPUT
// ============================================================

export function EngineAlreadyHaveInput({
  required,
  alreadyHave,
  onAlreadyHaveChange,
  unit,
}: {
  required: number;
  alreadyHave: number;
  onAlreadyHaveChange: (n: number) => void;
  unit: string;
}) {
  const purchase = Math.max(0, required - alreadyHave);

  return (
    <div className="rounded-lg border border-border bg-card p-4 dark:border-white/10 dark:bg-background">
      <label className="mb-2 block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
        Already Have / Purchase Quantity
      </label>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Required</div>
          <div className="font-semibold">
            {required} {unit}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Already Have</div>
          <input
            type="number"
            min={0}
            max={required}
            value={alreadyHave || ""}
            onChange={(e) =>
              onAlreadyHaveChange(parseFloat(e.target.value) || 0)
            }
            className="w-full rounded-md border border-border px-2 py-1 text-sm dark:border-white/10 dark:bg-background"
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Purchase</div>
          <div className="font-semibold text-brand-purple">
            {purchase} {unit}
          </div>
        </div>
      </div>
      {alreadyHave > 0 && (
        <p className="mt-2 text-xs text-green-600">
          You already have {alreadyHave} {unit} — purchase {purchase} {unit}{" "}
          more.
        </p>
      )}
    </div>
  );
}

// ============================================================
// CONFIDENCE BADGE
// ============================================================

const CONFIDENCE_STYLES: Record<
  ConfidenceLevel,
  { bg: string; text: string; icon: typeof ShieldCheck }
> = {
  high: {
    bg: "bg-green-100 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
    icon: ShieldCheck,
  },
  medium: {
    bg: "bg-blue-100 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
    icon: ShieldCheck,
  },
  low: {
    bg: "bg-amber-100 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
  },
  review_required: {
    bg: "bg-red-100 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
    icon: AlertTriangle,
  },
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
  review_required: "Review Required",
};

export function EngineConfidenceBadge({
  result,
}: {
  result: ConfidenceResult;
}) {
  const style = CONFIDENCE_STYLES[result.level];
  const Icon = style.icon;

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        style.bg,
        style.text,
      )}
    >
      <Icon className="h-3 w-3" />
      {CONFIDENCE_LABELS[result.level]}
    </span>
  );
}

export function EngineConfidenceDetail({
  result,
}: {
  result: ConfidenceResult;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-muted/50 dark:border-white/5 dark:bg-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
          <ShieldCheck className="h-4 w-4 text-brand-purple" />
          Result Confidence
        </span>
        {expanded ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 dark:border-white/5">
          <div className="space-y-2 text-sm">
            {result.factors.map((factor, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-muted-foreground dark:text-muted-foreground">
                  {factor.name}
                </span>
                <span
                  className={
                    factor.passed ? "text-green-600" : "text-amber-600"
                  }
                >
                  {factor.passed ? "✓" : "⚠"}{" "}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {factor.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
          {result.recommendations.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recommendations
              </p>
              {result.recommendations.map((rec, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  • {rec}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EXPLANATION PANEL
// ============================================================

export function EngineExplanationPanel({
  result,
}: {
  result: ExplanationResult;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-muted/50 dark:border-white/5 dark:bg-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
          <Info aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          How FRELUX Calculated This
        </span>
        {expanded ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 dark:border-white/5">
          <div className="space-y-1.5">
            {result.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-brand-purple">
                  {i + 1}
                </span>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    {step.description}
                  </span>
                  {step.value !== undefined && step.value !== null && (
                    <span className="ml-1 font-medium text-foreground dark:text-muted-foreground/60">
                      {step.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {result.resultSummary && (
            <div className="mt-3 rounded-md bg-primary/5 px-3 py-2 text-sm font-medium text-brand-purple">
              {result.resultSummary}
            </div>
          )}
          {result.notes.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {result.notes.map((note, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  • {note}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MATERIAL SUMMARY CARD
// ============================================================

export function EngineMaterialSummaryCard({
  summary,
}: {
  summary: MaterialSummary;
}) {
  if (summary.entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 dark:border-white/10 dark:bg-background">
      <div className="mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-brand-purple" />
        <h3 className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
          Material Summary
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-white/10 text-left">
              <th className="pb-2 pr-3 font-medium text-muted-foreground">
                Material
              </th>
              <th className="pb-2 pr-3 font-medium text-muted-foreground">
                Total Qty
              </th>
              <th className="pb-2 pr-3 font-medium text-muted-foreground">Unit</th>
              <th className="pb-2 font-medium text-muted-foreground">Sources</th>
            </tr>
          </thead>
          <tbody>
            {summary.entries.map((entry, i) => (
              <tr
                key={i}
                className="border-b border-border/50 dark:border-white/5"
              >
                <td className="py-2 pr-3 font-medium">{entry.productName}</td>
                <td className="py-2 pr-3">{entry.totalQuantity}</td>
                <td className="py-2 pr-3">{entry.quantityUnit}</td>
                <td className="py-2 text-muted-foreground">
                  {entry.spaceIds.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {summary.totalEntries > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {summary.totalEntries} entries across {summary.entries.length}{" "}
          material types
        </p>
      )}
    </div>
  );
}

// ============================================================
// ESTIMATE REPORT VIEW
// ============================================================

export function EngineEstimateReportView({
  report,
}: {
  report: EstimateReportData;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 dark:border-white/10 dark:bg-background">
      {/* Header */}
      <div className="mb-4 border-b border-border pb-4 dark:border-white/10">
        <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
          {report.projectName}
        </h2>
        {report.location && (
          <p className="text-sm text-muted-foreground">{report.location}</p>
        )}
        <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
          <span>{new Date(report.date).toLocaleDateString()}</span>
          <span>{report.measurementSystem}</span>
          <span>{report.currency}</span>
        </div>
      </div>

      {/* Spaces */}
      {report.spaces.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
            Spaces
          </h3>
          {report.spaces.map((space, i) => (
            <div
              key={i}
              className="mb-2 rounded-md bg-muted/50 px-3 py-2 text-sm dark:bg-white/5"
            >
              <span className="font-medium">{space.name}</span>
              <span className="ml-2 text-muted-foreground">{space.dimensions}</span>
            </div>
          ))}
        </div>
      )}

      {/* Materials */}
      {report.materials.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
            Materials
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border dark:border-white/10 text-left">
                <th className="pb-1 font-medium text-muted-foreground">Material</th>
                <th className="pb-1 font-medium text-muted-foreground">Quantity</th>
                <th className="pb-1 font-medium text-muted-foreground">Unit</th>
              </tr>
            </thead>
            <tbody>
              {report.materials.map((mat, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 dark:border-white/5"
                >
                  <td className="py-1.5">{mat.productName}</td>
                  <td className="py-1.5">{mat.totalQuantity}</td>
                  <td className="py-1.5">{mat.quantityUnit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unit prices */}
      {report.unitPrices.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
            Unit Prices
          </h3>
          {report.unitPrices.map((price, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{price.material}</span>
              <span>
                {price.unitPrice} {price.currency}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {report.total > 0 && (
        <div className="border-t border-border pt-4 dark:border-white/10">
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>
              {report.total.toLocaleString()} {report.currency}
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      {report.notes.length > 0 && (
        <div className="mt-4 border-t border-border pt-3 dark:border-white/10">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </p>
          {report.notes.map((note, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              • {note}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
        <FileText aria-hidden="true" className="h-3 w-3" />
        Generated by FRELUX Calculation Engine
      </div>
    </div>
  );
}
