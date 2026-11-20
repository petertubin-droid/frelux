import { useMemo, useState } from "react";
import { AlertCircle, Globe, Search, X } from "lucide-react";
import { DISPLAY_CURRENCIES } from "@/lib/international/fx-display";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";

const COUNTRY_NAMES: Record<string, string[]> = {
  AED: ["United Arab Emirates", "UAE", "Dubai"],
  AUD: ["Australia"],
  BRL: ["Brazil"],
  CAD: ["Canada"],
  CHF: ["Switzerland"],
  CNY: ["China"],
  EGP: ["Egypt"],
  ETB: ["Ethiopia"],
  EUR: [
    "European Union",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Netherlands",
    "Portugal",
    "Ireland",
  ],
  GBP: [
    "United Kingdom",
    "UK",
    "Great Britain",
    "England",
    "Scotland",
    "Wales",
  ],
  GHS: ["Ghana"],
  IDR: ["Indonesia"],
  INR: ["India"],
  JPY: ["Japan"],
  KES: ["Kenya"],
  KRW: ["South Korea", "Korea"],
  MXN: ["Mexico"],
  NGN: ["Nigeria"],
  NZD: ["New Zealand"],
  PLN: ["Poland"],
  SAR: ["Saudi Arabia"],
  SGD: ["Singapore"],
  SEK: ["Sweden"],
  TRY: ["Türkiye", "Turkey"],
  TZS: ["Tanzania"],
  USD: ["United States", "USA", "America"],
  XOF: [
    "Côte d'Ivoire",
    "Ivory Coast",
    "Senegal",
    "Mali",
    "Benin",
    "Burkina Faso",
    "Niger",
    "Togo",
  ],
  ZAR: ["South Africa"],
};

export interface SmartMarketCurrencyFilterProps {
  value: string;
  onChange: (currency: string) => void;
  availableCurrencies: string[];
  label?: string;
  className?: string;
}

/** Search-first currency filter. The available currency set is authoritative. */
export default function SmartMarketCurrencyFilter({
  value,
  onChange,
  availableCurrencies,
  label = "Search market or currency",
  className = "",
}: SmartMarketCurrencyFilterProps) {
  const [query, setQuery] = useState("");
  const available = useMemo(
    () => new Set(availableCurrencies.map((code) => code.toUpperCase())),
    [availableCurrencies],
  );
  const countryNamesByCurrency = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const group of COUNTRY_OPTIONS) {
      for (const country of group.countries) {
        const names = map.get(country.currency) ?? [];
        names.push(country.name, country.code);
        map.set(country.currency, names);
      }
    }
    return map;
  }, []);
  const searchMatches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    return DISPLAY_CURRENCIES.filter((currency) => {
      const aliases = [
        ...(COUNTRY_NAMES[currency.code] ?? []),
        ...(countryNamesByCurrency.get(currency.code) ?? []),
      ];
      return [
        currency.code,
        currency.name,
        currency.symbol,
        currency.hint,
        ...aliases,
      ].some((candidate) => candidate.toLocaleLowerCase().includes(q));
    });
  }, [countryNamesByCurrency, query]);
  const results = useMemo(
    () =>
      searchMatches.filter((currency) =>
        available.has(currency.code.toUpperCase()),
      ),
    [available, searchMatches],
  );
  const queryHasMatch = searchMatches.length > 0;
  const selected = DISPLAY_CURRENCIES.find(
    (currency) => currency.code === value,
  );

  return (
    <section
      className={`rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5 ${className}`}
      aria-label="Price market filter"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Market & currency
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Search by country, currency name, code, or symbol.
          </p>
        </div>
        {selected && value !== "all" && (
          <button
            type="button"
            onClick={() => onChange("all")}
            className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            aria-label="Clear currency filter"
          >
            {selected.code} · {selected.name}
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
      <label className="relative block">
        <Globe
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={label}
          placeholder="Try USD, dollar, Nigeria, £…"
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear market search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      {query.trim() ? (
        results.length > 0 ? (
          <div
            role="listbox"
            aria-label="Available currencies"
            className="mt-3 grid max-h-60 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3"
          >
            {results.map((currency) => (
              <button
                key={currency.code}
                type="button"
                role="option"
                aria-selected={value === currency.code}
                onClick={() => {
                  onChange(currency.code);
                  setQuery("");
                }}
                className={`flex min-h-14 items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${value === currency.code ? "border-primary bg-primary/5" : "border-border/70 bg-background hover:border-primary/40 hover:bg-muted/50"}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {currency.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {currency.hint}
                  </span>
                </span>
                <span className="ml-3 shrink-0 text-right">
                  <span className="block text-sm font-bold text-primary">
                    {currency.code}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {currency.symbol}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-3 text-sm"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-foreground">
                {queryHasMatch
                  ? "Currently not available"
                  : "No matching market"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {queryHasMatch
                  ? `Prices in “${query.trim()}” are currently not available in this price book.`
                  : `No country or currency matches “${query.trim()}”. Try a country name, ISO currency code, or symbol.`}
              </p>
            </div>
          </div>
        )
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Type to find a market. Only markets with prices in this book will
          appear.
        </p>
      )}
    </section>
  );
}
