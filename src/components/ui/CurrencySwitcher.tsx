import { useState, useRef, useEffect } from "react";
import { Coins, ChevronDown, Check } from "lucide-react";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { DISPLAY_CURRENCIES } from "@/lib/international/fx-display";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

/**
 * CurrencySwitcher — visitor-facing display-currency picker
 * (International Phase A). Estimates still calculate in Naira; picking
 * a currency converts amounts at DISPLAY time using the owner's rates.
 *
 * Additive component: when the owner has not enabled the display layer
 * (no display_currencies config), it renders nothing, so the existing
 * Naira-only experience is completely unchanged.
 */
export function CurrencySwitcher({
  compact = false,
  inline = false,
}: {
  compact?: boolean;
  inline?: boolean;
}) {
  const {
    code,
    converting,
    rateDescription,
    rateConfigured,
    config,
    setCurrency,
  } = useDisplayCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hidden until the owner enables it in Currency & FX Rates.
  if (!config?.enabled) return null;

  const current =
    DISPLAY_CURRENCIES.find((c) => c.code === code) ?? DISPLAY_CURRENCIES[0];

  const handleSelect = (nextCode: string) => {
    setCurrency(nextCode);
    setOpen(false);
  };

  // ── Inline mode: expandable section for narrow drawers ──
  if (inline) {
    return (
      <div ref={ref} className="w-full">
        <Button
          variant="ghost"
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
          aria-label="Change currency"
        >
          <span className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Currency
            <span className="text-xs text-muted-foreground">
              {current.symbol}
            </span>
          </span>
          <ChevronDown
            className={classNames(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
        {open && (
          <div className="mt-1 space-y-0.5 rounded-lg border border-border/50 bg-muted/50 p-2 dark:border-white/5 dark:bg-white/5">
            {DISPLAY_CURRENCIES.map((c) => (
              <Button
                variant="ghost"
                key={c.code}
                type="button"
                onClick={() => handleSelect(c.code)}
                className={classNames(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  code === c.code
                    ? "bg-primary/10 font-semibold text-brand-purple dark:text-brand-purple-lighter"
                    : "text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-white/5",
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{c.symbol}</span>
                  <span>{c.name}</span>
                </span>
                {code === c.code && <Check className="h-4 w-4" />}
              </Button>
            ))}
            <p className="px-3 pt-1.5 text-[10px] leading-snug text-muted-foreground/70">
              {converting
                ? `Amounts converted from Naira at the owner's set rate (${rateDescription}). Estimates always calculate in Naira.`
                : "Amounts shown in Naira. Estimates always calculate in Naira."}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Dropdown mode (desktop navbar) ──
  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen(!open)}
        className={classNames(
          "inline-flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-card-foreground dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-muted-foreground/60",
          compact && "p-1.5",
        )}
        aria-label={`Currency: ${current.name}`}
        title={`${current.name} (${current.code})`}
      >
        <Coins className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        {!compact && (
          <span className="text-xs font-medium">{current.symbol}</span>
        )}
        {!compact && (
          <ChevronDown
            className={classNames(
              "h-3 w-3 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-border/40 bg-card py-1.5 shadow-lg dark:border-white/10 dark:bg-card">
          <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Display currency
          </p>
          {DISPLAY_CURRENCIES.map((c) => (
            <Button
              key={c.code}
              variant="ghost"
              type="button"
              onClick={() => handleSelect(c.code)}
              className="flex w-full items-center justify-between rounded-none px-4 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="w-8 text-left">{c.symbol}</span>
                <span>{c.name}</span>
                {!rateConfigured(c.code) && c.code !== "NGN" && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    no rate
                  </span>
                )}
              </span>
              {code === c.code && <Check className="h-4 w-4" />}
            </Button>
          ))}
          <p className="border-t border-border/40 px-4 py-1.5 text-[10px] leading-snug text-muted-foreground/70 dark:border-white/10">
            Estimates always calculate in Naira
            {converting ? `; shown as ${rateDescription} (approximate).` : "."}
          </p>
        </div>
      )}
    </div>
  );
}
