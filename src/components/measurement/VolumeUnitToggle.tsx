import { Button } from "@/components/ui/shadcn/button";
import { cn } from "@/lib/cn";
import type { VolumeChoice } from "@/lib/use-area-unit";

/** Cubic feet or cubic metres, for bulk quantities typed as a volume. */
export default function VolumeUnitToggle({
  value,
  onChange,
  className,
}: {
  value: VolumeChoice;
  onChange: (unit: VolumeChoice) => void;
  className?: string;
}) {
  const options: { unit: VolumeChoice; short: string; long: string }[] = [
    { unit: "ft3", short: "cu ft", long: "Cubic feet" },
    { unit: "m3", short: "m³", long: "Cubic metres" },
  ];
  return (
    <div
      role="group"
      aria-label="Volume unit"
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
