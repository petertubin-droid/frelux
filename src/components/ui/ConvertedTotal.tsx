import { useMemo } from "react";
import {
  activeCurrencyCode,
  preferredDisplayCurrency,
} from "@/lib/currency/active-currency";
import {
  convert,
  describeConversion,
  formatMoney,
} from "@/lib/currency/engine";
import { useRateTable } from "@/lib/currency/use-currency";

/**
 * The same estimate seen in another currency.
 *
 * This is arithmetic on the original figures at a dated rate. It is never a
 * local material price, so it carries the rate, its timestamp and where the rate
 * came from, and it says plainly when a saved rate was used.
 */
export default function ConvertedTotal({ amount }: { amount: number }) {
  const from = activeCurrencyCode();
  const to = preferredDisplayCurrency(from);
  const { table, error } = useRateTable();

  const conversion = useMemo(
    () => (table && from !== to ? convert(amount, from, to, table) : null),
    [table, amount, from, to],
  );

  if (!conversion || conversion.result === null) return null;

  const saved = conversion.status === "fallback" || Boolean(error);

  return (
    <div
      className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left"
      data-testid="converted-total"
    >
      <p className="text-sm font-medium text-foreground">
        ≈ {formatMoney(conversion.result, to)}{" "}
        <span className="text-xs font-normal text-muted-foreground">{to}</span>
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {describeConversion(conversion)}. Shown for comparison only: this is an
        exchange-rate view of the estimate, not the price of materials in {to}.
      </p>
      {saved && (
        <p className="mt-1 text-[11px] text-amber-500">
          Live rates were unavailable, so this uses a saved rate from{" "}
          {conversion.rateTimestamp
            ? conversion.rateTimestamp.slice(0, 10)
            : "an earlier reading"}
          .
        </p>
      )}
    </div>
  );
}
