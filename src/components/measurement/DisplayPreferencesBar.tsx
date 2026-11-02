import { Ruler, Wallet } from "lucide-react";
import { classNames } from "@/lib/utils";
import { useGlobalSettings } from "@/lib/settings/settings-store";
import type { MeasurementSystem } from "@/lib/settings/countries";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { listCurrencies } from "@/lib/currency/catalogue";

/**
 * The two switches an overseas visitor wants first: metric or imperial, and
 * which currency the second figure is shown in.
 *
 * Nothing here changes what an estimate is. Units are converted at the edges
 * so the maths stays metric, and the currency choice only drives the converted
 * figure that sits beside the original. The footnote says so, because a visitor
 * landing from Dallas or Brisbane deserves to know that a dollar figure is not
 * a Nigerian price.
 */

const OFFERED_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "AUD", "CAD"];

const SYSTEMS: Array<{ key: MeasurementSystem; label: string; hint: string }> =
  [
    { key: "metric", label: "Metric", hint: "metres, square metres" },
    { key: "imperial", label: "Imperial", hint: "feet, square feet" },
  ];

export default function DisplayPreferencesBar({
  onSystemChange,
  className,
  compact = false,
}: {
  /** Pages holding their own unit state use this to switch it in place. */
  onSystemChange?: (system: MeasurementSystem) => void;
  className?: string;
  compact?: boolean;
}) {
  const { settings, save } = useGlobalSettings();
  const { code, setCurrency } = useDisplayCurrency();
  const currencies = listCurrencies().filter((c) =>
    OFFERED_CURRENCIES.includes(c.code),
  );
  const ordered = [...currencies].sort(
    (a, b) =>
      OFFERED_CURRENCIES.indexOf(a.code) - OFFERED_CURRENCIES.indexOf(b.code),
  );

  const activeSystem = settings.measurementSystem;

  return (
    <div
      className={classNames(
        "rounded-xl border border-border/60 bg-card/70 p-3 backdrop-blur",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
        className,
      )}
    >
      <div
        className={classNames(
          "flex flex-wrap items-center gap-x-5 gap-y-3",
          compact && "text-sm",
        )}
      >
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Units
          </span>
          <div
            role="group"
            aria-label="Measurement system"
            className="inline-flex rounded-lg border border-border bg-background/60 p-0.5"
          >
            {SYSTEMS.map((system) => {
              const active = activeSystem === system.key;
              return (
                <button
                  key={system.key}
                  type="button"
                  aria-pressed={active}
                  title={system.hint}
                  onClick={() => {
                    if (active) return;
                    void save({ measurementSystem: system.key });
                    onSystemChange?.(system.key);
                  }}
                  className={classNames(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {system.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Wallet
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Show costs in
          </span>
          <div
            role="group"
            aria-label="Display currency"
            className="inline-flex flex-wrap gap-1"
          >
            {ordered.map((currency) => {
              const active = code === currency.code;
              return (
                <button
                  key={currency.code}
                  type="button"
                  aria-pressed={active}
                  title={currency.name}
                  onClick={() => {
                    if (active) return;
                    setCurrency(currency.code);
                  }}
                  className={classNames(
                    "rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{currency.symbol}</span>{" "}
                  <span className="tracking-wide">{currency.code}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!compact && (
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          An estimate is always priced in its own currency. Choosing another one
          adds a converted figure beside it, at a dated exchange rate, and never
          replaces what was priced.
        </p>
      )}
    </div>
  );
}
