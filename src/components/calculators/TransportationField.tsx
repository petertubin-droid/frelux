import { Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { TransportationControls } from "@/hooks/useTransportation";
import { TRANSPORTATION_LABEL } from "@/lib/estimation/transportation";

/**
 * Optional delivery charge on an estimate.
 *
 * Off by default: most quotations here exclude haulage, and inventing a
 * delivery figure would be worse than leaving it out. Turned on, the amount
 * flows into the quotation's totals and its grand total, and the results card
 * shows the same row so screen and document never disagree.
 */
export default function TransportationField({
  controls,
  currencySymbol = "₦",
  id = "transportation",
  className = "",
}: {
  controls: TransportationControls;
  currencySymbol?: string;
  id?: string;
  className?: string;
}) {
  const { choice, setEnabled, setAmount } = controls;
  const inputId = `${id}-amount`;
  return (
    <div
      className={`rounded-xl border border-border/60 bg-card/40 p-3 ${className}`}
    >
      <label
        htmlFor={`${id}-toggle`}
        className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
      >
        <input
          id={`${id}-toggle`}
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={choice.enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <Truck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Include {TRANSPORTATION_LABEL.toLowerCase()} (optional)
      </label>

      {choice.enabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="text-xs text-muted-foreground">
            Delivery to site
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {currencySymbol}
            </span>
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0"
              className="h-8 w-32 rounded-lg border border-border bg-background px-2 text-sm tabular-nums"
              value={choice.amount > 0 ? String(choice.amount) : ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {choice.amount > 0
              ? `Added to the quotation: ${formatCurrency(choice.amount, currencySymbol)}`
              : "Leave blank and the quotation shows “to be agreed”."}
          </span>
        </div>
      )}
    </div>
  );
}
