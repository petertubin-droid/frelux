// React bindings for the currency engine: one cached rate table, one refresh
// timer, and the display currency the visitor chose.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CURRENCY_STORAGE_KEY } from "@/lib/international/fx-display";
import { suggestCurrency } from "./catalogue";
import {
  convert,
  formatMoney,
  type Conversion,
  type RateTable,
} from "./engine";
import { rateCache } from "./rates";

export interface CurrencyState {
  table: RateTable | null;
  loading: boolean;
  /** Set when the recorded rates could not be refreshed. */
  error: string | null;
  refreshedAt: string | null;
  refresh: () => Promise<void>;
}

/** Loads the shared rate table once per interval, reusing the cache. */
export function useRateTable(): CurrencyState {
  const [table, setTable] = useState<RateTable | null>(rateCache().peek());
  const [loading, setLoading] = useState(!table);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    const result = await rateCache().get(force);
    if (!mounted.current) return;
    setTable(result.table);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    const timer = setInterval(() => void load(), rateCache().refreshInterval());
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [load]);

  return {
    table,
    loading,
    error,
    refreshedAt: table?.fetchedAt ?? null,
    refresh: () => load(true),
  };
}

/** The currency this visitor sees figures in, and a way to change it. */
export function useDisplayCurrency(countryCode?: string | null) {
  const suggested = suggestCurrency(countryCode);
  const [code, setCode] = useState<string>(() => {
    if (typeof window === "undefined") return suggested;
    return window.localStorage.getItem(CURRENCY_STORAGE_KEY) || suggested;
  });

  const choose = useCallback((next: string) => {
    const upper = next.trim().toUpperCase();
    setCode(upper);
    if (typeof window !== "undefined")
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, upper);
  }, []);

  return { currency: code, choose };
}

/**
 * Converts one amount for display. The returned conversion carries its rate and
 * timestamp so the UI can show them beside the figure.
 */
export function useConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): {
  conversion: Conversion | null;
  formatted: string | null;
} {
  const { table } = useRateTable();
  return useMemo(() => {
    if (!table) return { conversion: null, formatted: null };
    const conversion = convert(amount, fromCurrency, toCurrency, table);
    return {
      conversion,
      formatted:
        conversion.result === null
          ? null
          : formatMoney(conversion.result, toCurrency),
    };
  }, [amount, fromCurrency, toCurrency, table]);
}
