import * as React from "react";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/shadcn/form";
import { cn } from "@/lib/cn";

export interface CalculatorInputProps {
  id?: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "email" | "tel";
  unit?: string;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
}

export const CalculatorInput = React.forwardRef<
  HTMLInputElement,
  CalculatorInputProps
>(
  (
    {
      id: customId,
      label,
      value,
      onChange,
      type = "number",
      unit,
      placeholder,
      min,
      max,
      step,
      hint,
      error,
      required,
      disabled,
      autoFocus,
      className,
      inputClassName,
      "aria-label": customAriaLabel,
    },
    ref,
  ) => {
    const reactId = React.useId();
    const inputId = customId || `calc-input-${reactId}`;
    const ariaLabel = customAriaLabel || (unit ? `${label} in ${unit}` : label);

    return (
      <FormItem className={cn("relative", className)}>
        <FormLabel htmlFor={inputId} error={!!error} required={required}>
          {label}
        </FormLabel>
        <FormControl error={!!error}>
          <div className="relative flex items-center">
            <input
              ref={ref}
              id={inputId}
              type={type}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
              required={required}
              disabled={disabled}
              autoFocus={autoFocus}
              aria-label={ariaLabel}
              className={cn(
                "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 sm:py-3 text-sm text-foreground",
                "focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all duration-200",
                "hover:border-border/80 disabled:cursor-not-allowed disabled:opacity-50",
                unit ? "pr-14 sm:pr-16" : "",
                error &&
                  "border-destructive focus:border-destructive focus:ring-destructive/20",
                inputClassName,
              )}
            />
            {unit && (
              <span
                data-testid="input-unit-badge"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none select-none inline-flex items-center rounded-md border border-border/70 bg-muted/80 px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground shadow-xs dark:bg-muted/40 dark:border-white/10"
                aria-hidden="true"
              >
                {unit}
              </span>
            )}
          </div>
        </FormControl>
        {hint && !error && <FormDescription>{hint}</FormDescription>}
        {error && <FormMessage>{error}</FormMessage>}
      </FormItem>
    );
  },
);

CalculatorInput.displayName = "CalculatorInput";
