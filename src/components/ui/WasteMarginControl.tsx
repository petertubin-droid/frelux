import { useState } from "react";
import { PencilLine } from "lucide-react";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

/**
 * Shared waste-margin control.
 *
 * Preset chips (configurable per calculator) plus a Custom input that
 * accepts any value from 0.1% to 100% in 0.1% steps, so trades with
 * naturally low waste (e.g. painting) are not forced onto coarse
 * presets. The value flows straight into the existing calculator
 * input, so engine math (coverage, bucket rounding) is untouched.
 */

export const WASTE_MIN = 0.1;
export const WASTE_MAX = 100;

export function clampWasteMargin(value: number): number {
  return Math.min(WASTE_MAX, Math.max(WASTE_MIN, value));
}

interface WasteMarginControlProps {
  value: number;
  onChange: (waste: number) => void;
  /** Preset chips; 0 stays available as an explicit "no waste" preset. */
  options?: number[];
  hint?: string;
}

export function WasteMarginControl({
  value,
  onChange,
  options = [0, 5, 10, 15, 20],
  hint,
}: WasteMarginControlProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const isPreset = options.includes(value);
  const showCustom = customOpen || (!isPreset && value !== 0);

  function selectPreset(w: number) {
    setCustomOpen(false);
    onChange(w);
  }

  function selectCustom() {
    setCustomOpen(true);
    // Seed the field with the current value, or 10% when coming from 0.
    onChange(value === 0 ? 10 : clampWasteMargin(value));
  }

  return (
    <div data-testid="waste-margin-control">
      <div className="flex flex-wrap gap-2">
        {options.map((w: number) => (
          <Button
            variant="ghost"
            key={w}
            type="button"
            onClick={() => selectPreset(w)}
            className={classNames(
              "rounded-lg border px-4 py-2 text-sm font-semibold transition-all",
              !showCustom && value === w
                ? "border-brand-purple bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-border",
            )}
          >
            {w}%
          </Button>
        ))}
        <Button
          variant="ghost"
          type="button"
          onClick={selectCustom}
          className={classNames(
            "flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-all",
            showCustom
              ? "border-brand-purple bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-border",
          )}
        >
          <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
          Custom
        </Button>
      </div>
      {showCustom && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={WASTE_MIN}
            max={WASTE_MAX}
            step={0.1}
            value={value}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              if (!Number.isNaN(parsed)) onChange(clampWasteMargin(parsed));
            }}
            aria-label="Custom waste percentage"
            className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
          <span className="text-sm text-muted-foreground">% waste</span>
          <span className="text-xs text-muted-foreground">
            (any value from {WASTE_MIN}% to {WASTE_MAX}%)
          </span>
        </div>
      )}
      {hint && !showCustom && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
