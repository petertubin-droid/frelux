import { RotateCcw } from "lucide-react";

/**
 * "Start over" control for a calculator.
 *
 * Reset has to be written by the page itself: user input sits next to data the
 * page loaded from the database (material books, supplier prices, rule sets),
 * and clearing everything would blank the catalogue the calculator runs on.
 * The page therefore passes a handler that restores only its own inputs.
 */
export default function CalculatorResetButton({
  onReset,
  label = "Start over",
  className = "",
}: {
  onReset: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-purple/40 hover:text-brand-purple dark:border-white/10 ${className}`.trim()}
    >
      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
