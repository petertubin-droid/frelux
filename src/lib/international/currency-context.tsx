/**
 * CurrencyProvider — React binding for the visitor currency display layer.
 *
 * Mounted once in main.tsx. It:
 *  1. restores the visitor's saved currency from localStorage,
 *  2. fetches the owner's display-currency config (site_settings.
 *     display_currencies) and pushes {code, rates} into the module
 *     state used by utils.formatCurrency,
 *  3. re-renders the tree when either changes (a state bump is enough;
 *     formatters read the module state at render time).
 *
 * Admin pages are excluded from conversion (same rule as the language
 * provider): admin-authored content always shows Naira.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase-lazy";
import {
  CURRENCY_STORAGE_KEY,
  DISPLAY_CURRENCIES,
  setDisplayCurrencyState,
  getActiveDisplayCurrency,
  isConverting,
  hasFxRate,
  activeRateDescription,
  activeCurrencySymbol,
  type DisplayCurrencyConfig,
} from "./fx-display";

interface CurrencyContextValue {
  /** Current display currency code, e.g. "USD". */
  code: string;
  /** Symbol for the active currency ("₦" when not converting). */
  symbol: string;
  /** True when amounts are actually being converted for display. */
  converting: boolean;
  /** True when the owner configured a rate for the given code. */
  rateConfigured: (code: string) => boolean;
  /** "1 ₦ = $0.00065" style disclosure, null when not converting. */
  rateDescription: string | null;
  /** The owner's config as fetched (rates may be empty). */
  config: DisplayCurrencyConfig | null;
  /** Switch the visitor's display currency (persists in localStorage). */
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const FALLBACK: DisplayCurrencyConfig = { enabled: false, rates: {} };

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(() => getActiveDisplayCurrency());
  const [cfg, setCfg] = useState<DisplayCurrencyConfig | null>(null);

  // Fetch the owner's rates once. A missing column or fetch failure
  // just means "display layer disabled" (₦ everywhere) — never a guess.
  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .then((supabase) =>
        supabase
          .from("site_settings")
          .select("display_currencies")
          .limit(1)
          .maybeSingle(),
      )
      .then(({ data }) => {
        if (cancelled) return;
        const fetched =
          data &&
          typeof data.display_currencies === "object" &&
          data.display_currencies
            ? (data.display_currencies as DisplayCurrencyConfig)
            : FALLBACK;
        setCfg({ ...fetched, rates: fetched.rates ?? {} });
      })
      .catch(() => {
        if (!cancelled) setCfg(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Push {code, rates} into the module display state whenever either
  // changes, then bump local state so the tree re-renders. The bump
  // counter is REQUIRED, not an optimisation: the memoized context
  // value reads module state at render time, and setCode() alone is a
  // no-op when the code is unchanged (e.g. the visitor picked a
  // currency while the config fetch was still in flight). Without the
  // bump the tree would keep a stale converting=false forever.
  const [bump, setBump] = useState(0);
  useEffect(() => {
    setDisplayCurrencyState(code, cfg ?? FALLBACK);
    setCode(getActiveDisplayCurrency());
    setBump((n) => n + 1);
  }, [code, cfg]);

  const setCurrency = useCallback((next: string) => {
    if (!DISPLAY_CURRENCIES.some((c) => c.code === next)) return;
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      // storage unavailable: still switch for this session
    }
    setCode(next);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      code: getActiveDisplayCurrency(),
      symbol: activeCurrencySymbol(),
      converting: isConverting(),
      rateConfigured: (c: string) =>
        !!(cfg?.enabled && c !== "NGN" && hasFxRate(c)),
      rateDescription: activeRateDescription(),
      config: cfg,
      setCurrency,
    }),
    [code, cfg, setCurrency, bump],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useDisplayCurrency must be used inside CurrencyProvider");
  }
  return ctx;
}
