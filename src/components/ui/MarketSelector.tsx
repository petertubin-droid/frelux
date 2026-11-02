import { useState, useRef, useEffect, useMemo } from "react";
import { MapPin, ChevronDown, Check, Search } from "lucide-react";
import { useMarket } from "@/lib/international";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import type { MarketProfile } from "@/types/international";

type MarketGroup =
  "Americas" | "Europe" | "Africa" | "Middle East" | "Asia & Oceania" | "Other";
const MARKET_GROUP_ORDER: MarketGroup[] = [
  "Americas",
  "Europe",
  "Africa",
  "Middle East",
  "Asia & Oceania",
  "Other",
];

function getMarketGroup(region: string | null): MarketGroup {
  const value = region?.toLowerCase() ?? "";
  if (value.includes("africa")) return "Africa";
  if (value.includes("europe")) return "Europe";
  if (value.includes("america")) return "Americas";
  if (value.includes("middle east")) return "Middle East";
  if (value.includes("asia") || value.includes("oceania")) {
    return "Asia & Oceania";
  }
  return "Other";
}

/**
 * MarketSelector, lets users pick their country market (Nigeria, Ghana, etc.).
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
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groupedMarkets = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const groups = new Map<MarketGroup, MarketProfile[]>();

    for (const market of availableMarkets) {
      const searchable = [
        market.country_name,
        market.country_code,
        market.currency_code,
        market.currency_symbol,
        market.currency_name,
        market.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      if (query && !searchable.includes(query)) continue;

      const group = getMarketGroup(market.region);
      const markets = groups.get(group) ?? [];
      markets.push(market);
      groups.set(group, markets);
    }

    return MARKET_GROUP_ORDER.flatMap((group) => {
      const markets = groups.get(group);
      return markets?.length ? [{ name: group, markets }] : [];
    });
  }, [availableMarkets, searchQuery]);

  // Hide entirely until more than one market is visible, preserves the
  // existing single-market experience exactly.
  if (availableMarkets.length <= 1) return null;

  const current =
    availableMarkets.find(
      (m: MarketProfile) => m.country_code === marketCode,
    ) ?? availableMarkets[0];

  const closeMenu = () => {
    setOpen(false);
    setSearchQuery("");
  };

  const handleSelect = async (m: MarketProfile) => {
    if (m.status !== "active") return;
    await setMarket(m.country_code);
    closeMenu();
  };

  const renderMarketGroups = (layout: "inline" | "dropdown") => (
    <div
      role="group"
      aria-label="Available markets"
      className="max-h-72 overflow-y-auto overscroll-contain"
    >
      {groupedMarkets.length === 0 ? (
        <p className="px-3 py-4 text-center text-sm text-muted-foreground">
          No markets match your search.
        </p>
      ) : (
        groupedMarkets.map((group) => (
          <section key={group.name} role="group" aria-label={group.name}>
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.name}
            </p>
            {group.markets.map((m) => (
              <Button
                variant="ghost"
                key={m.country_code}
                type="button"
                disabled={m.status !== "active"}
                onClick={() => handleSelect(m)}
                className={classNames(
                  "flex w-full items-center justify-between rounded-lg text-sm transition-colors",
                  layout === "inline" ? "px-3 py-2" : "px-3 py-2",
                  m.country_code === marketCode
                    ? "bg-primary/10 font-semibold text-brand-purple dark:text-brand-purple-lighter"
                    : "text-muted-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
                  m.status !== "active" && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{m.country_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {layout === "inline"
                      ? m.currency_symbol
                      : `${m.currency_symbol} ${m.currency_code}`}
                  </span>
                  {m.status === "coming_soon" && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      Soon
                    </span>
                  )}
                </span>
                {m.country_code === marketCode && (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            ))}
          </section>
        ))
      )}
    </div>
  );

  const renderSearch = () => (
    <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search country or currency"
        aria-label="Search markets"
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </label>
  );

  // ── Inline mode: expandable section for narrow drawers ──
  if (inline) {
    return (
      <div
        ref={ref}
        className="w-full"
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) closeMenu();
        }}
      >
        <Button
          variant="ghost"
          type="button"
          onClick={() => (open ? closeMenu() : setOpen(true))}
          aria-expanded={open}
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
          <div className="mt-1 space-y-2 rounded-lg border border-border/50 bg-muted/50 p-2 dark:border-white/5 dark:bg-white/5">
            {renderSearch()}
            {renderMarketGroups("inline")}
          </div>
        )}
      </div>
    );
  }

  // ── Dropdown mode (desktop navbar) ──
  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) closeMenu();
      }}
    >
      <Button
        variant="ghost"
        type="button"
        onClick={() => (open ? closeMenu() : setOpen(true))}
        aria-expanded={open}
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
        <div className="absolute right-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border/40 bg-card p-2 shadow-lg dark:border-white/10 dark:bg-card">
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Market / Currency
          </p>
          {renderSearch()}
          <div className="mt-1">{renderMarketGroups("dropdown")}</div>
        </div>
      )}
    </div>
  );
}
