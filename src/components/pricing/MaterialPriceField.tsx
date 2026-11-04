import { useId } from "react";
import { cn } from "@/lib/cn";
import {
  priceStatusLabel,
  resolveMaterialPrice,
  type PriceSource,
} from "@/lib/pricing/material-price-source";

export interface MaterialPriceFieldProps {
  label: string;
  /** The unit the price is for, e.g. "per 50 kg bag" or "per trip". */
  unitLabel: string;
  currencySymbol: string;
  source: PriceSource;
  onSourceChange: (source: PriceSource) => void;
  customValue: number | null;
  onCustomChange: (value: number | null) => void;
  freluxValue: number | null;
  freluxLabel?: string;
  freluxVerified?: boolean;
  hint?: string;
  className?: string;
}

/**
 * One material price, with the source made explicit.
 *
 * The calculator never invents a price: the field either shows what FRELUX
 * holds, with a badge and the notice that it is not fully verified, or takes
 * the figure the user typed. When FRELUX holds nothing the field asks for a
 * custom price instead of showing a zero that would read as a real cost.
 */
export function MaterialPriceField({
  label,
  unitLabel,
  currencySymbol,
  source,
  onSourceChange,
  customValue,
  onCustomChange,
  freluxValue,
  freluxLabel = "FRELUX price",
  freluxVerified = false,
  hint,
  className,
}: MaterialPriceFieldProps) {
  const groupId = useId();
  const inputId = `${groupId}-custom`;

  const resolved = resolveMaterialPrice({
    source,
    customValue,
    freluxValue,
    freluxVerified,
  });

  const options: { value: PriceSource; label: string }[] = [
    { value: "frelux", label: freluxLabel },
    { value: "custom", label: "My price" },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <div
        role="radiogroup"
        aria-label={`Price source for ${label}`}
        className="flex w-full overflow-hidden rounded-lg border border-border"
      >
        {options.map((option) => {
          const active = source === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSourceChange(option.value)}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {source === "custom" ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {currencySymbol}
          </span>
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder={`Price ${unitLabel}`}
            value={customValue ?? ""}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const raw = event.target.value;
              onCustomChange(raw === "" ? null : Number(raw));
            }}
            className="input-field pl-8"
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2"
          aria-live="polite"
        >
          <span className="text-sm font-semibold text-foreground">
            {resolved.value === null
              ? "No price available"
              : `${currencySymbol}${resolved.value.toLocaleString()} ${unitLabel}`}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-medium",
              resolved.status === "verified" &&
                "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
              resolved.status === "indicative" &&
                "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
              resolved.status === "unavailable" &&
                "bg-muted text-muted-foreground",
            )}
          >
            {priceStatusLabel(resolved.status)}
          </span>
        </div>
      )}

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <p
        className={cn(
          "text-xs",
          resolved.status === "indicative"
            ? "text-amber-800 dark:text-amber-200"
            : "text-muted-foreground",
        )}
      >
        {resolved.notice}
      </p>

      {resolved.needsCustomPrice && source === "frelux" ? (
        <button
          type="button"
          onClick={() => onSourceChange("custom")}
          className="text-xs font-medium text-primary underline underline-offset-2"
        >
          Enter my own price instead
        </button>
      ) : null}
    </div>
  );
}

export default MaterialPriceField;
