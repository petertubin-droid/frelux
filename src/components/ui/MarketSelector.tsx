import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { useMarket } from "@/lib/international";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import type { MarketProfile } from "@/types/international";

/**
 * MarketSelector — lets users pick their country market (Nigeria, Ghana, etc.).
 *
 * Additive component: renders nothing until at least two markets are visible
 * (via the market_profiles table), so the existing single-market UI is
 * completely unchanged. Selecting a market updates the MarketProvider,
 * which flows currency, units, and terminology to any consumer.
 *
 * Markets with status "coming_soon" are shown disabled as a preview.
 */
export function MarketSelector({
  compact = false,
  inline = false,
}: {
  compact?: boolean;
  inline?: boolean;
}) {
  const { marketCode, availableMarkets, setMarket } = useMarket();
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

  // Hide entirely until more than one market is visible — preserves the
  // existing single-market experience exactly.
  if (availableMarkets.length <= 1) return null;

  const current =
    availableMarkets.find(
      (m: MarketProfile) => m.country_code === marketCode,
    ) ?? availableMarkets[0];

  const handleSelect = async (m: MarketProfile) => {
    if (m.status !== "active") return;
    await setMarket(m.country_code);
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
          aria-label="Change market"
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Market
            <span className="text-xs text-muted-foreground">
              {current.country_name} ({current.currency_symbol})
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
            {availableMarkets.map((m) => (
              <Button
                variant="ghost"
                key={m.country_code}
                type="button"
                disabled={m.status !== "active"}
                onClick={() => handleSelect(m)}
                className={classNames(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  m.country_code === marketCode
                    ? "bg-primary/10 font-semibold text-brand-purple dark:text-brand-purple-lighter"
                    : "text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-white/5",
                  m.status !== "active" && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{m.country_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.currency_symbol}
                  </span>
                  {m.status === "coming_soon" && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      Soon
                    </span>
                  )}
                </span>
                {m.country_code === marketCode && <Check className="h-4 w-4" />}
              </Button>
            ))}
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
        aria-label={`Market: ${current.country_name}`}
        title={`${current.country_name} (${current.currency_code})`}
      >
        <MapPin className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        {!compact && (
          <span className="text-xs font-medium">{current.country_code}</span>
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
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-border/40 bg-card py-1.5 shadow-lg dark:border-white/10 dark:bg-card">
          <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Market / Currency
          </p>
          {availableMarkets.map((m) => (
            <Button
              variant="ghost"
              key={m.country_code}
              type="button"
              disabled={m.status !== "active"}
              onClick={() => handleSelect(m)}
              className={classNames(
                "flex w-full items-center justify-between px-4 py-2 text-sm transition-colors",
                m.country_code === marketCode
                  ? "bg-primary/5 font-semibold text-brand-purple dark:text-brand-purple-lighter"
                  : "text-muted-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
                m.status !== "active" && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="flex items-center gap-2">
                <span>{m.country_name}</span>
                <span className="text-xs text-muted-foreground">
                  {m.currency_symbol} {m.currency_code}
                </span>
                {m.status === "coming_soon" && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    Soon
                  </span>
                )}
              </span>
              {m.country_code === marketCode && <Check className="h-4 w-4" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
