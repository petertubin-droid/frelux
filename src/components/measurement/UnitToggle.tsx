import { Button } from "@/components/ui/shadcn/button";
import { ALL_UNITS, unitLongLabel, unitShortLabel } from "@/lib/utils";
import type { Unit } from "@/types";
import { cn } from "@/lib/cn";

/**
 * Universal length-unit selector shared by every calculator page.
 *
 * All five units (m, ft, in, cm, mm) are always offered; the
 * underlying engine normalises to metres so the choice only affects
 * how the user reads and types values, never the maths.
 *
 * Renders compact short labels (m / ft / in / cm / mm) as a pill row;
 * the full unit name is exposed to screen readers via the title and
 * aria-label attributes.
 */
export default function UnitToggle({
  value,
  onChange,
  className,
  buttonClassName,
}: {
  value: Unit;
  onChange: (unit: Unit) => void;
  /** Extra classes for the outer pill row.
   *  Base styling: inline-flex rounded-lg border p-1. */
  className?: string;
  /** Extra classes appended to each unit button. */
  buttonClassName?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Measurement unit"
      className={cn(
        "inline-flex flex-wrap gap-0.5 rounded-lg border border-border bg-card p-1",
        className,
      )}
    >
      {ALL_UNITS.map((u) => (
        <Button
          key={u}
          variant="ghost"
          type="button"
          title={unitLongLabel(u)}
          aria-pressed={value === u}
          aria-label={unitLongLabel(u)}
          onClick={() => onChange(u)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-semibold transition-all",
            value === u
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
            buttonClassName,
          )}
        >
          {unitShortLabel(u)}
        </Button>
      ))}
    </div>
  );
}
