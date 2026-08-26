/* eslint-disable react-refresh/only-export-components */
/**
 * FRELUX ROOF PITCH — Per-Section Pitch Input
 *
 * Allows the user to define pitch independently for each roof section.
 * Supports:
 *   - Pitch ratio (e.g. 4:12, 1:2)
 *   - Degrees
 *   - "Unknown" state → shows PITCH REQUIRED or PITCH ESTIMATION — USER VERIFICATION REQUIRED
 *
 * Feature 5: Roof Pitch Per Section
 */

import { useState } from "react";
import { AlertCircle, HelpCircle, CheckCircle2 } from "lucide-react";

// =========================================================
// Pitch Ratio ↔ Degrees Conversion
// =========================================================

/**
 * Common pitch ratios and their degree equivalents.
 */
export const PITCH_RATIOS: { ratio: string; degrees: number; label: string }[] =
  [
    { ratio: "1:12", degrees: 4.76, label: "Nearly flat (1:12)" },
    { ratio: "2:12", degrees: 9.46, label: "Low slope (2:12)" },
    { ratio: "3:12", degrees: 14.04, label: "Low slope (3:12)" },
    { ratio: "4:12", degrees: 18.43, label: "Moderate (4:12)" },
    { ratio: "5:12", degrees: 22.62, label: "Moderate (5:12)" },
    { ratio: "6:12", degrees: 26.57, label: "Standard (6:12)" },
    { ratio: "7:12", degrees: 30.26, label: "Steep (7:12)" },
    { ratio: "8:12", degrees: 33.69, label: "Steep (8:12)" },
    { ratio: "9:12", degrees: 36.87, label: "Very steep (9:12)" },
    { ratio: "10:12", degrees: 39.81, label: "Very steep (10:12)" },
    { ratio: "12:12", degrees: 45.0, label: "Half pitch (12:12)" },
  ];

/**
 * Convert a pitch ratio string (e.g. "4:12") to degrees.
 */
export function pitchRatioToDegrees(ratio: string): number | null {
  const match = ratio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const rise = parseFloat(match[1]);
  const run = parseFloat(match[2]);
  if (run === 0) return null;
  return Math.atan(rise / run) * (180 / Math.PI);
}

/**
 * Convert degrees to the nearest standard pitch ratio.
 */
export function degreesToPitchRatio(degrees: number): string | null {
  if (degrees < 0 || degrees >= 90) return null;
  // Find closest ratio
  let closest = PITCH_RATIOS[0];
  let minDiff = Math.abs(closest.degrees - degrees);
  for (const r of PITCH_RATIOS) {
    const diff = Math.abs(r.degrees - degrees);
    if (diff < minDiff) {
      minDiff = diff;
      closest = r;
    }
  }
  return closest.ratio;
}

// =========================================================
// Pitch Input Component
// =========================================================

interface PitchInputProps {
  /** Current pitch in degrees (null = unknown) */
  pitchDegrees: number | null;
  /** Called when pitch changes (null = user cleared it) */
  onChange: (degrees: number | null) => void;
  /** Roof type — flat roofs don't need pitch */
  roofType: string;
  /** Section name for display */
  sectionName: string;
  /** Whether pitch was AI-estimated (shows verification warning) */
  aiEstimated?: boolean;
  disabled?: boolean;
}

export function PitchInput({
  pitchDegrees,
  onChange,
  roofType,
  sectionName,
  aiEstimated,
  disabled,
}: PitchInputProps) {
  const [inputMode, setInputMode] = useState<"degrees" | "ratio" | "unknown">(
    pitchDegrees === null ? "unknown" : "degrees",
  );

  // Flat roofs don't need pitch
  if (roofType === "flat") {
    return (
      <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-green-500" />
          <span>Flat roof — no pitch required for {sectionName}</span>
        </div>
      </div>
    );
  }

  const hasPitch = pitchDegrees !== null && pitchDegrees > 0;
  const nearestRatio = hasPitch ? degreesToPitchRatio(pitchDegrees!) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-600">
          Roof Pitch — {sectionName}
        </label>
        <div className="flex items-center gap-1">
          {(["degrees", "ratio", "unknown"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setInputMode(mode);
                if (mode === "unknown") onChange(null);
              }}
              disabled={disabled}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                inputMode === mode
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              {mode === "degrees"
                ? "Degrees"
                : mode === "ratio"
                  ? "Ratio"
                  : "Unknown"}
            </button>
          ))}
        </div>
      </div>

      {/* Degrees input */}
      {inputMode === "degrees" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={hasPitch ? pitchDegrees! : ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange(isNaN(v) || v <= 0 ? null : Math.min(89, v));
            }}
            disabled={disabled}
            placeholder="e.g. 25"
            min={0}
            max={89}
            step={0.1}
            className="w-24 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
          />
          <span className="text-sm text-neutral-500">degrees</span>
          {nearestRatio && (
            <span className="text-xs text-neutral-500">≈ {nearestRatio}</span>
          )}
        </div>
      )}

      {/* Ratio select */}
      {inputMode === "ratio" && (
        <select
          value={nearestRatio ?? ""}
          onChange={(e) => {
            const degrees = pitchRatioToDegrees(e.target.value);
            onChange(degrees);
          }}
          disabled={disabled}
          className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
        >
          <option value="">Select a pitch ratio...</option>
          {PITCH_RATIOS.map((r) => (
            <option key={r.ratio} value={r.ratio}>
              {r.label} ({r.degrees.toFixed(1)}°)
            </option>
          ))}
        </select>
      )}

      {/* Unknown — shows required / estimation warning */}
      {inputMode === "unknown" && (
        <div className="space-y-2">
          {aiEstimated ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle aria-hidden="true" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">
                    PITCH ESTIMATION — USER VERIFICATION REQUIRED
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Pitch was estimated by AI. Please verify or enter the
                    correct pitch for accurate surface area calculation.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle aria-hidden="true" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700">
                    PITCH REQUIRED
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Accurate roof surface area calculation requires pitch. Enter
                    the pitch in degrees or as a ratio.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInputMode("degrees")}
              disabled={disabled}
              className="rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-purple/90"
            >
              Enter Pitch
            </button>
            <button
              type="button"
              onClick={() => setInputMode("ratio")}
              disabled={disabled}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Select Ratio
            </button>
          </div>
        </div>
      )}

      {/* Info: what this pitch means for surface area */}
      {hasPitch && (
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <HelpCircle aria-hidden="true" className="w-3 h-3" />
          Surface area = plan area ÷ cos({pitchDegrees!.toFixed(1)}°)
          {aiEstimated && (
            <span className="text-amber-500 ml-1">· AI-estimated — verify</span>
          )}
        </div>
      )}
    </div>
  );
}

export default PitchInput;
