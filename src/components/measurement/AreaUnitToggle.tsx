import { Button } from "@/components/ui/shadcn/button";
import { cn } from "@/lib/cn";
import type { AreaChoice } from "@/lib/use-area-unit";

/**
 * Square metres or square feet, nothing else.
 *
 * Calculators that price a surface offer the whole SI ladder in some places,
 * but a customer choosing between m² and sq ft is the whole decision. Feet is
 * listed first because it is the default.
 */
export default function AreaUnitToggle({
  value,
  onChange,
  className,
}: {
  value: AreaChoice;
  onChange: (unit: AreaChoice) => void;
  className?: string;
}) {
  const options: { unit: AreaChoice; short: string; long: string }[] = [
    { unit: "ft2", short: "sq ft", long: "Square feet" },
    { unit: "m2", short: "m²", long: "Square metres" },
  ];
  return (
    <div
      role="group"
      aria-label="Area unit"
      className={cn(
        "inline-flex gap-0.5 rounded-lg border border-border bg-card p-1",
        className,
      )}
    >
      {options.map((o) => (
        <Button
          key={o.unit}
          variant="ghost"
          type="button"
          title={o.long}
          aria-pressed={value === o.unit}
          aria-label={o.long}
          onClick={() => onChange(o.unit)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-semibold transition-all",
            value === o.unit
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.short}
        </Button>
      ))}
    </div>
  );
}
